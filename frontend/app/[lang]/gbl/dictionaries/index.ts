import ko, { type Dict } from "./ko";
import en from "./en";
import ja from "./ja";
import zhTW from "./zh-TW";
import { defaultLocale, isLocale, type Locale } from "../../../../lib/i18n";

export type { Dict } from "./ko";

const DICTS: Record<Locale, Dict> = { ko, en, ja, "zh-TW": zhTW };

// 동기 사전 조회 — 서버/클라이언트 컴포넌트 모두 사용. 잘못된 로케일은 기본(ko)으로.
export function getDict(lang: string | undefined): Dict {
  return DICTS[isLocale(lang || "") ? (lang as Locale) : defaultLocale];
}
