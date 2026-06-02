use std::ops::Bound;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use sqlx::postgres::types::PgRange;
use sqlx::Row;
use uuid::Uuid;

use crate::domain::DomainError;
use crate::domain::entities::reservation::{Reservation, ReservationStatus};
use crate::domain::ports::reservation_repository::ReservationRepository;
use crate::domain::value_objects::time_range::TimeRange;

// SQLSTATE de PostgreSQL para violación de restricción EXCLUDE.
// El por qué de capturarlo: cuando dos reservas se solapan, Postgres lanza este
// código vía el EXCLUDE USING gist. Lo traducimos a DomainError::Overlapping
// para que el API devuelva 409 con mensaje claro, no un 500 genérico.
const EXCLUSION_VIOLATION: &str = "23P01";

// Decisión: usamos sqlx::query (runtime) en vez de query! (macro compile-time)
// para que el proyecto compile SIN una DB viva ni cache .sqlx/. Para un proyecto
// académico es más cómodo; el costo es que los errores de SQL se ven en runtime.
pub struct PostgresReservationRepo {
    pool: PgPool,
}

impl PostgresReservationRepo {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

// Convierte el TimeRange del dominio al PgRange que entiende sqlx para TSTZRANGE.
// Rango semiabierto [start, end): inicio incluido, fin excluido — igual que el dominio.
fn to_pg_range(tr: &TimeRange) -> PgRange<DateTime<Utc>> {
    PgRange {
        start: Bound::Included(tr.start()),
        end: Bound::Excluded(tr.end()),
    }
}

// Reconstruye un TimeRange desde el PgRange leído de la DB.
fn from_pg_range(range: PgRange<DateTime<Utc>>) -> Result<TimeRange, DomainError> {
    let start = match range.start {
        Bound::Included(t) | Bound::Excluded(t) => t,
        Bound::Unbounded => {
            return Err(DomainError::Internal("rango sin inicio en DB".into()));
        }
    };
    let end = match range.end {
        Bound::Included(t) | Bound::Excluded(t) => t,
        Bound::Unbounded => {
            return Err(DomainError::Internal("rango sin fin en DB".into()));
        }
    };
    TimeRange::new(start, end)
}

// Mapea cualquier sqlx::Error a un DomainError. Distingue el caso de solapamiento
// (que es un error de negocio esperado) del resto (que son fallos internos).
fn map_sqlx_error(e: sqlx::Error) -> DomainError {
    if let sqlx::Error::Database(db_err) = &e {
        if db_err.code().as_deref() == Some(EXCLUSION_VIOLATION) {
            return DomainError::Overlapping;
        }
    }
    if matches!(e, sqlx::Error::RowNotFound) {
        return DomainError::NotFound;
    }
    DomainError::Internal(e.to_string())
}

// Mapea una fila de la tabla reservations a la entidad de dominio.
fn row_to_reservation(row: &sqlx::postgres::PgRow) -> Result<Reservation, DomainError> {
    let status_str: String = row.try_get("status").map_err(map_sqlx_error)?;
    let status = ReservationStatus::from_str(&status_str)
        .ok_or_else(|| DomainError::Internal(format!("status desconocido en DB: {status_str}")))?;

    let pg_range: PgRange<DateTime<Utc>> = row.try_get("time_range").map_err(map_sqlx_error)?;
    let time_range = from_pg_range(pg_range)?;

    Ok(Reservation::rehydrate(
        row.try_get("id").map_err(map_sqlx_error)?,
        row.try_get("user_id").map_err(map_sqlx_error)?,
        row.try_get("space_id").map_err(map_sqlx_error)?,
        time_range,
        status,
        row.try_get("notes").map_err(map_sqlx_error)?,
        row.try_get("cancellation_reason").map_err(map_sqlx_error)?,
        row.try_get("cancelled_at").map_err(map_sqlx_error)?,
        row.try_get("created_at").map_err(map_sqlx_error)?,
        row.try_get("updated_at").map_err(map_sqlx_error)?,
    ))
}

#[async_trait]
impl ReservationRepository for PostgresReservationRepo {
    async fn ping(&self) -> Result<(), DomainError> {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await
            .map(|_| ())
            .map_err(map_sqlx_error)
    }

    async fn save(&self, reservation: &Reservation) -> Result<(), DomainError> {
        sqlx::query(
            r#"
            INSERT INTO reservations
                (id, user_id, space_id, time_range, status, notes,
                 cancellation_reason, cancelled_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5::reservation_status, $6, $7, $8, $9, $10)
            "#,
        )
        .bind(reservation.id())
        .bind(reservation.user_id())
        .bind(reservation.space_id())
        .bind(to_pg_range(&reservation.time_range()))
        .bind(reservation.status().as_str())
        .bind(reservation.notes())
        .bind(reservation.cancellation_reason())
        .bind(reservation.cancelled_at())
        .bind(reservation.created_at())
        .bind(reservation.updated_at())
        .execute(&self.pool)
        .await
        .map(|_| ())
        .map_err(map_sqlx_error)
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Reservation, DomainError> {
        let row = sqlx::query(
            r#"
            SELECT id, user_id, space_id, time_range, status::text AS status,
                   notes, cancellation_reason, cancelled_at, created_at, updated_at
            FROM reservations
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(map_sqlx_error)?
        .ok_or(DomainError::NotFound)?;

        row_to_reservation(&row)
    }

    async fn find_by_user(&self, user_id: Uuid) -> Result<Vec<Reservation>, DomainError> {
        let rows = sqlx::query(
            r#"
            SELECT id, user_id, space_id, time_range, status::text AS status,
                   notes, cancellation_reason, cancelled_at, created_at, updated_at
            FROM reservations
            WHERE user_id = $1
            ORDER BY created_at DESC
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
        .map_err(map_sqlx_error)?;

        rows.iter().map(row_to_reservation).collect()
    }

    async fn update(&self, reservation: &Reservation) -> Result<(), DomainError> {
        let affected = sqlx::query(
            r#"
            UPDATE reservations
            SET status = $2::reservation_status,
                notes = $3,
                cancellation_reason = $4,
                cancelled_at = $5,
                updated_at = $6
            WHERE id = $1
            "#,
        )
        .bind(reservation.id())
        .bind(reservation.status().as_str())
        .bind(reservation.notes())
        .bind(reservation.cancellation_reason())
        .bind(reservation.cancelled_at())
        .bind(reservation.updated_at())
        .execute(&self.pool)
        .await
        .map_err(map_sqlx_error)?
        .rows_affected();

        if affected == 0 {
            return Err(DomainError::NotFound);
        }
        Ok(())
    }

    async fn record_status_change(
        &self,
        reservation_id: Uuid,
        from: Option<ReservationStatus>,
        to: ReservationStatus,
        changed_by: Uuid,
        reason: Option<&str>,
    ) -> Result<(), DomainError> {
        sqlx::query(
            r#"
            INSERT INTO reservation_status_history
                (reservation_id, from_status, to_status, changed_by, reason)
            VALUES ($1, $2::reservation_status, $3::reservation_status, $4, $5)
            "#,
        )
        .bind(reservation_id)
        .bind(from.map(|s| s.as_str()))
        .bind(to.as_str())
        .bind(changed_by)
        .bind(reason)
        .execute(&self.pool)
        .await
        .map(|_| ())
        .map_err(map_sqlx_error)
    }
}
