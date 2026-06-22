"use client";

import Link from "next/link";

const ACCENT = "#0f172a";
const GREEN  = "#16a34a";

function NavBar() {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)",
      borderBottom: "1px solid #e2e8f0",
    }}>
      <div style={{
        maxWidth: 1080, margin: "0 auto", padding: "0.9rem 1.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.03em", color: ACCENT }}>
          maesil-agency
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/login" style={{
            padding: "0.45rem 1rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600,
            color: "#475569", textDecoration: "none", border: "1px solid #e2e8f0", background: "#fff",
          }}>로그인</Link>
          <Link href="/signup" style={{
            padding: "0.45rem 1rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700,
            color: "#fff", textDecoration: "none", background: ACCENT,
          }}>무료 시작</Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section style={{
      maxWidth: 820, margin: "0 auto", padding: "5rem 1.5rem 3.5rem", textAlign: "center",
    }}>
      <div style={{
        display: "inline-block", fontSize: "0.75rem", fontWeight: 700, color: GREEN,
        background: "#dcfce7", padding: "4px 12px", borderRadius: 20, marginBottom: "1.4rem",
        letterSpacing: "0.04em",
      }}>
        AI 기반 B2B 영업 자동화 플랫폼
      </div>

      <h1 style={{
        fontSize: "clamp(1.9rem, 4vw, 2.8rem)", fontWeight: 800, lineHeight: 1.2,
        letterSpacing: "-0.03em", margin: "0 0 1.2rem", color: ACCENT,
      }}>
        국내 인플루언서 발굴부터<br />
        <span style={{ color: GREEN }}>해외 바이어 개척</span>까지<br />
        영업을 AI가 대신합니다
      </h1>

      <p style={{
        fontSize: "1.05rem", color: "#475569", lineHeight: 1.75,
        maxWidth: 580, margin: "0 auto 2.2rem",
      }}>
        유튜버·블로거 cold drip부터 현지어 키워드로 해외 B2B 바이어를 발굴하는
        전과정을 하나의 플랫폼에서 자동화합니다.
      </p>

      <div style={{ display: "flex", gap: "0.7rem", justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/signup" style={{
          padding: "0.85rem 2rem", borderRadius: 10, fontSize: "1rem", fontWeight: 700,
          color: "#fff", textDecoration: "none", background: ACCENT,
          boxShadow: "0 4px 16px rgba(15,23,42,.2)",
        }}>무료로 시작하기 →</Link>
        <Link href="/login" style={{
          padding: "0.85rem 2rem", borderRadius: 10, fontSize: "1rem", fontWeight: 600,
          color: "#475569", textDecoration: "none", background: "#fff",
          border: "1px solid #e2e8f0",
        }}>로그인</Link>
      </div>
      <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.9rem" }}>
        신용카드 불필요 · 14일 무료 체험
      </div>
    </section>
  );
}

type FeatureCard = { icon: string; title: string; desc: string; tag?: string };

function Feature({ icon, title, desc, tag }: FeatureCard) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
      padding: "1.6rem 1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,.04)",
    }}>
      <div style={{ fontSize: "1.8rem", marginBottom: "0.7rem" }}>{icon}</div>
      {tag && (
        <span style={{
          fontSize: "0.7rem", fontWeight: 700, color: "#2563eb",
          background: "#eff6ff", padding: "2px 8px", borderRadius: 99,
          marginBottom: "0.5rem", display: "inline-block",
        }}>{tag}</span>
      )}
      <div style={{ fontWeight: 700, fontSize: "1rem", margin: "0.4rem 0 0.5rem", color: ACCENT }}>{title}</div>
      <div style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: 1.65 }}>{desc}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      textAlign: "center", fontSize: "1.5rem", fontWeight: 800,
      letterSpacing: "-0.02em", color: ACCENT, margin: "0 0 2rem",
    }}>{children}</h2>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "#f1f5f9", margin: "1rem 0" }} />;
}

