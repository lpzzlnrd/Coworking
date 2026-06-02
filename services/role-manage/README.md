# role-manage

Servicio de autenticación y gestión de roles del sistema de co-working. Es el único servicio que emite JWT — los demás servicios solo los verifican. Gestiona el registro, login y administración de usuarios con roles (`admin`, `staff`, `member`, `guest`).

**Stack:** Python 3.14 · FastAPI · SQLAlchemy 2 (async) · PostgreSQL · Alembic · Docker  
**Puerto:** `8000`

---

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose
- PostgreSQL accesible con el schema `public`

---

## Variables de entorno

Crea un archivo `.env` en `services/role-manage/` basado en `.env.example`:

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/coworking
JWT_SECRET=una-cadena-larga-y-aleatoria
JWT_ALGORITHM=HS256
JWT_ACCESS_TTL_SECONDS=900
CORS_ALLOWED_ORIGINS=["http://localhost:5173"]
APP_ENV=dev
```

| Variable                 | Descripción                                              | Valor por defecto |
|--------------------------|----------------------------------------------------------|-------------------|
| `DATABASE_URL`           | Cadena de conexión async a PostgreSQL                    | —                 |
| `JWT_SECRET`             | Secreto HS256 para firmar y verificar tokens             | —                 |
| `JWT_ALGORITHM`          | Algoritmo JWT (no cambiar)                               | `HS256`           |
| `JWT_ACCESS_TTL_SECONDS` | Tiempo de vida del token en segundos                     | `900` (15 min)    |
| `CORS_ALLOWED_ORIGINS`   | Lista JSON de orígenes permitidos                        | `["http://localhost:5173"]` |
| `APP_ENV`                | Entorno (`dev` / `prod`)                                 | `dev`             |

> **Importante:** el valor de `JWT_SECRET` debe ser idéntico en todos los servicios que verifican tokens (`checking-service`).

---

## Levantar con Docker Compose

```bash
# Desde la raíz del repositorio
docker compose -f services/role-manage/docker-compose.yml up --build
```

Las migraciones de Alembic se aplican automáticamente al arrancar.

### Verificar que está corriendo

```bash
curl http://localhost:8000/health
# {"status":"ok","service":"role-manage","env":"dev"}
```

---

## Endpoints

| Método  | URL                        | Descripción                                      | Auth       | Rol requerido     |
|---------|----------------------------|--------------------------------------------------|------------|-------------------|
| `GET`   | `/health`                  | Health check del servicio                        | No         | —                 |
| `POST`  | `/auth/register`           | Registrar nuevo usuario (rol `member` por defecto)| No         | —                 |
| `POST`  | `/auth/login`              | Obtener JWT de acceso                            | No         | —                 |
| `GET`   | `/auth/me`                 | Perfil del usuario autenticado                   | Sí (Bearer) | Cualquiera       |
| `GET`   | `/auth/verify`             | Verificar token y devolver claims                | Sí (Bearer) | Cualquiera       |
| `GET`   | `/users`                   | Listar todos los usuarios                        | Sí (Bearer) | `admin`          |
| `GET`   | `/users/{user_id}`         | Obtener usuario por ID                           | Sí (Bearer) | `admin`, `staff` |
| `PATCH` | `/users/{user_id}/role`    | Cambiar el rol de un usuario                     | Sí (Bearer) | `admin`          |

### Ejemplo: registro y login

**Registro**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "password": "contraseña123",
    "full_name": "Juan Pérez"
  }'
```

**Response `201 Created`**
```json
{
  "id": "b0b0b0b0-0000-0000-0000-000000000001",
  "email": "usuario@ejemplo.com",
  "full_name": "Juan Pérez",
  "role": "member",
  "is_active": true,
  "created_at": "2026-06-02T14:00:00Z"
}
```

**Login**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@ejemplo.com", "password": "contraseña123"}'
```

**Response `200 OK`**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```

---

## Estructura del JWT

El token emitido contiene los siguientes claims:

```json
{
  "sub": "<user_uuid>",
  "role": "member",
  "iat": 1748880000,
  "exp": 1748880900
}
```

Los demás servicios verifican la firma con `JWT_SECRET` y leen `sub` y `role` del payload sin necesidad de llamar a este servicio.

---

## Migraciones (Alembic)

```bash
# Crear nueva migración
alembic revision --autogenerate -m "descripcion"

# Aplicar migraciones pendientes
alembic upgrade head

# Ver estado actual
alembic current
```

---

## Tests

```bash
# Instalar dependencias de desarrollo
uv sync

# Ejecutar tests
uv run pytest

# Con cobertura
uv run pytest --cov=app
```
