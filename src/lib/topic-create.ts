import type { Prisma, Quadrant, Topic } from "@prisma/client";

export type TopicCreateClient = {
  $transaction: <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ) => Promise<T>;
};

export async function createTopicWithSortOrder(
  db: TopicCreateClient,
  matrixId: string,
  data: { text: string; quadrant: Quadrant },
): Promise<Topic> {
  return db.$transaction(async (tx) => {
    const maxOrder = await tx.topic.aggregate({
      where: { matrixId, quadrant: data.quadrant },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    return tx.topic.create({
      data: {
        matrixId,
        text: data.text,
        quadrant: data.quadrant,
        sortOrder,
      },
    });
  });
}
