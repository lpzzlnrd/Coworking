use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::domain::DomainError;
use crate::domain::value_objects::time_range::TimeRange;

// Estados que puede tener una reserva en su ciclo de vida.
// El por qué del enum vs un string libre: el compilador nos obliga a manejar
// todas las transiciones explícitamente, y el SQL es idéntico (reservation_status).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReservationStatus {
    Pending,
    Confirmed,
    Cancelled,
    Completed,
    NoShow,
}

impl ReservationStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Confirmed => "confirmed",
            Self::Cancelled => "cancelled",
            Self::Completed => "completed",
            Self::NoShow => "no_show",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(Self::Pending),
            "confirmed" => Some(Self::Confirmed),
            "cancelled" => Some(Self::Cancelled),
            "completed" => Some(Self::Completed),
            "no_show" => Some(Self::NoShow),
            _ => None,
        }
    }

    // Reservas "vivas" (las que ocupan el espacio). Coincide con la cláusula
    // WHERE del EXCLUDE en la migración: solo pending y confirmed bloquean.
    pub fn is_active(&self) -> bool {
        matches!(self, Self::Pending | Self::Confirmed)
    }
}

// Reservation es el agregado principal del dominio.
// Decisión: los campos son privados y se exponen vía métodos para que las
// invariantes (transiciones de estado, consistencia de cancelled_at) no se
// puedan romper desde fuera. La capa de infraestructura reconstruye la entidad
// con `rehydrate` cuando lee de la DB (los datos ya están validados allí).
#[derive(Debug, Clone)]
pub struct Reservation {
    id: Uuid,
    user_id: Uuid,
    space_id: Uuid,
    time_range: TimeRange,
    status: ReservationStatus,
    notes: Option<String>,
    cancellation_reason: Option<String>,
    cancelled_at: Option<DateTime<Utc>>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

impl Reservation {
    // Crea una reserva nueva en estado Pending.
    // El por qué de no aceptar `status` aquí: una reserva siempre nace pending;
    // forzar otros estados es síntoma de un bug en la capa que llama.
    pub fn new(
        user_id: Uuid,
        space_id: Uuid,
        time_range: TimeRange,
        notes: Option<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            user_id,
            space_id,
            time_range,
            status: ReservationStatus::Pending,
            notes,
            cancellation_reason: None,
            cancelled_at: None,
            created_at: now,
            updated_at: now,
        }
    }

    // Reconstruye desde persistencia. Solo lo llama la capa infrastructure
    // al mapear filas de DB; no validamos invariantes porque ya las garantiza
    // la migración con CHECKs.
    #[allow(clippy::too_many_arguments)]
    pub fn rehydrate(
        id: Uuid,
        user_id: Uuid,
        space_id: Uuid,
        time_range: TimeRange,
        status: ReservationStatus,
        notes: Option<String>,
        cancellation_reason: Option<String>,
        cancelled_at: Option<DateTime<Utc>>,
        created_at: DateTime<Utc>,
        updated_at: DateTime<Utc>,
    ) -> Self {
        Self {
            id,
            user_id,
            space_id,
            time_range,
            status,
            notes,
            cancellation_reason,
            cancelled_at,
            created_at,
            updated_at,
        }
    }

