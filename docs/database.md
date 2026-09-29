# CareerSync Database Foundation (Phase 2)

This document provides a comprehensive overview of the database architecture, schema, PostGIS integration, and operational workflows for CareerSync.

---

## 1. Overview

CareerSync uses **PostgreSQL** as its primary relational database management system, enhanced with the **PostGIS** extension for high-performance spatial queries (location-based job matching, distance calculations, and geographical indexing). **Prisma ORM** serves as the type-safe database access layer inside NestJS.

```text
NestJS Backend Architecture:
  NestJS (DatabaseModule / PrismaService)
    ↓
  Prisma Client (v6.x)
    ↓
  PostgreSQL (Database: careersync, Port: 5432)
    ↓
  PostGIS (Spatial Extension & GIST Indexing)
```

---

## 2. Technology Stack & Database Details

| Component | Technology | Version / Config | Notes |
| :--- | :--- | :--- | :--- |
| **Database** | PostgreSQL | `15` / `16` | Relational storage engine |
| **Spatial Engine** | PostGIS | `3.3`+ | Enabled via `CREATE EXTENSION IF NOT EXISTS postgis;` |
| **Database Name** | `careersync` | -- | Default development database name |
| **ORM** | Prisma | `^6.19.3` | Type-safe query engine and schema migration manager |
| **Port** | `5432` | Standard PostgreSQL port | Configured in `docker-compose.yml` and `.env` |

---

## 3. Core Models & Schema Relationships

Phase 2 establishes the core relational entities:

- **`User`**: Account identity supporting `STUDENT`, `RECRUITER`, and `ADMIN` roles. Indexed by `email` and `role`.
- **`StudentProfile`**: Profile metadata for student accounts, including college, department, graduation year, and skills.
- **`RecruiterProfile`**: Metadata for recruiter accounts, linked to a company entity.
- **`Company`**: Organization entity containing company description, contact details, website, and location. Indexed by `name`.
- **`Skill`**: Unique skill registry indexed by `name`.
- **`StudentSkill`**: Explicit join table mapping many-to-many relationships between `StudentProfile` and `Skill`.
- **`Location`**: Geographical coordinate and address model supporting spatial PostGIS indexing (`location_geom geography(Point, 4326)`).

---

## 4. Environment Configuration

Copy `backend/.env.example` to `backend/.env`:

```env
# PostgreSQL + PostGIS Connection String
DATABASE_URL="postgresql://careersync:careersync_dev_password@localhost:5432/careersync?schema=public"

# Database Service Environment Variables
POSTGRES_USER=careersync
POSTGRES_PASSWORD=careersync_dev_password
POSTGRES_DB=careersync
POSTGRES_PORT=5432
```

> [!IMPORTANT]
> Never commit `.env` files containing real production credentials to source control. `.env` is ignored by Git.

---

## 5. Development Workflows & Commands

### 5.1 Starting PostgreSQL + PostGIS via Docker
From the project root (`CareerSync/`):
```bash
docker-compose up -d postgres
```

Verify that the container is running and healthy:
```bash
docker ps
```

### 5.2 Generating Prisma Client
Inside `CareerSync/backend/`:
```bash
npm run prisma:generate
```

### 5.3 Running Database Migrations
To execute pending Prisma SQL migrations against PostgreSQL:
```bash
npm run prisma:migrate
```

### 5.4 Seeding Minimal Development Data
To populate the database with development mock entities (1 student, 1 recruiter, 1 company, 4 skills):
```bash
npm run db:seed
```

### 5.5 Checking PostGIS Extension & Version
Connect to PostgreSQL or call the NestJS health endpoint:
```sql
SELECT PostGIS_Version();
```
Via API:
`GET http://localhost:5000/api/health`

Expected JSON response:
```json
{
  "status": "ok",
  "service": "CareerSync API",
  "database": {
    "status": "connected",
    "postgis": {
      "status": "available",
      "version": "3.3.2 USE_GEOS=1 USE_PROJ=1 USE_STATS=1"
    }
  }
}
```

### 5.6 Resetting Development Database
To drop the database, re-run all migrations, and re-apply seed data:
```bash
npx prisma migrate reset
```
