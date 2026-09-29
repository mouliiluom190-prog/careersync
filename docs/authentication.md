# CareerSync Authentication & RBAC Architecture (Phase 3)

This document provides a comprehensive overview of the authentication, token session management, password security, and Role-Based Access Control (RBAC) implementation for CareerSync.

---

## 1. Overview & Architecture

CareerSync implements a production-structured JWT and Argon2 authentication pipeline inside NestJS:

```text
Frontend (Next.js)
   │
   ├── POST /api/auth/register ──────► AuthController ──► AuthService (Argon2 Hash + Prisma)
   ├── POST /api/auth/login ─────────► AuthController ──► AuthService (Argon2 Verify + JWT)
   ├── POST /api/auth/refresh ───────► AuthController ──► AuthService (Session Hash + Rotation)
   ├── POST /api/auth/logout ────────► AuthController ──► AuthService (Revoke AuthSession)
   └── GET  /api/auth/me ────────────► AuthController ──► JwtAuthGuard (Validate Bearer Token)
```

---

## 2. Security Fundamentals & Decisions

1. **Password Hashing (Argon2)**:
   - Plaintext passwords are **never** stored, logged, or returned.
   - Hashed using `argon2.hash()` before writing to PostgreSQL.
   - Verified using `argon2.verify()` on login.

2. **Access & Refresh Token Design**:
   - **Access Token**: Short-lived JWT (15 minutes) signed with `JWT_ACCESS_SECRET`. Contains claims `{ sub: userId, email, role }`. Passed via `Authorization: Bearer <token>` header.
   - **Refresh Token**: Longer-lived JWT (7 days) signed with `JWT_REFRESH_SECRET`. Stored via HttpOnly cookie (`refreshToken`) and/or requested payload.
   - **Database Storage (`AuthSession`)**: Raw refresh tokens are **never** stored in PostgreSQL. Only a SHA-256 hash of the token (`tokenHash`) is saved in the `AuthSession` table.

3. **Session Rotation & Revocation**:
   - Refreshing a token revokes the previous session (`revokedAt = NOW()`) and issues a new access/refresh pair (token rotation).
   - Logging out revokes active sessions in the database and clears the HttpOnly cookie.

4. **Public Registration Security**:
   - Public registration accepts `STUDENT` and `RECRUITER` account roles.
   - Attempting to register an `ADMIN` account via public endpoints throws `HTTP 400 BadRequestException` ("Public registration of ADMIN role is prohibited").
   - `ADMIN` accounts can only be created via controlled database seeds or administrative tools.

5. **Generic Error Messages**:
   - Failed login attempts return generic `HTTP 401 UnauthorizedException` ("Invalid email or password") to prevent user/email enumeration.

---

## 3. Database Schema (`AuthSession`)

```prisma
model AuthSession {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([userId])
  @@index([tokenHash])
}
```

---

## 4. Role-Based Access Control (RBAC)

Roles supported: `STUDENT`, `RECRUITER`, `ADMIN`.

### Guards & Decorators:
- `@UseGuards(JwtAuthGuard)`: Protects endpoints requiring a valid access token.
- `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.RECRUITER)`: Restricts route access to specific roles. Throws `HTTP 403 ForbiddenException` if role requirements are not met.
- `@CurrentUser()`: Custom decorator to extract authenticated user metadata from request context.

### RBAC Test Endpoints (Development Verification):
- `GET /api/auth/me` — Authenticated users (returns safe profile without `passwordHash`)
- `GET /api/auth/test/student` — `STUDENT` role only
- `GET /api/auth/test/recruiter` — `RECRUITER` role only
- `GET /api/auth/test/admin` — `ADMIN` role only

---

## 5. Environment Variables Configuration

In `backend/.env` and `backend/.env.example`:

```env
# JWT Access Token Configuration
JWT_ACCESS_SECRET=careersync_dev_access_secret_key_2026_xyz
JWT_ACCESS_EXPIRES_IN=15m

# JWT Refresh Token Configuration
JWT_REFRESH_SECRET=careersync_dev_refresh_secret_key_2026_xyz
JWT_REFRESH_EXPIRES_IN=7d

# HttpOnly Cookie Configuration
COOKIE_SECURE=false
```

---

## 6. Frontend Authentication Integration

- **Pages**:
  - `/login`: Email & password login form with validation and error alerts.
  - `/register`: Dual-role tab selection (`STUDENT` / `RECRUITER`) with role-specific profile fields (College, Department, Designation).
- **State Management**:
  - `AuthProvider` context in `frontend/src/lib/auth-context.tsx` managing `user`, `token`, `isAuthenticated`, `login()`, `register()`, `logout()`.
- **API Fetch Helper**:
  - `apiFetch` in `frontend/src/lib/api-client.ts` automatically attaches Bearer tokens and handles `credentials: 'include'` for HttpOnly refresh cookies.
