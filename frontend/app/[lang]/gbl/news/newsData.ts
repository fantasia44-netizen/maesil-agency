// 뉴스 글의 "자동 블록" 데이터 — 글에 숫자를 손으로 적지 않고 사이트 데이터에서 뽑아 넣는다(딜러 티어표·종족값·상성표).
// 그래서 글의 순위·CP는 항상 연결된 표와 같고, 데이터를 갱신하면 글도 같이 바뀐다. ⚠️ 서버 전용.
import STATS from "../pokedex_stats.json";
import FORM_STATS from "../gbl_form_stats.json";
import FORMS from "../gbl_forms.json";
import { speciesOf, speciesName } from "../moves/movesData";
import { dexPath, ivKeyOf, zhNameOfSid } from "../dexHub";
import { counterRows, typeTopRows, multVs, type AttackerRow } from "../raid/counterCalc";
import { ALL_TYPES } from "../pokemon/[league]/[id]/typeChart";
import { rankIVs, LEAGUE_CAP } from "../iv/ivRank";
import type { Locale } from "../../../../lib/i18n";

// ── 보스 카드: 타입 · 약점(배율) · 반감 · 100% 개체 CP ────────────────────
const CPM20 = 0.5974, CPM25 = 0.667934;   // 레이드에서 잡는 레벨 20 / 날씨 부스트 25
type St = { a: number; d: number; s: number };
export function baseStats(sid: string): St | null {
  const key = ivKeyOf(sid); if (!key) return null;
  if (key.startsWith("f:")) return (FORM_STATS as unknown as (St & { id: string })[]).find((f) => f.id === key.slice(2)) || null;
  return (STATS as unknown as Record<string, St>)[key] || null;
}
const cpAt = (s: St, cpm: number) => Math.floor(((s.a + 15) * Math.sqrt(s.d + 15) * Math.sqrt(s.s + 15) * cpm * cpm) / 10);
export type BossInfo = { sid: string; name: string; dex: number; types: string[]; weak: { type: string; mult: number }[]; resist: { type: string; mult: number }[]; cp20: number; cp25: number; href: string | null };
// 보스의 이름·도감번호·타입 — 일반 종은 기술 도감 데이터, 메가·원시는 gbl_forms.json(타입이 기본 폼과 다르다: 메가 리자몽 X = 불꽃·드래곤).
// 메가 레이드에서 잡히는 건 기본 폼이라 100% CP는 기본 폼 종족값으로 계산된다(ivKeyOf가 메가 접미를 떼 줌).
type FormRow = { id: string; ko: string; en: string; ja: string; dex: number; types: string[] };
const FORM_BY_ID: Record<string, FormRow> = Object.assign(Object.create(null), Object.fromEntries((FORMS as unknown as FormRow[]).map((f) => [f.id, f])));
function bossBase(lang: Locale, sid: string): { name: string; dex: number; types: string[] } | null {
  const f = FORM_BY_ID[sid];
  if (f) return { name: (lang === "zh-TW" ? zhNameOfSid(sid) : lang === "en" ? f.en : lang === "ja" ? f.ja : f.ko) || f.en, dex: f.dex, types: f.types.filter((t) => t && t !== "none") };
  const sp = speciesOf(sid);
  return sp ? { name: speciesName(lang, sid), dex: sp.dex, types: sp.types } : null;
}
export function bossInfo(lang: Locale, sid: string): BossInfo | null {
  const sp = bossBase(lang, sid); if (!sp) return null;
  const all = ALL_TYPES.map((t) => ({ type: t, mult: Math.round(multVs(t, sp.types) * 1000) / 1000 }));
  const st = baseStats(sid);
  return {
    sid, name: sp.name, dex: sp.dex, types: sp.types,
    weak: all.filter((x) => x.mult > 1).sort((a, b) => b.mult - a.mult),
    resist: all.filter((x) => x.mult < 1).sort((a, b) => a.mult - b.mult),
    cp20: st ? cpAt(st, CPM20) : 0, cp25: st ? cpAt(st, CPM25) : 0, href: dexPath(sid),
  };
}

// ── 추천 딜러 ────────────────────────────────────────────────────────────
// 보스 타입에 대한 실제 상성(노멀·스페셜 기술 각각)으로 딜러표 행을 다시 계산한 순위 — 보스별 공략 페이지와 같은 계산(raid/counterCalc.ts).
export type { AttackerRow };
export function countersFor(lang: Locale, bossSid: string, n = 10): AttackerRow[] {
  const sp = bossBase(lang, bossSid);
  return sp ? counterRows(lang, sp.types, n) : [];
}
// 한 타입 딜러표의 상위 n.
export function raidTopFor(lang: Locale, type: string, n = 8): AttackerRow[] {
  return typeTopRows(lang, type, n);
}

// ── 리그별 개체값 요약(이벤트로 잡은 개체를 볼 때 쓰는 "IV표") ───────────────
// IV 순위 체커(iv/ivRank.ts)와 같은 계산: 리그 CP 제한 안에서 스탯 곱이 가장 큰 개체값(레벨 50까지). 개체값은 공격/방어/체력 순.
// floor = 그 방법으로 얻을 때의 최소 개체값(알 · 레이드 · 리서치는 10, 야생은 0) — 0보다 크면 "그 범위 안의 최고"를 따로 보여 준다.
export type IvPick = { iv: string; level: number; cp: number; rank: number };
export type IvLeague = { league: string; top: IvPick[]; hundo: IvPick; floorBest: IvPick | null };
export function ivSummary(lang: Locale, sid: string, floor = 0, n = 3): { name: string; leagues: IvLeague[] } | null {
  const sp = bossBase(lang, sid), st = baseStats(sid);
  if (!sp || !st) return null;
  const pick = (r: { ia: number; id: number; is: number; level: number; cp: number; rank: number }): IvPick => ({ iv: `${r.ia}/${r.id}/${r.is}`, level: r.level, cp: r.cp, rank: r.rank });
  const leagues = ["great", "ultra", "master"].map((league) => {
    const rows = rankIVs(st, LEAGUE_CAP[league]);
    const hundo = rows.find((r) => r.ia === 15 && r.id === 15 && r.is === 15);
    const fb = floor > 0 ? rows.find((r) => r.ia >= floor && r.id >= floor && r.is >= floor) : undefined;
    if (!hundo) return null;
    // CP 제한이 없는 리그는 15/15/15가 1위다. 체력은 소수점을 버리기 때문에 15/15/14와 스탯 곱이 같게 나오는 종이 있어(동률), 표에는 15/15/15 한 줄만 1위로 둔다.
    if (LEAGUE_CAP[league] == null) { const h = { ...pick(hundo), rank: 1 }; return { league, top: [h], hundo: h, floorBest: fb ? h : null }; }
    return { league, top: rows.slice(0, n).map(pick), hundo: pick(hundo), floorBest: fb ? pick(fb) : null };
  }).filter((x): x is IvLeague => !!x);
  return leagues.length ? { name: sp.name, leagues } : null;
}
