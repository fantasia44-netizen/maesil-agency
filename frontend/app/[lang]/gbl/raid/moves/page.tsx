// 레이드 기술 도감 허브 — 레이드·체육관(PvE) 전 기술의 수치표 + 딜러 티어표 채용 순위. 서버렌더.
// 배틀 기술 도감(/gbl/moves)의 레이드판 — 같은 기술 목록에 PvE 수치(위력·시전 시간·에너지)를 붙인다. 계산은 raidMovesData.ts.
import Link from "next/link";
import type { Metadata } from "next";
import AdSlot from "../../AdSlot";
import JsonLd from "../../JsonLd";
import RaidMovesTable, { type RaidMoveRow } from "./RaidMovesTable";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../../lib/i18n";
import { typeLabel, TYPE_COLOR } from "../../typeLabels";
import { moveName } from "../../moves/movesData";
import { getRaidMoves } from "./dict";
import { RAID_MOVES, RAID_FAST, RAID_CHARGED, RAID_DATA_DATE, dps, eps, dpe, bars, usageCount } from "./raidMovesData";

export const revalidate = 3600;

const TYPE_ORDER = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
const CARD = "#ffffff", BORDER = "#e3e8f2";
const PATH = "/gbl/raid/moves";

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getRaidMoves(lang);
  const desc = t.hubMetaDesc(RAID_FAST.length, RAID_CHARGED.length);
  return {
    title: t.hubMetaTitle, description: desc,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) },
    openGraph: { title: t.hubMetaTitle, description: desc, url: localizePath(lang, PATH), images: ["/gbl-og.png"], type: "website" },
  };
}

export default function RaidMovesHub({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getRaidMoves(lang);
  const L = (p: string) => localizePath(lang, p);

  const rows: RaidMoveRow[] = RAID_MOVES.map((x) => ({
    slug: x.m.slug, href: L(`${PATH}/${x.m.slug}`), name: moveName(lang, x.m), alt: `${x.m.n.en} ${x.m.n.ko}`, type: x.m.type, typeLabel: typeLabel(lang, x.m.type), kind: x.m.kind,
    power: x.power, dur: x.dur, energy: x.energy, bars: x.m.kind === "charged" ? t.bars(bars(x)) : "", dps: dps(x), eps: eps(x), dpe: dpe(x), users: usageCount(x),
  }));
  const top = (kind: "fast" | "charged") => rows.filter((r) => r.kind === kind && r.users > 0).sort((a, b) => b.users - a.users || b.dps - a.dps || (a.slug < b.slug ? -1 : 1)).slice(0, 8);
  const SITE = "https://gblnote.com";
  const breadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GBL Note", item: SITE + L("/gbl") },
      { "@type": "ListItem", position: 2, name: t.navRaid.replace(/^\S+\s/, ""), item: SITE + L("/gbl/raid") },
      { "@type": "ListItem", position: 3, name: t.navLabel, item: SITE + L(PATH) },
    ],
  };
  const wrap: React.CSSProperties = { minHeight: "100dvh", background: "radial-gradient(1000px 500px at 50% -10%, #ffe6d5 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" };

  const TopList = ({ title, list }: { title: string; list: RaidMoveRow[] }) => (
    <div style={{ flex: "1 1 280px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.8rem 0.9rem" }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{title}</div>
      {list.map((r, i) => {
        const c = TYPE_COLOR[r.type] || "#94a3b8";
        return (
          <Link key={r.slug} href={r.href} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", textDecoration: "none", borderTop: i ? "1px solid #f1f5f9" : "none" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: i < 3 ? "#dc2626" : "#94a3b8", minWidth: 16 }}>{i + 1}</span>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#fff", background: c, padding: "1px 6px", borderRadius: 6 }}>{r.typeLabel}</span>
            <span style={{ flex: 1, fontSize: "0.84rem", fontWeight: 700, color: "#0f172a" }}>{r.name}</span>
            <span style={{ fontSize: "0.72rem", color: "#ea580c", fontWeight: 700 }}>{t.usedSuffix(r.users)}</span>
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
          <Link href={L("/gbl/raid")} style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>{t.navRaid}</Link>
          <Link href={L("/gbl/moves")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{t.navBattle}</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>{t.hubH1}</h1>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem", color: "#475569", lineHeight: 1.75 }}>{t.hubIntro1(RAID_FAST.length, RAID_CHARGED.length)}</p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.7 }}>{t.hubIntro2}</p>

        {/* 딜러 티어표 채용 TOP — 18타입 표의 추천 기술배치에서 집계(데이터 갱신 때마다 바뀜) */}
        <h2 style={{ margin: "1.3rem 0 2px", fontSize: "1.02rem", fontWeight: 800, color: "#0f172a" }}>{t.topUsedH}</h2>
        <p style={{ margin: "0 0 8px", fontSize: "0.74rem", color: "#94a3b8" }}>{t.topUsedSub}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <TopList title={t.kindCharged} list={top("charged")} />
          <TopList title={t.kindFast} list={top("fast")} />
        </div>

        <AdSlot />

        <div style={{ marginTop: 18 }}>
          <RaidMovesTable rows={rows} types={TYPE_ORDER.map((k) => ({ key: k, label: typeLabel(lang, k) }))}
            labels={{ kindFast: t.kindFast, kindCharged: t.kindCharged, viewTable: t.viewTable, viewTree: t.viewTree, all: t.all, searchPh: t.searchPh, sortHint: t.sortHint, noResult: t.noResult,
              colName: t.colName, colType: t.colType, power: t.power, duration: t.duration, energyCost: t.energyCost, energyGain: t.energyGain, colUsers: t.colUsers, secUnit: t.secUnit,
              shown: t.shown("{n}", "{t}") }} />
        </div>

        <div style={{ marginTop: 24, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>{t.hubExplainH}</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>{t.hubExplainBody(RAID_DATA_DATE)}</p>
        </div>
      </div>
    </div>
  );
}
