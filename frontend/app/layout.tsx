import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import ClientLayout from "./ClientLayout";
import { locales, defaultLocale } from "../lib/i18n";

export const metadata: Metadata = {
  title: "maesil-agency",
  description: "AI 비서 팀 오케스트레이션 콘솔",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // <html lang> — 루트 레이아웃은 [lang] params를 못 받으므로 middleware가 넣어준 x-locale 헤더로 결정(en/ja/zh-TW 페이지가 lang="ko"로 나가던 문제).
  const hl = headers().get("x-locale") || "";
  const lang = (locales as readonly string[]).includes(hl) ? hl : defaultLocale;
  return (
    <html lang={lang}>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
