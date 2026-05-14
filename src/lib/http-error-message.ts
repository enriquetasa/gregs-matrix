/**
 * Human-readable copy for failed API responses.
 */
export function messageForApiStatus(
  status: number,
  body: { error?: unknown } | null,
): string {
  if (
    body &&
    typeof body.error === "string" &&
    body.error.trim().length > 0
  ) {
    return body.error;
  }
  switch (status) {
    case 400:
      return "The request was invalid.";
    case 401:
      return "You are not authorized for this action.";
    case 403:
      return "You do not have permission to do that.";
    case 404:
      return "That resource was not found.";
    case 429:
      return "Too many requests. Try again in a moment.";
    case 502:
    case 503:
      return "The service is temporarily unavailable.";
    default:
      if (status >= 500) {
        return "Something went wrong on the server.";
      }
      return "The request could not be completed.";
  }
}

export async function messageFromFailedResponse(
  res: Response,
): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    error?: unknown;
  } | null;
  return messageForApiStatus(res.status, body);
}
