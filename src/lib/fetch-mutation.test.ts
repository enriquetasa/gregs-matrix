import { describe, expect, it, vi } from "vitest";
import { fetchMutation, HttpMutationError } from "./fetch-mutation";

describe("fetchMutation", () => {
  it("returns the response when the request succeeds", async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(fetchMutation("/api/test")).resolves.toBe(response);
  });

  it("throws HttpMutationError when the request fails", async () => {
    const response = new Response(JSON.stringify({ error: "Nope" }), {
      status: 403,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(fetchMutation("/api/test")).rejects.toBeInstanceOf(
      HttpMutationError,
    );
    await expect(fetchMutation("/api/test")).rejects.toMatchObject({
      response,
    });
  });
});
