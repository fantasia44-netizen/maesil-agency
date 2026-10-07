// 도감 허브 — "어디서든 포켓몬을 누르면 그 포켓몬의 도감(상세)으로" 를 위한 서버 전용 조회 모음.
//  · bestDetail / dexPath : speciesId(그림자·메가 포함) → 가장 대표적인 상세 페이지(리그 선택 규칙 한 곳)
//  · standings            : 같은 포켓몬의 리그별 티어·순위(상세의 리그 전환 칩)
//  · baseSidOfDex         : 도감 번호 → 대표 speciesId (IV 체커·레이드 보스처럼 dex만 아는 화면용)
//  · raidRanksOfDex       : 그 포켓몬(모든 폼)의 레이드 딜러 순위(상세의 레이드 칩)
// 티어표·CMP(MonLink)는 "보고 있던 리그의 상세"로 가는 게 맞아 이 규칙을 쓰지 않는다. 리그 맥락이 없는 화면만 사용.
import RAIDS from "./gbl_raids.json";
import RAIDS_MF from "./gbl_raids_megafinale.json";
import IV_KEYS from "./gbl_iv_keys.json";
import { leagueStanding, speciesDexPairs, unrankedDetail, UNRANKED_LEAGUE, hasDetailPage, linkMonId, zhNameOf } from "./indexGate";

export const CORE_LEAGUES = ["great", "ultra", "master"] as const;
const TIER_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };
// 메가·원시는 코어 리그 상세가 없음 → 기본 종 페이지로.
const stripMega = (id: string) => id.replace(/_(mega(_[xyz])?|primal)$/, "");

export type Standing = { league: string; id: string; tier: string; rank: number; ext: boolean };
export function standings(rawId: string): Standing[] {
  const id = stripMega(rawId);
  const out: Standing[] = [];
  for (const lg of CORE_LEAGUES) { const s = leagueStanding(lg, id); if (s) out.push({ league: lg, ...s }); }
  return out;
}
// 대표 상세 = 티어가 가장 높은 리그(동률이면 순위가 높은 쪽). 상위 200에 없으면 확장 중 순위가 높은 리그, 그것도 없으면 랭킹 밖 기본 정보 페이지.
export function bestDetail(rawId: string): { league: string; id: string } | null {
  const id = stripMega(rawId);
  const st = standings(id);
  if (st.length) {
    const key = (s: Standing) => (s.ext ? 100 : 0) + (TIER_ORDER[s.tier] ?? 9) + s.rank / 10000;
    const b = [...st].sort((a, c) => key(a) - key(c))[0];
    return { league: b.league, id: b.id };
  }
  if (unrankedDetail(UNRANKED_LEAGUE, id)) return { league: UNRANKED_LEAGUE, id };
  if (id.endsWith("_shadow")) return bestDetail(id.replace(/_shadow$/, ""));
  return null;
}
export const dexPath = (rawId: string): string | null => { const b = bestDetail(rawId); return b ? `/gbl/pokemon/${b.league}/${b.id}` : null; };
// 리그 맥락이 있는 화면(실측 메타 등) — 그 리그에 페이지가 있으면 그쪽, 없으면 대표 상세.
export const dexPathIn = (league: string, rawId: string): string | null =>
  league && hasDetailPage(league, rawId) ? `/gbl/pokemon/${league}/${linkMonId(league, rawId)}` : dexPath(rawId);
// 도감 번호만 아는 화면(레이드 보스·일정) — 대표 종의 상세.
export const dexPathOfDex = (dex: number | string): string | null => { const sid = baseSidOfDex(dex); return sid ? dexPath(sid) : null; };

// 도감 번호 → 대표 speciesId. 폼이 여럿이면 기본 폼(접미 없는 id → 기본 폼 접미 → 가장 짧은 id) 순으로 고른다.
const DEFAULT_FORM = /_(altered|incarnate|midday|hero|ordinary|aria|standard|land|average|male|baile|full_belly|single_strike|plant|overcast)$/;
const REGIONAL = /_(alolan|galarian|hisuian|paldean)(_|$)/;
const DEX_BASE: Record<number, string> = {};
const DEX_IDS: Record<number, string[]> = {};
{
  const byDex = DEX_IDS;
  for (const { id, dex } of speciesDexPairs()) if (!id.endsWith("_shadow")) (byDex[dex] = byDex[dex] || []).push(id);
  for (const [dex, ids] of Object.entries(byDex)) {
    const score = (id: string) => (REGIONAL.test(id) ? 1000 : 0) + (id.includes("_") ? (DEFAULT_FORM.test(id) ? 10 : 100) : 0) + id.length;
    DEX_BASE[Number(dex)] = [...ids].sort((a, b) => score(a) - score(b))[0];
  }
}
export const baseSidOfDex = (dex: number | string): string | null => DEX_BASE[Number(dex)] || null;
// 보스처럼 "도감 번호 + 영문 이름(폼 표기 포함)"만 아는 화면 — 이름의 폼 표기(Origin Forme · Alolan 등)에 맞는 폼 페이지로.
// 맞는 폼이 없으면 대표 종. 예: "Giratina (Origin Forme)" → giratina_origin, "Alolan Raichu" → raichu_alolan.
const FORM_NOISE = new Set(["forme", "form", "style", "size", "mode", "cloak", "the", "of"]);
export function dexPathOfBoss(dex: number | string, en?: string): string | null {
  const ids = DEX_IDS[Number(dex)] || [];
  if (en && ids.length > 1) {
    const toks: string[] = [];
    const reg = en.match(/\b(Alolan|Galarian|Hisuian|Paldean)\b/i); if (reg) toks.push(reg[1].toLowerCase());
    const par = en.match(/\(([^)]+)\)/); if (par) toks.push(...par[1].toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !FORM_NOISE.has(w)));
    if (toks.length) {
      const hit = ids.filter((id) => { const parts = id.split("_"); return toks.every((t) => parts.includes(t)); }).sort((a, b) => a.length - b.length)[0];
      if (hit) return dexPath(hit);
    }
  }
  return dexPathOfDex(dex);
}

