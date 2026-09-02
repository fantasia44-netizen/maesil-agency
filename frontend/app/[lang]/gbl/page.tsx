// "use client" 아님 → 홈 진입 시 백엔드 실측 메타 TOP5를 서버에서 호출해 HTML에 박음.
// 정문(대표 URL)에서 크롤러가 GBL Note 고유 데이터와 내부링크를 바로 읽게 함.
// 인터랙티브 랜딩 UI는 <GblLandingClient/>가 담당.
import Link from "next/link";
import { isLocale, defaultLocale, localizePath, type Locale } from "../../../lib/i18n";
import { leagueName } from "./contentI18n";
import { monName } from "./meta/monNames";
import GblLandingClient from "./GblLandingClient";
import { CORE_FORMATS, MEGA_FORMATS, activeCups, todayISO, type Format } from "./formats";

export const revalidate = 600;

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
// 코어 3리그 + 메가(메가마리 등) + 진행 중 컵. 데이터 없는 포맷은 아래서 자동 숨김(total>0).
const stripFormats = (): Format[] => [...CORE_FORMATS, ...MEGA_FORMATS, ...activeCups(todayISO())];
// 컬럼 라벨 — 코어는 리그명, 메가/컵은 label(메가는 리그명+접미) 현지화.
const MEGA_TAG: Record<Locale, string> = { ko: " (메가)", en: " (Mega)", ja: "（メガ）", "zh-TW": "（Mega）" };
function fmtLabel(lang: Locale, f: Format): string {
  if (!f.cup) return leagueName(lang, f.key);                 // 코어 great/ultra/master
  if (f.key.endsWith("_mega")) return leagueName(lang, f.base) + MEGA_TAG[lang]; // 메가
  return f.label;                                             // 컵(한국어 라벨)
}

type MetaMon = { speciesId: string; count: number };
type Meta = { total: number; top_mons: MetaMon[] };

