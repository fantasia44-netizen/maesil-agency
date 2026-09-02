// "use client" 아님 → 허브 진입 시 백엔드 실측 메타를 서버에서 호출해 HTML에 박아
// 크롤러가 "불러오는 중…" 대신 실제 데이터·분석문을 읽게 함. (AdSense/SEO 정문 개선)
// 기간·컵 필터 등 인터랙션은 하단 <MetaHubClient/>가 담당.
import Link from "next/link";
import type { Metadata } from "next";
import {
  isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale,
} from "../../../../lib/i18n";
import { leagueName } from "../contentI18n";
import { monName } from "./monNames";
import MetaHubClient from "./MetaHubClient";

export const revalidate = 600; // 10분마다 재집계(크롤 가능 + 서버 캐시)

const SITE = "https://gblnote.com";
const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const LEAGUES = ["master", "great", "ultra"];

type MetaMon = { speciesId: string; count: number };
type Meta = { total: number; wins: number; losses: number; top_mons: MetaMon[]; top_decks: unknown[] };

async function getMeta(league: string): Promise<Meta | null> {
  try {
    const res = await fetch(`${BASE}/api/gbl/meta?league=${league}&days=30`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as Meta;
  } catch {
    return null;
  }
}

// ── 로케일별 요약/분석 카피 ──────────────────────────────────────────────
type SumCopy = {
  h1: string; sub: string; more: string; tier: string; guide: string;
  line: (lg: string, tot: number, n1: string, p1: number, n2: string, p2: number) => string;
  title: string; desc: string;
  prov: { h: string; periodL: string; periodV: string; battlesL: string; battlesV: (n: number) => string; methodL: string; methodV: string; updateL: string; updateV: string };
};
const SUM: Record<Locale, SumCopy> = {
  ko: {
    h1: "실측 GBL 메타 — 실제 대전 집계",
    sub: "최근 30일 · 유저들이 실제로 만난 상대 데이터",
    more: "전체 순위 보기", tier: "티어표", guide: "GBL 가이드",
    line: (lg, tot, n1, p1, n2, p2) =>
      `최근 30일 ${lg} 실측 ${tot.toLocaleString()}건 집계 결과, 실전에서 가장 많이 만난 상대는 ${n1}(${p1}%)` +
      (n2 ? `, 다음은 ${n2}(${p2}%)` : "") +
      `입니다. 시뮬레이션 티어가 아니라 실제 배틀 기록 기반이라 지금 리그에서 무엇을 대비해야 할지 바로 알 수 있습니다.`,
    title: "실측 GBL 메타 — 포켓몬GO 배틀리그 실전 픽률",
    desc: "시뮬레이션이 아닌, 유저들이 실제 GBL에서 만난 상대를 집계한 슈퍼·하이퍼·마스터리그 실측 메타. 최근 30일 픽률 TOP.",
    prov: {
      h: "📊 데이터 출처 · 집계 방식",
      periodL: "집계 기간", periodV: "최근 30일",
      battlesL: "총 실측 대전", battlesV: (n) => `${n.toLocaleString()}건`,
      methodL: "집계 방식", methodV: "GBL Note 사용자 익명 실측 기록 (시뮬레이션 아님)",
      updateL: "갱신", updateV: "10분 간격 자동",
    },
  },
  en: {
    h1: "Live GBL Meta — Real Battle Data",
    sub: "Last 30 days · what players actually faced",
    more: "Full ranking", tier: "Tier list", guide: "GBL guides",
    line: (lg, tot, n1, p1, n2, p2) =>
      `Across ${tot.toLocaleString()} real ${lg} battles in the last 30 days, the most-encountered opponent is ${n1} (${p1}%)` +
      (n2 ? `, followed by ${n2} (${p2}%)` : "") +
      `. This is based on actual battle records, not simulation tiers, so you can see exactly what to prepare for right now.`,
    title: "Live GBL Meta — Pokémon GO Battle League Real Pick Rates",
    desc: "Not a simulation — real opponents players faced in GBL, aggregated for Great/Ultra/Master League. Last-30-day pick rate TOP.",
    prov: {
      h: "📊 Data source · methodology",
      periodL: "Period", periodV: "Last 30 days",
      battlesL: "Total real battles", battlesV: (n) => `${n.toLocaleString()}`,
      methodL: "Method", methodV: "Anonymous records from GBL Note users (not simulation)",
      updateL: "Updated", updateV: "auto, every 10 min",
    },
  },
  ja: {
    h1: "実測GBLメタ — 実戦データ集計",
    sub: "直近30日 · ユーザーが実際に対戦した相手データ",
    more: "全ランキング", tier: "ティア表", guide: "GBLガイド",
    line: (lg, tot, n1, p1, n2, p2) =>
      `直近30日の${lg}実戦${tot.toLocaleString()}件を集計した結果、最も多く遭遇した相手は${n1}(${p1}%)` +
      (n2 ? `、次いで${n2}(${p2}%)` : "") +
      `です。シミュレーションのティアではなく実際のバトル記録に基づくため、今のリーグで何に備えるべきかがすぐ分かります。`,
    title: "実測GBLメタ — ポケモンGOバトルリーグ実戦ピック率",
    desc: "シミュレーションではなく、ユーザーが実際にGBLで対戦した相手を集計したスーパー・ハイパー・マスターリーグの実測メタ。直近30日ピック率TOP。",
    prov: {
      h: "📊 データ出典 · 集計方式",
      periodL: "集計期間", periodV: "直近30日",
      battlesL: "実測対戦 総数", battlesV: (n) => `${n.toLocaleString()}件`,
      methodL: "集計方式", methodV: "GBL Note利用者の匿名実測記録(シミュレーションではない)",
      updateL: "更新", updateV: "10分間隔で自動",
    },
  },
  "zh-TW": {
    h1: "實測GBL Meta — 實戰數據統計",
    sub: "近30日 · 玩家實際遭遇的對手數據",
    more: "完整排行", tier: "階級表", guide: "GBL攻略",
    line: (lg, tot, n1, p1, n2, p2) =>
      `統計近30日${lg}實戰${tot.toLocaleString()}場的結果，最常遇到的對手是${n1}(${p1}%)` +
      (n2 ? `，其次是${n2}(${p2}%)` : "") +
      `。這是基於實際對戰紀錄而非模擬階級，能立即掌握目前聯盟需要應對的對手。`,
    title: "實測GBL Meta — Pokémon GO對戰聯盟實戰使用率",
    desc: "並非模擬，而是統計玩家在GBL實際遇到的對手，涵蓋超級·高級·大師聯盟的實測Meta。近30日使用率TOP。",
    prov: {
      h: "📊 資料來源 · 統計方式",
      periodL: "統計期間", periodV: "近30日",
      battlesL: "實測對戰總數", battlesV: (n) => `${n.toLocaleString()}場`,
      methodL: "統計方式", methodV: "GBL Note 使用者匿名實測紀錄（非模擬）",
      updateL: "更新", updateV: "每10分鐘自動",
    },
  },
};

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const c = SUM[lang];
  const path = "/gbl/meta";
  return {
    title: c.title,
    description: c.desc,
    // 허브(/gbl/meta)는 클라 렌더(로딩 스피너)라 크롤러엔 빈 페이지 → noindex.
    // 실제 콘텐츠는 SSR인 /gbl/meta/[league]가 담당(follow로 그쪽으로 크롤 유도).
    robots: { index: false, follow: true },
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    openGraph: { title: c.title, description: c.desc, url: localizePath(lang, path), images: ["/gbl-og.png"], type: "website" },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

export default async function GblMetaHub({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const c = SUM[lang];
  const L = (p: string) => localizePath(lang, p);

  const metas = await Promise.all(LEAGUES.map((lg) => getMeta(lg)));
  const leagueData = LEAGUES.map((lg, i) => ({ lg, meta: metas[i] }))
    .filter((x): x is { lg: string; meta: Meta } => !!x.meta && x.meta.total > 0);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
      padding: "1.4rem 1rem 0",
    }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        {/* ── 서버렌더 요약(크롤러가 읽는 실측 데이터·분석문) ── */}
        <h1 style={{ margin: "0.2rem 0 0.15rem", fontSize: "1.4rem", fontWeight: 900, color: "#0f172a" }}>{c.h1}</h1>
        <p style={{ margin: "0 0 1.1rem", fontSize: "0.84rem", color: "#64748b", lineHeight: 1.6 }}>{c.sub}</p>

        {/* ── 데이터 출처 박스(E-E-A-T · 심사자·사용자 신뢰 시그널) ── */}
        {leagueData.length > 0 && (() => {
          const totalBattles = leagueData.reduce((s, x) => s + x.meta.total, 0);
          return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 18px", alignItems: "center", background: CARD, border: `1px solid ${BORDER}`, borderLeft: "4px solid #7c3aed", borderRadius: 12, padding: "0.75rem 1rem", marginBottom: 16, fontSize: "0.78rem", lineHeight: 1.5 }}>
              <span style={{ fontWeight: 800, color: "#0f172a", marginRight: 2 }}>{c.prov.h}</span>
              <span style={{ color: "#64748b" }}>{c.prov.periodL}: <b style={{ color: "#334155" }}>{c.prov.periodV}</b></span>
              <span style={{ color: "#64748b" }}>{c.prov.battlesL}: <b style={{ color: "#3b5bdb" }}>{c.prov.battlesV(totalBattles)}</b></span>
              <span style={{ color: "#64748b" }}>{c.prov.methodL}: <b style={{ color: "#334155" }}>{c.prov.methodV}</b></span>
              <span style={{ color: "#64748b" }}>{c.prov.updateL}: <b style={{ color: "#334155" }}>{c.prov.updateV}</b></span>
            </div>
          );
        })()}

        {leagueData.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16, marginBottom: 8 }}>
            {leagueData.map(({ lg, meta }) => {
              const top = meta.top_mons.slice(0, 12);
              const n1 = top[0] ? monName(lang, top[0].speciesId) : "";
              const p1 = top[0] ? Math.round((top[0].count / meta.total) * 100) : 0;
              const n2 = top[1] ? monName(lang, top[1].speciesId) : "";
              const p2 = top[1] ? Math.round((top[1].count / meta.total) * 100) : 0;
              return (
                <section key={lg} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "1rem 1.1rem" }}>
                  <h2 style={{ margin: "0 0 8px", fontSize: "1.02rem", fontWeight: 800, color: "#0f172a" }}>
                    {leagueName(lang, lg)}
                  </h2>
                  <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "#475569", lineHeight: 1.65 }}>
                    {c.line(leagueName(lang, lg), meta.total, n1, p1, n2, p2)}
                  </p>
                  <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    {top.map((mm, i) => {
                      const pct = Math.round((mm.count / meta.total) * 100);
                      return (
                        <li key={mm.speciesId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem" }}>
                          <span style={{ fontWeight: 800, color: i < 3 ? "#a855f7" : "#94a3b8", minWidth: 24 }}>#{i + 1}</span>
                          <span style={{ flex: 1, color: "#0f172a", fontWeight: 600 }}>{monName(lang, mm.speciesId)}</span>
                          <span style={{ fontWeight: 700, color: "#3b5bdb" }}>{pct}%</span>
                        </li>
                      );
                    })}
                  </ol>
                  <div style={{ marginTop: 12, display: "flex", gap: 12, fontSize: "0.78rem", fontWeight: 600 }}>
                    <Link href={L(`/gbl/meta/${lg}`)} style={{ color: "#3b5bdb", textDecoration: "none" }}>{c.more} →</Link>
                    <Link href={L(`/gbl/tier/${lg}`)} style={{ color: "#7c3aed", textDecoration: "none" }}>{c.tier}</Link>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <div style={{ margin: "14px 0 4px", fontSize: "0.78rem" }}>
          <Link href={L("/gbl/guide")} style={{ color: "#64748b", textDecoration: "none" }}>📖 {c.guide}</Link>
        </div>
      </div>

      {/* ── 인터랙티브 위젯(기간·컵 필터·덱 뷰) — 하이드레이션 후 동작 ── */}
      <MetaHubClient />
    </div>
  );
}
