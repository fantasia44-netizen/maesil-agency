// GBL 포맷 레지스트리 — 코어 리그 + 시즌 로테이션 컵(커스텀 리그).
// league 필드에 이 key가 저장됨. 컵은 base 리그 풀 + 타입 제한으로 입력 풀을 좁힌다.
// ※ 컵은 매 시즌 바뀌므로 새 시즌 시작 시 CUP_FORMATS를 갱신해야 함(관리자화 예정).

import { currentSeason } from "./seasons";

export type Format = {
  key: string;
  label: string;
  base: "great" | "ultra" | "master";   // 아이콘/풀 기반 리그
  cup?: boolean;
  start?: string;   // 컵 진행 기간(ISO 날짜, end 제외)
  end?: string;
  allowTypes?: string[];    // 이 타입만 허용
  excludeTypes?: string[];  // 이 타입 제외
  note?: string;
  // 라벨·주석 번역(ko는 label/note 그대로). 컵·메가 포맷은 공개 페이지(실측 메타·전적앱)에
  // 그대로 노출되므로 4개국어가 없으면 비-ko 화면에 한글이 샌다.
  l10n?: Partial<Record<"en" | "ja" | "zh-TW", string>>;
  noteL10n?: Partial<Record<"en" | "ja" | "zh-TW", string>>;
};

export const CORE_FORMATS: Format[] = [
  { key: "great", label: "슈퍼리그", base: "great", l10n: { en: "Great League", ja: "スーパーリーグ", "zh-TW": "超級聯盟" } },
  { key: "ultra", label: "하이퍼리그", base: "ultra", l10n: { en: "Ultra League", ja: "ハイパーリーグ", "zh-TW": "高級聯盟" } },
  { key: "master", label: "마스터리그", base: "master", l10n: { en: "Master League", ja: "マスターリーグ", "zh-TW": "大師聯盟" } },
];

// 메가 리그(메가 피날레~) — 메가 허용 별도 포맷. 통계 완전 분리(일반 슈리/하리/마리와 다른 key).
export const MEGA_FORMATS: Format[] = [
  { key: "great_mega", label: "슈퍼리그 (메가)", base: "great", cup: true, note: "메가 허용", l10n: { en: "Great League (Mega)", ja: "スーパーリーグ（メガ）", "zh-TW": "超級聯盟（超級進化）" }, noteL10n: { en: "Mega allowed", ja: "メガ解禁", "zh-TW": "開放超級進化" } },
  { key: "ultra_mega", label: "하이퍼리그 (메가)", base: "ultra", cup: true, note: "메가 허용", l10n: { en: "Ultra League (Mega)", ja: "ハイパーリーグ（メガ）", "zh-TW": "高級聯盟（超級進化）" }, noteL10n: { en: "Mega allowed", ja: "メガ解禁", "zh-TW": "開放超級進化" } },
  { key: "master_mega", label: "마스터리그 (메가)", base: "master", cup: true, note: "메가 허용", l10n: { en: "Master League (Mega)", ja: "マスターリーグ（メガ）", "zh-TW": "大師聯盟（超級進化）" }, noteL10n: { en: "Mega allowed", ja: "メガ解禁", "zh-TW": "開放超級進化" } },
];

