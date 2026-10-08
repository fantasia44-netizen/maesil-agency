// 일반 이벤트용 수동 보강표 — 피드에 상세가 없는 것만 여기서 채운다.
//
// ScrapedDuck 피드는 유형별로 주는 게 다르다:
//   · community-day  → 등장 포켓몬 + 보너스 목록      (자동)
//   · spotlight-hour → 메인 포켓몬 + 보너스 1줄        (자동)
//   · raid-battles   → 보스 + 이로치                   (자동, /gbl/raid/schedule)
//   · research       → 프로모코드                      (자동)
//   · 그 외 'event'  → 이름·기간·LeekDuck 배너 링크뿐  ← 상세가 없음
// 마지막 줄 때문에 "세계 우주 주간의 우주비행사 피카츄" 같은 메인 포켓몬·보상은 자동으로 못 가져온다.
// 그래서 eventID로 맞춰 수동 입력. 안 적으면 아무것도 안 나간다(빈 값이 기본, 틀린 정보 노출 없음).
//
// 스프라이트는 우리가 쓰는 UICONS 파일명(코스튬 포함) — leekduck 배너(타사 창작물) 미사용.
// bonuses에는 "확인된" 배수 보너스만. 출처가 엇갈리는 수치는 적지 말고 notes에 사실만 적는다.
import type { Locale } from "../../../../lib/i18n";

const UICONS = "https://raw.githubusercontent.com/WatWowMap/wwm-uicons/main/pokemon/";
export const uiconSprite = (file: string) => UICONS + file;

export type ManualExtra = {
  mons?: { file: string; name: Record<Locale, string>; shiny?: boolean }[];
  bonuses?: Record<Locale, string[]>;
  notes?: Record<Locale, string[]>;
};

export const EVENT_EXTRAS: Record<string, ManualExtra> = {
  "world-space-week-2026": {
    mons: [{
      file: "25_f3357.png",   // 우주비행사 피카츄(2026-10 신규 코스튬)
      name: { ko: "우주비행사 피카츄", en: "Astronaut Pikachu", ja: "うちゅうひこうしピカチュウ", "zh-TW": "太空人皮卡丘" },
      shiny: true,
    }],
    notes: {
      ko: ["우주비행사 피카츄 — 1성 레이드 등장 (이로치 가능)", "무료 타임 챌린지 완료 시 우주비행사 피카츄 조우 · 보상 수령 ~10/12"],
      en: ["Astronaut Pikachu appears in one-star raids (shiny possible)", "Free Timed Research rewards an Astronaut Pikachu encounter · claim by Oct 12"],
      ja: ["うちゅうひこうしピカチュウ — 1★レイドに登場（色違いあり）", "無料タイムチャレンジ達成でうちゅうひこうしピカチュウと遭遇・報酬受取は10/12まで"],
      "zh-TW": ["太空人皮卡丘 — 一星團體戰登場（可能異色）", "完成免費限時調查可遇到太空人皮卡丘 · 獎勵領取至 10/12"],
    },
  },
};

export function manualExtra(eventID: string): ManualExtra | undefined {
  return EVENT_EXTRAS[eventID];
}
