import type { Metadata, Viewport } from "next";
import GblPwa from "./GblPwa";

// /gbl/* 전용 메타데이터 — PWA 매니페스트·앱 아이콘·iOS 설치 + OG 공유 이미지.
export const metadata: Metadata = {
  metadataBase: new URL("https://gbl.maesil.net"),
  title: "GBL Note — 포켓몬GO 배틀리그 실측 메타",
  description: "상대 기록 · 내 전적 · 실전 픽업률 · 덱 통계. 한국 유저 실제 데이터 기반 GBL 노트.",
  manifest: "/gbl-manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "GBL Note" },
  icons: { apple: "/icons/apple-touch-icon.png", icon: "/icons/gbl-192.png" },
  openGraph: {
    title: "GBL Note — 포켓몬GO 배틀리그 실측 메타",
    description: "상대 기록 · 실전 픽업률 · 덱 통계. 한국 유저 실제 데이터 기반.",
    url: "https://gbl.maesil.net",
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
      {children}
    </>
  );
}
