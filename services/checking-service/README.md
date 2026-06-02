# checking-service

Motor de reservas del sistema de gestión de co-working. Gestiona el ciclo de vida completo de las reservas de espacios: creación, confirmación y cancelación, con detección de solapamientos garantizada a nivel de base de datos.

**Stack:** Rust · Axum 0.8 · SQLx · PostgreSQL · Docker  
**Puerto:** `8001`  
**Arquitectura:** Hexagonal (Ports & Adapters)

---

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose
- PostgreSQL accesible con el schema `public` (compartido con los demás servicios)
- Variable de entorno `JWT_SECRET` coincidente con el valor usado en `role-manage`

---

## Variables de entorno

Crea un archivo `.env` en `services/checking-service/` basado en la siguiente plantilla:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/coworking
JWT_SECRET=mismo-secreto-que-role-manage
JWT_ISSUER=role-manage
JWT_AUDIENCE=coworking
AUTH_SERVICE_URL=http://localhost:8000
```

| Variable           | Descripción                                              | Ejemplo                                      |
|--------------------|----------------------------------------------------------|----------------------------------------------|
| `DATABASE_URL`     | Cadena de conexión a PostgreSQL                          | `postgresql://user:pass@localhost:5432/cw`   |
| `JWT_SECRET`       | Secreto HS256 compartido con `role-manage`               | `una-cadena-larga-y-aleatoria`               |
| `JWT_ISSUER`       | Valor esperado en el claim `iss` del token               | `role-manage`                                |
| `JWT_AUDIENCE`     | Valor esperado en el claim `aud` del token               | `coworking`                                  |
| `AUTH_SERVICE_URL` | URL base de `role-manage` para verificar existencia de usuario | `http://role-manage:8000`              |

---

## Levantar con Docker Compose

```bash
# Desde la raíz del repositorio
docker compose -f services/checking-service/docker-compose.yml up --build
```

El servicio aplica las migraciones automáticamente al arrancar.

### Verificar que está corriendo

```bash
curl http://localhost:8001/health
# {"status":"ok","db":"ok"}
```

---

## Endpoints

Todos los endpoints (excepto `/health`) requieren un JWT Bearer válido emitido por `role-manage`.

```
Authorization: Bearer <token>
```

| Método   | URL                              | Descripción                              | Auth |
|----------|----------------------------------|------------------------------------------|------|
| `GET`    | `/health`                        | Health check del servicio y la DB        | No   |
| `POST`   | `/reservations`                  | Crear una nueva reserva                  | Sí   |
| `GET`    | `/reservations`                  | Listar reservas del usuario autenticado  | Sí   |
| `GET`    | `/reservations/:id`              | Obtener una reserva por ID               | Sí   |
| `PATCH`  | `/reservations/:id/confirm`      | Confirmar una reserva pendiente          | Sí   |
| `DELETE` | `/reservations/:id`              | Cancelar una reserva                     | Sí   |

### Ejemplo: crear reserva

**Request**
```bash
curl -X POST http://localhost:8001/reservations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "space_id": "a1b2c3d4-0000-0000-0000-000000000001",
    "start": "2026-06-10T09:00:00Z",
    "end": "2026-06-10T11:00:00Z",
    "notes": "Reunión de equipo"
  }'
```

**Response `201 Created`**
```json
{
  "id": "f7e6d5c4-1111-2222-3333-444444444444",
  "user_id": "b0b0b0b0-0000-0000-0000-000000000001",
  "space_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "start": "2026-06-10T09:00:00Z",
  "end": "2026-06-10T11:00:00Z",
  "status": "pending",
  "notes": "Reunión de equipo",
  "created_at": "2026-06-02T14:30:00Z"
}
```

**Conflicto de solapamiento `409 Conflict`**
```json
{
  "error": "El espacio ya está reservado en ese horario"
}
```

---

## Detección de solapamientos (algoritmo principal)

El servicio utiliza el tipo nativo `TSTZRANGE` de PostgreSQL junto con un índice GiST y una restricción `EXCLUDE USING gist` para detectar solapamientos en **O(log n)** en lugar de un escaneo lineal O(n).

```sql
-- Las reservas activas (pending/confirmed) no pueden solaparse en el mismo espacio
EXCLUDE USING gist (space_id WITH =, time_range WITH &&)
WHERE (status IN ('pending', 'confirmed'))
```

El dominio modela el intervalo con semántica `[start, end)` (fin exclusivo), por lo que dos reservas que se "tocan" en el límite (una termina a las 10:00, otra empieza a las 10:00) **no** se consideran solapadas.

---

## Migraciones

Las migraciones SQL viven en `migrations/` y se aplican con SQLx al inicio del servicio. Para ejecutarlas manualmente:

```bash
# Requiere sqlx-cli instalado: cargo install sqlx-cli
sqlx migrate run --database-url $DATABASE_URL
```

---

## Tests

```bash
# Tests unitarios (sin DB)
cargo test

# Tests de integración (requiere DB corriendo)
DATABASE_URL=postgresql://user:pass@localhost:5432/coworking cargo test --test '*'
```