    pub fn id(&self) -> Uuid {
        self.id
    }
    pub fn user_id(&self) -> Uuid {
        self.user_id
    }
    pub fn space_id(&self) -> Uuid {
        self.space_id
    }
    pub fn time_range(&self) -> TimeRange {
        self.time_range
    }
    pub fn status(&self) -> ReservationStatus {
        self.status
    }
    pub fn notes(&self) -> Option<&str> {
        self.notes.as_deref()
    }
    pub fn cancellation_reason(&self) -> Option<&str> {
        self.cancellation_reason.as_deref()
    }
    pub fn cancelled_at(&self) -> Option<DateTime<Utc>> {
        self.cancelled_at
    }
    pub fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }
    pub fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    // Transiciones permitidas:
    //   Pending   -> Confirmed | Cancelled
    //   Confirmed -> Completed | Cancelled | NoShow
    //   Cancelled, Completed, NoShow son terminales.
    // El por qué de centralizarlas aquí: si alguien edita la fila en DB a mano
    // puede romper la consistencia, pero al menos el código nunca lo hará.
    pub fn confirm(&mut self) -> Result<(), DomainError> {
        match self.status {
            ReservationStatus::Pending => {
                self.status = ReservationStatus::Confirmed;
                self.updated_at = Utc::now();
                Ok(())
            }
            other => Err(DomainError::InvalidStatusTransition {
                from: other.as_str().to_string(),
                to: ReservationStatus::Confirmed.as_str().to_string(),
            }),
        }
    }

    pub fn cancel(&mut self, reason: Option<String>) -> Result<(), DomainError> {
        match self.status {
            ReservationStatus::Pending | ReservationStatus::Confirmed => {
                let now = Utc::now();
                self.status = ReservationStatus::Cancelled;
                self.cancelled_at = Some(now);
                self.cancellation_reason = reason;
                self.updated_at = now;
                Ok(())
            }
            other => Err(DomainError::InvalidStatusTransition {
                from: other.as_str().to_string(),
                to: ReservationStatus::Cancelled.as_str().to_string(),
            }),
        }
    }

    pub fn complete(&mut self) -> Result<(), DomainError> {
        match self.status {
            ReservationStatus::Confirmed => {
                self.status = ReservationStatus::Completed;
                self.updated_at = Utc::now();
                Ok(())
            }
            other => Err(DomainError::InvalidStatusTransition {
                from: other.as_str().to_string(),
                to: ReservationStatus::Completed.as_str().to_string(),
            }),
        }
    }

    pub fn mark_no_show(&mut self) -> Result<(), DomainError> {
        match self.status {
            ReservationStatus::Confirmed => {
                self.status = ReservationStatus::NoShow;
                self.updated_at = Utc::now();
                Ok(())
            }
            other => Err(DomainError::InvalidStatusTransition {
                from: other.as_str().to_string(),
                to: ReservationStatus::NoShow.as_str().to_string(),
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn sample_range() -> TimeRange {
        TimeRange::new(
            Utc.with_ymd_and_hms(2026, 6, 1, 10, 0, 0).unwrap(),
            Utc.with_ymd_and_hms(2026, 6, 1, 12, 0, 0).unwrap(),
        )
        .unwrap()
    }

    fn sample() -> Reservation {
        Reservation::new(Uuid::new_v4(), Uuid::new_v4(), sample_range(), None)
    }

    #[test]
    fn new_reservation_is_pending() {
        let r = sample();
        assert_eq!(r.status(), ReservationStatus::Pending);
        assert!(r.cancelled_at().is_none());
    }

    #[test]
    fn confirm_from_pending_ok() {
        let mut r = sample();
        r.confirm().unwrap();
        assert_eq!(r.status(), ReservationStatus::Confirmed);
    }

    #[test]
    fn confirm_from_cancelled_fails() {
        let mut r = sample();
        r.cancel(None).unwrap();
        let err = r.confirm().unwrap_err();
        assert!(matches!(err, DomainError::InvalidStatusTransition { .. }));
    }

    #[test]
    fn cancel_sets_cancelled_at_and_reason() {
        let mut r = sample();
        r.cancel(Some("usuario lo pidió".into())).unwrap();
        assert_eq!(r.status(), ReservationStatus::Cancelled);
        assert!(r.cancelled_at().is_some());
        assert_eq!(r.cancellation_reason(), Some("usuario lo pidió"));
    }

    #[test]
    fn cannot_cancel_terminal_state() {
        let mut r = sample();
        r.confirm().unwrap();
        r.complete().unwrap();
        let err = r.cancel(None).unwrap_err();
        assert!(matches!(err, DomainError::InvalidStatusTransition { .. }));
    }

    #[test]
    fn complete_requires_confirmed() {
        let mut r = sample();
        let err = r.complete().unwrap_err();
        assert!(matches!(err, DomainError::InvalidStatusTransition { .. }));
        r.confirm().unwrap();
        r.complete().unwrap();
        assert_eq!(r.status(), ReservationStatus::Completed);
    }

    #[test]
    fn no_show_requires_confirmed() {
        let mut r = sample();
        let err = r.mark_no_show().unwrap_err();
        assert!(matches!(err, DomainError::InvalidStatusTransition { .. }));
        r.confirm().unwrap();
        r.mark_no_show().unwrap();
        assert_eq!(r.status(), ReservationStatus::NoShow);
    }

    #[test]
    fn status_roundtrip_string() {
        for s in [
            ReservationStatus::Pending,
            ReservationStatus::Confirmed,
            ReservationStatus::Cancelled,
            ReservationStatus::Completed,
            ReservationStatus::NoShow,
        ] {
            assert_eq!(ReservationStatus::from_str(s.as_str()), Some(s));
        }
    }

    #[test]
    fn active_status_matches_db_filter() {
        // Debe coincidir con WHERE status IN ('pending', 'confirmed') del EXCLUDE.
        assert!(ReservationStatus::Pending.is_active());
        assert!(ReservationStatus::Confirmed.is_active());
        assert!(!ReservationStatus::Cancelled.is_active());
        assert!(!ReservationStatus::Completed.is_active());
        assert!(!ReservationStatus::NoShow.is_active());
    }
}
