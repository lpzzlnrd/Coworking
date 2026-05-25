use anyhow::Context;
use checking_service::config::Settings;
use tracing_subscriber::{EnvFilter, fmt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Cargar .env primero para que RUST_LOG y demás estén disponibles antes del logger.
    let _ = dotenvy::dotenv();

    fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with_target(false)
        .init();

    let settings = Settings::from_env().context("loading settings from environment")?;

    tracing::info!(port = settings.server_port, "checking-service starting");

    // TODO: cablear PgPool, router de Axum y graceful shutdown en el siguiente hito.
    // Por ahora, dejar el binario compilable como esqueleto.

    Ok(())
}
