# SecureCourse Backend

NestJS backend for the SecureCourse MVP.

## Scope

- users and roles
- courses, lessons, lesson materials
- enrollments
- one-time access tokens
- single active session registry
- video assets and direct upload intents
- webhook processing
- audit log
- site leads
- temporary student web cabinet APIs

## Stack

- NestJS
- Prisma + PostgreSQL
- Redis
- S3-compatible file storage
- Mux or Cloudflare Stream

## Run locally

1. Copy `.env.example` to `.env`
2. Install packages
3. Generate Prisma client
4. Run migrations
5. Start the API

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

Swagger is exposed at `/docs`.

## Docker compose runtime

From the workspace root:

```bash
cp .env.example .env
docker compose up --build
```

Services:

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- pgAdmin: `http://localhost:5050`
- Backend API: `http://localhost:4000`

The backend container runs `prisma migrate deploy` before `start:prod`.

## Windows local fallback without Docker

If Docker Desktop is not installed on the machine yet, use the helper from the workspace root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\securecourse-local-runtime.ps1
```

What it does:

- creates or reuses a local PostgreSQL cluster under `data/securecourse-pg`
- starts PostgreSQL on `localhost:5433`
- uses `mock://local` Redis fallback for development checks
- runs `prisma migrate deploy`
- runs `prisma generate`
- builds the NestJS backend
- seeds test admin, student, course, token, session
- starts the backend on `http://localhost:4000`

Useful switches:

- `-ResetCluster` recreates the local PostgreSQL cluster
- `-SkipSeed` skips the seed step
- `-SkipBackend` prepares the DB and build but does not start the API
