import type { MetadataRoute } from "next";

// 공개 크롤 허용 + 사이트맵 안내. 인증 경로(/gbl/app)는 로그인 게이트라 색인 안 됨.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://gblnote.com/sitemap.xml",
    host: "https://gblnote.com",
  };
}
