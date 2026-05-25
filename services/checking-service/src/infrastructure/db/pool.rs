use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

// Pool de conexiones: un socket por request matarían la DB; el pool reusa conexiones.
pub async fn build_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await
}
