// Tests de integración del PostgresReservationRepo.
// Requieren una DB real corriendo 
// Se ejecutan con: cargo test --test-threads=1
// si corren en paralelo pueden interferirse con el EXCLUDE de solapamiento.

#[cfg(test)]
mod tests {
    use chrono::{TimeZone, Utc};
    use sqlx::PgPool;
    use uuid::Uuid;

    use crate::domain::DomainError;
    use crate::domain::entities::reservation::{Reservation, ReservationStatus};
    use crate::domain::ports::reservation_repository::ReservationRepository;
    use crate::domain::value_objects::time_range::TimeRange;
    use crate::infrastructure::db::pool::build_pool;
    use crate::infrastructure::db::postgres_reservation_repo::PostgresReservationRepo;

    // Lee DATABASE_URL de la variable de entorno o usa el default local.
    // En CI se puede sobreescribir con TEST_DATABASE_URL.
    async fn test_pool() -> PgPool {
        let url = std::env::var("TEST_DATABASE_URL")
            .or_else(|_| std::env::var("DATABASE_URL"))
            .unwrap_or_else(|_| {
                "postgres://role:role@localhost:5432/role_manage".to_string()
            });
        build_pool(&url, 5).await.expect("no se pudo conectar a la DB de tests")
    }

    fn repo(pool: PgPool) -> PostgresReservationRepo {
        PostgresReservationRepo::new(pool)
    }

    // Helper: inserta un user y un space en las tablas de proyección para
    // satisfacer las FKs de reservations. Los elimina al salir (cleanup manual).
    async fn seed_user_and_space(pool: &PgPool) -> (Uuid, Uuid) {
        let user_id = Uuid::new_v4();
        let space_id = Uuid::new_v4();

        sqlx::query(
            "INSERT INTO users (id, email, full_name) VALUES ($1, $2, $3)",
        )
        .bind(user_id)
        .bind(format!("test-{}@example.com", user_id))
        .bind("Test User")
        .execute(pool)
        .await
        .expect("no se pudo insertar user de prueba");

        sqlx::query(
            "INSERT INTO spaces (id, name, resource_type, capacity) VALUES ($1, $2, $3, $4)",
        )
        .bind(space_id)
        .bind("Sala Test")
        .bind("meeting_room")
        .bind(4_i32)
        .execute(pool)
        .await
        .expect("no se pudo insertar space de prueba");

        (user_id, space_id)
    }

    // Helper: limpia todas las filas creadas por los tests (en orden FK).
    async fn cleanup(pool: &PgPool, user_id: Uuid, space_id: Uuid) {
        // reservation_status_history tiene CASCADE pero lo borramos explícito igual.
        sqlx::query("DELETE FROM reservations WHERE user_id = $1")
            .bind(user_id)
            .execute(pool)
            .await
            .ok();
        sqlx::query("DELETE FROM waitlist WHERE user_id = $1")
            .bind(user_id)
            .execute(pool)
            .await
            .ok();
        sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(user_id)
            .execute(pool)
            .await
            .ok();
        sqlx::query("DELETE FROM spaces WHERE id = $1")
            .bind(space_id)
            .execute(pool)
            .await
            .ok();
    }

    fn range(start_h: u32, end_h: u32) -> TimeRange {
        TimeRange::new(
            Utc.with_ymd_and_hms(2026, 12, 1, start_h, 0, 0).unwrap(),
            Utc.with_ymd_and_hms(2026, 12, 1, end_h, 0, 0).unwrap(),
        )
        .unwrap()
    }

    fn make_reservation(user_id: Uuid, space_id: Uuid, start_h: u32, end_h: u32) -> Reservation {
        Reservation::new(user_id, space_id, range(start_h, end_h), None)
    }

    // -------------------------------------------------------------------------
    // Test 1: ping — la DB responde
    // -------------------------------------------------------------------------
    #[tokio::test]
    async fn ping_returns_ok() {
        let pool = test_pool().await;
        let repo = repo(pool.clone());
        repo.ping().await.expect("ping falló");
    }

    // -------------------------------------------------------------------------
    // Test 2: save + find_by_id — round-trip básico
    // -------------------------------------------------------------------------
    #[tokio::test]
    async fn save_and_find_by_id() {
        let pool = test_pool().await;
        let (user_id, space_id) = seed_user_and_space(&pool).await;
        let repo = repo(pool.clone());

        let reservation = make_reservation(user_id, space_id, 10, 12);
        let id = reservation.id();

        repo.save(&reservation).await.expect("save falló");

        let found = repo.find_by_id(id).await.expect("find_by_id falló");
        assert_eq!(found.id(), id);
        assert_eq!(found.user_id(), user_id);
        assert_eq!(found.space_id(), space_id);
        assert_eq!(found.status(), ReservationStatus::Pending);
        assert_eq!(found.time_range().start(), reservation.time_range().start());
        assert_eq!(found.time_range().end(), reservation.time_range().end());

        cleanup(&pool, user_id, space_id).await;
    }

