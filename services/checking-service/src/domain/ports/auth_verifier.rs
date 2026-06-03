// Puerto: verificar que un user_id existe en auth-service.
// El por qué: nuestras tablas guardan user_id como UUID sin FK directa a `users`
// (la creará auth-service cuando se coordine en `public`), así que mientras
// tanto validamos por HTTP que el usuario existe antes de aceptar la reserva.
use async_trait::async_trait;
use uuid::Uuid;

use crate::domain::DomainError;

#[async_trait]
pub trait AuthVerifier: Send + Sync {
    async fn verify_user_exists(&self, user_id: Uuid) -> Result<(), DomainError>;
}
