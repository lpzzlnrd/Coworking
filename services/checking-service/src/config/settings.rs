use std::env;

// Settings centraliza la lectura de variables de entorno.
// Decisión: leer todo una sola vez al arranque y fallar temprano si algo falta,
// en vez de leer env vars desperdigadas por el código.
#[derive(Debug, Clone)]
pub struct Settings {
    pub database_url: String,
    pub server_port: u16,
    pub jwt_secret: String,
    pub jwt_issuer: String,
    pub auth_service_url: String,
}

impl Settings {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            database_url: required("DATABASE_URL")?,
            server_port: required("SERVER_PORT")?.parse()?,
            jwt_secret: required("JWT_SECRET")?,
            jwt_issuer: env::var("JWT_ISSUER").unwrap_or_else(|_| "coworking-auth".to_string()),
            auth_service_url: required("AUTH_SERVICE_URL")?,
        })
    }
}

fn required(key: &str) -> anyhow::Result<String> {
    env::var(key).map_err(|_| anyhow::anyhow!("missing env var: {key}"))
}
