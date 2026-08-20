import type { Metadata, Viewport } from "next";
import Script from "next/script";
import GblPwa from "./GblPwa";

// AdSense 클라이언트(ca-pub-…). Render env NEXT_PUBLIC_ADSENSE_CLIENT 설정 시 연결 코드 노출.
const ADS_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";
// Google Analytics 4 측정 ID(G-…). NEXT_PUBLIC_GA_ID 설정 시 방문자 분석 활성.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
// 네이버 서치어드바이저 소유권 확인 값. NEXT_PUBLIC_NAVER_VERIFY 설정 시 메타태그 노출.
const NAVER_VERIFY = process.env.NEXT_PUBLIC_NAVER_VERIFY || "";

// /gbl/* 전용 메타데이터 — PWA 매니페스트·앱 아이콘·iOS 설치 + OG 공유 이미지.
export const metadata: Metadata = {
  metadataBase: new URL("https://gblnote.com"),
  title: "GBL Note — 포켓몬GO 레이드·배틀·티어·CP 올인원 (한국어)",
  description: "포켓몬 GO 레이드 딜러 티어·보스 100% CP·레이드 일정, 배틀리그 티어·실측 메타, 내 전적 기록까지. 포켓몬고 한국어 종합 정보·도구.",
  manifest: "/gbl-manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "GBL Note" },
  icons: { apple: "/icons/apple-touch-icon.png", icon: "/icons/gbl-192.png" },
  openGraph: {
    title: "GBL Note — 포켓몬GO 올인원 한국어판",
    description: "레이드 딜러·보스 CP·레이드 일정 + 배틀 티어·실측 메타 + 내 전적. 포켓몬고 종합툴.",
    url: "https://gblnote.com",
    siteName: "GBL Note",
    images: [{ url: "/gbl-og.png", width: 1200, height: 630, alt: "GBL Note" }],
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "GBL Note — 포켓몬GO 올인원 한국어판",
    description: "레이드 딜러·보스 CP·일정 + 배틀 티어·실측 메타 + 내 전적. 포켓몬고 종합툴.",
    images: ["/gbl-og.png"],
  },
  // 검색엔진/애드센스 소유권 확인 메타태그(env 있는 것만)
  other: {
    ...(ADS_CLIENT ? { "google-adsense-account": ADS_CLIENT } : {}),
    ...(NAVER_VERIFY ? { "naver-site-verification": NAVER_VERIFY } : {}),
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
};

export default function GblLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GblPwa />
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
