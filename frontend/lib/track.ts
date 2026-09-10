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

export type TrackEvent =
  | "pageview" | "share" | "download" | "install" | "installable"
  | "sim_run" | "pack_open" | "deck_build" | "counter_search"; // tcg 도구사용 이벤트

// label: share/download·도구 상세(예: "cp-table", "hand-sim", 팩 오픈 수, 덱 id) — 바이럴/사용 측정용
// site: "gbl"(기본, 하위호환) | "tcg" — 사이트별 비콘 엔드포인트·익명 토큰 분리
export function track(event: TrackEvent, path?: string, label?: string, site: "gbl" | "tcg" = "gbl") {
  if (typeof window === "undefined") return;
  if (getUser()?.role === "super_admin") return; // 관리자(오너) 본인 방문은 통계 제외
  let ref = "";
  if (event === "pageview") {
    // 설치형 실행(홈화면 PWA·데스크톱 PWA·Play스토어 TWA)은 referrer가 비어 '직접'과 섞임 →
    // display-mode/standalone 신호로 감지해 "(앱)"으로 별도 태깅(직접 링크 방문과 구분).
    const asApp =
      (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
      (navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.startsWith("android-app://");
    if (asApp) ref = "(앱)";
    else if (document.referrer) {
      try { const h = new URL(document.referrer).host; if (h && h !== location.host) ref = h; } catch { /* noop */ }
    }
  }
  const body = JSON.stringify({
    event,
    visitor: tok(site === "tcg" ? "tcgv" : "gblv", localStorage),
    session: tok(site === "tcg" ? "tcgs" : "gbls", sessionStorage),
    path: (path || location.pathname).slice(0, 200),
    ref,
    label: label ? label.slice(0, 60) : undefined,
  });
  try {
    const url = `${BASE}/api/${site}/track`;
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    else fetch(url, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch { /* noop */ }
}
