use chrono::{DateTime, Utc};
use serde::Deserialize;
use uuid::Uuid;

// Body de POST /reservations.
// Nota: user_id NO viene en el body — se toma del JWT (request.extensions) para
// que un usuario no pueda crear reservas a nombre de otro.
#[derive(Debug, Deserialize)]
pub struct CreateReservationRequest {
    pub space_id: Uuid,
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub notes: Option<String>,
}

// Body de DELETE /reservations/:id (cancelar). Razón opcional.
#[derive(Debug, Deserialize, Default)]
pub struct CancelReservationRequest {
    pub reason: Option<String>,
}
