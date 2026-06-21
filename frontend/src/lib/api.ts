/**
 * lib/api.ts — Feature 7: Authenticated fetch wrapper
 *
 * apiFetch wraps the native fetch API and automatically:
 *   1. Prepends BACKEND_URL to relative paths
 *   2. Injects Authorization: Bearer <token> header when a JWT is stored
 *   3. Dispatches a "sherlock:auth:required" event on 401 responses
 *
 * Works transparently with SSE streams — just reads response body as normal.
 */

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/** Storage key for the JWT access token */
export const TOKEN_KEY = "sherlock_token";

/** Get the stored JWT or null */
export function getToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Store a new JWT */
export function setToken(token: string): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/** Clear stored JWT and fire auth-required event */
export function clearToken(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sherlock:auth:required"));
  }
}

/**
 * apiFetch — drop-in replacement for fetch() with auth injection.
 *
 * Usage (identical to fetch):
 *   const res = await apiFetch("/chat/stream", { method: "POST", body: ... })
 *   const res = await apiFetch("http://localhost:8000/upload", { method: "POST", body: fd })
 */
export async function apiFetch(
  pathOrUrl: string,
  opts: RequestInit = {}
): Promise<Response> {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${BACKEND_URL}${pathOrUrl}`;

  const token = getToken();

  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...opts, headers });

  if (res.status === 401) {
    clearToken();
  }

  return res;
}
