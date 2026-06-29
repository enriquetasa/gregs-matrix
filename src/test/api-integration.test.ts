import { describe, expect, it } from "vitest";
import {
  jsonRequest,
  routeContext,
  sessionCookieFromResponse,
} from "./api-integration";

describe("jsonRequest", () => {
  it("builds a JSON request with the content type header", () => {
    const req = jsonRequest("http://localhost/api/matrices", {
      method: "POST",
      json: { title: "Wall board" },
    });

    expect(req.method).toBe("POST");
    expect(req.headers.get("content-type")).toBe("application/json");
    expect(req.url).toBe("http://localhost/api/matrices");
  });
});

describe("sessionCookieFromResponse", () => {
  it("extracts the gm_access cookie from Set-Cookie headers", () => {
    const res = new Response(null, {
      headers: {
        "set-cookie":
          "gm_access=signed-token; Path=/; HttpOnly; SameSite=Lax",
      },
    });

    expect(sessionCookieFromResponse(res)).toBe("gm_access=signed-token");
  });

  it("returns null when no session cookie is present", () => {
    const res = new Response(null, { status: 200 });
    expect(sessionCookieFromResponse(res)).toBeNull();
  });
});

describe("routeContext", () => {
  it("wraps params in a promise for route handlers", async () => {
    const context = routeContext({ slug: "abc123def4" });
    await expect(context.params).resolves.toEqual({ slug: "abc123def4" });
  });
});