    // -------------------------------------------------------------------------
    // Test 3: find_by_id de un ID inexistente → NotFound
    // -------------------------------------------------------------------------
    #[tokio::test]
    async fn find_by_id_not_found() {
        let pool = test_pool().await;
        let repo = repo(pool.clone());

        let err = repo.find_by_id(Uuid::new_v4()).await.unwrap_err();
        assert!(matches!(err, DomainError::NotFound));
    }

    // -------------------------------------------------------------------------
    // Test 4: find_by_user devuelve todas las reservas del usuario
    // -------------------------------------------------------------------------
    #[tokio::test]
    async fn find_by_user_returns_all_reservations() {
        let pool = test_pool().await;
        let (user_id, space_id) = seed_user_and_space(&pool).await;
        let repo = repo(pool.clone());

        // Creamos 3 reservas en horarios distintos para el mismo usuario.
        let r1 = make_reservation(user_id, space_id, 8, 9);
        let r2 = make_reservation(user_id, space_id, 10, 11);
        let r3 = make_reservation(user_id, space_id, 14, 16);

        repo.save(&r1).await.unwrap();
        repo.save(&r2).await.unwrap();
        repo.save(&r3).await.unwrap();

        let all = repo.find_by_user(user_id).await.expect("find_by_user falló");
        assert_eq!(all.len(), 3);

        cleanup(&pool, user_id, space_id).await;
    }

    // -------------------------------------------------------------------------
    // Test 5: find_by_user con otro usuario no devuelve reservas ajenas
    // -------------------------------------------------------------------------
    #[tokio::test]
    async fn find_by_user_does_not_leak_other_users() {
        let pool = test_pool().await;
        let (user_a, space_id) = seed_user_and_space(&pool).await;
        let (user_b, space_id_b) = seed_user_and_space(&pool).await;
        let repo = repo(pool.clone());

        repo.save(&make_reservation(user_a, space_id, 9, 10))
            .await
            .unwrap();

        let results = repo.find_by_user(user_b).await.unwrap();
        assert!(
            results.iter().all(|r| r.user_id() == user_b),
            "find_by_user devolvió reservas de otro usuario"
        );

        cleanup(&pool, user_a, space_id).await;
        cleanup(&pool, user_b, space_id_b).await;
    }

    // -------------------------------------------------------------------------
    // Test 6: update persiste el nuevo estado (pending → confirmed)
    // -------------------------------------------------------------------------
    #[tokio::test]
    async fn update_persists_status_change() {
        let pool = test_pool().await;
        let (user_id, space_id) = seed_user_and_space(&pool).await;
        let repo = repo(pool.clone());

        let mut reservation = make_reservation(user_id, space_id, 10, 12);
        repo.save(&reservation).await.unwrap();

        reservation.confirm().unwrap();
        repo.update(&reservation).await.expect("update falló");

        let updated = repo.find_by_id(reservation.id()).await.unwrap();
        assert_eq!(updated.status(), ReservationStatus::Confirmed);

        cleanup(&pool, user_id, space_id).await;
    }

    // -------------------------------------------------------------------------
    // Test 7: update de un ID inexistente → NotFound
    // -------------------------------------------------------------------------
    #[tokio::test]
    async fn update_not_found() {
        let pool = test_pool().await;
        let (user_id, space_id) = seed_user_and_space(&pool).await;
        let repo = repo(pool.clone());

        // Construimos una reserva con IDs válidos pero sin guardarla en la DB.
        let reservation = make_reservation(user_id, space_id, 10, 12);
        let err = repo.update(&reservation).await.unwrap_err();
        assert!(matches!(err, DomainError::NotFound));

        cleanup(&pool, user_id, space_id).await;
    }

