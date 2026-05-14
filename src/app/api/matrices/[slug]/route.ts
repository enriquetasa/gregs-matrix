import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import { canAccessMatrix } from "@/lib/matrix-authorization";
import {
  getSessionCookieName,
  signMatrixSession,
} from "@/lib/matrix-session";
import { isValidMatrixSlug } from "@/lib/slug";
import { patchMatrixSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { slug } = await context.params;
    if (!isValidMatrixSlug(slug)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const matrix = await prisma.matrix.findUnique({
      where: { slug },
      include: {
        topics: { orderBy: [{ quadrant: "asc" }, { sortOrder: "asc" }] },
      },
    });
    if (!matrix) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const cookieHeader = request.headers.get("cookie");
    const authorized = await canAccessMatrix(cookieHeader, matrix);
    const hasPassword = Boolean(matrix.passwordHash);
    return NextResponse.json({
      authorized,
      hasPassword,
      matrix: {
        slug: matrix.slug,
        title: matrix.title,
        createdAt: matrix.createdAt.toISOString(),
      },
      topics: authorized
        ? matrix.topics.map((t) => ({
            id: t.id,
            text: t.text,
            quadrant: t.quadrant,
            sortOrder: t.sortOrder,
            updatedAt: t.updatedAt.toISOString(),
          }))
        : [],
    });
  } catch (error) {
    console.error("GET /api/matrices/[slug] failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { slug } = await context.params;
    if (!isValidMatrixSlug(slug)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const json: unknown = await request.json();
    const parsed = patchMatrixSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
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

    const { title, password, currentPassword } = parsed.data;

    if (password === undefined && title === undefined) {
      return NextResponse.json({ error: "No changes" }, { status: 400 });
    }

    if (password !== undefined) {
      if (matrix.passwordHash) {
        if (!currentPassword) {
          return NextResponse.json(
            { error: "currentPassword required" },
            { status: 400 },
          );
        }
        const ok = await bcrypt.compare(currentPassword, matrix.passwordHash);
        if (!ok) {
          return NextResponse.json(
            { error: "Invalid current password" },
            { status: 403 },
          );
        }
      }
      const passwordHash =
        password === null ? null : await bcrypt.hash(password, 10);
      await prisma.matrix.update({
        where: { id: matrix.id },
        data: {
          passwordHash,
          ...(title !== undefined ? { title } : {}),
        },
      });
    } else if (title !== undefined) {
      await prisma.matrix.update({
        where: { id: matrix.id },
        data: { title },
      });
    }

    const updated = await prisma.matrix.findUniqueOrThrow({
      where: { id: matrix.id },
    });

    if (password !== undefined && password !== null) {
      const token = await signMatrixSession({ slug: updated.slug, mid: updated.id });
      const res = NextResponse.json({ ok: true });
      res.cookies.set(getSessionCookieName(), token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      return res;
    }

    if (password === null) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set(getSessionCookieName(), "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/matrices/[slug] failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
