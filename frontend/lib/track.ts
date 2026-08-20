// GBL 자체 방문/이벤트 트래킹(익명). 방문자/세션 토큰은 로컬 저장, PII 없음.
import { getUser } from "./api";
const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function tok(key: string, store: Storage): string {
  try {
    let v = store.getItem(key);
    if (!v) { v = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); store.setItem(key, v); }
    return v;
  } catch { return "anon"; }
}

export function track(event: "pageview" | "share" | "download", path?: string) {
  if (typeof window === "undefined") return;
  if (getUser()?.role === "super_admin") return; // 관리자(오너) 본인 방문은 통계 제외
  let ref = "";
  if (event === "pageview" && document.referrer) {
    try { const h = new URL(document.referrer).host; if (h && h !== location.host) ref = h; } catch { /* noop */ }
  }
  const body = JSON.stringify({
    event,
    visitor: tok("gblv", localStorage),
    session: tok("gbls", sessionStorage),
    path: (path || location.pathname).slice(0, 200),
    ref,
  });
  try {
    const url = `${BASE}/api/gbl/track`;
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    else fetch(url, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch { /* noop */ }
}
