use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;

// Pool de conexiones: cada handler async toma una conexión prestada y la devuelve.
// Sin pool, abriríamos un socket por request y mataríamos a Postgres.
pub async fn build_pool(database_url: &str, max_connections: u32) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(max_connections)
        .connect(database_url)
        .await
}
