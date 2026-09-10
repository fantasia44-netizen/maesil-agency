// TCG Note 랜딩 — 서버렌더(정문 독창성). 크롤러가 초기 HTML에서 h1·미션·내부링크를 읽음.
// 백엔드 의존 없음(정적 SSR). 하위 콘텐츠 페이지(티어·덱·카드·가이드)는 데이터 파이프라인과 함께 구축.
import Link from "next/link";
import type { Metadata } from "next";
import META from "./data/meta.json";
import { analyzedDeckIds } from "./decks/analysis";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../lib/i18n";
import { getTcg } from "./dict";

export const revalidate = 3600;

// 급상승/급락 — 2층 자체분석. trend(최근 7/3일 vs 30일 %p, 표본 게이팅 내장)로 산출.
type DeckMeta = { id: string; name: string; nm?: Record<string, string>; winrate: number; n: number; wr3?: number | null; wr7?: number | null; n7?: number; trend?: { d: number; w: number } | null };
const MOVERS = (META.decks as DeckMeta[]).filter((d) => d.trend && (d.n7 ?? 0) >= 40); // 홈 헤드라인은 신뢰 표본만(개별 덱 페이지는 표본 표시하며 더 낮은 것도 노출)
const RISING = MOVERS.filter((d) => (d.trend as { d: number }).d >= 3).sort((a, b) => (b.trend as { d: number }).d - (a.trend as { d: number }).d).slice(0, 4);
const FALLING = MOVERS.filter((d) => (d.trend as { d: number }).d <= -3).sort((a, b) => (a.trend as { d: number }).d - (b.trend as { d: number }).d).slice(0, 4);

const MOVE_L: Record<Locale, { h: string; sub: string; rising: string; falling: string }> = {
  ko: { h: "📊 최근 급상승·급락 덱", sub: "실제 대회 데이터로 계산한 최근 7일 승률의 30일 평균 대비 변화입니다.", rising: "급상승", falling: "급락" },
  en: { h: "📊 Rising & falling decks", sub: "Change in the last 7-day win rate vs the 30-day average, computed from real tournament data.", rising: "Rising", falling: "Falling" },
  ja: { h: "📊 最近の急上昇・急落デッキ", sub: "実際の大会データで計算した直近7日勝率の30日平均比の変化です。", rising: "急上昇", falling: "急落" },
  "zh-TW": { h: "📊 近期急升·急跌牌組", sub: "以實際賽事數據計算的近7日勝率相對30日均值的變化。", rising: "急升", falling: "急跌" },
};

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  return { alternates: { canonical: localizePath(lang, "/tcg"), languages: hreflangLanguages("/tcg") } };
}

const BORDER = "#fbd8d8";

