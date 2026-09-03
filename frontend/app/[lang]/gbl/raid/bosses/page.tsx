// 현재 레이드 보스 현황 — 서버렌더(ISR). ScrapedDuck(LeekDuck) 오픈피드를 런타임에 받아 자동 갱신.
// 보스별 100% CP(일반/날씨부스트) + 약점 속성 → 해당 속성 딜러 티어표로 연결.
import Link from "next/link";
import type { Metadata } from "next";
import POKEDEX from "../../pokedex_ko.json";
import PKN from "../../pokedex_names.json";
import STATSJSON from "../../pokedex_stats.json";
import CpTable from "./CpTable";
import ListShare from "../../ListShare";
import { pokeSprite, shinySprite, formDex } from "../../sprite";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../../lib/i18n";
import { typeLabel } from "../../typeLabels";
import { localName } from "../../contentI18n";
import { getBosses, type BossesDict } from "./dict";

export const revalidate = 600; // 6시간마다 갱신(보스 로테이션 반영)

const KO = POKEDEX as Record<string, string>;
const PKNAMES = PKN as unknown as Record<string, { ko: string; en: string; ja: string }>;
const STATS = STATSJSON as Record<string, { a: number; d: number; s: number }>;

// 레이드 포획 레벨: 일반 L20(CPM 0.5974), 날씨부스트 L25(0.667934)
const CPM_L20 = 0.5974, CPM_L25 = 0.667934;
function cpAt(st: { a: number; d: number; s: number }, iv: [number, number, number], cpm: number): number {
  return Math.max(10, Math.floor((st.a + iv[0]) * Math.sqrt(st.d + iv[1]) * Math.sqrt(st.s + iv[2]) * cpm * cpm / 10));
}
function dexOf(image: string): string {
  const m = image.match(/\/pm(\d+)\./) || image.match(/pokemon_icon_(\d+)_/);
  return m ? String(Number(m[1])) : "";
}

// 이로치 데뷔 레이드 수동 보정 — 피드(ScrapedDuck canBeShiny) 반영이 늦은 신상 보스.
// 이로치는 한 번 풀리면 계속 유지되므로 안전(피드가 true로 바뀌면 자동 중복 무해).
const SHINY_DEBUT = new Set(["792"]); // 792=루나아라(이로치 데뷔 강조 레이드)
function canBeShinyOf(b: Boss): boolean {
  return !!b.canBeShiny || SHINY_DEBUT.has(dexOf(b.image));
}

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};
const TYPE_KO: Record<string, string> = {
  normal: "노말", fire: "불꽃", water: "물", electric: "전기", grass: "풀", ice: "얼음",
  fighting: "격투", poison: "독", ground: "땅", flying: "비행", psychic: "에스퍼", bug: "벌레",
  rock: "바위", ghost: "고스트", dragon: "드래곤", dark: "악", steel: "강철", fairy: "페어리",
};

// 타입 상성(공격자 → 방어자). SE=슈퍼(1.6), NVE=반감(0.625), IMM=무효(0.39).
const SE: Record<string, string[]> = {
  normal: [], fire: ["grass", "ice", "bug", "steel"], water: ["fire", "ground", "rock"],
  electric: ["water", "flying"], grass: ["water", "ground", "rock"],
  ice: ["grass", "ground", "flying", "dragon"], fighting: ["normal", "ice", "rock", "dark", "steel"],
  poison: ["grass", "fairy"], ground: ["fire", "electric", "poison", "rock", "steel"],
  flying: ["grass", "fighting", "bug"], psychic: ["fighting", "poison"], bug: ["grass", "psychic", "dark"],
  rock: ["fire", "ice", "flying", "bug"], ghost: ["psychic", "ghost"], dragon: ["dragon"],
  dark: ["psychic", "ghost"], steel: ["ice", "rock", "fairy"], fairy: ["fighting", "dragon", "dark"],
};
const NVE: Record<string, string[]> = {
  normal: ["rock", "steel"], fire: ["fire", "water", "rock", "dragon"], water: ["water", "grass", "dragon"],
  electric: ["electric", "grass", "dragon"], grass: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
  ice: ["fire", "water", "ice", "steel"], fighting: ["poison", "flying", "psychic", "bug", "fairy"],
  poison: ["poison", "ground", "rock", "ghost"], ground: ["grass", "bug"], flying: ["electric", "rock", "steel"],
  psychic: ["psychic", "steel"], bug: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
  rock: ["fighting", "ground", "steel"], ghost: ["dark"], dragon: ["steel"],
  dark: ["fighting", "dark", "fairy"], steel: ["fire", "water", "electric", "steel"], fairy: ["fire", "poison", "steel"],
};
const IMM: Record<string, string> = { normal: "ghost", fighting: "ghost", electric: "ground", poison: "steel", ground: "flying", psychic: "dark", ghost: "normal", dragon: "fairy" };

