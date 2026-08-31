// GBL 시즌 스케줄표(서버렌더 SEO) 문구(3개국어). {num}=시즌 번호, {name}=시즌명은 렌더에서 치환.
export type ScheduleDict = {
  navMeta: string;
  h1: string;
  seasonWord: string; seasonName: string;
  introA: string; introB: string; introC: string;
  thisWeekHeading: string;
  rotationH2: string;
  statusLive: string; statusSoon: string; statusPast: string;
  cpNote1: string; metaLinkText: string; cpNote2: string; tierLinkText: string; cpNote3: string; cpGuideLink: string;
  footerGuide: string; footerPrivacy: string;
  megaSuffix: string;
  eventsH2: string; evLive: string; evSoon: string; evEnded: string; evSource: string; evShare: string;
  endsInPre: string; daysUnit: string; endedWord: string; seasonProgressLabel: string; capWord: string; tzNote: string;
  nextSeasonBadge: string; nextSeasonName: string; startsInPre: string; nextSeasonChangesLabel: string; nextSeasonChanges: string;
  cupLabels: Record<string, string>;
  notes: Record<string, string>;
  metaTitle: string; metaDesc: string; metaKeywords: string[]; ogTitle: string; ogDesc: string;
};

const ko: ScheduleDict = {
  navMeta: "📊 실측 메타",
  h1: "포켓몬고 GBL 시즌 일정",
  seasonWord: "시즌", seasonName: "새로운 발걸음",
  introA: " 배틀리그 로테이션 일정입니다. GBL은 슈퍼·하이퍼·마스터리그와 주간 컵이 ",
  introB: "주차별로 로테이션", introC: "됩니다.",
  thisWeekHeading: "이번 주 열리는 리그 · ",
  rotationH2: "리그 로테이션 일정",
  statusLive: "이번 주", statusSoon: "예정", statusPast: "종료",
  cpNote1: "리그마다 CP 제한이 다릅니다(슈퍼 1500 · 하이퍼 2500 · 마스터 제한없음). 컵은 특정 타입만 참가할 수 있는 경우가 많습니다. 지금 리그에서 뭘 많이 만나는지는 ",
  metaLinkText: "실측 메타",
  cpNote2: ", 강한 포켓몬은 ",
  tierLinkText: "티어표",
  cpNote3: "에서 확인하세요. ",
  cpGuideLink: "리그별 CP 제한 가이드 →",
  footerGuide: "가이드", footerPrivacy: "개인정보처리방침",
  megaSuffix: ": 메가",
  eventsH2: "GBL 이벤트 · 보너스", evLive: "진행 중", evSoon: "예정", evEnded: "종료", evSource: "공식 출처", evShare: "공유/다운로드",
  endsInPre: "종료까지 ", daysUnit: "일", endedWord: "종료됨", seasonProgressLabel: "시즌 진행", capWord: "CP", tzNote: "🕐 KST · UTC+9 기준",
  nextSeasonBadge: "다음 시즌", nextSeasonName: "황혼의 여정", startsInPre: "시작까지 ",
  nextSeasonChangesLabel: "다음 시즌 예고", nextSeasonChanges: "기술 리밸런스 · 신규 기술 다수 (라이츄 볼트태클 등)",
  cupLabels: {
    "스크롤컵 (슈퍼리그)": "스크롤컵 (슈퍼리그)",
  },
  notes: {
    "배틀 승리 시 별의모래 4배 (세트 종료 리워드 제외)": "배틀 승리 시 별의모래 4배 (세트 종료 리워드 제외)",
    "별의모래 4배 (세트 종료 리워드 제외)": "별의모래 4배 (세트 종료 리워드 제외)",
  },
  metaTitle: "포켓몬고 GBL 시즌 일정 · 리그 로테이션 | GBL Note",
  metaDesc: "포켓몬 GO 배틀리그(GBL) 시즌{num} '{name}' 리그 로테이션 일정. 이번 주 열리는 슈퍼·하이퍼·마스터리그와 컵(스크롤컵 등) 스케줄을 한눈에.",
  metaKeywords: ["포켓몬고 GBL 일정", "배틀리그 로테이션", "이번주 GBL 리그", "GBL 컵 일정", "시즌{num}"],
  ogTitle: "포켓몬고 GBL 시즌{num} 리그 로테이션 일정",
  ogDesc: "이번 주 열리는 리그·컵 스케줄",
};

