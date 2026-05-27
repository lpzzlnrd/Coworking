use std::sync::Arc;

use sqlx::PgPool;

use crate::application::reservation_service::ReservationService;
use crate::config::Settings;

// AppState es lo que Axum inyecta en cada handler vía `State<AppState>`.
// Decisión: settings y el servicio van en Arc para clonarlos barato entre
// handlers. PgPool ya es clonable barato (internamente Arc).
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub settings: Arc<Settings>,
    pub reservations: Arc<ReservationService>,
}
