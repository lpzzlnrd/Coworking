# billing-service

Servicio de facturación del sistema de co-working. Gestiona el ciclo de vida de las facturas de los miembros: creación, pago, vencimiento y reportes de ingresos. No emite ni valida JWT directamente — confía en que el API gateway o los clientes envían datos de memberId ya autenticados.

**Stack:** Node.js 22 · Express 4 · PostgreSQL (`pg`) · Docker  
**Puerto:** `8002`

---

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose
- PostgreSQL accesible (puede ser la misma instancia que los demás servicios)

---

## Variables de entorno

Crea un archivo `.env` en `services/billing-service/` basado en `.env.example`:

```env
BILLING_DATABASE_URL=postgresql://user:password@localhost:5432/coworking
BILLING_DB_USER=user
BILLING_DB_PASSWORD=password
PORT=8002
NODE_ENV=development
```

| Variable               | Descripción                                              | Valor por defecto |
|------------------------|----------------------------------------------------------|-------------------|
| `BILLING_DATABASE_URL` | Cadena de conexión a PostgreSQL                          | —                 |
| `BILLING_DB_USER`      | Usuario de la DB (sobrescribe el de la URL si se define) | —                 |
| `BILLING_DB_PASSWORD`  | Contraseña de la DB (sobrescribe el de la URL)           | —                 |
| `PORT`                 | Puerto en el que escucha el servicio                     | `8002`            |
| `NODE_ENV`             | Entorno (`development` / `production`)                   | `development`     |

> La URL también acepta el prefijo `jdbc:postgresql://...` (se normaliza automáticamente).

---

## Levantar con Docker Compose

```bash
# Desde la raíz del repositorio
docker compose -f services/billing-service/docker-compose.yml up --build
```

Las migraciones SQL en `migrations/` se aplican automáticamente al arrancar el servicio.

### Verificar que está corriendo

```bash
curl http://localhost:8002/health
# {"status":"ok","service":"billing-service"}
```

---

## Endpoints

### Facturas

| Método  | URL                          | Descripción                                              |
|---------|------------------------------|----------------------------------------------------------|
| `GET`   | `/health`                    | Health check del servicio                                |
| `POST`  | `/invoices`                  | Crear una nueva factura en estado `PENDING`              |
| `GET`   | `/invoices`                  | Listar todas las facturas (paginado)                     |
| `GET`   | `/invoices/:id`              | Obtener una factura por ID                               |
| `PATCH` | `/invoices/:id/pay`          | Marcar una factura como `PAID`                           |
| `PATCH` | `/invoices/:id/overdue`      | Marcar una factura `PENDING` como `OVERDUE`              |
| `POST`  | `/invoices/overdue-sweep`    | Marcar masivamente como `OVERDUE` todas las vencidas     |

### Reportes

| Método | URL                                    | Descripción                                              |
|--------|----------------------------------------|----------------------------------------------------------|
| `GET`  | `/reports/revenue?period=&from=&to=`   | Resumen de ingresos agrupado por período                 |
| `GET`  | `/reports/members/:memberId/billing`   | Historial de facturas de un miembro (paginado)           |

**Parámetros del reporte de ingresos:**
- `period`: `daily` · `monthly` · `yearly`
- `from` / `to`: timestamps ISO 8601 (ej. `2026-01-01T00:00:00Z`)

### Ejemplo: crear factura

**Request**
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

**Response `201 Created`**
```json
{
  "id": "c1c1c1c1-1111-2222-3333-444444444444",
  "memberId": "b0b0b0b0-0000-0000-0000-000000000001",
  "amount": "150.00",
  "description": "Reserva sala A - Junio 2026",
  "status": "PENDING",
  "dueDate": "2026-06-30T23:59:59.000Z",
  "paidAt": null,
  "createdAt": "2026-06-02T14:30:00.000Z",
  "updatedAt": "2026-06-02T14:30:00.000Z"
}
```

### Ejemplo: reporte de ingresos

```bash
curl "http://localhost:8002/reports/revenue?period=monthly&from=2026-01-01T00:00:00Z&to=2026-07-01T00:00:00Z"
```

**Response `200 OK`**
```json
[
  { "period": "monthly", "label": "2026-05", "totalRevenue": "1200.00", "invoiceCount": 8 },
  { "period": "monthly", "label": "2026-06", "totalRevenue": "450.00",  "invoiceCount": 3 }
]
```

### Paginación

Los endpoints paginados (`/invoices`, `/reports/members/:id/billing`) aceptan:
- `page`: número de página, base 0 (por defecto `0`)
- `size`: elementos por página (por defecto `20`)

La respuesta sigue el formato estándar:
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

---

## Estados de una factura

```
PENDING ──► PAID
PENDING ──► OVERDUE
```

- Solo las facturas `PENDING` pueden pasar a `OVERDUE`.
- Una factura ya `PAID` no puede volver a pagarse (devuelve `409 Conflict`).
- `POST /invoices/overdue-sweep` actualiza en una sola query SQL todas las facturas `PENDING` cuya `dueDate` ya pasó.

---

## Migraciones

Las migraciones viven en `migrations/` con el patrón `V{n}__{descripcion}.sql` y se aplican en orden al iniciar el servicio. Para aplicarlas manualmente:

```bash
# El servicio las aplica solo al arrancar.
# Para inspeccionarlas directamente:
psql $BILLING_DATABASE_URL -f migrations/V1__create_invoices_table.sql
```

---

## Desarrollo local (sin Docker)

```bash
# Instalar dependencias
npm install

# Iniciar el servicio
npm start
```

Requiere Node.js >= 22 y una instancia de PostgreSQL corriendo con las variables de entorno configuradas.