const en: ScheduleDict = {
  navMeta: "📊 Live meta",
  h1: "Pokémon GO GBL Season Schedule",
  seasonWord: "Season ", seasonName: "New Beginnings",
  introA: " battle league rotation schedule. In GBL, the Great, Ultra and Master Leagues and weekly cups ",
  introB: "rotate week by week", introC: ".",
  thisWeekHeading: "Leagues open this week · ",
  rotationH2: "League rotation schedule",
  statusLive: "This week", statusSoon: "Upcoming", statusPast: "Ended",
  cpNote1: "Each league has a different CP cap (Great 1500 · Ultra 2500 · Master no cap). Cups often only allow certain types. To see what you meet most in the current league, check the ",
  metaLinkText: "live meta",
  cpNote2: ", and for the strongest Pokémon see the ",
  tierLinkText: "tier list",
  cpNote3: ". ",
  cpGuideLink: "League CP cap guide →",
  footerGuide: "Guides", footerPrivacy: "Privacy Policy",
  megaSuffix: ": Mega",
  eventsH2: "GBL events & bonuses", evLive: "Live now", evSoon: "Upcoming", evEnded: "Ended", evSource: "Official source", evShare: "Share/Save",
  endsInPre: "Ends in ", daysUnit: " days", endedWord: "Ended", seasonProgressLabel: "Season progress", capWord: "CP", tzNote: "🕐 Times shown in KST (UTC+9)",
  nextSeasonBadge: "Next season", nextSeasonName: "Twilight Trails", startsInPre: "Starts in ",
  nextSeasonChangesLabel: "What's coming", nextSeasonChanges: "Move rebalance · several new moves (Raichu Volt Tackle, etc.)",
  cupLabels: {
    "스크롤컵 (슈퍼리그)": "Scroll Cup (Great League)",
  },
  notes: {
    "배틀 승리 시 별의모래 4배 (세트 종료 리워드 제외)": "4× Stardust on battle wins (excludes set completion rewards)",
    "별의모래 4배 (세트 종료 리워드 제외)": "4× Stardust (excludes set completion rewards)",
  },
  metaTitle: "Pokémon GO GBL Season Schedule · League Rotation | GBL Note",
  metaDesc: "Pokémon GO Battle League (GBL) Season {num} '{name}' league rotation schedule. See this week's Great, Ultra and Master Leagues plus cups.",
  metaKeywords: ["Pokémon GO GBL schedule", "battle league rotation", "GBL leagues this week", "GBL cup schedule", "Season {num}"],
  ogTitle: "Pokémon GO GBL Season {num} league rotation schedule",
  ogDesc: "Leagues and cups open this week",
};

const ja: ScheduleDict = {
  navMeta: "📊 実測メタ",
  h1: "ポケモンGO GBL シーズン日程",
  seasonWord: "シーズン", seasonName: "新たな一歩",
  introA: "のバトルリーグ・ローテーション日程です。GBLはスーパー・ハイパー・マスターリーグと週替わりカップが",
  introB: "週ごとにローテーション", introC: "します。",
  thisWeekHeading: "今週開催のリーグ · ",
  rotationH2: "リーグ・ローテーション日程",
  statusLive: "今週", statusSoon: "予定", statusPast: "終了",
  cpNote1: "リーグごとにCP制限が異なります(スーパー1500 · ハイパー2500 · マスター制限なし)。カップは特定タイプのみ参加できることが多いです。今のリーグで何によく会うかは",
  metaLinkText: "実測メタ",
  cpNote2: "、強いポケモンは",
  tierLinkText: "ティア表",
  cpNote3: "で確認してください。",
  cpGuideLink: "リーグ別CP制限ガイド →",
  footerGuide: "ガイド", footerPrivacy: "プライバシーポリシー",
  megaSuffix: ": メガ",
  eventsH2: "GBLイベント・ボーナス", evLive: "開催中", evSoon: "予定", evEnded: "終了", evSource: "公式ソース", evShare: "共有/保存",
  endsInPre: "終了まで", daysUnit: "日", endedWord: "終了", seasonProgressLabel: "シーズン進行", capWord: "CP", tzNote: "🕐 KST · UTC+9 基準",
  nextSeasonBadge: "次シーズン", nextSeasonName: "黄昏の旅路", startsInPre: "開始まで",
  nextSeasonChangesLabel: "次シーズン予告", nextSeasonChanges: "技のリバランス · 新規技追加 (ライチュウ ボルテッカー等)",
  cupLabels: {
    "스크롤컵 (슈퍼리그)": "スクロールカップ（スーパーリーグ）",
  },
  notes: {
    "배틀 승리 시 별의모래 4배 (세트 종료 리워드 제외)": "対戦勝利でほしのすな4倍（セット終了報酬は除く）",
    "별의모래 4배 (세트 종료 리워드 제외)": "ほしのすな4倍（セット終了報酬は除く）",
  },
  metaTitle: "ポケモンGO GBL シーズン日程 · リーグローテーション | GBL Note",
  metaDesc: "ポケモンGOバトルリーグ(GBL) シーズン{num}「{name}」のリーグローテーション日程。今週開催のスーパー・ハイパー・マスターリーグとカップ(スクロールカップ等)の日程をひと目で。",
  metaKeywords: ["ポケモンGO GBL 日程", "バトルリーグ ローテーション", "今週のGBLリーグ", "GBLカップ日程", "シーズン{num}"],
  ogTitle: "ポケモンGO GBL シーズン{num} リーグローテーション日程",
  ogDesc: "今週開催のリーグ・カップ日程",
};

