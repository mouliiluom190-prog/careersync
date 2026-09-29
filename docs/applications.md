# CareerSync — Job Applications & Recruitment Workflow (Phase 6 Documentation)

This document provides complete documentation for the Phase 6 Job Applications domain, database schema extensions, recruitment state machine workflow, security and ownership rules, REST API reference, frontend UI implementation, and verification matrix.

---

> [!IMPORTANT]
> **Phase 6 Boundary**: This phase implements application submission, duplicate submission prevention, student application tracking, recruiter applicant pipelines, and stage transition logs (`ApplicationStatusHistory`).
> **Resume storage/upload infrastructure (Cloudinary/S3)** belongs strictly to Phase 7. Candidate resume reference URLs are currently supported.

---

## 1. Database Schema & Data Models

The Prisma schema (`backend/prisma/schema.prisma`) was extended with migration `20260929170000_applications_foundation`.

```prisma
enum ApplicationStatus {
  APPLIED
  UNDER_REVIEW
  SHORTLISTED
  INTERVIEW_SCHEDULED
  OFFERED
  REJECTED
  WITHDRAWN
}

model Application {
  id               String                   @id @default(uuid())
  studentProfileId String
  studentProfile   StudentProfile           @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
  jobId            String
  job              Job                      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  coverLetter      String?
  resumeUrl        String?
  status           ApplicationStatus        @default(APPLIED)
  appliedAt        DateTime                 @default(now())
  updatedAt        DateTime                 @updatedAt

  statusHistory    ApplicationStatusHistory[]

  @@unique([studentProfileId, jobId])
  @@index([studentProfileId])
  @@index([jobId])
  @@index([status])
  @@index([appliedAt])
}

model ApplicationStatusHistory {
  id            String            @id @default(uuid())
  applicationId String
  application   Application       @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  fromStatus    ApplicationStatus
  toStatus      ApplicationStatus
  changedById   String
  changedByRole Role
  notes         String?
  createdAt     DateTime          @default(now())

  @@index([applicationId])
  @@index([createdAt])
}
```

---

## 2. Recruitment State Machine & Status Transition Rules

Applications progress through a strictly validated state machine to ensure workflow integrity:

```
                  ┌───────────────┐
                  │    APPLIED    │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ UNDER_REVIEW  │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  SHORTLISTED  │
                  └───────┬───────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  INTERVIEW_SCHEDULED  │
              └───────────┬───────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │    OFFERED    │ (Terminal State)
                  └───────────────┘

        Terminal States:
        • REJECTED  (Can transition from APPLIED, UNDER_REVIEW, SHORTLISTED, or INTERVIEW_SCHEDULED)
        • WITHDRAWN (Can transition ONLY from non-terminal states by the Student)
```

