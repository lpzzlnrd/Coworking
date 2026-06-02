# Front‑ends y acceso a la base de datos

Este documento describe cómo levantar y acceder a los front‑ends de **cada** micro‑servicio del proyecto, así como a la base de datos PostgreSQL compartida, incluyendo la personalización visual de cada instancia del frontend.

---

## Visuales Dinámicos por Instancia

El frontend se adapta visualmente dependiendo del microservicio que esté consumiendo. Esto se logra inyectando la variable de entorno `SERVICE_TYPE` al contenedor de cada frontend, la cual es leída por Vite y expuesta como `import.meta.env.VITE_SERVICE_TYPE`.

Dependiendo del servicio, verás colores, badges y descripciones adaptadas:
- **🛡️ Role Manage**: Tonos azules/índigo.
- **💵 Billing Service**: Tonos ámbar/naranja.
- **🦀 Checking Service**: Tonos esmeralda/teal con temática Rust.

---

## 1. Front‑end para `role‑manage` (Python/FastAPI)

- **Contenedor Docker:** `frontend-role-manage`
- **Puerto expuesto al host:** `5173`
- **URL de acceso:** `http://localhost:5173`
- **Variables de entorno:**
  ```yaml
  API_TARGET: http://role-manage:8000
  SERVICE_TYPE: role-manage
  ```
- **Diseño visual:** Badge de color azul con el icono 🛡️.

---

## 2. Front‑end para `billing‑service` (Node.js/Express)

- **Contenedor Docker:** `frontend-billing-service`
- **Puerto expuesto al host:** `5174`
- **URL de acceso:** `http://localhost:5174`
- **Variables de entorno:**
  ```yaml
  API_TARGET: http://billing-service:8002
  SERVICE_TYPE: billing-service
  ```
- **Diseño visual:** Badge de color ámbar con el icono 💵.

---

## 3. Front‑end para el **servicio Rust** (`checking‑service`)

- **Contenedor Docker:** `frontend-checking`
- **Puerto expuesto al host:** `5175`
- **URL de acceso:** `http://localhost:5175`
- **Variables de entorno:**
  ```yaml
  API_TARGET: http://checking-service:3000
  SERVICE_TYPE: checking-service
  ```
- **Diseño visual:** Badge de color esmeralda con el icono 🦀.

---

## 4. Acceso a la base de datos PostgreSQL

Todos los micro‑servicios comparten la misma base `role_manage`.

- **Contenedor Docker:** `db`
- **Puerto expuesto al host:** `5432`
- **Cadena de conexión (desde tu máquina):**
  ```
  postgres://role:role@localhost:5432/role_manage
  ```
- **Credenciales:**
  - Usuario: `role`
  - Contraseña: `role`

Puedes conectarte con cualquier cliente (psql, DBeaver, TablePlus, etc.) usando esa cadena.

---

## 5. Cómo levantar todo

```powershell
cd C:\Users\leoco\Coworking
# Arranca todos los contenedores con las UIs y APIs listas
docker compose -f docker.compose.yaml up --build
```

Una vez que los logs indiquen que los contenedores están *healthy*, abre en tu navegador:
- `http://localhost:5173` → UI de **role‑manage** (Azul)
- `http://localhost:5174` → UI de **billing‑service** (Naranja)
- `http://localhost:5175` → UI de **checking‑service** (Verde)

---

## 6. Pruebas rápidas de la API

Con `curl` o tu cliente HTTP favorito:
```bash
# role‑manage
curl http://localhost:8001/health
# billing‑service
curl http://localhost:8002/health
# checking‑service (Rust)
curl http://localhost:8080/health
```

---

## 7. Notas finales

- El OTP se ha omitido a petición del usuario.
- La variable de proxy `API_TARGET` es interpretada en `vite.config.ts` para redirigir las peticiones locales `/api/*` al contenedor de backend correspondiente de forma invisible en el navegador.
