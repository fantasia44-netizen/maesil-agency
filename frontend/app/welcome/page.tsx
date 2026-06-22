"use client";

import Link from "next/link";

const BG   = "#0a0f1e";
const ACC  = "#3b82f6";
const LIME = "#a3e635";

function NavBar() {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(10,15,30,0.88)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto", padding: "1rem 1.5rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "#fff", letterSpacing: "-0.04em" }}>
          maesil<span style={{ color: ACC }}>-agency</span>
        </div>
        <nav style={{ display: "flex", gap: "2rem" }}>
          {["서비스", "프로세스", "도구"].map(t => (
            <a key={t} href={`#${t}`} style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.6)", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            >{t}</a>
          ))}
        </nav>
        <Link href="/login" style={{
          padding: "0.45rem 1.1rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700,
          color: "#0a0f1e", textDecoration: "none", background: LIME,
        }}>관리자 로그인</Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section style={{ maxWidth: 900, margin: "0 auto", padding: "7rem 1.5rem 5rem", textAlign: "center" }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: "0.72rem", fontWeight: 700, color: LIME,
        background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.25)",
        padding: "4px 12px", borderRadius: 20, marginBottom: "1.8rem", letterSpacing: "0.08em",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: LIME, display: "inline-block" }} />
        AI-POWERED BUSINESS AGENCY
      </div>

      <h1 style={{
        fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 900, lineHeight: 1.1,
        letterSpacing: "-0.04em", margin: "0 0 1.5rem", color: "#fff",
      }}>
        영업·CS·물류·회계<br />
        <span style={{ color: ACC }}>비즈니스 전 과정</span>을<br />
        AI 에이전트가 운영합니다
      </h1>

      <p style={{
        fontSize: "1.1rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.75,
        maxWidth: 600, margin: "0 auto",
      }}>
        국내 인플루언서 발굴부터 해외 바이어 개척, CS 자동화, 재고 관리, 매출 집계까지 —
        사람이 할 일을 에이전트가 대신합니다.
      </p>
    </section>
  );
}

type ServiceItem = { icon: string; label: string; items: string[] };

function ServiceCard({ icon, label, items }: ServiceItem) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: "2rem 1.8rem",
      transition: "border-color 0.2s",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
    >
      <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#fff", marginBottom: "1rem" }}>{label}</div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {items.map(it => (
          <li key={it} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.875rem", color: "rgba(255,255,255,0.55)" }}>
            <span style={{ color: LIME, flexShrink: 0, marginTop: 1 }}>↗</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProcessStep({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: "1.2rem" }}>
      <div style={{
        flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
        background: ACC, color: "#fff", fontWeight: 800, fontSize: "0.9rem",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{n}</div>
      <div style={{ paddingTop: 4 }}>
        <div style={{ fontWeight: 700, color: "#fff", fontSize: "1rem", marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.65 }}>{desc}</div>
      </div>
    </div>
  );
}

type ToolItem = { name: string; desc: string };

