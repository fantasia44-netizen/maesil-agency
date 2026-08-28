// 리그별 CMP(공격력) 우선권 순위 — 서버렌더(ISR) SEO.
// 공격 종족값 내림차순 = 같은 턴 차지 시 먼저 발동하는 순서(CMP). 수작업 배포 인포그래픽 자동화.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DATA from "../../gbl_data.json";
import DETAIL from "../../gbl_detail.json";
import PKNAMES from "../../pokedex_names.json";
import AdSlot from "../../AdSlot";
import CoupangAd from "../../CoupangAd";
import ListShare from "../../ListShare";
import { formDex } from "../../sprite";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../../lib/i18n";
import { leagueName, localName } from "../../contentI18n";
import { typeLabel } from "../../typeLabels";
import { getDict } from "../../dictionaries";
import { getCmp } from "./dict";

export const revalidate = 600;

const LEAGUES: Record<string, { ko: string; short: string }> = {
  master: { ko: "마스터리그", short: "마스터" },
  great: { ko: "슈퍼리그", short: "슈퍼" },
  ultra: { ko: "하이퍼리그", short: "하이퍼" },
};
const LEAGUE_KEYS = Object.keys(LEAGUES);

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
const DET = DETAIL as unknown as Record<string, Detail[]>;

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};

export function generateStaticParams() {
  return LEAGUE_KEYS.map((league) => ({ league }));
}

export function generateMetadata({ params }: { params: { lang: string; league: string } }): Metadata {
  if (!LEAGUES[params.league]) return { title: "GBL Note" };
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const lgName = leagueName(lang, params.league);
  const t = getCmp(lang);
  return {
    title: `${lgName} ${t.metaTitle}`,
    description: `${lgName} ${t.metaDesc}`,
    alternates: { canonical: localizePath(lang, `/gbl/cmp/${params.league}`), languages: hreflangLanguages(`/gbl/cmp/${params.league}`) },
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

export default function CmpPage({ params }: { params: { lang: string; league: string } }) {
  if (!LEAGUES[params.league]) notFound();
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getCmp(lang);
  const lgName = leagueName(lang, params.league);
  const L = (p: string) => localizePath(lang, p);

  const list = (DET[params.league] || []).filter((d) => d.stats && d.stats.atk)
    .sort((a, b) => (b.stats.atk || 0) - (a.stats.atk || 0));
  const maxAtk = list[0]?.stats.atk || 1;
  const minAtk = list[list.length - 1]?.stats.atk || 0;

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

        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {LEAGUE_KEYS.map((k) => {
            const on = k === params.league;
            return (
              <Link key={k} href={L(`/gbl/cmp/${k}`)}
                style={{ padding: "6px 13px", borderRadius: 16, fontSize: "0.8rem", fontWeight: 700, textDecoration: "none",
                  border: `1px solid ${on ? "#4f8cff" : BORDER}`, background: on ? "rgba(79,140,255,.16)" : CARD, color: on ? "#3b5bdb" : "#64748b" }}>
                {leagueName(lang, k)}
              </Link>
            );
          })}
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          {lgName} {t.h1Suffix}
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          {t.intro1}
        </p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
          {t.intro2}
        </p>

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
              dex: String(formDex(d.ko || nameOf(d.id), d.dex || MON[d.id]?.dex || 0)),
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
                    <img src={spriteUrl(MON[d.id]) || (dex ? `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${dex}.png` : "")} alt={dispName} width={32} height={32} style={{ imageRendering: "pixelated" }} />
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
