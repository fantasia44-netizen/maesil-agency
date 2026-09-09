"use client";
// TCG Note(tcgnote.net) 관리 콘솔 — 에이전시 관리자 전용.
// 환경설정 상태 + 콘텐츠 구축 로드맵 + 라이브 사이트 바로가기. (트래픽 대시보드는 GA 연동 후 확장)
import Link from "next/link";
import { useEffect, useState } from "react";
import { isSuperAdmin } from "../../lib/api";

const ADS = process.env.NEXT_PUBLIC_TCG_ADSENSE_CLIENT || "";
const GA = process.env.NEXT_PUBLIC_TCG_GA_ID || "";
const NAVER = process.env.NEXT_PUBLIC_TCG_NAVER_VERIFY || "";

const CARD: React.CSSProperties = { background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "1rem 1.2rem" };
const H2: React.CSSProperties = { margin: "0 0 10px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" };

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", padding: "5px 0", borderTop: "1px solid #f9e8e8" }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: ok ? "#16a34a" : "#cbd5e1", flexShrink: 0 }} />
      <span style={{ minWidth: 150, color: "#475569", fontWeight: 600 }}>{label}</span>
      <span style={{ color: ok ? "#0f172a" : "#94a3b8" }}>{value}</span>
    </div>
  );
}

// 콘텐츠 로드맵 — AdSense 통과용 "작지만 완성된 사이트" 20페이지 계획. status로 진척 관리.
const ROADMAP: { section: string; items: { t: string; status: "done" | "wip" | "todo" }[] }[] = [
  { section: "기초 (셸)", items: [
    { t: "랜딩(4개국어)", status: "done" },
    { t: "레이아웃·내비·i18n", status: "done" },
    { t: "미들웨어 도메인 라우팅", status: "done" },
    { t: "정책 페이지(개인정보·약관·소개)", status: "done" },
    { t: "sitemap.xml · robots.txt(호스트별)", status: "done" },
  ] },
  { section: "깊이 백본 (원본 분석)", items: [
    { t: "덱 티어표(대회 승률 기반)", status: "done" },
    { t: "메타 환경 분석", status: "done" },
    { t: "대표 덱 심층 공략 ×10", status: "done" },
  ] },
  { section: "도구·가이드", items: [
    { t: "카드 검색 도구", status: "done" },
    { t: "덱 빌더", status: "todo" },
    { t: "팩 확률 분석(pullRates)", status: "todo" },
    { t: "초보/전략 가이드", status: "todo" },
  ] },
  { section: "데이터 파이프라인", items: [
    { t: "Limitless 대회 통계 인제스트(티어·매치업)", status: "done" },
    { t: "카드 데이터셋 인제스트(전 세트)", status: "done" },
    { t: "카드명 현지화(영→ko/ja/zh)", status: "todo" },
    { t: "롱테일 카드 페이지(승인 후 공개·noindex)", status: "todo" },
  ] },
];

const STATUS_LABEL = { done: "✅ 완료", wip: "🚧 진행", todo: "⬜ 예정" } as const;

const LOCALE_LINKS = [
  { label: "한국어", href: "/tcg" },
  { label: "English", href: "/en/tcg" },
  { label: "日本語", href: "/ja/tcg" },
  { label: "繁體中文", href: "/zh-TW/tcg" },
];

export default function TcgAdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => { setAllowed(isSuperAdmin()); }, []);

  if (allowed === null) return null;
  if (!allowed) return <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>권한이 없습니다.</div>;

  const total = ROADMAP.flatMap((s) => s.items).length;
  const done = ROADMAP.flatMap((s) => s.items).filter((i) => i.status === "done").length;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1rem 4rem", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ margin: "0 0 4px", fontSize: "1.4rem", fontWeight: 900, color: "#b91c1c" }}>🎴 TCG Note 관리</h1>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
          tcgnote.net · 포켓몬 카드 게임 Pocket · 진척 {done}/{total} 페이지
        </p>
      </div>

      <section style={CARD}>
        <h2 style={H2}>⚙️ 환경설정 (도메인 배포 시 Render env 설정)</h2>
        <StatusRow label="AdSense (TCG)" value={ADS ? ADS : "NEXT_PUBLIC_TCG_ADSENSE_CLIENT 미설정"} ok={!!ADS} />
        <StatusRow label="Google Analytics" value={GA ? GA : "NEXT_PUBLIC_TCG_GA_ID 미설정"} ok={!!GA} />
        <StatusRow label="네이버 소유확인" value={NAVER ? "설정됨" : "NEXT_PUBLIC_TCG_NAVER_VERIFY 미설정"} ok={!!NAVER} />
        <p style={{ margin: "10px 0 0", fontSize: "0.74rem", color: "#94a3b8", lineHeight: 1.5 }}>
          gbl과 분리된 별도 키 — gblnote AdSense/GA가 tcgnote로 새지 않음. 미설정 시 해당 코드는 아예 노출되지 않아 안전.
        </p>
      </section>

      <section style={CARD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ ...H2, margin: 0 }}>🗺️ 콘텐츠 로드맵 (AdSense용 "작지만 완성된 20페이지")</h2>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#dc2626" }}>{done}/{total}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ROADMAP.map((s) => (
            <div key={s.section}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#334155", marginBottom: 4 }}>{s.section}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {s.items.map((it) => (
                  <div key={it.t} style={{ fontSize: "0.83rem", color: "#475569", display: "flex", gap: 8 }}>
                    <span style={{ minWidth: 52 }}>{STATUS_LABEL[it.status]}</span>
                    <span>{it.t}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: "12px 0 0", fontSize: "0.74rem", color: "#94a3b8", lineHeight: 1.5 }}>
          원칙: 공개 페이지는 100% 깊이 페이지만. 카드별 롱테일 수백 개는 승인 후 공개(그 전엔 noindex). 도감 함정 재현 금지.
        </p>
      </section>

      <section style={CARD}>
        <h2 style={H2}>🔗 라이브 사이트 (로케일별)</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {LOCALE_LINKS.map((l) => (
            <Link key={l.href} href={l.href} target="_blank" style={{
              fontSize: "0.82rem", fontWeight: 700, color: "#dc2626", textDecoration: "none",
              background: "#fee6e6", borderRadius: 8, padding: "6px 12px",
            }}>{l.label} ↗</Link>
          ))}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: "0.74rem", color: "#94a3b8" }}>
          로컬: /tcg 로 접속. 배포 후: tcgnote.net (미들웨어가 호스트→/tcg 라우팅).
        </p>
      </section>
    </div>
  );
}