export default function TcgLandingPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const L = (p: string) => localizePath(lang, p);
  const t = getTcg(lang);
  const m = MOVE_L[lang];
  const analyzed = analyzedDeckIds();

  return (
    <>
      {/* ── SSR 미션 히어로 ── */}
      <div style={{ background: "linear-gradient(180deg,#fee6e6,#fef7f5)", padding: "1.6rem 1rem 0.6rem" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tcg-icon.png" alt="TCG Note" width={40} height={40} style={{ objectFit: "contain" }} />
            <span style={{ fontSize: "1.35rem", fontWeight: 900, color: "#dc2626", letterSpacing: "-0.5px" }}>{t.brand}</span>
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: "clamp(1.2rem,4.5vw,1.6rem)", fontWeight: 900, color: "#b91c1c", letterSpacing: "-0.5px", lineHeight: 1.25 }}>
            {t.hero.h1}
          </h1>
          <p style={{ margin: "0 0 12px", fontSize: "0.88rem", color: "#5b4a4a", lineHeight: 1.65, maxWidth: 760 }}>
            {t.hero.mission}
          </p>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {t.funnel.map((f) => (
              <Link key={f.path} href={L(f.path)} style={{
                fontSize: "0.8rem", fontWeight: 700, color: "#dc2626", textDecoration: "none",
                background: "#fff", border: "1px solid #f7d6d6", borderRadius: 999, padding: "5px 13px",
              }}>{f.label}</Link>
            ))}
          </nav>
        </div>
      </div>

      {/* ── 직접 써보는 대화형 도구(실기능 서비스 신호 — 심사자/크롤러가 'DB복사'가 아님을 홈에서 즉시 인식) ── */}
      <div style={{ background: "#fff", padding: "1.2rem 1rem 0.4rem" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{t.tools.h}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
            {t.tools.items.map((it) => (
              <Link key={it.href} href={L(it.href)} style={{
                display: "flex", alignItems: "flex-start", gap: 10, background: "#fff",
                border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.85rem 1rem", textDecoration: "none",
              }}>
                <span style={{ fontSize: "1.5rem", lineHeight: 1, flexShrink: 0 }}>{it.icon}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: "0.92rem", fontWeight: 800, color: "#b91c1c", marginBottom: 2 }}>{it.t}</span>
                  <span style={{ display: "block", fontSize: "0.78rem", color: "#64748b", lineHeight: 1.5 }}>{it.d}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── 최근 급상승·급락 덱(2층 자체분석 — '매일 바뀌는 계산 결과' = 재방문) ── */}
      {(RISING.length > 0 || FALLING.length > 0) && (
        <div style={{ background: "#fff", padding: "0.4rem 1rem 0.6rem" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <h2 style={{ margin: "0.4rem 0 4px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{m.h}</h2>
            <p style={{ margin: "0 0 10px", fontSize: "0.76rem", color: "#94a3b8" }}>{m.sub}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
              {[{ title: `🔥 ${m.rising}`, list: RISING, c: "#16a34a" }, { title: `📉 ${m.falling}`, list: FALLING, c: "#dc2626" }].filter((col) => col.list.length > 0).map((col) => (
                <div key={col.title} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.6rem 0.9rem" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{col.title}</div>
                  {col.list.map((d) => {
                    const nm = (d.nm && d.nm[lang]) || d.name;
                    const recent = d.wr7 ?? d.wr3;
                    const dd = (d.trend as { d: number }).d;
                    const inner = (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "4px 0", fontSize: "0.83rem" }}>
                        <span style={{ fontWeight: 700, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nm}</span>
                        <span style={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                          <b style={{ color: col.c }}>{recent}%</b> <span style={{ fontSize: "0.76rem", fontWeight: 800, color: col.c }}>{dd > 0 ? "+" : ""}{dd}%p</span>
                        </span>
                      </div>
                    );
                    return analyzed.includes(d.id)
                      ? <Link key={d.id} href={L(`/tcg/decks/${d.id}`)} style={{ textDecoration: "none", display: "block", borderTop: "1px solid #f6e0e0" }}>{inner}</Link>
                      : <div key={d.id} style={{ borderTop: "1px solid #f6e0e0" }}>{inner}</div>;
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 자체 분석 원본 3종(원본성 신호) ── */}
      <div style={{ background: "#fef7f5", padding: "1rem 1rem 1.6rem" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <h2 style={{ margin: "0.6rem 0 10px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{t.signature.h}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
            {t.signature.items.map((it) => (
              <Link key={it.href} href={L(it.href)} style={{
                display: "block", background: "#fff", border: `1px solid ${BORDER}`, borderLeft: "4px solid #dc2626",
                borderRadius: 12, padding: "0.8rem 1rem", textDecoration: "none",
              }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{it.t}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.55 }}>{it.d}</div>
              </Link>
            ))}
          </div>
          <p style={{ margin: "16px 0 0", fontSize: "0.72rem", color: "#a3a3b3" }}>{t.footerNote}</p>
        </div>
      </div>
    </>
  );
}
