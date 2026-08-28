// 티어표 페이지 문구(3개국어). {lg}=리그명은 페이지에서 삽입.
export type TierDict = {
  navRaid: string; navCmp: string; navMeta: string;
  h1Suffix: string;             // "{리그} 티어표 · 추천 기술배치"
  intro1: string; intro2: string; metaMore: string;
  topTier: string; countSuffix: string;
  actualLabel: string; scoreLabel: string;
  shareTitleSuffix: string; shareSubtitle: string; shareButton: string; shareFooter: string;
  emptyData: string;
  explainerH: string; explainerBody: string; loginLink: string;
  metaTitle: string; metaDesc: string; ogTitle: string; ogDesc: string;
};

const ko: TierDict = {
  navRaid: "🔥 레이드 딜러", navCmp: "⚡ CMP 순위", navMeta: "📊 실측 메타 →",
  h1Suffix: "티어표 · 추천 기술배치",
  intro1: "티어표와 각 포켓몬의 추천 기술배치입니다. 이론 랭킹(전투 시뮬 기반)에 유저 실측 픽률을 함께 표기해, 강한 것과 실제로 많이 만나는 것을 한 번에 볼 수 있습니다.",
  intro2: "티어 = 리그 내 상대 평가(S가 최상위). 실측 픽률은 최근 30일 기준.",
  metaMore: "실측 메타 자세히 →",
  topTier: "최상위 티어", countSuffix: "종",
  actualLabel: "실측", scoreLabel: "점수",
  shareTitleSuffix: "티어 TOP", shareSubtitle: "이론 티어 + 유저 실측 픽률", shareButton: "📸 이 티어표 이미지로 공유·저장", shareFooter: "포켓몬GO 배틀리그 티어표",
  emptyData: "데이터 준비 중입니다.",
  explainerH: "티어·추천 기술배치는 어떻게 나온 건가요?",
  explainerBody: "티어와 추천 기술배치는 공개 전투 시뮬레이션 데이터(PvPoke)를 기반으로 산출한 것이며, 실측 픽률은 GBL Note 사용자들이 실제로 만난 상대를 익명 집계한 값입니다. 이론상 강한 포켓몬과 실제로 유행하는 포켓몬을 함께 비교해보세요.",
  loginLink: "무료로 내 전적 기록하기 →",
  metaTitle: "티어표 · 추천 기술배치 | GBL Note",
  metaDesc: "티어표(S/A/B). 각 포켓몬의 추천 기술배치와 유저 실측 픽률을 함께 확인하세요. 이론 랭킹 + 실전 데이터 결합.",
  ogTitle: "티어표 — 추천 기술배치 + 실측 픽률",
  ogDesc: "S/A/B 티어 + 추천 기술 + 유저 실측 픽률",
};

const en: TierDict = {
  navRaid: "🔥 Raid attackers", navCmp: "⚡ CMP ranking", navMeta: "📊 Encounter meta →",
  h1Suffix: "Tier List · Recommended Movesets",
  intro1: "The tier list and recommended moveset for each Pokémon. Theoretical rankings (battle-sim based) are shown alongside real encounter pick rates, so you can see what's strong and what you'll actually face at a glance.",
  intro2: "Tier = relative rating within the league (S is top). Pick rates are from the last 30 days.",
  metaMore: "See encounter meta →",
  topTier: "Top tier", countSuffix: "",
  actualLabel: "Seen", scoreLabel: "Score",
  shareTitleSuffix: "Tier TOP", shareSubtitle: "Theory tier + real pick rates", shareButton: "📸 Save/Share this tier list", shareFooter: "Pokémon GO Battle League tiers",
  emptyData: "Data coming soon.",
  explainerH: "How are the tiers & movesets determined?",
  explainerBody: "Tiers and recommended movesets are derived from public battle-simulation data (PvPoke); pick rates are anonymous aggregates of opponents GBL Note users actually faced. Compare what's theoretically strong with what's actually popular.",
  loginLink: "Log your own battles for free →",
  metaTitle: "Tier List · Recommended Movesets | GBL Note",
  metaDesc: "(GBL) tier list (S/A/B). See each Pokémon's recommended moveset and real user pick rates. Theory rankings + real battle data combined.",
  ogTitle: "Tier List — movesets + real pick rates",
  ogDesc: "S/A/B tiers + recommended moves + real pick rates",
};

