// 포켓몬별 상세 — 서버렌더(ISR) SEO 페이지.
// PvPoke 오픈데이터(티어·추천기술·카운터·매치업·종족값) + 우리 실측 픽률.
// "[포켓몬] 마스터리그 카운터/기술배치" 검색 타겟 + 시뮬레이터 대체(카운터 조회).
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DATA from "../../../gbl_data.json";
import DETAIL from "../../../gbl_detail.json";
import DETAIL_S28 from "../../../gbl_detail_s28.json";
import PKNAMES from "../../../pokedex_names.json";
import { formDexById } from "../../../sprite";
import MOVENAMES from "../../../pvp_move_names.json";
import AdSlot from "../../../AdSlot";
import CoupangAd from "../../../CoupangAd";
import PokemonShare from "./PokemonShare";
import MovesetShare from "./MovesetShare";
import { type FastOpt, type ChargedOpt } from "./MovesetPanel";
import { PUBLISHED_ANALYSIS } from "../../../iv/analysis/published";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../../../lib/i18n";
import { leagueName, leagueShort, localName } from "../../../contentI18n";
import JsonLd from "../../../JsonLd";
import { typeLabel } from "../../../typeLabels";
import { getPoke } from "./dict";
import { buildAnalysis, HEADINGS } from "./analysis";

export const revalidate = 600;
const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const STATIC_TOP = 20; // 리그별 상위 N종 사전생성(+sitemap). 나머지는 링크 시 온디맨드.

// 메가 리그(s28+)는 gbl_detail_s28.json에서만 존재 → DET에 병합. 코어 3리그는 기존 gbl_detail(s27).
const LEAGUE_KEYS = ["master", "great", "ultra", "great_mega", "ultra_mega", "master_mega"];

type Mon = { id: string; dex: number; ko: string; types: string[]; shadow: boolean; sprite?: string };
type Move = { ko: string; en: string; ja?: string; type: string; kind: string };
const DS = DATA as unknown as { moves: Record<string, Move>; leagues: Record<string, { pokemon: Mon[] }> };
const MON: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON[m.id] = m;
const MOVES = DS.moves;
const spriteUrl = (m?: Mon) =>
  m ? (m.sprite || `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${m.dex}.png`) : "";
const nameOf = (id: string) => MON[id]?.ko || id;
const zhMon = (dex?: number) => dex != null ? (PKNAMES as Record<string, Record<string, string>>)[String(dex)]?.["zh-TW"] : undefined;
// 데이터 엔트리에 zh-TW 이름이 없어 dex로 pokedex_names에서 보완.
const dispName = (lang: Locale, d: { id: string; ko?: string; en?: string; ja?: string; dex?: number }, prefix = "") => {
  if (lang === "zh-TW") { const zh = zhMon(d.dex); if (zh) return prefix + zh; }
  return localName(lang, d, prefix + nameOf(d.id));
};
// 로케일별 기술명 (ko/en/ja/zh-TW) — zh-TW는 pvp_move_names(id)로 보완.
// _PLUS = PvPoke 강화기술 변형(기존 기술명 데이터에 없음) → 기본 기술명 + "+"로 표기.
const baseMoveId = (id: string) => (MOVES[id] ? id : id.replace(/_PLUS$/, ""));
const MNAMES = MOVENAMES as Record<string, Record<string, string>>;
const moveLabel = (lang: Locale, id: string) => {
  const bid = baseMoveId(id);
  const plus = bid !== id ? "+" : "";
  const mv = MOVES[bid];
  if (mv) {
    if (lang === "zh-TW") return (MNAMES[bid]?.["zh-TW"] || mv.en || mv.ko) + plus;
    return (lang === "ko" ? mv.ko : lang === "ja" ? (mv.ja || mv.en || mv.ko) : (mv.en || mv.ko)) + plus;
  }
  // gbl_data 미보유 기술(볼트태클 등) → pvp_move_names 4개국어 폴백.
  const mn = MNAMES[bid];
  if (mn) return ((lang === "en" ? mn.en : lang === "ja" ? mn.ja : lang === "zh-TW" ? mn["zh-TW"] : mn.ko) || mn.en || mn.ko || id) + plus;
  return id;
};
// 공유 카드 스프라이트용 dex — 화면과 동일 소스(m.sprite 폼 dex) 우선.
// 그림자(_shadow) 등 MON 미등록이면 기본형 dex로 폴백(그림자는 기본형 스프라이트+아우라).
const spriteDexOf = (id: string, fallbackDex?: number) => {
  const m = MON[id];
  const mt = spriteUrl(m).match(/(\d+)\.png/);
  if (mt) return mt[1];
  const base = MON[id.replace(/_shadow$/, "")];
  // 메가/원시 등 MON 미등록 상대(공유카드 이기는/지는 상대)는 상세 인덱스(NAMEIDX)의 dex로 폼 해석.
  const dex = m?.dex || base?.dex || NAMEIDX[id]?.dex || fallbackDex || 0;
  return String(formDexById(id, dex));
};
// 한글 조사 자동 선택(받침 유무). 이름이 자음으로 끝나면(자시안) 은/을, 모음이면(가이오가) 는/를.
const hasBatchim = (w: string) => { const c = (w || "").trim().slice(-1).charCodeAt(0); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; };
const eunNeun = (w: string) => (hasBatchim(w) ? "은" : "는");

