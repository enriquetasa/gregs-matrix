"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const schemaPath = path.join("prisma", "schema.prisma");
if (!fs.existsSync(schemaPath)) {
  process.exit(0);
}

execSync("npx prisma generate", { stdio: "inherit" });
