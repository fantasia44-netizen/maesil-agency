// 전체 이벤트 달력(/gbl/events) 문구(3개국어). SDLabels 필드(pfx·evtType·months·evtNameMap·sfx*)를 포함해
// sdEvents.localizeEventName에 그대로 넘긴다. ScrapedDuck 피드 런타임 페치 → ISR 자동 갱신.
import type { SDLabels } from "../sdEvents";

type Seg = { t: string; b?: boolean };

export type EventsDict = SDLabels & {
  navBack: string;
  h1: string;
  intro: Seg[];
  loadFail: string;
  footerData: string; footerTierLink: string;
  // 섹션/필터
  liveH: string; upcomingH: string; emptyLive: string; emptyUpcoming: string;
  filterAll: string;
  // 상태/기간 라벨
  startsInDays: string; startsToday: string; endsInDays: string; endsToday: string; live: string;
  weekdays: string[];
  dateRange: string; dateSingle: string; timeRange: string;
  tagSpawns: string; tagResearch: string; detailLink: string;
  // 이번 주 이벤트 공유 카드
  shareBtn: string; saveBtn: string; building: string; shareCardTitle: string; shareCardWeek: string; shareFileTitle: string;
  // 알(부화) 섹션
  eggH: string; eggIntro: string; eggShiny: string; eggRegional: string; eggGift: string; eggAdventure: string;
  // 메타
  metaTitle: string; metaDesc: string; metaKeywords: string[]; ogTitle: string; ogDesc: string;
};

// 유형 필터에 노출할 순서(피드 eventType 기준)
export const FILTER_TYPES = ["community-day", "pokemon-spotlight-hour", "raid", "max", "event", "research"] as const;

const ko: EventsDict = {
  navBack: "← GBL Note",
  h1: "포켓몬 GO 이벤트 달력",
  intro: [
    { t: "이번 주 진행 중·예정 이벤트", b: true },
    { t: "를 한눈에. 커뮤니티 데이·스포트라이트 아워·레이드·맥스 배틀·부화 알까지 " },
    { t: "자동 업데이트", b: true },
    { t: "됩니다." },
  ],
  loadFail: "이벤트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
  footerData: "시간은 현지 기준 · 매시간 자동 업데이트 · ", footerTierLink: "레이드 스케줄 →",
  liveH: "🔴 진행 중", upcomingH: "📅 예정", emptyLive: "지금 진행 중인 이벤트가 없습니다.", emptyUpcoming: "예정된 이벤트가 없습니다.",
  filterAll: "전체",
  startsInDays: "{n}일 후 시작", startsToday: "오늘 시작", endsInDays: "{n}일 남음", endsToday: "오늘 종료", live: "진행 중",
  weekdays: ["일", "월", "화", "수", "목", "금", "토"],
  dateRange: "{m1}/{d1}({w1}) ~ {m2}/{d2}({w2})", dateSingle: "{m}/{d}({w})", timeRange: "{h1}:{mm1} ~ {h2}:{mm2}",
  tagSpawns: "출현↑", tagResearch: "리서치", detailLink: "상세",
  shareBtn: "📤 이번 주 이벤트 공유", saveBtn: "💾 저장", building: "생성 중…", shareCardTitle: "이번 주 포켓몬 GO 이벤트", shareCardWeek: "이번 주", shareFileTitle: "포켓몬고 이번 주 이벤트",
  eggH: "🥚 부화 알 (거리별)", eggIntro: "현재 알에서 부화하는 포켓몬입니다.", eggShiny: "이로치", eggRegional: "지역한정", eggGift: "선물", eggAdventure: "어드벤처싱크",
  // ── SDLabels (레이드 스케줄과 동일) ──
  pfx: { mega: "메가 ", shadow: "섀도우 ", alola: "알로라 ", galar: "가라르 ", hisui: "히스이 ", paldea: "팔데아 " },
  evtType: { "community-day": "커뮤니티 데이", "pokemon-spotlight-hour": "스포트라이트 아워", "max-mondays": "맥스 먼데이", "max-battles": "맥스 배틀 데이", "pokemon-go-fest": "GO 페스트", "event": "이벤트", "research": "리서치", "go-pass": "GO 패스", "raid-battles": "레이드", "raid-hour": "레이드 아워", "raid-day": "레이드 데이", "go-battle-league": "GO 배틀리그", "season": "시즌" },
  months: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
  dynamax: "다이맥스", evtClassic: "클래식",
  evtNameMap: {
    "LEGO Stores and Pokémon GO": "레고 스토어 & 포켓몬 GO",
    "Ultra Unlock: Water Festival": "울트라 언락: 워터 페스티벌",
    "PokémonXP & 2026 Worlds": "PokémonXP & 2026 세계대회",
    "Mega Ascension": "메가 어센션",
    "10th Anniversary Celebration - Perfect Mewtwo Timed Research": "10주년 기념 · 퍼펙트 뮤츠 타임 리서치",
    "Twitch Drops for 2026 Pokémon World Championships": "2026 세계대회 트위치 드롭스",
  },
  sfxSuperMega: "슈퍼 메가 레이드 데이", sfxMega: "메가 레이드 데이", sfxRaidHour: "레이드 아워", sfxRaidDay: "레이드 데이",
  metaTitle: "포켓몬고 이벤트 달력 · 커뮤니티데이·스포트라이트·부화알 | GBL Note",
  metaDesc: "포켓몬 GO 이벤트를 한눈에. 커뮤니티 데이·스포트라이트 아워·레이드·맥스 배틀·부화 알 일정을 진행 중/예정으로 자동 업데이트. 현지 시간 기준.",
  metaKeywords: ["포켓몬고 이벤트", "이벤트 일정", "커뮤니티 데이", "스포트라이트 아워", "부화 알", "포켓몬고 달력"],
  ogTitle: "포켓몬고 이벤트 달력", ogDesc: "커뮤니티데이·스포트라이트·레이드·부화알 자동 업데이트",
};