// 컵 일정 — 공식 기준. 시즌별로 누적(키에 시즌 접미사 → 전적 기록 키 충돌 방지). activeCups()가 날짜로 현재 컵만 고름.
export const CUP_FORMATS: Format[] = [
  // ── 시즌28(황혼의 여정) — LEAGUE_SCHEDULE_BY_SEASON.s28과 동일 일정. 타입 제한은 공식 규칙 확인분만 기재(미확인=풀 전체).
  { key: "cup_competitive_s28", label: "컴페티티브컵", base: "great", cup: true, start: "2026-09-16", end: "2026-09-23", note: "슈퍼", l10n: { en: "Competitive Cup", ja: "コンペティティブカップ", "zh-TW": "競技盃" }, noteL10n: { en: "Great League", ja: "スーパーリーグ", "zh-TW": "超級聯盟" } },
  { key: "cup_retro_s28", label: "레트로컵", base: "great", cup: true, start: "2026-09-23", end: "2026-09-30", excludeTypes: ["dark", "steel", "fairy"], note: "슈퍼 · 악/강철/페어리 제외", l10n: { en: "Retro Cup", ja: "レトロカップ", "zh-TW": "復古盃" }, noteL10n: { en: "Great · no Dark/Steel/Fairy", ja: "スーパー · あく/はがね/フェアリー除外", "zh-TW": "超級 · 排除惡/鋼/妖精" } },
  { key: "cup_mega4_s28", label: "메가 4색컵", base: "great", cup: true, start: "2026-09-30", end: "2026-10-07", note: "슈퍼 · 메가", l10n: { en: "Mega Color Cup", ja: "メガカラーカップ", "zh-TW": "超級顏色盃" }, noteL10n: { en: "Great · Mega", ja: "スーパー · メガ", "zh-TW": "超級 · 超級進化" } },
  { key: "cup_little_s28", label: "리틀컵", base: "great", cup: true, start: "2026-10-14", end: "2026-10-21", note: "CP 500", l10n: { en: "Little Cup", ja: "リトルカップ", "zh-TW": "小小盃" }, noteL10n: { en: "CP 500", ja: "CP 500", "zh-TW": "CP 500" } },
  { key: "cup_fantasy_s28", label: "판타지컵", base: "great", cup: true, start: "2026-10-21", end: "2026-10-28", allowTypes: ["dragon", "steel", "fairy"], note: "슈퍼 · 드래곤/강철/페어리", l10n: { en: "Fantasy Cup", ja: "ファンタジーカップ", "zh-TW": "幻想盃" }, noteL10n: { en: "Great · Dragon/Steel/Fairy", ja: "スーパー · ドラゴン/はがね/フェアリー", "zh-TW": "超級 · 龍/鋼/妖精" } },
  { key: "cup_mega_halloween_s28", label: "메가 할로윈컵", base: "great", cup: true, start: "2026-10-28", end: "2026-11-04", allowTypes: ["poison", "ghost", "bug", "dark", "fairy"], note: "슈퍼 · 독/고스트/벌레/악/페어리 · 메가", l10n: { en: "Mega Halloween Cup", ja: "メガハロウィンカップ", "zh-TW": "超級萬聖節盃" }, noteL10n: { en: "Great · Poison/Ghost/Bug/Dark/Fairy · Mega", ja: "スーパー · どく/ゴースト/むし/あく/フェアリー · メガ", "zh-TW": "超級 · 毒/幽靈/蟲/惡/妖精 · 超級進化" } },
  { key: "cup_champ_la_s28", label: "GO 챔피언십 LA컵", base: "great", cup: true, start: "2026-11-11", end: "2026-11-25", note: "슈퍼", l10n: { en: "GO Championships LA Cup", ja: "GOチャンピオンシップ LAカップ", "zh-TW": "GO 錦標賽 LA 盃" }, noteL10n: { en: "Great League", ja: "スーパーリーグ", "zh-TW": "超級聯盟" } },
  { key: "cup_mega_catch_s28", label: "메가 캐치컵", base: "great", cup: true, start: "2026-11-25", end: "2026-12-01", note: "슈퍼 · 시즌 중 포획 · 메가", l10n: { en: "Mega Catch Cup", ja: "メガキャッチカップ", "zh-TW": "超級捕捉盃" }, noteL10n: { en: "Great · caught this season · Mega", ja: "スーパー · 今シーズン捕獲 · メガ", "zh-TW": "超級 · 本賽季捕捉 · 超級進化" } },
  // ── 시즌27(새로운 발걸음) — 아카이브(전적 기록 키 유지)
  { key: "cup_scroll", label: "스크롤컵", base: "great", cup: true, start: "2026-08-18", end: "2026-08-26", allowTypes: ["water", "fighting", "dark"], note: "슈퍼 · 물/격투/악", l10n: { en: "Scroll Cup", ja: "スクロールカップ", "zh-TW": "卷軸盃" }, noteL10n: { en: "Great · Water/Fighting/Dark", ja: "スーパー · みず/かくとう/あく", "zh-TW": "超級 · 水/格鬥/惡" } },
  { key: "cup_evolution", label: "진화컵", base: "great", cup: true, start: "2026-08-11", end: "2026-08-19", note: "슈퍼 · 1회 진화(추가진화 가능)", l10n: { en: "Evolution Cup", ja: "しんかカップ", "zh-TW": "進化盃" }, noteL10n: { en: "Great · evolved once (can evolve further)", ja: "スーパー · 1回進化（further進化可）", "zh-TW": "超級 · 已進化一次（可再進化）" } },
  { key: "cup_nature", label: "네이처컵", base: "great", cup: true, start: "2026-08-04", end: "2026-08-12", allowTypes: ["fire", "water", "ice", "rock"], note: "슈퍼 · 불/물/얼음/바위", l10n: { en: "Nature Cup", ja: "ネイチャーカップ", "zh-TW": "自然盃" }, noteL10n: { en: "Great · Fire/Water/Ice/Rock", ja: "スーパー · ほのお/みず/こおり/いわ", "zh-TW": "超級 · 火/水/冰/岩石" } },
  { key: "cup_retro", label: "레트로컵", base: "great", cup: true, start: "2026-07-14", end: "2026-07-22", excludeTypes: ["dark", "steel", "fairy"], note: "슈퍼 · 악/강철/페어리 제외", l10n: { en: "Retro Cup", ja: "レトロカップ", "zh-TW": "復古盃" }, noteL10n: { en: "Great · no Dark/Steel/Fairy", ja: "スーパー · あく/はがね/フェアリー除外", "zh-TW": "超級 · 排除惡/鋼/妖精" } },
  { key: "cup_fantasy", label: "판타지컵", base: "ultra", cup: true, start: "2026-07-07", end: "2026-07-15", allowTypes: ["dragon", "steel", "fairy"], note: "하이퍼 · 드래곤/강철/페어리", l10n: { en: "Fantasy Cup", ja: "ファンタジーカップ", "zh-TW": "幻想盃" }, noteL10n: { en: "Ultra · Dragon/Steel/Fairy", ja: "ハイパー · ドラゴン/はがね/フェアリー", "zh-TW": "高級 · 龍/鋼/妖精" } },
  { key: "cup_summer", label: "서머컵", base: "great", cup: true, start: "2026-06-30", end: "2026-07-08", allowTypes: ["normal", "fire", "water", "grass", "electric", "bug"], note: "슈퍼", l10n: { en: "Summer Cup", ja: "サマーカップ", "zh-TW": "夏日盃" }, noteL10n: { en: "Great League", ja: "スーパーリーグ", "zh-TW": "超級聯盟" } },
];

