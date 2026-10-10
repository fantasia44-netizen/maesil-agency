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
// 검색·AI 크롤러 UA(프리페치 차단 대상). 사람 브라우저는 여기 안 걸림.
const BOT_UA = /Googlebot|bingbot|Yeti|Yandex|DuckDuckBot|Baiduspider|Applebot|GPTBot|ClaudeBot|PerplexityBot|Mediapartners-Google|AdsBot-Google/i;

// 루트 app/layout.tsx가 <html lang>을 로케일별로 찍도록 요청 헤더로 로케일 전달(App Router 루트 레이아웃은 [lang] params를 못 받음).
function withLocale(req: NextRequest, lang: string) {
  const h = new Headers(req.headers);
  h.set("x-locale", lang);
  return { request: { headers: h } };
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 정적 리소스·파일은 통과
  if (pathname.startsWith("/_next") || pathname.includes(".")) return NextResponse.next();

  // 임시 진단(2026-10-11) — 싱가포르에서 오는 자동 접속의 정체 확인용. GA4에 하루 50~118명으로 잡히고 영어 기술 페이지를 1회씩 훑는데,
  // 자체 통계에는 UA·IP가 없어 무엇인지 알 수 없다. 문서 요청만 서버 로그에 한 줄 남긴다(IP는 끝자리 가림). 정체를 확인하면 이 블록을 지운다.
  if (req.headers.get("cf-ipcountry") === "SG" && !req.headers.has("next-url")) {
    const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "").split(",")[0].trim().replace(/\.\d+$/, ".x");
    console.log("[sg-visit]", JSON.stringify({ path: pathname, ua: req.headers.get("user-agent") || "", ip, ref: req.headers.get("referer") || "", lang: req.headers.get("accept-language") || "" }));
  }
  // 진단용 헤더 확인 — 이 UA로 한 번 호출하면 서버가 받는 헤더 이름을 로그에 남긴다(국가 헤더가 실제로 오는지 확인).
  if ((req.headers.get("user-agent") || "") === "gblnote-diag") console.log("[diag-headers]", [...req.headers.keys()].join(","));

  // 검색봇의 RSC 프리페치(?_rsc=, Next-Router-Prefetch: 1)는 빈 응답 — 크롤 예산 보호.
  // 구글봇 렌더러가 페이지의 <Link>(티어표 139개 등)마다 프리페치를 쏴 GSC 크롤의 70%가 'text/x-component'(다른 파일 형식)로 소모됨.
  // 사람 브라우저는 UA가 안 맞아 그대로 프리페치. 봇은 실제 HTML 내비게이션에만 예산을 쓰게 됨.
  // 판정: ?_rsc= 쿼리(모든 RSC 요청에 붙음) 또는 프리페치 헤더. 봇은 클라이언트 내비게이션을 하지 않으므로 RSC 응답 자체가 불필요.
  // ⚠️ Next는 미들웨어에 오기 전에 `?_rsc=`·`RSC`·`Next-Router-Prefetch` 헤더를 벗겨냄(실측) — 남는 건 클라이언트 라우터가 붙이는 `Next-Url`뿐.
  // 첫 HTML 요청엔 Next-Url이 없고, 페이지 로드 후 라우터가 쏘는 RSC 프리페치/내비게이션에만 있음 → 이걸 RSC 판정에 사용.
  const isRsc = req.headers.has("next-url") || req.headers.get("purpose") === "prefetch";
  if (isRsc && BOT_UA.test(req.headers.get("user-agent") || "")) {
    return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store", "x-bot-rsc": "skipped" } });
  }

  const host = (req.headers.get("host") || "").toLowerCase();
  // 옛 주소(gbl.maesil.net) → gblnote.com 301. 초기 이용자들이 옛 주소를 그대로 쓰는데, 그 호스트는 애드센스 미승인이라 광고가 안 나감(페이지뷰의 4%).
  // 경로·쿼리 유지. 로그인 토큰은 브라우저 저장소(주소별)라 옮겨 온 이용자는 한 번 다시 로그인해야 함(기록은 서버에 있어 그대로).
  if (host === "gbl.maesil.net") return NextResponse.redirect(new URL((pathname === "/" ? "/gbl" : pathname) + req.nextUrl.search, "https://gblnote.com"), 301);
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
    if (isSectionSeg(restSeg)) {
      // gblnote 호스트로 들어온 /<lang>/tcg/* → tcgnote.net 301 (크로스호스트 중복 색인 방지)
      if (hostSection === "gbl" && restSeg === "tcg") return NextResponse.redirect(new URL(pathname + req.nextUrl.search, "https://tcgnote.net"), 301);
      return NextResponse.next(withLocale(req, seg1));
    }
    const url = req.nextUrl.clone();
    url.pathname = `/${seg1}/${hostSection || "gbl"}`;
    return NextResponse.redirect(url, 301);
  }

  // /<section>/* (ko 기본, 프리픽스 없음) → 내부 rewrite /ko/<section>/* (URL 유지)
  if (isSectionSeg(seg1)) {
    // gblnote 호스트로 들어온 /tcg/* → tcgnote.net 301 (TCG는 tcgnote 도메인에서만 서빙·색인)
    if (hostSection === "gbl" && seg1 === "tcg") return NextResponse.redirect(new URL(pathname + req.nextUrl.search, "https://tcgnote.net"), 301);
    const url = req.nextUrl.clone();
    url.pathname = `/ko${pathname}`;
    return NextResponse.rewrite(url, withLocale(req, "ko"));
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
