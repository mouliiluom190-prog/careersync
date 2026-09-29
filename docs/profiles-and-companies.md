# CareerSync — Profile and Company Foundation (Phase 4 Documentation)

This document provides complete documentation for the Phase 4 database extensions, profile completion algorithms, ownership authorization security rules, backend API endpoints, and frontend user interfaces.

---

## 1. Data Schema Extensions

The Prisma schema (`backend/prisma/schema.prisma`) was extended to support academic student details, recruiter bios, company branding, and skills management.

### Data Models & Relationships

```prisma
model StudentProfile {
  id              String         @id @default(uuid())
  userId          String         @unique
  name            String
  phone           String?
  college         String?
  department      String?
  degree          String?
  cgpa            Float?
  profileImageUrl String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  skills          StudentSkill[]

  @@map("student_profiles")
}

model RecruiterProfile {
  id              String      @id @default(uuid())
  userId          String      @unique
  name            String
  phone           String?
  designation     String?
  bio             String?
  profileImageUrl String?
  companyId       String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  company         Company?    @relation(fields: [companyId], references: [id], onDelete: SetNull)

  @@map("recruiter_profiles")
}

model Company {
  id          String             @id @default(uuid())
  name        String
  website     String?
  location    String?
  description String?
  logoUrl     String?
  verified    Boolean            @default(false)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  recruiters  RecruiterProfile[]

  @@map("companies")
}

model Skill {
  id        String         @id @default(uuid())
  name      String         @unique
  category  String?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  students  StudentSkill[]

  @@map("skills")
}

model StudentSkill {
  id               String         @id @default(uuid())
  studentProfileId String
  skillId          String
  createdAt        DateTime       @default(now())

  studentProfile   StudentProfile @relation(fields: [studentProfileId], references: [id], onDelete: Cascade)
  skill            Skill          @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@unique([studentProfileId, skillId])
  @@map("student_skills")
}
```

---

## 2. Profile Completion Score Algorithms

Profile completion scores are dynamically calculated on the backend to quantify profile readiness without relying on client inputs.

### Student Profile Score Breakdown (100% Total)

| Requirement Field | Weight | Description |
| :--- | :--- | :--- |
| **Basic Info** | **20%** | Student `name` non-empty |
| **Contact Info** | **15%** | `phone` non-null and non-empty |
| **Academic Details** | **25%** | `college` (15%) + `department` (10%) |
| **Degree & CGPA** | **20%** | `degree` (10%) + `cgpa` (10%) |
| **Skills & Technologies** | **20%** | At least 1 skill tag linked (20%) |

### Recruiter Profile Score Breakdown (100% Total)

| Requirement Field | Weight | Description |
| :--- | :--- | :--- |
| **Basic Info** | **25%** | Recruiter `name` non-empty |
| **Role & Contact** | **25%** | `designation` (15%) + `phone` (10%) |
| **Bio & Overview** | **25%** | `bio` non-null and non-empty |
| **Company Link** | **25%** | `companyId` non-null (associated company) |

---

## 3. Ownership & Security Authorization Rules

To prevent broken object-level authorization (BOLA / IDOR):

1. **Self-Profile Operations**:
   - `GET /api/students/me/profile`, `PATCH /api/students/me/profile`, `POST/DELETE /api/students/me/skills` resolve target profiles directly via the authenticated user's JWT (`req.user.id`).
   - `GET /api/recruiters/me/profile`, `PATCH /api/recruiters/me/profile` resolve target profiles directly via `req.user.id`.
   - Client-supplied target user IDs in requests are forbidden and ignored.

2. **Company Ownership Enforcement**:
   - Creating a company (`POST /api/companies`) automatically links the company ID to the authenticated recruiter's profile.
   - Updating a company (`PATCH /api/companies/:id`):
     - The backend verifies that `recruiterProfile.companyId === companyId`.
     - Users with the `ADMIN` role bypass ownership restrictions.
     - Unlinked recruiters attempting to update a company receive `403 Forbidden`.

---

## 4. REST API Endpoint Reference

### Skills API (`/api/skills`)

- **`GET /api/skills?search=query`**
  - **Auth**: Required (`JwtAuthGuard`)
  - **Query Params**: `search` (optional search filter)
  - **Returns**: Array of normalized `Skill` objects.

- **`POST /api/skills`**
  - **Auth**: Required (`JwtAuthGuard`)
  - **Body**: `{ "name": "Python", "category": "Programming" }`
  - **Behavior**: Case-insensitive name normalization to prevent duplicates.

### Student Profiles API (`/api/students`)

- **`GET /api/students/me/profile`**
  - **Auth**: Required (`JwtAuthGuard`, `RolesGuard(STUDENT)`)
  - **Returns**: Profile object with `completionScore` and linked `skills`.

- **`PATCH /api/students/me/profile`**
  - **Auth**: Required (`JwtAuthGuard`, `RolesGuard(STUDENT)`)
  - **Body**: `{ "phone": "+1234567890", "college": "MIT", "department": "EECS", "degree": "BS", "cgpa": 3.9 }`

- **`POST /api/students/me/skills`**
  - **Auth**: Required (`JwtAuthGuard`, `RolesGuard(STUDENT)`)
  - **Body**: `{ "skillId": "<uuid>" }`

- **`DELETE /api/students/me/skills/:skillId`**
  - **Auth**: Required (`JwtAuthGuard`, `RolesGuard(STUDENT)`)

### Recruiter Profiles API (`/api/recruiters`)

- **`GET /api/recruiters/me/profile`**
  - **Auth**: Required (`JwtAuthGuard`, `RolesGuard(RECRUITER)`)
  - **Returns**: Profile object with `completionScore` and linked `company`.

- **`PATCH /api/recruiters/me/profile`**
  - **Auth**: Required (`JwtAuthGuard`, `RolesGuard(RECRUITER)`)
  - **Body**: `{ "phone": "+1234567890", "designation": "Lead Recruiter", "bio": "Technical hiring..." }`

### Companies API (`/api/companies`)

- **`POST /api/companies`**
  - **Auth**: Required (`JwtAuthGuard`, `RolesGuard(RECRUITER, ADMIN)`)
  - **Body**: `{ "name": "Acme Corp", "website": "https://acme.com", "location": "SF, CA", "description": "Tech giant" }`

- **`GET /api/companies/:id`**
  - **Auth**: Required (`JwtAuthGuard`)

- **`PATCH /api/companies/:id`**
  - **Auth**: Required (`JwtAuthGuard`, `RolesGuard(RECRUITER, ADMIN)`)
  - **Authorization**: Must own company or be ADMIN.

---

## 5. Verification Matrix

| Area | Verification Tool | Result |
| :--- | :--- | :--- |
| **Prisma Migration** | `npx prisma migrate dev` | PASS (Migration `20260929120000_profile_company_foundation` applied) |
| **Backend Code Compilation** | `npx tsc --noEmit` | PASS (0 errors) |
| **Backend Linting** | `npm run lint` | PASS (0 errors, 0 warnings) |
| **Backend Build** | `npm run build` | PASS (`nest build` succeeded) |
| **Backend Test Suite** | `npx jest test/profiles.spec.ts` | PASS (100% tests passing) |
| **Frontend Code Compilation**| `npx tsc --noEmit` | PASS (0 errors) |
| **Frontend Linting** | `npm run lint` | PASS (0 errors, 0 warnings) |
| **Frontend Production Build** | `npm run build` | PASS (`next build` compiled & static generation complete) |
