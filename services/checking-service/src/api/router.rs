use axum::Router;
use axum::routing::get;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::api::handlers::health;
use crate::api::state::AppState;

// Arma el router con todas las rutas y middleware globales.
// El por qué de separar esta función: facilita testear con un AppState mock
// sin tener que arrancar el servidor real.
pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health::health))
        // Las rutas de reservas se montarán en el hito 5.
        .with_state(state)
        .layer(TraceLayer::new_for_http())
        .layer(
            // CORS permisivo está bien en académico; en prod restringir origins.
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
}
