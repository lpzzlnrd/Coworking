use std::sync::Arc;

use anyhow::Context;
use checking_service::api::router::build_router;
use checking_service::api::state::AppState;
use checking_service::config::Settings;
use checking_service::infrastructure::db::pool::build_pool;
use tokio::net::TcpListener;
use tokio::signal;
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
    let settings = Arc::new(settings);

    let pool = build_pool(&settings.database_url, settings.database_max_connections)
        .await
        .context("connecting to database")?;

    // Correr migraciones al arranque. En proyectos serios se hace en pipeline aparte,
    // pero para un proyecto académico es más cómodo que se auto-aplique al subir.
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .context("running migrations")?;

    let state = AppState {
        pool,
        settings: settings.clone(),
    };

    let app = build_router(state);

    let addr = format!("0.0.0.0:{}", settings.server_port);
    let listener = TcpListener::bind(&addr)
        .await
        .with_context(|| format!("binding to {addr}"))?;

    tracing::info!(addr = %addr, "checking-service listening");

    // Graceful shutdown: ctrl+c o SIGTERM permite drenar requests en vuelo
    // antes de cerrar el proceso. Importante para no cortar transacciones a la mitad.
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("serving HTTP")?;

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("shutdown signal received");
}
