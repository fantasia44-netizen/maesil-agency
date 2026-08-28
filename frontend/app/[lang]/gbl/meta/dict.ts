// 실측 메타 허브(클라이언트) 문구(3개국어).
export type MetaHubDict = {
  navRaid: string; navRecord: string;
  h1: string; intro: string;
  p7: string; p30: string; season: string; all: string;
  loading: string; empty: string;
  monTop: string; deckTop: string; monTab: string; deckTab: string; deckNote: string;
  shadowWord: string; prev: string; next: string;
  detailH: string; detailSuffix: string; tierTable: string; guide: string;
  about: string; contact: string; privacy: string;
};

const ko: MetaHubDict = {
  navRaid: "🔥 레이드 딜러", navRecord: "📝 내 기록 →",
  h1: "실측 GBL 메타", intro: "시뮬레이션이 아닌, 유저들이 {b}실제로 만난 상대{/b} 데이터 집계. 지금 리그에서 뭘 제일 많이 만나는지.",
  p7: "최근 7일", p30: "최근 30일", season: "시즌27 (새로운 발걸음)", all: "전체",
  loading: "불러오는 중…", empty: "이 조건의 집계 데이터가 아직 부족합니다. 기록이 쌓이면 채워집니다.",
  monTop: "🔥 포켓몬 픽업률 TOP", deckTop: "🏆 덱 픽업률 TOP", monTab: "🔥 포켓몬 픽업률", deckTab: "🏆 덱 픽업률",
  deckNote: "전체 대전 중 이 덱(파티)을 만난 비율",
  shadowWord: "그림자 ", prev: "← 이전", next: "다음 →",
  detailH: "리그별 상세 페이지", detailSuffix: "리그 실측", tierTable: "티어표", guide: "📖 GBL 가이드",
  about: "소개", contact: "문의", privacy: "개인정보처리방침",
};

const en: MetaHubDict = {
  navRaid: "🔥 Raid attackers", navRecord: "📝 My log →",
  h1: "Live GBL Meta", intro: "Not simulation — aggregated data of opponents players {b}actually faced{/b}. What you meet most in the current league.",
  p7: "Last 7 days", p30: "Last 30 days", season: "Season 27", all: "All",
  loading: "Loading…", empty: "Not enough aggregated data for this filter yet. It fills in as logs accumulate.",
  monTop: "🔥 Top Pokémon encountered", deckTop: "🏆 Top decks encountered", monTab: "🔥 Pokémon rate", deckTab: "🏆 Deck rate",
  deckNote: "Share of all battles this deck (team) was met in",
  shadowWord: "Shadow ", prev: "← Prev", next: "Next →",
  detailH: "Per-league detail pages", detailSuffix: " League meta", tierTable: "Tier list", guide: "📖 GBL guides",
  about: "About", contact: "Contact", privacy: "Privacy Policy",
};

const ja: MetaHubDict = {
  navRaid: "🔥 レイドアタッカー", navRecord: "📝 自分の記録 →",
  h1: "実測GBLメタ", intro: "シミュではなく、プレイヤーが{b}実際に遭遇した相手{/b}のデータ集計。今のリーグで一番よく会う相手は。",
  p7: "直近7日", p30: "直近30日", season: "シーズン27", all: "全体",
  loading: "読み込み中…", empty: "この条件の集計データはまだ不足しています。記録が貯まると反映されます。",
  monTop: "🔥 遭遇ポケモンTOP", deckTop: "🏆 遭遇デッキTOP", monTab: "🔥 ポケモン遭遇率", deckTab: "🏆 デッキ遭遇率",
  deckNote: "全対戦中このデッキ(パーティ)に遭遇した割合",
  shadowWord: "シャドウ ", prev: "← 前へ", next: "次へ →",
  detailH: "リーグ別詳細ページ", detailSuffix: "リーグ実測", tierTable: "ティア表", guide: "📖 GBLガイド",
  about: "紹介", contact: "問い合わせ", privacy: "プライバシーポリシー",
};

const zhTW: MetaHubDict = {
  navRaid: "🔥 團體戰攻擊手", navRecord: "📝 我的記錄 →",
  h1: "實測 GBL 環境", intro: "不是模擬，而是玩家{b}實際遇到的對手{/b}資料統計。現在聯盟最常遇到什麼。",
  p7: "近 7 天", p30: "近 30 天", season: "第27賽季（嶄新的一步）", all: "全部",
  loading: "載入中…", empty: "此條件的統計資料還不足。記錄累積後會補上。",
  monTop: "🔥 寶可夢使用率 TOP", deckTop: "🏆 隊伍使用率 TOP", monTab: "🔥 寶可夢使用率", deckTab: "🏆 隊伍使用率",
  deckNote: "所有對戰中遇到此隊伍（隊組）的比例",
  shadowWord: "暗影 ", prev: "← 上一頁", next: "下一頁 →",
  detailH: "各聯盟詳細頁", detailSuffix: "聯盟實測", tierTable: "強度表", guide: "📖 GBL 攻略",
  about: "關於", contact: "聯絡", privacy: "隱私權政策",
};

const M = { ko, en, ja, "zh-TW": zhTW } as const;
export function getMetaHub(lang: string): MetaHubDict {
  return (M as Record<string, MetaHubDict>)[lang] || ko;
}
