"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../../lib/api";
import DATA from "../gbl_data.json";
import PKN from "../pokedex_names.json";
import { monSlugId } from "../monSlug";
import AdSlot from "../AdSlot";
import CoupangAd from "../CoupangAd";
import { currentFormats, todayISO, type Format } from "../formats";
import { isLocale, defaultLocale, localizePath, type Locale } from "../../../../lib/i18n";
import { leagueName, leagueShort } from "../contentI18n";
import { getMetaHub, type MetaHubDict } from "./dict";

type Mon = { id: string; dex: number; ko: string; en: string; types: string[]; shadow: boolean; sprite?: string };
type League = "great" | "ultra" | "master";
const DS = DATA as unknown as { leagues: Record<League, { pokemon: Mon[] }> };
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
      if (!MON[id]) MON[id] = { id, dex, ko: nm.ko, en: nm.en, types: [], shadow };
    }
  }
}
const spriteUrl = (m?: Mon) => m ? (m.sprite || `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${m.dex}.png`) : "";
// 로케일별 포켓몬명 — MON은 ko/en 보유, ja는 pokedex_names(dex)로 보완.
const monName = (lang: Locale, id: string) => {
  const m = MON[id]; if (!m) return id;
  if (lang === "en") return m.en || m.ko;
  if (lang === "ja") return PKNAMES[String(m.dex)]?.ja || m.en || m.ko;
  return m.ko;
};

const PERIODS: { key: string; days?: number; start?: string; end?: string }[] = [
  { key: "7", days: 7 },
  { key: "30", days: 30 },
  { key: "s27", start: "2026-06-02", end: "2026-09-09" },
  { key: "all", days: 0 },
];
const periodLabel = (t: MetaHubDict, key: string) => key === "7" ? t.p7 : key === "30" ? t.p30 : key === "s27" ? t.season : t.all;

type MetaMon = { speciesId: string; count: number };
type MetaDeck = { deck: string[]; count: number; wins: number; losses: number };
type Meta = { total: number; wins: number; losses: number; top_mons: MetaMon[]; top_decks: MetaDeck[] };

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

const PAGE_SIZE = 20;

function Sprite({ id, size = 30 }: { id: string; size?: number }) {
  const m = MON[id];
  return <img src={spriteUrl(m)} alt={m?.ko || id} width={size} height={size}
    style={{ imageRendering: "pixelated" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />;
}

function Pager({ page, pages, onPage, t }: { page: number; pages: number; onPage: (p: number) => void; t: MetaHubDict }) {
  if (pages <= 1) return null;
  const btn = (disabled: boolean): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 8, border: "1px solid #e3e8f2",
    background: disabled ? "#f1f5f9" : "#fff", color: disabled ? "#cbd5e1" : "#3b5bdb",
    fontWeight: 700, fontSize: "0.8rem", cursor: disabled ? "default" : "pointer",
  });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 12 }}>
      <button style={btn(page === 0)} disabled={page === 0} onClick={() => onPage(page - 1)}>{t.prev}</button>
      <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>{page + 1} / {pages}</span>
      <button style={btn(page >= pages - 1)} disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>{t.next}</button>
    </div>
  );
}

