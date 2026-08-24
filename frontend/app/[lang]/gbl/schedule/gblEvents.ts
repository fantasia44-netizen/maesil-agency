// GBL 이벤트·보너스(시즌 스케줄에 표시). 레이드 이벤트와 별개 — 배틀리그 관련 보너스(배틀세트 증가·IV하한 완화·진화 특별기술).
// 시즌마다 수동 갱신(공식 일정). 날짜는 KST 기준. 출처: pokemongo.com 공식 뉴스.
type L = { ko: string; en: string; ja: string };

export type GblEventMove = {
  dex: string;          // 스프라이트용 도감번호(폼은 이름으로 자동보정)
  nameKo: string;       // 폼 판별용 원문(예 "고지(알로라의 모습)")
  mon: L;               // 몬 이름(로케일)
  move: L;              // 특별기술 이름(로케일)
  pvp?: boolean;        // PvP 메타 하이라이트
};

export type GblEvent = {
  start: string; end: string;        // GBL 아레나 보너스 기간(ISO, KST)
  icon: string;
  title: L;
  period: L;                          // 사람이 읽는 기간 라벨
  official?: string;                  // 공식 페이지 링크(출처)
  bonuses: L[];
  movesTitle?: L;
  movesNote?: L;                      // 획득 방법 안내
  moves?: GblEventMove[];
};

