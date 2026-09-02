// 서버·클라이언트 공용 포켓몬 이름/스프라이트 해석. (meta 허브 SSR 요약 + MetaHubClient 공용)
import DATA from "../gbl_data.json";
import PKN from "../pokedex_names.json";
import FORMS from "../gbl_forms.json";
import { monSlugId } from "../monSlug";
import { formDexById } from "../sprite";
import { type Locale } from "../../../../lib/i18n";

type Mon = { id: string; dex: number; ko: string; en: string; ja?: string; types: string[]; shadow: boolean; sprite?: string };
const DS = DATA as unknown as { leagues: Record<string, { pokemon: Mon[] }> };
export const MON: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON[m.id] = m;

const PKNAMES = PKN as unknown as Record<string, { ko: string; en: string; ja: string }>;
// 비메타몬(전 도감) 보충 — 기록엔 slug로 저장되므로 표시용 이름도 전 도감에서 해석.
for (const [dexStr, nm] of Object.entries(PKNAMES)) {
  const dex = Number(dexStr);
  if (!dex || !nm.en) continue;
  for (const shadow of [false, true]) {
    const id = monSlugId(nm.en, shadow);
    if (MON[id]) continue;
    MON[id] = { id, dex, ko: nm.ko, en: nm.en, types: [], shadow };
  }
}
// 메가/원시 폼(gbl_forms.json) — 4개국어 이름 보유. 메타에 메가뮤츠·원시가이오가 등 등장 대비.
const FORMLIST = FORMS as unknown as { id: string; ko: string; en: string; ja: string; dex: number; types: string[] }[];
for (const f of FORMLIST) if (!MON[f.id]) MON[f.id] = { id: f.id, dex: f.dex, ko: f.ko, en: f.en, ja: f.ja, types: f.types || [], shadow: false };

// speciesId 접미사 → 폼 접사(gbl_forms 미커버 특수폼: 후파 언바운드 등). base명 + 접사로 조립.
type Aff = { ko: string; ja: string; zh: string; pos: "prefix" | "suffix" };
const SUFFIX_AFFIX: Record<string, Aff> = {
  unbound: { ko: " (언바운드)", ja: "（ときはなたれし）", zh: "（解放）", pos: "suffix" },
  mega: { ko: "메가 ", ja: "メガ", zh: "超級", pos: "prefix" },
  mega_x: { ko: "메가 ", ja: "メガ", zh: "超級", pos: "prefix" },
  mega_y: { ko: "메가 ", ja: "メガ", zh: "超級", pos: "prefix" },
  primal: { ko: "원시 ", ja: "ゲンシ", zh: "原始", pos: "prefix" },
};
const XY_SUFFIX: Record<string, string> = { mega_x: " X", mega_y: " Y" };

export const spriteUrl = (m?: Mon) =>
  m ? (m.sprite || `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${formDexById(m.id, m.dex)}.png`) : "";

const baseName = (lang: Locale, m: Mon): string => {
  if (lang === "en") return m.en || m.ko;
  if (lang === "ja") return m.ja || PKNAMES[String(m.dex)]?.ja || m.en || m.ko;
  if (lang === "zh-TW") return (PKNAMES[String(m.dex)] as Record<string, string>)?.["zh-TW"] || m.en || m.ko;
  return m.ko;
};

export const monName = (lang: Locale, id: string): string => {
  const m = MON[id];
  if (m) return baseName(lang, m);
  // MON 미등록(gbl_forms에도 없는) 접미사 폼 — base + 접사로 조립(후파 언바운드 등).
  for (const suf of Object.keys(SUFFIX_AFFIX)) {
    if (!id.endsWith("_" + suf)) continue;
    const base = MON[id.slice(0, -(suf.length + 1))];
    if (!base) continue;
    const aff = SUFFIX_AFFIX[suf];
    const t = lang === "ja" ? aff.ja : lang === "zh-TW" ? aff.zh : lang === "en" ? "" : aff.ko;
    const bn = baseName(lang, base) + (lang === "en" ? "" : XY_SUFFIX[suf] || "");
    if (lang === "en") return `${suf.replace(/_/g, " ")} ${base.en}`.trim();
    return aff.pos === "prefix" ? t + bn : bn + t;
  }
  return id;
};
