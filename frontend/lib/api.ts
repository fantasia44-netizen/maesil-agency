const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const TOKEN_KEY = "maesil_agency_token";
const USER_KEY  = "maesil_agency_user";

// ── 토큰 ────────────────────────────────────────────────────────────
export function getToken(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function hasToken(): boolean {
  return !!getToken();
}

// ── 유저 정보 ────────────────────────────────────────────────────────
export type StoredUser = {
  email: string;
  role: "super_admin" | "customer";
  display_name: string | null;
  insight_operator_id: string | null;
};

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setUser(user: StoredUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isSuperAdmin(): boolean {
  return getUser()?.role === "super_admin";
}

// ── API 호출 ─────────────────────────────────────────────────────────
// 에이전트 실행은 60초까지 걸릴 수 있으므로 기본 60초
// 단순 데이터 조회는 apiFetch(path, {}, 15000) 으로 명시 가능
export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 60000,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers, signal: controller.signal });
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("요청 시간이 초과되었습니다. 서버 연결을 확인하세요.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }

  // 401 → 로그인 페이지로
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("인증이 필요합니다.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

// ── 로그인 ───────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<StoredUser> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "로그인 실패");
  }
  const data = await res.json();
  setToken(data.token);
  const user: StoredUser = {
    email: data.email,
    role: data.role,
    display_name: data.display_name,
    insight_operator_id: data.insight_operator_id,
  };
  setUser(user);
  return user;
}

export function logout() {
  clearToken();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
