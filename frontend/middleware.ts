import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "./lib/i18n";

// 비기본 로케일 프리픽스(en/ja/zh-TW/…) — locales에서 파생해 언어 추가 시 자동 반영.
const NON_DEFAULT_LOCALES = locales.filter((l) => l !== defaultLocale);

// 사이트 섹션(게임별 라우트 트리) — 도메인 하나당 한 섹션. 새 게임 추가 시 여기에만 등록.
const SECTIONS = ["gbl", "tcg"] as const;
type Section = (typeof SECTIONS)[number];
const isSectionSeg = (s: string): s is Section => (SECTIONS as readonly string[]).includes(s);

// 호스트 → 섹션 매핑. 도메인별 분리(같은 배포, 도메인마다 자기 섹션).
function sectionForHost(host: string): Section | null {
  const h = host.toLowerCase();
  if (h.startsWith("gbl.") || h === "gblnote.com" || h === "www.gblnote.com") return "gbl";
  if (h.startsWith("tcg.") || h === "tcgnote.net" || h === "www.tcgnote.net") return "tcg";
  return null;
}

// 호스트 기반 라우팅 + 다국어(i18n) 로케일 라우팅. gbl/tcg 공통.
// - 라우트 트리는 app/[lang]/<section>/* (lang=ko|en|ja|zh-TW).
// - 기본 로케일 ko는 프리픽스 없이 /<section>/* 로 노출 → 내부 /ko/<section>/* 로 rewrite(URL 유지).
// - 그 외 로케일은 /<lang>/<section>/* 로 그대로 노출.
// - 섹션 경로 처리는 호스트 무관(로컬 dev 포함). 루트→섹션 랜딩 리다이렉트만 해당 도메인 한정.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 정적 리소스·파일은 통과
  if (pathname.startsWith("/_next") || pathname.includes(".")) return NextResponse.next();

  const host = (req.headers.get("host") || "").toLowerCase();
  const hostSection = sectionForHost(host);
  const seg1 = pathname.split("/")[1];

  // /ko/* → 301 리다이렉트로 프리픽스 제거(기본 로케일 정규 URL = /*)
  if (seg1 === "ko") {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || `/${hostSection || "gbl"}`;
    return NextResponse.redirect(url, 301);
  }

  // /en/*, /ja/*, /zh-TW/* 등 — 알려진 섹션 경로면 통과, 아니면 해당 로케일 섹션 랜딩으로
  if (NON_DEFAULT_LOCALES.includes(seg1 as (typeof NON_DEFAULT_LOCALES)[number])) {
    const rest = pathname.slice(seg1.length + 1);
    const restSeg = rest.split("/")[1] || "";
    if (isSectionSeg(restSeg)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = `/${seg1}/${hostSection || "gbl"}`;
    return NextResponse.redirect(url, 301);
  }

  // /<section>/* (ko 기본, 프리픽스 없음) → 내부 rewrite /ko/<section>/* (URL 유지)
  if (isSectionSeg(seg1)) {
    const url = req.nextUrl.clone();
    url.pathname = `/ko${pathname}`;
    return NextResponse.rewrite(url);
  }

  // 그 외 — 섹션 전용 호스트: 루트(/) 및 구 루트 URL을 해당 섹션 하위로 301(SEO 보존).
  if (hostSection) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? `/${hostSection}` : `/${hostSection}${pathname}`;
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