function ToolBadge({ name, desc }: ToolItem) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10, padding: "0.9rem 1.1rem",
    }}>
      <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#fff", marginBottom: 3 }}>{name}</div>
      <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>{desc}</div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: "inherit" }}>
      <NavBar />
      <Hero />

      {/* 서비스 */}
      <section id="서비스" style={{ maxWidth: 1100, margin: "0 auto", padding: "4rem 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: ACC, letterSpacing: "0.1em", marginBottom: "0.6rem" }}>SERVICES</div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff", margin: 0 }}>에이전트가 운영하는 비즈니스 영역</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          <ServiceCard icon="🇰🇷" label="국내영업" items={[
            "유튜버·블로거 AI 자동 발굴 (S~D 등급)",
            "채널 맞춤 콜드메일 생성 및 Gmail 발송",
            "무응답 시 자동 팔로업 (Cold Drip)",
            "리드 등급·상태 대시보드 관리",
          ]} />
          <ServiceCard icon="🌏" label="해외영업" items={[
            "브랜드 프로필 기반 현지어 키워드 번역",
            "EC21·TradeKey·Europages 바이어 스캔",
            "결과물 한글 번역 (원문·번역 나란히)",
            "발굴 바이어 → 이메일 아웃리치 연결",
          ]} />
          <ServiceCard icon="💬" label="CS 자동화" items={[
            "L1 키워드 즉시 응답 (비용 0)",
            "L2 스크립트 DB 기반 정형 응답",
            "L3 Claude Haiku 폴백 (미매칭 시)",
            "대화 이력·피드백 관리",
          ]} />
          <ServiceCard icon="📦" label="창고·물류" items={[
            "maesil-insight 생산 입고 연동",
            "채널별 출고 현황 실시간 조회",
            "SKU별 재고 자동 계산",
            "이상 재고 알림",
          ]} />
          <ServiceCard icon="💰" label="회계" items={[
            "구독 테넌트 MRR 자동 집계",
            "수동 수입·지출 항목 관리",
            "카테고리별 손익 요약",
            "기간별 순이익 추적",
          ]} />
          <ServiceCard icon="👁️" label="슈퍼어드민" items={[
            "전체 테넌트 현황 모니터링",
            "리드 수·발송량·MRR 집계",
            "계정 활성화·정지 제어",
            "사용자 전체 관리",
          ]} />
        </div>
      </section>

      {/* 프로세스 */}
      <section id="프로세스" style={{ maxWidth: 700, margin: "0 auto", padding: "4rem 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: ACC, letterSpacing: "0.1em", marginBottom: "0.6rem" }}>PROCESS</div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff", margin: 0 }}>에이전트 운영 방식</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <ProcessStep n={1} title="브랜드·타겟 설정" desc="브랜드 프로필과 국내·해외 타겟 키워드를 등록합니다. 국가·언어는 자동 매핑됩니다." />
          <ProcessStep n={2} title="AI 에이전트 자동 발굴" desc="매일 스케줄러가 국내 유튜버와 해외 B2B 바이어를 동시에 탐색하고 등급을 부여합니다." />
          <ProcessStep n={3} title="맞춤 메일 생성 및 발송" desc="리드별 분석을 기반으로 개인화된 메일을 생성하고 Gmail을 통해 직접 발송합니다." />
          <ProcessStep n={4} title="CS·물류·회계 연동 운영" desc="고객 문의는 3단계 CS 엔진이, 재고는 maesil-insight 연동이, 매출은 자동 집계가 처리합니다." />
          <ProcessStep n={5} title="대시보드에서 성과 확인" desc="슈퍼어드민 대시보드에서 전체 테넌트의 영업·운영 현황을 한 화면에서 관리합니다." />
        </div>
      </section>

      {/* 도구 */}
      <section id="도구" style={{ maxWidth: 1100, margin: "0 auto", padding: "4rem 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: ACC, letterSpacing: "0.1em", marginBottom: "0.6rem" }}>STACK</div>
          <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff", margin: 0 }}>운영에 사용하는 도구</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <ToolBadge name="Claude Haiku / Sonnet" desc="키워드 추출·번역·CS 응답·분석" />
          <ToolBadge name="Gmail API" desc="개인화 콜드메일 발송·팔로업" />
          <ToolBadge name="YouTube Data API" desc="국내 유튜버 스캔·채널 분석" />
          <ToolBadge name="EC21 · TradeKey" desc="해외 B2B 바이어 디렉토리 스캔" />
          <ToolBadge name="Europages · ExportHub" desc="유럽·글로벌 수입상 발굴" />
          <ToolBadge name="Supabase" desc="멀티테넌트 DB (agent_work 스키마)" />
          <ToolBadge name="FastAPI + Next.js" desc="백엔드 API · 프론트엔드 대시보드" />
          <ToolBadge name="Render (always-on)" desc="24/7 스케줄러·서버 운영" />
        </div>
      </section>

      {/* 하단 CTA */}
      <section style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "5rem 1.5rem", textAlign: "center",
      }}>
        <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff", margin: "0 0 1rem" }}>
          지금 관리자로 접속
        </h2>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.95rem", margin: "0 0 2rem" }}>
          에이전시 운영 현황을 대시보드에서 확인하세요
        </p>
        <Link href="/login" style={{
          display: "inline-block", padding: "0.9rem 2.5rem", borderRadius: 10,
          fontSize: "1rem", fontWeight: 800, color: BG, textDecoration: "none",
          background: LIME,
        }}>관리자 로그인 →</Link>
      </section>

      <footer style={{ textAlign: "center", padding: "2rem 1.5rem", color: "rgba(255,255,255,0.2)", fontSize: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        © 2025 maesil-agency · AI 기반 비즈니스 자동화
      </footer>
    </div>
  );
}