// GBL 공식 리그 로테이션 일정(주차별로 열리는 리그·컵). 시즌 진행에 따라 갱신.
// end 는 제외(그날부터 다음 주차). 공식 발표 기준.
export type SchedulePeriod = {
  start: string;
  end: string;
  items: { label: string; base: "great" | "ultra" | "master" | "cup" }[];
  note?: string;
};
// 시즌별 리그 로테이션. 새 시즌 발표 시 slug 키로 추가. (경계=KST 수요일, 시즌 시작 05:00 KST)
export const LEAGUE_SCHEDULE_BY_SEASON: Record<string, SchedulePeriod[]> = {
  s27: [
  {
    start: "2026-08-19", end: "2026-08-26",
    items: [
      { label: "슈퍼리그", base: "great" },
      { label: "스크롤컵 (슈퍼리그)", base: "cup" },
    ],
  },
  {
    start: "2026-08-26", end: "2026-09-02",
    items: [
      { label: "슈퍼리그", base: "great" },
      { label: "하이퍼리그", base: "ultra" },
      { label: "마스터리그", base: "master" },
    ],
    note: "배틀 승리 시 별의모래 4배 (세트 종료 리워드 제외)",
  },
  {
    start: "2026-09-02", end: "2026-09-09",
    items: [
      { label: "슈퍼리그: 메가", base: "great" },
      { label: "하이퍼리그: 메가", base: "ultra" },
      { label: "마스터리그: 메가", base: "master" },
    ],
    note: "별의모래 4배 (세트 종료 리워드 제외)",
  },
  ],
  // 시즌28(황혼의 여정) — 공식 발표 기준. 경계는 KST 수요일 주간(9/9 05:00 시작).
  s28: [
    { start: "2026-09-09", end: "2026-09-16", note: "별의모래 4배 (세트 종료 리워드 제외)", items: [
      { label: "슈퍼리그: 메가", base: "great" }, { label: "하이퍼리그: 메가", base: "ultra" }, { label: "마스터리그: 메가", base: "master" }] },
    { start: "2026-09-16", end: "2026-09-23", items: [
      { label: "슈퍼리그", base: "great" }, { label: "하이퍼리그: 메가", base: "ultra" }, { label: "컴페티티브컵 (슈퍼리그)", base: "cup" }] },
    { start: "2026-09-23", end: "2026-09-30", note: "별의모래 4배 (세트 종료 리워드 제외)", items: [
      { label: "하이퍼리그", base: "ultra" }, { label: "마스터리그: 메가", base: "master" }, { label: "레트로컵 (슈퍼리그)", base: "cup" }] },
    { start: "2026-09-30", end: "2026-10-07", note: "별의모래 4배 (세트 종료 리워드 제외)", items: [
      { label: "마스터리그", base: "master" }, { label: "메가 4색컵 (슈퍼리그)", base: "cup" }] },
    { start: "2026-10-07", end: "2026-10-14", note: "별의모래 4배 (세트 종료 리워드 제외)", items: [
      { label: "슈퍼리그: 메가", base: "great" }, { label: "하이퍼리그: 메가", base: "ultra" }, { label: "마스터리그: 메가", base: "master" }] },
    { start: "2026-10-14", end: "2026-10-21", items: [
      { label: "슈퍼리그", base: "great" }, { label: "하이퍼리그: 메가", base: "ultra" }, { label: "리틀컵", base: "cup" }] },
    { start: "2026-10-21", end: "2026-10-28", note: "별의모래 4배 (세트 종료 리워드 제외)", items: [
      { label: "하이퍼리그", base: "ultra" }, { label: "마스터리그: 메가", base: "master" }, { label: "판타지컵 (슈퍼리그)", base: "cup" }] },
    { start: "2026-10-28", end: "2026-11-04", note: "별의모래 4배 (세트 종료 리워드 제외)", items: [
      { label: "마스터리그", base: "master" }, { label: "메가 할로윈컵 (슈퍼리그)", base: "cup" }] },
    { start: "2026-11-04", end: "2026-11-11", note: "별의모래 4배 (세트 종료 리워드 제외)", items: [
      { label: "슈퍼리그: 메가", base: "great" }, { label: "하이퍼리그: 메가", base: "ultra" }, { label: "마스터리그: 메가", base: "master" }] },
    { start: "2026-11-11", end: "2026-11-18", items: [
      { label: "슈퍼리그", base: "great" }, { label: "하이퍼리그: 메가", base: "ultra" }, { label: "GO 챔피언십 LA컵", base: "cup" }] },
    { start: "2026-11-18", end: "2026-11-25", note: "별의모래 4배 (세트 종료 리워드 제외)", items: [
      { label: "하이퍼리그", base: "ultra" }, { label: "마스터리그: 메가", base: "master" }, { label: "GO 챔피언십 LA컵", base: "cup" }] },
    { start: "2026-11-25", end: "2026-12-01", note: "별의모래 4배 (세트 종료 리워드 제외)", items: [
      { label: "마스터리그", base: "master" }, { label: "메가 캐치컵 (슈퍼리그)", base: "cup" }] },
  ],
};
// 하위호환 — 기존 참조(현재 시즌 로테이션). 레지스트리 현재 시즌 슬러그 기준, 스냅샷 없으면 마지막 등록 시즌.
export const LEAGUE_SCHEDULE = LEAGUE_SCHEDULE_BY_SEASON[currentSeason().slug] || LEAGUE_SCHEDULE_BY_SEASON.s28;

