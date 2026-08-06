# AGENTS.md

NestJS 11 classroom-management REST API. `@/src` is the app root; `@/test` holds one e2e spec.

## Commands
- `npm run start:dev` – dev server with watch (uses `.env`).
- `npm run build` – compile to `dist/` (deletes `dist` first); `npm run start:prod` runs `node dist/main`.
- `npm run lint` – eslint **with `--fix`** (don't re-add the flag).
- `npm run format` – prettier over `src` + `test`.
- `npm test` – jest, rootDir `src`, matches `*.spec.ts` only. Single: `npm test -- <path/to/file.spec.ts>`.
- `npm run test:e2e` – jest with `test/jest-e2e.json` (superagent-based, expects `src/main` boot).

## Critical: there is NO real database
Every service stores data in an **in-memory array** (`private x: T[] = []`) and resets on restart. `typeorm`, `@nestjs/typeorm`, and `sqlite3` are installed and `course/teacher/student` entities carry TypeORM decorators, but no `TypeOrmModule.forRoot`, `DataSource`, or `InjectRepository` exists anywhere. Do NOT write TypeORM queries expecting persistence; data access lives in the services. Passwords are bcrypt-hashed and stripped from responses via a local `omit()` helper.

## Auth / routing conventions
- `JwtAuthGuard` and `RolesGuard` are registered as global `APP_GUARD`s, so **every route is JWT-protected by default**. Make a route public with `@Public()`; restrict with `@Roles(Role.ADMIN | Role.TEACHER | Role.STUDENT)`.
- One login endpoint (`POST /auth/login`) resolves a single account type across Admin/Teacher/Student services in that order. Access JWT expires in `15m`; refresh token `7d` with rotation; both signed with issuer `nest-classroom`. Refresh-token validity + access-token blacklist are also in-memory (`RefreshTokenStore`).
- Use `@CurrentUser()` to read the authenticated user (type `AuthenticatedUser`).

## Config
- Copy `.env.example` → `.env` (`.env` is gitignored; `JWT_SECRET`/`JWT_REFRESH_SECRET` are required at boot).
- On startup `SeedService` (`src/seed/seed.service.ts`) auto-creates a default admin from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (defaults `admin@example.com` / `admin123`) unless `SEED_DEFAULT_ADMIN=false`. To get an admin to log in with, this must run.

## Conventions
- Controllers return an envelope: `{ message, data, total? }`.
- `src/auth/decorators` + `src/auth/guards` + `src/auth/interfaces` hold cross-cutting auth; re-export patterns from them rather than duplicating.
- Entity class naming is inconsistent: `admin/attendance/assignment/exam` use plain `*Entity` classes; `course/teacher/student` use TypeORM-decorated classes. Neither is persisted.
- Global `ValidationPipe` in `src/main.ts` sets `whitelist + transform + forbidNonWhitelisted` — DTOs are strictly enforced, unknown body keys 400.
- `@nestjs/graphql` is installed but unused — do not route GraphQL work here.
- Repo has no commits yet; no CI, no pre-commit hooks.