import type { Metadata, Viewport } from "next";
import Script from "next/script";
import GblPwa from "./GblPwa";
import Tracker from "./Tracker";
import LangSwitch from "./LangSwitch";
import { locales, localeMeta, isLocale, defaultLocale } from "../../../lib/i18n";
import { getDict } from "./dictionaries";

// 로케일별 정적 생성 (ko/en/ja) — 하위 [league]/[type]/[id] generateStaticParams와 조합됨.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

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

export default function GblLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GblPwa />
      <Tracker />
      <LangSwitch />
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
