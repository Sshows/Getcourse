# SecureCourse MVP

SecureCourse is a three-interface learning platform MVP:

- public website in Next.js
- admin panel in Next.js
- protected backend API in NestJS

The Next.js app acts as the UI and BFF layer. NestJS owns users, courses, lessons, enrollments, one-time access tokens, single-session control, video assets, logs, and webhook processing.

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

## Local backend setup

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

The frontend can be deployed to Vercel. The backend must be deployed separately with PostgreSQL and Redis available through public environment variables.
