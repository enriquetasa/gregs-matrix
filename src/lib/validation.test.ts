import { describe, expect, it } from "vitest";
import {
  createMatrixSchema,
  createTopicSchema,
  patchMatrixSchema,
  patchTopicSchema,
  unlockMatrixSchema,
} from "./validation";

describe("validation schemas", () => {
  it("accepts create matrix payloads", () => {
    expect(createMatrixSchema.safeParse({}).success).toBe(true);
    expect(
      createMatrixSchema.safeParse({ title: "T", password: "secret1" }).success,
    ).toBe(true);
    expect(createMatrixSchema.safeParse({ password: "abc" }).success).toBe(false);
  });

  it("accepts unlock payload", () => {
    expect(unlockMatrixSchema.safeParse({ password: "x" }).success).toBe(true);
    expect(unlockMatrixSchema.safeParse({}).success).toBe(false);
  });

  it("accepts topic create payload", () => {
    expect(
      createTopicSchema.safeParse({
        text: "Hello",
        quadrant: "DO_NOW",
      }).success,
    ).toBe(true);
    expect(
      createTopicSchema.safeParse({ text: "", quadrant: "DO_NOW" }).success,
    ).toBe(false);
  });

  it("accepts topic patch payload", () => {
    expect(patchTopicSchema.safeParse({ quadrant: "IGNORE" }).success).toBe(true);
    expect(patchTopicSchema.safeParse({ text: "Hi" }).success).toBe(true);
    expect(patchTopicSchema.safeParse({}).success).toBe(true);
  });

  it("accepts matrix patch payload", () => {
    expect(patchMatrixSchema.safeParse({ title: "x" }).success).toBe(true);
    expect(
      patchMatrixSchema.safeParse({ password: null, currentPassword: "old" })
        .success,
    ).toBe(true);
  });
});
