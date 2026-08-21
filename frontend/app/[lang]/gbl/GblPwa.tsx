"use client";

import { useEffect } from "react";

// 서비스워커 등록(설치 가능 요건). 캐시 없는 passthrough라 안전.
export default function GblPwa() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* noop */ });
    }
  }, []);
  return null;
}
