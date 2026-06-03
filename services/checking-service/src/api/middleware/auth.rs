use axum::extract::FromRequestParts;
use axum::http::StatusCode;
use axum::http::request::Parts;

use crate::api::state::AppState;
use crate::shared::jwt::decode_token;

// AuthUser es un extractor de Axum: cualquier handler que lo ponga en su firma
// exige automáticamente un JWT válido, y recibe el user_id ya verificado.
// El por qué de hacerlo extractor (y no middleware global): así cada ruta decide
// si requiere auth o no con solo declararlo, sin tablas de rutas protegidas.
#[derive(Debug, Clone, Copy)]
pub struct AuthUser {
    pub user_id: uuid::Uuid,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = (StatusCode, &'static str);

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .ok_or((StatusCode::UNAUTHORIZED, "falta header Authorization"))?;

        let token = header
            .strip_prefix("Bearer ")
            .ok_or((StatusCode::UNAUTHORIZED, "formato esperado: Bearer <token>"))?;

        let claims = decode_token(
            token,
            &state.settings.jwt_secret,
            &state.settings.jwt_issuer,
            state.settings.jwt_audience.as_deref(),
        )
        .map_err(|_| (StatusCode::UNAUTHORIZED, "token inválido o expirado"))?;

        let user_id = claims
            .user_id()
            .map_err(|_| (StatusCode::UNAUTHORIZED, "sub del token no es un UUID"))?;

        Ok(AuthUser { user_id })
    }
}
