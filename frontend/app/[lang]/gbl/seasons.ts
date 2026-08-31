// GBL 시즌 레지스트리 — 모든 PvP 화면(티어·CMP·실측메타·시뮬·실전집계)의 단일 소스.
// 원칙: "단일 데이터 하나만" → "시즌 시리즈(이전·현재·다음, 계속 누적)".
//  - 파생 데이터(티어/메타/시뮬)는 시즌별 스냅샷 파일(`_s27`/`_s28`…)로 동결·아카이브.
//  - 개인 기록(실전집계)은 played_at → seasonForDate()로 시즌 자동 판정.
// 시즌 경계는 KST 05:00(GBL 일일 리셋과 동일)로 고정 — 기기 타임존 무관.
import { type Locale } from "../../../lib/i18n";

export type Season = {
  num: number;                     // 27, 28, …
  slug: string;                    // "s27" — 데이터 파일 접미사 + 선택기/URL 키
  name: Record<Locale, string>;    // 시즌명(4개국어)
  start: string;                   // KST 날짜 "2026-06-02" (경계 05:00 KST)
  end: string;                     // KST 날짜(=다음 시즌 시작일)
  short?: string;                  // 선택기용 짧은 라벨(옵션, 기본 "S{num}")
};

export type SeasonStatus = "past" | "current" | "next" | "future";

// GBL 시즌 목록(과거→미래 순, 번호 오름차순). 새 시즌 발표 시 여기에 추가.
export const SEASONS: Season[] = [
  {
    num: 27, slug: "s27", start: "2026-06-02", end: "2026-09-09",
    name: { ko: "새로운 발걸음", en: "New Beginnings", ja: "新たな一歩", "zh-TW": "嶄新的一步" },
  },
  {
    num: 28, slug: "s28", start: "2026-09-09", end: "2026-12-01",
    name: { ko: "황혼의 여정", en: "Twilight Trails", ja: "黄昏の旅路", "zh-TW": "黃昏旅途" },
  },
];

const BOUNDARY = "T05:00:00+09:00";  // GBL 시즌 전환 = 시작일 05:00 KST
export const seasonStartMs = (s: Season): number => Date.parse(s.start + BOUNDARY);
export const seasonEndMs = (s: Season): number => Date.parse(s.end + BOUNDARY);

export const SEASON_BY_SLUG: Record<string, Season> = Object.fromEntries(SEASONS.map((s) => [s.slug, s]));
export const SEASON_BY_NUM: Record<number, Season> = Object.fromEntries(SEASONS.map((s) => [s.num, s]));

export function seasonBySlug(slug: string | null | undefined): Season | null {
  return (slug && SEASON_BY_SLUG[slug]) || null;
}
export function seasonByNum(num: number): Season | null {
  return SEASON_BY_NUM[num] || null;
}

// 진행 중인 시즌. 경계 밖(공백기 등)이면 가장 최근 시작한 시즌으로 폴백.
export function currentSeason(now: number = Date.now()): Season {
  for (const s of SEASONS) if (now >= seasonStartMs(s) && now < seasonEndMs(s)) return s;
  const started = SEASONS.filter((s) => now >= seasonStartMs(s));
  return started.length ? started[started.length - 1] : SEASONS[0];
}

export function nextSeason(now: number = Date.now()): Season | null {
  const cur = currentSeason(now);
  return seasonByNum(cur.num + 1);
}

export function statusOf(s: Season, now: number = Date.now()): SeasonStatus {
  if (now >= seasonStartMs(s) && now < seasonEndMs(s)) return "current";
  const cur = currentSeason(now);
  if (s.num === cur.num + 1) return "next";
  return s.num < cur.num ? "past" : "future";
}

// 날짜(ISO)가 속한 시즌 — 실전집계 시즌 판정용.
export function seasonForDate(iso: string, _now?: number): Season | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  for (const s of SEASONS) if (t >= seasonStartMs(s) && t < seasonEndMs(s)) return s;
  return null;
}

// 선택기에 노출할 시즌 목록. 각 surface는 데이터가 있는 slug만 availableSlugs로 넘겨 필터.
// 기본: 과거 전체 + 현재 + 다음(있으면). 최신이 앞(내림차순).
export function selectableSeasons(availableSlugs?: string[], now: number = Date.now()): Season[] {
  const cur = currentSeason(now);
  const nxt = nextSeason(now);
  let list = SEASONS.filter((s) => s.num <= cur.num || (nxt && s.num === nxt.num));
  if (availableSlugs) list = list.filter((s) => availableSlugs.includes(s.slug));
  return [...list].sort((a, b) => b.num - a.num);
}

export function seasonName(s: Season, lang: Locale): string {
  return s.name[lang] || s.name.ko;
}
export function seasonShort(s: Season, lang: Locale): string {
  // "시즌 27" / "Season 27" / "シーズン27" / "第27賽季"
  switch (lang) {
    case "en": return `Season ${s.num}`;
    case "ja": return `シーズン${s.num}`;
    case "zh-TW": return `第${s.num}賽季`;
    default: return `시즌 ${s.num}`;
  }
}