type Opp = { id: string; r: number };
type Mv = { fast: { id: string; gain: number; turns: number }; charged: { id: string; energy: number; counts: number[] }[];
  fasts?: { id: string; gain: number; turns: number }[]; chargedAll?: { id: string; energy: number }[] };
type Detail = { id: string; score: number; tier: string; moveset: string[]; mv: Mv | null; counters: Opp[]; wins: Opp[]; scores: number[]; stats: Record<string, number>; ko?: string; en?: string; ja?: string; dex?: number; types?: string[] };
const DET = { ...(DETAIL as unknown as Record<string, Detail[]>) };
// 메가 3리그는 s28 스냅샷에서 병합(코어 리그는 s27 유지).
for (const k of ["great_mega", "ultra_mega", "master_mega"])
  DET[k] = (DETAIL_S28 as unknown as Record<string, Detail[]>)[k] || [];
const findDetail = (league: string, id: string) => (DET[league] || []).find((d) => d.id === id);
// 상대(카운터/이기는 상대) id → 로케일별 이름. 상세 엔트리(ko/en/ja 보유)를 전 리그에서 인덱싱.
const NAMEIDX: Record<string, { ko?: string; en?: string; ja?: string; dex?: number }> = {};
for (const arr of Object.values(DET)) for (const e of arr) if (!NAMEIDX[e.id]) NAMEIDX[e.id] = { ko: e.ko, en: e.en, ja: e.ja, dex: e.dex };
const locName = (lang: Locale, id: string) => {
  const e = NAMEIDX[id];
  if (lang === "zh-TW") { const zh = zhMon(e?.dex ?? MON[id]?.dex); if (zh) return zh; }
  if (e && (e.ko || e.en || e.ja)) return localName(lang, e, MON[id]?.ko || id);
  return MON[id]?.ko || id;
};

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a", D: "#64748b" };

type Meta = { total: number; top_mons: { speciesId: string; count: number }[] };
type MetaInfo = { rate: Record<string, number>; rank: Record<string, number> };
async function getMetaInfo(league: string): Promise<MetaInfo> {
  try {
    const res = await fetch(`${BASE}/api/gbl/meta?league=${league}&days=30`, { next: { revalidate: 3600 } });
    if (!res.ok) return { rate: {}, rank: {} };
    const m = (await res.json()) as Meta;
    const rate: Record<string, number> = {};
    const rank: Record<string, number> = {};
    if (m.total > 0) {
      m.top_mons.forEach((mm, i) => {
        rate[mm.speciesId] = Math.round((mm.count / m.total) * 100);
        rank[mm.speciesId] = i + 1;
      });
    }
    return { rate, rank };
  } catch {
    return { rate: {}, rank: {} };
  }
}

