// GBL Note — 최소 서비스워커.
// 설치 가능(PWA install prompt) 요건만 충족하고 캐시는 하지 않는다 →
// 배포 즉시 항상 최신 버전이 뜬다(스테일 캐시 문제 없음).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => { /* network passthrough */ });
