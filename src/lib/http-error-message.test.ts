import { describe, expect, it } from "vitest";
import { messageForApiStatus } from "./http-error-message";

describe("messageForApiStatus", () => {
  it("prefers server error string when present", () => {
    expect(
      messageForApiStatus(400, { error: "Title too long" }),
    ).toBe("Title too long");
  });

  it("falls back by status code", () => {
    expect(messageForApiStatus(429, null)).toContain("Too many");
    expect(messageForApiStatus(503, null)).toContain("unavailable");
    expect(messageForApiStatus(418, null)).toContain("could not be completed");
  });
});
