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
export const BROCHURES: Brochure[] = [
  {
    dateKey: "2026-08-22",
    start: "2026-08-22T11:00:00+09:00",
    end: "2026-08-22T17:00:00+09:00",
    kindLabel: "레이드 데이",
    eyebrow: "오늘 단 하루!",
    title: "슈퍼메가 아쿠스타",
    subtitle: "6시간 동안 펼쳐지는 슈퍼메가 레이드 데이!",
    dateLabel: "26/8/22 (토)",
    timeLabel: "11:00 ~ 17:00 (6시간)",
    newBadge: "신규",
    newLabel: "메가 아쿠스타",
    hero: { img: "/gbl/events/mega-aqusta.png", spriteKo: "아쿠스타", spriteDex: "121", shiny: true },  // img 파일 있으면 그것, 없으면 스프라이트
    maxCp: 71871,
    bossTypes: ["water", "psychic"],
    weakTypes: ["electric", "grass", "bug", "ghost", "dark"],   // 물/에스퍼 정확한 약점
    resistTypes: ["fire", "water", "ice", "steel", "fighting", "psychic"],
    counters: [   // 슈퍼메가 = 메가진화 필수 → 메가만, 약점(전기·풀·벌레·고스트·악) 상위 rel, 종 중복 제거
      { ko: "메가 나무킹", dex: "254", type: "grass" },
      { ko: "메가 헤라크로스", dex: "214", type: "bug" },
      { ko: "메가 마기라스", dex: "248", type: "dark" },
      { ko: "메가 뮤츠 Y", dex: "150", type: "electric" },
      { ko: "메가 이상해꽃", dex: "3", type: "grass" },
      { ko: "메가 라이츄 Y", dex: "26", type: "electric" },
    ],
    cpIv: { rows: [   // 기본 아쿠스타(dex121) 실측 — 메가 레이드도 획득은 기본폼이라 이게 정답(공식과 일치)
      { iv: "15 / 15 / 15", pct: 100, l20: 1476, l25: 1846 },
      { iv: "15 / 14 / 15", pct: 98, l20: 1473, l25: 1841 },
      { iv: "15 / 15 / 14", pct: 98, l20: 1472, l25: 1840 },
      { iv: "14 / 15 / 15", pct: 98, l20: 1470, l25: 1838 },
      { iv: "15 / 13 / 15", pct: 96, l20: 1469, l25: 1836 },
    ] },
    bonuses: [
      { n: 1, title: "메가 아쿠스타 슈퍼 메가 레이드 대량발생!", accent: true, items: [
        "✨ 색이 다른 아쿠스타 등장 확률 증가 (10%)",
        "슈퍼 메가 레이드에서 잡은 아쿠스타는 메가 레벨 1단계에 도달",
      ] },
      { n: 2, title: "시간제한 리서치 (무료)", items: [
        "보상: 프리미엄 배틀패스 x1, 핫삼 ✨",
      ] },
      { n: 3, title: "이벤트 티켓 (14~17시, $4.99)", items: [
        "일일 무료 레이드 패스 최대 14개",
        "레이드 승리 시 +5,000 XP · 별의모래 2배",
        "레이드 승리 시 이상한사탕XL 드랍률 대폭 상승",
        "아쿠스타 포획 시 이상한사탕XL 반드시 획득",
        "웹 스토어 박스 구매 시 프리미엄 배틀패스 +1",
      ] },
      { n: 4, title: "이벤트 보너스", items: [
        "일일 무료 레이드 패스 최대 6개",
        "모든 레이드에서 +5,000 XP · 이상한사탕XL 드랍률 증가",
        "웹 스토어: 하이퍼 티켓 박스 판매",
        "리모트 레이드 상한 20회 (8/22 6:00 ~ 8/23 12:00)",
      ] },
    ],
    note: "전날 1회 분까지 미리 준비하는 것을 추천",
  },
];

export function brochureFor(dateKey: string): Brochure | undefined {
  return BROCHURES.find((b) => b.dateKey === dateKey);
}