const zhTW: ScheduleDict = {
  navMeta: "📊 實測環境",
  h1: "寶可夢GO GBL 賽季時程",
  seasonWord: "賽季", seasonName: "嶄新的一步",
  introA: " 對戰聯盟輪替時程。GBL 的超級·高級·大師聯盟與每週盃賽會 ",
  introB: "依週輪替", introC: "。",
  thisWeekHeading: "本週開放的聯盟 · ",
  rotationH2: "聯盟輪替時程",
  statusLive: "本週", statusSoon: "預定", statusPast: "結束",
  cpNote1: "每個聯盟 CP 限制不同（超級 1500 · 高級 2500 · 大師無限制）。盃賽常只限特定屬性參加。現在聯盟最常遇到什麼可看 ",
  metaLinkText: "實測環境",
  cpNote2: "，強勢寶可夢看 ",
  tierLinkText: "強度表",
  cpNote3: "。 ",
  cpGuideLink: "各聯盟 CP 限制指南 →",
  footerGuide: "攻略", footerPrivacy: "隱私權政策",
  megaSuffix: "：超級",
  eventsH2: "GBL 活動 · 獎勵", evLive: "進行中", evSoon: "預定", evEnded: "結束", evSource: "官方來源", evShare: "分享/下載",
  endsInPre: "距結束 ", daysUnit: "天", endedWord: "已結束", seasonProgressLabel: "賽季進度", capWord: "CP", tzNote: "🕐 KST · UTC+9 為準",
  nextSeasonBadge: "下個賽季", nextSeasonName: "黃昏旅途", startsInPre: "距開始 ",
  nextSeasonChangesLabel: "下賽季預告", nextSeasonChanges: "招式重新平衡 · 新增多個招式（雷丘 伏特攻擊等）",
  cupLabels: {
    "스크롤컵 (슈퍼리그)": "捲軸盃（超級聯盟）",
  },
  notes: {
    "배틀 승리 시 별의모래 4배 (세트 종료 리워드 제외)": "對戰勝利時星星沙子4倍（不含賽組結束獎勵）",
    "별의모래 4배 (세트 종료 리워드 제외)": "星星沙子4倍（不含賽組結束獎勵）",
  },
  metaTitle: "寶可夢GO GBL 賽季時程 · 聯盟輪替 | GBL Note",
  metaDesc: "寶可夢 GO 對戰聯盟(GBL) 第{num}賽季『{name}』聯盟輪替時程。本週開放的超級·高級·大師聯盟與盃賽（捲軸盃等）時程一目瞭然。",
  metaKeywords: ["寶可夢GO GBL 時程", "對戰聯盟輪替", "本週 GBL 聯盟", "GBL 盃賽時程", "第{num}賽季"],
  ogTitle: "寶可夢GO GBL 第{num}賽季 聯盟輪替時程",
  ogDesc: "本週開放的聯盟·盃賽時程",
};

const S = { ko, en, ja, "zh-TW": zhTW } as const;
export function getSchedule(lang: string): ScheduleDict {
  return (S as Record<string, ScheduleDict>)[lang] || ko;
}
