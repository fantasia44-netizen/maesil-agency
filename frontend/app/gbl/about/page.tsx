// GBL Note 소개 — 서버렌더 SEO(신뢰 페이지, AdSense 권장).
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GBL Note 소개 — 포켓몬고 배틀 상대 기록 & 실측 메타",
  description: "GBL Note는 포켓몬 GO 배틀리그에서 만난 상대를 기록하고, 실제 유저 데이터로 리그 메타를 보여주는 무료 한국어 서비스입니다.",
  alternates: { canonical: "/gbl/about" },
  openGraph: { title: "GBL Note 소개", description: "포켓몬고 배틀 상대 기록 & 실측 메타", url: "/gbl/about", images: ["/gbl-og.png"], type: "website" },
};

const P: React.CSSProperties = { margin: "0 0 1rem", fontSize: "0.92rem", color: "#334155", lineHeight: 1.85 };
const H2: React.CSSProperties = { fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: "1.6rem 0 0.5rem" };

export default function About() {
  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.6rem 1rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/gbl" style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
        <h1 style={{ margin: "0.4rem 0 0.6rem", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>GBL Note 소개</h1>

        <p style={P}>
          GBL Note는 포켓몬 GO의 배틀리그(GBL·Go Battle League)를 즐기는 한국 트레이너를 위한 <b>무료 서비스</b>입니다.
          배틀에서 만난 상대를 기록해두고, 다시 만났을 때 상대의 과거 파티와 기술을 몇 초 안에 확인할 수 있게 돕습니다.
        </p>

        <h2 style={H2}>무엇을 할 수 있나요</h2>
        <p style={P}>
          <b>상대 기록</b> — 방금 만난 상대의 트레이너 이름, 사용 포켓몬 3마리, 기술, 메모를 남길 수 있습니다.
          다음에 같은 상대를 만나면 이름 몇 글자만 검색해 과거 기록을 즉시 불러옵니다.
        </p>
        <p style={P}>
          <b>내 전적</b> — 리그별 승패와 승률, 일자별 전적, 상대 덱별 전적을 한눈에 봅니다.
        </p>
        <p style={P}>
          <b>실측 메타 · 티어표</b> — 로그인 없이도 볼 수 있는 공개 데이터입니다. 사용자들이 실제로 만난 상대를 익명 집계해
          지금 리그에서 무엇을 많이 만나는지(실측 픽률), 어떤 포켓몬이 강한지(티어표), 각 포켓몬의 카운터를 제공합니다.
        </p>

        <h2 style={H2}>데이터는 어떻게 만들어지나요</h2>
        <p style={P}>
          실측 메타는 GBL Note 사용자들이 남긴 대전 기록에서 <b>개인 식별정보를 제거한 익명 통계</b>로만 집계합니다.
          티어와 추천 기술배치는 공개 전투 시뮬레이션 데이터를 기반으로 하며, 여기에 한국 서버의 실측 픽률을 함께 제공하는 것이
          GBL Note의 특징입니다. 이론상 강한 포켓몬과 실제로 많이 만나는 포켓몬을 함께 볼 수 있습니다.
        </p>

        <h2 style={H2}>이용 안내</h2>
        <p style={P}>
          기록 기능은 무료이며, 서비스 운영을 위해 광고가 포함될 수 있습니다. GBL Note는 팬이 만든 비영리성 도구로,
          Niantic 및 The Pokémon Company와 제휴 관계가 아닙니다. 문의는{" "}
          <Link href="/gbl/contact" style={{ color: "#3b5bdb", fontWeight: 600 }}>문의 페이지</Link>를 이용해 주세요.
        </p>

        <div style={{ marginTop: 20, fontSize: "0.86rem" }}>
          <Link href="/gbl/login" style={{ color: "#3b5bdb", fontWeight: 700 }}>무료로 시작하기 →</Link>
        </div>
        <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href="/gbl/guide" style={{ color: "#64748b", textDecoration: "none" }}>가이드</Link> ·{" "}
          <Link href="/gbl/contact" style={{ color: "#64748b", textDecoration: "none" }}>문의</Link> ·{" "}
          <Link href="/gbl/privacy" style={{ color: "#64748b", textDecoration: "none" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
