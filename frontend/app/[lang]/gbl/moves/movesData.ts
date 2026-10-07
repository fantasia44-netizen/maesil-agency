// 기술 도감 서버 데이터 — gbl_moves.json(build_moves.mjs) + 현재 시즌 티어 스냅샷을 결합.
// ⚠️ 서버 전용(스냅샷 JSON 1.3MB를 import). 클라이언트 컴포넌트는 여기서 만든 plain row만 prop으로 받는다.
// 계산 3종은 전부 여기서: ① 타수(에너지 이월) ② 메타 채용(현재 시즌 추천 기술배치) ③ 예상 데미지(리그 평균 상대 기준).
import RAW from "../gbl_moves.json";
import DETAIL from "../gbl_detail.json";
import DETAIL_S28 from "../gbl_detail_s28.json";
import PKNAMES from "../pokedex_names.json";
import { currentSeason } from "../seasons";
import { typeLabel } from "../typeLabels";
import { isMetaMon, linkMonId, hasDetailLink } from "../indexGate";
import { bestDetail } from "../dexHub";
import type { Locale } from "../../../../lib/i18n";

export type Buff = { self: number[] | null; opp: number[] | null; chance: number };
export type Move = {
  id: string; slug: string; kind: "fast" | "charged"; type: string;
  power: number; energy: number; gain: number; turns: number; buff?: Buff;
  n: Record<string, string>; learners: string[]; elite?: string[];
};
type Species = { dex: number; types: string[]; n: Record<string, string> };
const DATA = RAW as unknown as { generatedAt: string; gmTimestamp: string; species: Record<string, Species>; moves: Move[] };

export const MOVES: Move[] = DATA.moves;
export const MOVES_GENERATED = DATA.generatedAt;
export const GM_DATE = (DATA.gmTimestamp || "").slice(0, 10);
const BY_SLUG: Record<string, Move> = Object.fromEntries(MOVES.map((m) => [m.slug, m]));
const BY_ID: Record<string, Move> = Object.fromEntries(MOVES.map((m) => [m.id, m]));
export const moveBySlug = (slug: string): Move | undefined => BY_SLUG[slug];
export const moveById = (id: string): Move | undefined => BY_ID[id] || BY_ID[id.replace(/_PLUS$/, "")];
export const FAST = MOVES.filter((m) => m.kind === "fast");
export const CHARGED = MOVES.filter((m) => m.kind === "charged");

