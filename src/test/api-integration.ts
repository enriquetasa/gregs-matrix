export const hasIntegrationDatabase = Boolean(process.env.DATABASE_URL);

type JsonRequestInit = Omit<RequestInit, "body"> & {
  json?: unknown;
};

export function jsonRequest(url: string, init: JsonRequestInit = {}): Request {
  const headers = new Headers(init.headers);
  let body = init.body;

  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  return new Request(url, {
    ...init,
    headers,
    body,
  });
}

export function routeContext<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

export function sessionCookieFromResponse(response: Response): string | null {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];

  if (setCookies.length === 0) {
    const single = response.headers.get("set-cookie");
    if (single) {
      setCookies.push(single);
    }
  }

  for (const cookie of setCookies) {
    const pair = cookie.split(";")[0]?.trim();
    if (pair?.startsWith("gm_access=")) {
      return pair;
    }
  }

  return null;
}

export function withCookie(
  request: Request,
  cookie: string | null,
): Request {
  if (!cookie) {
    return request;
  }

  const headers = new Headers(request.headers);
  headers.set("cookie", cookie);
  return new Request(request, { headers });
}
