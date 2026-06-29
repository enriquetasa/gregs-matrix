import { describe, expect, it, vi } from "vitest";
import { fetchMutation, HttpMutationError } from "./fetch-mutation";

describe("fetchMutation", () => {
  it("returns the response when the request succeeds", async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(fetchMutation("/api/test")).resolves.toBe(response);
  });

  it("exposes the failed response on HttpMutationError", async () => {
    const response = new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    try {
      await fetchMutation("/api/test");
      expect.unreachable("fetchMutation should throw");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpMutationError);
      expect((error as HttpMutationError).response.status).toBe(401);
    }
  });
});
