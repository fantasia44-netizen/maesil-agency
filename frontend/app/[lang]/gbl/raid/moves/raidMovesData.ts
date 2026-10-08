// 레이드 기술 도감 서버 데이터 — gbl_raid_moves.json(build_raid_moves.mjs) + 딜러 티어표(gbl_raids*.json)를 결합.
// ⚠️ 서버 전용. 기술 목록·이름·slug는 배틀 기술 도감(moves/movesData.ts)과 공유하고, 수치만 레이드·체육관(PvE) 것을 쓴다.
//   배틀: 위력/에너지/턴   ·   레이드: 위력/에너지(100 게이지)/시전 시간(초)   — 같은 기술이라도 값이 전부 다름.
import RAW from "../../gbl_raid_moves.json";
import RAIDS from "../../gbl_raids.json";
import RAIDS_MF from "../../gbl_raids_megafinale.json";
import { MOVES, moveExact, speciesName, speciesOf, type Move } from "../../moves/movesData";
import { dexPath, RAID_DEFAULT_VER, zhNameOfSid } from "../../dexHub";
import type { Locale } from "../../../../../lib/i18n";

// top 행 = [speciesId, 짝 기술 id, 사이클 DPS, 노멀 횟수, 사이클 시간(초), 레거시 플래그(1=스페셜, 2=노멀)]
type TopRaw = [string, string, number, number, number, number];
type RawMove = { p: number; d: number; e: number; ws: number; we: number; n: number; top: TopRaw[] };
type RawName = { ko: string; en: string; ja: string; "zh-TW": string; dex: number };
// best = 포켓몬별 레이드 최고 기술배치 [노멀 id, 스페셜 id, 사이클 DPS, 레거시 플래그(1=스페셜, 2=노멀)]
const DATA = RAW as unknown as { generatedAt: string; moves: Record<string, RawMove>; names: Record<string, RawName>; best: Record<string, [string, string, number, number]> };
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export type RaidMove = { m: Move; power: number; dur: number; energy: number; ws: number; learners: number; top: TopRaw[] };
// 배틀 기술 목록 중 레이드 수치가 있는 것만(킬가르도 실드폼 전용 기술·발버둥은 레이드에 없음).
export const RAID_MOVES: RaidMove[] = MOVES.filter((m) => own(DATA.moves, m.id)).map((m) => {
  const r = DATA.moves[m.id];
  return { m, power: r.p, dur: r.d, energy: r.e, ws: r.ws, learners: r.n, top: r.top };
});
export const RAID_FAST = RAID_MOVES.filter((x) => x.m.kind === "fast");
export const RAID_CHARGED = RAID_MOVES.filter((x) => x.m.kind === "charged");
export const RAID_DATA_DATE = DATA.generatedAt;
const BY_SLUG: Record<string, RaidMove> = Object.assign(Object.create(null), Object.fromEntries(RAID_MOVES.map((x) => [x.m.slug, x])));
const BY_ID: Record<string, RaidMove> = Object.assign(Object.create(null), Object.fromEntries(RAID_MOVES.map((x) => [x.m.id, x])));
export const raidMoveBySlug = (slug: string): RaidMove | undefined => BY_SLUG[slug];
export const raidMoveById = (id: string): RaidMove | undefined => BY_ID[id];
export const raidMoveSlugs = (): string[] => RAID_MOVES.map((x) => x.m.slug);

// ── 수치 ─────────────────────────────────────────────────────────────
const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
export const dps = (x: RaidMove) => (x.dur ? r1(x.power / x.dur) : 0);                                   // 초당 위력
export const eps = (x: RaidMove) => (x.m.kind === "fast" && x.dur ? r1(x.energy / x.dur) : 0);           // 초당 에너지(노멀)
export const dpe = (x: RaidMove) => (x.m.kind === "charged" && x.energy ? r2(x.power / x.energy) : 0);    // 에너지당 위력(스페셜)
// 스페셜 기술의 게이지 칸 수 — 에너지 100 = 1칸, 50 = 2칸, 33 = 3칸.
export const bars = (x: RaidMove) => (x.energy >= 100 ? 1 : x.energy >= 50 ? 2 : 3);
export function rankIn(list: RaidMove[], x: RaidMove, f: (y: RaidMove) => number): number { const v = f(x); return list.filter((y) => f(y) > v).length + 1; }
// 초 표기 — 0.5 / 1 / 3.3 처럼 불필요한 0을 뗀다.
export const secText = (s: number): string => String(Math.round(s * 100) / 100);

