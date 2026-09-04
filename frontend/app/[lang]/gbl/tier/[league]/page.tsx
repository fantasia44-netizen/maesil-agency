// 리그별 티어표 — 서버렌더(ISR) SEO 페이지.
// PvPoke 오픈데이터(티어·추천 기술배치) + 우리 실측 픽률 결합. master/great/ultra 공용.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DATA from "../../gbl_data.json";
import DETAIL from "../../gbl_detail.json";
import DETAIL_S28 from "../../gbl_detail_s28.json";
import PKNAMES from "../../pokedex_names.json";
import MOVENAMES from "../../pvp_move_names.json";
import AdSlot from "../../AdSlot";
import ListShare from "../../ListShare";
import { GUIDE_CHIP } from "../../guideLinks";
import CoupangAd from "../../CoupangAd";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../../lib/i18n";
import { leagueName, localName } from "../../contentI18n";
import { typeLabel } from "../../typeLabels";
import { getDict } from "../../dictionaries";
import { getTier } from "./dict";
import { tierAnalysis } from "../../leagueAnalysis";
import { currentSeason, seasonBySlug, selectableSeasons, seasonShort, statusOf } from "../../seasons";
import { formDexById } from "../../sprite";

export const revalidate = 600;

// 시즌별 티어 상세(스냅샷). 새 시즌 스냅샷은 gbl_compile_detail.py로 생성 후 여기에 등록.
const DETAIL_BY_SLUG: Record<string, unknown> = { s27: DETAIL, s28: DETAIL_S28 };
const TIER_SEASON_SLUGS = Object.keys(DETAIL_BY_SLUG);
// 요청 시즌 해석 — searchParams.s(유효한 티어 시즌만), 기본=현재 시즌.
function resolveSeason(s?: string) {
  const sel = seasonBySlug(s);
  if (sel && TIER_SEASON_SLUGS.includes(sel.slug)) return sel;
  const cur = currentSeason();
  return TIER_SEASON_SLUGS.includes(cur.slug) ? cur : (seasonBySlug(TIER_SEASON_SLUGS[0]) ?? cur);
}

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const LEAGUES: Record<string, { ko: string; short: string }> = {
  master: { ko: "마스터리그", short: "마스터" },
  great: { ko: "슈퍼리그", short: "슈퍼" },
  ultra: { ko: "하이퍼리그", short: "하이퍼" },
  great_mega: { ko: "슈퍼리그 (메가)", short: "슈퍼 메가" },
  ultra_mega: { ko: "하이퍼리그 (메가)", short: "하이퍼 메가" },
  master_mega: { ko: "마스터리그 (메가)", short: "마스터 메가" },
};
const CORE_KEYS = ["great", "ultra", "master"];
const MEGA_KEYS = ["great_mega", "ultra_mega", "master_mega"];
const isMegaLeague = (lg: string) => lg.endsWith("_mega");

type Mon = { id: string; dex: number; ko: string; types: string[]; shadow: boolean; sprite?: string };
type Move = { ko: string; en: string; ja?: string; type: string; kind: string };
const DS = DATA as unknown as { moves: Record<string, Move>; leagues: Record<string, { pokemon: Mon[] }> };
const MON: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON[m.id] = m;
const MOVES = DS.moves;
const spriteUrl = (m?: Mon) =>
  m ? (m.sprite || `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${m.dex}.png`) : "";
const nameOf = (id: string) => MON[id]?.ko || id;
// zh-TW 포켓몬명 — 데이터 엔트리에 zh-TW 필드가 없어 dex로 pokedex_names에서 보완.
const dispNameOf = (lang: Locale, d: { id: string; ko?: string; en?: string; ja?: string; dex?: number }, prefix = "") => {
  if (lang === "zh-TW") {
    const zh = d.dex != null ? (PKNAMES as Record<string, Record<string, string>>)[String(d.dex)]?.["zh-TW"] : undefined;
    if (zh) return prefix + zh;
  }
  return localName(lang, d, prefix + nameOf(d.id));
};
// 기술명 로케일별 (ko/en/ja/zh-TW) — zh-TW는 pvp_move_names(id)로 보완.
// _PLUS = PvPoke 강화기술 변형(기존 기술명 데이터에 없음) → 기본 기술명 + "+"로 표기.
const baseMoveId = (id: string) => (MOVES[id] ? id : id.replace(/_PLUS$/, ""));
const MNAMES = MOVENAMES as Record<string, Record<string, string>>;
const moveLabel = (lang: Locale, id: string) => {
  const bid = baseMoveId(id);
  const plus = bid !== id ? "+" : "";
  const m = MOVES[bid];
  if (m) {
    if (lang === "zh-TW") return (MNAMES[bid]?.["zh-TW"] || m.en || m.ko) + plus;
    return (lang === "en" ? (m.en || m.ko) : lang === "ja" ? (m.ja || m.en || m.ko) : m.ko) + plus;
  }
  // gbl_data 미보유 기술(볼트태클 등) → pvp_move_names 4개국어 폴백.
  const mn = MNAMES[bid];
  if (mn) return ((lang === "en" ? mn.en : lang === "ja" ? mn.ja : lang === "zh-TW" ? mn["zh-TW"] : mn.ko) || mn.en || mn.ko || id) + plus;
  return id;
};

