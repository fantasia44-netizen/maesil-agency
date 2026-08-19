import type { Metadata } from "next";

// 로그인 전용 앱 화면 — 공개 콘텐츠 아니므로 색인 제외(SEO는 공개 메타·티어 페이지가 담당).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function GblAppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
