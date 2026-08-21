// 현재 레이드 보스 현황 — 서버렌더(ISR). ScrapedDuck(LeekDuck) 오픈피드를 런타임에 받아 자동 갱신.
// 보스별 100% CP(일반/날씨부스트) + 약점 속성 → 해당 속성 딜러 티어표로 연결.
import Link from "next/link";
import type { Metadata } from "next";
import POKEDEX from "../../pokedex_ko.json";
import STATSJSON from "../../pokedex_stats.json";
import CpTable from "./CpTable";
import ListShare from "../../ListShare";
import { pokeSprite, shinySprite, formDex } from "../../sprite";

export const revalidate = 600; // 6시간마다 갱신(보스 로테이션 반영)

const KO = POKEDEX as Record<string, string>;
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

async function getBosses(): Promise<Boss[]> {
  try {
    const res = await fetch("https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json", { next: { revalidate } });
    if (!res.ok) return [];
    return (await res.json()) as Boss[];
  } catch {
    return [];
  }
}

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

export const metadata: Metadata = {
  title: "포켓몬고 현재 레이드 보스 · 100% CP 표 | GBL Note",
  description: "지금 열리는 포켓몬 GO 5성·메가 레이드 보스 목록. 보스별 개체값(IV)별 포획 CP표 — 100개체(15/15/15) CP를 일반·날씨부스트 기준으로 확인. 약점 속성·추천 딜러까지. 자동 업데이트.",
  keywords: ["포켓몬고 레이드 보스", "100 CP", "100개체 CP", "레이드 CP표", "개체값 CP", "15 15 15 CP", "5성 레이드", "메가 레이드", "포켓몬고 꿀박"],
  alternates: { canonical: "/gbl/raid/bosses" },
  openGraph: { title: "포켓몬고 현재 레이드 보스 · 100% CP", description: "5성·메가·3성 보스 100% CP + 약점 딜러", url: "/gbl/raid/bosses", images: ["/gbl-og.png"], type: "website" },
};

const CARD = "#ffffff";
const BORDER = "#e3e8f2";
// 한국 유저는 5성·메가·엘리트만 필요 → 1·3성(및 그 섀도우) 제외
const HIDE_TIERS = new Set(["1-Star Raids", "3-Star Raids"]);
const TIER_ORDER = ["Elite Raids", "Mega Raids", "5-Star Raids", "Primal Raids", "Shadow Raids"];
const TIER_KO: Record<string, { t: string; c: string }> = {
  "Elite Raids": { t: "엘리트 레이드", c: "#b91c1c" },
  "Mega Raids": { t: "메가 레이드", c: "#7c3aed" },
  "5-Star Raids": { t: "5성 레이드 (전설)", c: "#dc2626" },
  "Primal Raids": { t: "원시 레이드", c: "#c2410c" },
  "Shadow Raids": { t: "섀도우 레이드", c: "#4b0082" },
};

