/**
 * Safe error body reader — never use `res.json()` on error responses; proxies/5xx often return an empty body.
 */
export async function errorMessageFromFetchResponse(res: Response): Promise<string> {
  let message = `Request failed (${res.status}).`;
  let raw: string;
  try {
    raw = await res.text();
  } catch {
    return `${message} Could not read response body.`;
  }
  if (!raw.trim()) {
    return `${message} The server returned no body (check API logs or database).`;
  }
  try {
    const body = JSON.parse(raw) as { error?: unknown };
    if (body.error !== undefined && body.error !== null) {
      const err = body.error;
      return typeof err === "string" ? err : JSON.stringify(err);
    }
  } catch {
    return raw.slice(0, 500);
  }
  return raw.slice(0, 500);
}
