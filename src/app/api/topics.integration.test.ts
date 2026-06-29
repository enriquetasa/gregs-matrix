import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { GET as getMatrix } from "@/app/api/matrices/[slug]/route";
import { POST as createTopic } from "@/app/api/matrices/[slug]/topics/route";
import {
  DELETE as deleteTopic,
  PATCH as patchTopic,
} from "@/app/api/matrices/[slug]/topics/[topicId]/route";
import { POST as createMatrix } from "@/app/api/matrices/route";
import {
  hasIntegrationDatabase,
  jsonRequest,
  routeContext,
  sessionCookieFromResponse,
  withCookie,
} from "@/test/api-integration";

const describeIntegration = hasIntegrationDatabase ? describe : describe.skip;

describeIntegration("topic API integration", () => {
  const createdMatrixIds: string[] = [];
  let slug = "";
  let matrixId = "";
  let sessionCookie: string | null = null;

  afterEach(async () => {
    if (createdMatrixIds.length === 0) {
      return;
    }
    await prisma.matrix.deleteMany({
      where: { id: { in: createdMatrixIds } },
    });
    createdMatrixIds.length = 0;
    slug = "";
    matrixId = "";
    sessionCookie = null;
  });

  async function createUnlockedMatrix() {
    const res = await createMatrix(
      jsonRequest("http://localhost/api/matrices", {
        method: "POST",
        json: { title: "Topic integration" },
      }),
    );
    const body = (await res.json()) as { slug: string; id: string };
    slug = body.slug;
    matrixId = body.id;
    createdMatrixIds.push(body.id);
  }

  async function createLockedMatrix(password = "secret") {
    const res = await createMatrix(
      jsonRequest("http://localhost/api/matrices", {
        method: "POST",
        json: { password },
      }),
    );
    const body = (await res.json()) as { slug: string; id: string };
    slug = body.slug;
    matrixId = body.id;
    createdMatrixIds.push(body.id);
    sessionCookie = sessionCookieFromResponse(res);
  }

  it("creates, updates, and deletes topics on an unlocked matrix", async () => {
    await createUnlockedMatrix();

    const createRes = await createTopic(
      jsonRequest(`http://localhost/api/matrices/${slug}/topics`, {
        method: "POST",
        json: { text: "Ship the release", quadrant: "DO_NOW" },
      }),
      routeContext({ slug }),
    );
    expect(createRes.status).toBe(201);
    const topic = (await createRes.json()) as {
      id: string;
      text: string;
      quadrant: string;
      sortOrder: number;
    };
    expect(topic.text).toBe("Ship the release");
    expect(topic.quadrant).toBe("DO_NOW");
    expect(topic.sortOrder).toBe(0);

    const patchRes = await patchTopic(
      jsonRequest(`http://localhost/api/matrices/${slug}/topics/${topic.id}`, {
        method: "PATCH",
        json: { text: "Ship the release today", quadrant: "IGNORE" },
      }),
      routeContext({ slug, topicId: topic.id }),
    );
    expect(patchRes.status).toBe(200);
    const updated = (await patchRes.json()) as {
      text: string;
      quadrant: string;
    };
    expect(updated.text).toBe("Ship the release today");
    expect(updated.quadrant).toBe("IGNORE");

    const deleteRes = await deleteTopic(
      jsonRequest(`http://localhost/api/matrices/${slug}/topics/${topic.id}`, {
        method: "DELETE",
      }),
      routeContext({ slug, topicId: topic.id }),
    );
    expect(deleteRes.status).toBe(200);

    const getRes = await getMatrix(
      jsonRequest(`http://localhost/api/matrices/${slug}`),
      routeContext({ slug }),
    );
    const payload = (await getRes.json()) as { topics: unknown[] };
    expect(payload.topics).toEqual([]);
  });

  it("returns 401 for topic mutations without authorization on locked matrices", async () => {
    await createLockedMatrix();

    const createRes = await createTopic(
      jsonRequest(`http://localhost/api/matrices/${slug}/topics`, {
        method: "POST",
        json: { text: "Blocked", quadrant: "DO_NOW" },
      }),
      routeContext({ slug }),
    );
    expect(createRes.status).toBe(401);

    const existing = await prisma.topic.create({
      data: {
        matrixId,
        text: "Existing",
        quadrant: "DO_NOW",
        sortOrder: 0,
      },
    });

    const patchRes = await patchTopic(
      jsonRequest(`http://localhost/api/matrices/${slug}/topics/${existing.id}`, {
        method: "PATCH",
        json: { text: "Still blocked" },
      }),
      routeContext({ slug, topicId: existing.id }),
    );
    expect(patchRes.status).toBe(401);

    const deleteRes = await deleteTopic(
      jsonRequest(`http://localhost/api/matrices/${slug}/topics/${existing.id}`, {
        method: "DELETE",
      }),
      routeContext({ slug, topicId: existing.id }),
    );
    expect(deleteRes.status).toBe(401);
  });

  it("allows topic mutations when the session cookie is present", async () => {
    await createLockedMatrix();

    const createRes = await createTopic(
      withCookie(
        jsonRequest(`http://localhost/api/matrices/${slug}/topics`, {
          method: "POST",
          json: { text: "Authorized note", quadrant: "DO_WHEN_PASSING" },
        }),
        sessionCookie,
      ),
      routeContext({ slug }),
    );
    expect(createRes.status).toBe(201);

    const getRes = await getMatrix(
      withCookie(
        jsonRequest(`http://localhost/api/matrices/${slug}`),
        sessionCookie,
      ),
      routeContext({ slug }),
    );
    const payload = (await getRes.json()) as {
      authorized: boolean;
      topics: Array<{ text: string }>;
    };
    expect(payload.authorized).toBe(true);
    expect(payload.topics.map((topic) => topic.text)).toContain("Authorized note");
  });
});
