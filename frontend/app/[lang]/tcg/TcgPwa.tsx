"use client";

import { useEffect } from "react";
import { track } from "../../../lib/track";

// tcgnote PWA — gbl과 동일 구조. 서비스워커 등록(설치 가능 요건, 캐시 없는 passthrough)
// + 설치 지표: installable(설치 가능 노출=분모, 세션당 1회) · install(실제 설치=분자). site="tcg"로 tcg_visits에 적재.
export default function TcgPwa() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* noop */ });
    }
    const onInstallable = () => {
      try {
        if (sessionStorage.getItem("tcg_installable")) return;
        sessionStorage.setItem("tcg_installable", "1");
      } catch { /* 저장 실패해도 1회 전송 */ }
      track("installable", undefined, undefined, "tcg");
    };
    const onInstalled = () => track("install", undefined, undefined, "tcg");
    window.addEventListener("beforeinstallprompt", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
