// Puerto del dominio. La infraestructura lo implementa.
// El por qué: permite testear el dominio con mocks, sin DB real.
use async_trait::async_trait;
use crate::domain::DomainError;

#[async_trait]
pub trait ReservationRepository: Send + Sync {
    async fn ping(&self) -> Result<(), DomainError>;
}
