import { describe, expect, it, beforeEach } from "vitest";
import type { Matrix } from "@prisma/client";
import { signMatrixSession } from "./matrix-session";
import { canAccessMatrix } from "./matrix-authorization";

beforeEach(() => {
  process.env.SESSION_SECRET = "y".repeat(32);
});

function matrix(
  overrides: Partial<Pick<Matrix, "id" | "slug" | "passwordHash">> = {},
): Pick<Matrix, "id" | "slug" | "passwordHash"> {
  return {
    id: "m1",
    slug: "abc123def4",
    passwordHash: null,
    ...overrides,
  };
}

describe("canAccessMatrix", () => {
  it("allows access when no password is set", async () => {
    await expect(
      canAccessMatrix(null, matrix({ passwordHash: null })),
    ).resolves.toBe(true);
  });

  it("denies access when password is set but no cookie", async () => {
    await expect(
      canAccessMatrix(null, matrix({ passwordHash: "hash" })),
    ).resolves.toBe(false);
  });

  it("allows access with valid session cookie", async () => {
    const token = await signMatrixSession({ slug: "abc123def4", mid: "m1" });
    const header = `gm_access=${encodeURIComponent(token)}`;
    await expect(canAccessMatrix(header, matrix({ passwordHash: "x" }))).resolves.toBe(
      true,
    );
  });

  it("denies when session is invalid jwt in cookie", async () => {
    const header = `gm_access=${encodeURIComponent("not-a-jwt")}`;
    await expect(canAccessMatrix(header, matrix({ passwordHash: "x" }))).resolves.toBe(
      false,
    );
  });

  it("denies when session slug mismatches", async () => {
    const token = await signMatrixSession({ slug: "zzzzzzzzzz", mid: "m1" });
    const header = `gm_access=${encodeURIComponent(token)}`;
    await expect(canAccessMatrix(header, matrix({ passwordHash: "x" }))).resolves.toBe(
      false,
    );
  });

  it("denies when session matrix id mismatches", async () => {
    const token = await signMatrixSession({ slug: "abc123def4", mid: "other" });
    const header = `gm_access=${encodeURIComponent(token)}`;
    await expect(canAccessMatrix(header, matrix({ passwordHash: "x" }))).resolves.toBe(
      false,
    );
  });
});
