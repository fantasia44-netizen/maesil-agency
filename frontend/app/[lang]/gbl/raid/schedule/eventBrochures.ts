// 이벤트 브로마이드(팝업) 데이터. 레이드 데이/아워 클릭 시 포스터형 팝업으로 표시.
// 메가/슈퍼메가처럼 게임 종족값이 없는 보스는 CP를 수동 입력. 히어로 아트는 heroImg(직접 업로드) 우선, 없으면 sprite.
export type Brochure = {
  dateKey: string;            // "2026-08-22" — 이 날짜의 레이드 데이/아워에 매칭
  start?: string;             // 자동팝업 시작(ISO, 예 "2026-08-22T11:00:00+09:00")
  end?: string;               // 자동팝업 종료(ISO) — 이 시간 지나면 자동 안 뜸
  kindLabel: string;          // "레이드 데이" / "레이드 아워"
  eyebrow?: string;           // "오늘 단 하루!"
  title: string;              // "슈퍼메가 아쿠스타"
  subtitle?: string;          // "6시간 동안 펼쳐지는 슈퍼메가 레이드 데이!"
  dateLabel: string;          // "26/8/22 (토)"
  timeLabel: string;          // "11:00 ~ 17:00 (6시간)"
  newBadge?: string;          // "신규"
  newLabel?: string;          // "메가 아쿠스타"
  hero: { img?: string; spriteKo?: string; spriteDex?: string; shiny?: boolean };  // img 우선, 없으면 스프라이트
  maxCp?: number;             // 최대 CP (레이드 보스 CP)
  bossTypes?: string[];       // 보스 타입 (예: ["water","psychic"])
  weakTypes?: string[];       // 약점 타입 키 (예: ["electric","grass"])
  resistTypes?: string[];     // 저항 타입 키
  attackTypes?: string[];     // 약점 공격 추천 (예: ["electric","grass"])
  counters?: { ko: string; dex: string; type: string }[];  // 추천 포켓몬 TOP 6
  cpIv?: { rows: { iv: string; pct: number; l20: number; l25: number }[] };  // 우리 CpTable 형식(개체값/일반L20/날씨L25)
  cp?: { levels: number[]; normal: number[]; boosted: number[]; recLevel?: number; maxLevel?: number };
  bonuses: { n: number; title: string; accent?: boolean; items: string[] }[];
  note?: string;
};

// 현재는 한국어 콘텐츠 기준(레이드 이벤트가 KR 중심). en/ja는 추후 번역.
// ※ 지난 이벤트는 제거함(예: 슈퍼메가 아쿠스타 2026-08-22). 새 레이드 데이/아워 브로슈어를 여기 추가.
export const BROCHURES: Brochure[] = [];

export function brochureFor(dateKey: string): Brochure | undefined {
  return BROCHURES.find((b) => b.dateKey === dateKey);
}
