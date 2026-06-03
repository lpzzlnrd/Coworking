// Puerto del dominio. La infraestructura lo implementa.
// El por qué: permite testear application/ con un mock, sin DB real.
use async_trait::async_trait;
use uuid::Uuid;

use crate::domain::DomainError;
use crate::domain::entities::reservation::{Reservation, ReservationStatus};

#[async_trait]
pub trait ReservationRepository: Send + Sync {
    // Ping para el healthcheck / smoke tests.
    async fn ping(&self) -> Result<(), DomainError>;

    // Inserta una reserva nueva. Si choca con el EXCLUDE de solapamiento,
    // la implementación debe devolver DomainError::Overlapping (no un error genérico).
    async fn save(&self, reservation: &Reservation) -> Result<(), DomainError>;

    async fn find_by_id(&self, id: Uuid) -> Result<Reservation, DomainError>;

    async fn find_by_user(&self, user_id: Uuid) -> Result<Vec<Reservation>, DomainError>;

    // Persiste un cambio de estado ya validado por el dominio.
    // Recibe la entidad completa porque cancel/confirm también tocan
    // cancelled_at, cancellation_reason y updated_at.
    async fn update(&self, reservation: &Reservation) -> Result<(), DomainError>;

    // Registra una fila en reservation_status_history (auditoría).
    async fn record_status_change(
        &self,
        reservation_id: Uuid,
        from: Option<ReservationStatus>,
        to: ReservationStatus,
        changed_by: Uuid,
        reason: Option<&str>,
    ) -> Result<(), DomainError>;
}
