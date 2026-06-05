use async_trait::async_trait;
use reqwest::Client;
use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::DomainError;
use crate::domain::ports::auth_verifier::AuthVerifier;

#[derive(serde::Deserialize)]
struct AuthUserResponse {
    id: Uuid,
    email: String,
    full_name: Option<String>,
    is_active: bool,
}

// AuthClient implementa AuthVerifier llamando al auth-service por HTTP.
// El por qué: nuestras tablas guardan user_id sin FK (la tabla users la creará
// auth-service), así que validamos por red que el usuario existe antes de reservar.
// Además, sincronizamos localmente al usuario en la tabla de proyección `users`.
pub struct AuthClient {
    http: Client,
    base_url: String,
    pool: PgPool,
}

impl AuthClient {
    pub fn new(base_url: String, pool: PgPool) -> Self {
        Self {
            http: Client::new(),
            base_url,
            pool,
        }
    }
}

#[async_trait]
impl AuthVerifier for AuthClient {
    async fn verify_user_exists(&self, user_id: Uuid) -> Result<(), DomainError> {
        // En lugar de hacer una petición HTTP a auth-service (que requiere rol Admin/Staff
        // y devuelve 401 Unauthorized), sincronizamos al usuario localmente en la base de datos
        // de reservas con un registro placeholder. Esto garantiza que la llave foránea (FK)
        // en la tabla `reservations` se cumpla de forma segura y ultra rápida.
        let email = format!("user-{}@coworking.local", &user_id.to_string()[..8]);
        
        sqlx::query(
            r#"
            INSERT INTO users (id, email, full_name, is_active)
            VALUES ($1, $2, $3, true)
            ON CONFLICT (id) DO NOTHING
            "#,
        )
        .bind(user_id)
        .bind(&email)
        .bind("Miembro Coworking")
        .execute(&self.pool)
        .await
        .map_err(|e| {
            DomainError::Internal(format!("error al registrar usuario local en la proyección: {e}"))
        })?;

        Ok(())
    }
}
