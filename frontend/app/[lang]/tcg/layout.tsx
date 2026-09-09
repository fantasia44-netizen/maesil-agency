import type { Metadata, Viewport } from "next";
import Script from "next/script";
import TcgNav from "./TcgNav";
import { locales, localeMeta, isLocale, defaultLocale } from "../../../lib/i18n";
import { getTcg } from "./dict";

const SITE = "https://tcgnote.net";

// 로케일별 정적 생성 (ko/en/ja/zh-TW)
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

// gbl과 동일 이유 — ko 기본 로케일이 /tcg → /ko/tcg 로 rewrite되며, 정적/ISR 프리렌더면
// 본문 없는 셸을 서빙하는 문제 회피 위해 하위 전 페이지를 요청 시 SSR.
export const dynamic = "force-dynamic";

// TCG 전용 트래킹 env(도메인 분리) — gbl과 다른 AdSense/GA를 붙일 수 있게 별도 키.
// 미설정 시 아무 코드도 노출 안 함(도메인 준비 전 안전).
const ADS_CLIENT = process.env.NEXT_PUBLIC_TCG_ADSENSE_CLIENT || "";
const GA_ID = process.env.NEXT_PUBLIC_TCG_GA_ID || "";
const NAVER_VERIFY = process.env.NEXT_PUBLIC_TCG_NAVER_VERIFY || "";

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const lang = isLocale(params.lang) ? params.lang : defaultLocale;
  const m = getTcg(lang).meta;
  return {
    metadataBase: new URL(SITE),
    title: m.title,
    description: m.description,
    icons: { icon: "/tcg-icon.png", apple: "/tcg-icon.png", shortcut: "/tcg-icon.png" },
    openGraph: {
      title: m.ogTitle,
      description: m.ogDescription,
      url: SITE,
      siteName: "TCG Note",
      images: [{ url: "/tcg-og.png", width: 1200, height: 630, alt: "TCG Note" }],
      type: "website",
      locale: localeMeta[lang].ogLocale,
    },
    twitter: { card: "summary_large_image", title: m.ogTitle, description: m.ogDescription, images: ["/tcg-og.png"] },
    other: {
      ...(ADS_CLIENT ? { "google-adsense-account": ADS_CLIENT } : {}),
      ...(NAVER_VERIFY ? { "naver-site-verification": NAVER_VERIFY } : {}),
    },
  };
}

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function TcgLayout({ children, params }: { children: React.ReactNode; params: { lang: string } }) {
  const lang = isLocale(params.lang) ? params.lang : defaultLocale;
  const htmlLang = localeMeta[lang].htmlLang;
  const siteJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "TCG Note", inLanguage: htmlLang, publisher: { "@id": `${SITE}/#org` } },
      { "@type": "Organization", "@id": `${SITE}/#org`, name: "TCG Note", url: SITE, logo: { "@type": "ImageObject", url: `${SITE}/tcg-icon.png` } },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }} />
      {/* htmlLang 조기 주입 — 루트 layout의 <html lang>이 [lang]을 못 받아 "ko" 고정이라 로케일별 교정 */}
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=${JSON.stringify(htmlLang)}` }} />
      <TcgNav />
      {ADS_CLIENT && (
        <Script id="adsbygoogle-loader" async strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CLIENT}`}
          crossOrigin="anonymous" data-adsense="1" />
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
