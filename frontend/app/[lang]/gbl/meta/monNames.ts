// 서버·클라이언트 공용 포켓몬 이름/스프라이트 해석. (meta 허브 SSR 요약에서 재사용)
import DATA from "../gbl_data.json";
import PKN from "../pokedex_names.json";
import { monSlugId } from "../monSlug";
import { type Locale } from "../../../../lib/i18n";

type Mon = { id: string; dex: number; ko: string; en: string; types: string[]; shadow: boolean; sprite?: string };
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

export const spriteUrl = (m?: Mon) =>
  m ? (m.sprite || `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${m.dex}.png`) : "";

export const monName = (lang: Locale, id: string): string => {
  const m = MON[id];
  if (!m) return id;
  if (lang === "en") return m.en || m.ko;
  if (lang === "ja") return PKNAMES[String(m.dex)]?.ja || m.en || m.ko;
  if (lang === "zh-TW") return (PKNAMES[String(m.dex)] as Record<string, string>)?.["zh-TW"] || m.en || m.ko;
  return m.ko;
};
