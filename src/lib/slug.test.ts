import { describe, expect, it } from "vitest";
import { generateMatrixSlug, isValidMatrixSlug } from "./slug";

describe("slug", () => {
  it("generates a 10-char lowercase alphanumeric slug", () => {
    const s = generateMatrixSlug();
    expect(s).toHaveLength(10);
    expect(isValidMatrixSlug(s)).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(isValidMatrixSlug("")).toBe(false);
    expect(isValidMatrixSlug("ABCDEFGHIJ")).toBe(false);
    expect(isValidMatrixSlug("short")).toBe(false);
  });
});
