# gregs-matrix

Ease × Importance matrix for office displays: a 2×2 board with optional per-matrix password, drag-and-drop notes, PNG/PDF export, and PostgreSQL persistence.

## Local development

1. Copy [`.env.example`](.env.example) to `.env` and set `DATABASE_URL` and `SESSION_SECRET` (at least 32 characters).
2. Start Postgres (for example `docker compose up -d` with the included [`docker-compose.yml`](docker-compose.yml)).
3. Run migrations and the dev server:

```bash
npm ci
npm run db:migrate
npm run dev
```

`db:migrate` uses `DATABASE_MIGRATE_URL` when set (for example `doadmin` on DigitalOcean); otherwise it uses `DATABASE_URL`.

Open [http://localhost:3000](http://localhost:3000), create a matrix, then use `/m/<slug>`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run lint` / `npm run typecheck` | Quality gates |
| `npm test` / `npm run test:coverage` | Vitest unit tests |
| `npm run db:migrate` | Prisma migrate (uses `DATABASE_MIGRATE_URL` or `DATABASE_URL`) |

## DigitalOcean App Platform

1. Create a **managed PostgreSQL** database and note its connection strings.
2. Create an app from this repo (Dockerfile build) or use Node buildpack with `npm run build` and `npm run start`.
3. Set environment variables:

- `DATABASE_URL` — connection string for the **application user** (limited privileges). The Next.js server uses this for all Prisma queries at runtime.
- `DATABASE_MIGRATE_URL` — connection string for **`doadmin`** (or another role that owns the database / can create objects in `public`). Used **only** to run `prisma migrate deploy` when the container starts. Omit it only if `DATABASE_URL` already has migration rights (for example local Docker Postgres as `postgres`).
- `SESSION_SECRET` — random string, **minimum 32 characters**, used to sign session cookies.

4. On first deploy, the Docker image runs `node scripts/migrate-deploy.cjs` (migrations) then `npm run start`. `migrate-deploy` prefers `DATABASE_MIGRATE_URL` so the app user does not need `CREATE` on schema `public` (PostgreSQL 15+). If you use a buildpack without this Dockerfile, run `npm run db:migrate` (with the same env vars) in a **Job** or release phase before traffic hits the app.

5. **Grant the app user access to Prisma tables.** Migrations run as `doadmin`, so `Matrix` and `Topic` are owned by that role. Your **app** user (in `DATABASE_URL`) must receive DML rights. In the DO database **Query** tab, connect as **`doadmin`** and run (replace `your_app_user` with the username from your app connection string—use double quotes if the name is mixed case):

```sql
GRANT USAGE ON SCHEMA public TO your_app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE doadmin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO your_app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE doadmin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO your_app_user;
```

If `permission denied for table Matrix` still appears, confirm the app user in `DATABASE_URL` matches the `GRANT ... TO` role (and redeploy after changing env vars).

6. Optional: set **HTTP port** to `3000` and enable health checks on `GET /api/health`.

There is no built-in “forgot password” for a matrix; if you lose the password, create a new matrix or reset `passwordHash` in the database.

## Layout

- **Horizontal axis:** Easy (left) → Hard (right).  
- **Vertical axis:** Not important (bottom) → Important (top).  
- **Quadrants:** Do now · Make easy, then do · Do when passing by · Ignore.
