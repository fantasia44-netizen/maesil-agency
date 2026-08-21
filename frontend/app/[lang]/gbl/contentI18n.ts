// 콘텐츠 페이지 공통 i18n — 리그명 + 포켓몬 이름(로케일별 선택).
import type { Locale } from "../../../lib/i18n";

const LEAGUE: Record<Locale, Record<string, { name: string; short: string }>> = {
  ko: {
    master: { name: "마스터리그", short: "마스터" },
    great: { name: "슈퍼리그", short: "슈퍼" },
    ultra: { name: "하이퍼리그", short: "하이퍼" },
  },
  en: {
    master: { name: "Master League", short: "Master" },
    great: { name: "Great League", short: "Great" },
    ultra: { name: "Ultra League", short: "Ultra" },
  },
  ja: {
    master: { name: "マスターリーグ", short: "マスター" },
    great: { name: "スーパーリーグ", short: "スーパー" },
    ultra: { name: "ハイパーリーグ", short: "ハイパー" },
  },
};

export function leagueName(locale: Locale, key: string): string {
  return LEAGUE[locale]?.[key]?.name || LEAGUE.ko[key]?.name || key;
}
export function leagueShort(locale: Locale, key: string): string {
  return LEAGUE[locale]?.[key]?.short || LEAGUE.ko[key]?.short || key;
}

// 로케일별 이름 선택. {ko,en,ja} 우선순위(해당 로케일 → ko → fallback).
export function localName(
  locale: Locale,
  e: { ko?: string | null; en?: string | null; ja?: string | null } | undefined,
  fallback = "",
): string {
  if (!e) return fallback;
  return (locale === "en" ? e.en : locale === "ja" ? e.ja : e.ko) || e.ko || fallback;
}
