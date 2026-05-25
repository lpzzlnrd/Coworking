// Puerto: verificar que un user_id existe en auth-service.
// Mientras no haya FK cross-schema, validación vía HTTP.
use async_trait::async_trait;
use uuid::Uuid;
use crate::domain::DomainError;

#[async_trait]
pub trait AuthVerifier: Send + Sync {
    async fn verify_user_exists(&self, user_id: Uuid) -> Result<(), DomainError>;
}
