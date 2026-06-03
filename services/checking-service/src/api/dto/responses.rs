use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

use crate::domain::entities::reservation::Reservation;

// Forma pública de una reserva. Aplanamos el TimeRange en start/end porque
// es lo que el frontend espera; no exponemos la representación interna.
#[derive(Debug, Serialize)]
pub struct ReservationResponse {
    pub id: Uuid,
    pub user_id: Uuid,
    pub space_id: Uuid,
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub status: String,
    pub notes: Option<String>,
    pub cancellation_reason: Option<String>,
    pub cancelled_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<Reservation> for ReservationResponse {
    fn from(r: Reservation) -> Self {
        Self {
            id: r.id(),
            user_id: r.user_id(),
            space_id: r.space_id(),
            start: r.time_range().start(),
            end: r.time_range().end(),
            status: r.status().as_str().to_string(),
            notes: r.notes().map(str::to_string),
            cancellation_reason: r.cancellation_reason().map(str::to_string),
            cancelled_at: r.cancelled_at(),
            created_at: r.created_at(),
            updated_at: r.updated_at(),
        }
    }
}
