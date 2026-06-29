import { describe, expect, it } from "vitest";
import { buildHealthCheckResult } from "./health";

describe("buildHealthCheckResult", () => {
  it("returns 200 when the database ping succeeds", async () => {
    const result = await buildHealthCheckResult(async () => undefined);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, db: "ok" });
  });

  it("returns 503 when the database ping fails", async () => {
    const result = await buildHealthCheckResult(async () => {
      throw new Error("connection refused");
    });

    expect(result.status).toBe(503);
    expect(result.body).toEqual({ ok: false, db: "unavailable" });
  });
});
