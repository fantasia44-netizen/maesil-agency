// 리그별 티어표 — 서버렌더(ISR) SEO 페이지.
// PvPoke 오픈데이터(티어·추천 기술배치) + 우리 실측 픽률 결합. master/great/ultra 공용.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DATA from "../../gbl_data.json";
import DETAIL from "../../gbl_detail.json";
import AdSlot from "../../AdSlot";
import ListShare from "../../ListShare";
import CoupangAd from "../../CoupangAd";

export const revalidate = 600;

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const LEAGUES: Record<string, { ko: string; short: string }> = {
  master: { ko: "마스터리그", short: "마스터" },
  great: { ko: "슈퍼리그", short: "슈퍼" },
  ultra: { ko: "하이퍼리그", short: "하이퍼" },
};
const LEAGUE_KEYS = Object.keys(LEAGUES);

type Mon = { id: string; dex: number; ko: string; types: string[]; shadow: boolean; sprite?: string };
type Move = { ko: string; en: string; type: string; kind: string };
const DS = DATA as unknown as { moves: Record<string, Move>; leagues: Record<string, { pokemon: Mon[] }> };
const MON: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON[m.id] = m;
const MOVES = DS.moves;
const spriteUrl = (m?: Mon) =>
  m ? (m.sprite || `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${m.dex}.png`) : "";
const nameOf = (id: string) => MON[id]?.ko || id;
const moveKo = (id: string) => MOVES[id]?.ko || id;

type Detail = { id: string; score: number; tier: string; moveset: string[]; counters: string[]; wins: string[]; stats: Record<string, number>; ko?: string; dex?: number; types?: string[] };
const DET = DETAIL as unknown as Record<string, Detail[]>;

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a", D: "#64748b" };
const TYPE_KO: Record<string, string> = {
  normal: "노말", fire: "불꽃", water: "물", electric: "전기", grass: "풀", ice: "얼음",
  fighting: "격투", poison: "독", ground: "땅", flying: "비행", psychic: "에스퍼", bug: "벌레",
  rock: "바위", ghost: "고스트", dragon: "드래곤", dark: "악", steel: "강철", fairy: "페어리",
};