export function generateStaticParams() {
  const params: { league: string; id: string }[] = [];
  for (const league of LEAGUE_KEYS)
    for (const d of (DET[league] || []).slice(0, STATIC_TOP)) params.push({ league, id: d.id });
  return params;
}

export function generateMetadata({ params }: { params: { lang: string; league: string; id: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const d = findDetail(params.league, params.id);
  if (!LEAGUE_KEYS.includes(params.league) || !d) return { title: "GBL Note" };
  const lgName = leagueName(lang, params.league);
  const name = dispName(lang, d);
  const pk = getPoke(lang);
  const path = `/gbl/pokemon/${params.league}/${params.id}`;
  return {
    title: `${name} ${lgName} ${pk.metaTitle.replace(" | GBL Note", "")} | GBL Note`,
    description: `${name} · ${lgName} — ${pk.metaDesc}`,
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    openGraph: {
      title: `${name} ${lgName} ${pk.ogTitleSuffix}`,
      description: `${name} · ${pk.ogDescSuffix}`,
      url: localizePath(lang, path),
      images: ["/gbl-og.png"],
      type: "article",
    },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

function Sprite({ id, size = 40 }: { id: string; size?: number }) {
  const m = MON[id];
  // 메가 등 MON 미등록 상대는 상세 인덱스(NAMEIDX)의 dex + 폼 보정으로 스프라이트 해석.
  const dex = m?.dex ?? NAMEIDX[id]?.dex;
  const src = spriteUrl(m) || (dex ? `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${formDexById(id, dex)}.png` : "");
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={m?.ko || id} width={size} height={size} style={{ imageRendering: "pixelated" }} />;
}

function TypeBadges({ lang, types }: { lang: Locale; types: string[] }) {
  return (
    <span style={{ display: "flex", gap: 3 }}>
      {types.map((t) => (
        <span key={t} style={{ fontSize: "0.64rem", fontWeight: 700, color: "#fff", background: TYPE_COLOR[t] || "#94a3b8", padding: "1px 7px", borderRadius: 6 }}>{typeLabel(lang, t)}</span>
      ))}
    </span>
  );
}

function MoveChip({ lang, id }: { lang: Locale; id: string }) {
  const mv = MOVES[baseMoveId(id)];
  const c = mv ? (TYPE_COLOR[mv.type] || "#64748b") : "#64748b";
  return (
    <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 9px", borderRadius: 10, background: c + "22", color: c, border: `1px solid ${c}55`, whiteSpace: "nowrap" }}>
      {moveLabel(lang, id)}
    </span>
  );
}

// 카운터/매치업 상대 카드(상세로 링크). rating = 이 페이지 주인공 기준 배틀 레이팅(500=대등).
function OppRow({ lang, league, id, rating, ratingTitle }: { lang: Locale; league: string; id: string; rating: number; ratingTitle: string }) {
  const m = MON[id];
  const types = m?.types || [];
  const c1 = TYPE_COLOR[types[0]] || "#cbd5e1";
  const rc = rating >= 500 ? "#16a34a" : "#dc2626";
  return (
    <Link href={localizePath(lang, `/gbl/pokemon/${league}/${id}`)} style={{ textDecoration: "none",
      display: "flex", alignItems: "center", gap: 8, background: `linear-gradient(100deg, ${c1}20, #ffffff 80%)`,
      border: `1px solid ${BORDER}`, borderLeft: `4px solid ${c1}`, borderRadius: 10, padding: "6px 10px" }}>
      <Sprite id={id} size={32} />
      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>{locName(lang, id)}</span>
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 800, color: rc, background: rc + "1a", padding: "1px 7px", borderRadius: 8 }} title={ratingTitle}>{rating}</span>
        <TypeBadges lang={lang} types={types} />
      </span>
    </Link>
  );
}

export default async function PokemonDetail({ params }: { params: { lang: string; league: string; id: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const d = findDetail(params.league, params.id);
  if (!LEAGUE_KEYS.includes(params.league) || !d) notFound();

  const pk = getPoke(lang);
  const L = (p: string) => localizePath(lang, p);
  const lgName = leagueName(lang, params.league);
  const m = MON[d.id];
  const isShadow = d.id.endsWith("_shadow");
  const types = (d.types && d.types.length) ? d.types : (m?.types || []);
  const hdex = d.dex || m?.dex;
  const c1 = TYPE_COLOR[types[0]] || "#cbd5e1";
  const c2 = TYPE_COLOR[types[1]] || c1;
  const name = dispName(lang, d, isShadow ? (lang === "zh-TW" ? "暗影 " : "그림자 ") : "");
  const info = await getMetaInfo(params.league);
  const pr = info.rate[d.id];

  // ── 데이터 파생 분석문(포켓몬별 분기) ──
  const rankTag = (r: number) => lang === "en" ? `#${r}` : lang === "ja" ? `${r}位` : lang === "zh-TW" ? `第${r}名` : `${r}위`;
  // 이 몬이 유리한 매치업(d.wins) 중 실측 사용률 상위(≤25위)인 상대 = 실측 결합 강점 근거
  const metaWins = d.wins
    .filter((w) => info.rank[w.id] != null && info.rank[w.id] <= 25)
    .sort((a, b) => info.rank[a.id] - info.rank[b.id])
    .slice(0, 3)
    .map((w) => `${locName(lang, w.id)}(${rankTag(info.rank[w.id])})`);
  const beatsNames = metaWins.length ? metaWins.join(" · ") : undefined;
  // 폴백(실측 상위 유리상대 없을 때) — 픽률 ≥5% 잡는 단일 상대
  let beatsMetaName: string | undefined, beatsMetaPct: number | undefined;
  if (!beatsNames) for (const w of d.wins) {
    const rp = info.rate[w.id];
    if (rp != null && rp >= 5 && (beatsMetaPct == null || rp > beatsMetaPct)) { beatsMetaPct = rp; beatsMetaName = locName(lang, w.id); }
  }
  // 이론 순위 = 리그 score 정렬 리스트(DET)에서의 위치(1-base). 실측 순위와 괴리 수치화용.
  const theoryIdx = (DET[params.league] || []).findIndex((x) => x.id === d.id);
  const topCounter = d.counters[0];
  const analysis = buildAnalysis({
    lang, leagueName: lgName, tier: d.tier, scores: d.scores || [], types,
    atk: d.stats?.atk || 0, def: d.stats?.def || 0, hp: d.stats?.hp || 0,
    pickRate: pr, pickRank: info.rank[d.id], theoryRank: theoryIdx >= 0 ? theoryIdx + 1 : undefined,
    topCounterName: topCounter ? locName(lang, topCounter.id) : undefined,
    topCounterRank: topCounter && info.rank[topCounter.id] != null && info.rank[topCounter.id] <= 30 ? info.rank[topCounter.id] : undefined,
    beatsMetaName, beatsMetaPct, beatsNames,
  });
  const aH = HEADINGS[lang] || HEADINGS.en;
  const aTitle = lang === "en" ? "GBL Note Analysis" : lang === "ja" ? "GBL Note 分析" : lang === "zh-TW" ? "GBL Note 分析" : "GBL Note 분석";
  const hasAnalysis = analysis.strengths.length > 0 || analysis.weaknesses.length > 0 || !!analysis.verdict;
  const ratingTitle = lang === "en" ? "Battle rating (500=even, higher = this Pokémon favored)"
    : lang === "ja" ? "バトルレーティング(500=互角、高いほどこのポケモンが有利)"
    : lang === "zh-TW" ? "對戰評分（500=均勢，越高代表這隻寶可夢越有利）"
    : "배틀 레이팅 (500=대등, 높을수록 이 포켓몬이 유리)";

  // CMP(공격력 우선권): 이 리그 상위종을 공격력순 정렬 → 내 위/아래 이웃(가까운 상대가 실전 관건)

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

  const SITE = "https://gblnote.com";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GBL Note", item: SITE + L("/gbl") },
      { "@type": "ListItem", position: 2, name: lgName, item: SITE + L(`/gbl/tier/${params.league}`) },
      { "@type": "ListItem", position: 3, name, item: SITE + L(`/gbl/pokemon/${params.league}/${params.id}`) },
    ],
  };
  return (
    <div style={wrap}>
      <JsonLd data={breadcrumbJsonLd} />
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href={L(`/gbl/tier/${params.league}`)} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>{pk.navTier}</Link>
          <Link href={L(`/gbl/cmp/${params.league}`)} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>{pk.navCmp}</Link>
          <Link href={L(`/gbl/meta/${params.league}`)} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>{pk.navMeta}</Link>
        </div>

        {/* 헤더 */}
        <div style={{ background: `linear-gradient(110deg, ${c1}2e, ${c2}20 45%, #ffffff 92%)`, border: `1px solid ${BORDER}`, borderLeft: `5px solid ${c1}`, borderRadius: 14, padding: "1rem 1.1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 64, height: 64, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              ...(isShadow ? { background: "radial-gradient(circle, #a855f7ee 0%, #7c3aed99 42%, transparent 72%)", borderRadius: "50%" } : {}) }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={spriteUrl(m) || (hdex ? `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${formDexById(d.id, hdex)}.png` : "")} alt={name} width={64} height={64} style={{ imageRendering: "pixelated" }} />
            </span>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#0f172a" }}>
                {name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                <TypeBadges lang={lang} types={types} />
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>· {lgName}</span>
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 9, background: TIER_COLOR[d.tier], color: "#fff", fontWeight: 900, fontSize: "1.05rem" }}>{d.tier}</span>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: 3 }}>{pk.tierScore} {d.score}</div>
            </div>
          </div>
          {pr != null && (
            <div style={{ marginTop: 10, fontSize: "0.82rem", color: "#334155" }}>
              {pk.pickRate} <b style={{ color: "#3b5bdb" }}>{pr}%</b>
            </div>
          )}
        </div>

        {/* 타협개체 심층 분석 링크 — 발행된 몬만(독창 콘텐츠 발견 경로) */}
        {PUBLISHED_ANALYSIS.has(d.id) && (
          <Link href={L(`/gbl/iv/${d.id}`)} style={{ display: "block", marginTop: 12, textDecoration: "none",
            background: "linear-gradient(90deg,#eef2ff,#faf5ff)", border: "1px solid #dcd7fb", borderRadius: 12, padding: "0.75rem 1rem" }}>
            <div style={{ fontSize: "0.86rem", fontWeight: 800, color: "#3b2fb7" }}>
              {lang === "en" ? "🔬 How far can you build this Pokémon's compromise IVs?"
                : lang === "ja" ? "🔬 このポケモンの妥協個体、どこまで育成OK？"
                : lang === "zh-TW" ? "🔬 這隻寶可夢的妥協個體能養到哪？"
                : "🔬 이 포켓몬, 타협 개체값 어디까지 키워도 될까?"}
            </div>
            <div style={{ fontSize: "0.76rem", color: "#6d5fc0", marginTop: 3, fontWeight: 600 }}>
              {lang === "en" ? "See the full top-100 sim analysis (CMP · Best Buddy · matchups) →"
                : lang === "ja" ? "上位100種フルシミュ分析を見る（CMP・ベストパートナー・相性）→"
                : lang === "zh-TW" ? "查看前100名完整模擬分析（CMP·最佳夥伴·對戰）→"
                : "상위 100종 전수 시뮬 분석 보기 (CMP·베스트파트너·매치업) →"}
            </div>
          </Link>
        )}

        {/* 데이터 파생 분석 — 강점/약점/평가 3구조(크롤러가 분석 문서로 인식) */}
        {hasAnalysis && (
          <div style={{ marginTop: 14, background: `linear-gradient(180deg, ${c1}0d, #ffffff 60%)`, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.9rem 1.05rem" }}>
            <h2 style={{ margin: "0 0 6px", fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>{aTitle}</h2>
            {analysis.strengths.length > 0 && (
              <>
                <h3 style={{ margin: "10px 0 4px", fontSize: "0.86rem", fontWeight: 800, color: "#15803d" }}>✔ {aH.strengths}</h3>
                <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.84rem", color: "#334155", lineHeight: 1.75 }}>
                  {analysis.strengths.map((s, i) => <li key={i} style={{ marginBottom: 3 }}>{s}</li>)}
                </ul>
              </>
            )}
            {analysis.weaknesses.length > 0 && (
              <>
                <h3 style={{ margin: "12px 0 4px", fontSize: "0.86rem", fontWeight: 800, color: "#b45309" }}>⚠ {aH.weaknesses}</h3>
                <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.84rem", color: "#334155", lineHeight: 1.75 }}>
                  {analysis.weaknesses.map((s, i) => <li key={i} style={{ marginBottom: 3 }}>{s}</li>)}
                </ul>
              </>
            )}
            {analysis.verdict && (
              <>
                <h3 style={{ margin: "12px 0 4px", fontSize: "0.86rem", fontWeight: 800, color: "#3b5bdb" }}>{aH.verdict}</h3>
                <p style={{ margin: 0, fontSize: "0.84rem", color: "#334155", lineHeight: 1.8 }}>{analysis.verdict}</p>
              </>
            )}
            <Link href={L("/gbl/guide/pogo-pvp-calc")} style={{ display: "inline-block", marginTop: 10, fontSize: "0.76rem", color: "#3b5bdb", fontWeight: 700, textDecoration: "none" }}>
              {lang === "en" ? "How GO calculates type & damage →" : lang === "ja" ? "GOのタイプ・ダメージ計算 →" : lang === "zh-TW" ? "GO的屬性·傷害計算 →" : "GO 타입 배율·데미지 계산법 →"}
            </Link>
          </div>
        )}

        {/* 공유/저장 카드 + 추천 기술배치 — 빠른기술 선택 상태 공유(패널서 바꾸면 카드도 갱신) */}
        {(() => {
          const cardStyle = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 12px" } as const;
          const shareBase = {
            name, dex: spriteDexOf(d.id, hdex), shadow: d.id.endsWith("_shadow"),
            types: types.map((t) => ({ label: typeLabel(lang, t), color: TYPE_COLOR[t] || "#94a3b8" })),
            tier: d.tier, tierColor: TIER_COLOR[d.tier], league: lgName, pickRate: pr, accent: c1,
            stats: { atk: d.stats?.atk || 0, def: d.stats?.def || 0, hp: d.stats?.hp || 0 }, t: pk.share,
            wins: d.wins.slice(0, 5).map((c) => ({ dex: spriteDexOf(c.id), name: locName(lang, c.id), rating: c.r })),
            counters: d.counters.slice(0, 5).map((c) => ({ dex: spriteDexOf(c.id), name: locName(lang, c.id), rating: c.r })),
            path: `/gbl/pokemon/${params.league}/${params.id}`,
          };
          if (!d.mv) return (
            <>
              <PokemonShare {...shareBase} fastMove={d.moveset[0] ? moveLabel(lang, d.moveset[0]) : undefined}
                chargedMoves={d.moveset.slice(1).map((mid) => ({ name: moveLabel(lang, mid) }))} />
              <h2 style={h2}>{pk.movesetH}</h2>
              <div style={cardStyle}><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{d.moveset.map((mid) => <MoveChip key={mid} lang={lang} id={mid} />)}</div></div>
            </>
          );
          const disp = (mid: string) => { const mm = MOVES[baseMoveId(mid)]; return { id: mid, label: moveLabel(lang, mid), color: mm ? (TYPE_COLOR[mm.type] || "#64748b") : "#94a3b8" }; };
          const recCharged = new Set(d.mv.charged.map((c) => c.id));
          const fastsRaw = d.mv.fasts && d.mv.fasts.length ? d.mv.fasts : [d.mv.fast];
          const fasts: FastOpt[] = fastsRaw.map((f) => ({ ...disp(f.id), gain: f.gain, turns: f.turns }));
          const chRaw = d.mv.chargedAll && d.mv.chargedAll.length ? d.mv.chargedAll : d.mv.charged.map((c) => ({ id: c.id, energy: c.energy }));
          const charged: ChargedOpt[] = chRaw.map((c) => ({ ...disp(c.id), energy: c.energy, rec: recCharged.has(c.id) }));
          return <MovesetShare share={shareBase} fasts={fasts} charged={charged} defaultFastId={d.mv.fast.id}
            movesetH={pk.movesetH} h2Style={h2} cardStyle={cardStyle}
            panelLabels={{ fastLabel: pk.fastLabel, chargedHint: pk.chargedHint, energyUnit: pk.energyUnit, hitsUnit: pk.hitsUnit, fastTurns: pk.fastTurns, recTag: pk.recTag, altFastHint: pk.altFastHint }} />;
        })()}

        {/* 카운터 (이 포켓몬에게 강한 상대) — 상단 배치 */}
        <h2 style={h2}>{pk.countersH}</h2>
        <p style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "#64748b" }}>{pk.countersP}</p>
        {d.counters.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {d.counters.map((c) => <OppRow key={c.id} lang={lang} league={params.league} id={c.id} rating={c.r} ratingTitle={ratingTitle} />)}
          </div>
        ) : <p style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{pk.noData}</p>}

        {/* 잘 잡는 상대 */}
        <h2 style={h2}>{pk.winsH}</h2>
        <p style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "#64748b" }}>{pk.winsP}</p>
        {d.wins.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {d.wins.map((w) => <OppRow key={w.id} lang={lang} league={params.league} id={w.id} rating={w.r} ratingTitle={ratingTitle} />)}
          </div>
        ) : <p style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{pk.noData}</p>}

        {/* 종족값 */}
        {d.stats && (d.stats.atk || d.stats.def || d.stats.hp) && (
          <>
            <h2 style={h2}>{pk.statsH}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 12px" }}>
              {stat(pk.atk, d.stats.atk || 0, 300, "#ef4444")}
              {stat(pk.def, d.stats.def || 0, 300, "#3b82f6")}
              {stat(pk.hp, d.stats.hp || 0, 250, "#22c55e")}
            </div>
          </>
        )}

        {/* 역할 점수 */}
        {d.scores && d.scores.length === 6 && (
          <>
            <h2 style={h2}>{pk.rolesH}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 12px" }}>
              {pk.roles.map((lb, i) => (
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
              {pk.rolesNote}
            </p>
          </>
        )}

        <AdSlot />

        {/* 설명 */}
        <div style={{ marginTop: 22, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>
            {lang === "ko" ? (
              <>
                {name}{eunNeun(name)} {lgName}에서 <b style={{ color: "#334155" }}>{d.tier}티어</b> 포켓몬입니다. {pk.explainer}{" "}
              </>
            ) : (
              <>
                <b style={{ color: "#334155" }}>{name}</b> — {lgName} {d.tier}{pk.explainerTierWord}. {pk.explainer}{" "}
              </>
            )}
            <Link href={L("/gbl/login")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{pk.recordLink}</Link>
          </p>
        </div>

        <CoupangAd />

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{pk.privacy}</Link>
        </div>
      </div>
    </div>
  );
}
