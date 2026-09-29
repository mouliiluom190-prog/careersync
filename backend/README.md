# CareerSync Backend REST API

NestJS backend REST API service for the CareerSync platform.

## Technology Stack

- **Framework:** NestJS
- **Runtime:** Node.js (v20+)
- **Language:** TypeScript (Strict Mode)
- **Authentication:** JWT, Argon2, Passport, Refresh Session Rotation, RBAC
- **Database Access:** Prisma ORM (v6)
- **Database Engine:** PostgreSQL + PostGIS (Spatial Extension)
- **Validation & Parsing:** `class-validator`, `class-transformer`, `@nestjs/config`, `cookie-parser`

## Setup & Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Generate Prisma Client & Run Migrations
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Start the Backend Server
```bash
# Development server with hot reload
npm run start:dev

# Production build
npm run build
npm run start:prod
```

## Authentication Endpoints (Phase 3)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register STUDENT or RECRUITER account |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue JWT tokens |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token session & issue new tokens |
| `POST` | `/api/auth/logout` | Authenticated | Revoke refresh session & clear cookie |
| `GET` | `/api/auth/me` | Authenticated | Return authenticated user details |
| `GET` | `/api/auth/test/student` | STUDENT | RBAC test endpoint for STUDENT role |
| `GET` | `/api/auth/test/recruiter` | RECRUITER | RBAC test endpoint for RECRUITER role |
| `GET` | `/api/auth/test/admin` | ADMIN | RBAC test endpoint for ADMIN role |

## Available Scripts

- `npm run build`: Compile NestJS application to `dist/`.
- `npm run start:dev`: Launch NestJS in watch mode.
- `npm run lint`: Run oxlint / linter checks across `src/` and `test/`.
- `npm run test`: Execute unit and integration tests.
- `npm run prisma:generate`: Generate Prisma Client types.
- `npm run prisma:migrate`: Execute database migrations.
- `npm run db:seed`: Seed minimal mock data.
