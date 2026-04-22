const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function getToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("maesil_agency_token") || "";
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("maesil_agency_token", token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("maesil_agency_token");
}

export function hasToken(): boolean {
  return !!getToken();
}
