// 리그별 실측 메타 — 서버렌더(ISR) SEO 페이지 (master/great/ultra 공용).
// "use client" 아님 → 백엔드를 서버에서 호출해 데이터를 HTML에 박아 크롤러가 읽게 함.
// 기간·커스텀리그 필터는 인터랙티브 페이지(/gbl/meta)로 유도.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DATA from "../../gbl_data.json";
import PKN from "../../pokedex_names.json";
import { monSlugId } from "../../monSlug";
import AdSlot from "../../AdSlot";
import CoupangAd from "../../CoupangAd";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../../lib/i18n";
import { leagueName, leagueShort } from "../../contentI18n";
import { getLeagueMeta } from "./dict";

export const revalidate = 600; // 1시간마다 정적 재생성(크롤 가능 + 재집계 캐싱)

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const LEAGUE_KEYS = ["master", "great", "ultra"];

type Mon = { id: string; dex: number; ko: string; en?: string; shadow: boolean; sprite?: string };
const DS = DATA as unknown as { leagues: Record<string, { pokemon: Mon[] }> };
const MON: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON[m.id] = m;
const PKNAMES = PKN as unknown as Record<string, { ko: string; en: string; ja: string }>;
// 비메타몬(전 도감) 보충 — 기록엔 slug로 저장되므로 표시용 이름/스프라이트도 전 도감에서 해석(입력과 동일 slug)
{
  const cov = new Set(Object.values(MON).map((m) => `${m.dex}_${m.shadow ? 1 : 0}`));
  for (const [dexStr, nm] of Object.entries(PKNAMES)) {
    const dex = Number(dexStr); if (!dex || !nm.en) continue;
    for (const shadow of [false, true]) {
      const k = `${dex}_${shadow ? 1 : 0}`;
      if (cov.has(k)) continue; cov.add(k);
      const id = monSlugId(nm.en, shadow);
      if (!MON[id]) MON[id] = { id, dex, ko: nm.ko, en: nm.en, shadow };
    }
  }
}
const spriteUrl = (m?: Mon) =>
  m ? (m.sprite || `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${m.dex}.png`) : "";
// 로케일별 포켓몬명 — MON은 ko(+en), ja는 pokedex_names(dex)로 보완.
const monName = (lang: Locale, id: string) => {
  const m = MON[id]; if (!m) return id;
  if (lang === "en") return m.en || PKNAMES[String(m.dex)]?.en || m.ko;
  if (lang === "ja") return PKNAMES[String(m.dex)]?.ja || m.en || m.ko;
  return m.ko;
};

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

export function generateMetadata({ params }: { params: { lang: string; league: string } }): Metadata {
  if (!LEAGUE_KEYS.includes(params.league)) return { title: "GBL Note" };
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getLeagueMeta(lang);
  const lg = leagueName(lang, params.league);
  const sub = (s: string) => s.replace(/\{lg\}/g, lg);
  const path = `/gbl/meta/${params.league}`;
  return {
    title: sub(t.metaTitle),
    description: sub(t.metaDesc),
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    openGraph: {
      title: sub(t.ogTitle),
      description: sub(t.ogDesc),
      url: localizePath(lang, path),
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

export default async function LeagueMetaPage({ params }: { params: { lang: string; league: string } }) {
  if (!LEAGUE_KEYS.includes(params.league)) notFound();
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getLeagueMeta(lang);
  const L = (p: string) => localizePath(lang, p);
  const lgName = leagueName(lang, params.league);
  const sub = (s: string) => s.replace(/\{lg\}/g, lgName);

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
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href={L("/gbl/raid")} style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>{t.navRaid}</Link>
          <Link href={L("/gbl/app")} style={{ marginLeft: 12, fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{t.navRecord}</Link>
        </div>

        {/* 리그 내부링크(SEO 크로스링크) */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {LEAGUE_KEYS.map((k) => {
            const on = k === params.league;
            return (
              <Link key={k} href={L(`/gbl/meta/${k}`)}
                style={{ padding: "6px 13px", borderRadius: 16, fontSize: "0.8rem", fontWeight: 700, textDecoration: "none",
                  border: `1px solid ${on ? "#4f8cff" : BORDER}`, background: on ? "rgba(79,140,255,.16)" : CARD, color: on ? "#3b5bdb" : "#64748b" }}>
                {leagueShort(lang, k)}{t.chipSuffix}
              </Link>
            );
          })}
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          {sub(t.h1)}
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          {sub(t.intro1a)}<b style={{ color: "#334155" }}>{t.intro1b}</b>{sub(t.intro1c)}{" "}
          {sub(t.intro2a)}<b style={{ color: "#334155" }}>{t.intro2b}</b>
        </p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
          {t.interactiveNote1}
          <Link href={L("/gbl/meta")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.interactiveLink}</Link>{t.interactiveNote2}
        </p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.84rem" }}>
          🏆 <Link href={L(`/gbl/tier/${params.league}`)} style={{ color: "#3b5bdb", fontWeight: 700 }}>{sub(t.tierLink)}</Link>
        </p>

        {!hasData ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem", fontSize: "0.92rem" }}>
            {t.empty}
          </div>
        ) : (
          <>
            <h2 style={h2}>{sub(t.monTopH)}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {mons.map((mm, i) => {
                const pct = Math.round((mm.count / total) * 100);
                const m = MON[mm.speciesId];
                return (
                  <div key={mm.speciesId} style={{ display: "flex", alignItems: "center", gap: 8, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "5px 10px" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: 800, color: i < 3 ? "#a855f7" : "#94a3b8", minWidth: 22 }}>#{i + 1}</span>
                    <Sprite id={mm.speciesId} size={30} />
                    <span style={{ fontSize: "0.86rem", fontWeight: 600, minWidth: 88, color: "#0f172a" }}>
                      {m?.shadow && <span style={{ color: "#7c3aed" }}>{t.shadowWord}</span>}{monName(lang, mm.speciesId)}
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

            <h2 style={h2}>{sub(t.deckTopH)}</h2>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 6 }}>{t.deckNote}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {decks.map((d, i) => {
                const pct = Math.round((d.count / total) * 100);
                const names = d.deck.map((id) => monName(lang, id)).join(" · ");
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
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>{t.aboutH}</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.7 }}>
            {sub(t.aboutBody)}{" "}
            <Link href={L("/gbl/login")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.aboutCta}</Link>
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{t.privacy}</Link>
        </div>
      </div>
    </div>
  );
}