function MonList({ meta, maxMon, lang, t }: { meta: Meta; maxMon: number; lang: Locale; t: MetaHubDict }) {
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [meta]);
  const pages = Math.ceil(meta.top_mons.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {meta.top_mons.slice(start, start + PAGE_SIZE).map((mm, idx) => {
        const i = start + idx;
        const m = MON[mm.speciesId];
        const pct = Math.round((mm.count / meta.total) * 100);
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
    <Pager page={page} pages={pages} onPage={setPage} t={t} />
    </>
  );
}

function DeckList({ meta, maxDeck, lang, t }: { meta: Meta; maxDeck: number; lang: Locale; t: MetaHubDict }) {
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [meta]);
  const pages = Math.ceil(meta.top_decks.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 2 }}>{t.deckNote}</div>
      {meta.top_decks.slice(start, start + PAGE_SIZE).map((d, idx) => {
        const i = start + idx;
        const pct = Math.round((d.count / meta.total) * 100);
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
    <Pager page={page} pages={pages} onPage={setPage} t={t} />
    </>
  );
}

export default function GblMeta() {
  const params = useParams();
  const lang: Locale = isLocale(params?.lang as string) ? (params!.lang as Locale) : defaultLocale;
  const t = getMetaHub(lang);
  const L = (p: string) => localizePath(lang, p);
  const [league, setLeague] = useState<string>("master");
  const [formats, setFormats] = useState<Format[]>(() => currentFormats("2000-01-01"));
  const [periodKey, setPeriodKey] = useState("30");
  const [view, setView] = useState<"mon" | "deck">("mon");
  const [wide, setWide] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setFormats(currentFormats(todayISO())); }, []);
  useEffect(() => {
    const check = () => setWide(window.innerWidth >= 880);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const p = PERIODS.find((x) => x.key === periodKey) || PERIODS[1];
    const qs = new URLSearchParams({ league });
    if (p.start && p.end) { qs.set("start", p.start); qs.set("end", p.end); }
    else qs.set("days", String(p.days ?? 30));
    apiFetch<Meta>(`/api/gbl/meta?${qs.toString()}`, {}, 20000)
      .then((d) => { if (alive) setMeta(d); })
      .catch(() => { if (alive) setMeta(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [league, periodKey]);

  const maxMon = useMemo(() => meta?.top_mons?.[0]?.count || 1, [meta]);
  const maxDeck = useMemo(() => meta?.top_decks?.[0]?.count || 1, [meta]);

  const pill = (on: boolean, cup = false): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 18, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
    border: `1px solid ${on ? (cup ? "#7c3aed" : "#4f8cff") : BORDER}`,
    background: on ? (cup ? "rgba(124,58,237,.18)" : "rgba(79,140,255,.16)") : CARD,
    color: on ? (cup ? "#7c3aed" : "#3b5bdb") : "#64748b",
  });
  const h2: React.CSSProperties = { fontSize: "1rem", fontWeight: 800, margin: "0 0 10px", color: "#0f172a" };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
      padding: "1.4rem 1rem 4rem",
    }}>
      <div style={{ maxWidth: wide ? 1040 : 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href={L("/gbl/raid")} style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>{t.navRaid}</Link>
          <Link href={L("/gbl/app")} style={{ marginLeft: 12, fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{t.navRecord}</Link>
        </div>
        <h1 style={{ margin: "0.2rem 0 0.2rem", fontSize: "1.4rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>
        <p style={{ margin: "0 0 1rem", fontSize: "0.84rem", color: "#64748b", lineHeight: 1.6 }}>
          {t.intro.split("{b}")[0]}<b style={{ color: "#334155" }}>{t.intro.split("{b}")[1]?.split("{/b}")[0]}</b>{t.intro.split("{/b}")[1]}
        </p>

        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          {formats.map((f) => <button key={f.key} style={pill(league === f.key, f.cup)} title={f.note || ""} onClick={() => setLeague(f.key)}>{f.cup ? f.label : leagueName(lang, f.base)}</button>)}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {PERIODS.map((p) => <button key={p.key} style={pill(periodKey === p.key)} onClick={() => setPeriodKey(p.key)}>{periodLabel(t, p.key)}</button>)}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem" }}>{t.loading}</div>
        ) : !meta || meta.total === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "2.5rem", fontSize: "0.9rem" }}>
            {t.empty}
          </div>
        ) : wide ? (
          /* 데스크톱: 나란히 대시보드 */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "start" }}>
            <div>
              <h2 style={h2}>{t.monTop}</h2>
              <MonList meta={meta} maxMon={maxMon} lang={lang} t={t} />
            </div>
            <div>
              <h2 style={h2}>{t.deckTop}</h2>
              <DeckList meta={meta} maxDeck={maxDeck} lang={lang} t={t} />
            </div>
          </div>
        ) : (
          /* 모바일: 탭 */
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {([["mon", t.monTab], ["deck", t.deckTab]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setView(k as "mon" | "deck")}
                  style={{ flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.86rem",
                    border: `1px solid ${view === k ? "#4f8cff" : BORDER}`,
                    background: view === k ? "rgba(79,140,255,.16)" : CARD, color: view === k ? "#3b5bdb" : "#64748b" }}>{label}</button>
              ))}
            </div>
            {view === "mon" ? <MonList meta={meta} maxMon={maxMon} lang={lang} t={t} /> : <DeckList meta={meta} maxDeck={maxDeck} lang={lang} t={t} />}
          </>
        )}

        {meta && meta.total > 0 && <><AdSlot /><CoupangAd /></>}

        {/* 크롤 가능한 리그별 상세 링크(서버렌더 SEO 페이지로 연결) */}
        <div style={{ marginTop: 26, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.9rem 1rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{t.detailH}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["master", "great", "ultra"].map((k) => (
              <span key={k} style={{ display: "flex", gap: 6 }}>
                <Link href={L(`/gbl/meta/${k}`)} style={{ fontSize: "0.78rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 600 }}>{leagueShort(lang, k)}{t.detailSuffix}</Link>
                <span style={{ color: "#cbd5e1" }}>·</span>
                <Link href={L(`/gbl/tier/${k}`)} style={{ fontSize: "0.78rem", color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>{t.tierTable}</Link>
              </span>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: "0.76rem" }}>
            <Link href={L("/gbl/guide")} style={{ color: "#64748b", textDecoration: "none" }}>{t.guide}</Link>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/gbl/about")} style={{ color: "#64748b", textDecoration: "none" }}>{t.about}</Link> ·{" "}
          <Link href={L("/gbl/contact")} style={{ color: "#64748b", textDecoration: "none" }}>{t.contact}</Link> ·{" "}
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{t.privacy}</Link>
        </div>
      </div>
    </div>
  );
}
