"use client";

import Link from "next/link";

const GREEN = "#1A6F3C";

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #eef2f0", borderRadius: 14,
      padding: "1.5rem 1.4rem", boxShadow: "0 2px 14px rgba(0,0,0,.04)",
    }}>
      <div style={{ fontSize: "1.7rem" }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: "1.02rem", margin: "0.6rem 0 0.4rem", color: "#0f172a" }}>{title}</div>
      <div style={{ fontSize: "0.88rem", color: "#64748b", lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: "0.9rem", alignItems: "flex-start" }}>
      <div style={{
        flexShrink: 0, width: 30, height: 30, borderRadius: "50%",
        background: GREEN, color: "#fff", fontWeight: 700, fontSize: "0.85rem",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{n}</div>
      <div>
        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>{title}</div>
        <div style={{ fontSize: "0.86rem", color: "#64748b", marginTop: 2, lineHeight: 1.55 }}>{desc}</div>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f7faf8", color: "#0f172a" }}>
      {/* 상단 바 */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.5rem", maxWidth: 1080, margin: "0 auto",
      }}>
        <div style={{ fontWeight: 800, fontSize: "1.15rem", letterSpacing: "-0.02em" }}>
          🌿 매실 파트너스
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <Link href="/login" style={{
            padding: "0.5rem 1rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600,
            color: "#334155", textDecoration: "none", border: "1px solid #e2e8f0", background: "#fff",
          }}>로그인</Link>
          <Link href="/signup" style={{
            padding: "0.5rem 1.1rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700,
            color: "#fff", textDecoration: "none", background: GREEN,
          }}>무료로 시작</Link>
        </div>
      </header>

      {/* 히어로 */}
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "3.5rem 1.5rem 2.5rem", textAlign: "center" }}>
        <div style={{
          display: "inline-block", fontSize: "0.78rem", fontWeight: 700, color: GREEN,
          background: "#e7f4ec", padding: "5px 12px", borderRadius: 20, marginBottom: "1.2rem",
        }}>
          AI 인플루언서 영업 자동화 · 14일 무료
        </div>
        <h1 style={{ fontSize: "2.3rem", lineHeight: 1.25, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
          유튜버·블로거 발굴부터<br />맞춤 콜드메일 발송까지, <span style={{ color: GREEN }}>전부 자동</span>
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#475569", lineHeight: 1.7, margin: "1.2rem auto 0", maxWidth: 560 }}>
          AI가 매일 잠재 파트너를 찾아 등급을 매기고, 채널을 분석해 개인화된 제안 메일을
          <strong> 내 Gmail로 </strong>자동 발송합니다. 답장 없으면 팔로업까지 알아서.
        </p>
        <div style={{ display: "flex", gap: "0.7rem", justifyContent: "center", marginTop: "2rem", flexWrap: "wrap" }}>
          <Link href="/signup" style={{
            padding: "0.85rem 1.8rem", borderRadius: 10, fontSize: "1rem", fontWeight: 700,
            color: "#fff", textDecoration: "none", background: GREEN, boxShadow: "0 4px 16px rgba(26,111,60,.25)",
          }}>무료로 시작하기 →</Link>
          <Link href="/login" style={{
            padding: "0.85rem 1.8rem", borderRadius: 10, fontSize: "1rem", fontWeight: 600,
            color: "#334155", textDecoration: "none", background: "#fff", border: "1px solid #e2e8f0",
          }}>이미 계정이 있어요</Link>
        </div>
        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "1rem" }}>
          신용카드 불필요 · 14일 무료 체험
        </div>
      </section>

      {/* 기능 */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "1.5rem 1.5rem 1rem" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem",
        }}>
          <Feature icon="🔍" title="AI 자동 발굴" desc="유튜브·네이버에서 내 타겟 키워드로 매일 잠재 파트너를 찾아 등급(S~D)으로 분류합니다." />
          <Feature icon="✍️" title="채널 맞춤 콜드메일" desc="채널을 분석해 최신 영상까지 언급하는 개인화된 제안 메일을 자동 생성합니다." />
          <Feature icon="📧" title="내 Gmail로 발송" desc="내 Google 계정을 연결해 본인 메일함에서 발송 — 도달률↑, 발신 평판도 내 것." />
          <Feature icon="🔁" title="자동 팔로업" desc="답장이 없으면 2·3차 팔로업과 인스타·카페 접촉 알림까지 일정대로 진행합니다." />
        </div>
      </section>

      {/* 작동 방식 */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <h2 style={{ textAlign: "center", fontSize: "1.4rem", fontWeight: 800, marginBottom: "1.8rem" }}>
          3분 셋업, 그다음은 자동
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.3rem" }}>
          <Step n={1} title="가입하고 워크스페이스 생성" desc="이메일로 가입하면 나만의 영업 워크스페이스가 바로 만들어집니다." />
          <Step n={2} title="Gmail 연결 + 타겟 키워드 설정" desc="내 Google 계정을 연결하고, 찾고 싶은 채널 키워드를 입력합니다." />
          <Step n={3} title="자동 발굴·발송 시작" desc="매일 AI가 발굴·분석·발송·팔로업을 알아서. 대시보드에서 성과만 확인하세요." />
        </div>
        <div style={{ textAlign: "center", marginTop: "2.2rem" }}>
          <Link href="/signup" style={{
            padding: "0.85rem 2rem", borderRadius: 10, fontSize: "1rem", fontWeight: 700,
            color: "#fff", textDecoration: "none", background: GREEN,
          }}>지금 무료로 시작하기</Link>
        </div>
      </section>

      <footer style={{ textAlign: "center", padding: "2rem 1.5rem", color: "#94a3b8", fontSize: "0.8rem" }}>
        🌿 매실 파트너스 · 인플루언서 영업 자동화
      </footer>
    </div>
  );
}
