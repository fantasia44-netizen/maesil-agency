// 도감 허브 — "어디서든 포켓몬을 누르면 그 포켓몬의 도감(상세)으로" 를 위한 서버 전용 조회 모음.
//  · bestDetail / dexPath : speciesId(그림자·메가 포함) → 가장 대표적인 상세 페이지(리그 선택 규칙 한 곳)
//  · standings            : 같은 포켓몬의 리그별 티어·순위(상세의 리그 전환 칩)
//  · baseSidOfDex         : 도감 번호 → 대표 speciesId (IV 체커·레이드 보스처럼 dex만 아는 화면용)
//  · raidRanksOfDex       : 그 포켓몬(모든 폼)의 레이드 딜러 순위(상세의 레이드 칩)
// 티어표·CMP(MonLink)는 "보고 있던 리그의 상세"로 가는 게 맞아 이 규칙을 쓰지 않는다. 리그 맥락이 없는 화면만 사용.
import RAIDS from "./gbl_raids.json";
import RAIDS_MF from "./gbl_raids_megafinale.json";
import { leagueStanding, speciesDexPairs, unrankedDetail, UNRANKED_LEAGUE } from "./indexGate";

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

// 도감 번호 → 대표 speciesId. 폼이 여럿이면 기본 폼(접미 없는 id → 기본 폼 접미 → 가장 짧은 id) 순으로 고른다.
const DEFAULT_FORM = /_(altered|incarnate|midday|hero|ordinary|aria|standard|land|average|male|baile|full_belly|single_strike|plant|overcast)$/;
const REGIONAL = /_(alolan|galarian|hisuian|paldean)(_|$)/;
const DEX_BASE: Record<number, string> = {};
{
  const byDex: Record<number, string[]> = {};
  for (const { id, dex } of speciesDexPairs()) if (!id.endsWith("_shadow")) (byDex[dex] = byDex[dex] || []).push(id);
  for (const [dex, ids] of Object.entries(byDex)) {
    const score = (id: string) => (REGIONAL.test(id) ? 1000 : 0) + (id.includes("_") ? (DEFAULT_FORM.test(id) ? 10 : 100) : 0) + id.length;
    DEX_BASE[Number(dex)] = [...ids].sort((a, b) => score(a) - score(b))[0];
  }
}
export const baseSidOfDex = (dex: number | string): string | null => DEX_BASE[Number(dex)] || null;

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
