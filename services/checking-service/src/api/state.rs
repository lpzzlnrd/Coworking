use std::sync::Arc;

use sqlx::PgPool;

use crate::config::Settings;

// AppState es lo que Axum inyecta en cada handler vía `State<AppState>`.
// Decisión: envolver settings en Arc para clonarlo barato entre handlers,
// sin recargar env vars. PgPool ya internamente es Arc-like (clonarlo es barato).
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub settings: Arc<Settings>,
}
