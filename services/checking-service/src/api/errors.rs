use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

use crate::domain::DomainError;

// AppError es el único error que los handlers devuelven. Su trabajo es traducir
// el DomainError (lenguaje de negocio) a un status HTTP + body JSON consistente.
// El por qué de centralizarlo: ningún handler decide códigos a mano, se mapea
// en un solo lugar y así nunca filtramos detalles internos al cliente.
pub struct AppError(pub DomainError);

impl From<DomainError> for AppError {
    fn from(e: DomainError) -> Self {
        AppError(e)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self.0 {
            DomainError::Overlapping => (
                StatusCode::CONFLICT,
                "el espacio ya está reservado en ese horario".to_string(),
            ),
            DomainError::InvalidStatusTransition { .. } => {
                (StatusCode::CONFLICT, self.0.to_string())
            }
            DomainError::InvalidTimeRange(_) => (StatusCode::BAD_REQUEST, self.0.to_string()),
            DomainError::NotFound => (StatusCode::NOT_FOUND, self.0.to_string()),
            DomainError::Forbidden => (StatusCode::FORBIDDEN, self.0.to_string()),
            // Internal: logueamos el detalle pero al cliente solo le decimos "error interno".
            DomainError::Internal(detail) => {
                tracing::error!(error = %detail, "internal error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "error interno del servidor".to_string(),
                )
            }
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}
