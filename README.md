# CareerSync — Enterprise Recruitment Platform

CareerSync is a modern, production-grade full-stack job and recruitment platform designed to seamlessly connect students, recruiters, and administrators with role-based access control, real-time notifications, Redis caching, rate limiting, and analytics.

---

## Technology Stack

### Frontend
- **Framework**: Next.js (App Router, Turbopack)
- **UI Library**: React, Tailwind CSS, Lucide React
- **Language**: TypeScript

### Backend
- **Framework**: NestJS (Modular Monolith)
- **Language**: TypeScript
- **API Standard**: REST API with OpenAPI / Swagger (`/api/docs`)
- **Rate Limiting**: `@nestjs/throttler`

### Database & Caching
- **Database**: PostgreSQL with PostGIS extensions
- **ORM**: Prisma ORM
- **In-Memory Cache**: Redis (`ioredis`) with degraded fallback mode

### Security & Authentication
- **Password Hashing**: Argon2
- **Tokens**: JWT Access & HttpOnly Refresh Tokens with Rotation
- **RBAC**: `STUDENT`, `RECRUITER`, `ADMIN`
- **File Uploads**: HMAC-signed secure proxy stream URLs for resumes

---

## Project Architecture

```text
Next.js Frontend (Port 3000)
       ↓
REST API (Port 5000 /api)
       ↓
NestJS Modular Monolith
 ├── AuthModule (JWT, Argon2, Refresh Tokens)
 ├── StudentsModule (Student Profiles & Skills)
 ├── RecruitersModule (Recruiter Profiles & Company Ownership)
 ├── CompaniesModule (Company Verification)
 ├── SkillsModule (Skill Catalog & Lookup)
 ├── JobsModule (Job Posting, Discovery, Redis Caching)
 ├── ApplicationsModule (Recruitment Workflow State Machine)
 ├── ResumesModule (Secure Storage Abstraction, HMAC Stream Signatures)
 ├── NotificationsModule (Notification Domain & Event Triggers)
 ├── RedisModule (Fault-Tolerant Cache Service)
 └── AdminModule (Platform Moderation & System Analytics)
       ↓
Prisma ORM → PostgreSQL / PostGIS Database & Redis Cache
```

---

## Quick Start Guide

### Prerequisites
- Node.js (v20+ recommended)
- Docker & Docker Compose (for local PostgreSQL & Redis)

### 1. Infrastructure Setup
Spin up local PostgreSQL (with PostGIS) and Redis containers:
```bash
docker compose up -d
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run start:dev
```
- API Base URL: `http://localhost:5000/api`
- Health Check: `http://localhost:5000/api/health`
- Swagger Documentation: `http://localhost:5000/api/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
- App URL: `http://localhost:3000`

---

## Testing & Verification Commands

### Backend Verification
```bash
cd backend
npm test               # Run Vitest unit & security test suite
npx tsc --noEmit       # Verify TypeScript static compilation
npm run lint           # Run linter
npm run build          # Test production NestJS build
```

### Frontend Verification
```bash
cd frontend
npx tsc --noEmit       # Verify TypeScript static compilation
npm run lint           # Run ESLint (0 errors, 0 warnings)
npm run build          # Build Next.js production bundle
```

---

## Environment Variables

### Backend (`.env`)
- `PORT` (default `5000`)
- `NODE_ENV` (`development` / `production`)
- `CORS_ORIGIN` (`http://localhost:3000`)
- `DATABASE_URL` (`postgresql://careersync:careersync_dev_password@localhost:5432/careersync?schema=public`)
- `REDIS_HOST` (`localhost`)
- `REDIS_PORT` (`6379`)
- `REDIS_PASSWORD` (optional)
- `STORAGE_PROVIDER` (`local` / `cloudinary` / `s3`)
- `STORAGE_LOCAL_DIR` (`uploads/resumes`)
- `JWT_ACCESS_SECRET`
- `JWT_ACCESS_EXPIRES_IN` (`15m`)
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN` (`7d`)

### Frontend (`.env.local`)
- `NEXT_PUBLIC_API_URL` (`http://localhost:5000/api`)

---

## Documentation
- `docs/phase-8-advanced-features.md`: Redis, Notifications, Admin Console, and Analytics architecture
- `docs/phase-9-final-qa.md`: Final QA audit, security hardening, build outputs, and production readiness matrix
