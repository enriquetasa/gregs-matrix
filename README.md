# gregs-matrix

Ease × Importance matrix for office displays: a 2×2 board with optional per-matrix password, drag-and-drop notes, PNG/PDF export, and PostgreSQL persistence.

## Local development

1. Copy [`.env.example`](.env.example) to `.env` and set `DATABASE_URL` and `SESSION_SECRET` (at least 32 characters).
2. Start Postgres (for example `docker compose up -d` with the included [`docker-compose.yml`](docker-compose.yml)).
3. Run migrations and the dev server:

```bash
npm ci
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create a matrix, then use `/m/<slug>`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run lint` / `npm run typecheck` | Quality gates |
| `npm test` / `npm run test:coverage` | Vitest unit tests |
| `npm run test:e2e` | Playwright (requires `DATABASE_URL` in env) |

## DigitalOcean App Platform

1. Create a **managed PostgreSQL** database and note its connection string.
2. Create an app from this repo (Dockerfile build) or use Node buildpack with `npm run build` and `npm run start`.
3. Set environment variables:

- `DATABASE_URL` — Postgres URL (with SSL if required by DO).
- `SESSION_SECRET` — random string, **minimum 32 characters**, used to sign session cookies.

4. On first deploy, run migrations. The Docker image runs `npx prisma migrate deploy` before `npm run start`. If you use a buildpack without the provided Dockerfile, add a **Job** or deploy hook that runs `npx prisma migrate deploy` against `DATABASE_URL` before traffic hits the app.

5. Optional: set **HTTP port** to `3000` and enable health checks on `GET /api/health`.

There is no built-in “forgot password” for a matrix; if you lose the password, create a new matrix or reset `passwordHash` in the database.

## Layout

- **Horizontal axis:** Easy (left) → Hard (right).  
- **Vertical axis:** Not important (bottom) → Important (top).  
- **Quadrants:** Do now · Make easy, then do · Do when passing by · Ignore.
