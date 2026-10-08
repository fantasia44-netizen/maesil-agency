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
//
// ── 운영 규칙 (2026-10-09 사장님 결정: "A로 가자") ──────────────────────
// 전부 채우지 않는다. 자동(피드)이 기본이고, **큰 이벤트일 때만 월 1~2건** 수동으로 넣는다.
//   넣는 대상: GO 페스트·투어, 시즌 전환, 할로윈/크리스마스급 대형 캠페인, 신규 코스튬/신규 포켓몬 데뷔.
//   넣지 않는 대상: 유성우·부화 데이·주간 소규모 캠페인(피드의 이름·기간만으로 충분).
// 작성 절차: ① 피드에서 eventID 확인 ② 공식/주요 소스 2곳 이상 교차 확인
//            ③ 일치하는 사실만 notes, 배수 보너스는 확인된 것만 bonuses ④ 스프라이트는 실물 확인 후 파일명.
// 지난 이벤트 항목은 피드에서 빠지면 자동으로 안 보이므로 급히 지울 필요는 없다(가끔 정리).
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

  // ── 할로윈 2026 파트 1 (10/27 10:00 ~ 11/1 10:00 현지) ──
  // 신규 코스튬 3종 데뷔. 코스튬 스프라이트는 이벤트 시작 전이라 UICONS에 아직 없음 → 기본 모습 + 고지.
  // 에셋이 올라오면 file을 코스튬 파일명으로 바꾸고 notes의 마지막 줄을 지울 것.
  "halloween-2026-part-1": {
    mons: [
      { file: "25.png", name: { ko: "코스튬 피카츄", en: "Costumed Pikachu", ja: "コスチュームピカチュウ", "zh-TW": "造型皮卡丘" }, shiny: true },
      { file: "41.png", name: { ko: "코스튬 주뱃", en: "Costumed Zubat", ja: "コスチュームズバット", "zh-TW": "造型超音蝠" }, shiny: true },
      { file: "854.png", name: { ko: "코스튬 데인차", en: "Costumed Sinistea", ja: "コスチュームヤバチャ", "zh-TW": "造型來悲茶" }, shiny: true },
    ],
    notes: {
      ko: [
        "신규 코스튬 3종 데뷔 — 피카츄(모자·케이프)·주뱃(실크햇)·데인차(리본), 전부 이로치 가능",
        "코스튬 피카츄·데인차는 1성 레이드, 코스튬 주뱃은 야생 출현",
        "야생에 해골몽·팽도리(할로윈 코스튬), 둥실라이드는 드물게",
        "밤에 라벤더타운 리믹스 BGM · 고딕 의상 아바타 아이템(이벤트 후에도 상점 유지)",
        "※ 코스튬 이미지는 게임 에셋 공개 후 반영 — 지금은 기본 모습",
      ],
      en: [
        "Three new costumes debut — Pikachu (hat & capelet), Zubat (top hat), Sinistea (bow); all can be shiny",
        "Costumed Pikachu and Sinistea appear in one-star raids; costumed Zubat is a wild encounter",
        "Also wild: Duskull and Piplup in Halloween costumes, Drifblim more rarely",
        "A Lavender Town remix plays at night · Gothic avatar items stay in the shop after the event",
        "* Costume art will be shown once the game assets are published — base forms for now",
      ],
      ja: [
        "新コスチューム3種デビュー — ピカチュウ（帽子・ケープ）・ズバット（シルクハット）・ヤバチャ（リボン）、すべて色違いあり",
        "コスチュームピカチュウ・ヤバチャは1★レイド、コスチュームズバットは野生に出現",
        "野生にヨマワル・ポッチャマ（ハロウィンコスチューム）、フワライドは低確率",
        "夜はシオンタウンのリミックスBGM · ゴシック系アバターアイテムはイベント後もショップに残る",
        "※ コスチューム画像はゲームアセット公開後に反映 — 現在は通常の姿",
      ],
      "zh-TW": [
        "三種新造型登場 — 皮卡丘（帽子·披風）·超音蝠（高禮帽）·來悲茶（蝴蝶結），皆可能異色",
        "造型皮卡丘·來悲茶於一星團體戰登場，造型超音蝠為野外遇見",
        "野外另有夜巡靈·波加曼（萬聖節造型），隨風球機率較低",
        "夜間播放紫苑鎮重混BGM · 哥德風虛擬人偶服飾活動後仍留在商店",
        "※ 造型圖片待遊戲素材公開後更新 — 目前為一般外觀",
      ],
    },
  },

  // ── GO 와일드 에어리어 2026 글로벌 (11/14~11/15) ──
  // 다이맥스 디아루가·펄기아 데뷔. 스프라이트는 기본 모습 + 이름에 "다이맥스"(게임 내 표기도 접두).
  "pokemon-go-wild-area-2026-global": {
    mons: [
      { file: "483.png", name: { ko: "다이맥스 디아루가", en: "Dynamax Dialga", ja: "ダイマックス ディアルガ", "zh-TW": "極巨化 帝牙盧卡" } },
      { file: "484.png", name: { ko: "다이맥스 펄기아", en: "Dynamax Palkia", ja: "ダイマックス パルキア", "zh-TW": "極巨化 帕路奇亞" } },
    ],
    notes: {
      ko: [
        "다이맥스 디아루가·펄기아 데뷔 — 11/14(토) 디아루가, 11/15(일) 펄기아 맥스 배틀",
        "로케이션 배경은 현장 이벤트(센다이·멕시코시티)의 레이드·맥스 배틀에서만 — 원격 참가는 대상 아님",
      ],
      en: [
        "Dynamax Dialga and Palkia debut — Dialga in Max Battles Sat Nov 14, Palkia Sun Nov 15",
        "Location Backgrounds come only from in-person raids and Max Battles (Sendai / Mexico City) — remote play doesn't qualify",
      ],
      ja: [
        "ダイマックス ディアルガ・パルキアがデビュー — 11/14(土)ディアルガ、11/15(日)パルキアのマックスバトル",
        "ロケーション背景は現地イベント（仙台・メキシコシティ）のレイド・マックスバトルのみ — リモート参加は対象外",
      ],
      "zh-TW": [
        "極巨化帝牙盧卡·帕路奇亞登場 — 11/14（六）帝牙盧卡、11/15（日）帕路奇亞極巨戰",
        "地點背景僅限現場活動（仙台·墨西哥城）的團體戰·極巨戰 — 遠距參加不符資格",
      ],
    },
  },

  // ── GO 와일드 에어리어 2026 센다이·도호쿠 (11/6~11/8, 현장 티켓) ──
  "pokemon-go-wild-area-2026-sendai-japan": {
    mons: [
      { file: "483.png", name: { ko: "다이맥스 디아루가", en: "Dynamax Dialga", ja: "ダイマックス ディアルガ", "zh-TW": "極巨化 帝牙盧卡" } },
      { file: "484.png", name: { ko: "다이맥스 펄기아", en: "Dynamax Palkia", ja: "ダイマックス パルキア", "zh-TW": "極巨化 帕路奇亞" } },
    ],
    notes: {
      ko: [
        "현장 티켓 이벤트 — 11/6·7·8 중 하루, 10:00~18:00(JST), 센다이시 및 미야기현 일대",
        "다이맥스 디아루가·펄기아가 맥스 배틀에 등장. 로케이션 배경은 현장 참가자만",
      ],
      en: [
        "Ticketed in-person event — one of Nov 6/7/8, 10:00–18:00 JST, Sendai City and Miyagi Prefecture",
        "Dynamax Dialga and Palkia appear in Max Battles; Location Backgrounds are for in-person play only",
      ],
      ja: [
        "現地チケットイベント — 11/6・7・8のいずれか1日、10:00〜18:00(JST)、仙台市および宮城県一帯",
        "ダイマックス ディアルガ・パルキアがマックスバトルに登場。ロケーション背景は現地参加者のみ",
      ],
      "zh-TW": [
        "現場門票活動 — 11/6·7·8 擇一日，10:00~18:00（JST），仙台市與宮城縣一帶",
        "極巨化帝牙盧卡·帕路奇亞於極巨戰登場。地點背景僅限現場參加者",
      ],
    },
  },
};

