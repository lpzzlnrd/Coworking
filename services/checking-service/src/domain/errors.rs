use thiserror::Error;

// DomainError representa errores propios de la lógica de reservas.
// El por qué: separar errores "esperables del dominio" (solapamiento, rango inválido)
// de errores de infraestructura (DB caída, JWT corrupto) facilita mapearlos a
// códigos HTTP correctos en api/errors.rs.
#[derive(Debug, Error)]
pub enum DomainError {
    #[error("la reserva se solapa con otra existente para ese espacio")]
    Overlapping,

    #[error("rango de tiempo inválido: {0}")]
    InvalidTimeRange(String),

    #[error("la reserva no existe")]
    NotFound,

    #[error("transición de estado no permitida: {from} -> {to}")]
    InvalidStatusTransition { from: String, to: String },

    #[error("el usuario no tiene permiso para esta operación")]
    Forbidden,
}
