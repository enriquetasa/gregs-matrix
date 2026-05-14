import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { canAccessMatrix } from "@/lib/matrix-authorization";
import { isValidMatrixSlug } from "@/lib/slug";
import { createTopicSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { slug } = await context.params;
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

    const json: unknown = await request.json();
    const parsed = createTopicSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const maxOrder = await prisma.topic.aggregate({
      where: { matrixId: matrix.id, quadrant: parsed.data.quadrant },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const topic = await prisma.topic.create({
      data: {
        matrixId: matrix.id,
        text: parsed.data.text,
        quadrant: parsed.data.quadrant,
        sortOrder,
      },
    });

    return NextResponse.json(
      {
        id: topic.id,
        text: topic.text,
        quadrant: topic.quadrant,
        sortOrder: topic.sortOrder,
        updatedAt: topic.updatedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/matrices/[slug]/topics failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
