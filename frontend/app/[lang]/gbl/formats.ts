// GBL 포맷 레지스트리 — 코어 리그 + 시즌 로테이션 컵(커스텀 리그).
// league 필드에 이 key가 저장됨. 컵은 base 리그 풀 + 타입 제한으로 입력 풀을 좁힌다.
// ※ 컵은 매 시즌 바뀌므로 새 시즌 시작 시 CUP_FORMATS를 갱신해야 함(관리자화 예정).

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
};

export const CORE_FORMATS: Format[] = [
  { key: "great", label: "슈퍼리그", base: "great" },
  { key: "ultra", label: "하이퍼리그", base: "ultra" },
  { key: "master", label: "마스터리그", base: "master" },
];

// 시즌27(새로운 발걸음) 컵 일정 — 공식 기준. 다음 시즌엔 교체.
export const CUP_FORMATS: Format[] = [
  { key: "cup_scroll", label: "스크롤컵", base: "great", cup: true, start: "2026-08-18", end: "2026-08-26", allowTypes: ["water", "fighting", "dark"], note: "슈퍼 · 물/격투/악" },
  { key: "cup_evolution", label: "진화컵", base: "great", cup: true, start: "2026-08-11", end: "2026-08-19", note: "슈퍼 · 1회 진화(추가진화 가능)" },
  { key: "cup_nature", label: "네이처컵", base: "great", cup: true, start: "2026-08-04", end: "2026-08-12", allowTypes: ["fire", "water", "ice", "rock"], note: "슈퍼 · 불/물/얼음/바위" },
  { key: "cup_retro", label: "레트로컵", base: "great", cup: true, start: "2026-07-14", end: "2026-07-22", excludeTypes: ["dark", "steel", "fairy"], note: "슈퍼 · 악/강철/페어리 제외" },
  { key: "cup_fantasy", label: "판타지컵", base: "ultra", cup: true, start: "2026-07-07", end: "2026-07-15", allowTypes: ["dragon", "steel", "fairy"], note: "하이퍼 · 드래곤/강철/페어리" },
  { key: "cup_summer", label: "서머컵", base: "great", cup: true, start: "2026-06-30", end: "2026-07-08", allowTypes: ["normal", "fire", "water", "grass", "electric", "bug"], note: "슈퍼" },
];

// GBL 공식 리그 로테이션 일정(주차별로 열리는 리그·컵). 시즌 진행에 따라 갱신.
// end 는 제외(그날부터 다음 주차). 공식 발표 기준.
export type SchedulePeriod = {
  start: string;
  end: string;
  items: { label: string; base: "great" | "ultra" | "master" | "cup" }[];
  note?: string;
};
export const LEAGUE_SCHEDULE: SchedulePeriod[] = [
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
];

export const ALL_FORMATS = [...CORE_FORMATS, ...CUP_FORMATS];
export const FORMAT_BY_KEY: Record<string, Format> = Object.fromEntries(ALL_FORMATS.map((f) => [f.key, f]));

export function activeCups(todayISO: string): Format[] {
  return CUP_FORMATS.filter((c) => c.start && c.end && c.start <= todayISO && todayISO < c.end);
}

// 코어 3리그 + 오늘 진행 중인 컵
export function currentFormats(todayISO: string): Format[] {
  return [...CORE_FORMATS, ...activeCups(todayISO)];
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
