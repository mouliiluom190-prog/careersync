# CareerSync — Jobs & Job Discovery Foundation (Phase 5 Documentation)

This document provides complete documentation for the Phase 5 Jobs domain, database model extensions, job lifecycle states, ownership authorization, backend API endpoints, search/filter algorithms, and frontend user interfaces.

---

> [!IMPORTANT]
> **Phase 5 Boundary**: This phase implements job creation, management, status transitions, search, filtering, and job specifications. **Job Applications are NOT implemented in Phase 5.** Application submissions, applicant tracking, and recruitment pipelines belong strictly to Phase 6.

---

## 1. Database Data Models & Relationships

The Prisma schema (`backend/prisma/schema.prisma`) was extended with migration `20260929150000_jobs_foundation`.

```prisma
enum EmploymentType {
  FULL_TIME
  PART_TIME
  INTERNSHIP
  CONTRACT
  TEMPORARY
}

enum ExperienceLevel {
  ENTRY
  JUNIOR
  MID
  SENIOR
  LEAD
}

enum WorkMode {
  ONSITE
  REMOTE
  HYBRID
}

enum JobStatus {
  DRAFT
  ACTIVE
  CLOSED
  EXPIRED
}

model Job {
  id                  String           @id @default(uuid())
  recruiterId         String
  recruiter           RecruiterProfile @relation(fields: [recruiterId], references: [id], onDelete: Cascade)
  companyId           String
  company             Company          @relation(fields: [companyId], references: [id], onDelete: Cascade)
  title               String
  description         String
  employmentType      EmploymentType   @default(FULL_TIME)
  experienceLevel     ExperienceLevel  @default(ENTRY)
  workMode            WorkMode         @default(ONSITE)
  salaryMin           Float?
  salaryMax           Float?
  salaryCurrency      String?          @default("INR")
  locationId          String?
  location            Location?        @relation(fields: [locationId], references: [id], onDelete: SetNull)
  openings            Int              @default(1)
  applicationDeadline DateTime?
  status              JobStatus        @default(ACTIVE)
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  skills              JobSkill[]

  @@index([status])
  @@index([recruiterId])
  @@index([companyId])
  @@index([locationId])
  @@index([employmentType])
  @@index([experienceLevel])
  @@index([workMode])
  @@index([createdAt])
}

model JobSkill {
  jobId     String
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  skillId   String
  skill     Skill    @relation(fields: [skillId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@id([jobId, skillId])
}
```

---

## 2. Job Lifecycle & Status Rules

Jobs follow a strict state machine to prevent unauthorized or stale job postings from appearing in public discovery:

```
 [ Recruiter Creates Job ]
          │
          ├── ( status = ACTIVE )  ──►  Publicly Visible in Student Discovery (/api/jobs)
          │
          └── ( status = DRAFT )   ──►  Private to Recruiter (/api/jobs/recruiter/me)
          
 [ Recruiter Closes Job ]
          │
          └── ( status = CLOSED )  ──►  Excluded from Public Search (Returns 404 on public single fetch)
```

- **ACTIVE**: Visible in student job search & discovery.
- **DRAFT**: Saved by recruiter, excluded from student search.
- **CLOSED**: Job posting closed by recruiter; excluded from active discovery, historical data preserved.
- **EXPIRED**: Past application deadline; excluded from active discovery.

---

## 3. Ownership & Security Validation Rules

1. **Recruiter Identity Derivation**:
   - Recruiter identity is derived strictly from the authenticated JWT token (`req.user.id`).
   - Requests accepting `recruiterId` or `companyId` in the body/query for ownership are forbidden.
   - The recruiter must have an associated `companyId` in `RecruiterProfile` before posting jobs; otherwise, a `400 Bad Request` is returned.

2. **Broken Object-Level Authorization (BOLA) Prevention**:
   - `PATCH /api/jobs/:id` and `PATCH /api/jobs/:id/status` verify that `job.recruiterId === recruiterProfile.id`.
   - Attempts by unauthorized recruiters to modify another recruiter's job return `403 Forbidden`.

