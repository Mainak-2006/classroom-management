# AGENTS.md

NestJS 11 classroom-management REST API. `@/src` is the app root; `@/test` holds one e2e spec.

## Commands
- `npm run start:dev` – dev server with watch (uses `.env`).
- `npm run build` – compile to `dist/` (deletes `dist` first); `npm run start:prod` runs `node dist/main`.
- `npm run lint` – eslint **with `--fix`** (don't re-add the flag).
- `npm run format` – prettier over `src` + `test`.
- `npm test` – jest, rootDir `src`, matches `*.spec.ts` only. Single: `npm test -- <path/to/file.spec.ts>`.
- `npm run test:e2e` – jest with `test/jest-e2e.json` (superagent-based, expects `src/main` boot).

## Persistence: Prisma + hosted PostgreSQL (REAL database)
Data lives in a **PostgreSQL** database (Prisma 7, `prisma-client-js` generator → `@prisma/client`, driver adapter `@prisma/adapter-pg` + `pg`). All services are **async** and query via `PrismaService` (`src/prisma/prisma.service.ts`), a global `@Global()` module. `prisma/schema.prisma` is authoritative; `npx prisma migrate dev` applies/versions migrations; `npx prisma db seed` loads `prisma/seed.ts` (admin/teacher/student/course). Standalone scripts (`lib/prisma.ts`, `scripts/verify-prisma.ts`) use a separate singleton. Passwords are bcrypt-hashed and stripped from responses via a local `omit()` helper.

- The **only** in-memory piece is the auth `RefreshTokenStore` (token rotation/blacklist), kept by design.
- The legacy in-memory arrays and TypeORM decorators are gone; do not resurrect `private x: T[]` or `@Entity()` persistence.
- Tests never touch the DB: jest maps `@prisma/client` → `test/prisma-client-stub.ts` (plain `class PrismaClient {}`) for unit + e2e suites.
- `runtime` note: `dist/` output is CommonJS → the classic `prisma-client-js` generator is required (the Prisma 7 default `prisma-client` generator emits ESM/`import.meta` and will crash under `node dist/main`).

## Auth / routing conventions
- `JwtAuthGuard` and `RolesGuard` are registered as global `APP_GUARD`s, so **every route is JWT-protected by default**. Make a route public with `@Public()`; restrict with `@Roles(Role.ADMIN | Role.TEACHER | Role.STUDENT)`.
- One login endpoint (`POST /auth/login`) resolves a single account type across Admin/Teacher/Student services in that order. `POST /auth/register` (public) allows self-registration for `student`/`teacher` via `RegisterDto` (role-discriminated nested `CreateStudentDto`/`CreateTeacherDto`); it reuses the `StudentService`/`TeacherService` `create()` methods and returns an issued token pair. Access JWT expires in `15m`; refresh token `7d` with rotation; both signed with issuer `nest-classroom`. Refresh-token validity + access-token blacklist are also in-memory (`RefreshTokenStore`).
- Use `@CurrentUser()` to read the authenticated user (type `AuthenticatedUser`).

## Config
- Copy `.env.example` → `.env` (`.env` is gitignored; `DATABASE_URL` + `JWT_SECRET`/`JWT_REFRESH_SECRET` are required at boot).
- On startup `SeedService` (`src/seed/seed.service.ts`) auto-creates a default admin from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (defaults `admin@example.com` / `admin123`) unless `SEED_DEFAULT_ADMIN=false`. To get an admin to log in with, this must run (or use `npx prisma db seed`).

## Conventions
- Controllers return an envelope: `{ message, data, total? }`.
- `src/auth/decorators` + `src/auth/guards` + `src/auth/interfaces` hold cross-cutting auth; re-export patterns from them rather than duplicating.
- Entity classes are plain (decorator-free) per-module classes (`*Entity` under `entities/`) used only for typing; they are not persisted — Prisma models are the source of truth.
- Global `ValidationPipe` in `src/main.ts` sets `whitelist + transform + forbidNonWhitelisted` — DTOs are strictly enforced, unknown body keys 400.
- `@nestjs/graphql` is installed but unused — do not route GraphQL work here.
- Repo has no commits yet; no CI, no pre-commit hooks.