# Coworking Platform

Sistema de gestión de espacios de co-working compuesto por tres microservicios independientes con un frontend compartido por servicio.

**Base de datos:** PostgreSQL compartida · schema `public`  
**Auth:** JWT HS256 emitido por `role-manage`, verificado por los demás servicios

---

## Microservicios

| Servicio | Stack | Puerto | Responsabilidad |
|---|---|---|---|
| `role-manage` | Python 3.14 · FastAPI · SQLAlchemy 2 · Alembic | `8000` | Autenticación y gestión de roles |
| `billing-service` | Node.js 22 · Express 4 · PostgreSQL (`pg`) | `8002` | Facturación e ingresos |
| `checking-service` | Rust · Axum 0.8 · SQLx | `8001` | Motor de reservas |

---

## Levantar todo el stack

```powershell
# Desde la raíz del repositorio
docker compose -f docker.compose.yaml up --build
```

Una vez que los contenedores estén healthy, los frontends estarán disponibles en:

| URL | Servicio | Tema visual |
|---|---|---|
| `http://localhost:5173` | role-manage | Azul / índigo |
| `http://localhost:5174` | billing-service | Ámbar / naranja |
| `http://localhost:5175` | checking-service | Esmeralda / teal |

Para levantar un servicio individual:

```bash
docker compose -f services/<nombre>/docker-compose.yml up --build
```

---

## Base de datos

Todos los servicios comparten la misma instancia de PostgreSQL.

| Parámetro | Valor |
|---|---|
| Contenedor | `db` |
| Puerto (host) | `5432` |
| Cadena de conexión | `postgres://role:role@localhost:5432/role_manage` |

---

## role-manage

Único servicio que emite JWT. Gestiona registro, login y administración de usuarios con roles (`admin`, `staff`, `member`, `guest`).

### Variables de entorno

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/coworking
JWT_SECRET=una-cadena-larga-y-aleatoria
JWT_ALGORITHM=HS256
JWT_ACCESS_TTL_SECONDS=900
CORS_ALLOWED_ORIGINS=["http://localhost:5173"]
APP_ENV=dev
```

> `JWT_SECRET` debe ser idéntico en todos los servicios que verifican tokens.

### Endpoints

| Método | URL | Descripción | Auth | Rol |
|---|---|---|---|---|
| `GET` | `/health` | Health check | No | — |
| `POST` | `/auth/register` | Registrar usuario (rol `member`) | No | — |
| `POST` | `/auth/login` | Obtener JWT | No | — |
| `GET` | `/auth/me` | Perfil del usuario autenticado | Bearer | Cualquiera |
| `GET` | `/auth/verify` | Verificar token y devolver claims | Bearer | Cualquiera |
| `GET` | `/users` | Listar usuarios | Bearer | `admin` |
| `GET` | `/users/{user_id}` | Obtener usuario por ID | Bearer | `admin`, `staff` |
| `PATCH` | `/users/{user_id}/role` | Cambiar rol de usuario | Bearer | `admin` |

### Estructura del JWT

```json
{
  "sub": "<user_uuid>",
  "role": "member",
  "iat": 1748880000,
  "exp": 1748880900
}
```

### Ejemplos

**Registro**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@ejemplo.com", "password": "contraseña123", "full_name": "Juan Pérez"}'
```

**Login**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@ejemplo.com", "password": "contraseña123"}'
```

### Migraciones (Alembic)

```bash
alembic revision --autogenerate -m "descripcion"
alembic upgrade head
alembic current
```

### Tests

```bash
uv sync
uv run pytest
uv run pytest --cov=app
```

---

## billing-service

Gestiona el ciclo de vida de facturas: creación, pago, vencimiento y reportes de ingresos. No valida JWT directamente — confía en que los clientes envían `memberId` ya autenticado.

### Variables de entorno

```env
BILLING_DATABASE_URL=postgresql://user:password@localhost:5432/coworking
BILLING_DB_USER=user
BILLING_DB_PASSWORD=password
PORT=8002
NODE_ENV=development
```

> La URL también acepta el prefijo `jdbc:postgresql://...` (se normaliza automáticamente).

