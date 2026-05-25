// JWT solo-consumo: este servicio NO firma tokens, solo verifica los emitidos
// por auth-service. Usamos HS256 con secret compartido (ver SKILL.md sección 11).
// Si auth-service migra a RS256, reemplazar Validation/DecodingKey por la
// versión RSA y leer JWT_PUBLIC_KEY en lugar de JWT_SECRET.
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::domain::DomainError;

// Claims mínimos esperados del JWT de auth-service.
// `sub` = user_id (UUID en string). Si auth-service agrega más claims (role, email),
// extender este struct y dejar los nuevos campos opcionales para no romper compatibilidad.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub iss: String,
    #[serde(default)]
    pub aud: Option<String>,
    pub exp: usize,
    #[serde(default)]
    pub iat: Option<usize>,
}

impl Claims {
    pub fn user_id(&self) -> Result<Uuid, DomainError> {
        Uuid::parse_str(&self.sub)
            .map_err(|_| DomainError::Forbidden)
    }
}

// Verifica firma + expiración + issuer (+ audience si está configurada).
// Devuelve Forbidden ante cualquier fallo: no filtramos detalle al cliente
// para no dar pistas a un atacante (token expirado vs firma inválida vs issuer mal).
pub fn decode_token(
    token: &str,
    secret: &str,
    expected_issuer: &str,
    expected_audience: Option<&str>,
) -> Result<Claims, DomainError> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_issuer(&[expected_issuer]);
    if let Some(aud) = expected_audience {
        validation.set_audience(&[aud]);
    } else {
        // Si no se configuró audience esperado, no la validamos.
        validation.validate_aud = false;
    }

    decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &validation)
        .map(|data| data.claims)
        .map_err(|e| {
            tracing::debug!(error = %e, "jwt verification failed");
            DomainError::Forbidden
        })
}

#[cfg(test)]
mod tests {
    use super::*;
    use jsonwebtoken::{EncodingKey, Header, encode};

    fn make_token(sub: &str, iss: &str, aud: Option<&str>, exp: usize) -> String {
        // Solo para tests: aquí sí firmamos para poder probar el verificador.
        // En código de producción jamás llamamos a `encode` desde este servicio.
        #[derive(Serialize)]
        struct TestClaims<'a> {
            sub: &'a str,
            iss: &'a str,
            #[serde(skip_serializing_if = "Option::is_none")]
            aud: Option<&'a str>,
            exp: usize,
        }
        let claims = TestClaims { sub, iss, aud, exp };
        encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(b"test-secret"),
        )
        .unwrap()
    }

    fn future_exp() -> usize {
        (std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
            + 3600) as usize
    }

    #[test]
    fn decodes_valid_token() {
        let user = Uuid::new_v4();
        let token = make_token(&user.to_string(), "coworking-auth", None, future_exp());
        let claims = decode_token(&token, "test-secret", "coworking-auth", None).unwrap();
        assert_eq!(claims.user_id().unwrap(), user);
    }

    #[test]
    fn rejects_wrong_issuer() {
        let token = make_token(&Uuid::new_v4().to_string(), "otro-emisor", None, future_exp());
        let err = decode_token(&token, "test-secret", "coworking-auth", None).unwrap_err();
        assert!(matches!(err, DomainError::Forbidden));
    }

    #[test]
    fn rejects_wrong_secret() {
        let token = make_token(&Uuid::new_v4().to_string(), "coworking-auth", None, future_exp());
        let err = decode_token(&token, "secret-equivocado", "coworking-auth", None).unwrap_err();
        assert!(matches!(err, DomainError::Forbidden));
    }

    #[test]
    fn rejects_expired_token() {
        let token = make_token(&Uuid::new_v4().to_string(), "coworking-auth", None, 1);
        let err = decode_token(&token, "test-secret", "coworking-auth", None).unwrap_err();
        assert!(matches!(err, DomainError::Forbidden));
    }

    #[test]
    fn validates_audience_when_configured() {
        let token = make_token(
            &Uuid::new_v4().to_string(),
            "coworking-auth",
            Some("coworking"),
            future_exp(),
        );
        assert!(decode_token(&token, "test-secret", "coworking-auth", Some("coworking")).is_ok());

        let err = decode_token(&token, "test-secret", "coworking-auth", Some("otra-app")).unwrap_err();
        assert!(matches!(err, DomainError::Forbidden));
    }
}
