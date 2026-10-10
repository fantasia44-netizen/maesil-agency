// 보스별 추천 딜러 계산 — 딜러 티어표의 각 행(포켓몬 + 기술배치)을 "이 보스의 타입"에 맞춰 다시 계산한다. ⚠️ 서버 전용.
// 딜러 티어표는 "그 타입이 약점인 가상의 보스"를 가정한다(스페셜 기술 ×1.6, 노멀 기술은 같은 타입일 때만 ×1.6).
// 실제 보스는 노멀 기술 타입을 반감하거나 약점으로 받기도 하므로, 같은 공식에 상성만 실제 값으로 바꿔 넣는다:
//   데미지 = floor(0.5 × 위력 × 공격/180 × 자속 × 상성) + 1,  사이클 DPS = (노멀 n회 + 스페셜 1회) / 걸린 시간
// 공식·가정은 scripts/gbl_compile_raids.py · scripts/gbl/build_raid_moves.mjs와 같다(표 540행 중 530행을 소수 1자리까지 재현 — 나머지 10행은
// 슈퍼메가의 "표시용 전용기" 행이라 표의 값에 상성 비율만 곱한다). 종합 점수는 DPS에 비례하므로 같은 비율로 옮긴다.
// 후보는 딜러표에 오른 조합(타입별 상위 30)이다 — 표에 없는 포켓몬·기술배치는 순위에 나오지 않는다.
import RAIDS from "../gbl_raids.json";
import RAIDS_MF from "../gbl_raids_megafinale.json";
import RAID_MOVES from "../gbl_raid_moves.json";
// 종족 공격·기술 풀. 시즌 게임마스터를 바꾸면 이 경로도 같이(없으면 표에 적힌 반올림 공격값으로 대체해 근사 계산).
import GAMEMASTER from "../sim/pvpoke/gamemaster_s28.json";
import { moveExact, type Move } from "../moves/movesData";
import { dexPath, RAID_DEFAULT_VER, zhNameOfSid } from "../dexHub";
import { ALL_TYPES, typeMult } from "../pokemon/[league]/[id]/typeChart";
import type { Locale } from "../../../../lib/i18n";

type Row = {
  type: string; dps: number; er: number; name: string; nameEn?: string; nameJa?: string; sid?: string; dex: number;
  shadow: boolean; mega?: string; primal?: boolean; types: string[]; legacy?: boolean; upcoming?: boolean;
  fast: string; charged: string; atk: number; fastType: string; chargedType: string;
};
type Pve = { p: number; d: number; e: number };
type GmMon = { speciesId: string; baseStats: { atk: number; def: number; hp: number }; types: string[]; fastMoves?: string[]; chargedMoves?: string[]; eliteMoves?: string[]; legacyMoves?: string[] };

const TABLE = (RAID_DEFAULT_VER === "megafinale" ? RAIDS_MF : RAIDS) as unknown as { meta: { generated: string }; types: Record<string, Row[]> };
const ROWS: Row[] = Object.values(TABLE.types).flat();
const MV = (RAID_MOVES as unknown as { moves: Record<string, Pve> }).moves;
const GM: Record<string, GmMon> = Object.create(null);
for (const p of (GAMEMASTER as unknown as { pokemon: GmMon[] }).pokemon) GM[p.speciesId] = p;

export const TABLE_GENERATED = TABLE.meta.generated;                                   // 딜러표 계산일
export const RAID_MOVES_GENERATED = (RAID_MOVES as unknown as { generatedAt: string }).generatedAt; // 레이드 기술 수치(게임 데이터) 기준일