const ja: TierDict = {
  navRaid: "🔥 レイドアタッカー", navCmp: "⚡ CMPランキング", navMeta: "📊 実測メタ →",
  h1Suffix: "ティア表 · 推奨技構成",
  intro1: "ティア表と各ポケモンの推奨技構成です。理論ランキング(バトルシミュ基準)に実測ピック率を併記し、強さと実際の遭遇頻度を一目で確認できます。",
  intro2: "ティア = リーグ内の相対評価(Sが最上位)。ピック率は直近30日基準。",
  metaMore: "実測メタを詳しく →",
  topTier: "最上位ティア", countSuffix: "種",
  actualLabel: "実測", scoreLabel: "スコア",
  shareTitleSuffix: "ティアTOP", shareSubtitle: "理論ティア + 実測ピック率", shareButton: "📸 このティア表を画像で共有・保存", shareFooter: "ポケモンGO バトルリーグ ティア表",
  emptyData: "データ準備中です。",
  explainerH: "ティア・推奨技構成はどう算出？",
  explainerBody: "ティアと推奨技構成は公開バトルシミュデータ(PvPoke)に基づき算出し、ピック率はGBL Note利用者が実際に遭遇した相手の匿名集計です。理論上強いポケモンと実際に流行するポケモンを比較してみてください。",
  loginLink: "無料で自分の戦績を記録 →",
  metaTitle: "ティア表 · 推奨技構成 | GBL Note",
  metaDesc: "(GBL)ティア表(S/A/B)。各ポケモンの推奨技構成と実測ピック率を確認。理論ランキング + 実戦データ。",
  ogTitle: "ティア表 — 技構成 + 実測ピック率",
  ogDesc: "S/A/B ティア + 推奨技 + 実測ピック率",
};

const zhTW: TierDict = {
  navRaid: "🔥 團體戰攻擊手", navCmp: "⚡ CMP 排名", navMeta: "📊 實測環境 →",
  h1Suffix: "強度表 · 推薦招式配置",
  intro1: "強度表與各寶可夢的推薦招式配置。理論排名（基於對戰模擬）搭配玩家實測使用率，讓您一眼看出強度與實際遭遇頻率。",
  intro2: "強度 = 聯盟內的相對評價（S 為最高）。使用率以近 30 天為準。",
  metaMore: "查看實測環境 →",
  topTier: "最高強度", countSuffix: "隻",
  actualLabel: "實測", scoreLabel: "評分",
  shareTitleSuffix: "強度 TOP", shareSubtitle: "理論強度 + 玩家實測使用率", shareButton: "📸 將此強度表以圖片分享·儲存", shareFooter: "寶可夢GO 對戰聯盟 強度表",
  emptyData: "資料準備中。",
  explainerH: "強度·推薦招式配置是怎麼來的？",
  explainerBody: "強度與推薦招式配置是根據公開對戰模擬資料（PvPoke）計算，實測使用率則是 GBL Note 使用者實際遇到的對手匿名統計。請一起比較理論上強勢與實際流行的寶可夢。",
  loginLink: "免費記錄我的戰績 →",
  metaTitle: "強度表 · 推薦招式配置 | GBL Note",
  metaDesc: "對戰聯盟強度表（S/A/B）。查看各寶可夢的推薦招式配置與玩家實測使用率。理論排名 + 實戰資料結合。",
  ogTitle: "強度表 — 招式配置 + 實測使用率",
  ogDesc: "S/A/B 強度 + 推薦招式 + 實測使用率",
};

const T = { ko, en, ja, "zh-TW": zhTW } as const;
export function getTier(lang: string): TierDict {
  return (T as Record<string, TierDict>)[lang] || ko;
}
