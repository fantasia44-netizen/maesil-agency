// GBL 가이드 목록 — 서버렌더 SEO.
import Link from "next/link";
import type { Metadata } from "next";
import { GUIDES } from "./[slug]/page";

export const metadata: Metadata = {
  title: "포켓몬고 GBL 가이드 — 입문·리그·IV·파티 | GBL Note",
  description: "포켓몬 GO 배틀리그(GBL) 입문부터 리그별 CP 제한, 개체값(IV) 최적화, 파티 구성법까지. 초보자를 위한 한국어 가이드 모음.",
  keywords: ["포켓몬고 GBL 가이드", "배틀리그 입문", "포켓몬고 PVP 가이드", "GBL 하는법"],
  alternates: { canonical: "/gbl/guide" },
  openGraph: { title: "포켓몬고 GBL 가이드", description: "입문·리그·IV·파티 구성 한국어 가이드", url: "/gbl/guide", images: ["/gbl-og.png"], type: "website" },
};

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

export default function GuideIndex() {
  const list = Object.entries(GUIDES);
  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/gbl" style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
        <h1 style={{ margin: "0.4rem 0 0.2rem", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>포켓몬고 GBL 가이드</h1>
        <p style={{ margin: "0 0 1.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          포켓몬 GO 배틀리그(GBL)를 처음 시작하거나 승률을 올리고 싶은 분을 위한 한국어 가이드입니다. 기본기부터 파티 구성까지 차근차근 정리했습니다.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map(([slug, g]) => (
            <Link key={slug} href={`/gbl/guide/${slug}`}
              style={{ textDecoration: "none", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.9rem 1rem", display: "block" }}>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{g.title}</div>
              <div style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>{g.desc}</div>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 20, fontSize: "0.84rem", color: "#475569" }}>
          실전 데이터는 <Link href="/gbl/meta/master" style={{ color: "#3b5bdb", fontWeight: 600 }}>실측 메타</Link> ·{" "}
          <Link href="/gbl/tier/master" style={{ color: "#3b5bdb", fontWeight: 600 }}>티어표</Link>에서.
        </div>
        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href="/gbl/about" style={{ color: "#64748b", textDecoration: "none" }}>소개</Link> ·{" "}
          <Link href="/gbl/contact" style={{ color: "#64748b", textDecoration: "none" }}>문의</Link> ·{" "}
          <Link href="/gbl/privacy" style={{ color: "#64748b", textDecoration: "none" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
