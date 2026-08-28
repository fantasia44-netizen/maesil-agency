import type { Metadata } from "next";

// 로그인/회원 전용 화면 — 공개 콘텐츠 아니므로 색인 제외(SEO는 공개 메타·티어·게시판이 담당).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function GblNoIndexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
