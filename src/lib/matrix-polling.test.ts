import { describe, expect, it } from "vitest";
import { shouldPollMatrix } from "./matrix-polling";

describe("shouldPollMatrix", () => {
  it("polls when the board is ready and idle", () => {
    expect(
      shouldPollMatrix({
        ready: true,
        authorized: true,
        busy: false,
        activeDragId: null,
      }),
    ).toBe(true);
  });

  it("does not poll while a mutation is in progress", () => {
    expect(
      shouldPollMatrix({
        ready: true,
        authorized: true,
        busy: true,
        activeDragId: null,
      }),
    ).toBe(false);
  });

  it("does not poll while a drag is active", () => {
    expect(
      shouldPollMatrix({
        ready: true,
        authorized: true,
        busy: false,
        activeDragId: "topic-1",
      }),
    ).toBe(false);
  });

  it("does not poll before the board is ready or authorized", () => {
    expect(
      shouldPollMatrix({
        ready: false,
        authorized: true,
        busy: false,
        activeDragId: null,
      }),
    ).toBe(false);
    expect(
      shouldPollMatrix({
        ready: true,
        authorized: false,
        busy: false,
        activeDragId: null,
      }),
    ).toBe(false);
  });
});
