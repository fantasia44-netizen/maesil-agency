// 리그별 CMP(공격력) 우선권 순위 — 서버렌더(ISR) SEO.
// 공격 종족값 내림차순 = 같은 턴 차지 시 먼저 발동하는 순서(CMP). 수작업 배포 인포그래픽 자동화.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DATA from "../../gbl_data.json";
import DETAIL from "../../gbl_detail.json";
import DETAIL_S28 from "../../gbl_detail_s28.json";
import PKNAMES from "../../pokedex_names.json";
import AdSlot from "../../AdSlot";
import CoupangAd from "../../CoupangAd";
import ListShare from "../../ListShare";
import { formDexById } from "../../sprite";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../../lib/i18n";
import { leagueName, localName } from "../../contentI18n";
import { typeLabel } from "../../typeLabels";
import { getDict } from "../../dictionaries";
import { getCmp } from "./dict";
import { cmpAnalysis } from "../../leagueAnalysis";
import { currentSeason, seasonBySlug, selectableSeasons, seasonShort, statusOf } from "../../seasons";

export const revalidate = 600;

// 시즌별 상세 스냅샷(티어 페이지와 공유하는 gbl_detail 시리즈).
const DETAIL_BY_SLUG: Record<string, unknown> = { s27: DETAIL, s28: DETAIL_S28 };
const CMP_SEASON_SLUGS = Object.keys(DETAIL_BY_SLUG);
function resolveSeason(s?: string) {
  const sel = seasonBySlug(s);
  if (sel && CMP_SEASON_SLUGS.includes(sel.slug)) return sel;
  const cur = currentSeason();
  return CMP_SEASON_SLUGS.includes(cur.slug) ? cur : (seasonBySlug(CMP_SEASON_SLUGS[0]) ?? cur);
}
const SEASON_NOTE: Record<string, Record<string, string>> = {
  preview: { ko: "미리보기", en: "Preview", ja: "プレビュー", "zh-TW": "預覽" },
  archive: { ko: "이전 시즌", en: "Past season", ja: "過去シーズン", "zh-TW": "過去賽季" },
};

const LEAGUES: Record<string, { ko: string; short: string }> = {
  master: { ko: "마스터리그", short: "마스터" },
  great: { ko: "슈퍼리그", short: "슈퍼" },
  ultra: { ko: "하이퍼리그", short: "하이퍼" },
  great_mega: { ko: "슈퍼리그 (메가)", short: "슈퍼 메가" },
  ultra_mega: { ko: "하이퍼리그 (메가)", short: "하이퍼 메가" },
  master_mega: { ko: "마스터리그 (메가)", short: "마스터 메가" },
};
const LEAGUE_KEYS = Object.keys(LEAGUES);
const CORE_KEYS = ["great", "ultra", "master"];
const MEGA_KEYS = ["great_mega", "ultra_mega", "master_mega"];
const isMegaLeague = (lg: string) => lg.endsWith("_mega");

type Mon = { id: string; dex: number; ko: string; types: string[]; shadow: boolean; sprite?: string };
const DS = DATA as unknown as { leagues: Record<string, { pokemon: Mon[] }> };
const MON: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON[m.id] = m;
const spriteUrl = (m?: Mon) =>
  m ? (m.sprite || `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${m.dex}.png`) : "";
const nameOf = (id: string) => MON[id]?.ko || id;
// zh-TW 포켓몬명 — 데이터 엔트리에 zh-TW가 없어 dex로 pokedex_names에서 보완.
const dispNameOf = (lang: Locale, d: { id: string; ko?: string; en?: string; ja?: string; dex?: number }) => {
  if (lang === "zh-TW") {
    const dex = d.dex ?? MON[d.id]?.dex;
    const zh = dex != null ? (PKNAMES as Record<string, Record<string, string>>)[String(dex)]?.["zh-TW"] : undefined;
    if (zh) return zh;
  }
  return localName(lang, d, nameOf(d.id));
};

type Detail = { id: string; tier: string; stats: Record<string, number>; ko?: string; dex?: number; types?: string[] };
const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};

export function generateStaticParams() {
  return LEAGUE_KEYS.map((league) => ({ league }));
}

