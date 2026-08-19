// 포켓몬별 상세 — 서버렌더(ISR) SEO 페이지.
// PvPoke 오픈데이터(티어·추천기술·카운터·매치업·종족값) + 우리 실측 픽률.
// "[포켓몬] 마스터리그 카운터/기술배치" 검색 타겟 + 시뮬레이터 대체(카운터 조회).
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DATA from "../../../gbl_data.json";
import DETAIL from "../../../gbl_detail.json";
import AdSlot from "../../../AdSlot";
import CoupangAd from "../../../CoupangAd";

export const revalidate = 3600;
const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const STATIC_TOP = 20; // 리그별 상위 N종 사전생성(+sitemap). 나머지는 링크 시 온디맨드.

const LEAGUES: Record<string, { ko: string; short: string }> = {
  master: { ko: "마스터리그", short: "마스터" },
  great: { ko: "슈퍼리그", short: "슈퍼" },
  ultra: { ko: "하이퍼리그", short: "하이퍼" },
};

type Mon = { id: string; dex: number; ko: string; types: string[]; shadow: boolean; sprite?: string };
type Move = { ko: string; en: string; type: string; kind: string };
const DS = DATA as unknown as { moves: Record<string, Move>; leagues: Record<string, { pokemon: Mon[] }> };
const MON: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON[m.id] = m;
const MOVES = DS.moves;
const spriteUrl = (m?: Mon) =>
  m ? (m.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.dex}.png`) : "";
const nameOf = (id: string) => MON[id]?.ko || id;
const moveKo = (id: string) => MOVES[id]?.ko || id;

type Opp = { id: string; r: number };
type Detail = { id: string; score: number; tier: string; moveset: string[]; counters: Opp[]; wins: Opp[]; scores: number[]; stats: Record<string, number> };
const DET = DETAIL as unknown as Record<string, Detail[]>;
const findDetail = (league: string, id: string) => (DET[league] || []).find((d) => d.id === id);

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};
const TYPE_KO: Record<string, string> = {
  normal: "노말", fire: "불꽃", water: "물", electric: "전기", grass: "풀", ice: "얼음",
  fighting: "격투", poison: "독", ground: "땅", flying: "비행", psychic: "에스퍼", bug: "벌레",
  rock: "바위", ghost: "고스트", dragon: "드래곤", dark: "악", steel: "강철", fairy: "페어리",
};
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a", D: "#64748b" };

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
  const params: { league: string; id: string }[] = [];
  for (const league of Object.keys(LEAGUES))
    for (const d of (DET[league] || []).slice(0, STATIC_TOP)) params.push({ league, id: d.id });
  return params;
}

export function generateMetadata({ params }: { params: { league: string; id: string } }): Metadata {
  const lg = LEAGUES[params.league];
  const d = findDetail(params.league, params.id);
  if (!lg || !d) return { title: "GBL Note" };
  const name = nameOf(d.id);
  const title = `${name} ${lg.ko} 카운터·추천 기술배치 | GBL Note`;
  const description = `포켓몬 GO ${lg.ko}에서 ${name}의 추천 기술배치, 카운터(약점 상대), 잘 잡는 상대, 종족값과 한국 유저 실측 픽률. ${name} 대비법을 확인하세요.`;
  return {
    title,
    description,
    keywords: [`${name} 카운터`, `${name} ${lg.ko}`, `${name} 기술배치`, `${name} 대비`, `포켓몬고 ${name}`, `${lg.ko} ${name}`],
    alternates: { canonical: `/gbl/pokemon/${params.league}/${params.id}` },
    openGraph: {
      title: `${name} ${lg.ko} 카운터·기술배치`,
      description: `${name}의 카운터·추천 기술·실측 픽률`,
      url: `/gbl/pokemon/${params.league}/${params.id}`,
      images: ["/gbl-og.png"],
      type: "article",
    },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

function Sprite({ id, size = 40 }: { id: string; size?: number }) {
  const m = MON[id];
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={spriteUrl(m)} alt={m?.ko || id} width={size} height={size} style={{ imageRendering: "pixelated" }} />;
}

function TypeBadges({ types }: { types: string[] }) {
  return (
    <span style={{ display: "flex", gap: 3 }}>
      {types.map((t) => (
        <span key={t} style={{ fontSize: "0.64rem", fontWeight: 700, color: "#fff", background: TYPE_COLOR[t] || "#94a3b8", padding: "1px 7px", borderRadius: 6 }}>{TYPE_KO[t] || t}</span>
      ))}
    </span>
  );
}

function MoveChip({ id }: { id: string }) {
  const mv = MOVES[id];
  const c = mv ? (TYPE_COLOR[mv.type] || "#64748b") : "#64748b";
  return (
    <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 9px", borderRadius: 10, background: c + "22", color: c, border: `1px solid ${c}55`, whiteSpace: "nowrap" }}>
      {moveKo(id)}
    </span>
  );
}

// 카운터/매치업 상대 카드(상세로 링크). rating = 이 페이지 주인공 기준 배틀 레이팅(500=대등).
function OppRow({ league, id, rating }: { league: string; id: string; rating: number }) {
  const m = MON[id];
  const types = m?.types || [];
  const c1 = TYPE_COLOR[types[0]] || "#cbd5e1";
  const rc = rating >= 500 ? "#16a34a" : "#dc2626";
  return (
    <Link href={`/gbl/pokemon/${league}/${id}`} style={{ textDecoration: "none",
      display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(100deg, ${c1}20, #ffffff 80%)`,
      border: `1px solid ${BORDER}`, borderLeft: `4px solid ${c1}`, borderRadius: 10, padding: "6px 10px" }}>
      <Sprite id={id} size={32} />
      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>{nameOf(id)}</span>
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 800, color: rc, background: rc + "1a", padding: "1px 7px", borderRadius: 8 }} title="배틀 레이팅 (500=대등, 높을수록 이 포켓몬이 유리)">{rating}</span>
        <TypeBadges types={types} />
      </span>
    </Link>
  );
}

