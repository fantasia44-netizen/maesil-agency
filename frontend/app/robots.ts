import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// 호스트별 robots — gblnote.com / tcgnote.net 각자 자기 사이트맵을 가리킴(같은 배포, 도메인 분리).
// 공개 크롤 허용. 인증 경로(/gbl/app 등)는 로그인 게이트라 색인 안 됨.
export default function robots(): MetadataRoute.Robots {
  const host = (headers().get("host") || "").toLowerCase();
  const site = host.includes("tcgnote") ? "https://tcgnote.net" : "https://gblnote.com";
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "Yeti", allow: "/" }, // 네이버 검색로봇 명시 허용
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
