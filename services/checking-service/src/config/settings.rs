use std::env;

// Settings centraliza la lectura de variables de entorno.
// Decisión: leer todo una sola vez al arranque y fallar temprano si algo falta,
// en vez de leer env vars desperdigadas por el código.
#[derive(Debug, Clone)]
pub struct Settings {
    pub database_url: String,
    pub database_max_connections: u32,
    pub server_port: u16,
    pub jwt_secret: String,
    pub jwt_issuer: String,
    pub jwt_audience: Option<String>,
    pub auth_service_url: String,
}

impl Settings {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            database_url: required("DATABASE_URL")?,
            database_max_connections: optional_parse("DATABASE_MAX_CONNECTIONS", 10)?,
            server_port: optional_parse("SERVER_PORT", 3000)?,
            jwt_secret: required("JWT_SECRET")?,
            jwt_issuer: env::var("JWT_ISSUER").unwrap_or_else(|_| "coworking-auth".to_string()),
            jwt_audience: env::var("JWT_AUDIENCE").ok().filter(|v| !v.is_empty()),
            auth_service_url: required("AUTH_SERVICE_URL")?,
        })
    }
}

fn required(key: &str) -> anyhow::Result<String> {
    env::var(key).map_err(|_| anyhow::anyhow!("missing env var: {key}"))
}

fn optional_parse<T: std::str::FromStr>(key: &str, default: T) -> anyhow::Result<T>
where
    T::Err: std::fmt::Display,
{
    match env::var(key) {
        Ok(v) => v
            .parse::<T>()
            .map_err(|e| anyhow::anyhow!("invalid {key}: {e}")),
        Err(_) => Ok(default),
    }
}