const en: EventsDict = {
  navBack: "← GBL Note",
  h1: "Pokémon GO Event Calendar",
  intro: [
    { t: "Live and upcoming events", b: true },
    { t: " at a glance — Community Days, Spotlight Hours, raids, Max Battles and egg hatches, " },
    { t: "updated automatically", b: true },
    { t: "." },
  ],
  loadFail: "Couldn't load events. Please try again shortly.",
  footerData: "Times are local · updated hourly · ", footerTierLink: "Raid schedule →",
  liveH: "🔴 Live now", upcomingH: "📅 Upcoming", emptyLive: "No events are live right now.", emptyUpcoming: "No upcoming events.",
  filterAll: "All",
  startsInDays: "in {n} days", startsToday: "starts today", endsInDays: "{n} days left", endsToday: "ends today", live: "Live",
  weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  dateRange: "{m1}/{d1} ({w1}) – {m2}/{d2} ({w2})", dateSingle: "{m}/{d} ({w})", timeRange: "{h1}:{mm1} – {h2}:{mm2}",
  tagSpawns: "Spawns", tagResearch: "Research", detailLink: "Details",
  shareBtn: "📤 Share this week", saveBtn: "💾 Save", building: "Generating…", shareCardTitle: "This Week in Pokémon GO", shareCardWeek: "This week", shareFileTitle: "Pokémon GO events this week",
  eggH: "🥚 Egg Hatches (by distance)", eggIntro: "Pokémon currently hatching from eggs.", eggShiny: "Shiny", eggRegional: "Regional", eggGift: "Gift", eggAdventure: "Adventure Sync",
  pfx: { mega: "Mega ", shadow: "Shadow ", alola: "Alolan ", galar: "Galarian ", hisui: "Hisuian ", paldea: "Paldean " },
  evtType: { "community-day": "Community Day", "pokemon-spotlight-hour": "Spotlight Hour", "max-mondays": "Max Monday", "max-battles": "Max Battle Day", "pokemon-go-fest": "GO Fest", "event": "Event", "research": "Research", "go-pass": "GO Pass", "raid-battles": "Raid", "raid-hour": "Raid Hour", "raid-day": "Raid Day", "go-battle-league": "GO Battle League", "season": "Season" },
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  dynamax: "Dynamax", evtClassic: "Classic",
  evtNameMap: {},
  sfxSuperMega: "Super Mega Raid Day", sfxMega: "Mega Raid Day", sfxRaidHour: "Raid Hour", sfxRaidDay: "Raid Day",
  metaTitle: "Pokémon GO Event Calendar · Community Day, Spotlight, Eggs | GBL Note",
  metaDesc: "All Pokémon GO events at a glance. Community Days, Spotlight Hours, raids, Max Battles and egg hatches — live and upcoming, updated automatically. Local time.",
  metaKeywords: ["pokemon go events", "event schedule", "community day", "spotlight hour", "egg hatches", "pokemon go calendar"],
  ogTitle: "Pokémon GO Event Calendar", ogDesc: "Community Day, Spotlight, raids & egg hatches — auto-updated",
};