    // -------------------------------------------------------------------------
    // Test 8: ★ EL CORAZÓN ★ — el EXCLUDE rechaza reservas solapadas
    // La segunda reserva tiene un rango que se monta sobre la primera.
    // Postgres debe lanzar 23P01 (exclusion_violation) → DomainError::Overlapping.
    // -------------------------------------------------------------------------
    #[tokio::test]
    async fn overlapping_reservations_are_rejected() {
        let pool = test_pool().await;
        let (user_id, space_id) = seed_user_and_space(&pool).await;
        let repo = repo(pool.clone());

        // Primera reserva: [10, 12)
        let r1 = make_reservation(user_id, space_id, 10, 12);
        repo.save(&r1).await.expect("primera reserva debería guardarse");

        // Segunda reserva: [11, 13) — solapa con la primera (11 está dentro de [10,12))
        let r2 = make_reservation(user_id, space_id, 11, 13);
        let err = repo.save(&r2).await.unwrap_err();

        assert!(
            matches!(err, DomainError::Overlapping),
            "se esperaba Overlapping pero se obtuvo: {err:?}"
        );

        cleanup(&pool, user_id, space_id).await;
    }

    // -------------------------------------------------------------------------
    // Test 9: reservas que se TOCAN (una termina cuando otra empieza) SÍ se permiten
    // [8, 10) y [10, 12) no se solapan — el fin es exclusivo en el dominio y en Postgres.
    // -------------------------------------------------------------------------
    #[tokio::test]
    async fn touching_reservations_are_allowed() {
        let pool = test_pool().await;
        let (user_id, space_id) = seed_user_and_space(&pool).await;
        let repo = repo(pool.clone());

        let r1 = make_reservation(user_id, space_id, 8, 10);
        let r2 = make_reservation(user_id, space_id, 10, 12);

        repo.save(&r1).await.expect("primera reserva falló");
        repo.save(&r2)
            .await
            .expect("reservas que se tocan deben permitirse");

        cleanup(&pool, user_id, space_id).await;
    }

    // -------------------------------------------------------------------------
    // Test 10: reservas solapadas para ESPACIOS DISTINTOS sí se permiten
    // El EXCLUDE opera por (space_id, time_range) — espacios distintos no coliden.
    // -------------------------------------------------------------------------
    #[tokio::test]
    async fn overlapping_reservations_in_different_spaces_are_allowed() {
        let pool = test_pool().await;
        let (user_id, space_a) = seed_user_and_space(&pool).await;
        let (user_id_b, space_b) = seed_user_and_space(&pool).await;
        let repo = repo(pool.clone());

        // Mismo rango, mismo usuario — pero espacios distintos → OK
        let r1 = make_reservation(user_id, space_a, 10, 12);
        let r2 = make_reservation(user_id_b, space_b, 10, 12);

        repo.save(&r1).await.expect("reserva en espacio A falló");
        repo.save(&r2)
            .await
            .expect("reserva en espacio B con mismo rango debe permitirse");

        cleanup(&pool, user_id, space_a).await;
        cleanup(&pool, user_id_b, space_b).await;
    }

    // -------------------------------------------------------------------------
    // Test 11: una reserva cancelada no bloquea el mismo rango
    // El EXCLUDE solo aplica a status IN ('pending', 'confirmed').
    // Después de cancelar, otro usuario puede reservar el mismo slot.
    // -------------------------------------------------------------------------
    #[tokio::test]
    async fn cancelled_reservation_frees_the_slot() {
        let pool = test_pool().await;
        let (user_id, space_id) = seed_user_and_space(&pool).await;
        let repo = repo(pool.clone());

        // Reserva original: pending → luego cancelada
        let mut original = make_reservation(user_id, space_id, 10, 12);
        repo.save(&original).await.unwrap();

        original.cancel(Some("cambio de planes".into())).unwrap();
        repo.update(&original).await.unwrap();

        // Nueva reserva en el mismo slot — debe aceptarse porque la anterior está cancelada
        let new_res = make_reservation(user_id, space_id, 10, 12);
        repo.save(&new_res)
            .await
            .expect("debería poder reservar un slot liberado por cancelación");

        cleanup(&pool, user_id, space_id).await;
    }

    // -------------------------------------------------------------------------
    // Test 12: record_status_change inserta en reservation_status_history
    // -------------------------------------------------------------------------
    #[tokio::test]
    async fn record_status_change_inserts_history_row() {
        let pool = test_pool().await;
        let (user_id, space_id) = seed_user_and_space(&pool).await;
        let repo = repo(pool.clone());

        let reservation = make_reservation(user_id, space_id, 10, 12);
        repo.save(&reservation).await.unwrap();

        repo.record_status_change(
            reservation.id(),
            None,
            ReservationStatus::Pending,
            user_id,
            None,
        )
        .await
        .expect("record_status_change falló");

        // Verificamos directamente en la tabla de auditoría.
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM reservation_status_history WHERE reservation_id = $1",
        )
        .bind(reservation.id())
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(count, 1, "debería haber exactamente 1 fila de historial");

        cleanup(&pool, user_id, space_id).await;
    }
}
