# Oddly Infrastructure & Local Services

This directory contains container definitions and orchestration scripts for local development and staging environments.

---

## 1. Running Local Data Services

To start PostgreSQL 16 and Redis 7 in the background:

```bash
docker compose -f infra/docker-compose.yml up -d
```

### Checking Container Health

```bash
docker compose -f infra/docker-compose.yml ps
```

### Stopping Services

```bash
docker compose -f infra/docker-compose.yml down
```

---

## 2. Service Credentials (Local Defaults)

- **PostgreSQL 16:**
  - Host: `localhost`
  - Port: `5432`
  - User: `oddly`
  - Password: `oddlypass`
  - Database: `oddly`
  - Connection String: `postgresql://oddly:oddlypass@localhost:5432/oddly?schema=public`

- **Redis 7:**
  - Host: `localhost`
  - Port: `6379`
  - Connection String: `redis://localhost:6379`
