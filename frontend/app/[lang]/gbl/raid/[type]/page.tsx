// 레이드(PvE) 속성별 어택커 티어표 — 서버렌더(ISR) SEO 페이지.
// 게임마스터(오픈데이터)로 계산한 DPS·내구 랭킹. PvP(배틀리그)와 별개, 일반 레이드 파밍용.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RAIDS from "../../gbl_raids.json";
import RAIDS_MF from "../../gbl_raids_megafinale.json";
import PKNAMES from "../../pokedex_names.json";
import MOVENAMES from "../../pvp_move_names.json";
import AdSlot from "../../AdSlot";
import CoupangAd from "../../CoupangAd";
import ListShare from "../../ListShare";
import { monSprite, formDex } from "../../sprite";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../../lib/i18n";
import { typeLabel } from "../../typeLabels";
import { getDict } from "../../dictionaries";
import { getRaidType } from "./dict";

// 로케일별 이름/기술명 선택(레이드 행 필드: name/nameEn/nameJa, fastKo/fastEn/fastJa 등)
// zh-TW: 포켓몬명은 dex로 pokedex_names, 기술명은 영문명→ID로 pvp_move_names에서 보완(메가/그림자는 뱃지 별도 표시).
const _pkZh = (dex: number) => (PKNAMES as Record<string, Record<string, string>>)[String(dex)]?.["zh-TW"];
const _mvId = (en: string) => en.trim().replace(/\*+$/, "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
const _mvZh = (en?: string) => en ? (MOVENAMES as Record<string, Record<string, string>>)[_mvId(en)]?.["zh-TW"] : undefined;
const rowName = (lang: Locale, r: Row) => (lang === "en" ? r.nameEn : lang === "ja" ? r.nameJa : lang === "zh-TW" ? (_pkZh(r.dex) || r.nameEn) : r.name) || r.name;
const rowFast = (lang: Locale, r: Row) => (lang === "en" ? r.fastEn : lang === "ja" ? r.fastJa : lang === "zh-TW" ? (_mvZh(r.fastEn) || r.fastEn || r.fastKo) : r.fastKo) || r.fastKo;
const rowCharged = (lang: Locale, r: Row) => (lang === "en" ? r.chargedEn : lang === "ja" ? r.chargedJa : lang === "zh-TW" ? (_mvZh(r.chargedEn) || r.chargedEn || r.chargedKo) : r.chargedKo) || r.chargedKo;

export const revalidate = 600;

type Row = {
  name: string; nameEn: string; nameJa: string; dex: number; shadow: boolean; mega: string; primal: boolean; legacy: boolean; upcoming: boolean;
  fast: string; charged: string; fastKo: string; chargedKo: string; fastEn: string; chargedEn: string; fastJa: string; chargedJa: string;
  fastType: string; chargedType: string;
  dps: number; tdo: number; er: number; rel: number; atk: number; def: number; hp: number; types: string[];
};
type RaidData = {
  meta: { level: number; cpm: number; targetDef: number; generated: string; typeKo: Record<string, string> };
  types: Record<string, Row[]>;
};
const RD = RAIDS as unknown as RaidData;
const TYPES = Object.keys(RD.types);

// 레이드 딜러 버전(메타). 기본=현재, 메가 피날레(슈퍼메가 버프)=신규(내일부터). 새 버전은 여기 추가.
const RAID_BY_VER: Record<string, RaidData> = { current: RAIDS as unknown as RaidData, megafinale: RAIDS_MF as unknown as RaidData };
const RAID_VERSIONS: { slug: string; isNew?: boolean; label: Record<string, string> }[] = [
  { slug: "megafinale", isNew: true, label: { ko: "메가 피날레", en: "Mega Finale", ja: "メガフィナーレ", "zh-TW": "超級大結局" } },
  { slug: "current", label: { ko: "현재", en: "Current", ja: "現在", "zh-TW": "目前" } },
];
const RAID_VER_NOTE: Record<string, Record<string, string>> = {
  megafinale: {
    ko: "🌙 슈퍼메가 버프·스페셜 어택 미리보기 — 공식 반영 전 예상치라 수치·기술이 추후 변경될 수 있습니다.",
    en: "🌙 Super Mega buff & special-attack preview — provisional estimates; values/moves may change on official release.",
    ja: "🌙 スーパーメガ強化・専用技プレビュー — 公式反映前の予測値のため数値・技は変更される場合があります。",
    "zh-TW": "🌙 超級Mega強化·專用技預覽 — 官方實裝前為預估值，數值·招式可能變動。",
  },
};

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};
const TYPE_KO = RD.meta.typeKo;

// rel%(속성 1위 대비)로 레이드 티어 배지
const RAID_TIER = (rel: number) => (rel >= 95 ? "S" : rel >= 88 ? "A" : rel >= 80 ? "B" : rel >= 72 ? "C" : "D");
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a", D: "#64748b" };

export function generateStaticParams() {
  return TYPES.map((type) => ({ type }));
}

