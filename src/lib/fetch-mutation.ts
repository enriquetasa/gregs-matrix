export class HttpMutationError extends Error {
  readonly response: Response;

  constructor(response: Response) {
    super(`Request failed with status ${response.status}`);
    this.name = "HttpMutationError";
    this.response = response;
  }
}

export async function fetchMutation(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new HttpMutationError(response);
  }
  return response;
}
