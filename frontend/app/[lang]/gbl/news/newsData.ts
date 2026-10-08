// 뉴스 글의 "자동 블록" 데이터 — 글에 숫자를 손으로 적지 않고 사이트 데이터에서 뽑아 넣는다(딜러 티어표·종족값·상성표).
// 그래서 글의 순위·CP는 항상 연결된 표와 같고, 데이터를 갱신하면 글도 같이 바뀐다. ⚠️ 서버 전용.
import RAIDS from "../gbl_raids.json";
import RAIDS_MF from "../gbl_raids_megafinale.json";
import STATS from "../pokedex_stats.json";
import FORM_STATS from "../gbl_form_stats.json";
import { speciesOf, speciesName, moveExact, type Move } from "../moves/movesData";
import { dexPath, ivKeyOf, RAID_DEFAULT_VER, zhNameOfSid } from "../dexHub";
import { ALL_TYPES, typeMult } from "../pokemon/[league]/[id]/typeChart";
import type { Locale } from "../../../../lib/i18n";

type Row = { sid?: string; name: string; nameEn?: string; nameJa?: string; dex: number; shadow: boolean; upcoming?: boolean; fast: string; charged: string; dps: number; er: number };
const TABLE = (RAID_DEFAULT_VER === "megafinale" ? RAIDS_MF : RAIDS) as unknown as { types: Record<string, Row[]> };
const rowName = (lang: Locale, r: Row): string =>
  (lang === "en" ? r.nameEn : lang === "ja" ? r.nameJa : lang === "zh-TW" ? ((r.sid && zhNameOfSid(r.sid)) || r.nameEn) : r.name) || r.name;

// ── 보스 카드: 타입 · 약점(배율) · 반감 · 100% 개체 CP ────────────────────
const CPM20 = 0.5974, CPM25 = 0.667934;   // 레이드에서 잡는 레벨 20 / 날씨 부스트 25
type St = { a: number; d: number; s: number };
function baseStats(sid: string): St | null {
  const key = ivKeyOf(sid); if (!key) return null;
  if (key.startsWith("f:")) return (FORM_STATS as unknown as (St & { id: string })[]).find((f) => f.id === key.slice(2)) || null;
  return (STATS as unknown as Record<string, St>)[key] || null;
}
const cpAt = (s: St, cpm: number) => Math.floor(((s.a + 15) * Math.sqrt(s.d + 15) * Math.sqrt(s.s + 15) * cpm * cpm) / 10);
export type BossInfo = { sid: string; name: string; dex: number; types: string[]; weak: { type: string; mult: number }[]; resist: { type: string; mult: number }[]; cp20: number; cp25: number; href: string | null };
const multVs = (atk: string, types: string[]) => types.reduce((m, t) => m * typeMult(atk, t), 1);
export function bossInfo(lang: Locale, sid: string): BossInfo | null {
  const sp = speciesOf(sid); if (!sp) return null;
  const all = ALL_TYPES.map((t) => ({ type: t, mult: Math.round(multVs(t, sp.types) * 1000) / 1000 }));
  const st = baseStats(sid);
  return {
    sid, name: speciesName(lang, sid), dex: sp.dex, types: sp.types,
    weak: all.filter((x) => x.mult > 1).sort((a, b) => b.mult - a.mult),
    resist: all.filter((x) => x.mult < 1).sort((a, b) => a.mult - b.mult),
    cp20: st ? cpAt(st, CPM20) : 0, cp25: st ? cpAt(st, CPM25) : 0, href: dexPath(sid),
  };
}

// ── 추천 딜러: 보스의 약점 타입 딜러표를 합쳐 종합 점수 순 ───────────────────
// 딜러표는 "그 타입이 약점(×1.6)"을 가정한 값이라, 이중 약점(×2.56)인 타입은 점수에 1.6배를 더 곱해 앞으로 올린다.
export type AttackerRow = { sid: string; name: string; dex: number; shadow: boolean; upcoming: boolean; type: string; mult: number; fast?: Move; charged?: Move; fastId: string; chargedId: string; dps: number; er: number; href: string | null };
const toRow = (lang: Locale, r: Row, type: string, mult: number): AttackerRow => ({
  sid: r.sid || "", name: rowName(lang, r), dex: r.dex, shadow: !!r.shadow, upcoming: !!r.upcoming, type, mult,
  fast: moveExact(r.fast), charged: moveExact(r.charged), fastId: r.fast, chargedId: r.charged, dps: r.dps, er: r.er, href: r.sid ? dexPath(r.sid) : null,
});
export function countersFor(lang: Locale, bossSid: string, n = 10): AttackerRow[] {
  const sp = speciesOf(bossSid); if (!sp) return [];
  const best = new Map<string, AttackerRow & { score: number }>();
  for (const t of ALL_TYPES) {
    const mult = multVs(t, sp.types); if (mult <= 1) continue;
    for (const r of TABLE.types[t] || []) {
      const row = { ...toRow(lang, r, t, Math.round(mult * 1000) / 1000), score: r.er * (mult / 1.6) };
      const key = row.sid || row.name; const cur = best.get(key);
      if (!cur || row.score > cur.score) best.set(key, row);
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score || (a.sid < b.sid ? -1 : 1)).slice(0, n);
}
// 한 타입 딜러표의 상위 n.
export function raidTopFor(lang: Locale, type: string, n = 8): AttackerRow[] {
  return (TABLE.types[type] || []).slice(0, n).map((r) => toRow(lang, r, type, 1.6));
}
