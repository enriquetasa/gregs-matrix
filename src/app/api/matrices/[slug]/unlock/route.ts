import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import {
  getSessionCookieName,
  signMatrixSession,
} from "@/lib/matrix-session";
import { isValidMatrixSlug } from "@/lib/slug";
import { unlockMatrixSchema } from "@/lib/validation";

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
    const json: unknown = await request.json();
    const parsed = unlockMatrixSchema.safeParse(json);
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
    if (!matrix.passwordHash) {
      return NextResponse.json({ error: "Matrix is not locked" }, { status: 400 });
    }

    const ok = await bcrypt.compare(parsed.data.password, matrix.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid password" }, { status: 403 });
    }

    const token = await signMatrixSession({ slug: matrix.slug, mid: matrix.id });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (error) {
    console.error("POST /api/matrices/[slug]/unlock failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
