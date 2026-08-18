// 리그별 실측 메타 — 서버렌더(ISR) SEO 페이지 (master/great/ultra 공용).
// "use client" 아님 → 백엔드를 서버에서 호출해 데이터를 HTML에 박아 크롤러가 읽게 함.
// 기간·커스텀리그 필터는 인터랙티브 페이지(/gbl/meta)로 유도.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DATA from "../../gbl_data.json";
import AdSlot from "../../AdSlot";
import CoupangAd from "../../CoupangAd";

export const revalidate = 3600; // 1시간마다 정적 재생성(크롤 가능 + 재집계 캐싱)

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

// 리그 설정(한글명 = 포켓몬 GO 표기: Great=슈퍼, Ultra=하이퍼, Master=마스터)
const LEAGUES: Record<string, { ko: string; short: string }> = {
  master: { ko: "마스터리그", short: "마스터" },
  great: { ko: "슈퍼리그", short: "슈퍼" },
  ultra: { ko: "하이퍼리그", short: "하이퍼" },
};
const LEAGUE_KEYS = Object.keys(LEAGUES);

type Mon = { id: string; dex: number; ko: string; shadow: boolean; sprite?: string };
const DS = DATA as unknown as { leagues: Record<string, { pokemon: Mon[] }> };
const MON: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON[m.id] = m;
const spriteUrl = (m?: Mon) =>
  m ? (m.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.dex}.png`) : "";
const nameOf = (id: string) => MON[id]?.ko || id;

type MetaMon = { speciesId: string; count: number };
type MetaDeck = { deck: string[]; count: number };
type Meta = { total: number; top_mons: MetaMon[]; top_decks: MetaDeck[] };

async function getMeta(league: string): Promise<Meta | null> {
  try {
    const res = await fetch(`${BASE}/api/gbl/meta?league=${league}&days=30`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as Meta;
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return LEAGUE_KEYS.map((league) => ({ league }));
}

export function generateMetadata({ params }: { params: { league: string } }): Metadata {
  const lg = LEAGUES[params.league];
  if (!lg) return { title: "GBL Note" };
  const title = `포켓몬고 ${lg.ko} 실측 픽률 · 인기 덱 TOP | GBL Note`;
  const description = `포켓몬 GO ${lg.ko}(GBL)에서 한국 유저들이 실제로 만난 상대 기반 실측 픽률과 인기 덱 순위. 시뮬레이션이 아닌 실전 데이터, 최근 30일 기준으로 지금 뭘 제일 많이 만나는지 확인하세요.`;
  return {
    title,
    description,
    keywords: [`포켓몬고 ${lg.ko}`, `${lg.ko} 순위`, `${lg.ko} 조합`, "포켓몬고 GBL", `${lg.ko} 티어`, "실전 픽률", "인기 덱"],
    alternates: { canonical: `/gbl/meta/${params.league}` },
    openGraph: {
      title: `포켓몬고 ${lg.ko} 실측 메타 — 실전 픽률·인기 덱 TOP`,
      description: `한국 유저 실측 기반 ${lg.ko} 픽률·덱 순위 (최근 30일)`,
      url: `/gbl/meta/${params.league}`,
      images: ["/gbl-og.png"],
      type: "website",
    },
  };
}

// ── 라이트 테마 팔레트 ──
const CARD = "#ffffff";
const BORDER = "#e3e8f2";

function Sprite({ id, size = 30 }: { id: string; size?: number }) {
  const m = MON[id];
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={spriteUrl(m)} alt={m?.ko || id} width={size} height={size} style={{ imageRendering: "pixelated" }} />;
}

export default async function LeagueMetaPage({ params }: { params: { league: string } }) {
  const lg = LEAGUES[params.league];
  if (!lg) notFound();

  const meta = await getMeta(params.league);
  const total = meta?.total ?? 0;
  const mons = (meta?.top_mons ?? []).slice(0, 24);
  const decks = (meta?.top_decks ?? []).slice(0, 15);
  const maxMon = meta?.top_mons?.[0]?.count || 1;
  const maxDeck = meta?.top_decks?.[0]?.count || 1;
  const hasData = total > 0 && mons.length > 0;

  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
    padding: "1.4rem 1rem 4rem",
  };
  const h2: React.CSSProperties = { fontSize: "1.05rem", fontWeight: 800, margin: "1.6rem 0 10px", color: "#0f172a" };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center" }}>
          <Link href="/gbl" style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href="/gbl/app" style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>📝 내 기록 →</Link>
        </div>

        {/* 리그 내부링크(SEO 크로스링크) */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {LEAGUE_KEYS.map((k) => {
            const on = k === params.league;
            return (
              <Link key={k} href={`/gbl/meta/${k}`}
                style={{ padding: "6px 13px", borderRadius: 16, fontSize: "0.8rem", fontWeight: 700, textDecoration: "none",
                  border: `1px solid ${on ? "#4f8cff" : BORDER}`, background: on ? "rgba(79,140,255,.16)" : CARD, color: on ? "#3b5bdb" : "#64748b" }}>
                {LEAGUES[k].short}리그
              </Link>
            );
          })}
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          포켓몬고 {lg.ko} 실측 픽률 · 인기 덱
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          시뮬레이션이 아닌, 한국 유저들이 <b style={{ color: "#334155" }}>실제로 만난 상대</b>를 집계한 {lg.ko}(GBL) 실전 메타입니다.
          지금 {lg.ko}에서 어떤 포켓몬과 덱(파티)을 가장 많이 만나는지 <b style={{ color: "#334155" }}>실측 픽률</b>로 확인하세요. 최근 30일 기준.
        </p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
          기간·시즌 컵 필터는{" "}
          <Link href="/gbl/meta" style={{ color: "#3b5bdb", fontWeight: 600 }}>인터랙티브 메타</Link>에서 볼 수 있습니다.
        </p>

        {!hasData ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem", fontSize: "0.92rem" }}>
            집계 데이터가 아직 준비 중입니다. 기록이 쌓이면 채워집니다.
          </div>
        ) : (
          <>
            <h2 style={h2}>🔥 {lg.ko} 포켓몬 실측 픽률 TOP</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {mons.map((mm, i) => {
                const pct = Math.round((mm.count / total) * 100);
                const m = MON[mm.speciesId];
                return (
                  <div key={mm.speciesId} style={{ display: "flex", alignItems: "center", gap: 8, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "5px 10px" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: 800, color: i < 3 ? "#a855f7" : "#94a3b8", minWidth: 22 }}>#{i + 1}</span>
                    <Sprite id={mm.speciesId} size={30} />
                    <span style={{ fontSize: "0.86rem", fontWeight: 600, minWidth: 88, color: "#0f172a" }}>
                      {m?.shadow && <span style={{ color: "#7c3aed" }}>그림자 </span>}{nameOf(mm.speciesId)}
                    </span>
                    <div style={{ flex: 1, height: 8, background: "#e5eaf3", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${Math.round((mm.count / maxMon) * 100)}%`, height: "100%", background: "linear-gradient(90deg,#3b5bdb,#7c3aed)" }} />
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#3b5bdb", minWidth: 38, textAlign: "right" }}>{pct}%</span>
                  </div>
                );
              })}
            </div>

            <AdSlot />

            <h2 style={h2}>🏆 {lg.ko} 인기 덱(파티) 픽률 TOP</h2>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 6 }}>전체 대전 중 이 덱(파티)을 만난 비율</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {decks.map((d, i) => {
                const pct = Math.round((d.count / total) * 100);
                const names = d.deck.map(nameOf).join(" · ");
                return (
                  <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "7px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: i < 3 ? "#a855f7" : "#94a3b8", minWidth: 22 }}>#{i + 1}</span>
                      <div style={{ display: "flex", gap: 2 }}>{d.deck.map((id) => <Sprite key={id} id={id} size={32} />)}</div>
                      <span style={{ marginLeft: "auto", fontSize: "1rem", fontWeight: 800, color: "#a855f7" }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "#e5eaf3", borderRadius: 3, margin: "6px 0 4px", overflow: "hidden" }}>
                      <div style={{ width: `${Math.round((d.count / maxDeck) * 100)}%`, height: "100%", background: "linear-gradient(90deg,#7c3aed,#a855f7)" }} />
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1.4 }}>{names}</div>
                  </div>
                );
              })}
            </div>

            <CoupangAd />
          </>
        )}

        <div style={{ marginTop: 26, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>GBL Note란?</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.7 }}>
            GBL Note는 포켓몬 GO 배틀리그(GBL)에서 만난 상대를 기록하고, 다시 만나면 상대의 과거 파티·기술을 5초 안에 확인하는 도구입니다.
            여기 실측 메타는 사용자들의 기록을 개인정보를 제거한 익명 통계로 집계한 것으로, 실제 한국 서버에서 유행하는 {lg.ko} 조합을 반영합니다.{" "}
            <Link href="/gbl/login" style={{ color: "#3b5bdb", fontWeight: 600 }}>무료로 시작하기 →</Link>
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href="/gbl/privacy" style={{ color: "#64748b", textDecoration: "none" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