const ja: EventsDict = {
  navBack: "← GBL Note",
  h1: "ポケモンGO イベントカレンダー",
  intro: [
    { t: "開催中・予定のイベント", b: true },
    { t: "を一目で。コミュニティ・デイ、スポットライトアワー、レイド、マックスバトル、タマゴ孵化まで" },
    { t: "自動更新", b: true },
    { t: "されます。" },
  ],
  loadFail: "イベントを読み込めませんでした。しばらくして再度お試しください。",
  footerData: "時間は現地基準 · 毎時自動更新 · ", footerTierLink: "レイドスケジュール →",
  liveH: "🔴 開催中", upcomingH: "📅 予定", emptyLive: "現在開催中のイベントはありません。", emptyUpcoming: "予定されたイベントはありません。",
  filterAll: "すべて",
  startsInDays: "{n}日後に開始", startsToday: "本日開始", endsInDays: "残り{n}日", endsToday: "本日終了", live: "開催中",
  weekdays: ["日", "月", "火", "水", "木", "金", "土"],
  dateRange: "{m1}/{d1}({w1}) 〜 {m2}/{d2}({w2})", dateSingle: "{m}/{d}({w})", timeRange: "{h1}:{mm1} 〜 {h2}:{mm2}",
  tagSpawns: "出現↑", tagResearch: "リサーチ", detailLink: "詳細",
  shareBtn: "📤 今週のイベントを共有", saveBtn: "💾 保存", building: "生成中…", shareCardTitle: "今週のポケモンGO イベント", shareCardWeek: "今週", shareFileTitle: "ポケモンGO 今週のイベント",
  eggH: "🥚 タマゴ孵化(距離別)", eggIntro: "現在タマゴから孵化するポケモンです。", eggShiny: "色違い", eggRegional: "地域限定", eggGift: "ギフト", eggAdventure: "アドベンチャーシンク",
  pfx: { mega: "メガ ", shadow: "シャドウ ", alola: "アローラ ", galar: "ガラル ", hisui: "ヒスイ ", paldea: "パルデア " },
  evtType: { "community-day": "コミュニティ・デイ", "pokemon-spotlight-hour": "スポットライトアワー", "max-mondays": "マックスマンデー", "max-battles": "マックスバトルデイ", "pokemon-go-fest": "GOフェス", "event": "イベント", "research": "リサーチ", "go-pass": "GOパス", "raid-battles": "レイド", "raid-hour": "レイドアワー", "raid-day": "レイドデイ", "go-battle-league": "GOバトルリーグ", "season": "シーズン" },
  months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  dynamax: "ダイマックス", evtClassic: "クラシック",
  evtNameMap: {
    "Ultra Unlock: Water Festival": "ウルトラアンロック: ウォーターフェスティバル",
    "Mega Ascension": "メガアセンション",
    "10th Anniversary Celebration - Perfect Mewtwo Timed Research": "10周年記念 · パーフェクトミュウツー タイムチャレンジ",
    "Twitch Drops for 2026 Pokémon World Championships": "2026 世界大会 Twitchドロップ",
  },
  sfxSuperMega: "スーパーメガレイドデイ", sfxMega: "メガレイドデイ", sfxRaidHour: "レイドアワー", sfxRaidDay: "レイドデイ",
  metaTitle: "ポケモンGO イベントカレンダー · コミュデイ・スポットライト・タマゴ | GBL Note",
  metaDesc: "ポケモンGOのイベントを一目で。コミュニティ・デイ、スポットライトアワー、レイド、マックスバトル、タマゴ孵化を開催中/予定で自動更新。現地時間基準。",
  metaKeywords: ["ポケモンGO イベント", "イベント日程", "コミュニティデイ", "スポットライトアワー", "タマゴ孵化", "ポケモンGO カレンダー"],
  ogTitle: "ポケモンGO イベントカレンダー", ogDesc: "コミュデイ・スポットライト・レイド・タマゴ孵化を自動更新",
};

