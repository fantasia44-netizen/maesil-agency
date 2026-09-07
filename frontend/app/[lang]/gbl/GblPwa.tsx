"use client";

import { useEffect } from "react";
import { track } from "../../../lib/track";

// 서비스워커 등록(설치 가능 요건). 캐시 없는 passthrough라 안전.
// + 앱 설치 지표: 설치 가능 노출(installable=분모)·실제 설치(install=분자) 이벤트 수집.
export default function GblPwa() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* noop */ });
    }
    // beforeinstallprompt: 브라우저가 설치 가능으로 판단(주로 Android Chrome) → 설치율 분모. 세션당 1회.
    const onInstallable = () => {
      try {
        if (sessionStorage.getItem("gbl_installable")) return;
        sessionStorage.setItem("gbl_installable", "1");
      } catch { /* 저장 실패해도 1회 전송 */ }
      track("installable");
    };
    // appinstalled: 실제 설치 완료 → 설치율 분자.
    const onInstalled = () => track("install");
    window.addEventListener("beforeinstallprompt", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}