export function generateMetadata({ params, searchParams }: { params: { lang: string; league: string }; searchParams?: { s?: string } }): Metadata {
  if (!LEAGUES[params.league]) return { title: "GBL Note" };
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const lgName = leagueName(lang, params.league);
  const t = getCmp(lang);
  const season = resolveSeason(searchParams?.s);
  const isCurrent = season.slug === currentSeason().slug;
  const seasonTag = isCurrent ? "" : ` (${seasonShort(season, lang)})`;
  return {
    title: `${lgName} ${t.metaTitle}${seasonTag}`,
    description: `${lgName} ${t.metaDesc}`,
    alternates: { canonical: localizePath(lang, `/gbl/cmp/${params.league}`), languages: hreflangLanguages(`/gbl/cmp/${params.league}`) },
    ...(isCurrent ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title: `${lgName} ${t.ogTitle}`,
      description: `${lgName} ${t.ogDesc}`,
      url: localizePath(lang, `/gbl/cmp/${params.league}`),
      images: ["/gbl-og.png"],
      type: "website",
    },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a", D: "#64748b" };

function Sprite({ id, size = 32 }: { id: string; size?: number }) {
  const m = MON[id];
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={spriteUrl(m)} alt={m?.ko || id} width={size} height={size} style={{ imageRendering: "pixelated" }} />;
}

export default function CmpPage({ params, searchParams }: { params: { lang: string; league: string }; searchParams?: { s?: string } }) {
  if (!LEAGUES[params.league]) notFound();
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getCmp(lang);
  const lgName = leagueName(lang, params.league);
  const L = (p: string) => localizePath(lang, p);

  // 메가 리그는 s28+ 스냅샷에만 존재 → 항상 s28 데이터·시즌 고정(시즌 선택기 비노출).
  const isMega = isMegaLeague(params.league);
  const season = isMega ? (seasonBySlug("s28") ?? currentSeason()) : resolveSeason(searchParams?.s);
  const seasonDet = (isMega ? DETAIL_S28 : (DETAIL_BY_SLUG[season.slug] || DETAIL)) as Record<string, Detail[]>;
  const seasons = selectableSeasons(CMP_SEASON_SLUGS);
  const list = (seasonDet[params.league] || []).filter((d) => d.stats && d.stats.atk)
    .sort((a, b) => (b.stats.atk || 0) - (a.stats.atk || 0));
  const maxAtk = list[0]?.stats.atk || 1;
  const minAtk = list[list.length - 1]?.stats.atk || 0;

  // 데이터 파생 CMP 분석(상위 공격 우선권 해석)
  const byId: Record<string, Detail> = {};
  for (const d of list) byId[d.id] = d;
  const nameById = (id: string) => (byId[id] ? dispNameOf(lang, byId[id]) : (MON[id]?.ko || id));
  const cmpText = cmpAnalysis(lang, lgName, list.map((d) => ({ id: d.id, atk: d.stats.atk || 0 })), nameById);

  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
    padding: "1.4rem 1rem 4rem",
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href={L(`/gbl/tier/${params.league}`)} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{t.navTier}</Link>
          <Link href={L(`/gbl/meta/${params.league}`)} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{t.navMeta}</Link>
          <Link href={L("/gbl/raid")} style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>{t.navRaid}</Link>
        </div>

        {/* 리그 크로스링크 — 코어 3리그 + 메가 3리그(별도 행) */}
        {[CORE_KEYS, MEGA_KEYS].map((group, gi) => (
          <div key={gi} style={{ display: "flex", gap: 6, marginBottom: gi === 0 ? 6 : 12, flexWrap: "wrap", alignItems: "center" }}>
            {gi === 1 && <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#fff", background: "linear-gradient(90deg,#db2777,#7c3aed)", borderRadius: 8, padding: "3px 8px" }}>MEGA</span>}
            {group.map((k) => {
              const on = k === params.league;
              const megaOn = gi === 1;
              return (
                <Link key={k} href={L(`/gbl/cmp/${k}`)}
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
              const href = s.slug === currentSeason().slug ? L(`/gbl/cmp/${params.league}`) : `${L(`/gbl/cmp/${params.league}`)}?s=${s.slug}`;
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
          {t.intro2}
        </p>

        {cmpText && (
          <p style={{ margin: "0.9rem 0 0", padding: "0.85rem 1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: "0.84rem", color: "#334155", lineHeight: 1.8 }}>
            {cmpText}
          </p>
        )}

        {list.length > 0 && (
          <ListShare
            title={`${lgName} ${t.shareTitleSuffix}`}
            subtitle={t.shareSubtitle}
            path={`/gbl/cmp/${params.league}`}
            accent="#0891b2"
            buttonLabel={t.shareButton}
            filename={`gbl-${params.league}-cmp.png`}
            footerTag={t.shareFooter}
            trackLabel="cmp-rank"
            items={list.slice(0, 12).map((d) => ({
              dex: String(formDexById(d.id, d.dex || MON[d.id]?.dex || 0)),
              name: dispNameOf(lang, d),
              main: (d.stats.atk || 0).toFixed(1),
              sub: `${d.tier}`,
              types: (d.types && d.types.length) ? d.types : (MON[d.id]?.types || []),
              shadow: d.id.endsWith("_shadow"),
            }))}
          />
        )}

        {list.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>데이터 준비 중입니다.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 14 }}>
            {list.map((d, i) => {
              const types = (d.types && d.types.length) ? d.types : (MON[d.id]?.types || []);
              const dex = d.dex || MON[d.id]?.dex;
              const dispName = dispNameOf(lang, d);
              const c1 = TYPE_COLOR[types[0]] || "#cbd5e1";
              const atk = d.stats.atk || 0;
              const w = maxAtk > minAtk ? Math.round(((atk - minAtk) / (maxAtk - minAtk)) * 100) : 100;
              return (
                <Link key={d.id} href={L(`/gbl/pokemon/${params.league}/${d.id}`)}
                  style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 8,
                    background: `linear-gradient(100deg, ${c1}1f, #ffffff 82%)`, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${c1}`, borderRadius: 10, padding: "6px 10px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 800, color: i < 3 ? "#dc2626" : "#94a3b8", minWidth: 24 }}>#{i + 1}</span>
                  <span style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    ...(d.id.endsWith("_shadow") ? { background: "radial-gradient(circle, #a855f7ee 0%, #7c3aed99 42%, transparent 72%)", borderRadius: "50%" } : {}) }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={spriteUrl(MON[d.id]) || (dex ? `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${formDexById(d.id, dex)}.png` : "")} alt={dispName} width={32} height={32} style={{ imageRendering: "pixelated" }} />
                  </span>
                  <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a", minWidth: 84 }}>{dispName}</span>
                  <span style={{ display: "flex", gap: 3 }}>
                    {types.map((t) => (
                      <span key={t} style={{ fontSize: "0.6rem", fontWeight: 700, color: "#fff", background: TYPE_COLOR[t] || "#94a3b8", padding: "1px 6px", borderRadius: 6 }}>{typeLabel(lang, t)}</span>
                    ))}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 6, background: TIER_COLOR[d.tier], color: "#fff", fontWeight: 800, fontSize: "0.66rem", marginLeft: 4 }}>{d.tier}</span>
                  <div style={{ flex: 1, height: 7, background: "#e5eaf3", borderRadius: 4, overflow: "hidden", marginLeft: 4, minWidth: 40 }}>
                    <div style={{ width: `${w}%`, height: "100%", background: "linear-gradient(90deg,#ef4444,#f59e0b)" }} />
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a", minWidth: 46, textAlign: "right" }}>{atk.toFixed(1)}</span>
                </Link>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 22 }}><AdSlot /></div>

        <div style={{ marginTop: 8, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>{t.explainerH}</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>
            {t.explainerBody}{" "}
            <Link href={L("/gbl/login")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.recordLink}</Link>
          </p>
        </div>

        <CoupangAd />

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/gbl/guide")} style={{ color: "#64748b", textDecoration: "none" }}>{t.guide}</Link> ·{" "}
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{getDict(lang).footer.privacy}</Link>
        </div>
      </div>
    </div>
  );
}
