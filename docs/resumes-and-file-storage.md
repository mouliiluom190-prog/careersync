# CareerSync — Resume Management & Secure File Storage (Phase 7 Documentation)

This document provides complete documentation for the Phase 7 Resume Management system, database schema extensions, object storage abstraction (`StorageService`), file upload validation & security, authorized temporary signed URL generation, application integration, student resume management UI, and verification matrix.

---

## 1. Architectural Overview & Storage Abstraction

To ensure modularity and prevent vendor lock-in, file storage is implemented using a provider pattern:

```text
                       [ ResumesController / ResumesService ]
                                         │
                                         ▼
                                  [ StorageService ]
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
      [ LocalStorageProvider ]  [ CloudinaryStorageProvider ]  [ S3StorageProvider ]
      (Disk + HMAC Signed URL)     (Cloudinary API Provider)    (AWS S3 / MinIO API)
```

- **`StorageService`**: Injectable NestJS wrapper that dynamically selects the active provider based on `STORAGE_PROVIDER` (`local`, `cloudinary`, `s3`).
- **`LocalStorageProvider`**: Default development-safe provider storing files under `./uploads/resumes/`. Serves files via a secure signed proxy endpoint (`/api/resumes/file-stream/:key`) using HMAC-SHA256 tokens.
- **`CloudinaryStorageProvider` & `S3StorageProvider`**: Production object storage providers activated via `.env` configuration.

---

## 2. Database Schema & Data Models

The Prisma schema (`backend/prisma/schema.prisma`) was extended with migration `20260929190000_resumes_foundation`.

```prisma
model StudentProfile {
  id        String   @id @default(uuid())
  // ...
  resumes   Resume[]
}

model Resume {
  id               String         @id @default(uuid())
  studentProfileId String
  studentProfile   StudentProfile @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
  originalFileName String
  storageKey       String
  mimeType         String
  fileSize         Int
  isDefault        Boolean        @default(false)
  isArchived       Boolean        @default(false)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  applications     Application[]

  @@index([studentProfileId])
  @@index([isDefault])
  @@index([isArchived])
}

model Application {
  id               String      @id @default(uuid())
  studentProfileId String
  jobId            String
  resumeId         String?
  resume           Resume?     @relation(fields: [resumeId], references: [id], onDelete: SetNull)
  resumeUrl        String?     // Preserved for Phase 6 backward compatibility
  coverLetter      String?
  status           ApplicationStatus @default(APPLIED)
  // ...
  @@index([resumeId])
}
```

---

## 3. File Security, Validation & Ownership Rules

1. **Strict File Validation**:
   - **Allowed MIME Types**: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
   - **Allowed Extensions**: `.pdf`, `.doc`, `.docx`
   - **Maximum File Size**: `5 MB` ($5,242,880$ bytes).
   - Validation is enforced at NestJS `FileInterceptor` and `ResumesService` levels.
2. **Safe Storage Key Generation**:
   - Raw user-provided filenames are never used as storage keys.
   - Storage keys follow the pattern: `resumes/{studentProfileId}/{uuidv4()}.{ext}`.
3. **No Unrestricted Public Access**:
   - Resumes are private user documents. Unrestricted direct public URLs are strictly forbidden.
   - Downloads/views require short-lived HMAC-signed URLs (`/api/resumes/:id/download`) or proxy streams (`/api/resumes/application/:applicationId/download`).
4. **IDOR & BOLA Guardrails**:
   - **Student Identity**: Derived strictly from `@CurrentUser('id')` JWT payload.
   - **Student Ownership**: Students can only view, set default, or delete resumes matching `resume.studentProfileId === studentProfile.id`.
   - **Recruiter Authorization**: Recruiters can only access candidate resumes for jobs created by their own `recruiterProfile.id` (`application.job.recruiterId === recruiterProfile.id`). Unowned access attempts return `403 Forbidden`.
5. **Historical Application Integrity**:
   - Deleting a resume attached to an active `Application` archives the `Resume` record (`isArchived: true`) and removes default status, preserving historical application data for recruiters without breaking database references.

---

## 4. REST API Endpoint Reference

### Student Endpoints (Auth + `STUDENT` Role Required)

- **`POST /api/resumes`** (Multipart/Form-Data `file`)
  - **Description**: Uploads a PDF/DOC/DOCX resume file ($\le 5\text{ MB}$). Automatically sets `isDefault: true` for the student's first resume.

- **`GET /api/resumes/me`**
  - **Description**: Lists all active (`isArchived: false`) resumes owned by the authenticated student, ordered by default status and creation date.

- **`GET /api/resumes/:id`**
  - **Description**: Fetches metadata for single owned resume.

- **`GET /api/resumes/:id/download`**
  - **Description**: Generates a temporary signed download URL for student's owned resume.

- **`PATCH /api/resumes/:id/default`**
  - **Description**: Sets target resume as default and unsets previous defaults in an atomic database transaction.

- **`DELETE /api/resumes/:id`**
  - **Description**: Deletes file and record (or archives if attached to an application).

### Recruiter & Applicant Endpoint (Auth Required)

- **`GET /api/resumes/application/:applicationId/download`**
  - **Description**: Authorized endpoint generating short-lived signed resume download URL after verifying recruiter job ownership (`403 Forbidden` if unowned).

---

## 5. Frontend UI Implementation

| Route | Access | Description |
| :--- | :--- | :--- |
| **`/student/resumes`** | Student | Resume management dashboard (upload drag-and-drop box, format & size info, default badges, set default, view/download, delete). |
| **`/student/jobs/[id]/apply`** | Student | Job application page featuring radio selection of uploaded resumes (auto-selecting default) and quick inline upload. |
| **`/recruiter/applications/[id]`** | Recruiter | Candidate dossier review page displaying applicant resume card and "View / Download Resume" authorized action button. |
| **`/student/applications/[id]`** | Student | Application detail page displaying submitted resume document badge and download action. |

---

## 6. Environment Variables (`backend/.env.example`)

```env
# Storage Provider Selection (local, cloudinary, s3)
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=uploads/resumes

# Cloudinary Storage Provider Configuration
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# AWS S3 / MinIO Storage Provider Configuration
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=careersync-resumes
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```
