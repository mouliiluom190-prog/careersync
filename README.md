# CareerSync

CareerSync is a modern, production-grade full-stack job and internship platform designed to seamlessly connect students, recruiters, and educational institutions.

## Technology Stack

### Frontend
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React

### Backend
- NestJS
- Node.js
- TypeScript
- REST API

### Database
- PostgreSQL
- PostGIS
- Prisma

### Security
- JWT
- Argon2
- RBAC (Role-Based Access Control)

### Development
- Antigravity
- Git
- GitHub
- Docker

## Project Structure

```text
CareerSync/
├── frontend/        # Next.js frontend application & UI foundation
├── backend/         # NestJS backend REST API service
├── infrastructure/  # Docker & infrastructure configurations
├── docs/            # Architecture & project documentation
├── .gitignore       # Git exclusion patterns
├── README.md        # Main project documentation
└── docker-compose.yml # Development infrastructure setup
```

## Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm or yarn / pnpm
- Docker & Docker Compose (for database and Redis infrastructure)

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env.local
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at [http://localhost:3000](http://localhost:3000).

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run start:dev
   ```
   The backend API will be available at [http://localhost:5000/api](http://localhost:5000/api).
   Health check endpoint: `GET http://localhost:5000/api/health`

### Infrastructure Setup

To spin up local database (PostgreSQL + PostGIS) and Redis services:
```bash
docker-compose up -d
```