const zhTW: EventsDict = {
  navBack: "← GBL Note",
  h1: "寶可夢 GO 活動行事曆",
  intro: [
    { t: "本週進行中·預定活動", b: true },
    { t: " 一目瞭然。社群日·聚焦時刻·團體戰·極巨戰·孵蛋 " },
    { t: "自動更新", b: true },
    { t: "。" },
  ],
  loadFail: "無法載入活動。請稍後再試。",
  footerData: "時間為當地時間 · 每小時自動更新 · ", footerTierLink: "團體戰時程 →",
  liveH: "🔴 進行中", upcomingH: "📅 預定", emptyLive: "目前沒有進行中的活動。", emptyUpcoming: "沒有預定的活動。",
  filterAll: "全部",
  startsInDays: "{n}天後開始", startsToday: "今天開始", endsInDays: "剩 {n}天", endsToday: "今天結束", live: "進行中",
  weekdays: ["日", "一", "二", "三", "四", "五", "六"],
  dateRange: "{m1}/{d1}（{w1}）~ {m2}/{d2}（{w2}）", dateSingle: "{m}/{d}（{w}）", timeRange: "{h1}:{mm1} ~ {h2}:{mm2}",
  tagSpawns: "出現↑", tagResearch: "研究", detailLink: "詳細",
  shareBtn: "📤 分享本週活動", saveBtn: "💾 儲存", building: "產生中…", shareCardTitle: "本週寶可夢 GO 活動", shareCardWeek: "本週", shareFileTitle: "寶可夢GO 本週活動",
  eggH: "🥚 孵化蛋（依距離）", eggIntro: "目前從蛋孵化的寶可夢。", eggShiny: "異色", eggRegional: "地區限定", eggGift: "禮物", eggAdventure: "冒險同步",
  pfx: { mega: "超級", shadow: "暗影", alola: "阿羅拉", galar: "伽勒爾", hisui: "洗翠", paldea: "帕底亞" },
  evtType: { "community-day": "社群日", "pokemon-spotlight-hour": "聚焦時刻", "max-mondays": "極巨星期一", "max-battles": "極巨戰日", "pokemon-go-fest": "GO Fest", "event": "活動", "research": "研究", "go-pass": "GO Pass", "raid-battles": "團體戰", "raid-hour": "團體戰時刻", "raid-day": "團體戰日", "go-battle-league": "GO 對戰聯盟", "season": "賽季" },
  months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  dynamax: "極巨化", evtClassic: "經典",
  evtNameMap: {},
  sfxSuperMega: "超級進化團體戰日", sfxMega: "超級團體戰日", sfxRaidHour: "團體戰時刻", sfxRaidDay: "團體戰日",
  metaTitle: "寶可夢GO 活動行事曆 · 社群日·聚焦時刻·孵蛋 | GBL Note",
  metaDesc: "寶可夢 GO 活動一目瞭然。社群日·聚焦時刻·團體戰·極巨戰·孵蛋時程以進行中/預定自動更新。當地時間為準。",
  metaKeywords: ["寶可夢GO 活動", "活動時程", "社群日", "聚焦時刻", "孵化蛋", "寶可夢GO 行事曆"],
  ogTitle: "寶可夢GO 活動行事曆", ogDesc: "社群日·聚焦時刻·團體戰·孵蛋自動更新",
};

const E = { ko, en, ja, "zh-TW": zhTW } as const;
export function getEvents(lang: string): EventsDict {
  return (E as Record<string, EventsDict>)[lang] || ko;
}
