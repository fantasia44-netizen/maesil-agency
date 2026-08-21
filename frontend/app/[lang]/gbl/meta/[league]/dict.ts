// 리그별 실측 메타(서버렌더 SEO) 문구(3개국어). {lg}=리그명은 렌더에서 치환.
export type LeagueMetaDict = {
  navRaid: string; navRecord: string; chipSuffix: string;
  h1: string; intro1a: string; intro1b: string; intro1c: string; intro2a: string; intro2b: string;
  interactiveNote1: string; interactiveLink: string; interactiveNote2: string;
  tierLink: string;
  empty: string; monTopH: string; deckTopH: string; deckNote: string; shadowWord: string;
  aboutH: string; aboutBody: string; aboutCta: string; privacy: string;
  metaTitle: string; metaDesc: string; ogTitle: string; ogDesc: string;
};

const ko: LeagueMetaDict = {
  navRaid: "🔥 레이드 딜러", navRecord: "📝 내 기록 →", chipSuffix: "리그",
  h1: "포켓몬고 {lg} 실측 픽률 · 인기 덱",
  intro1a: "시뮬레이션이 아닌, 유저들이 ", intro1b: "실제로 만난 상대", intro1c: "를 집계한 {lg}(GBL) 실전 메타입니다.",
  intro2a: "지금 {lg}에서 어떤 포켓몬과 덱(파티)을 가장 많이 만나는지 ", intro2b: "실측 픽률로 확인하세요. 최근 30일 기준.",
  interactiveNote1: "기간·시즌 컵 필터는 ", interactiveLink: "인터랙티브 메타", interactiveNote2: "에서 볼 수 있습니다.",
  tierLink: "{lg} 티어표 · 추천 기술배치 보기 →",
  empty: "집계 데이터가 아직 준비 중입니다. 기록이 쌓이면 채워집니다.",
  monTopH: "🔥 {lg} 포켓몬 실측 픽률 TOP", deckTopH: "🏆 {lg} 인기 덱(파티) 픽률 TOP",
  deckNote: "전체 대전 중 이 덱(파티)을 만난 비율", shadowWord: "그림자 ",
  aboutH: "GBL Note란?",
  aboutBody: "GBL Note는 포켓몬 GO 배틀리그(GBL)에서 만난 상대를 기록하고, 다시 만나면 상대의 과거 파티·기술을 5초 안에 확인하는 도구입니다. 여기 실측 메타는 사용자들의 기록을 개인정보를 제거한 익명 통계로 집계한 것으로, 실제로 유행하는 {lg} 조합을 반영합니다.",
  aboutCta: "무료로 시작하기 →", privacy: "개인정보처리방침",
  metaTitle: "포켓몬고 {lg} 실측 픽률 · 인기 덱 TOP | GBL Note",
  metaDesc: "포켓몬 GO {lg}(GBL)에서 유저들이 실제로 만난 상대 기반 실측 픽률과 인기 덱 순위. 시뮬레이션이 아닌 실전 데이터, 최근 30일 기준으로 지금 뭘 제일 많이 만나는지 확인하세요.",
  ogTitle: "포켓몬고 {lg} 실측 메타 — 실전 픽률·인기 덱 TOP", ogDesc: "유저 실측 기반 {lg} 픽률·덱 순위 (최근 30일)",
};

const en: LeagueMetaDict = {
  navRaid: "🔥 Raid attackers", navRecord: "📝 My log →", chipSuffix: "",
  h1: "Pokémon GO {lg} Live Pick Rates · Popular Decks",
  intro1a: "Not simulation — this is the live {lg} (GBL) meta aggregated from opponents players ", intro1b: "actually faced", intro1c: ".",
  intro2a: "See which Pokémon and decks (teams) you meet most in {lg} right now, by ", intro2b: "live pick rate. Last 30 days.",
  interactiveNote1: "Period and seasonal cup filters are on the ", interactiveLink: "interactive meta", interactiveNote2: " page.",
  tierLink: "{lg} tier list · recommended movesets →",
  empty: "Aggregated data is still building. It fills in as logs accumulate.",
  monTopH: "🔥 {lg} — Top Pokémon by live pick rate", deckTopH: "🏆 {lg} — Top decks (teams) by pick rate",
  deckNote: "Share of all battles this deck (team) was met in", shadowWord: "Shadow ",
  aboutH: "What is GBL Note?",
  aboutBody: "GBL Note lets you log opponents you meet in Pokémon GO Battle League (GBL), so when you face them again you can check their past team and moves in 5 seconds. This live meta aggregates user logs into anonymized statistics with personal data removed, reflecting the {lg} teams actually trending.",
  aboutCta: "Start for free →", privacy: "Privacy Policy",
  metaTitle: "Pokémon GO {lg} Live Pick Rates · Top Decks | GBL Note",
  metaDesc: "Live pick rates and popular deck rankings for Pokémon GO {lg} (GBL), based on opponents players actually faced. Real battle data, not simulation — see what you meet most, last 30 days.",
  ogTitle: "Pokémon GO {lg} Live Meta — Pick Rates & Top Decks", ogDesc: "User-sourced {lg} pick rates & deck rankings (last 30 days)",
};

const ja: LeagueMetaDict = {
  navRaid: "🔥 レイドアタッカー", navRecord: "📝 自分の記録 →", chipSuffix: "",
  h1: "ポケモンGO {lg} 実測ピック率 · 人気デッキ",
  intro1a: "シミュではなく、プレイヤーが", intro1b: "実際に遭遇した相手", intro1c: "を集計した{lg}(GBL)の実戦メタです。",
  intro2a: "今の{lg}でどのポケモンやデッキ(パーティ)に一番よく会うかを", intro2b: "実測ピック率で確認。直近30日基準。",
  interactiveNote1: "期間・シーズンカップのフィルターは", interactiveLink: "インタラクティブメタ", interactiveNote2: "で見られます。",
  tierLink: "{lg} ティア表 · 推奨技構成を見る →",
  empty: "集計データはまだ準備中です。記録が貯まると反映されます。",
  monTopH: "🔥 {lg} ポケモン実測ピック率TOP", deckTopH: "🏆 {lg} 人気デッキ(パーティ)ピック率TOP",
  deckNote: "全対戦中このデッキ(パーティ)に遭遇した割合", shadowWord: "シャドウ ",
  aboutH: "GBL Noteとは？",
  aboutBody: "GBL NoteはポケモンGOバトルリーグ(GBL)で遭遇した相手を記録し、再戦時に相手の過去パーティ・技を5秒で確認できるツールです。この実測メタは利用者の記録を個人情報を除いた匿名統計として集計したもので、実際に流行している{lg}構成を反映します。",
  aboutCta: "無料で始める →", privacy: "プライバシーポリシー",
  metaTitle: "ポケモンGO {lg} 実測ピック率 · 人気デッキTOP | GBL Note",
  metaDesc: "ポケモンGO {lg}(GBL)でプレイヤーが実際に遭遇した相手に基づく実測ピック率と人気デッキ順位。シミュではない実戦データ、直近30日で今何に一番会うか確認。",
  ogTitle: "ポケモンGO {lg} 実測メタ — 実戦ピック率·人気デッキTOP", ogDesc: "ユーザー実測ベースの{lg}ピック率·デッキ順位(直近30日)",
};

const M = { ko, en, ja } as const;
export function getLeagueMeta(lang: string): LeagueMetaDict {
  return (M as Record<string, LeagueMetaDict>)[lang] || ko;
}