export function generateMetadata({ params, searchParams }: { params: { lang: string; type: string }; searchParams?: { v?: string } }): Metadata {
  if (!TYPE_KO[params.type]) return { title: "GBL Note" };
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const tName = typeLabel(lang, params.type);
  const d = getRaidType(lang);
  const isCurrent = !(searchParams?.v && searchParams.v !== "current" && RAID_BY_VER[searchParams.v]);
  return {
    title: `${tName} ${d.metaTitle}`,
    description: `${tName} ${d.metaDesc}`,
    alternates: { canonical: localizePath(lang, `/gbl/raid/${params.type}`), languages: hreflangLanguages(`/gbl/raid/${params.type}`) },
    ...(isCurrent ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title: `${tName} ${d.ogTitle}`,
      description: `${tName} ${d.ogDesc}`,
      url: localizePath(lang, `/gbl/raid/${params.type}`),
      images: [`https://gblnote.com${localizePath(lang, `/gbl/raid/${params.type}/opengraph-image`)}`],
      type: "website",
    },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

function Badge({ text, bg, title }: { text: string; bg: string; title?: string }) {
  return <span title={title} style={{ fontSize: "0.6rem", fontWeight: 800, color: "#fff", background: bg, padding: "1px 6px", borderRadius: 6, whiteSpace: "nowrap", ...(title ? { cursor: "help" } : {}) }}>{text}</span>;
}

function VariantBadge({ r, d, stabType }: { r: Row; d: import("./dict").RaidTypeDict; stabType?: string }) {
  const noStab = !!stabType && !(r.types || []).includes(stabType);
  return (
    <>
      {r.primal && <Badge text={d.badgePrimal} bg="linear-gradient(90deg,#c2410c,#dc2626)" />}
      {r.mega && <Badge text={r.mega === "X" || r.mega === "Y" ? `${d.badgeMega} ${r.mega}` : d.badgeMega} bg="linear-gradient(90deg,#7c3aed,#db2777)" />}
      {r.shadow && <Badge text={d.badgeShadow} bg="#4b0082" />}
      {r.upcoming && <Badge text={d.badgeUpcoming} bg="#0891b2" />}
      {noStab && <Badge text={d.badgeCoverage} bg="#64748b" title={d.badgeCoverageTip} />}
    </>
  );
}

export default function RaidTypePage({ params, searchParams }: { params: { lang: string; type: string }; searchParams?: { v?: string } }) {
  const type = params.type;
  if (!TYPE_KO[type]) notFound();
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const d = getRaidType(lang);
  const tName = typeLabel(lang, type);
  const L = (p: string) => localizePath(lang, p);
  // 버전 해석 — searchParams.v(유효 버전만), 기본=현재
  const ver = searchParams?.v && RAID_BY_VER[searchParams.v] ? searchParams.v : "current";
  const RDV = RAID_BY_VER[ver];
  const verInfo = RAID_VERSIONS.find((v) => v.slug === ver) || RAID_VERSIONS[RAID_VERSIONS.length - 1];
  const verLabel = `${verInfo.isNew ? "🌙 " : ""}${verInfo.label[lang] || verInfo.label.ko}`;
  const rows = RDV.types[type] || [];
  const c = TYPE_COLOR[type] || "#64748b";

  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
    padding: "1.4rem 1rem 4rem",
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl/raid")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{d.navBack}</Link>
          <Link href={L("/gbl")} style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{d.navPvp}</Link>
        </div>

        {/* 버전 선택 (상단) — 현재 / 메가 피날레 슈퍼메가 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          {RAID_VERSIONS.map((v) => {
            const on = v.slug === ver;
            const href = v.slug === "current" ? L(`/gbl/raid/${type}`) : `${L(`/gbl/raid/${type}`)}?v=${v.slug}`;
            return (
              <Link key={v.slug} href={href} scroll={false}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 16, fontSize: "0.82rem", fontWeight: 800, textDecoration: "none",
                  border: on ? (v.isNew ? "1px solid #6d28d9" : "1px solid #0f172a") : `1px solid ${BORDER}`,
                  background: on ? (v.isNew ? "linear-gradient(135deg,#4c1d95,#6d28d9)" : "#0f172a") : CARD,
                  color: on ? "#fff" : "#64748b" }}>
                {v.isNew && "🌙"} {v.label[lang] || v.label.ko}
              </Link>
            );
          })}
          {ver !== "current" && RAID_VER_NOTE[ver] && (
            <span style={{ fontSize: "0.72rem", color: "#6d28d9", fontWeight: 700 }}>{RAID_VER_NOTE[ver][lang] || RAID_VER_NOTE[ver].ko}</span>
          )}
        </div>

        {/* 속성 스위처 */}
        <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
          {TYPES.map((tk) => {
            const on = tk === type;
            const tc = TYPE_COLOR[tk] || "#64748b";
            return (
              <Link key={tk} href={L(`/gbl/raid/${tk}`)}
                style={{ padding: "5px 11px", borderRadius: 14, fontSize: "0.76rem", fontWeight: 700, textDecoration: "none",
                  border: `1px solid ${on ? tc : BORDER}`, background: on ? tc : CARD, color: on ? "#fff" : "#64748b" }}>
                {typeLabel(lang, tk)}
              </Link>
            );
          })}
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          <span style={{ color: c }}>{tName}{d.h1TypeWord}</span>{d.h1Rest}
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          {d.intro1.replace("{t}", tName)}
        </p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.76rem", color: "#94a3b8" }}>
          {d.intro2.replace("{t}", tName)}
        </p>
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>
          {d.dateLabel} <b style={{ color: "#64748b" }}>{RDV.meta.generated}</b> · <span style={{ color: "#d97706", fontWeight: 700 }}>{d.legacyNote}</span> · <span style={{ color: "#0891b2", fontWeight: 700 }}>{d.upcomingNote}</span>
        </p>
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.7rem", color: "#b0b8c4" }}>
          {d.disclaimer}
        </p>

        {rows.length > 0 && (
          <ListShare
            title={`${tName} ${d.shareTitleSuffix}`}
            subtitle={`${verLabel} · ${d.shareSubtitle}`}
            path={ver === "current" ? `/gbl/raid/${type}` : `/gbl/raid/${type}?v=${ver}`}
            accent={c}
            buttonLabel={d.shareButton}
            filename={`gbl-raid-${type}${ver === "current" ? "" : "-" + ver}.png`}
            footerTag={d.shareFooter}
            trackLabel="raid-dealer"
            headerIcon={type}
            items={rows.slice(0, 12).map((r) => ({
              dex: String(formDex(r.name, r.dex)),
              name: rowName(lang, r),
              main: r.er.toFixed(1),
              sub: `${d.dpsLabel} ${r.dps.toFixed(1)}`,
              note: r.legacy ? "*" : undefined,
              types: r.types || [],
              moves: `${rowFast(lang, r)} · ${rowCharged(lang, r)}`,
              shadow: r.shadow,
            }))}
          />
        )}

        {rows.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>{d.emptyData}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>
            {rows.map((r, i) => {
              const tier = RAID_TIER(r.rel);
              return (
                <div key={`${r.name}-${i}`} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${c}`, borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#94a3b8", width: 22, textAlign: "center" }}>{i + 1}</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#fff", background: TIER_COLOR[tier], minWidth: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>{tier}</span>
                    <span style={{ width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      ...(r.shadow ? { background: "radial-gradient(circle, #a855f7ee 0%, #7c3aed99 42%, transparent 72%)", borderRadius: "50%" } : {}) }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={monSprite(r.name, r.dex)} alt={rowName(lang, r)} width={38} height={38} style={{ imageRendering: "pixelated" }} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>{rowName(lang, r)}</span>
                        <VariantBadge r={r} d={d} stabType={type} />
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
                        {(() => { const fc = TYPE_COLOR[r.fastType] || "#64748b"; return (
                          <span style={{ fontSize: "0.66rem", fontWeight: 600, padding: "1px 6px", borderRadius: 9, background: fc + "22", color: fc, border: `1px solid ${fc}55`, whiteSpace: "nowrap" }}>{rowFast(lang, r)}</span>
                        ); })()}
                        {(() => { const cc = TYPE_COLOR[r.chargedType] || c; return (
                          <span style={{ fontSize: "0.66rem", fontWeight: 600, padding: "1px 6px", borderRadius: 9, background: cc + "22", color: cc, border: `1px solid ${cc}55`, whiteSpace: "nowrap" }}>{rowCharged(lang, r)}{r.legacy && <span style={{ color: "#d97706" }}>*</span>}</span>
                        ); })()}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 62 }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 900, color: c, lineHeight: 1 }}>{r.er.toFixed(1)}</div>
                      <div style={{ fontSize: "0.55rem", color: "#94a3b8", fontWeight: 700, letterSpacing: 0.2, marginTop: 1 }}>{d.overallLabel}</div>
                    </div>
                  </div>
                  {/* rel% 바 + DPS/TDO 상세 수치 */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
                    <div style={{ flex: 1, height: 6, background: "#eef2f8", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${r.rel}%`, height: "100%", background: c, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: "0.66rem", color: "#64748b", whiteSpace: "nowrap" }}>
                      {d.dpsLabel} <b style={{ color: "#334155" }}>{r.dps.toFixed(1)}</b> · {d.tdoLabel} <b style={{ color: "#334155" }}>{r.tdo.toLocaleString()}</b>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AdSlot />

        <div style={{ marginTop: 24, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>{d.explainerH}</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.7 }}>
            {d.explainerBody}{" "}
            <Link href={L("/gbl/raid")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{d.otherTypes}</Link>
          </p>
        </div>

        <CoupangAd />

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{getDict(lang).footer.privacy}</Link>
        </div>
      </div>
    </div>
  );
}
