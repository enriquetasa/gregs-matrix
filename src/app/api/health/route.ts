import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildHealthCheckResult } from "@/lib/health";

export async function GET() {
  const { body, status } = await buildHealthCheckResult(() =>
    prisma.$queryRaw`SELECT 1`,
  );
  return NextResponse.json(body, { status });
}
