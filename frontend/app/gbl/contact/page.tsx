// 문의(Contact) — 서버렌더 SEO(신뢰 페이지, AdSense 권장).
import Link from "next/link";
import type { Metadata } from "next";

const CONTACT = "support@maesil-insight.com";

export const metadata: Metadata = {
  title: "문의하기 | GBL Note",
  description: "GBL Note 관련 문의, 오류 제보, 기능 제안, 데이터 삭제 요청은 이메일로 연락해 주세요.",
  alternates: { canonical: "/gbl/contact" },
  openGraph: { title: "GBL Note 문의", description: "문의·오류 제보·기능 제안", url: "/gbl/contact", images: ["/gbl-og.png"], type: "website" },
};

const P: React.CSSProperties = { margin: "0 0 1rem", fontSize: "0.92rem", color: "#334155", lineHeight: 1.85 };

export default function Contact() {
  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.6rem 1rem 4rem" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link href="/gbl" style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
        <h1 style={{ margin: "0.4rem 0 0.6rem", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>문의하기</h1>

        <p style={P}>
          GBL Note 이용 중 궁금한 점, 오류 제보, 기능 제안, 계정·데이터 삭제 요청 등은 아래 이메일로 보내주세요.
          확인 후 순차적으로 답변드립니다.
        </p>

        <div style={{ background: "#ffffff", border: "1px solid #e3e8f2", borderRadius: 12, padding: "1rem 1.1rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 4 }}>이메일</div>
          <a href={`mailto:${CONTACT}`} style={{ fontSize: "1.05rem", fontWeight: 700, color: "#3b5bdb", textDecoration: "none" }}>{CONTACT}</a>
        </div>

        <p style={P}>
          문의하실 때 다음을 함께 적어주시면 더 빠르게 도와드릴 수 있습니다: 사용 중인 기기(안드로이드/아이폰), 접속 주소,
          문제가 발생한 화면과 상황. 오류 제보는 캡처 이미지가 있으면 좋습니다.
        </p>
        <p style={P}>
          개인정보 처리에 관한 사항은{" "}
          <Link href="/gbl/privacy" style={{ color: "#3b5bdb", fontWeight: 600 }}>개인정보처리방침</Link>을 참고해 주세요.
        </p>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href="/gbl/about" style={{ color: "#64748b", textDecoration: "none" }}>소개</Link> ·{" "}
          <Link href="/gbl/guide" style={{ color: "#64748b", textDecoration: "none" }}>가이드</Link> ·{" "}
          <Link href="/gbl/privacy" style={{ color: "#64748b", textDecoration: "none" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
