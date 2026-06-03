use chrono::{DateTime, Utc};
use uuid::Uuid;

// DTO de entrada al caso de uso CreateReservation.
// Vive aquí (no en api/) porque es el contrato del caso de uso, independiente
// del transporte HTTP: si mañana llega por gRPC o cola, este struct no cambia.
#[derive(Debug, Clone)]
pub struct CreateReservationInput {
    pub user_id: Uuid,
    pub space_id: Uuid,
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub notes: Option<String>,
}