export default function WelcomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: ACCENT, fontFamily: "inherit" }}>
      <NavBar />
      <Hero />

      {/* ── 국내영업 ── */}
      <section style={{ maxWidth: 1060, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.6rem",
          justifyContent: "center", marginBottom: "0.6rem",
        }}>
          <span style={{
            fontSize: "0.72rem", fontWeight: 700, color: "#7c3aed",
            background: "#f5f3ff", padding: "3px 10px", borderRadius: 20,
          }}>국내영업</span>
        </div>
        <SectionTitle>인플루언서 B2B 파트너십 자동화</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <Feature icon="🔍" tag="자동발굴" title="유튜버·블로거 AI 스캔" desc="매일 키워드로 유튜브·네이버를 탐색해 잠재 파트너를 S~D 등급으로 자동 분류합니다." />
          <Feature icon="✍️" tag="개인화" title="채널 맞춤 콜드메일" desc="최신 영상까지 분석해 '이 채널만을 위한' 제안 메일을 AI가 작성합니다." />
          <Feature icon="📧" tag="Gmail 연동" title="내 계정으로 직접 발송" desc="내 Gmail로 발송하여 도달률을 높이고 브랜드 발신 평판을 유지합니다." />
          <Feature icon="🔁" tag="자동화" title="팔로업·Cold Drip" desc="무응답 시 2·3차 팔로업과 SNS·카페 접촉 알림을 일정대로 자동 진행합니다." />
        </div>
      </section>

      <Divider />

      {/* ── 해외영업 ── */}
      <section style={{ maxWidth: 1060, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.6rem",
          justifyContent: "center", marginBottom: "0.6rem",
        }}>
          <span style={{
            fontSize: "0.72rem", fontWeight: 700, color: GREEN,
            background: "#dcfce7", padding: "3px 10px", borderRadius: 20,
          }}>해외영업</span>
        </div>
        <SectionTitle>현지어로 해외 바이어를 직접 발굴</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <Feature icon="🌏" tag="브랜드관리" title="현지어 키워드 자동 번역" desc="브랜드 프로필을 입력하면 Claude AI가 일본어·중국어·베트남어 등 24개국 언어로 검색 키워드를 번역합니다." />
          <Feature icon="🔎" tag="바이어발굴" title="EC21·TradeKey·Europages 스캔" desc="현지어 키워드로 글로벌 B2B 디렉토리를 탐색해 국가별 수입상·유통사를 자동 수집합니다." />
          <Feature icon="🇰🇷" tag="한글 정리" title="결과물 한글 번역" desc="발굴된 회사명·관심제품을 한국어로 번역해 원문과 함께 나란히 보여줍니다." />
          <Feature icon="💾" tag="연동" title="바이어 목록으로 즉시 저장" desc="발굴된 바이어를 한 클릭으로 영업 파이프라인에 추가하고 이메일 발송으로 연결합니다." />
        </div>
      </section>

      <Divider />

      {/* ── 운영 관리 ── */}
      <section style={{ maxWidth: 1060, margin: "0 auto", padding: "3rem 1.5rem" }}>
        <SectionTitle>영업 외 운영도 한 곳에서</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <Feature icon="💬" title="CS 자동화" desc="L1 키워드→L2 스크립트→L3 Claude Haiku 3단계로 고객 문의를 자동 처리합니다." />
          <Feature icon="📦" title="창고·물류" desc="maesil-insight 연동으로 생산 입고·출고 현황을 실시간으로 조회합니다." />
          <Feature icon="💰" title="회계" desc="구독 MRR과 수동 수입·지출 항목을 통합 관리합니다." />
          <Feature icon="👁️" title="슈퍼어드민" desc="모든 테넌트의 리드 수·발송량·MRR을 한 화면에서 모니터링하고 활성화·정지를 제어합니다." />
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        background: ACCENT, margin: "3rem 1.5rem",
        borderRadius: 20, padding: "3.5rem 2rem", textAlign: "center",
        maxWidth: 820, marginLeft: "auto", marginRight: "auto",
      }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", margin: "0 0 0.8rem" }}>
          지금 바로 시작해보세요
        </h2>
        <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: "0 0 1.8rem" }}>
          국내·해외 영업을 AI가 동시에 진행합니다
        </p>
        <div style={{ display: "flex", gap: "0.7rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/signup" style={{
            padding: "0.85rem 2rem", borderRadius: 10, fontSize: "1rem", fontWeight: 700,
            color: ACCENT, textDecoration: "none", background: "#fff",
          }}>무료로 시작하기 →</Link>
          <Link href="/login" style={{
            padding: "0.85rem 2rem", borderRadius: 10, fontSize: "1rem", fontWeight: 600,
            color: "#fff", textDecoration: "none", background: "transparent",
            border: "1px solid #334155",
          }}>로그인</Link>
        </div>
      </section>

      <footer style={{ textAlign: "center", padding: "2rem 1.5rem 3rem", color: "#94a3b8", fontSize: "0.78rem" }}>
        maesil-agency · AI 기반 국내·해외 영업 자동화
      </footer>
    </div>
  );
}
