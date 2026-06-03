use axum::Router;
use axum::routing::{delete, get, patch, post};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use crate::api::handlers::{health, reservations};
use crate::api::state::AppState;

// Arma el router con todas las rutas y middleware globales.
// El por qué de separar esta función: facilita testear con un AppState
// sin tener que arrancar el servidor real.
pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health::health))
        .route("/reservations", post(reservations::create))
        .route("/reservations", get(reservations::list_mine))
        .route("/reservations/{id}", get(reservations::get_one))
        .route("/reservations/{id}", delete(reservations::cancel))
        .route("/reservations/{id}/confirm", patch(reservations::confirm))
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