async function getMeta(league: string): Promise<Meta | null> {
  try {
    const res = await fetch(`${BASE}/api/gbl/meta?league=${league}&days=7`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as Meta;
  } catch {
    return null;
  }
}

const STRIP: Record<Locale, { h: string; more: string; note: string }> = {
  ko: { h: "🔴 지금 실측 TOP5 (최근 7일)", more: "전체 실측 메타 →", note: "시뮬레이션이 아닌, 유저들이 실제 대전에서 만난 상대 집계" },
  en: { h: "🔴 Live TOP5 (last 7 days)", more: "Full live meta →", note: "Real opponents players faced in battle — not simulation" },
  ja: { h: "🔴 実測TOP5（直近7日）", more: "実測メタ全体 →", note: "シミュレーションではなく、実際に対戦した相手の集計" },
  "zh-TW": { h: "🔴 即時實測TOP5（近7日）", more: "完整實測Meta →", note: "並非模擬，而是玩家實際對戰遇到的對手統計" },
};

// ── SSR 미션 히어로(정문 독창성 — 크롤러가 초기 HTML에서 "무엇을/왜"를 읽음) ──
// 퍼널: 실측메타 → 티어 → IV → CMP → 시뮬 → 레이드
const FUNNEL_PATHS = ["/gbl/meta", "/gbl/tier/great", "/gbl/iv", "/gbl/cmp/great", "/gbl/sim", "/gbl/raid"];
const HERO: Record<Locale, { h1: string; mission: string; funnel: string[] }> = {
  ko: {
    h1: "GBL Note — 포켓몬GO PvP·레이드 올인원 분석",
    mission: "PvPoke 공개 시뮬레이션 데이터와 GBL Note 사용자의 실제 배틀 기록을 결합해, 포켓몬GO 배틀리그(PvP)와 레이드를 데이터로 분석합니다.",
    funnel: ["실측 메타", "티어표", "PvP IV", "CMP 순위", "시뮬레이터", "레이드"],
  },
  en: {
    h1: "GBL Note — Pokémon GO PvP & Raid Analysis, All-in-One",
    mission: "GBL Note combines public PvPoke simulation data with real battle records from our users to analyze Pokémon GO Battle League (PvP) and raids with data.",
    funnel: ["Live meta", "Tier list", "PvP IV", "CMP", "Simulator", "Raids"],
  },
  ja: {
    h1: "GBL Note — ポケモンGO PvP・レイド オールインワン分析",
    mission: "PvPoke公開シミュレーションデータとGBL Note利用者の実際のバトル記録を組み合わせ、ポケモンGOバトルリーグ(PvP)とレイドをデータで分析します。",
    funnel: ["実測メタ", "ティア表", "PvP IV", "CMP", "シミュレーター", "レイド"],
  },
  "zh-TW": {
    h1: "GBL Note — Pokémon GO PvP·團體戰 一站式分析",
    mission: "結合 PvPoke 公開模擬數據與 GBL Note 使用者的實際對戰紀錄，以數據分析 Pokémon GO 對戰聯盟（PvP）與團體戰。",
    funnel: ["實測Meta", "強度表", "PvP IV", "CMP", "模擬器", "團體戰"],
  },
};

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

export default async function GblLandingPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const L = (p: string) => localizePath(lang, p);
  const s = STRIP[lang];

  const fmts = stripFormats();
  const metas = await Promise.all(fmts.map((f) => getMeta(f.key)));
  const cols = fmts.map((fmt, i) => ({ fmt, meta: metas[i] }))
    .filter((x): x is { fmt: Format; meta: Meta } => !!x.meta && x.meta.total > 0);

  const hero = HERO[lang];

  return (
    <>
      {/* ── SSR 미션 히어로(정문 독창성 · 크롤러가 초기 HTML에서 읽는 h1·미션·내부링크) ── */}
      <div style={{ background: "linear-gradient(180deg,#eef2fb,#f7f9fd)", padding: "1.5rem 1rem 0.5rem" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <h1 style={{ margin: "0 0 6px", fontSize: "clamp(1.15rem,4.5vw,1.5rem)", fontWeight: 900, color: "#1e2f9e", letterSpacing: "-0.5px", lineHeight: 1.25 }}>
            {hero.h1}
          </h1>
          <p style={{ margin: "0 0 10px", fontSize: "0.86rem", color: "#475569", lineHeight: 1.6, maxWidth: 760 }}>
            {hero.mission}
          </p>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {FUNNEL_PATHS.map((p, i) => (
              <Link key={p} href={L(p)} style={{
                fontSize: "0.78rem", fontWeight: 700, color: "#3b5bdb", textDecoration: "none",
                background: "#fff", border: "1px solid #dbe4f5", borderRadius: 999, padding: "5px 12px",
              }}>{hero.funnel[i]}</Link>
            ))}
          </nav>
        </div>
      </div>

      <GblLandingClient />

      {/* ── 서버렌더 실측 TOP5 스트립(크롤러가 읽는 고유 데이터 + 내부링크) — 인터랙티브 랜딩 아래 배치 ── */}
      {cols.length > 0 && (
        <div style={{ background: "linear-gradient(180deg,#eef2fb,#f7f9fd)", padding: "1.4rem 1rem 1.6rem" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 2px", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>{s.h}</h2>
            <p style={{ margin: "0 0 12px", fontSize: "0.78rem", color: "#64748b" }}>{s.note}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
              {cols.map(({ fmt, meta }) => (
                <section key={fmt.key} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.85rem 1rem" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "0.92rem", fontWeight: 800, color: "#0f172a" }}>{fmtLabel(lang, fmt)}</h3>
                  <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    {meta.top_mons.slice(0, 5).map((mm, i) => {
                      const pct = Math.round((mm.count / meta.total) * 100);
                      return (
                        <li key={mm.speciesId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem" }}>
                          <span style={{ fontWeight: 800, color: i < 3 ? "#a855f7" : "#94a3b8", minWidth: 22 }}>#{i + 1}</span>
                          <span style={{ flex: 1, color: "#0f172a", fontWeight: 600 }}>{monName(lang, mm.speciesId)}</span>
                          <span style={{ fontWeight: 700, color: "#3b5bdb" }}>{pct}%</span>
                        </li>
                      );
                    })}
                  </ol>
                  <Link href={L(fmt.cup ? "/gbl/meta" : `/gbl/meta/${fmt.key}`)} style={{ display: "inline-block", marginTop: 10, fontSize: "0.78rem", fontWeight: 700, color: "#3b5bdb", textDecoration: "none" }}>
                    {s.more}
                  </Link>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
