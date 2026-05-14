import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      include: ["src/lib/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "src/lib/db.ts"],
    },
    env: {
      SESSION_SECRET: "test-session-secret-32-characters!",
    } as Record<string, string>,
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
});