export default async function PokemonDetail({ params }: { params: { league: string; id: string } }) {
  const lg = LEAGUES[params.league];
  const d = findDetail(params.league, params.id);
  if (!lg || !d) notFound();

  const m = MON[d.id];
  const types = m?.types || [];
  const c1 = TYPE_COLOR[types[0]] || "#cbd5e1";
  const c2 = TYPE_COLOR[types[1]] || c1;
  const name = nameOf(d.id);
  const pick = await getPickRates(params.league);
  const pr = pick[d.id];

  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
    padding: "1.4rem 1rem 4rem",
  };
  const h2: React.CSSProperties = { fontSize: "1rem", fontWeight: 800, margin: "1.5rem 0 8px", color: "#0f172a" };
  const stat = (label: string, v: number, max: number, color: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: "0.74rem", color: "#64748b", minWidth: 30 }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: "#e5eaf3", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, Math.round((v / max) * 100))}%`, height: "100%", background: color }} />
      </div>
      <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#0f172a", minWidth: 34, textAlign: "right" }}>{v}</span>
    </div>
  );

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Link href="/gbl" style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href={`/gbl/tier/${params.league}`} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>🏆 {lg.short}리그 티어표</Link>
          <Link href={`/gbl/meta/${params.league}`} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>📊 실측 메타</Link>
        </div>

        {/* 헤더 */}
        <div style={{ background: `linear-gradient(110deg, ${c1}2e, ${c2}20 45%, #ffffff 92%)`, border: `1px solid ${BORDER}`, borderLeft: `5px solid ${c1}`, borderRadius: 14, padding: "1rem 1.1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Sprite id={d.id} size={64} />
            <div>
              <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#0f172a" }}>
                {m?.shadow && <span style={{ color: "#7c3aed" }}>그림자 </span>}{name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                <TypeBadges types={types} />
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>· {lg.ko}</span>
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 9, background: TIER_COLOR[d.tier], color: "#fff", fontWeight: 900, fontSize: "1.05rem" }}>{d.tier}</span>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 3 }}>티어 · 점수 {d.score}</div>
            </div>
          </div>
          {pr != null && (
            <div style={{ marginTop: 10, fontSize: "0.82rem", color: "#334155" }}>
              📊 한국 유저 실측 픽률(최근 30일) <b style={{ color: "#3b5bdb" }}>{pr}%</b>
            </div>
          )}
        </div>

        {/* 추천 기술배치 */}
        <h2 style={h2}>추천 기술배치</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px" }}>
          {d.moveset.map((mid) => <MoveChip key={mid} id={mid} />)}
        </div>

        {/* 종족값 */}
        {d.stats && (d.stats.atk || d.stats.def || d.stats.hp) && (
          <>
            <h2 style={h2}>종족값 (전투 스탯)</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 12px" }}>
              {stat("공격", d.stats.atk || 0, 300, "#ef4444")}
              {stat("방어", d.stats.def || 0, 300, "#3b82f6")}
              {stat("체력", d.stats.hp || 0, 250, "#22c55e")}
            </div>
          </>
        )}

        {/* 역할 점수 */}
        {d.scores && d.scores.length === 6 && (
          <>
            <h2 style={h2}>역할 점수</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 12px" }}>
              {["선봉", "마무리", "교체", "차지", "공격", "일관성"].map((lb, i) => (
                <div key={lb} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.74rem", color: "#64748b", minWidth: 34 }}>{lb}</span>
                  <div style={{ flex: 1, height: 8, background: "#e5eaf3", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, d.scores[i])}%`, height: "100%", background: "linear-gradient(90deg,#3b5bdb,#7c3aed)" }} />
                  </div>
                  <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#0f172a", minWidth: 38, textAlign: "right" }}>{d.scores[i]}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 6, lineHeight: 1.6 }}>
              선봉=초반 유리 · 마무리=후반 뒷심 · 교체=스왑 대응 · 차지=차지기술 압박 · 공격=딜링 · 일관성=상성 안정성 (0~100)
            </p>
          </>
        )}

        <AdSlot />

        {/* 카운터 */}
        <h2 style={h2}>🛡️ {name} 카운터 (이 포켓몬에게 강한 상대)</h2>
        <p style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "#64748b" }}>{name}를 상대로 유리한 포켓몬입니다. {name}를 자주 만난다면 아래를 준비하세요.</p>
        {d.counters.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {d.counters.map((c) => <OppRow key={c.id} league={params.league} id={c.id} rating={c.r} />)}
          </div>
        ) : <p style={{ fontSize: "0.82rem", color: "#94a3b8" }}>데이터 없음</p>}

        {/* 잘 잡는 상대 */}
        <h2 style={h2}>⚔️ {name}가 잘 잡는 상대</h2>
        <p style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "#64748b" }}>{name}로 유리하게 상대할 수 있는 포켓몬입니다.</p>
        {d.wins.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {d.wins.map((w) => <OppRow key={w.id} league={params.league} id={w.id} rating={w.r} />)}
          </div>
        ) : <p style={{ fontSize: "0.82rem", color: "#94a3b8" }}>데이터 없음</p>}

        {/* 설명 */}
        <div style={{ marginTop: 22, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>
            {name}는 {lg.ko}에서 <b style={{ color: "#334155" }}>{d.tier}티어</b> 포켓몬입니다. 추천 기술배치는 공개 전투 시뮬레이션(PvPoke) 기준이며, 카운터·잘 잡는 상대는 시뮬 매치업 결과를 바탕으로 정리했습니다.
            실측 픽률은 GBL Note 사용자들이 실제로 만난 상대를 익명 집계한 값으로, 한국 서버에서 {name}를 얼마나 자주 만나는지 보여줍니다.{" "}
            <Link href="/gbl/login" style={{ color: "#3b5bdb", fontWeight: 600 }}>내 전적 기록하기 →</Link>
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
