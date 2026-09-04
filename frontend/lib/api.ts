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
  id?: string | null;
  email: string;
  role: "super_admin" | "customer" | "gbl";
  display_name: string | null;
  insight_operator_id: string | null;
  tenant_id?: string | null;
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

  // 401 → 로그인 페이지로 (GBL 경로면 GBL 로그인으로 분기)
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      const p = window.location.pathname;
      const onGblApp = p === "/gbl" || p.startsWith("/gbl/");   // /gbl-admin 등 제외
      window.location.href = onGblApp ? "/gbl/login" : "/login";
    }
    throw new Error("인증이 필요합니다.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

// 인증 바이너리 다운로드(관리자 XLSX 등) — 토큰 붙여 fetch → blob → 저장.
export async function apiDownload(path: string, filename: string): Promise<void> {
  if (typeof document === "undefined") return;
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`${res.status} 다운로드 실패`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 본인 닉네임(display_name) 변경 + localStorage 갱신
export async function updateNickname(name: string): Promise<string> {
  const data = await apiFetch<{ ok: boolean; display_name: string }>(
    "/api/auth/me",
    { method: "PATCH", body: JSON.stringify({ display_name: name }) },
    15000,
  );
  const u = getUser();
  if (u) setUser({ ...u, display_name: data.display_name });
  return data.display_name;
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

// ── 셀프 가입 ────────────────────────────────────────────────────────
export async function signup(
  email: string,
  password: string,
  company: string,
): Promise<StoredUser> {
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, company, display_name: company }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "가입 실패");
  }
  const data = await res.json();
  setToken(data.token);
  const user: StoredUser = {
    email: data.email,
    role: data.role,
    display_name: data.display_name,
    insight_operator_id: data.insight_operator_id ?? null,
    tenant_id: data.tenant_id ?? null,
  };
  setUser(user);
  return user;
}

// ── GBL 앱 전용 가입 ─────────────────────────────────────────────────
export async function gblSignup(
  email: string,
  password: string,
  display_name?: string,
): Promise<StoredUser> {
  const res = await fetch(`${BASE}/api/auth/gbl-signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name: display_name || undefined }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "가입 실패");
  }
  const data = await res.json();
  setToken(data.token);
  const user: StoredUser = {
    id: data.id ?? null,
    email: data.email,
    role: data.role,
    display_name: data.display_name ?? null,
    insight_operator_id: null,
  };
  setUser(user);
  return user;
}

// ── GBL 비밀번호 재설정 ───────────────────────────────────────────────
export async function gblPasswordRequest(email: string): Promise<void> {
  // 항상 성공(계정 존재 노출 방지) — 네트워크 오류만 throw
  await fetch(`${BASE}/api/auth/gbl-password/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function gblPasswordConfirm(token: string, password: string): Promise<void> {
  const res = await fetch(`${BASE}/api/auth/gbl-password/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "재설정 실패");
  }
}

// ── GBL 구글 로그인 ───────────────────────────────────────────────────
export async function gblGoogle(credential: string): Promise<StoredUser> {
  const res = await fetch(`${BASE}/api/auth/gbl-google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "구글 로그인 실패");
  }
  const data = await res.json();
  setToken(data.token);
  const user: StoredUser = {
    id: data.id ?? null,
    email: data.email,
    role: data.role,
    display_name: data.display_name ?? null,
    insight_operator_id: null,
  };
  setUser(user);
  return user;
}

// ── GBL 카카오 로그인 ─────────────────────────────────────────────────
export async function gblKakao(code: string, redirectUri: string): Promise<StoredUser> {
  const res = await fetch(`${BASE}/api/auth/gbl-kakao`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "카카오 로그인 실패");
  }
  const data = await res.json();
  setToken(data.token);
  const user: StoredUser = {
    id: data.id ?? null,
    email: data.email,
    role: data.role,
    display_name: data.display_name ?? null,
    insight_operator_id: null,
  };
  setUser(user);
  return user;
}

export function storeAuth(token: string, user: Partial<StoredUser>) {
  setToken(token);
  setUser({
    email: user.email || "",
    role: (user.role as StoredUser["role"]) || "super_admin",
    display_name: user.display_name ?? null,
    insight_operator_id: user.insight_operator_id ?? null,
  });
}

export function logout() {
  clearToken();
  if (typeof window !== "undefined") {
    const p = window.location.pathname;
    const onGbl = p === "/gbl" || p.startsWith("/gbl/");   // /gbl-admin(오너) 제외
    window.location.href = onGbl ? "/gbl/login" : "/login";
  }
}
