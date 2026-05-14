import { describe, expect, it, beforeEach } from "vitest";
import {
  getSessionCookieName,
  readSessionTokenFromCookieHeader,
  signMatrixSession,
  verifyMatrixSession,
} from "./matrix-session";

beforeEach(() => {
  process.env.SESSION_SECRET = "x".repeat(32);
});

describe("matrix-session", () => {
  it("exposes stable cookie name", () => {
    expect(getSessionCookieName()).toBe("gm_access");
  });

  it("signs and verifies a session for a slug and matrix id", async () => {
    const token = await signMatrixSession({ slug: "abc123def4", mid: "mid1" });
    const decoded = await verifyMatrixSession(token);
    expect(decoded).toEqual({ slug: "abc123def4", mid: "mid1" });
  });

  it("returns null for invalid token", async () => {
    expect(await verifyMatrixSession("not-a-jwt")).toBeNull();
  });

  it("throws when SESSION_SECRET is missing or too short", async () => {
    const prev = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    await expect(signMatrixSession({ slug: "abc123def4", mid: "m" })).rejects.toThrow(
      "SESSION_SECRET",
    );
    process.env.SESSION_SECRET = "short";
    await expect(signMatrixSession({ slug: "abc123def4", mid: "m" })).rejects.toThrow(
      "SESSION_SECRET",
    );
    process.env.SESSION_SECRET = prev;
  });

  it("reads cookie from Cookie header", () => {
    const token = "hello.world.sig";
    const header = `other=1; gm_access=${encodeURIComponent(token)}; x=2`;
    expect(readSessionTokenFromCookieHeader(header)).toBe(token);
  });

  it("returns null when cookie header is missing", () => {
    expect(readSessionTokenFromCookieHeader(null)).toBeNull();
  });
});
