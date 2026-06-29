export type HealthCheckBody = {
  ok: boolean;
  db: "ok" | "unavailable";
};

export type HealthCheckResult = {
  body: HealthCheckBody;
  status: number;
};

export async function buildHealthCheckResult(
  pingDatabase: () => Promise<unknown>,
): Promise<HealthCheckResult> {
  try {
    await pingDatabase();
    return { body: { ok: true, db: "ok" }, status: 200 };
  } catch {
    return { body: { ok: false, db: "unavailable" }, status: 503 };
  }
}
