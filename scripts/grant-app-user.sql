-- Grant runtime DML to your App Platform DB user after migrations ran as doadmin.
--
-- 1. In every GRANT line below, replace the role name inside double quotes.
--    Example: if your app user is gregs-matrix-prod, use "gregs-matrix-prod"
--    (hyphens and mixed case require double quotes in PostgreSQL.)
--
--    Wrong:  TO gregs-matrix-prod;
--    Right:  TO "gregs-matrix-prod";
--
-- 2. Run as doadmin, for example from this repo:
--
--    npx prisma db execute --file scripts/grant-app-user.sql --url "$DATABASE_MIGRATE_URL"
--
--    (DATABASE_MIGRATE_URL must be the doadmin connection string from DigitalOcean.)
--
-- Alternatively, with psql installed:
--    psql "$DATABASE_MIGRATE_URL" -v ON_ERROR_STOP=1 -f scripts/grant-app-user.sql

GRANT USAGE ON SCHEMA public TO "your_app_user";

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "your_app_user";

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "your_app_user";

ALTER DEFAULT PRIVILEGES FOR ROLE doadmin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "your_app_user";

ALTER DEFAULT PRIVILEGES FOR ROLE doadmin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO "your_app_user";
