// 기술 도감 허브 — 배틀리그(PvP) 전 기술의 수치표 + 이번 시즌 메타 채용 순위. 서버렌더.
// 데이터: gbl_moves.json(게임마스터) + 현재 시즌 티어 스냅샷. 계산(DPT·EPT·DPE·채용 수)은 movesData.ts.
import Link from "next/link";
import type { Metadata } from "next";
import AdSlot from "../AdSlot";
import JsonLd from "../JsonLd";
import MovesTable, { type MoveRow } from "./MovesTable";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { typeLabel, TYPE_COLOR } from "../typeLabels";
import { getMoves } from "./dict";
import { buffText } from "./fmt";
import { MOVES, FAST, CHARGED, GM_DATE, moveName, dpt, ept, dpe, usageCount } from "./movesData";

export const revalidate = 3600;

const TYPE_ORDER = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
const CARD = "#ffffff", BORDER = "#e3e8f2";

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getMoves(lang);
  const desc = t.hubMetaDesc(FAST.length, CHARGED.length);
  return {
    title: t.hubMetaTitle, description: desc,
    alternates: { canonical: localizePath(lang, "/gbl/moves"), languages: hreflangLanguages("/gbl/moves") },
    openGraph: { title: t.hubMetaTitle, description: desc, url: localizePath(lang, "/gbl/moves"), type: "website" },
  };
}

export default function MovesHub({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getMoves(lang);
  const L = (p: string) => localizePath(lang, p);

  const rows: MoveRow[] = MOVES.map((m) => ({
    slug: m.slug, href: L(`/gbl/moves/${m.slug}`), name: moveName(lang, m), alt: `${m.n.en} ${m.n.ko}`, type: m.type, typeLabel: typeLabel(lang, m.type), kind: m.kind,
    power: m.power, energy: m.energy, gain: m.gain, turns: m.turns, dpt: dpt(m), ept: ept(m), dpe: dpe(m),
    effect: buffText(t, m.buff), users: usageCount(m), learners: m.learners.length,
  }));
  const top = (kind: "fast" | "charged") => rows.filter((r) => r.kind === kind && r.users > 0).sort((a, b) => b.users - a.users || a.name.localeCompare(b.name)).slice(0, 8);
  const SITE = "https://gblnote.com";
  const breadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GBL Note", item: SITE + L("/gbl") },
      { "@type": "ListItem", position: 2, name: t.navLabel, item: SITE + L("/gbl/moves") },
    ],
  };
  const wrap: React.CSSProperties = { minHeight: "100dvh", background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" };

  const TopList = ({ title, list }: { title: string; list: MoveRow[] }) => (
    <div style={{ flex: "1 1 280px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.8rem 0.9rem" }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{title}</div>
      {list.map((r, i) => {
        const c = TYPE_COLOR[r.type] || "#94a3b8";
        return (
          <Link key={r.slug} href={r.href} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", textDecoration: "none", borderTop: i ? "1px solid #f1f5f9" : "none" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: i < 3 ? "#dc2626" : "#94a3b8", minWidth: 16 }}>{i + 1}</span>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#fff", background: c, padding: "1px 6px", borderRadius: 6 }}>{r.typeLabel}</span>
            <span style={{ flex: 1, fontSize: "0.84rem", fontWeight: 700, color: "#0f172a" }}>{r.name}</span>
            <span style={{ fontSize: "0.72rem", color: "#3b5bdb", fontWeight: 700 }}>{t.usedSuffix(r.users)}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div style={wrap}>
      <JsonLd data={breadcrumb} />
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href={L("/gbl/tier/great")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{t.navTier}</Link>
          <Link href={L("/gbl/guide/moveset")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{t.navGuide}</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>{t.hubH1}</h1>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "#475569", lineHeight: 1.75 }}>{t.hubIntro1(FAST.length, CHARGED.length)}</p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.7 }}>{t.hubIntro2}</p>

        {/* 이번 시즌 메타 채용 TOP — 현재 시즌 스냅샷에서 집계(시즌·패치마다 바뀜) */}
        <h2 style={{ margin: "1.3rem 0 2px", fontSize: "1.02rem", fontWeight: 800, color: "#0f172a" }}>{t.topUsedH}</h2>
        <p style={{ margin: "0 0 8px", fontSize: "0.74rem", color: "#94a3b8" }}>{t.topUsedSub}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <TopList title={t.kindFast} list={top("fast")} />
          <TopList title={t.kindCharged} list={top("charged")} />
        </div>

        <AdSlot />

        <div style={{ marginTop: 18 }}>
          <MovesTable rows={rows} types={TYPE_ORDER.map((k) => ({ key: k, label: typeLabel(lang, k) }))}
            labels={{ kindFast: t.kindFast, kindCharged: t.kindCharged, viewTable: t.viewTable, viewTree: t.viewTree, all: t.all, searchPh: t.searchPh, sortHint: t.sortHint, noResult: t.noResult,
              colName: t.colName, colType: t.colType, power: t.power, energyCost: t.energyCost, energyGain: t.energyGain, turns: t.turns, effect: t.effect, colUsers: t.colUsers, colLearners: t.colLearners,
              shown: t.shown("{n}", "{t}") }} />
        </div>

        <div style={{ marginTop: 24, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>{t.hubExplainH}</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>{t.hubExplainBody(GM_DATE)}</p>
        </div>
      </div>
    </div>
  );
}
