import type { Metadata, Viewport } from "next";
import Script from "next/script";
import GblPwa from "./GblPwa";

// AdSense 클라이언트(ca-pub-…). Render env NEXT_PUBLIC_ADSENSE_CLIENT 설정 시 연결 코드 노출.
const ADS_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";

// /gbl/* 전용 메타데이터 — PWA 매니페스트·앱 아이콘·iOS 설치 + OG 공유 이미지.
export const metadata: Metadata = {
  metadataBase: new URL("https://gblnote.com"),
  title: "GBL Note — 포켓몬GO 배틀리그 실측 메타",
  description: "상대 기록 · 내 전적 · 실전 픽업률 · 덱 통계. 한국 유저 실제 데이터 기반 GBL 노트.",
  manifest: "/gbl-manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "GBL Note" },
  icons: { apple: "/icons/apple-touch-icon.png", icon: "/icons/gbl-192.png" },
  openGraph: {
    title: "GBL Note — 포켓몬GO 배틀리그 실측 메타",
    description: "상대 기록 · 실전 픽업률 · 덱 통계. 한국 유저 실제 데이터 기반.",
    url: "https://gblnote.com",
    siteName: "GBL Note",
    images: [{ url: "/gbl-og.png", width: 1200, height: 630, alt: "GBL Note" }],
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "GBL Note — 포켓몬GO 배틀리그 실측 메타",
    description: "상대 기록 · 실전 픽업률 · 덱 통계. 한국 유저 실제 데이터 기반.",
    images: ["/gbl-og.png"],
  },
  // AdSense 사이트 소유권 확인용 메타태그(env 있을 때만)
  ...(ADS_CLIENT ? { other: { "google-adsense-account": ADS_CLIENT } } : {}),
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
      {children}
    </>
  );
}