const CPM40 = 0.7903001, TARGET_DEF = 180, SHADOW_ATK = 1.2, STAB = 1.2, SUPER = 1.6;
const SM_SAME = 1.3, SM_DIFF = 1.1, SM_CPM = 0.8003 / CPM40;   // 슈퍼메가(메가 레벨 4): 기술 타입 배수 + 자기 +2레벨
const dmg = (power: number, atk: number, stab: number, eff: number) => Math.floor(0.5 * power * (atk / TARGET_DEF) * stab * eff) + 1;
// 소수 1자리 — 표(Python round)와 같은 결과가 나오게 정확히 .x5는 짝수 쪽으로.
const r1 = (x: number) => { const y = x * 10, f = Math.floor(y); return (Math.abs(y - f - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(y)) / 10; };

function cycle(r: Row, sm: boolean, effF: number, effC: number): number | null {
  const f = MV[r.fast], c = MV[r.charged];
  if (!f || !c || !f.e || !f.d || !c.d) return null;
  const g = r.sid ? GM[r.sid] : undefined;
  const atk = g ? (g.baseStats.atk + 15) * CPM40 * (sm ? SM_CPM : 1) * (r.shadow ? SHADOW_ATK : 1) : r.atk;
  const stab = (t: string) => (r.types.includes(t) ? STAB : 1), mega = (t: string) => (sm ? (r.types.includes(t) ? SM_SAME : SM_DIFF) : 1);
  const fd = dmg(f.p, atk, stab(r.fastType), effF * mega(r.fastType)), cd = dmg(c.p, atk, stab(r.chargedType), effC * mega(r.chargedType));
  const n = Math.ceil(c.e / f.e);
  return (n * fd + cd) / (n * f.d + c.d);
}
const tableEffF = (r: Row) => (r.fastType === r.chargedType ? SUPER : 1);
// 슈퍼메가 판정 — 메가 행을 두 식으로 계산해 표의 값과 맞는 쪽(현재 버전 표에서는 아무것도 걸리지 않는다).
const SUPER_MEGA = new Set<string>();
for (const r of ROWS) {
  if (!r.mega || !r.sid) continue;
  const a = cycle(r, false, tableEffF(r), SUPER), b = cycle(r, true, tableEffF(r), SUPER);
  if (a != null && b != null && r1(a) !== r.dps && r1(b) === r.dps) SUPER_MEGA.add(r.sid);
}

export const multVs = (atk: string, types: string[]): number => types.reduce((m, t) => m * typeMult(atk, t), 1);
const rowName = (lang: Locale, r: Row): string =>
  (lang === "en" ? r.nameEn : lang === "ja" ? r.nameJa : lang === "zh-TW" ? ((r.sid && zhNameOfSid(r.sid)) || r.nameEn) : r.name) || r.name;

export type AttackerRow = {
  sid: string; name: string; dex: number; shadow: boolean; mega: boolean; upcoming: boolean; legacy: boolean; types: string[];
  type: string; mult: number;          // 스페셜 기술 타입과 보스가 받는 배율
  fastMult: number;                    // 노멀 기술을 보스가 받는 배율
  fast?: Move; charged?: Move; fastId: string; chargedId: string; dps: number; er: number; href: string | null;
};
const toRow = (lang: Locale, r: Row, mult: number, fastMult: number, dps: number, er: number): AttackerRow => ({
  sid: r.sid || "", name: rowName(lang, r), dex: r.dex, shadow: !!r.shadow, mega: !!r.mega || !!r.primal, upcoming: !!r.upcoming, legacy: !!r.legacy, types: r.types,
  type: r.type, mult, fastMult,
  fast: moveExact(r.fast), charged: moveExact(r.charged), fastId: r.fast, chargedId: r.charged, dps, er, href: r.sid ? dexPath(r.sid) : null,
});
const round3 = (x: number) => Math.round(x * 1000) / 1000;

// 보스 타입에 대한 추천 딜러 — 포켓몬마다 가장 점수가 높은 기술배치 하나. plain = 메가·원시·섀도우를 뺀 목록.
export function counterRows(lang: Locale, bossTypes: string[], n = 10, plain = false): AttackerRow[] {
  const best = new Map<string, AttackerRow>();
  for (const r of ROWS) {
    if (plain && (r.shadow || r.mega || r.primal)) continue;
    const sm = !!r.sid && SUPER_MEGA.has(r.sid);
    const c0 = cycle(r, sm, tableEffF(r), SUPER); if (c0 == null) continue;
    const mF = multVs(r.fastType, bossTypes), mC = multVs(r.chargedType, bossTypes);
    const c1 = cycle(r, sm, mF, mC); if (c1 == null) continue;
    const k = c1 / c0;
    const row = toRow(lang, r, round3(mC), round3(mF), r1(c0) === r.dps ? c1 : r.dps * k, r.er * k);
    const key = row.sid || row.name, cur = best.get(key);
    if (!cur || row.er > cur.er) best.set(key, row);
  }
  return [...best.values()].sort((a, b) => b.er - a.er || (a.sid < b.sid ? -1 : 1)).slice(0, n);
}
// 한 타입 딜러표의 상위 n(표의 값 그대로).
export function typeTopRows(lang: Locale, type: string, n = 8): AttackerRow[] {
  return (TABLE.types[type] || []).slice(0, n).map((r) => toRow(lang, r, SUPER, tableEffF(r), r.dps, r.er));
}
export { ALL_TYPES };

// 보스가 쓰는 기술 — 그 종의 현재 기술 풀에서 레거시(엘리트) 기술과 잠재파워를 뺀 것. 메가·원시는 기본 폼의 기술을 쓴다.
export function bossMovePool(sid: string): { fast: Move[]; charged: Move[] } {
  const g = GM[sid.replace(/_shadow$/, "").replace(/_(mega(_[xy])?|primal)$/, "")];
  if (!g) return { fast: [], charged: [] };
  const out = new Set([...(g.eliteMoves || []), ...(g.legacyMoves || [])]);
  const pick = (ids: string[] | undefined) => (ids || []).filter((id) => !out.has(id) && !/^HIDDEN_POWER/.test(id)).map((id) => moveExact(id)).filter((m): m is Move => !!m);
  return { fast: pick(g.fastMoves), charged: pick(g.chargedMoves) };
}