type Detail = { id: string; score: number; tier: string; moveset: string[]; counters: string[]; wins: string[]; stats: Record<string, number>; ko?: string; dex?: number; types?: string[] };

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a", D: "#64748b" };
// 비현재 시즌 안내(미리보기/이전) — 4개국어
const SEASON_NOTE: Record<string, Record<string, string>> = {
  preview: { ko: "미리보기", en: "Preview", ja: "プレビュー", "zh-TW": "預覽" },
  archive: { ko: "이전 시즌", en: "Past season", ja: "過去シーズン", "zh-TW": "過去賽季" },
};

type Meta = { total: number; top_mons: { speciesId: string; count: number }[] };
// 실측 픽률 — 현재 시즌은 최근 30일, 비현재(아카이브/미리보기)는 그 시즌 날짜범위(미래 시즌=빈값).
async function getPickRates(league: string, season: { start: string; end: string }, isCurrent: boolean): Promise<Record<string, number>> {
  try {
    const scope = isCurrent
      ? `days=30`
      : `start=${encodeURIComponent(`${season.start}T00:00:00+09:00`)}&end=${encodeURIComponent(`${season.end}T23:59:59+09:00`)}`;
    const res = await fetch(`${BASE}/api/gbl/meta?league=${league}&${scope}`, { next: { revalidate: 3600 } });
    if (!res.ok) return {};
    const m = (await res.json()) as Meta;
    const out: Record<string, number> = {};
    if (m.total > 0) for (const mm of m.top_mons) out[mm.speciesId] = Math.round((mm.count / m.total) * 100);
    return out;
  } catch {
    return {};
  }
}

// 빌드 프리렌더 안 함 — layout force-dynamic로 런타임 SSR되므로 프리렌더 HTML은 버려짐(낭비).
// 각 프리렌더가 백엔드를 호출 → 배포 지연 원인. 온디맨드 SSR로 대체(dynamicParams 기본 true).
export function generateStaticParams() {
  return [] as { league: string }[];
}