### Endpoints

**Facturas**

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/invoices` | Crear factura (`PENDING`) |
| `GET` | `/invoices` | Listar facturas (paginado) |
| `GET` | `/invoices/:id` | Obtener factura por ID |
| `PATCH` | `/invoices/:id/pay` | Marcar como `PAID` |
| `PATCH` | `/invoices/:id/overdue` | Marcar como `OVERDUE` |
| `POST` | `/invoices/overdue-sweep` | Marcar masivamente todas las vencidas |

**Reportes**

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/reports/revenue?period=&from=&to=` | Ingresos agrupados por período |
| `GET` | `/reports/members/:memberId/billing` | Historial de facturas de un miembro |

Parámetros de reporte: `period` → `daily` / `monthly` / `yearly`, `from` / `to` → ISO 8601.

### Estados de factura

```
PENDING ──► PAID
PENDING ──► OVERDUE
```

Una factura `PAID` no puede volver a pagarse (`409 Conflict`).

### Paginación

Los endpoints paginados aceptan `page` (base 0, defecto `0`) y `size` (defecto `20`).

```json
{
  "content": [...],
  "totalElements": 42,
  "totalPages": 3,
  "number": 0,
  "size": 20,
  "first": true,
  "last": false
}
```

### Ejemplo: crear factura

```bash
curl -X POST http://localhost:8002/invoices \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": "b0b0b0b0-0000-0000-0000-000000000001",
    "amount": 150.00,
    "description": "Reserva sala A - Junio 2026",
    "dueDate": "2026-06-30T23:59:59Z"
  }'
```

### Desarrollo local

```bash
npm install
npm start
```

Requiere Node.js >= 22.

---

## checking-service

Motor de reservas. Gestiona el ciclo de vida completo de reservas de espacios con detección de solapamientos garantizada a nivel de base de datos.

**Arquitectura:** Hexagonal (Ports & Adapters)

### Variables de entorno

```env
DATABASE_URL=postgresql://user:password@localhost:5432/coworking
JWT_SECRET=mismo-secreto-que-role-manage
JWT_ISSUER=role-manage
JWT_AUDIENCE=coworking
AUTH_SERVICE_URL=http://localhost:8000
```

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL |
| `JWT_SECRET` | Secreto HS256 compartido con `role-manage` |
| `JWT_ISSUER` | Valor esperado en el claim `iss` |
| `JWT_AUDIENCE` | Valor esperado en el claim `aud` |
| `AUTH_SERVICE_URL` | URL de `role-manage` para verificar existencia de usuario |

### Endpoints

Todos (excepto `/health`) requieren `Authorization: Bearer <token>`.

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/health` | Health check del servicio y la DB |
| `POST` | `/reservations` | Crear reserva |
| `GET` | `/reservations` | Listar reservas del usuario autenticado |
| `GET` | `/reservations/:id` | Obtener reserva por ID |
| `PATCH` | `/reservations/:id/confirm` | Confirmar reserva pendiente |
| `DELETE` | `/reservations/:id` | Cancelar reserva |

### Ejemplo: crear reserva

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

Conflicto de solapamiento devuelve `409 Conflict`.

### Detección de solapamientos

Usa `TSTZRANGE` de PostgreSQL con índice GiST y restricción `EXCLUDE USING gist` — O(log n) en lugar de escaneo lineal.

```sql
EXCLUDE USING gist (space_id WITH =, time_range WITH &&)
WHERE (status IN ('pending', 'confirmed'))
```

El intervalo es `[start, end)` (fin exclusivo): dos reservas que se tocan en el límite no se solapan.

### Migraciones

```bash
# El servicio las aplica automáticamente al arrancar.
# Manual (requiere sqlx-cli):
sqlx migrate run --database-url $DATABASE_URL
```

### Tests

```bash
# Unitarios (sin DB)
cargo test

# Integración (requiere DB)
DATABASE_URL=postgresql://user:pass@localhost:5432/coworking cargo test --test '*'
```
