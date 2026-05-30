# Coworking platform

## Local Docker stack

This repo now runs the frontend, auth service, billing service, and Postgres in one Compose stack.

### Prerequisites

- A working Docker engine
- On Windows 11, install WSL 2 and use Docker Desktop with the WSL backend
- If the Microsoft Store path is blocked, install WSL from the official GitHub release assets

### Start

```powershell
docker compose up --build
```

### URLs

- Frontend: `http://localhost:8080` when the engine is local
- Auth service health: `http://localhost:8001/health`
- Billing service health: `http://localhost:8002/health`
- If you use Docker Toolbox or a Linux VM, open the same ports on that machine's Docker host IP instead of `localhost`

### First run

- Postgres starts as `db` inside Compose with user `role`, password `role`, and database `role_manage`
- `role-manage` runs its migrations on startup
- `billing-service` runs its SQL migrations on startup

### Notes for Windows Home without WSL

- If WSL is installed from GitHub, finish the reboot, then run `wsl --update`
- If Docker Desktop still refuses to start, check that virtualization is enabled in BIOS and that the WSL and Virtual Machine Platform features are on
- Once Docker is healthy, the same `docker compose up --build` command works unchanged