// ── 피드에 아예 없는 이벤트(지역 한정 등) ────────────────────────────────
// ScrapedDuck(LeekDuck)은 영어권·글로벌 중심이라 한국 단독 이벤트는 들어오지 않는다.
// (FC서울 2026은 공식 한국어 뉴스에만 있고 피드엔 0건) → 여기에 직접 적어 목록·달력에 합친다.
// 날짜는 피드와 같은 "현지 벽시계"(타임존 없음) 표기를 쓴다: "2026-10-24T09:00:00.000"
export type LocalEvent = ManualExtra & {
  id: string;
  type: string;                    // 피드 eventType과 같은 값 — 이모지·필터·라벨을 그대로 재사용
  name: Record<Locale, string>;
  start: string; end: string;
  spawns?: boolean; research?: boolean;
};

export const LOCAL_EVENTS: LocalEvent[] = [
  {
    id: "fc-seoul-2026",
    type: "event",
    name: {
      ko: "FC서울 × 포켓몬 GO 2026", en: "FC Seoul × Pokémon GO 2026",
      ja: "FCソウル × ポケモンGO 2026", "zh-TW": "FC首爾 × 寶可夢GO 2026",
    },
    start: "2026-10-24T09:00:00.000", end: "2026-10-24T20:00:00.000",
    spawns: true, research: true,
    mons: [
      { file: "4.png", name: { ko: "파이리", en: "Charmander", ja: "ヒトカゲ", "zh-TW": "小火龍" }, shiny: true },
      { file: "6.png", name: { ko: "리자몽", en: "Charizard", ja: "リザードン", "zh-TW": "噴火龍" }, shiny: true },
    ],
    bonuses: {
      ko: ["루어모듈 2시간 지속", "Nice 이상 포획 시 사탕 증가"],
      en: ["Lure Modules last 2 hours", "More Candy for Nice-or-better throws"],
      ja: ["ルアーモジュール2時間持続", "Nice以上の捕獲でアメ増加"],
      "zh-TW": ["誘餌模組持續2小時", "Nice 以上捕捉時糖果增加"],
    },
    notes: {
      ko: [
        "서울월드컵경기장 일대 · 10/24(토) 09:00~20:00 (현장 부스 09:00~14:00)",
        "별1 레이드 파이리 — 이벤트 로케이션 배경 · 리모트 레이드패스 사용 불가",
        "무료 타임 챌린지: 8,042 XP · 별의모래 5,997 · 파이리 사탕 50 · 프리미엄 배틀패스 1, 로케이션 배경 리자몽 조우 (수령 ~11/7 20:00)",
        "야생: 가디·아차모·델빌·레오꼬·냐오불(이로치 확률↑), 부스터(이로치 가능)",
      ],
      en: [
        "Seoul World Cup Stadium area · Sat Oct 24, 09:00–20:00 KST (on-site booth 09:00–14:00)",
        "One-star raid Charmander with the event Location Background · Remote Raid Passes can't be used",
        "Free Timed Research: 8,042 XP · 5,997 Stardust · 50 Charmander Candy · 1 Premium Battle Pass, plus a Charizard encounter with the Location Background (claim by Nov 7, 20:00 KST)",
        "Wild: Growlithe, Torchic, Houndour, Litleo, Litten (boosted shiny odds); Flareon (shiny possible)",
      ],
      ja: [
        "ソウルワールドカップ競技場一帯 · 10/24(土) 09:00〜20:00(KST、現地ブースは09:00〜14:00)",
        "1★レイドのヒトカゲにイベントのロケーション背景 · リモートレイドパスは使用不可",
        "無料タイムチャレンジ: 8,042 XP · ほしのすな5,997 · ヒトカゲのアメ50 · プレミアムバトルパス1、ロケーション背景つきリザードンと遭遇(受取は11/7 20:00 KSTまで)",
        "野生: ガーディ・アチャモ・デルビル・シシコ・ニャビー(色違い確率↑)、ブースター(色違いあり)",
      ],
      "zh-TW": [
        "首爾世界盃競技場一帶 · 10/24（六）09:00~20:00（KST，現場攤位 09:00~14:00）",
        "一星團體戰小火龍具活動地點背景 · 不可使用遠距團體戰入場券",
        "免費限時調查：8,042 XP · 星塵 5,997 · 小火龍糖果 50 · 高級對戰入場券 1，並遇到具地點背景的噴火龍（領取至 11/7 20:00 KST）",
        "野外：卡蒂狗·火稚雞·戴魯比·小獅獅·火斑喵（異色機率↑）、火伊布（可能異色）",
      ],
    },
  },
];

export function manualExtra(eventID: string): ManualExtra | undefined {
  return EVENT_EXTRAS[eventID];
}