export function generateMetadata({ params, searchParams }: { params: { lang: string; league: string }; searchParams?: { s?: string } }): Metadata {
  if (!LEAGUES[params.league]) return { title: "GBL Note" };
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const lgName = leagueName(lang, params.league);
  const t = getTier(lang);
  const season = resolveSeason(searchParams?.s);
  const isCurrent = season.slug === currentSeason().slug;
  const seasonTag = isCurrent ? "" : ` (${seasonShort(season, lang)})`;
  // 캐노니컬은 항상 현재 시즌(파라미터 없는 URL). 비현재(미리보기/아카이브)는 색인 제외로 중복 방지.
  return {
    title: `${lgName} ${t.metaTitle}${seasonTag}`,
    description: `${lgName} ${t.metaDesc}`,
    alternates: { canonical: localizePath(lang, `/gbl/tier/${params.league}`), languages: hreflangLanguages(`/gbl/tier/${params.league}`) },
    ...(isCurrent ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title: `${lgName} ${t.ogTitle}`,
      description: `${lgName} ${t.ogDesc}`,
      url: localizePath(lang, `/gbl/tier/${params.league}`),
      images: [`https://gblnote.com${localizePath(lang, `/gbl/tier/${params.league}/opengraph-image`)}`],
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

function MoveChip({ id, lang }: { id: string; lang: Locale }) {
  const mv = MOVES[baseMoveId(id)];
  const c = mv ? (TYPE_COLOR[mv.type] || "#64748b") : "#64748b";
  return (
    <span style={{ fontSize: "0.68rem", fontWeight: 600, padding: "1px 7px", borderRadius: 10, background: c + "22", color: c, border: `1px solid ${c}55`, whiteSpace: "nowrap" }}>
      {moveLabel(lang, id)}
    </span>
  );
}

export default async function TierPage({ params, searchParams }: { params: { lang: string; league: string }; searchParams?: { s?: string } }) {
  if (!LEAGUES[params.league]) notFound();
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getTier(lang);
  const lgName = leagueName(lang, params.league);
  const L = (p: string) => localizePath(lang, p);

  // 시즌 해석 + 해당 시즌 티어 상세 선택
  // 메가 리그는 s28+ 스냅샷에만 존재 → 항상 s28 데이터·시즌 고정(시즌 선택기 비노출).
  const isMega = isMegaLeague(params.league);
  const season = isMega ? (seasonBySlug("s28") ?? currentSeason()) : resolveSeason(searchParams?.s);
  const seasonDet = (isMega ? DETAIL_S28 : (DETAIL_BY_SLUG[season.slug] || DETAIL)) as Record<string, Detail[]>;
  // 상세페이지 링크에 시즌 전달(코어 리그 비현재 시즌) — 상세도 같은 시즌 데이터로 맞춤. 메가는 상세가 항상 s28.
  const detQ = (!isMega && season.slug !== currentSeason().slug) ? `?s=${season.slug}` : "";
  const seasons = selectableSeasons(TIER_SEASON_SLUGS);
  const list = (seasonDet[params.league] || []).slice(0, 100);  // 티어표는 상위 100종(CMP·조회는 200종까지)
  const pick = await getPickRates(params.league, season, season.slug === currentSeason().slug);
  const TIERS = ["S", "A", "B", "C", "D"];
  const byTier: Record<string, Detail[]> = {};
  for (const t of TIERS) byTier[t] = [];
  for (const d of list) (byTier[d.tier] || (byTier[d.tier] = [])).push(d);

  // 데이터 파생 리그 분석(티어 분포 + 이론vs실측 괴리)
  const byId: Record<string, Detail> = {};
  for (const d of list) byId[d.id] = d;
  const nameById = (id: string) => (byId[id] ? dispNameOf(lang, byId[id]) : (MON[id]?.ko || id));
  const tierText = tierAnalysis(lang, lgName, list, pick, nameById);

  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
    padding: "1.4rem 1rem 4rem",
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href={L("/gbl/raid")} style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>{t.navRaid}</Link>
          <Link href={L(`/gbl/cmp/${params.league}`)} style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{t.navCmp}</Link>
          <Link href={L(`/gbl/meta/${params.league}`)} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{t.navMeta}</Link>
        </div>

        {/* 리그 크로스링크 — 코어 3리그 + 메가 3리그(별도 행) */}
        {[CORE_KEYS, MEGA_KEYS].map((group, gi) => (
          <div key={gi} style={{ display: "flex", gap: 6, marginBottom: gi === 0 ? 6 : 12, flexWrap: "wrap", alignItems: "center" }}>
            {gi === 1 && <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#fff", background: "linear-gradient(90deg,#db2777,#7c3aed)", borderRadius: 8, padding: "3px 8px" }}>MEGA</span>}
            {group.map((k) => {
              const on = k === params.league;
              const megaOn = gi === 1;
              return (
                <Link key={k} href={L(`/gbl/tier/${k}`)}
                  style={{ padding: "6px 13px", borderRadius: 16, fontSize: "0.8rem", fontWeight: 700, textDecoration: "none",
                    border: `1px solid ${on ? (megaOn ? "#a855f7" : "#4f8cff") : BORDER}`,
                    background: on ? (megaOn ? "rgba(168,85,247,.16)" : "rgba(79,140,255,.16)") : CARD,
                    color: on ? (megaOn ? "#7c3aed" : "#3b5bdb") : "#64748b" }}>
                  {leagueName(lang, k)}
                </Link>
              );
            })}
          </div>
        ))}

        {/* 시즌 선택 (현재/다음/이전) — 메가는 s28 고정이라 미노출 */}
        {seasons.length > 1 && !isMega && (
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
            {seasons.map((s) => {
              const on = s.slug === season.slug;
              const isNext = statusOf(s) === "next";
              const href = s.slug === currentSeason().slug ? L(`/gbl/tier/${params.league}`) : `${L(`/gbl/tier/${params.league}`)}?s=${s.slug}`;
              return (
                <Link key={s.slug} href={href}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 16, fontSize: "0.78rem", fontWeight: 800, textDecoration: "none",
                    border: on ? (isNext ? "1px solid #6d28d9" : "1px solid #0f172a") : `1px solid ${BORDER}`,
                    background: on ? (isNext ? "linear-gradient(135deg,#4c1d95,#6d28d9)" : "#0f172a") : CARD,
                    color: on ? "#fff" : "#64748b" }}>
                  {isNext && "🌙"} {seasonShort(s, lang)}
                </Link>
              );
            })}
            {season.slug !== currentSeason().slug && (
              <span style={{ fontSize: "0.7rem", color: "#6d28d9", fontWeight: 700 }}>· {SEASON_NOTE[statusOf(season) === "next" ? "preview" : "archive"][lang] || SEASON_NOTE.preview.ko}</span>
            )}
          </div>
        )}

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          {lgName} {t.h1Suffix}
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          {t.intro1}
        </p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
          {t.intro2}{" "}
          <Link href={L(`/gbl/meta/${params.league}`)} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.metaMore}</Link>
        </p>

        {tierText && (
          <p style={{ margin: "0.9rem 0 0", padding: "0.85rem 1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: "0.84rem", color: "#334155", lineHeight: 1.8 }}>
            {tierText}
          </p>
        )}

        {list.length > 0 && (
          <ListShare
            title={`${lgName} ${t.shareTitleSuffix}`}
            subtitle={t.shareSubtitle}
            path={`/gbl/tier/${params.league}`}
            accent="#7c3aed"
            buttonLabel={t.shareButton}
            filename={`gbl-${params.league}-tier.png`}
            footerTag={t.shareFooter}
            trackLabel="pvp-tier"
            items={list.slice(0, 12).map((d) => ({
              dex: (MON[d.id]?.sprite?.match(/(\d+)\.png/)?.[1]) || String(formDexById(d.id, d.dex || MON[d.id]?.dex || 0) || ""),
              name: dispNameOf(lang, d),
              main: String(d.score),
              sub: pick[d.id] != null ? `${t.actualLabel} ${pick[d.id]}%` : `${d.tier}`,
              types: (d.types && d.types.length) ? d.types : (MON[d.id]?.types || []),
              shadow: d.id.endsWith("_shadow"),
            }))}
          />
        )}

        {list.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>데이터 준비 중입니다.</div>
        ) : (
          TIERS.filter((tr) => byTier[tr] && byTier[tr].length).map((tr, ti) => (
            <div key={tr} style={{ marginTop: ti === 0 ? 20 : 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff", background: TIER_COLOR[tr], width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>{tr}</span>
                <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>{byTier[tr].length}{t.countSuffix}</span>
                {tr === "S" && <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{t.topTier}</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {byTier[tr].map((d) => {
                  const pr = pick[d.id];
                  const types = (d.types && d.types.length) ? d.types : (MON[d.id]?.types || []);
                  const dex = d.dex || MON[d.id]?.dex;
                  const dispName = dispNameOf(lang, d);
                  const isShadow = d.id.endsWith("_shadow");
                  const c1 = TYPE_COLOR[types[0]] || "#cbd5e1";
                  const c2 = TYPE_COLOR[types[1]] || c1;
                  return (
                    <Link key={d.id} href={L(`/gbl/pokemon/${params.league}/${d.id}`) + detQ} style={{ textDecoration: "none", color: "inherit", display: "block", background: `linear-gradient(100deg, ${c1}26 0%, ${c2}18 42%, #ffffff 88%)`, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${c1}`, borderRadius: 10, padding: "8px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 36, height: 36, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                          ...(isShadow ? { background: "radial-gradient(circle, #a855f7ee 0%, #7c3aed99 42%, transparent 72%)", borderRadius: "50%" } : {}) }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={spriteUrl(MON[d.id]) || (dex ? `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${formDexById(d.id, dex)}.png` : "")} alt={dispName} width={36} height={36} style={{ imageRendering: "pixelated" }} />
                        </span>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>{dispName}</span>
                        <span style={{ display: "flex", gap: 3 }}>
                          {types.map((t2) => (
                            <span key={t2} style={{ fontSize: "0.62rem", fontWeight: 700, color: "#fff", background: TYPE_COLOR[t2] || "#94a3b8", padding: "1px 6px", borderRadius: 6 }}>{typeLabel(lang, t2)}</span>
                          ))}
                        </span>
                        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                          {pr != null && (
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#3b5bdb" }}>{t.actualLabel} {pr}%</span>
                          )}
                          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{t.scoreLabel} {d.score}</span>
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6, paddingLeft: 44 }}>
                        {d.moveset.map((mid) => <MoveChip key={mid} id={mid} lang={lang} />)}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}


        <AdSlot />

        <div style={{ marginTop: 24, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>{t.explainerH}</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.7 }}>
            {t.explainerBody}{" "}
            <Link href={L("/gbl/login")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.loginLink}</Link>
          </p>
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f172a", alignSelf: "center" }}>{GUIDE_CHIP[lang].header}</span>
            <Link href={L("/gbl/guide/league-cp")} style={{ fontSize: "0.8rem", fontWeight: 600, color: "#3b5bdb", textDecoration: "none", background: "#eef2fb", border: `1px solid ${BORDER}`, borderRadius: 999, padding: "4px 12px" }}>{GUIDE_CHIP[lang].leagueCp}</Link>
            <Link href={L("/gbl/guide/type-chart")} style={{ fontSize: "0.8rem", fontWeight: 600, color: "#3b5bdb", textDecoration: "none", background: "#eef2fb", border: `1px solid ${BORDER}`, borderRadius: 999, padding: "4px 12px" }}>{GUIDE_CHIP[lang].typeChart}</Link>
          </div>
        </div>

        <CoupangAd />

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{getDict(lang).footer.privacy}</Link>
        </div>
      </div>
    </div>
  );
}
