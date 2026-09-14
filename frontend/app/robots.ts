import type { MetadataRoute } from "next";
import { headers } from "next/headers";

// 호스트별 robots — gblnote.com / tcgnote.net 각자 자기 사이트맵을 가리킴(같은 배포, 도메인 분리).
// 공개 크롤 허용. 인증 경로(/gbl/app 등)는 로그인 게이트라 색인 안 됨.
export default function robots(): MetadataRoute.Robots {
  const host = (headers().get("host") || "").toLowerCase();
  const isTcg = host.includes("tcgnote");
  const site = isTcg ? "https://tcgnote.net" : "https://gblnote.com";
  // tcgnote: AdSense 승인 전엔 카드 상세 3,879장을 심사 크롤러(Mediapartners-Google) 시야에서 제외.
  // noindex는 검색봇용이라 AdSense 크롤러엔 효력이 없음 → robots로 직접 차단. 승인 후 NEXT_PUBLIC_TCG_INDEX_CARDS=1 이면 자동 해제.
  const cardsOpen = process.env.NEXT_PUBLIC_TCG_INDEX_CARDS === "1";
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "Yeti", allow: "/" }, // 네이버 검색로봇 명시 허용
      ...(isTcg && !cardsOpen ? [{ userAgent: "Mediapartners-Google", disallow: ["/tcg/cards/", "/en/tcg/cards/", "/ja/tcg/cards/", "/zh-TW/tcg/cards/"] }] : []),
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