// ── 포켓몬 이름(섀도우·메가 포함) ─────────────────────────────────────
const SHADOW_PRE: Record<Locale, string> = { ko: "섀도우 ", en: "Shadow ", ja: "シャドウ", "zh-TW": "暗影" };
export function raidMonName(lang: Locale, sid: string): string {
  const shadow = sid.endsWith("_shadow"), base = sid.replace(/_shadow$/, "");
  const nm = (own(DATA.names, base) ? DATA.names[base][lang] : "") || speciesName(lang, base);
  return (shadow ? SHADOW_PRE[lang] : "") + nm;
}
const dexOfSid = (sid: string): number => { const base = sid.replace(/_shadow$/, ""); return (own(DATA.names, base) ? DATA.names[base].dex : 0) || speciesOf(base)?.dex || 0; };
const isMegaSid = (sid: string) => /_(mega(_[xyz])?|primal)$/.test(sid.replace(/_shadow$/, ""));

// ── 이 기술을 가장 세게 쓰는 포켓몬 ───────────────────────────────────
export type TopRow = {
  sid: string; name: string; dex: number; shadow: boolean; mega: boolean; href: string | null;
  pair?: Move; pairId: string; dps: number; n: number; time: number; legacySelf: boolean; legacyPair: boolean;
};
export function topUsers(lang: Locale, x: RaidMove): TopRow[] {
  const isCharged = x.m.kind === "charged";
  return x.top.map(([sid, pairId, d, n, time, fl]) => ({
    sid, name: raidMonName(lang, sid), dex: dexOfSid(sid), shadow: sid.endsWith("_shadow"), mega: isMegaSid(sid), href: dexPath(sid),
    pair: moveExact(pairId), pairId, dps: d, n, time,
    legacySelf: !!(fl & (isCharged ? 1 : 2)), legacyPair: !!(fl & (isCharged ? 2 : 1)),
  }));
}

// ── 포켓몬별 레이드 최고 기술배치(도감 → 레이드 기술 연결용) ──────────
// 딜러 티어표와 같은 조건(레벨 40 · 상대 방어 180 · 스페셜 기술 타입이 약점)에서 사이클 DPS가 가장 높은 조합.
// 표(타입별 상위 30)에 못 든 포켓몬도 값이 있다 — 모든 도감 페이지에서 레이드 기술로 넘어갈 수 있게.
export type RaidSet = { fast: Move; charged: Move; dps: number; legacyFast: boolean; legacyCharged: boolean };
export function bestRaidSet(sid: string): RaidSet | null {
  if (!own(DATA.best || {}, sid)) return null;
  const [f, c, d, fl] = DATA.best[sid];
  const fast = moveExact(f), charged = moveExact(c);
  return fast && charged && BY_ID[f] && BY_ID[c] ? { fast, charged, dps: d, legacyFast: !!(fl & 2), legacyCharged: !!(fl & 1) } : null;
}

// ── 딜러 티어표 채용(기본 버전의 타입별 상위 30) ───────────────────────
type TableRow = { sid?: string; name: string; nameEn?: string; nameJa?: string; dex: number; shadow: boolean; mega: boolean | string; primal?: boolean; fast: string; charged: string; dps: number };
const TABLE = (RAID_DEFAULT_VER === "megafinale" ? RAIDS_MF : RAIDS) as unknown as { types: Record<string, TableRow[]> };
export const TABLE_VERSION = RAID_DEFAULT_VER;
type Use = { type: string; rank: number; row: TableRow };
const USES: Record<string, Use[]> = Object.create(null);
for (const [type, rows] of Object.entries(TABLE.types)) rows.forEach((row, i) => {
  for (const id of [row.fast, row.charged]) (USES[id] = USES[id] || []).push({ type, rank: i + 1, row });
});
export type TableUse = { type: string; rank: number; sid: string; name: string; dex: number; shadow: boolean; koName: string; href: string | null; other?: Move; otherId: string; dps: number };
export function tableUsers(lang: Locale, x: RaidMove): TableUse[] {
  return (USES[x.m.id] || []).map(({ type, rank, row }) => {
    const sid = row.sid || "";
    const name = (lang === "en" ? row.nameEn : lang === "ja" ? row.nameJa : lang === "zh-TW" ? ((sid && zhNameOfSid(sid)) || row.nameEn) : row.name) || row.name;
    const otherId = x.m.kind === "charged" ? row.fast : row.charged;
    return { type, rank, sid, name, dex: row.dex, shadow: !!row.shadow, koName: row.name, href: sid ? dexPath(sid) : null, other: moveExact(otherId), otherId, dps: row.dps };
  }).sort((a, b) => a.rank - b.rank || (a.type < b.type ? -1 : 1));
}
// 기술별 딜러표 채용 수(고유 포켓몬 — 같은 종이 여러 타입 표에 올라도 한 번).
export function usageCount(x: RaidMove): number { return new Set((USES[x.m.id] || []).map((u) => u.row.sid || u.row.name)).size; }
