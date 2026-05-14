-- Grant runtime DML to your App Platform DB user after migrations ran as doadmin.
--
-- 1. Replace every occurrence of `app_user_placeholder` with your real app username
--    (the user in DATABASE_URL, before the first ":" in the URI).
-- 2. Run as doadmin, for example from this repo:
--
--    npx prisma db execute --file scripts/grant-app-user.sql --url "$DATABASE_MIGRATE_URL"
--
--    (DATABASE_MIGRATE_URL must be the doadmin connection string from DigitalOcean.)
--
-- Alternatively, with psql installed:
--    psql "$DATABASE_MIGRATE_URL" -v ON_ERROR_STOP=1 -f scripts/grant-app-user.sql

GRANT USAGE ON SCHEMA public TO app_user_placeholder;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user_placeholder;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user_placeholder;

ALTER DEFAULT PRIVILEGES FOR ROLE doadmin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user_placeholder;

ALTER DEFAULT PRIVILEGES FOR ROLE doadmin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user_placeholder;
