use std::sync::Arc;

use uuid::Uuid;

use crate::application::dto::create_reservation_input::CreateReservationInput;
use crate::domain::DomainError;
use crate::domain::entities::reservation::Reservation;
use crate::domain::ports::auth_verifier::AuthVerifier;
use crate::domain::ports::reservation_repository::ReservationRepository;
use crate::domain::value_objects::time_range::TimeRange;

// ReservationService orquesta el caso de uso completo: valida, construye la
// entidad de dominio, persiste y registra auditoría.
// El por qué de depender de traits (no de PostgresReservationRepo concreto):
// esta capa no sabe NADA de SQLx ni reqwest, solo del contrato. Testeable con mocks.
pub struct ReservationService {
    repo: Arc<dyn ReservationRepository>,
    auth: Arc<dyn AuthVerifier>,
}

impl ReservationService {
    pub fn new(repo: Arc<dyn ReservationRepository>, auth: Arc<dyn AuthVerifier>) -> Self {
        Self { repo, auth }
    }

    // Crea una reserva. Orden de validación pensado para fallar barato primero:
    //   1. rango válido (sin tocar red ni DB)
    //   2. usuario existe (HTTP a auth-service)
    //   3. persistir (la DB rechaza solapamientos vía EXCLUDE)
    pub async fn create(&self, input: CreateReservationInput) -> Result<Reservation, DomainError> {
        let time_range = TimeRange::new(input.start, input.end)?;

        self.auth.verify_user_exists(input.user_id).await?;

        let reservation = Reservation::new(
            input.user_id,
            input.space_id,
            time_range,
            input.notes,
        );

        // save() devuelve DomainError::Overlapping si choca con el EXCLUDE.
        self.repo.save(&reservation).await?;

        // Auditoría: estado inicial. No es crítico para el cliente, pero sí para
        // la defensa (demuestra trazabilidad). from=None porque es el nacimiento.
        self.repo
            .record_status_change(
                reservation.id(),
                None,
                reservation.status(),
                input.user_id,
                None,
            )
            .await?;

        Ok(reservation)
    }

    pub async fn get(&self, id: Uuid) -> Result<Reservation, DomainError> {
        self.repo.find_by_id(id).await
    }

    pub async fn list_for_user(&self, user_id: Uuid) -> Result<Vec<Reservation>, DomainError> {
        self.repo.find_by_user(user_id).await
    }

    // Confirma una reserva pending. Solo el dueño puede hacerlo.
    pub async fn confirm(&self, id: Uuid, actor: Uuid) -> Result<Reservation, DomainError> {
        let mut reservation = self.repo.find_by_id(id).await?;
        ensure_owner(&reservation, actor)?;

        let from = reservation.status();
        reservation.confirm()?;
        self.repo.update(&reservation).await?;
        self.repo
            .record_status_change(id, Some(from), reservation.status(), actor, None)
            .await?;

        Ok(reservation)
    }

    // Cancela una reserva. Al pasar a cancelled, el EXCLUDE deja de aplicar
    // y el espacio queda libre en ese rango automáticamente.
    pub async fn cancel(
        &self,
        id: Uuid,
        actor: Uuid,
        reason: Option<String>,
    ) -> Result<Reservation, DomainError> {
        let mut reservation = self.repo.find_by_id(id).await?;
        ensure_owner(&reservation, actor)?;

        let from = reservation.status();
        reservation.cancel(reason.clone())?;
        self.repo.update(&reservation).await?;
        self.repo
            .record_status_change(id, Some(from), reservation.status(), actor, reason.as_deref())
            .await?;

        Ok(reservation)
    }
}

// Regla de autorización: solo el usuario dueño de la reserva puede modificarla.
// (Roles admin se podrían añadir aquí leyendo el claim de rol en el futuro.)
fn ensure_owner(reservation: &Reservation, actor: Uuid) -> Result<(), DomainError> {
    if reservation.user_id() != actor {
        return Err(DomainError::Forbidden);
    }
    Ok(())
}
