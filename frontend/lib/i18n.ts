// GBL Note 다국어 설정. 기본 ko는 프리픽스 없음(/gbl/...), 나머지는 /{locale}/gbl/...
// 데이터·계산은 언어 무관 공유, UI 문구만 사전(dictionary)으로 로케일별 제공.

export const locales = ["ko", "en", "ja"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ko";

// 로케일별 메타/hreflang용 정보
export const localeMeta: Record<Locale, { htmlLang: string; ogLocale: string; label: string }> = {
  ko: { htmlLang: "ko", ogLocale: "ko_KR", label: "한국어" },
  en: { htmlLang: "en", ogLocale: "en_US", label: "English" },
  ja: { htmlLang: "ja", ogLocale: "ja_JP", label: "日本語" },
};

export function isLocale(x: string): x is Locale {
  return (locales as readonly string[]).includes(x);
}

// URL 경로 프리픽스 — 기본 로케일(ko)은 빈 문자열(프리픽스 없음)
export function localePrefix(locale: Locale): string {
  return locale === defaultLocale ? "" : `/${locale}`;
}

// gbl 경로에 로케일 프리픽스 적용: ("en","/gbl/raid") -> "/en/gbl/raid"
export function localizePath(locale: Locale, path: string): string {
  return `${localePrefix(locale)}${path}`;
}

// 페이지 metadata.alternates.languages(hreflang)용 — 전 로케일 + x-default.
// hreflangLanguages("/gbl/terms") -> { ko:"/gbl/terms", en:"/en/gbl/terms", ja:"/ja/gbl/terms", "x-default":"/gbl/terms" }
export function hreflangLanguages(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of locales) out[localeMeta[l].htmlLang] = localizePath(l, path);
  out["x-default"] = localizePath(defaultLocale, path);
  return out;
}
