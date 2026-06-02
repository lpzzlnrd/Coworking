use axum::Json;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use uuid::Uuid;

use crate::api::dto::requests::{CancelReservationRequest, CreateReservationRequest};
use crate::api::dto::responses::ReservationResponse;
use crate::api::errors::AppError;
use crate::api::middleware::auth::AuthUser;
use crate::api::state::AppState;
use crate::application::dto::create_reservation_input::CreateReservationInput;

// POST /reservations — crea una reserva a nombre del usuario autenticado.
pub async fn create(
    State(state): State<AppState>,
    user: AuthUser,
    Json(body): Json<CreateReservationRequest>,
) -> Result<(StatusCode, Json<ReservationResponse>), AppError> {
    let input = CreateReservationInput {
        user_id: user.user_id,
        space_id: body.space_id,
        start: body.start,
        end: body.end,
        notes: body.notes,
    };

    let reservation = state.reservations.create(input).await?;
    Ok((StatusCode::CREATED, Json(reservation.into())))
}

// GET /reservations/:id — solo el dueño puede verla.
pub async fn get_one(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ReservationResponse>, AppError> {
    let reservation = state.reservations.get(id).await?;
    if reservation.user_id() != user.user_id {
        return Err(crate::domain::DomainError::Forbidden.into());
    }
    Ok(Json(reservation.into()))
}

// GET /reservations — lista las reservas del usuario autenticado.
pub async fn list_mine(
    State(state): State<AppState>,
    user: AuthUser,
) -> Result<Json<Vec<ReservationResponse>>, AppError> {
    let reservations = state.reservations.list_for_user(user.user_id).await?;
    Ok(Json(reservations.into_iter().map(Into::into).collect()))
}

// PATCH /reservations/:id/confirm — confirma una reserva pending.
pub async fn confirm(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> Result<Json<ReservationResponse>, AppError> {
    let reservation = state.reservations.confirm(id, user.user_id).await?;
    Ok(Json(reservation.into()))
}

// DELETE /reservations/:id — cancela una reserva (libera el espacio).
pub async fn cancel(
    State(state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    body: Option<Json<CancelReservationRequest>>,
) -> Result<Json<ReservationResponse>, AppError> {
    let reason = body.and_then(|Json(b)| b.reason);
    let reservation = state.reservations.cancel(id, user.user_id, reason).await?;
    Ok(Json(reservation.into()))
}