// ── 이름 ─────────────────────────────────────────────────────────────
// 같은 이름으로 떨어지는 변형(웨더볼·테크노버스터·잠재파워=타입별, 킬가르도 실드폼 전용 빠른기술)은 접미로 구분.
const SHIELD: Record<Locale, string> = { ko: " (실드폼)", en: " (Shield Forme)", ja: "（シールドフォルム）", "zh-TW": "（盾牌形態）" };
export function moveName(lang: Locale, m: Move): string {
  const base = m.n[lang] || m.n.en || m.id;
  if (m.id.startsWith("AEGISLASH_CHARGE_")) return base + SHIELD[lang];
  if (/^(WEATHER_BALL|TECHNO_BLAST|HIDDEN_POWER)_/.test(m.id) && !/[（(]/.test(base)) return `${base} (${typeLabel(lang, m.type)})`;
  return base;
}
export const speciesName = (lang: Locale, sid: string): string => DATA.species[sid]?.n[lang] || DATA.species[sid]?.n.en || sid;
export const speciesOf = (sid: string): Species | undefined => DATA.species[sid];

// ── 수치 ─────────────────────────────────────────────────────────────
const r2 = (x: number) => Math.round(x * 100) / 100;
export const dpt = (m: Move) => (m.kind === "fast" ? r2(m.power / m.turns) : 0);   // 턴당 데미지(빠른)
export const ept = (m: Move) => (m.kind === "fast" ? r2(m.gain / m.turns) : 0);    // 턴당 에너지(빠른)
export const dpe = (m: Move) => (m.kind === "charged" && m.energy ? r2(m.power / m.energy) : 0); // 에너지당 데미지(차지)

// 연속 발동 시 타수(에너지 이월 반영) — 티어표·CMP·상세와 같은 규칙.
export function tausSeq(cost: number, gain: number, n = 3): number[] {
  if (!gain || !cost) return [];
  let energy = 0; const seq: number[] = [];
  for (let i = 0; i < n; i++) { const need = cost - energy; const t = need > 0 ? Math.ceil(need / gain) : 0; energy += t * gain - cost; seq.push(t); }
  return seq;
}
// 같은 종류 안에서의 순위(1위=가장 높음). 동률은 같은 순위.
export function rankIn(list: Move[], m: Move, f: (x: Move) => number): number {
  const v = f(m); return list.filter((x) => f(x) > v).length + 1;
}

// ── 같이 배우는 기술(타수표용) ────────────────────────────────────────
const LEARNS: Record<string, Set<string>> = {};
for (const m of MOVES) for (const s of m.learners) (LEARNS[s] = LEARNS[s] || new Set()).add(m.id);
// 이 기술을 배우는 포켓몬이 함께 배울 수 있는 반대 종류 기술들.
export function coLearned(m: Move): Move[] {
  const ids = new Set<string>();
  // 루브도(스케치로 전 기술 습득)는 제외 — 넣으면 모든 기술이 서로 "같이 배우는 기술"이 돼 표가 무의미해짐.
  for (const s of m.learners) { if (s === "smeargle") continue; for (const id of LEARNS[s] || []) ids.add(id); }
  const want = m.kind === "charged" ? "fast" : "charged";
  return [...ids].map((id) => BY_ID[id]).filter((x) => x && x.kind === want);
}
export type CountRow = { key: string; gain: number; turns: number; energy: number; moves: Move[]; counts: number[]; firstTurns: number };
// 차지 기술 → 빠른 기술의 (획득 에너지·턴) 조합별 타수 / 빠른 기술 → 차지 기술의 에너지 비용별 타수.
export function countRows(m: Move): CountRow[] {
  const groups = new Map<string, CountRow>();
  for (const o of coLearned(m)) {
    const f = m.kind === "charged" ? o : m, c = m.kind === "charged" ? m : o;
    const key = m.kind === "charged" ? `${f.gain}/${f.turns}` : String(c.energy);
    let g = groups.get(key);
    if (!g) { const counts = tausSeq(c.energy, f.gain, 3); g = { key, gain: f.gain, turns: f.turns, energy: c.energy, moves: [], counts, firstTurns: (counts[0] || 0) * f.turns }; groups.set(key, g); }
    g.moves.push(o);
  }
  const rows = [...groups.values()];
  for (const g of rows) g.moves.sort((a, b) => usageCount(b) - usageCount(a) || a.id.localeCompare(b.id));
  return rows.sort((a, b) => a.firstTurns - b.firstTurns || a.energy - b.energy || b.gain - a.gain);
}

// ── 메타 채용(현재 시즌 추천 기술배치) ─────────────────────────────────
type ChargedMv = { id: string; energy: number; counts: number[] };
type Snap = { id: string; ko?: string; en?: string; ja?: string; "zh-TW"?: string; dex?: number; types?: string[]; score: number; tier: string; moveset: string[];
  stats?: { atk?: number; def?: number; hp?: number }; mv?: { fast: { id: string; gain: number; turns: number }; charged: ChargedMv[] } };
const SNAP_BY_SLUG: Record<string, unknown> = { s27: DETAIL, s28: DETAIL_S28 };
const SNAP = (SNAP_BY_SLUG[currentSeason().slug] || DETAIL_S28) as Record<string, Snap[]>;
export const CORE_LEAGUES = ["great", "ultra", "master"] as const;
// "메타" = 리그 상위 100위 안 + D티어 제외(마스터는 100위 안에도 실전에 안 나오는 D가 절반이라 걸러냄).
const metaRows = (league: string): { row: Snap; rank: number }[] =>
  (SNAP[league] || []).slice(0, 100).map((row, i) => ({ row, rank: i + 1 })).filter((x) => x.row.tier !== "D");

// 리그 평균 상대(중앙값 방어·HP) — 예상 데미지의 기준 상대. 그림자 제외(스냅샷 스탯이 기본 폼과 같음).
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
const REF: Record<string, { def: number; hp: number }> = {};
for (const lg of CORE_LEAGUES) {
  const rows = metaRows(lg).map((x) => x.row).filter((r) => !r.id.endsWith("_shadow") && r.stats?.def && r.stats?.hp);
  REF[lg] = { def: median(rows.map((r) => r.stats!.def!)), hp: median(rows.map((r) => r.stats!.hp!)) };
}
export const refDefender = (league: string) => REF[league];
// PvP 데미지 = floor(0.5 × 위력 × 공격/방어 × 자속 × 상성 × 1.3) + 1. 그림자는 공격 1.2배. 상성은 중립(1)로 계산.
export function pvpDamage(power: number, atk: number, def: number, stab: boolean, shadow: boolean): number {
  if (!power || !atk || !def) return 0;
  return Math.floor(0.5 * power * ((atk * (shadow ? 1.2 : 1)) / def) * (stab ? 1.2 : 1) * 1.3) + 1;
}

const PKN = PKNAMES as unknown as Record<string, Record<string, string>>;
export type UserRow = {
  id: string; linkId: string; hasLink: boolean; name: string; dex: number; types: string[]; shadow: boolean; tier: string; score: number; rank: number;
  fastId?: string; fastTurns?: number; counts?: number[];                  // 차지 기술 페이지: 이 포켓몬의 추천 빠른 기술과 그 타수
  charged?: { id: string; counts: number[] }[];                            // 빠른 기술 페이지: 이 포켓몬의 추천 차지 기술들과 타수
  dmg: number; pct: number; stab: boolean;
};
function snapName(lang: Locale, r: Snap): string {
  if (lang === "zh-TW") { if (r["zh-TW"]) return r["zh-TW"]; const zh = r.dex != null ? PKN[String(r.dex)]?.["zh-TW"] : undefined; if (zh) return (r.id.endsWith("_shadow") ? "暗影" : "") + zh; }
  return (lang === "en" ? r.en : lang === "ja" ? r.ja : r.ko) || r.en || r.ko || r.id;
}
export function metaUsers(lang: Locale, m: Move): Record<string, UserRow[]> {
  const out: Record<string, UserRow[]> = {};
  for (const lg of CORE_LEAGUES) {
    const ref = REF[lg]; const rows: UserRow[] = [];
    for (const { row: r, rank } of metaRows(lg)) {
      if (!r.moveset?.includes(m.id)) continue;
      const shadow = r.id.endsWith("_shadow"); const types = r.types || [];
      const stab = types.includes(m.type);
      const dmg = pvpDamage(m.power, r.stats?.atk || 0, ref.def, stab, shadow);
      const linkId = linkMonId(lg, r.id);
      const u: UserRow = { id: r.id, linkId, hasLink: hasDetailLink(lg, r.id), name: snapName(lang, r), dex: r.dex || 0, types, shadow, tier: r.tier, score: r.score, rank,
        dmg, pct: ref.hp ? Math.round((dmg / ref.hp) * 100) : 0, stab };
      if (m.kind === "charged" && r.mv) { u.fastId = r.mv.fast.id; u.fastTurns = r.mv.fast.turns; u.counts = (r.mv.charged.find((c) => c.id === m.id)?.counts || tausSeq(m.energy, r.mv.fast.gain, 3)).slice(0, 3); }
      if (m.kind === "fast" && r.mv) u.charged = r.mv.charged.map((c) => ({ id: c.id, counts: tausSeq(c.energy, m.gain, 3) }));
      rows.push(u);
    }
    out[lg] = rows;
  }
  return out;
}
// 기술별 메타 채용 수(3리그 통틀어 고유 종 수 — 그림자·기본 폼, 여러 리그 중복은 한 종으로) — 허브 정렬·"많이 쓰는 기술" 순위용.
const USAGE: Record<string, Set<string>> = {};
for (const lg of CORE_LEAGUES) for (const { row } of metaRows(lg)) for (const id of row.moveset || []) (USAGE[id] = USAGE[id] || new Set()).add(row.id.replace(/_shadow$/, ""));
export function usageCount(m: Move): number { return USAGE[m.id]?.size || 0; }

// ── 색인 게이트 ───────────────────────────────────────────────────────
// 기술 상세는 322개 × 4로케일 = 1,288 URL — 9월 강등의 원인(포켓몬 템플릿 2,400 URL)과 같은 모양이라 단계적으로 연다.
//  · 스위치 꺼짐(기본): 상세 전부 noindex,follow + 사이트맵 제외. 허브(/gbl/moves)만 색인.
//  · 스위치 켜짐(NEXT_PUBLIC_GBL_INDEX_MOVES=1): "색인 대상 메타 포켓몬이 추천 기술배치로 쓰는 기술"만 색인(나머지는 계속 noindex).
// 2026-10-08(사용자 결정): 기본 개방 — 기술 상세 322개 전부 색인·사이트맵. 닫으려면 env NEXT_PUBLIC_GBL_INDEX_MOVES=0.
export const MOVES_INDEX_OPEN = process.env.NEXT_PUBLIC_GBL_INDEX_MOVES !== "0";
const INDEXABLE = new Set<string>();
for (const lg of CORE_LEAGUES) for (const { row } of metaRows(lg)) if (isMetaMon(lg, linkMonId(lg, row.id))) for (const id of row.moveset || []) if (BY_ID[id]) INDEXABLE.add(id);
export const isIndexCandidate = (m: Move): boolean => INDEXABLE.has(m.id);
export const isIndexableMove = (_m: Move): boolean => MOVES_INDEX_OPEN;
export const indexableMoveSlugs = (): string[] => (MOVES_INDEX_OPEN ? MOVES.map((m) => m.slug) : []);

// ── 배우는 포켓몬 링크 대상 ─────────────────────────────────────────
// 상세 페이지가 있는 리그로 연결(색인되는 리그 우선 → 없으면 페이지가 있는 첫 리그). 3리그 상위 200 어디에도 없는 종은 페이지가 없어 null.
export function learnerLink(sid: string): { league: string; id: string } | null { return bestDetail(sid); }
