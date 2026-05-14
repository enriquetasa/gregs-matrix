import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import {
  getSessionCookieName,
  signMatrixSession,
} from "@/lib/matrix-session";
import { generateMatrixSlug } from "@/lib/slug";
import { createMatrixSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const parsed = createMatrixSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { title, password } = parsed.data;
    const passwordHash = password
      ? await bcrypt.hash(password, 10)
      : null;

    for (let attempt = 0; attempt < 8; attempt++) {
      const slug = generateMatrixSlug();
      try {
        const matrix = await prisma.matrix.create({
          data: {
            slug,
            title: title ?? null,
            passwordHash,
          },
        });
        const res = NextResponse.json(
          { slug: matrix.slug, id: matrix.id },
          { status: 201 },
        );
        if (passwordHash) {
          const token = await signMatrixSession({
            slug: matrix.slug,
            mid: matrix.id,
          });
          res.cookies.set(getSessionCookieName(), token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 30,
          });
        }
        return res;
      } catch (e: unknown) {
        const code =
          typeof e === "object" && e !== null && "code" in e
            ? String((e as { code?: string }).code)
            : "";
        if (code === "P2002") continue;
        throw e;
      }
    }
    return NextResponse.json({ error: "Could not allocate slug" }, { status: 503 });
  } catch (error) {
    console.error("POST /api/matrices failed", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
