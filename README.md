# 🏫 Classroom Management API

A production-style **NestJS 11** REST API for managing a classroom: teachers, students, courses, assignments, attendance, and exams — secured with role-based JWT auth.

> Build for learning NestJS: modular architecture, global guards, DTO validation, and a three-role auth system in one clean backend.

---

## ✨ Features

- 🔐 **JWT authentication** with access (`15m`) + rotating refresh tokens (`7d`)
- 👮 **Role-based access control** — `admin`, `teacher`, `student`
- 👥 **Unified login** — one endpoint, three account types
- 📚 **Courses** managed by teachers, enrolled with students
- 📝 **Assignments** & validations/exams with submissions
- 📋 **Attendance** tracking
- 🧾 **Strict request validation** — unknown body keys are rejected (400)
- 🚀 **Auto-seed** default admin on startup
- 📦 Clean module-per-domain structure (`src/<domain>/`)

---

## 🧰 Tech Stack

| Layer | Tech |
|-------|------|
| Framework | [NestJS 11](https://nestjs.com) · Express |
| Language | TypeScript |
| Auth | `@nestjs/jwt`, `passport-jwt`, `bcryptjs` |
| Validation | `class-validator` + `class-transformer` |
| Database | PostgreSQL (hosted · Prisma) |
| ORM | [Prisma 7](https://www.prisma.io) + `@prisma/adapter-pg` |
| Testing | Jest (`unit` + `supertest` e2e) |
| Lint / Format | ESLint + Prettier |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ and npm
- Two **PostgreSQL** databases (e.g. Prisma Postgres, Neon, or any Postgres): one for local dev + tests, one for production.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

The app loads **`.env.test` for local dev and Jest runs**, and **`.env` for production**.

```bash
cp .env.example .env          # production (or provided by the platform in prod)
cp .env.test.example .env.test # local dev + tests
```

Then edit both files and **change the JWT secrets** for anything beyond local use.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DATABASE_URL` (`.env`) | — | **Production** PostgreSQL connection string (**required**) |
| `DATABASE_URL` (`.env.test`) | — | **Local/test** PostgreSQL connection string (**required**) |
| `JWT_SECRET` | — | Access-token signing secret (**required**) |
| `JWT_REFRESH_SECRET` | — | Refresh-token signing secret (**required**) |
| `SEED_DEFAULT_ADMIN` | `true` | Auto-create a default admin on boot |
| `SEED_ADMIN_EMAIL` | `admin@example.com` | Seeded admin email |
| `SEED_ADMIN_PASSWORD` | `admin123` | Seeded admin password |

### 3. Create the schema and seed (local/test DB)

```bash
npm run db:migrate:test       # `prisma migrate dev` against `.env.test`
npm run db:seed:test          # seed the default admin/teacher/student/course
```

`npx prisma generate` runs automatically on `migrate dev` (or manually after schema edits).

### 4. Run the server

```bash
npm run start:dev
```

The API is served at `http://localhost:3000`.

---

## 🔑 First Login

On startup the app seeds a default **admin** account (unless `SEED_DEFAULT_ADMIN=false`):

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{ "email": "admin@example.com", "password": "admin123" }'
```

Returns an `accessToken`, rotating `refreshToken`, and the `user` profile.

Include the access token on every request:

```bash
curl http://localhost:3000/admin/profile \
  -H 'Authorization: Bearer <accessToken>'
```

**Refresh:** `POST /auth/refresh` with the refresh token — returns a new token pair (the old refresh token is revoked).

**Logout:** `POST /auth/logout` — revokes the refresh token and blacklists the access token.

---

## ↔️ API Overview

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| `POST` | `/auth/login` | public | Sign in (admin / teacher / student) |
| `POST` | `/auth/refresh` | public | Rotate refresh token → new pair |
| `POST` | `/auth/logout` | public | Invalidate tokens |
| `GET` | `/admin/profile` | authenticated | Current user profile |
| CRUD | `/admin` | admin | Manage admin accounts (+ `POST /admin/bulk`) |
| CRUD | `/teacher` | admin / teacher (self) | Manage teachers |
| CRUD | `/student` | admin / teacher / student | Manage students |
| `GET` | `/student/profile` | student | Full profile of the logged-in student |
| `GET` | `/student/courses` | student | Courses the logged-in student is enrolled in |
| `GET` | `/student/attendance` | student | Own attendance records |
| `GET` | `/student/exams` | student | Own exam results (with exam + course details) |
| CRUD | `/course` | admin | Courses |
| `GET` | `/course` | admin | List courses |
| CRUD | `/assignment` | admin / teacher | Manage assignments |
| CRUD | `/attendance` | admin / teacher | Mark & read attendance; students reach their own records via `/student/attendance` |
| CRUD | `/exam` | admin / teacher | Exams & student submissions; students reach their own via `/student/exams` |

Responses follow a consistent envelope:

```json
{
  "message": "Admin created successfully",
  "data": { ... },
  "total": 1
}
```

---

## 🗂️ Project Structure

```
src/
├── main.ts                 # Bootstrap: global ValidationPipe + CORS
├── app.module.ts          # Root module
├── auth/                  # Login, JWT strategy, guards, decorators, token store
├── admin/                 # Admins
├── teacher/               # Teachers
├── student/               # Students
├── course/                # Courses
├── assignment/            # Assignments
├── attendance/            # Attendance
├── exam/                  # Exams & submissions
├── seed/                  # Default-admin seeding on boot
└── prisma/                # Global PrismaModule + PrismaService (DB connection)
prisma/
├── schema.prisma          # Data model (PostgreSQL)
├── migrations/            # Versioned migrations
└── seed.ts                # Seed data (admin/teacher/student/course)
```

Each domain follows the NestJS convention: `controller`, `service`, `module`, `dto/`, `entities/`.

---

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Run with hot reload |
| `npm run start:prod` | Run compiled `dist/` output |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | Lint `src` + `test` (auto-fix) |
| `npm run format` | Format all TypeScript |
| `npm test` | Unit tests (`*.spec.ts`) |
| `npm run test:e2e` | End-to-end tests (supertest) |
| `npx prisma migrate dev` | Create/apply migrations from `prisma/schema.prisma` |
| `npx prisma db seed` | Load seed data into the database |
| `npx tsx scripts/verify-prisma.ts` | Smoke-test the DB connection |

---

## 🗄️ Persistence

Data lives in a **PostgreSQL** database accessed through Prisma (`PrismaService` in `src/prisma/`). All services are async and query the real database — no in-memory storage. The only in-memory piece is the auth `RefreshTokenStore` (token rotation/blacklist), by design.

---

Made with ⚡️ NestJS