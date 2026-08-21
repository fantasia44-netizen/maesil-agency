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
  endsInPre: string; daysUnit: string; endedWord: string; seasonProgressLabel: string; capWord: string; tzNote: string;
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
  endsInPre: "종료까지 ", daysUnit: "일", endedWord: "종료됨", seasonProgressLabel: "시즌 진행", capWord: "CP", tzNote: "🕐 KST · UTC+9 기준",
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
  endsInPre: "Ends in ", daysUnit: " days", endedWord: "Ended", seasonProgressLabel: "Season progress", capWord: "CP", tzNote: "🕐 Times shown in KST (UTC+9)",
  cupLabels: {
    "스크롤컵 (슈퍼리그)": "Scroll Cup (Great League)",
  },
  notes: {
    "배틀 승리 시 별의모래 4배 (세트 종료 리워드 제외)": "4× Stardust on battle wins (excludes set completion rewards)",
    "별의모래 4배 (세트 종료 리워드 제외)": "4× Stardust (excludes set completion rewards)",
  },
  metaTitle: "Pokémon GO GBL Season Schedule · League Rotation | GBL Note",
  metaDesc: "Pokémon GO Battle League (GBL) Season {num} '{name}' league rotation schedule. See this week's Great, Ultra and Master Leagues plus cups (Scroll Cup and more) at a glance.",
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
  endsInPre: "終了まで", daysUnit: "日", endedWord: "終了", seasonProgressLabel: "シーズン進行", capWord: "CP", tzNote: "🕐 KST · UTC+9 基準",
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

const S = { ko, en, ja } as const;
export function getSchedule(lang: string): ScheduleDict {
  return (S as Record<string, ScheduleDict>)[lang] || ko;
}
