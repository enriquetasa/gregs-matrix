"use strict";

const { spawnSync } = require("child_process");

const migrateUrl =
  process.env.DATABASE_MIGRATE_URL || process.env.DATABASE_URL;
if (!migrateUrl) {
  console.error(
    "Missing DATABASE_URL (and optional DATABASE_MIGRATE_URL for migrations).",
  );
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: migrateUrl },
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
