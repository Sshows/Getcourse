# SecureCourse Backend MVP

## 1. Final DB structure

### Core identities

- `users`
  - roles: `ADMIN`, `MANAGER`, `STUDENT`
  - statuses: `ACTIVE`, `BLOCKED`, `INVITED`
  - supports admin/manager password auth and student token-bound access

### Learning structure

- `courses`
- `lessons`
- `lesson_materials`
- `lesson_progress`

### Access and delivery

- `enrollments`
- `access_tokens`
- `user_sessions`
- `video_assets`

### Compliance and operations

- `audit_logs`
- `webhook_events`
- `site_leads`

## 2. API endpoints

### Public site

- `POST /api/public/leads`
- `POST /api/auth/activate`
- `POST /api/auth/logout`
- `GET /api/health`

### Admin

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:userId/status`
- `GET /api/admin/courses`
- `POST /api/admin/courses`
- `GET /api/admin/courses/:courseId`
- `POST /api/admin/courses/:courseId/lessons`
- `POST /api/admin/lessons/:lessonId/materials`
- `GET /api/admin/enrollments`
- `POST /api/admin/enrollments`
- `PATCH /api/admin/enrollments/:enrollmentId/revoke`
- `GET /api/admin/tokens`
- `POST /api/admin/tokens/issue`
- `PATCH /api/admin/tokens/:tokenId/revoke`
- `GET /api/admin/sessions`
- `POST /api/admin/sessions/:sessionId/revoke`
- `GET /api/admin/videos/assets`
- `POST /api/admin/videos/upload-intents`
- `GET /api/admin/audit-logs`
- `GET /api/admin/leads`

### Student temporary web cabinet

- `GET /api/student/courses`
- `GET /api/student/lessons/:lessonId`
- `POST /api/student/lessons/:lessonId/playback-access`
- `POST /api/student/lessons/:lessonId/progress`
- `POST /api/session/heartbeat`

### Webhooks

- `POST /api/webhooks/video/mux`
- `POST /api/webhooks/video/cloudflare`

## 3. Video flow

1. Admin creates a lesson in the admin panel.
2. Admin requests upload intent via `POST /api/admin/videos/upload-intents`.
3. Backend calls Mux direct uploads or Cloudflare direct upload API.
4. Browser uploads the file directly to the provider.
5. Provider transcodes the file.
6. Provider calls the webhook endpoint.
7. Backend marks the `video_assets` row as `READY` and stores playback identifiers.
8. Student requests `playback-access`.
9. Backend checks enrollment + active session + asset state.
10. Backend returns signed playback access.

## 4. Security model

- one-time token with activation TTL
- burn after first use
- revoke token
- one active session in Redis
- server-side logout invalidation
- idle timeout heartbeat
- playback access only after enrollment + active session check
- audit logs for activation, reuse block, playback access, revokes, and webhooks

## 5. Sprint plan

### Sprint 1

- bootstrap NestJS backend
- Prisma schema
- PostgreSQL + Redis integration
- users, courses, lessons, lesson materials
- enrollments
- audit log base layer

### Sprint 2

- access tokens
- token activation
- burn-after-first-use
- logout
- single active session
- session heartbeat and idle timeout

### Sprint 3

- video assets
- upload intents
- provider integrations for Mux / Cloudflare Stream
- webhook ingestion and asset state updates
- signed playback access

### Sprint 4

- site leads
- temporary student web cabinet integration
- admin UI wiring to backend
- QA pass
- deployment hardening
- final API and env documentation

## 6. Backend MVP estimate

- backend foundation + data model: `4-5 working days`
- access/session security: `4-6 working days`
- video pipeline + webhooks + playback access: `5-7 working days`
- admin/public integration + QA: `5-7 working days`

### Total

- realistic backend + web/admin MVP: `3-5 weeks`

This assumes one strong full-stack developer or a small pair. With parallel frontend/backend work the calendar can compress.

## 7. Mobile app after this

Once this stage is stable, mobile app can start immediately because:

- auth contract already exists
- session model already exists
- courses/lessons/materials APIs already exist
- playback access contract already exists

### Mobile app estimate after backend MVP

- Flutter or React Native student app MVP: `4-6 weeks`
- with stronger privacy handling, packaging, release prep: `6-8 weeks`