type Meta = { total: number; top_mons: { speciesId: string; count: number }[] };
async function getPickRates(league: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${BASE}/api/gbl/meta?league=${league}&days=30`, { next: { revalidate: 3600 } });
    if (!res.ok) return {};
    const m = (await res.json()) as Meta;
    const out: Record<string, number> = {};
    if (m.total > 0) for (const mm of m.top_mons) out[mm.speciesId] = Math.round((mm.count / m.total) * 100);
    return out;
  } catch {
    return {};
  }
}

export function generateStaticParams() {
  return LEAGUE_KEYS.map((league) => ({ league }));
}

export function generateMetadata({ params }: { params: { league: string } }): Metadata {
  const lg = LEAGUES[params.league];
  if (!lg) return { title: "GBL Note" };
  const title = `포켓몬고 ${lg.ko} 티어표 · 추천 기술배치 | GBL Note`;
  const description = `포켓몬 GO ${lg.ko}(GBL) 티어표(S/A/B). 각 포켓몬의 추천 기술배치와 한국 유저 실측 픽률을 함께 확인하세요. 이론 랭킹 + 실전 데이터 결합.`;
  return {
    title,
    description,
    keywords: [`포켓몬고 ${lg.ko} 티어`, `${lg.ko} 티어표`, `${lg.ko} 추천 조합`, `${lg.ko} 순위`, "포켓몬고 GBL 티어", "추천 기술배치"],
    alternates: { canonical: `/gbl/tier/${params.league}` },
    openGraph: {
      title: `포켓몬고 ${lg.ko} 티어표 — 추천 기술배치 + 실측 픽률`,
      description: `${lg.ko} S/A/B 티어 + 추천 기술 + 한국 실측 픽률`,
      url: `/gbl/tier/${params.league}`,
      images: ["/gbl-og.png"],
      type: "website",
    },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

function Sprite({ id, size = 34 }: { id: string; size?: number }) {
  const m = MON[id];
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={spriteUrl(m)} alt={m?.ko || id} width={size} height={size} style={{ imageRendering: "pixelated" }} />;
}

function MoveChip({ id }: { id: string }) {
  const mv = MOVES[id];
  const c = mv ? (TYPE_COLOR[mv.type] || "#64748b") : "#64748b";
  return (
    <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "1px 7px", borderRadius: 10, background: c + "22", color: c, border: `1px solid ${c}55`, whiteSpace: "nowrap" }}>
      {moveKo(id)}
    </span>
  );
}

export default async function TierPage({ params }: { params: { league: string } }) {
  const lg = LEAGUES[params.league];
  if (!lg) notFound();

  const list = (DET[params.league] || []).slice(0, 100);  // 티어표는 상위 100종(CMP·조회는 200종까지)
  const pick = await getPickRates(params.league);
  const TIERS = ["S", "A", "B", "C", "D"];
  const byTier: Record<string, Detail[]> = {};
  for (const t of TIERS) byTier[t] = [];
  for (const d of list) (byTier[d.tier] || (byTier[d.tier] = [])).push(d);

  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
    padding: "1.4rem 1rem 4rem",
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/gbl" style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href="/gbl/raid" style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>🔥 레이드 딜러</Link>
          <Link href={`/gbl/cmp/${params.league}`} style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>⚡ CMP 순위</Link>
          <Link href={`/gbl/meta/${params.league}`} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>📊 실측 메타 →</Link>
        </div>

        {/* 리그 크로스링크 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {LEAGUE_KEYS.map((k) => {
            const on = k === params.league;
            return (
              <Link key={k} href={`/gbl/tier/${k}`}
                style={{ padding: "6px 13px", borderRadius: 16, fontSize: "0.8rem", fontWeight: 700, textDecoration: "none",
                  border: `1px solid ${on ? "#4f8cff" : BORDER}`, background: on ? "rgba(79,140,255,.16)" : CARD, color: on ? "#3b5bdb" : "#64748b" }}>
                {LEAGUES[k].short}리그
              </Link>
            );
          })}
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          포켓몬고 {lg.ko} 티어표 · 추천 기술배치
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          {lg.ko}(GBL) <b style={{ color: "#334155" }}>티어표</b>와 각 포켓몬의 <b style={{ color: "#334155" }}>추천 기술배치</b>입니다.
          이론 랭킹(전투 시뮬 기반)에 <b style={{ color: "#334155" }}>한국 유저 실측 픽률</b>을 함께 표기해, 강한 것과 실제로 많이 만나는 것을 한 번에 볼 수 있습니다.
        </p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
          티어 = 리그 내 상대 평가(S가 최상위). 실측 픽률은 최근 30일 기준.{" "}
          <Link href={`/gbl/meta/${params.league}`} style={{ color: "#3b5bdb", fontWeight: 600 }}>실측 메타 자세히 →</Link>
        </p>

        {list.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>데이터 준비 중입니다.</div>
        ) : (
          TIERS.filter((t) => byTier[t] && byTier[t].length).map((t, ti) => (
            <div key={t} style={{ marginTop: ti === 0 ? 20 : 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff", background: TIER_COLOR[t], width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>{t}</span>
                <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>{byTier[t].length}종</span>
                {t === "S" && <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>최상위 티어</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {byTier[t].map((d) => {
                  const pr = pick[d.id];
                  const types = (d.types && d.types.length) ? d.types : (MON[d.id]?.types || []);
                  const dex = d.dex || MON[d.id]?.dex;
                  const dispName = d.ko || ((MON[d.id]?.shadow ? "그림자 " : "") + nameOf(d.id));
                  const c1 = TYPE_COLOR[types[0]] || "#cbd5e1";
                  const c2 = TYPE_COLOR[types[1]] || c1;
                  return (
                    <Link key={d.id} href={`/gbl/pokemon/${params.league}/${d.id}`} style={{ textDecoration: "none", color: "inherit", display: "block", background: `linear-gradient(100deg, ${c1}26 0%, ${c2}18 42%, #ffffff 88%)`, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${c1}`, borderRadius: 10, padding: "8px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={spriteUrl(MON[d.id]) || (dex ? `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${dex}.png` : "")} alt={dispName} width={36} height={36} style={{ imageRendering: "pixelated" }} />
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>{dispName}</span>
                        <span style={{ display: "flex", gap: 3 }}>
                          {types.map((t2) => (
                            <span key={t2} style={{ fontSize: "0.62rem", fontWeight: 700, color: "#fff", background: TYPE_COLOR[t2] || "#94a3b8", padding: "1px 6px", borderRadius: 6 }}>{TYPE_KO[t2] || t2}</span>
                          ))}
                        </span>
                        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                          {pr != null && (
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#3b5bdb" }} title="한국 유저 실측 픽률(최근 30일)">실측 {pr}%</span>
                          )}
                          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }} title="이론 점수(PvPoke)">점수 {d.score}</span>
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6, paddingLeft: 44 }}>
                        {d.moveset.map((mid) => <MoveChip key={mid} id={mid} />)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {list.length > 0 && (
          <ListShare
            title={`${lg.ko} 티어 TOP`}
            subtitle="이론 티어 + 한국 유저 실측 픽률"
            path={`/gbl/tier/${params.league}`}
            accent="#7c3aed"
            buttonLabel="📸 티어표 이미지 저장·공유"
            filename={`gbl-${params.league}-tier.png`}
            footerTag="포켓몬GO 배틀리그 티어표"
            trackLabel="pvp-tier"
            items={list.slice(0, 12).map((d) => ({
              dex: (MON[d.id]?.sprite?.match(/(\d+)\.png/)?.[1]) || String(d.dex || MON[d.id]?.dex || ""),
              name: d.ko || ((MON[d.id]?.shadow ? "그림자 " : "") + nameOf(d.id)),
              main: String(d.score),
              sub: pick[d.id] != null ? `실측 ${pick[d.id]}%` : `${d.tier}티어`,
            }))}
          />
        )}

        <AdSlot />

        <div style={{ marginTop: 24, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>티어·추천 기술배치는 어떻게 나온 건가요?</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.7 }}>
            티어와 추천 기술배치는 공개 전투 시뮬레이션 데이터(PvPoke)를 기반으로 {lg.ko} 환경에서 산출한 것이며, 실측 픽률은 GBL Note 사용자들이 실제로 만난 상대를 익명 집계한 값입니다.
            이론상 강한 포켓몬과 한국 서버에서 실제로 유행하는 포켓몬을 함께 비교해보세요.{" "}
            <Link href="/gbl/login" style={{ color: "#3b5bdb", fontWeight: 600 }}>무료로 내 전적 기록하기 →</Link>
          </p>
        </div>

        <CoupangAd />

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href="/gbl/privacy" style={{ color: "#64748b", textDecoration: "none" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
