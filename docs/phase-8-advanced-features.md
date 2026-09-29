# CareerSync — Phase 8 Advanced Features Documentation

## Executive Overview
Phase 8 introduces production-grade platform enhancements to the CareerSync monolith without breaking existing Phase 1–7 architecture. Subsystems added include:
- Real-time Notifications domain (`NotificationsModule` & Event triggers)
- Redis Infrastructure with graceful degraded fallback
- Redis-backed search caching & cache invalidation triggers
- API Rate Limiting (`@nestjs/throttler`)
- Admin Moderation & Overview Console (`AdminModule` & `/admin` routes)
- Student & Recruiter Analytics (`/students/me/analytics`, `/recruiters/me/analytics`, `/admin/analytics`)
- Enhanced Application Status Timeline
- OpenAPI / Swagger Documentation (`/api/docs`)

---

## 1. Notification Architecture
- **Prisma Model**: `Notification` (`id`, `userId`, `type`, `title`, `message`, `isRead`, `createdAt`, `updatedAt`)
- **Notification Types**: `APPLICATION_SUBMITTED`, `APPLICATION_STATUS_CHANGED`, `JOB_POSTED`, `JOB_CLOSED`, `RESUME_REQUIRED`, `SYSTEM`
- **Ownership & Security**: Notifications are strictly tied to `@CurrentUser('id')`. Users can only view, mark as read, or delete their own notifications. Body-provided `userId` is never trusted.
- **Triggers**:
  - When a student applies for a job -> `APPLICATION_SUBMITTED` notification generated for the recruiter.
  - When a recruiter updates application status -> `APPLICATION_STATUS_CHANGED` notification generated for the candidate.

---

## 2. Redis Infrastructure & Degraded Fallback Strategy
- **Service**: `RedisService` (`ioredis` client)
- **Container**: `redis:7-alpine` added to `docker-compose.yml` on port `6379`.
- **Fault-Tolerance / Graceful Degradation**:
  If Redis is unavailable or unmanaged, `RedisService.isAvailable()` evaluates to `false`. Core operations (auth, jobs, applications, resumes, database transactions) continue seamlessly via PostgreSQL. Caching degrades silently without crashing API endpoints.

---

## 3. Caching & Cache Invalidation Strategy
- **Target Endpoint**: `GET /api/jobs` (`findAllPublicJobs`)
- **Key Schema**: `jobs:search:${JSON.stringify(searchParams)}`
- **TTL**: 1800 seconds (30 minutes)
- **Invalidation**: Any job mutation (`createJob`, `updateJob`, `updateJobStatus`, or admin moderation) triggers `redisService.invalidatePattern('jobs:search:*')`.

---

## 4. Rate Limiting
- Configured via `@nestjs/throttler` in `AppModule`.
- Standard window: 100 requests / 60 seconds per client IP.
- Rate limits guard authentication (`/api/auth/*`), resumes (`/api/resumes`), jobs (`/api/jobs`), and applications (`/api/applications`).

---

## 5. Admin Console & Moderation
- **Protected Routes**: `/api/admin/*` guarded by `JwtAuthGuard` + `RolesGuard` + `@Roles(Role.ADMIN)`.
- **Endpoints**:
  - `GET /api/admin/analytics`: Platform-wide totals (users, companies, jobs, applications breakdown).
  - `GET /api/admin/users`: Paginated user registry (password hashes and refresh tokens excluded).
  - `PATCH /api/admin/users/:id/status`: Account activation/deactivation. Self-deactivation prohibited for safety.
  - `GET /api/admin/companies`: Company list with recruiter counts.
  - `PATCH /api/admin/companies/:id/verify`: Verify/Unverify company.
  - `GET /api/admin/jobs`: Job moderation list.
  - `PATCH /api/admin/jobs/:id/status`: Moderate job status (e.g. set to CLOSED / DRAFT). Triggers job cache invalidation.
  - `GET /api/admin/applications`: Read-only platform application tracker.

---

## 6. Analytics Architecture
- **Student Analytics**: `GET /api/students/me/analytics` returns total applications submitted and status count breakdown (`APPLIED`, `UNDER_REVIEW`, `SHORTLISTED`, `INTERVIEW_SCHEDULED`, `OFFERED`, `REJECTED`).
- **Recruiter Analytics**: `GET /api/recruiters/me/analytics` returns recruiter-owned metrics (Total Jobs, Active Jobs, Closed Jobs, Total Applications, Status breakdown, and per-job performance breakdown). Enforces recruiter ownership.

---

## 7. Application Timeline Enhancements
- Enhanced student application details page (`/student/applications/[id]`) with a step timeline visualizing history entries from `ApplicationStatusHistory`.

---

## 8. API Documentation
- Configured Swagger OpenAPI specification accessible at `/api/docs`.
