import { NextRequest, NextResponse } from "next/server";

// 호스트 기반 라우팅 + GBL 다국어(i18n) 로케일 라우팅.
// - 라우트 트리는 app/[lang]/gbl/* (lang=ko|en|ja).
// - 기본 로케일 ko는 프리픽스 없이 /gbl/* 로 노출 → 내부적으로 /ko/gbl/* 로 rewrite(URL 유지).
// - en/ja는 /en/gbl/*, /ja/gbl/* 로 그대로 노출.
// - gbl 경로 처리는 호스트 무관(로컬 dev + gblnote.com 모두 동작). 루트→/gbl 리다이렉트만 GBL 호스트 한정.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 정적 리소스·파일은 통과
  if (pathname.startsWith("/_next") || pathname.includes(".")) return NextResponse.next();

  const seg1 = pathname.split("/")[1];

  // /ko/gbl/* → 301 리다이렉트로 프리픽스 제거(기본 로케일 정규 URL = /gbl/*)
  if (seg1 === "ko") {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/gbl";
    return NextResponse.redirect(url, 301);
  }

  // /en/*, /ja/* — gbl 경로면 통과, 아니면 해당 로케일 gbl 랜딩으로
  if (seg1 === "en" || seg1 === "ja") {
    const rest = pathname.slice(seg1.length + 1);
    if (rest === "/gbl" || rest.startsWith("/gbl/")) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = `/${seg1}/gbl`;
    return NextResponse.redirect(url, 301);
  }

  // /gbl/* (ko 기본, 프리픽스 없음) → 내부 rewrite /ko/gbl/* (URL은 /gbl/* 유지)
  if (pathname === "/gbl" || pathname.startsWith("/gbl/")) {
    const url = req.nextUrl.clone();
    url.pathname = `/ko${pathname}`;
    return NextResponse.rewrite(url);
  }

  // 그 외 — GBL 전용 호스트: 구 루트 URL(/raid, /tier/... 등)을 /gbl 하위 해당 페이지로 301(SEO 보존).
  // 루트(/)만 랜딩 /gbl 으로. 그 외 호스트는 통과.
  const host = (req.headers.get("host") || "").toLowerCase();
  const isGblHost = host.startsWith("gbl.") || host === "gblnote.com" || host === "www.gblnote.com";
  if (isGblHost) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/gbl" : `/gbl${pathname}`;
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
