// 커버리지/매치업 상대 이름 4개국어 현지화.
// 시뮬은 영어명("Landorus (Incarnate) (Shadow)")을 주므로, base(dex→도감명) + 폼 접사(괄호)를 현지화.
// 불확실한 폼은 영어를 유지(오역 방지). 접사 값은 gbl_compile_detail.py _AFFIX + PoGo 공식명 기준.
import PKNAMES from "../../pokedex_names.json";
import type { Locale } from "../../../../../lib/i18n";

const PK = PKNAMES as unknown as Record<string, Record<string, string>>;

type Aff = { ko: string; ja: string; zh: string; pos: "prefix" | "suffix" };
// 키 = 시뮬 영어명의 괄호 안 문자열
export const FORM_AFFIX: Record<string, Aff> = {
  "Shadow": { ko: "그림자 ", ja: "シャドウ", zh: "暗影", pos: "prefix" },
  "Alolan": { ko: "알로라 ", ja: "アローラ", zh: "阿羅拉", pos: "prefix" },
  "Galarian": { ko: "가라르 ", ja: "ガラル", zh: "伽勒爾", pos: "prefix" },
  "Hisuian": { ko: "히스이 ", ja: "ヒスイ", zh: "洗翠", pos: "prefix" },
  "Paldean": { ko: "팔데아 ", ja: "パルデア", zh: "帕底亞", pos: "prefix" },
  "Incarnate": { ko: " (화신폼)", ja: "（けしんフォルム）", zh: "（化身）", pos: "suffix" },
  "Therian": { ko: " (영물폼)", ja: "（れいじゅうフォルム）", zh: "（靈獸）", pos: "suffix" },
  "Origin": { ko: " (오리진)", ja: "（オリジンフォルム）", zh: "（起源）", pos: "suffix" },
  "Complete Forme": { ko: " (퍼펙트폼)", ja: "（パーフェクトフォルム）", zh: "（完全體）", pos: "suffix" },
  "Crowned Sword": { ko: " (검왕)", ja: "（けんのおう）", zh: "（劍之王）", pos: "suffix" },
  "Crowned Shield": { ko: " (방패왕)", ja: "（たてのおう）", zh: "（盾之王）", pos: "suffix" },
  "Hero": { ko: " (역전의 용사)", ja: "（れきせんのゆうしゃ）", zh: "（歷戰勇者）", pos: "suffix" },
  "Single Strike": { ko: " (일격의 태세)", ja: "（いちげきのかた）", zh: "（一擊流）", pos: "suffix" },
  "Rapid Strike": { ko: " (연격의 태세)", ja: "（れんげきのかた）", zh: "（連擊流）", pos: "suffix" },
  "White": { ko: " (화이트)", ja: "（ホワイト）", zh: "（白）", pos: "suffix" },
  "Black": { ko: " (블랙)", ja: "（ブラック）", zh: "（黑）", pos: "suffix" },
  "Dusk Mane": { ko: " (황혼의 갈기)", ja: "（たそがれのたてがみ）", zh: "（黃昏之鬃）", pos: "suffix" },
  "Dawn Wings": { ko: " (새벽의 날개)", ja: "（あかつきのつばさ）", zh: "（拂曉之翼）", pos: "suffix" },
  "Mega": { ko: "메가 ", ja: "メガ", zh: "超級", pos: "prefix" },
  "Primal": { ko: "원시 ", ja: "ゲンシ", zh: "原始", pos: "prefix" },
};

// 상대 1명 이름을 로케일로. lang="en"이면 원본 그대로.
export function localizeOpp(o: { name: string; dex: number | null }, lang: Locale): string {
  if (lang === "en") return o.name;
  const li = lang === "ja" ? "ja" : lang === "zh-TW" ? "zh-TW" : "ko";
  const base = (o.dex != null && PK[String(o.dex)]?.[li]) || o.name.split(" (")[0];
  const parens = [...o.name.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]);
  let prefix = "";
  let suffix = "";
  for (const p of parens) {
    const aff = FORM_AFFIX[p];
    if (!aff) { suffix += ` (${p})`; continue; } // 미매핑 → 영어 유지(오역 방지)
    const t = lang === "ja" ? aff.ja : lang === "zh-TW" ? aff.zh : aff.ko;
    if (aff.pos === "prefix") prefix += t; else suffix += t;
  }
  return prefix + base + suffix;
}
