import type { Metadata, Viewport } from "next";
import GblPwa from "./GblPwa";

// /gbl/* 전용 메타데이터 — PWA 매니페스트·앱 아이콘·iOS 설치 지원.
export const metadata: Metadata = {
  title: "GBL Note",
  description: "포켓몬GO 배틀리그 상대를 기록하고 다시 만나면 5초 안에 저격",
  manifest: "/gbl-manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "GBL Note" },
  icons: { apple: "/icons/apple-touch-icon.png", icon: "/icons/gbl-192.png" },
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