3. **Data Validation Rules**:
   - `salaryMax` cannot be less than `salaryMin` (enforced on DTO and Service levels with `400 Bad Request`).
   - `skillIds` must reference valid existing skills in the database.
   - `openings` must be $\ge 1$.

---

## 4. REST API Endpoint Reference

### Recruiter Endpoints (Auth + `RECRUITER` Role Required)

- **`POST /api/jobs`**
  - **Body**: `CreateJobDto`
  - **Description**: Creates a new job under the recruiter's associated company.

- **`GET /api/jobs/recruiter/me?page=1&limit=10`**
  - **Query**: `page`, `limit`
  - **Description**: Retrieves jobs owned by the authenticated recruiter.

- **`GET /api/jobs/recruiter/:id`**
  - **Description**: Retrieves single owned job for editing. Returns `403 Forbidden` if owned by another recruiter.

- **`PATCH /api/jobs/:id`**
  - **Body**: `UpdateJobDto`
  - **Description**: Updates job fields (title, description, salary, skills, work mode, etc.). Verifies ownership.

- **`PATCH /api/jobs/:id/status`**
  - **Body**: `{ "status": "CLOSED" }`
  - **Description**: Transitions job status between `ACTIVE`, `CLOSED`, `DRAFT`, or `EXPIRED`.

### Student & Public Job Discovery Endpoints

- **`GET /api/jobs`**
  - **Query Parameters**:
    - `search`: Case-insensitive title, description, company name, or skill search.
    - `employmentType`: Filter by `FULL_TIME`, `PART_TIME`, `INTERNSHIP`, `CONTRACT`, `TEMPORARY`.
    - `experienceLevel`: Filter by `ENTRY`, `JUNIOR`, `MID`, `SENIOR`, `LEAD`.
    - `workMode`: Filter by `ONSITE`, `REMOTE`, `HYBRID`.
    - `locationId`: Filter by location ID.
    - `skillId`: Filter by required skill.
    - `companyId`: Filter by company ID.
    - `page`, `limit`: Database-level pagination.
    - `sortBy`, `sortOrder`: Whitelisted sorting (`createdAt`, `updatedAt`, `title`, `applicationDeadline`).
  - **Description**: Returns paginated active jobs matching filters.

- **`GET /api/jobs/:id`**
  - **Description**: Returns public specification for an active job. Throws `404 Not Found` if closed or draft.

---

## 5. Frontend Routes & Components

| Route | Access | Description |
| :--- | :--- | :--- |
| **`/student/jobs`** | All Users | Job discovery page with live search, filters, pagination, and job cards. |
| **`/student/jobs/[id]`** | All Users | Detailed job specification page with company details, skill chips, and deadline info. |
| **`/recruiter/jobs`** | Recruiter | Recruiter dashboard listing owned jobs, status toggle buttons, and edit actions. |
| **`/recruiter/jobs/create`** | Recruiter | Form to post a new job opportunity with real-time skill search/selection. |
| **`/recruiter/jobs/[id]/edit`** | Recruiter | Form to edit existing job details and publish status. |

---

## 6. Verification Results Matrix

| Area | Verification Tool | Result |
| :--- | :--- | :--- |
| **Prisma Migration** | `npx prisma migrate dev` | **PASS** (Migration `20260929150000_jobs_foundation`) |
| **Prisma Client** | `npx prisma generate` | **PASS** (Prisma Client v6.19.3 generated with Job models) |
| **Backend TypeScript** | `npx tsc --noEmit` | **PASS** (0 compilation errors) |
| **Backend Linting** | `npm run lint` | **PASS** (0 errors, 0 warnings across 51 files) |
| **Backend Build** | `npm run build` | **PASS** (`nest build` succeeded) |
| **Backend Unit/Integration Tests** | `npx vitest run test/jobs.spec.ts` | **PASS** (9 tests passed out of 9) |
| **Frontend TypeScript** | `npx tsc --noEmit` | **PASS** (0 compilation errors) |
| **Frontend Linting** | `npm run lint` | **PASS** (0 errors, 0 warnings) |
| **Frontend Production Build** | `npm run build` | **PASS** (`next build` compiled all 11 static/dynamic routes) |
