import { describe, expect, it } from "vitest";
import { parseQuadrant, QUADRANTS, QUADRANT_LABELS } from "./quadrants";

describe("quadrants", () => {
  it("has four quadrants with labels", () => {
    expect(QUADRANTS).toHaveLength(4);
    for (const q of QUADRANTS) {
      expect(QUADRANT_LABELS[q].length).toBeGreaterThan(0);
    }
  });

  it("parses known quadrant strings", () => {
    expect(parseQuadrant("DO_NOW")).toBe("DO_NOW");
    expect(parseQuadrant("IGNORE")).toBe("IGNORE");
    expect(parseQuadrant("nope")).toBeNull();
    expect(parseQuadrant(1)).toBeNull();
  });
});
