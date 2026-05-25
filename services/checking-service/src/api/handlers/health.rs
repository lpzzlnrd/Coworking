use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde_json::{Value, json};

use crate::api::state::AppState;

// Healthcheck: hace ping a Postgres con SELECT 1.
// El por qué: en defensa académica un /health que solo devuelve 200 no demuestra
// nada; pingear la DB confirma que el servicio realmente puede operar.
pub async fn health(State(state): State<AppState>) -> (StatusCode, Json<Value>) {
    match sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.pool)
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(json!({ "status": "ok", "database": "up" })),
        ),
        Err(e) => {
            tracing::error!(error = %e, "healthcheck: db ping failed");
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({ "status": "degraded", "database": "down" })),
            )
        }
    }
}
