import { afterEach, describe, expect, it } from "vitest";
import { collectEnvValidationErrors, validateRequiredEnv } from "./env";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("collectEnvValidationErrors", () => {
  it("returns no errors when required env vars are valid", () => {
    process.env.DATABASE_URL = "postgresql://localhost/test";
    process.env.SESSION_SECRET = "x".repeat(32);

    expect(collectEnvValidationErrors()).toEqual([]);
  });

  it("reports a missing DATABASE_URL", () => {
    delete process.env.DATABASE_URL;
    process.env.SESSION_SECRET = "x".repeat(32);

    expect(collectEnvValidationErrors()).toEqual([
      {
        variable: "DATABASE_URL",
        message: "DATABASE_URL must be set",
      },
    ]);
  });

  it("reports a missing or short SESSION_SECRET", () => {
    process.env.DATABASE_URL = "postgresql://localhost/test";
    process.env.SESSION_SECRET = "too-short";

    expect(collectEnvValidationErrors()).toEqual([
      {
        variable: "SESSION_SECRET",
        message: "SESSION_SECRET must be set and at least 32 characters",
      },
    ]);
  });
});

describe("validateRequiredEnv", () => {
  it("throws when env validation fails", () => {
    delete process.env.DATABASE_URL;
    delete process.env.SESSION_SECRET;

    expect(() => validateRequiredEnv()).toThrow(/DATABASE_URL/);
  });

  it("does not throw when env validation passes", () => {
    process.env.DATABASE_URL = "postgresql://localhost/test";
    process.env.SESSION_SECRET = "x".repeat(32);

    expect(() => validateRequiredEnv()).not.toThrow();
  });
});
