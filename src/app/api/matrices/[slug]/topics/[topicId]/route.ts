import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canAccessMatrix } from "@/lib/matrix-authorization";
import { isValidMatrixSlug } from "@/lib/slug";
import { patchTopicSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ slug: string; topicId: string }> };

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { slug, topicId } = await context.params;
    if (!isValidMatrixSlug(slug)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const matrix = await prisma.matrix.findUnique({ where: { slug } });
    if (!matrix) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const cookieHeader = request.headers.get("cookie");
    const authorized = await canAccessMatrix(cookieHeader, matrix);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const topic = await prisma.topic.findFirst({
      where: { id: topicId, matrixId: matrix.id },
    });
    if (!topic) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const json: unknown = await request.json();
    const parsed = patchTopicSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    const updated = await prisma.topic.update({
      where: { id: topic.id },
      data: parsed.data,
    });

    return NextResponse.json({
      id: updated.id,
      text: updated.text,
      quadrant: updated.quadrant,
      sortOrder: updated.sortOrder,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("PATCH /api/matrices/[slug]/topics/[topicId] failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { slug, topicId } = await context.params;
    if (!isValidMatrixSlug(slug)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const matrix = await prisma.matrix.findUnique({ where: { slug } });
    if (!matrix) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const cookieHeader = _request.headers.get("cookie");
    const authorized = await canAccessMatrix(cookieHeader, matrix);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const topic = await prisma.topic.findFirst({
      where: { id: topicId, matrixId: matrix.id },
    });
    if (!topic) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.topic.delete({ where: { id: topic.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/matrices/[slug]/topics/[topicId] failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
