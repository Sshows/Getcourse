# SecureCourse MVP

SecureCourse now runs as a single Railway service.

The public website, admin panel, token activation flow, and temporary student cabinet all run in
one `Next.js` application. The current MVP data layer is file-backed, so the app does not require a
separate database or API service just to boot and work.

## Routes

- `/` or `/securecourse` - public SecureCourse website
- `/securecourse/admin/login` - admin login
- `/securecourse/admin` - admin panel
- `/securecourse/student` - temporary student web cabinet
- `/api/health` - Railway healthcheck

## Local setup

1. Copy `.env.example` to `.env.local`
2. Set `ADMIN_USERNAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`
3. Start the app:

```bash
npm install
npm run dev
```

## Railway deploy

Deploy the repository root as one Railway service:

- Build command: `npm run build`
- Start command: `node scripts/start-railway.js`

This single service includes:

- public website
- admin auth and admin panel APIs
- token activation
- temporary student web cabinet APIs
- Railway healthcheck on `/api/health`

The legacy [`backend`](./backend) folder remains in the repo for future work, but Railway no longer
needs it for the working MVP deploy path.