export default async function BossesPage() {
  const bosses = await getBosses();
  const byTier: Record<string, Boss[]> = {};
  for (const b of bosses) (byTier[b.tier] || (byTier[b.tier] = [])).push(b);
  const visibleTiers = Object.keys(byTier).filter((t) => !HIDE_TIERS.has(t))
    .sort((a, b) => (TIER_ORDER.indexOf(a) < 0 ? 99 : TIER_ORDER.indexOf(a)) - (TIER_ORDER.indexOf(b) < 0 ? 99 : TIER_ORDER.indexOf(b)));
  const shareItems = visibleTiers.flatMap((t) => byTier[t]).map((b) => ({
    dex: String(formDex(bossKo(b), dexOf(b.image))), name: bossKo(b),
    main: b.combatPower?.normal?.max != null ? String(b.combatPower.normal.max) : "",
    sub: b.combatPower?.boosted?.max != null ? `날씨 ${b.combatPower.boosted.max}` : "",
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
          <Link href="/gbl/raid" style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none" }}>← 레이드 딜러 티어</Link>
          <Link href="/gbl" style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>GBL Note →</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          현재 레이드 보스 · 100% CP
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          지금 열리는 레이드 보스와 <b style={{ color: "#334155" }}>100% 개체값 CP</b>(잡을 때 이 CP면 15/15/15)입니다.
          <b style={{ color: "#334155" }}> 약점 속성</b>을 누르면 그 속성 <b style={{ color: "#334155" }}>추천 딜러 티어표</b>로 이동합니다.
        </p>
        <p style={{ margin: "0.4rem 0 0", fontSize: "0.74rem", color: "#94a3b8" }}>
          5성·메가 레이드만 표시(1·3성 제외). 각 보스 아래 <b style={{ color: "#64748b" }}>개체값별 포획 CP표</b>로 100개체(15/15/15)인지 확인하세요.
          날씨부스트 = 해당 날씨일 때 레벨25로 등장(더 높은 CP). 메가·원시 레이드는 <b style={{ color: "#64748b" }}>기본폼을 포획</b>합니다(표는 잡는 CP). ✨ = 샤이니 가능. 자동 업데이트.
        </p>

        {shareItems.length > 0 && (
          <ListShare
            title="이달 레이드 보스 100% CP"
            subtitle="잡을 때 이 CP면 100개체(15/15/15) · 날씨=부스트"
            path="/gbl/raid/bosses"
            accent="#ea580c"
            buttonLabel="📸 이달 보스 CP표 이미지로 공유·저장"
            filename="gbl-raid-bosses.png"
            footerTag="포켓몬GO 레이드 보스 CP"
            trackLabel="boss-list"
            items={shareItems}
          />
        )}

        {visibleTiers.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>{bosses.length === 0 ? "보스 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." : "지금 열린 5성·메가 레이드가 없습니다."}</div>
        ) : (
          visibleTiers.map((tier) => {
            const tk = TIER_KO[tier] || { t: tier, c: "#64748b" };
            return (
              <div key={tier} style={{ marginTop: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#fff", background: tk.c, borderRadius: 8, padding: "3px 11px" }}>{tk.t}</span>
                  <span style={{ fontSize: "0.76rem", color: "#94a3b8" }}>{byTier[tier].length}종</span>
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
                                  <img src={pokeSprite(fdex)} alt={bossKo(b)} width={46} height={46} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
                                </div>
                                {shinyOk && (
                                  <div style={{ position: "relative", width: 46, height: 46, display: "flex", alignItems: "center", justifyContent: "center", ...aura }} title="색이 다른 개체(이로치) 가능">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={shinySprite(fdex)} alt={`${bossKo(b)} 이로치`} width={46} height={46} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
                                    <span style={{ position: "absolute", top: -3, right: -2, fontSize: "0.66rem" }}>✨</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: "0.98rem", fontWeight: 800, color: "#0f172a" }}>{bossKo(b)}</span>
                              <span style={{ display: "flex", gap: 3 }}>
                                {types.map((t) => (
                                  <span key={t} style={{ fontSize: "0.6rem", fontWeight: 700, color: "#fff", background: TYPE_COLOR[t] || "#94a3b8", padding: "1px 6px", borderRadius: 6 }}>{TYPE_KO[t] || t}</span>
                                ))}
                              </span>
                            </div>
                            {b.combatPower?.normal?.max != null && (
                              <div style={{ fontSize: "0.78rem", color: "#334155", marginTop: 3 }}>
                                <b style={{ color: "#0f172a" }}>100% {b.combatPower.normal.max}</b>
                                {b.combatPower.boosted?.max != null && <span style={{ color: "#94a3b8" }}> · 날씨 {b.combatPower.boosted.max}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        {cpOk && st && (
                          <CpTable stats={st} hundoL20={cpAt(st, [15, 15, 15], CPM_L20)} hundoL25={cpAt(st, [15, 15, 15], CPM_L25)} name={bossKo(b)} accent={c1} dex={String(formDex(bossKo(b), dexOf(b.image)))} shiny={shinyOk} />
                        )}
                        {weak.length > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${BORDER}` }}>
                            <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600 }}>약점 딜러 →</span>
                            {weak.map((w) => {
                              const wc = TYPE_COLOR[w.t] || "#64748b";
                              return (
                                <Link key={w.t} href={`/gbl/raid/${w.t}`}
                                  style={{ fontSize: "0.72rem", fontWeight: 700, textDecoration: "none", color: wc, background: wc + "18", border: `1px solid ${wc}55`, borderRadius: 12, padding: "3px 10px" }}>
                                  {TYPE_KO[w.t]}{w.m > 2 ? " ×2" : ""}
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
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>100% CP가 뭔가요?</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>
            레이드에서 잡을 때 CP는 개체값(IV)에 따라 정해진 값으로만 나옵니다. 표시된 <b>100% CP</b>는 <b>15/15/15(최고 개체값)</b>일 때의 CP예요.
            잡기 화면 CP가 이 숫자와 같으면 100% 개체입니다(날씨부스트면 날씨 CP 기준). 약점 속성을 눌러 어떤 포켓몬으로 잡을지 확인하세요.{" "}
            <Link href="/gbl/raid" style={{ color: "#ea580c", fontWeight: 600 }}>속성별 딜러 티어표 →</Link>
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: "0.72rem", color: "#94a3b8" }}>
          보스 데이터: LeekDuck(ScrapedDuck) · <Link href="/gbl/privacy" style={{ color: "#64748b", textDecoration: "none" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
