# SecureCourse Runtime Guide

## Preferred local stack

Use Docker Desktop when it is available:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

### Services and ports

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- pgAdmin: `http://localhost:5050`
- Backend API: `http://localhost:4000`

### pgAdmin credentials

- Email: `admin@securecourse.local`
- Password: `securecourse-admin`

### pgAdmin server connection

- Host: `postgres`
- Port: `5432`
- Username: `securecourse`
- Password: `securecourse`
- Database: `securecourse`

## Required environment variables

Root `.env`:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_PORT`
- `REDIS_PORT`
- `PGADMIN_PORT`
- `PGADMIN_DEFAULT_EMAIL`
- `PGADMIN_DEFAULT_PASSWORD`
- `BACKEND_PORT`
- `DATABASE_URL`
- `DATABASE_URL_DOCKER`
- `REDIS_URL`
- `REDIS_URL_DOCKER`
- `SESSION_IDLE_MINUTES`
- `PLAYBACK_TOKEN_TTL_SECONDS`
- `DEFAULT_VIDEO_PROVIDER`
- `ALLOW_INSECURE_DEV_VIDEO_FALLBACK`
- `PUBLIC_WEB_URL`
- `APP_URL`

Provider keys stay optional in local MVP mode:

- `MUX_*`
- `CLOUDFLARE_*`
- `S3_*`

## Windows fallback when Docker is missing

This repository also includes a helper for machines that do not have Docker Desktop yet:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\securecourse-local-runtime.ps1
```

Fallback behavior:

- starts a local PostgreSQL cluster in `data/securecourse-pg`
- uses PostgreSQL on `localhost:5433`
- uses `mock://local` Redis fallback
- enables `ALLOW_INSECURE_DEV_VIDEO_FALLBACK=true`

This fallback is only for local development and runtime verification. Compose remains the target stack for everyday team setup.