// ── IV 체커 키 ───────────────────────────────────────────────────────
// 상세 페이지 id → IV 체커의 포켓몬 키(도감번호 또는 f:<폼id>). build_moves.mjs가 종족값이 "정확히 같은" 항목만 짝지어 둔다.
// 체커에 그 폼이 없으면 null → 링크를 숨긴다(예전엔 항상 도감번호로 보내, 기라티나 오리진 → 어나더폼 수치가 열렸음).
export const ivKeyOf = (rawId: string): string | null => { const k = (IV_KEYS as Record<string, unknown>)[stripMega(rawId.replace(/_shadow$/, ""))]; return typeof k === "string" ? k : null; };

// ── zh-TW 이름 ───────────────────────────────────────────────────────
// 폼 명칭까지 포함한 종 이름(그림자·메가 표기는 뺀 것) — 뱃지로 따로 표시하는 표용.
export const zhBaseNameOfSid = (sid: string): string | undefined => zhNameOf(stripMega(sid.replace(/_shadow$/, "")));
// 그림자·메가·원시 표기까지 붙인 완성형 — 이름만 한 줄로 쓰는 화면(레이드 목록의 1위 등)용.
export function zhNameOfSid(sid: string): string | undefined {
  const direct = zhNameOf(sid); if (direct) return direct;
  const noSh = sid.replace(/_shadow$/, "");
  const base = zhNameOf(stripMega(noSh)); if (!base) return undefined;
  const xy = /_mega_([xyz])$/.exec(noSh)?.[1]?.toUpperCase() || "";
  const name = /_primal$/.test(noSh) ? `原始${base}` : /_mega(_[xyz])?$/.test(noSh) ? `超級${base}${xy}` : base;
  return sid.endsWith("_shadow") ? `暗影${name}` : name;
}

// ── 레이드 ───────────────────────────────────────────────────────────
// 딜러표 기본 버전 — 레이드 페이지(raid/[type])와 같은 값을 쓴다. 이벤트가 끝나면 "current"로 한 곳만 바꾸면 됨.
export const RAID_DEFAULT_VER: "megafinale" | "current" = "megafinale";
type RaidRow = { type: string; er: number; dex: number; shadow: boolean; mega: boolean | string; primal?: boolean; sid?: string; name: string; nameEn?: string; nameJa?: string };
const RAID = (RAID_DEFAULT_VER === "megafinale" ? RAIDS_MF : RAIDS) as unknown as { types: Record<string, RaidRow[]> };
export type RaidRank = { type: string; rank: number; er: number; shadow: boolean; mega: boolean; megaVariant: string; sid: string };
const RAID_BY_DEX: Record<number, RaidRank[]> = {};
for (const [type, rows] of Object.entries(RAID.types)) rows.forEach((r, i) => {
  const sid = r.sid || "";
  (RAID_BY_DEX[r.dex] = RAID_BY_DEX[r.dex] || []).push({
    type, rank: i + 1, er: r.er, shadow: !!r.shadow, mega: !!r.mega || !!r.primal,
    megaVariant: sid.endsWith("_mega_x") ? "X" : sid.endsWith("_mega_y") ? "Y" : "", sid,
  });
});
for (const list of Object.values(RAID_BY_DEX)) list.sort((a, b) => a.rank - b.rank || b.er - a.er);
// 그 도감 번호의 모든 폼(일반·그림자·메가)이 딜러표 상위 30에 든 기록. 순위 높은 순.
export const raidRanksOfDex = (dex: number | string): RaidRank[] => RAID_BY_DEX[Number(dex)] || [];
// 그중 "이 폼"의 기록만(그림자·메가는 같은 폼으로 봄). 큐레무 페이지에 화이트·블랙 큐레무 순위가,
// 자시안(역전의 용사) 페이지에 검왕 순위가 표기 없이 섞여 나오던 것 방지 — 폼마다 자기 페이지에서 보인다.
const formKey = (sid: string) => stripMega(sid.replace(/_shadow$/, ""));
export const raidRanksOfForm = (dex: number | string, rawId: string): RaidRank[] => { const k = formKey(rawId); return raidRanksOfDex(dex).filter((r) => !r.sid || formKey(r.sid) === k); };
