/** @type {import('next').NextConfig} */

// 보안 응답 헤더(전 경로). 리소스 로딩(광고/폰트/API)에 영향 없는 안전한 항목만 적용.
// CSP는 frame-ancestors/object-src/base-uri 등 리소스 비차단 지시자만 사용 —
// script/connect/img를 조이는 완전한 CSP는 AdSense/쿠팡/GSI 임베드 검증 후 별도 도입.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },                 // 클릭재킹(교차출처 iframe) 차단
  { key: "X-Content-Type-Options", value: "nosniff" },            // MIME 스니핑 차단
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
];

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
