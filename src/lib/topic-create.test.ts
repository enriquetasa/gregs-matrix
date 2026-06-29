import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Quadrant } from "@prisma/client";
import { createTopicWithSortOrder, type TopicCreateClient } from "./topic-create";

const quadrant = "DO_NOW" as Quadrant;

describe("createTopicWithSortOrder", () => {
  const aggregate = vi.fn();
  const create = vi.fn();
  const transaction = vi.fn(
    async (callback: (tx: { topic: { aggregate: typeof aggregate; create: typeof create } }) => unknown) =>
      callback({ topic: { aggregate, create } }),
  );

  const db = {
    $transaction: transaction,
  } as unknown as TopicCreateClient;

  beforeEach(() => {
    aggregate.mockReset();
    create.mockReset();
    transaction.mockClear();
    aggregate.mockResolvedValue({ _max: { sortOrder: 2 } });
    create.mockResolvedValue({
      id: "topic-1",
      text: "Note",
      quadrant,
      sortOrder: 3,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
  });

  it("creates a topic inside a transaction with the next sort order", async () => {
    const topic = await createTopicWithSortOrder(
      db,
      "matrix-1",
      { text: "Note", quadrant },
    );

    expect(transaction).toHaveBeenCalledOnce();
    expect(aggregate).toHaveBeenCalledWith({
      where: { matrixId: "matrix-1", quadrant },
      _max: { sortOrder: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        matrixId: "matrix-1",
        text: "Note",
        quadrant,
        sortOrder: 3,
      },
    });
    expect(topic.sortOrder).toBe(3);
  });

  it("starts sort order at zero when the quadrant is empty", async () => {
    aggregate.mockResolvedValue({ _max: { sortOrder: null } });

    await createTopicWithSortOrder(
      db,
      "matrix-1",
      { text: "First", quadrant },
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        matrixId: "matrix-1",
        text: "First",
        quadrant,
        sortOrder: 0,
      },
    });
  });
});
