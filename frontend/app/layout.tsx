import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "maesil-agency",
  description: "AI 비서 팀 오케스트레이션 콘솔",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="app-header">
          <div className="brand">maesil-agency</div>
          <nav>
            <Link href="/">대시보드</Link>
            <Link href="/chat">대화</Link>
            <Link href="/settings">설정</Link>
          </nav>
        </header>
        <main className="app-main">{children}</main>
      </body>
    </html>
  );
}