function eff(atk: string, def: string): number {
  if (IMM[atk] === def) return 0.39;
  if (SE[atk]?.includes(def)) return 1.6;
  if (NVE[atk]?.includes(def)) return 0.625;
  return 1;
}
function weaknesses(types: string[]): { t: string; m: number }[] {
  const out: { t: string; m: number }[] = [];
  for (const atk of Object.keys(TYPE_KO)) {
    const m = types.reduce((acc, d) => acc * eff(atk, d), 1);
    if (m > 1.01) out.push({ t: atk, m });
  }
  return out.sort((a, b) => b.m - a.m);
}

type CP = { min: number; max: number };
type Boss = {
  name: string; tier: string; canBeShiny: boolean;
  types: { name: string }[]; image: string;
  combatPower: { normal: CP; boosted: CP };
};

async function getBosses2(): Promise<Boss[]> {
  try {
    const res = await fetch("https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json", { next: { revalidate } });
    if (!res.ok) return [];
    return (await res.json()) as Boss[];
  } catch {
    return [];
  }
}

// 스프라이트·폼 판정용 한글 이름(formDex는 한글 키워드로 폼을 식별하므로 유지 필수).
function bossKo(b: Boss): string {
  const dex = dexOf(b.image);
  const form = (b.image.match(/\.f([A-Z_0-9]+)\./)?.[1] || "");
  let base = KO[dex] || b.name;
  if (/HISUIAN/.test(form)) base = "히스이 " + base;
  else if (/ALOLAN/.test(form)) base = "알로라 " + base;
  else if (/GALARIAN/.test(form)) base = "가라르 " + base;
  else if (/PALDEAN/.test(form)) base = "팔데아 " + base;
  if (/ORIGIN/.test(form)) base += " (오리진)";
  const isMega = /^Mega /.test(b.name) || form === "MEGA";
  const isShadow = /^Shadow /.test(b.name);
  if (isMega) base = "메가 " + base;
  if (isShadow) base = "섀도우 " + base;
  return base;
}
// 표시용 로케일 이름(메가·지역폼 등 접두는 로케일별 사전 적용).
function bossName(lang: Locale, b: Boss, t: BossesDict): string {
  const dex = dexOf(b.image);
  const form = (b.image.match(/\.f([A-Z_0-9]+)\./)?.[1] || "");
  let base = localName(lang, PKNAMES[dex], KO[dex] || b.name);
  if (/HISUIAN/.test(form)) base = t.pfx.hisui + base;
  else if (/ALOLAN/.test(form)) base = t.pfx.alola + base;
  else if (/GALARIAN/.test(form)) base = t.pfx.galar + base;
  else if (/PALDEAN/.test(form)) base = t.pfx.paldea + base;
  if (/ORIGIN/.test(form)) base += t.pfx.origin;
  const isMega = /^Mega /.test(b.name) || form === "MEGA";
  const isShadow = /^Shadow /.test(b.name);
  if (isMega) base = t.pfx.mega + base;
  if (isShadow) base = t.pfx.shadow + base;
  return base;
}

const PATH = "/gbl/raid/bosses";
export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getBosses(lang);
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    keywords: t.metaKeywords,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) },
    openGraph: { title: t.ogTitle, description: t.ogDesc, url: localizePath(lang, PATH), images: [`https://gblnote.com${localizePath(lang, PATH + "/opengraph-image")}`], type: "website" },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";
