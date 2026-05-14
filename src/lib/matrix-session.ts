import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "gm_access";

export function getSessionCookieName(): string {
  return COOKIE_NAME;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export type MatrixSessionPayload = {
  slug: string;
  mid: string;
};

export async function signMatrixSession(
  payload: MatrixSessionPayload,
): Promise<string> {
  return new SignJWT({ mid: payload.mid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.slug)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

export async function verifyMatrixSession(
  token: string,
): Promise<MatrixSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    const slug = typeof payload.sub === "string" ? payload.sub : null;
    const mid = typeof payload.mid === "string" ? payload.mid : null;
    if (!slug || !mid) return null;
    return { slug, mid };
  } catch {
    return null;
  }
}

export function readSessionTokenFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${COOKIE_NAME}=`)) {
      return decodeURIComponent(part.slice(COOKIE_NAME.length + 1));
    }
  }
  return null;
}
