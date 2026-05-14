import type { Matrix } from "@prisma/client";
import {
  readSessionTokenFromCookieHeader,
  verifyMatrixSession,
} from "./matrix-session";

export async function canAccessMatrix(
  cookieHeader: string | null,
  matrix: Pick<Matrix, "id" | "slug" | "passwordHash">,
): Promise<boolean> {
  if (!matrix.passwordHash) return true;
  const raw = readSessionTokenFromCookieHeader(cookieHeader);
  if (!raw) return false;
  const session = await verifyMatrixSession(raw);
  if (!session) return false;
  return session.slug === matrix.slug && session.mid === matrix.id;
}