// 한국 유저는 5성·메가·엘리트만 필요 → 1·3성(및 그 섀도우) 제외
const HIDE_TIERS = new Set(["1-Star Raids", "3-Star Raids"]);
const TIER_ORDER = ["Elite Raids", "Mega Raids", "5-Star Raids", "Primal Raids", "Shadow Raids"];
const TIER_COLOR: Record<string, string> = {
  "Elite Raids": "#b91c1c", "Mega Raids": "#7c3aed", "5-Star Raids": "#dc2626", "Primal Raids": "#c2410c", "Shadow Raids": "#4b0082",
};
const tierLabel = (t: BossesDict, tier: string): string =>
  tier === "Elite Raids" ? t.tierElite : tier === "Mega Raids" ? t.tierMega : tier === "5-Star Raids" ? t.tier5
    : tier === "Primal Raids" ? t.tierPrimal : tier === "Shadow Raids" ? t.tierShadow : tier;

export default async function BossesPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getBosses(lang);
  const L = (p: string) => localizePath(lang, p);
  const bosses = await getBosses2();
  const byTier: Record<string, Boss[]> = {};
  for (const b of bosses) (byTier[b.tier] || (byTier[b.tier] = [])).push(b);
  const visibleTiers = Object.keys(byTier).filter((t) => !HIDE_TIERS.has(t))
    .sort((a, b) => (TIER_ORDER.indexOf(a) < 0 ? 99 : TIER_ORDER.indexOf(a)) - (TIER_ORDER.indexOf(b) < 0 ? 99 : TIER_ORDER.indexOf(b)));
  const shareItems = visibleTiers.flatMap((tt) => byTier[tt]).map((b) => ({
    dex: String(formDex(bossKo(b), dexOf(b.image))), name: bossName(lang, b, t),
    main: b.combatPower?.normal?.max != null ? String(b.combatPower.normal.max) : "",
    sub: b.combatPower?.boosted?.max != null ? `${t.weatherLabel} ${b.combatPower.boosted.max}` : "",
  }));

  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #ffe3d1 0%, transparent 60%), linear-gradient(180deg,#fdf8f4,#f4eef8)",
    padding: "1.4rem 1rem 4rem",
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl/raid")} style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none" }}>{t.navBack}</Link>
          <Link href={L("/gbl")} style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{t.navHub}</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          {t.h1}
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          {t.intro.map((s, i) => s.b ? <b key={i} style={{ color: "#334155" }}>{s.t}</b> : <span key={i}>{s.t}</span>)}
        </p>
        <p style={{ margin: "0.4rem 0 0", fontSize: "0.74rem", color: "#94a3b8" }}>
          {t.sub.map((s, i) => s.b ? <b key={i} style={{ color: "#64748b" }}>{s.t}</b> : <span key={i}>{s.t}</span>)}
        </p>

        {shareItems.length > 0 && (
          <ListShare
            title={t.shareTitle}
            subtitle={t.shareSubtitle}
            path="/gbl/raid/bosses"
            accent="#ea580c"
            buttonLabel={t.shareButton}
            filename="gbl-raid-bosses.png"
            footerTag={t.shareFooter}
            trackLabel="boss-list"
            items={shareItems}
          />
        )}

        {visibleTiers.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>{bosses.length === 0 ? t.loadFail : t.noneOpen}</div>
        ) : (
          visibleTiers.map((tier) => {
            const tc = TIER_COLOR[tier] || "#64748b";
            return (
              <div key={tier} style={{ marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#fff", background: tc, borderRadius: 8, padding: "3px 11px" }}>{tierLabel(t, tier)}</span>
                  <span style={{ fontSize: "0.76rem", color: "#94a3b8" }}>{byTier[tier].length}{t.countSuffix}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {byTier[tier].map((b, i) => {
                    const types = (b.types || []).map((t) => t.name);
                    const weak = weaknesses(types).slice(0, 4);
                    const c1 = TYPE_COLOR[types[0]] || "#cbd5e1";
                    const st = STATS[dexOf(b.image)];
                    const shinyOk = canBeShinyOf(b);
                    // 계산 100%가 피드값과 일치할 때만 IV표 노출(지역폼 등 종족값 불일치 방지)
                    const cpOk = !!st && Math.abs(cpAt(st, [15, 15, 15], CPM_L20) - b.combatPower.normal.max) <= 2;
                    return (
                      <div key={`${b.name}-${i}`} id={`b${dexOf(b.image) || `${b.name}-${i}`}`} style={{ scrollMarginTop: 12, background: CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${c1}`, borderRadius: 12, padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {(() => {
                            const fdex = formDex(bossKo(b), dexOf(b.image));
                            const isShadow = /^Shadow /.test(b.name);
                            const aura = isShadow ? { background: "radial-gradient(circle, #a855f7ee 0%, #7c3aed99 42%, transparent 72%)", borderRadius: "50%" } : {};
                            return (
                              // 이로치 가능하면 일반+이로치 스프라이트를 나란히 표시
                              <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                                <div style={{ width: 46, height: 46, display: "flex", alignItems: "center", justifyContent: "center", ...aura }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={pokeSprite(fdex)} alt={bossName(lang, b, t)} width={46} height={46} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
                                </div>
                                {shinyOk && (
                                  <div style={{ position: "relative", width: 46, height: 46, display: "flex", alignItems: "center", justifyContent: "center", ...aura }} title="shiny available">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={shinySprite(fdex)} alt={`${bossName(lang, b, t)} shiny`} width={46} height={46} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
                                    <span style={{ position: "absolute", top: -3, right: -2, fontSize: "0.66rem" }}>✨</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: "0.98rem", fontWeight: 800, color: "#0f172a" }}>{bossName(lang, b, t)}</span>
                              <span style={{ display: "flex", gap: 3 }}>
                                {types.map((ty) => (
                                  <span key={ty} style={{ fontSize: "0.6rem", fontWeight: 700, color: "#fff", background: TYPE_COLOR[ty] || "#94a3b8", padding: "1px 6px", borderRadius: 6 }}>{typeLabel(lang, ty)}</span>
                                ))}
                              </span>
                            </div>
                            {b.combatPower?.normal?.max != null && (
                              <div style={{ fontSize: "0.78rem", color: "#334155", marginTop: 3 }}>
                                <b style={{ color: "#0f172a" }}>100% {b.combatPower.normal.max}</b>
                                {b.combatPower.boosted?.max != null && <span style={{ color: "#94a3b8" }}> · {t.weatherLabel} {b.combatPower.boosted.max}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        {cpOk && st && (
                          <CpTable stats={st} hundoL20={cpAt(st, [15, 15, 15], CPM_L20)} hundoL25={cpAt(st, [15, 15, 15], CPM_L25)} name={bossName(lang, b, t)} accent={c1} dex={String(formDex(bossKo(b), dexOf(b.image)))} shiny={shinyOk} />
                        )}
                        {weak.length > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${BORDER}` }}>
                            <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600 }}>{t.weakDealer}</span>
                            {weak.map((w) => {
                              const wc = TYPE_COLOR[w.t] || "#64748b";
                              return (
                                <Link key={w.t} href={L(`/gbl/raid/${w.t}`)}
                                  style={{ fontSize: "0.72rem", fontWeight: 700, textDecoration: "none", color: wc, background: wc + "18", border: `1px solid ${wc}55`, borderRadius: 12, padding: "3px 10px" }}>
                                  {typeLabel(lang, w.t)}{w.m > 2 ? " ×2" : ""}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        <div style={{ marginTop: 24, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>{t.explainH}</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>
            {t.explainBody.map((s, i) => s.b ? <b key={i}>{s.t}</b> : <span key={i}>{s.t}</span>)}
            <Link href={L("/gbl/raid")} style={{ color: "#ea580c", fontWeight: 600 }}>{t.explainLink}</Link>
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: "0.72rem", color: "#94a3b8" }}>
          {t.dataSource}<Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{t.privacy}</Link>
        </div>
      </div>
    </div>
  );
}
