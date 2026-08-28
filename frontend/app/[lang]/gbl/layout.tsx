import type { Metadata, Viewport } from "next";
import Script from "next/script";
import GblPwa from "./GblPwa";
import Tracker from "./Tracker";
import GblNav from "./GblNav";
import EventPopupAuto from "./EventPopupAuto";
import { locales, localeMeta, isLocale, defaultLocale } from "../../../lib/i18n";
import { getDict } from "./dictionaries";
import JsonLd from "./JsonLd";

const SITE = "https://gblnote.com";

// 로케일별 정적 생성 (ko/en/ja/zh-TW) — 하위 [league]/[type]/[id] generateStaticParams와 조합됨.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

// ko 기본 로케일은 미들웨어가 /gbl/* → /ko/gbl/* 로 rewrite하는데, rewrite 대상이
// 정적/ISR 프리렌더 페이지면 Next가 본문 없는 셸(콘텐츠·h1 누락)을 서빙하는 문제가 있다.
// (프리픽스 로케일 en/ja/zh-TW는 rewrite 없이 pass-through라 정상.) 레이아웃에 force-dynamic을
// 두어 하위 전 gbl 페이지를 요청 시 SSR → rewrite 경로에서도 본문이 완전히 렌더된다.
// 트래픽 부하는 Cloudflare 엣지 캐시로 완화(정적 콘텐츠라 URL당 캐시 가능).
export const dynamic = "force-dynamic";

// AdSense 클라이언트(ca-pub-…). Render env NEXT_PUBLIC_ADSENSE_CLIENT 설정 시 연결 코드 노출.
const ADS_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";
// Google Analytics 4 측정 ID(G-…). NEXT_PUBLIC_GA_ID 설정 시 방문자 분석 활성.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
// 네이버 서치어드바이저 소유권 확인 값. NEXT_PUBLIC_NAVER_VERIFY 설정 시 메타태그 노출.
const NAVER_VERIFY = process.env.NEXT_PUBLIC_NAVER_VERIFY || "";

// /gbl/* 로케일별 메타데이터 — PWA·앱아이콘 + 로케일별 title/description/OG + og:locale.
// (hreflang은 페이지별로 번역 완료 시 각 page의 generateMetadata에서 추가)
export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const lang = isLocale(params.lang) ? params.lang : defaultLocale;
  const m = getDict(lang).meta;
  return {
    metadataBase: new URL("https://gblnote.com"),
    title: m.title,
    description: m.description,
    manifest: "/gbl-manifest.json",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "GBL Note" },
    icons: { apple: "/gbl-icon.png", icon: "/gbl-icon.png", shortcut: "/gbl-icon.png" },
    openGraph: {
      title: m.ogTitle,
      description: m.ogDescription,
      url: "https://gblnote.com",
      siteName: "GBL Note",
      images: [{ url: "/gbl-og.png", width: 1200, height: 630, alt: "GBL Note" }],
      type: "website",
      locale: localeMeta[lang].ogLocale,
    },
    twitter: {
      card: "summary_large_image",
      title: m.ogTitle,
      description: m.ogDescription,
      images: ["/gbl-og.png"],
    },
    other: {
      ...(ADS_CLIENT ? { "google-adsense-account": ADS_CLIENT } : {}),
      ...(NAVER_VERIFY ? { "naver-site-verification": NAVER_VERIFY } : {}),
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
};

export default function GblLayout({ children, params }: { children: React.ReactNode; params: { lang: string } }) {
  // 루트 app/layout.tsx의 <html lang>은 App Router 구조상 [lang]을 못 받아 항상 "ko".
  // 정적생성을 유지하려 루트를 dynamic화하지 않고, 여기서 로케일별 htmlLang을 조기 주입.
  const lang = isLocale(params.lang) ? params.lang : defaultLocale;
  const htmlLang = localeMeta[lang].htmlLang;
  // 사이트 전역 구조화 데이터 — WebSite + Organization(발행처). 전 gbl 페이지에 노출.
  const siteJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "GBL Note", inLanguage: htmlLang, publisher: { "@id": `${SITE}/#org` } },
      { "@type": "Organization", "@id": `${SITE}/#org`, name: "GBL Note", url: SITE, logo: { "@type": "ImageObject", url: `${SITE}/gbl-icon.png` } },
    ],
  };
  return (
    <>
      <JsonLd data={siteJsonLd} />
      {/* 값은 localeMeta(정적)에서만 옴 — 사용자 입력 아님. 파싱 시점에 즉시 실행되어 조기 반영. */}
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=${JSON.stringify(htmlLang)}` }} />
      <GblPwa />
      <Tracker />
      <EventPopupAuto lang={params.lang} />
      <GblNav />
      {ADS_CLIENT && (
        <Script
          id="adsbygoogle-loader"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`}
          crossOrigin="anonymous"
          data-adsense="1"
        />
      )}
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}</Script>
        </>
      )}
      {children}
    </>
  );
}
