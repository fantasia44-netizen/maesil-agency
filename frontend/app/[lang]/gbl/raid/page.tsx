// 레이드 딜러 티어표 허브 — 18속성 인덱스. 서버렌더 SEO.
import Link from "next/link";
import type { Metadata } from "next";
import RAIDS from "../gbl_raids.json";
import AdSlot from "../AdSlot";
import { monSprite } from "../sprite";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { typeLabel } from "../typeLabels";
import { getDict } from "../dictionaries";
import { getRaidHub } from "./dict";

export const revalidate = 600;

type Row = { name: string; nameEn: string; nameJa: string; dex: number; dps: number; mega: string; shadow: boolean };
const rName = (lang: Locale, r: Row) => (lang === "en" ? r.nameEn : lang === "ja" ? r.nameJa : r.name) || r.name;
type RaidData = { meta: { generated: string; typeKo: Record<string, string> }; types: Record<string, Row[]> };
const RD = RAIDS as unknown as RaidData;
const TYPES = Object.keys(RD.types);

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};
const TYPE_KO = RD.meta.typeKo;

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getRaidHub(lang);
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    alternates: { canonical: localizePath(lang, "/gbl/raid"), languages: hreflangLanguages("/gbl/raid") },
    openGraph: { title: t.ogTitle, description: t.ogDesc, url: localizePath(lang, "/gbl/raid"), images: ["/gbl-og.png"], type: "website" },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

export default function RaidHubPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getRaidHub(lang);
  const L = (p: string) => localizePath(lang, p);
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
          <Link href={L("/gbl/tier/master")} style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{t.navPvp}</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.55rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          {t.h1}
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          {t.intro}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          <Link href={L("/gbl/raid/schedule")} style={{
            display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
            padding: "12px 15px", borderRadius: 12, background: "linear-gradient(100deg,#fff1e6,#ffe3ef)", border: "1px solid #ffd0a8",
          }}>
            <span style={{ fontSize: "1.5rem" }}>🗓️</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#c2410c" }}>{t.schedH}</div>
              <div style={{ fontSize: "0.76rem", color: "#9a3412" }}>{t.schedP}</div>
            </div>
            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ea580c" }}>→</span>
          </Link>
          <Link href={L("/gbl/raid/bosses")} style={{
            display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
            padding: "12px 15px", borderRadius: 12, background: "linear-gradient(100deg,#fdeede,#fbe6ea)", border: "1px solid #ffd8b0",
          }}>
            <span style={{ fontSize: "1.5rem" }}>💯</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#c2410c" }}>{t.bossH}</div>
              <div style={{ fontSize: "0.76rem", color: "#9a3412" }}>{t.bossP}</div>
            </div>
            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ea580c" }}>→</span>
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(158px, 1fr))", gap: 8, marginTop: 16 }}>
          {TYPES.map((tk) => {
            const c = TYPE_COLOR[tk] || "#64748b";
            const top = RD.types[tk]?.[0];
            const topName = top ? rName(lang, top) : "";
            return (
              <Link key={tk} href={L(`/gbl/raid/${tk}`)}
                style={{ textDecoration: "none", color: "inherit", background: `linear-gradient(120deg, ${c}1f, ${CARD} 70%)`, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${c}`, borderRadius: 11, padding: "10px 11px", display: "flex", alignItems: "center", gap: 9 }}>
                {top && (
                  <span style={{ width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    ...(top.shadow ? { background: "radial-gradient(circle, #a855f7ee 0%, #7c3aed99 42%, transparent 72%)", borderRadius: "50%" } : {}) }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={monSprite(top.name, top.dex)} alt={topName} width={40} height={40} style={{ imageRendering: "pixelated" }} />
                  </span>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: c }}>{typeLabel(lang, tk)}</div>
                  {top && <div style={{ fontSize: "0.72rem", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.rankPrefix}{topName}</div>}
                </div>
              </Link>
            );
          })}
        </div>

        <AdSlot />

        <div style={{ marginTop: 22, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>{t.explainerH}</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.7 }}>
            {t.explainerBody}
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: "0.72rem", color: "#94a3b8" }}>
          {t.updateLabel} {RD.meta.generated} · <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{getDict(lang).footer.privacy}</Link>
        </div>
      </div>
    </div>
  );
}
