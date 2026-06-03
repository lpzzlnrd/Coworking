use async_trait::async_trait;
use reqwest::Client;
use uuid::Uuid;

use crate::domain::DomainError;
use crate::domain::ports::auth_verifier::AuthVerifier;

// AuthClient implementa AuthVerifier llamando al auth-service por HTTP.
// El por qué: nuestras tablas guardan user_id sin FK (la tabla users la creará
// auth-service), así que validamos por red que el usuario existe antes de reservar.
pub struct AuthClient {
    http: Client,
    base_url: String,
}

impl AuthClient {
    pub fn new(base_url: String) -> Self {
        Self {
            http: Client::new(),
            base_url,
        }
    }
}

#[async_trait]
impl AuthVerifier for AuthClient {
    async fn verify_user_exists(&self, user_id: Uuid) -> Result<(), DomainError> {
        let url = format!("{}/users/{}", self.base_url.trim_end_matches('/'), user_id);

        let resp = self.http.get(&url).send().await.map_err(|e| {
            // Si auth-service está caído, no es culpa del cliente: error interno.
            DomainError::Internal(format!("auth-service inalcanzable: {e}"))
        })?;

        match resp.status() {
            s if s.is_success() => Ok(()),
            reqwest::StatusCode::NOT_FOUND => Err(DomainError::Forbidden),
            other => Err(DomainError::Internal(format!(
                "auth-service respondió {other}"
            ))),
        }
    }
}