export const GBL_EVENTS: GblEvent[] = [
  {
    start: "2026-08-24T00:00:00+09:00",  // 팝업 트리거는 하루 먼저(표시 기간 라벨은 8/25~8/31 유지)
    end: "2026-08-31T23:59:00+09:00",
    icon: "🏆",
    title: {
      ko: "포켓몬 월드 챔피언십 2026",
      en: "Pokémon World Championships 2026",
      ja: "ポケモンワールドチャンピオンシップス2026",
    },
    period: {
      ko: "8/25 ~ 8/31 (GBL 보너스)",
      en: "Aug 25 – Aug 31 (GBL bonuses)",
      ja: "8/25 ~ 8/31 (GBLボーナス)",
    },
    official: "https://pokemongo.com/ko/news/world-championships-event-2026",
    bonuses: [
      {
        ko: "하루 배틀세트 5→15세트 (최대 75전)",
        en: "Daily battle sets 5 → 15 (up to 75 battles)",
        ja: "1日のバトルセット5→15 (最大75戦)",
      },
      {
        ko: "「GO 배틀리그」 리워드로 잡은 포켓몬의 공격, 방어, HP는 폭넓게 변화합니다",
        en: "Attack, Defense, and HP of Pokémon caught from GO Battle League rewards will be widely varied",
        ja: "「GOバトルリーグ」のリワードで捕まえたポケモンのこうげき、ぼうぎょ、HPは幅広く変化します",
      },
    ],
    movesTitle: {
      ko: "진화 특별기술 {n}개 (18마리)",
      en: "{n} exclusive evolution moves",
      ja: "進化限定の特別技{n}種",
    },
    movesNote: {
      ko: "이벤트 기간 중 진화 시 특별기술 습득 — PvP 필수 기술 다수",
      en: "Evolve during the event to learn these exclusive moves — many are PvP staples",
      ja: "イベント期間中に進化で特別技を習得 — PvP必須技も多数",
    },
    moves: [
      { dex: "28",  nameKo: "고지(알로라의 모습)", mon: { ko: "고지(알로라)", en: "Alolan Sandslash", ja: "アローラサンドパン" }, move: { ko: "섀도클로", en: "Shadow Claw", ja: "シャドークロー" }, pvp: true },
      { dex: "160", nameKo: "장크로다일",         mon: { ko: "장크로다일", en: "Feraligatr", ja: "オーダイル" },       move: { ko: "하이드로캐논", en: "Hydro Cannon", ja: "ハイドロカノン" }, pvp: true },
      { dex: "282", nameKo: "가디안",             mon: { ko: "가디안", en: "Gardevoir", ja: "サーナイト" },           move: { ko: "싱크로노이즈", en: "Synchronoise", ja: "シンクロノイズ" }, pvp: true },
      { dex: "475", nameKo: "엘레이드",           mon: { ko: "엘레이드", en: "Gallade", ja: "エルレイド" },           move: { ko: "싱크로노이즈", en: "Synchronoise", ja: "シンクロノイズ" }, pvp: true },
      { dex: "468", nameKo: "토게키스",           mon: { ko: "토게키스", en: "Togekiss", ja: "トゲキッス" },         move: { ko: "파동탄", en: "Aura Sphere", ja: "はどうだん" }, pvp: true },
      { dex: "376", nameKo: "메타그로스",         mon: { ko: "메타그로스", en: "Metagross", ja: "メタグロス" },       move: { ko: "코멧펀치", en: "Meteor Mash", ja: "コメットパンチ" }, pvp: true },
      { dex: "635", nameKo: "삼삼드래",           mon: { ko: "삼삼드래", en: "Hydreigon", ja: "サザンドラ" },         move: { ko: "세차게휘두르기", en: "Brutal Swing", ja: "ぶんまわす" }, pvp: true },
      { dex: "979", nameKo: "저승갓숭",           mon: { ko: "저승갓숭", en: "Annihilape", ja: "コノヨザル" },       move: { ko: "분노의주먹", en: "Rage Fist", ja: "ふんどのこぶし" }, pvp: true },
      { dex: "658", nameKo: "개굴닌자",           mon: { ko: "개굴닌자", en: "Greninja", ja: "ゲッコウガ" },         move: { ko: "하이드로캐논", en: "Hydro Cannon", ja: "ハイドロカノン" }, pvp: true },
      { dex: "365", nameKo: "씨카이저",           mon: { ko: "씨카이저", en: "Walrein", ja: "トドゼルガ" },           move: { ko: "고드름침", en: "Icicle Spear", ja: "つららばり" }, pvp: true },
      { dex: "57",  nameKo: "성원숭",             mon: { ko: "성원숭", en: "Primeape", ja: "オコリザル" },           move: { ko: "분노의주먹", en: "Rage Fist", ja: "ふんどのこぶし" } },
      { dex: "365", nameKo: "씨카이저",           mon: { ko: "씨카이저", en: "Walrein", ja: "トドゼルガ" },           move: { ko: "눈싸라기", en: "Powder Snow", ja: "こなゆき" } },
      { dex: "108", nameKo: "내루미",             mon: { ko: "내루미", en: "Lickitung", ja: "ベロリンガ" },           move: { ko: "누르기", en: "Body Slam", ja: "のしかかり" } },
      { dex: "463", nameKo: "내룸벨트",           mon: { ko: "내룸벨트", en: "Lickilicky", ja: "ベロベルト" },       move: { ko: "누르기", en: "Body Slam", ja: "のしかかり" } },
      { dex: "195", nameKo: "누오",               mon: { ko: "누오", en: "Quagsire", ja: "ヌオー" },                 move: { ko: "아쿠아테일", en: "Aqua Tail", ja: "アクアテール" } },
      { dex: "724", nameKo: "모크나이퍼",         mon: { ko: "모크나이퍼", en: "Decidueye", ja: "ジュナイパー" },     move: { ko: "하드플랜트", en: "Frenzy Plant", ja: "ハードプラント" } },
      { dex: "727", nameKo: "어흥염",             mon: { ko: "어흥염", en: "Incineroar", ja: "ガオガエン" },         move: { ko: "블라스트번", en: "Blast Burn", ja: "ブラストバーン" } },
      { dex: "818", nameKo: "인텔리레온",         mon: { ko: "인텔리레온", en: "Inteleon", ja: "インテレオン" },       move: { ko: "하이드로캐논", en: "Hydro Cannon", ja: "ハイドロカノン" } },
      { dex: "823", nameKo: "아머까오",           mon: { ko: "아머까오", en: "Corviknight", ja: "アーマーガア" },     move: { ko: "에어커터", en: "Air Cutter", ja: "エアカッター" } },
    ],
  },
];
