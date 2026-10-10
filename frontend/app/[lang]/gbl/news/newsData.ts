// 뉴스 글의 "자동 블록" 데이터 — 글에 숫자를 손으로 적지 않고 사이트 데이터에서 뽑아 넣는다(딜러 티어표·종족값·상성표).
// 그래서 글의 순위·CP는 항상 연결된 표와 같고, 데이터를 갱신하면 글도 같이 바뀐다. ⚠️ 서버 전용.
import STATS from "../pokedex_stats.json";
import FORM_STATS from "../gbl_form_stats.json";
import FORMS from "../gbl_forms.json";
import { speciesOf, speciesName } from "../moves/movesData";
import { dexPath, ivKeyOf, zhNameOfSid } from "../dexHub";
import { counterRows, typeTopRows, multVs, type AttackerRow } from "../raid/counterCalc";
import { ALL_TYPES } from "../pokemon/[league]/[id]/typeChart";
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
