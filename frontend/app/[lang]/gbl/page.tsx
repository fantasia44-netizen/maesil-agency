// "use client" 아님 → 홈 진입 시 백엔드 실측 메타 TOP5를 서버에서 호출해 HTML에 박음.
// 정문(대표 URL)에서 크롤러가 GBL Note 고유 데이터와 내부링크를 바로 읽게 함.
// 인터랙티브 랜딩 UI는 <GblLandingClient/>가 담당.
import Link from "next/link";
import { isLocale, defaultLocale, localizePath, type Locale } from "../../../lib/i18n";
import { leagueName } from "./contentI18n";
import { monName } from "./meta/monNames";
import GblLandingClient from "./GblLandingClient";

export const revalidate = 600;

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const LEAGUES = ["master", "great", "ultra"];

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

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

export default async function GblLandingPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const L = (p: string) => localizePath(lang, p);
  const s = STRIP[lang];

  const metas = await Promise.all(LEAGUES.map((lg) => getMeta(lg)));
  const cols = LEAGUES.map((lg, i) => ({ lg, meta: metas[i] }))
    .filter((x): x is { lg: string; meta: Meta } => !!x.meta && x.meta.total > 0);

  return (
    <>
      {/* ── 서버렌더 실측 TOP5 스트립(크롤러가 읽는 고유 데이터 + 내부링크) ── */}
      {cols.length > 0 && (
        <div style={{ background: "linear-gradient(180deg,#eef2fb,#f7f9fd)", padding: "1.4rem 1rem 1.6rem" }}>
          <div style={{ maxWidth: 1040, margin: "0 auto" }}>
            <h2 style={{ margin: "0 0 2px", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>{s.h}</h2>
            <p style={{ margin: "0 0 12px", fontSize: "0.78rem", color: "#64748b" }}>{s.note}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
              {cols.map(({ lg, meta }) => (
                <section key={lg} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.85rem 1rem" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: "0.92rem", fontWeight: 800, color: "#0f172a" }}>{leagueName(lang, lg)}</h3>
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
                  <Link href={L(`/gbl/meta/${lg}`)} style={{ display: "inline-block", marginTop: 10, fontSize: "0.78rem", fontWeight: 700, color: "#3b5bdb", textDecoration: "none" }}>
                    {s.more}
                  </Link>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      <GblLandingClient />
    </>
  );
}