// ⚠ 번역 검증 상태(2026-10-09)
//  · 리그명(슈퍼/하이퍼/마스터)·리틀컵·판타지컵·메가 할로윈컵·메가 캐치컵
//    → sdEvents.ts EXTRA(이벤트명 번역표)와 같은 표기. 기존에 검증된 값.
//  · 컴페티티브컵·레트로컵·메가 4색컵·GO 챔피언십 LA컵·스크롤컵·진화컵·네이처컵·서머컵
//    → **인게임 공식 표기 미확인**. JP는 음차(레트로카ップ 식), TW는 의역(復古盃 식)이라는
//      관례를 따라 작성했으나, 일본·대만 클라이언트에서 실제 표기 확인 필요.
//      확인 전까지는 한글이 그대로 노출되는 것보다 낫다는 판단으로 적용.
// 포맷 라벨·주석을 로케일로. 번역이 없으면 ko 원문(=기존 동작) 유지.
export function formatLabel(f: Format | undefined, lang: string): string {
  if (!f) return "";
  return (lang !== "ko" && f.l10n?.[lang as "en" | "ja" | "zh-TW"]) || f.label;
}
export function formatNote(f: Format | undefined, lang: string): string {
  if (!f?.note) return "";
  return (lang !== "ko" && f.noteL10n?.[lang as "en" | "ja" | "zh-TW"]) || f.note;
}

export const ALL_FORMATS = [...CORE_FORMATS, ...MEGA_FORMATS, ...CUP_FORMATS];
export const FORMAT_BY_KEY: Record<string, Format> = Object.fromEntries(ALL_FORMATS.map((f) => [f.key, f]));

export function activeCups(todayISO: string): Format[] {
  return CUP_FORMATS.filter((c) => c.start && c.end && c.start <= todayISO && todayISO < c.end);
}

// 코어 3리그 + 메가 리그 3종 + 오늘 진행 중인 컵
export function currentFormats(todayISO: string): Format[] {
  return [...CORE_FORMATS, ...MEGA_FORMATS, ...activeCups(todayISO)];
}

// 컵 타입 제한으로 입력 풀 좁히기
export function filterPool<T extends { types: string[] }>(pool: T[], f?: Format): T[] {
  if (!f) return pool;
  if (f.allowTypes) return pool.filter((m) => m.types.some((t) => f.allowTypes!.includes(t)));
  if (f.excludeTypes) return pool.filter((m) => !m.types.some((t) => f.excludeTypes!.includes(t)));
  return pool;
}

// KST(UTC+9) 기준 오늘 날짜. toISOString()은 UTC라 한국 자정~오전9시엔 하루 전이 나오는 버그 방지.
export const todayISO = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
