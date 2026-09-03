// 콘텐츠 페이지 공통 i18n — 리그명 + 포켓몬 이름(로케일별 선택).
import type { Locale } from "../../../lib/i18n";

const LEAGUE: Record<Locale, Record<string, { name: string; short: string }>> = {
  ko: {
    master: { name: "마스터리그", short: "마스터" },
    great: { name: "슈퍼리그", short: "슈퍼" },
    ultra: { name: "하이퍼리그", short: "하이퍼" },
    master_mega: { name: "마스터리그 (메가)", short: "마스터 메가" },
    great_mega: { name: "슈퍼리그 (메가)", short: "슈퍼 메가" },
    ultra_mega: { name: "하이퍼리그 (메가)", short: "하이퍼 메가" },
  },
  en: {
    master: { name: "Master League", short: "Master" },
    great: { name: "Great League", short: "Great" },
    ultra: { name: "Ultra League", short: "Ultra" },
    master_mega: { name: "Master League (Mega)", short: "Master Mega" },
    great_mega: { name: "Great League (Mega)", short: "Great Mega" },
    ultra_mega: { name: "Ultra League (Mega)", short: "Ultra Mega" },
  },
  ja: {
    master: { name: "マスターリーグ", short: "マスター" },
    great: { name: "スーパーリーグ", short: "スーパー" },
    ultra: { name: "ハイパーリーグ", short: "ハイパー" },
    master_mega: { name: "マスターリーグ（メガ）", short: "マスター メガ" },
    great_mega: { name: "スーパーリーグ（メガ）", short: "スーパー メガ" },
    ultra_mega: { name: "ハイパーリーグ（メガ）", short: "ハイパー メガ" },
  },
  "zh-TW": {
    master: { name: "大師聯盟", short: "大師" },
    great: { name: "超級聯盟", short: "超級" },
    ultra: { name: "高級聯盟", short: "高級" },
    master_mega: { name: "大師聯盟（Mega）", short: "大師 Mega" },
    great_mega: { name: "超級聯盟（Mega）", short: "超級 Mega" },
    ultra_mega: { name: "高級聯盟（Mega）", short: "高級 Mega" },
  },
};

export function leagueName(locale: Locale, key: string): string {
  return LEAGUE[locale]?.[key]?.name || LEAGUE.ko[key]?.name || key;
}
export function leagueShort(locale: Locale, key: string): string {
  return LEAGUE[locale]?.[key]?.short || LEAGUE.ko[key]?.short || key;
}

// 로케일별 이름 선택. {ko,en,ja,"zh-TW"} 우선순위(해당 로케일 → zh-TW → en → ko → fallback).
export function localName(
  locale: Locale,
  e: { ko?: string | null; en?: string | null; ja?: string | null; "zh-TW"?: string | null } | undefined,
  fallback = "",
): string {
  if (!e) return fallback;
  const byLocale = locale === "en" ? e.en : locale === "ja" ? e.ja : locale === "zh-TW" ? e["zh-TW"] : e.ko;
  return byLocale || e["zh-TW"] || e.en || e.ko || fallback;
}
