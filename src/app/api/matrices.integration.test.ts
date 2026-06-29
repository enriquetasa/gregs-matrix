import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { GET as getMatrix } from "@/app/api/matrices/[slug]/route";
import { POST as unlockMatrix } from "@/app/api/matrices/[slug]/unlock/route";
import { POST as createMatrix } from "@/app/api/matrices/route";
import {
  hasIntegrationDatabase,
  jsonRequest,
  routeContext,
  sessionCookieFromResponse,
  withCookie,
} from "@/test/api-integration";

const describeIntegration = hasIntegrationDatabase ? describe : describe.skip;

describeIntegration("matrix API integration", () => {
  const createdMatrixIds: string[] = [];

  afterEach(async () => {
    if (createdMatrixIds.length === 0) {
      return;
    }
    await prisma.matrix.deleteMany({
      where: { id: { in: createdMatrixIds } },
    });
    createdMatrixIds.length = 0;
  });

  it("creates an unlocked matrix and returns its slug", async () => {
    const res = await createMatrix(
      jsonRequest("http://localhost/api/matrices", {
        method: "POST",
        json: { title: "Integration board" },
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { slug: string; id: string };
    expect(body.slug).toMatch(/^[0-9a-z]{10}$/);
    createdMatrixIds.push(body.id);

    const getRes = await getMatrix(
      jsonRequest(`http://localhost/api/matrices/${body.slug}`),
      routeContext({ slug: body.slug }),
    );
    expect(getRes.status).toBe(200);
    const payload = (await getRes.json()) as {
      authorized: boolean;
      hasPassword: boolean;
      matrix: { title: string | null };
      topics: unknown[];
    };
    expect(payload.authorized).toBe(true);
    expect(payload.hasPassword).toBe(false);
    expect(payload.matrix.title).toBe("Integration board");
    expect(payload.topics).toEqual([]);
  });

  it("creates a password-protected matrix and sets a session cookie", async () => {
    const res = await createMatrix(
      jsonRequest("http://localhost/api/matrices", {
        method: "POST",
        json: { password: "secret" },
      }),
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { slug: string; id: string };
    createdMatrixIds.push(body.id);
    expect(sessionCookieFromResponse(res)).toMatch(/^gm_access=/);
  });

  it("hides topics from unauthorized clients on locked matrices", async () => {
    const createRes = await createMatrix(
      jsonRequest("http://localhost/api/matrices", {
        method: "POST",
        json: { password: "secret" },
      }),
    );
    const { slug, id } = (await createRes.json()) as { slug: string; id: string };
    createdMatrixIds.push(id);

    await prisma.topic.create({
      data: {
        matrixId: id,
        text: "Hidden note",
        quadrant: "DO_NOW",
        sortOrder: 0,
      },
    });

    const getRes = await getMatrix(
      jsonRequest(`http://localhost/api/matrices/${slug}`),
      routeContext({ slug }),
    );
    const payload = (await getRes.json()) as {
      authorized: boolean;
      hasPassword: boolean;
      topics: unknown[];
    };

    expect(payload.authorized).toBe(false);
    expect(payload.hasPassword).toBe(true);
    expect(payload.topics).toEqual([]);
  });

  it("rejects invalid unlock passwords and accepts valid ones", async () => {
    const createRes = await createMatrix(
      jsonRequest("http://localhost/api/matrices", {
        method: "POST",
        json: { password: "secret" },
      }),
    );
    const { slug, id } = (await createRes.json()) as { slug: string; id: string };
    createdMatrixIds.push(id);

    const badUnlock = await unlockMatrix(
      jsonRequest(`http://localhost/api/matrices/${slug}/unlock`, {
        method: "POST",
        json: { password: "wrong" },
      }),
      routeContext({ slug }),
    );
    expect(badUnlock.status).toBe(403);

    const goodUnlock = await unlockMatrix(
      jsonRequest(`http://localhost/api/matrices/${slug}/unlock`, {
        method: "POST",
        json: { password: "secret" },
      }),
      routeContext({ slug }),
    );
    expect(goodUnlock.status).toBe(200);
    const cookie = sessionCookieFromResponse(goodUnlock);
    expect(cookie).toMatch(/^gm_access=/);

    const getRes = await getMatrix(
      withCookie(
        jsonRequest(`http://localhost/api/matrices/${slug}`),
        cookie,
      ),
      routeContext({ slug }),
    );
    const payload = (await getRes.json()) as { authorized: boolean };
    expect(payload.authorized).toBe(true);
  });
});