### Transition Validation Rules:
1. **Duplicate Prevention**: A student cannot apply to the same job twice (`@@unique([studentProfileId, jobId])`). Database constraint violations trigger a clean `409 Conflict` HTTP exception ("You have already applied to this job").
2. **Student Withdrawal**: Students can withdraw applications from active states (`APPLIED`, `UNDER_REVIEW`, `SHORTLISTED`, `INTERVIEW_SCHEDULED`). Withdrawn applications cannot be re-opened.
3. **Recruiter Evaluation Flow**: Recruiters evaluate applicants sequentially (`APPLIED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `SHORTLISTED` $\rightarrow$ `INTERVIEW_SCHEDULED` $\rightarrow$ `OFFERED` or `REJECTED`). Direct status jumps skipping evaluation steps (e.g., `APPLIED` $\rightarrow$ `OFFERED`) or modifying terminal states (`OFFERED`, `REJECTED`, `WITHDRAWN`) trigger a `400 Bad Request` HTTP exception.
4. **Audit Logging**: Every status transition automatically logs a record into `ApplicationStatusHistory` capturing `fromStatus`, `toStatus`, `changedById`, `changedByRole`, optional `notes`, and `createdAt`.

---

## 3. Ownership & Security Guardrails

1. **Student Identity Derivation**:
   - `studentProfileId` is derived strictly from the authenticated JWT token (`req.user.id`).
   - The API rejects client-supplied `studentProfileId` values in request bodies or query parameters.
2. **Recruiter BOLA & Job Ownership Check**:
   - Recruiters can only access applicants for jobs created by their own `recruiterProfile.id`.
   - Access attempts to applicants for jobs owned by other recruiters return a `403 Forbidden` HTTP exception.
3. **Closed Job Protection**:
   - Students cannot submit applications for `CLOSED` or `EXPIRED` jobs. Attempting to do so returns a `400 Bad Request` HTTP exception.

---

## 4. REST API Endpoint Reference

### Student Endpoints (Auth + `STUDENT` Role Required)

- **`POST /api/applications`**
  - **Body**: `{ "jobId": "uuid", "coverLetter": "...", "resumeUrl": "..." }`
  - **Description**: Submits a job application for an active job. Derived student profile identity.
  - **Errors**: `400 Bad Request` (Job closed/draft), `409 Conflict` (Already applied).

- **`GET /api/applications/student/me?status=APPLIED&page=1&limit=10`**
  - **Query**: `status` (optional filter), `page`, `limit`
  - **Description**: Retrieves applications submitted by the authenticated student.

- **`GET /api/applications/student/:id`**
  - **Description**: Detailed application record including job specifications, company info, and complete status history timeline.

- **`PATCH /api/applications/student/:id/withdraw`**
  - **Description**: Withdraws an active application. Updates status to `WITHDRAWN` and appends history log.

### Recruiter Endpoints (Auth + `RECRUITER` Role Required)

- **`GET /api/applications/recruiter/job/:jobId?status=SHORTLISTED&page=1&limit=10`**
  - **Query**: `status` (optional filter), `page`, `limit`
  - **Description**: Lists candidate applicants for a recruiter's job. Verifies job ownership (`403 Forbidden` if unowned).

- **`GET /api/applications/recruiter/:id`**
  - **Description**: Detailed candidate profile, cover letter, resume reference, and application timeline. Verifies job ownership.

- **`PATCH /api/applications/recruiter/:id/status`**
  - **Body**: `{ "status": "SHORTLISTED", "notes": "Strong candidate performance in technical screening" }`
  - **Description**: Updates application state and records transition in `ApplicationStatusHistory`.

---

## 5. Frontend UI Pages & Components

| Route | Access | Description |
| :--- | :--- | :--- |
| **`/student/jobs/[id]/apply`** | Student | Application submission form with cover letter input and resume web reference link. |
| **`/student/applications`** | Student | Student tracking dashboard with status filter chips and job metadata. |
| **`/student/applications/[id]`** | Student | Detailed view showing current status, withdrawal modal/action, and history timeline. |
| **`/recruiter/applications`** | Recruiter | Applicant pipeline dashboard with job selector filter, status badges, and quick review link. |
| **`/recruiter/applications/[id]`** | Recruiter | Applicant candidate review page with student skills, cover letter, resume link, and stage transition panel. |

---

## 6. Verification Results Matrix

| Area | Verification Tool | Result |
| :--- | :--- | :--- |
| **Prisma Migration** | `npx prisma migrate dev` | **PASS** (Migration `20260929170000_applications_foundation`) |
| **Prisma Client** | `npx prisma generate` | **PASS** (Prisma Client v6.19.3 generated with Application models) |
| **Backend TypeScript** | `npx tsc --noEmit` | **PASS** (0 compilation errors) |
| **Backend Linting** | `npm run lint` | **PASS** (0 errors, 0 warnings across 59 files) |
| **Backend Build** | `npm run build` | **PASS** (`nest build` succeeded) |
| **Backend Vitest Integration Tests** | `npx vitest run test/applications.spec.ts` | **PASS** (11 tests passed out of 11) |
| **Frontend TypeScript** | `npx tsc --noEmit` | **PASS** (0 compilation errors) |
| **Frontend Linting** | `npm run lint` | **PASS** (0 errors, 0 warnings across all files) |
| **Frontend Production Build** | `npm run build` | **PASS** (`next build` compiled all 15 static/dynamic routes) |
