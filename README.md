# SecureCourse MVP

SecureCourse is a three-interface learning platform MVP:

- public website in Next.js
- admin panel in Next.js
- protected backend API in NestJS

The current production-safe MVP path is a self-contained Next.js app: the UI and the secure
route handlers live in one deployment unit, and the MVP data layer is file-backed for easy
single-service deploys. The legacy NestJS backend remains in [`backend`](./backend) for future
expansion, but the app no longer requires a separate backend service to run the core flow.

## Routes

- `/` or `/securecourse` - public SecureCourse website
- `/securecourse/admin` - admin panel
- `/securecourse/mobile` - temporary student web cabinet

## Local frontend setup

1. Copy `.env.example` to `.env.local`
2. Set `SECURECOURSE_API_URL` to your running backend API
3. Start the frontend:

```bash
npm install
npm run dev
```

## Optional legacy backend setup

Backend lives in [`backend`](./backend).

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

## Docker runtime

The repository includes `docker-compose.yml` for:

- PostgreSQL
- Redis
- pgAdmin
- NestJS backend

Read [`docs/securecourse-runtime.md`](./docs/securecourse-runtime.md) for runtime notes.

## Deployment note

For the simplest working deploy, run the repository as one Next.js service. Railway or Render can
build the root app with:

- Build command: `npm run build`
- Start command: `npm run start:prod`

This single service includes:

- public website
- admin auth and admin panel APIs
- token activation
- temporary student web cabinet APIs

No separate NestJS runtime is required for the working MVP path.
