// TCG Note (tcgnote.net) — 포켓몬 카드 게임 Pocket 다국어 사전.
// 데이터·계산은 언어 무관 공유(카드명은 데이터셋의 9개국어 내장), UI 문구만 로케일별.
import { type Locale } from "../../../lib/i18n";

export type NavItem = { key: string; path: string; label: string };

export type TcgDict = {
  brand: string;
  meta: { title: string; description: string; ogTitle: string; ogDescription: string };
  nav: NavItem[];
  hero: { h1: string; mission: string };
  funnel: { path: string; label: string }[];
  // 정문 독창성 신호 — "여기서만 보는 원본" 3종(크롤러가 사이트 성격을 '카드DB'가 아닌 '원본 분석+도구'로 읽게)
  signature: { h: string; items: { t: string; d: string; href: string }[] };
  // 대화형 도구 — 홈 전면 노출용(덱빌더·카운터·팩시뮬·가이드). 심사자/크롤러가 '실기능 서비스'로 인식하게.
  tools: { h: string; items: { icon: string; t: string; d: string; href: string }[] };
  footerNote: string;
  // 홈 "선언 블록" — 이 사이트가 무엇을 직접 계산하는지 + 실측 수치 + 원자료/자체 계산 구분. 심사·크롤러가 홈 한 장에서 사이트 성격을 읽게.
  trust: {
    h: string; intro: string;
    stats: { tournaments: string; players: string; matches: string; decks: string; matchups: string; window: string; updated: string };
    rawH: string; raw: string; oursH: string; ours: string[];
    principle: string; more: string; method: string;
  };
};

const ko: TcgDict = {
  brand: "TCG Note",
  meta: {
    title: "TCG Note — 포켓몬 카드 게임 Pocket 메타·덱·티어 분석",
    description: "대회 승률로 계산한 포켓포켓 덱 티어·메타. 티어표·덱 빌더·확률 계산기까지, 데이터로 답하는 덱 분석 도구.",
    ogTitle: "TCG Note — 포켓몬 카드 게임 Pocket 메타·덱 분석",
    ogDescription: "대회 승률 기반 덱 티어 + 대표 덱 공략 + 카드 도구",
  },
  nav: [
    { key: "briefing", path: "/tcg/briefing", label: "이번 주 브리핑" },
    { key: "meta", path: "/tcg/meta", label: "메타" },
    { key: "tier", path: "/tcg/tier", label: "덱 티어" },
    { key: "decks", path: "/tcg/decks", label: "대표 덱" },
    { key: "builder", path: "/tcg/deck-builder", label: "덱 빌더" },
    { key: "counters", path: "/tcg/counters", label: "카운터" },
    { key: "matchups", path: "/tcg/matchups", label: "상성 분석" },
    { key: "cards", path: "/tcg/cards", label: "카드" },
    { key: "handsim", path: "/tcg/hand-sim", label: "확률 계산기" },
    { key: "packsim", path: "/tcg/pack-sim", label: "팩시뮬" },
    { key: "packplanner", path: "/tcg/pack-planner", label: "팩 추천" },
    { key: "guides", path: "/tcg/guides", label: "가이드" },
  ],
  hero: {
    h1: "TCG Note — 포켓몬 카드 게임 Pocket 메타·덱 분석",
    mission: "공개 카드 데이터와 대회 승률을 결합해, 포켓몬 카드 게임 Pocket(포켓포켓)의 메타를 덱 티어·대표 덱 공략·카드 도구로 분석합니다. 단순 카드 나열이 아니라 '무엇을 왜 쓰는지'를 다룹니다.",
  },
  funnel: [
    { path: "/tcg/meta", label: "메타 분석" },
    { path: "/tcg/tier", label: "덱 티어표" },
    { path: "/tcg/decks", label: "대표 덱 공략" },
    { path: "/tcg/cards", label: "카드 검색" },
  ],
  signature: {
    h: "TCG Note 자체 분석 — 여기서만 보는 것",
    items: [
      { t: "🏆 대회 승률 기반 덱 티어", d: "감이 아니라 실제 대회 결과 승률로 산출한 덱 티어표", href: "/tcg/tier" },
      { t: "🎯 대표 덱 심층 공략", d: "덱리스트·플레이 순서·상대별 대응·교체 옵션까지 다룬 원본 공략", href: "/tcg/decks" },
      { t: "📊 메타 환경 분석", d: "타입 분포·상위 집중도·오버퍼포머까지 데이터로 읽는 현재 메타", href: "/tcg/meta" },
    ],
  },
  tools: {
    h: "직접 써보는 도구",
    items: [
      { icon: "📊", t: "첫패·콤보 확률 계산기", d: "덱의 핵심 카드·콤보가 손에 잡힐 확률을 직접 계산", href: "/tcg/hand-sim" },
      { icon: "🃏", t: "덱 빌더", d: "20장 덱을 만들고 필요한 팩까지 확인·공유", href: "/tcg/deck-builder" },
      { icon: "⚔️", t: "카운터 검색", d: "실제 대회 매치업으로 상대 덱 카운터 찾기", href: "/tcg/counters" },
      { icon: "🆚", t: "덱 상성 분석", d: "내 덱의 메타 기대 승률 + 강한/약한 상대", href: "/tcg/matchups" },
      { icon: "🎰", t: "팩 시뮬레이터", d: "공개 확률로 1/10/100팩 오픈 테스트", href: "/tcg/pack-sim" },
      { icon: "📦", t: "팩 추천 계산기", d: "목표 덱 → 지금 까야 할 팩 순위·적중률", href: "/tcg/pack-planner" },
      { icon: "📘", t: "초보·전략 가이드", d: "시작 규칙·덱 고르는 법·타입 상성 정리", href: "/tcg/guides" },
    ],
  },
  footerNote: "카드 데이터: 커뮤니티 공개 데이터셋 · 팬 제작 비공식 사이트",
  trust: {
    h: "실제 대회 데이터로 계산하는 포켓몬 카드 게임 Pocket 분석 서비스",
    intro: "카드를 나열하는 사이트가 아닙니다. 공개 대회 결과를 직접 집계해 덱 점유율·승률·상대별 상성을 계산하고, 표본 보정을 거쳐 티어와 카운터를 산출합니다. 그 위에 대표 덱 운영법과 확률 계산기를 얹습니다.",
    stats: { tournaments: "집계 대회", players: "참가자 표본", matches: "집계 경기", decks: "분석 덱", matchups: "매치업 조합", window: "집계 기간", updated: "최근 갱신" },
    rawH: "원자료 (출처 표기)",
    raw: "Limitless TCG 공개 대회 순위·대진표 (play.limitlesstcg.com)",
    oursH: "TCG Note가 직접 계산하는 것",
    ours: ["대회별 순위·대진을 덱 아키타입 단위로 집계·정규화", "점유율 · 승률 · 3/7/30일 추세", "Wilson 95% 하한으로 소표본 과대평가를 보정한 덱 티어", "상대별 매치업 행렬 → 카운터·메타 기대 승률", "덱 구성으로 첫패·콤보 확률 몬테카를로 계산"],
    principle: "원칙: 실제 관측(대회 승률)과 계산 확률(시뮬)은 항상 구분해 표기하고, 모든 수치에 표본 수를 함께 보여줍니다.",
    more: "사이트 소개·방법론 전체",
    method: "티어·승률 읽는 법 (Wilson 보정)",
  },
};

const en: TcgDict = {
  brand: "TCG Note",
  meta: {
    title: "TCG Note — Pokémon TCG Pocket Meta, Decks & Tier List",
    description: "Deck tier list, meta analysis, top deck guides and card search for Pokémon TCG Pocket — all in one. Tournament win-rate-based tiers and original deck strategy.",
    ogTitle: "TCG Note — Pokémon TCG Pocket Meta & Deck Analysis",
    ogDescription: "Win-rate-based deck tiers + top deck guides + card tools",
  },
  nav: [
    { key: "briefing", path: "/tcg/briefing", label: "Weekly Briefing" },
    { key: "meta", path: "/tcg/meta", label: "Meta" },
    { key: "tier", path: "/tcg/tier", label: "Deck Tiers" },
    { key: "decks", path: "/tcg/decks", label: "Top Decks" },
    { key: "builder", path: "/tcg/deck-builder", label: "Deck Builder" },
    { key: "counters", path: "/tcg/counters", label: "Counters" },
    { key: "matchups", path: "/tcg/matchups", label: "Matchups" },
    { key: "cards", path: "/tcg/cards", label: "Cards" },
    { key: "handsim", path: "/tcg/hand-sim", label: "Odds Calc" },
    { key: "packsim", path: "/tcg/pack-sim", label: "Pack Sim" },
    { key: "packplanner", path: "/tcg/pack-planner", label: "Pack Advisor" },
    { key: "guides", path: "/tcg/guides", label: "Guides" },
  ],
  hero: {
    h1: "TCG Note — Pokémon TCG Pocket Meta & Deck Analysis",
    mission: "TCG Note combines open card data with tournament win rates to analyze the Pokémon TCG Pocket meta through deck tiers, top-deck guides and card tools — covering not just what cards exist, but what to play and why.",
  },
  funnel: [
    { path: "/tcg/meta", label: "Meta Analysis" },
    { path: "/tcg/tier", label: "Deck Tier List" },
    { path: "/tcg/decks", label: "Top Deck Guides" },
    { path: "/tcg/cards", label: "Card Search" },
  ],
  signature: {
    h: "TCG Note originals — what you'll only find here",
    items: [
      { t: "🏆 Win-rate-based deck tiers", d: "Deck tiers computed from real tournament results, not opinion", href: "/tcg/tier" },
      { t: "🎯 In-depth deck guides", d: "Decklists, play sequence, matchup answers and tech options", href: "/tcg/decks" },
      { t: "📊 Meta analysis", d: "The current meta read by data — type distribution, concentration, overperformers", href: "/tcg/meta" },
    ],
  },
  tools: {
    h: "Tools you can try",
    items: [
      { icon: "📊", t: "Opening Hand & Combo Calculator", d: "Compute the odds of drawing a deck's key cards and combos", href: "/tcg/hand-sim" },
      { icon: "🃏", t: "Deck Builder", d: "Build a 20-card deck, see the packs you need, and share it", href: "/tcg/deck-builder" },
      { icon: "⚔️", t: "Counter Search", d: "Find counters to a deck from real tournament matchups", href: "/tcg/counters" },
      { icon: "🆚", t: "Matchup Analysis", d: "Your deck's expected WR vs meta + good/bad matchups", href: "/tcg/matchups" },
      { icon: "🎰", t: "Pack Simulator", d: "Open 1 / 10 / 100 packs at the real pull rates", href: "/tcg/pack-sim" },
      { icon: "📦", t: "Pack Advisor", d: "Target decks → which packs to open now, ranked", href: "/tcg/pack-planner" },
      { icon: "📘", t: "Beginner & Strategy Guides", d: "Rules, how to pick a deck, and type matchups", href: "/tcg/guides" },
    ],
  },
  footerNote: "Card data: community open dataset · unofficial fan-made site",
  trust: {
    h: "Pokémon TCG Pocket analysis computed from real tournament data",
    intro: "This is not a card list site. We aggregate public tournament results ourselves to compute deck share, win rates and per-opponent matchups, apply sample-size correction, and derive tiers and counters. On top of that we add deck game plans and probability calculators.",
    stats: { tournaments: "Tournaments", players: "Player sample", matches: "Matches counted", decks: "Decks analyzed", matchups: "Matchup pairs", window: "Window", updated: "Last updated" },
    rawH: "Raw data (attributed)",
    raw: "Limitless TCG public tournament standings & pairings (play.limitlesstcg.com)",
    oursH: "What TCG Note computes itself",
    ours: ["Aggregate & normalize standings/pairings per deck archetype", "Share · win rate · 3/7/30-day trend", "Deck tiers corrected with the Wilson 95% lower bound (no small-sample overrating)", "Per-opponent matchup matrix → counters & meta expected win rate", "Monte-Carlo opening-hand & combo odds from deck composition"],
    principle: "Principle: observed tournament win rates and simulated probabilities are always labeled separately, and every figure shows its sample size.",
    more: "About & full methodology",
    method: "How to read tiers & win rates (Wilson)",
  },
};

const ja: TcgDict = {
  brand: "TCG Note",
  meta: {
    title: "TCG Note — ポケポケ(ポケモンカードゲーム Pocket) デッキ環境・ティア分析",
    description: "ポケモンカードゲーム Pocket(ポケポケ)のデッキティア・環境分析・主要デッキ攻略・カード検索を一箇所で。大会勝率データに基づくティアと独自デッキ戦略。",
    ogTitle: "TCG Note — ポケポケ デッキ環境・ティア分析",
    ogDescription: "勝率ベースのデッキティア + 主要デッキ攻略 + カードツール",
  },
  nav: [
    { key: "briefing", path: "/tcg/briefing", label: "今週の要点" },
    { key: "meta", path: "/tcg/meta", label: "メタ" },
    { key: "tier", path: "/tcg/tier", label: "デッキティア" },
    { key: "decks", path: "/tcg/decks", label: "主要デッキ" },
    { key: "builder", path: "/tcg/deck-builder", label: "デッキビルダー" },
    { key: "counters", path: "/tcg/counters", label: "カウンター" },
    { key: "matchups", path: "/tcg/matchups", label: "相性分析" },
    { key: "cards", path: "/tcg/cards", label: "カード" },
    { key: "handsim", path: "/tcg/hand-sim", label: "確率計算" },
    { key: "packsim", path: "/tcg/pack-sim", label: "パック開封" },
    { key: "packplanner", path: "/tcg/pack-planner", label: "パック推奨" },
    { key: "guides", path: "/tcg/guides", label: "ガイド" },
  ],
  hero: {
    h1: "TCG Note — ポケポケ デッキ環境・ティア分析",
    mission: "公開カードデータと大会勝率を組み合わせ、ポケモンカードゲーム Pocket(ポケポケ)の環境をデッキティア・主要デッキ攻略・カードツールで分析。カードの羅列ではなく「何をなぜ使うか」を扱います。",
  },
  funnel: [
    { path: "/tcg/meta", label: "メタ分析" },
    { path: "/tcg/tier", label: "デッキティア表" },
    { path: "/tcg/decks", label: "主要デッキ攻略" },
    { path: "/tcg/cards", label: "カード検索" },
  ],
  signature: {
    h: "TCG Note 独自分析 — ここでしか見られないもの",
    items: [
      { t: "🏆 勝率ベースのデッキティア", d: "感覚ではなく実際の大会結果の勝率で算出したデッキティア", href: "/tcg/tier" },
      { t: "🎯 主要デッキ 詳細攻略", d: "デッキリスト・立ち回り・対面対策・入れ替え候補まで扱う独自攻略", href: "/tcg/decks" },
      { t: "📊 メタ環境分析", d: "タイプ分布·集中度·オーバーパフォーマーまでデータで読む現環境", href: "/tcg/meta" },
    ],
  },
  tools: {
    h: "自分で試せるツール",
    items: [
      { icon: "📊", t: "初手·コンボ確率計算機", d: "デッキのキーカード·コンボが揃う確率を計算", href: "/tcg/hand-sim" },
      { icon: "🃏", t: "デッキビルダー", d: "20枚デッキを作り、必要なパックまで確認·共有", href: "/tcg/deck-builder" },
      { icon: "⚔️", t: "カウンター検索", d: "実際の大会マッチアップで相手デッキの対策を探す", href: "/tcg/counters" },
      { icon: "🆚", t: "デッキ相性分析", d: "マイデッキのメタ期待勝率 + 有利/不利相手", href: "/tcg/matchups" },
      { icon: "🎰", t: "パック開封シミュ", d: "公開確率で1/10/100パックを開封テスト", href: "/tcg/pack-sim" },
      { icon: "📦", t: "パック推奨計算機", d: "目標デッキ → 今開くべきパックを順位で", href: "/tcg/pack-planner" },
      { icon: "📘", t: "初心者·戦略ガイド", d: "開始ルール·デッキ選び·タイプ相性を整理", href: "/tcg/guides" },
    ],
  },
  footerNote: "カードデータ: コミュニティ公開データセット · ファン制作の非公式サイト",
  trust: {
    h: "実際の大会データから計算するポケモンカードゲーム Pocket 分析サービス",
    intro: "カードを並べるサイトではありません。公開大会結果を自前で集計してデッキ使用率・勝率・相手別相性を計算し、サンプル補正を経てティアとカウンターを算出します。その上に代表デッキの立ち回りと確率計算機を載せています。",
    stats: { tournaments: "集計大会", players: "参加者サンプル", matches: "集計試合", decks: "分析デッキ", matchups: "相性ペア", window: "集計期間", updated: "最終更新" },
    rawH: "元データ (出典表記)",
    raw: "Limitless TCG 公開大会の順位・対戦表 (play.limitlesstcg.com)",
    oursH: "TCG Note が自ら計算するもの",
    ours: ["順位・対戦をデッキアーキタイプ単位で集計・正規化", "使用率 · 勝率 · 3/7/30日トレンド", "Wilson 95%下限で小サンプルの過大評価を補正したデッキティア", "相手別相性マトリクス → カウンター・環境期待勝率", "デッキ構成から初手・コンボ確率をモンテカルロ計算"],
    principle: "原則: 実測(大会勝率)と計算確率(シミュ)は常に区別して表記し、すべての数値にサンプル数を併記します。",
    more: "サイト紹介・方法論の全文",
    method: "ティア・勝率の読み方 (Wilson補正)",
  },
};

const zhTW: TcgDict = {
  brand: "TCG Note",
  meta: {
    title: "TCG Note — 寶可夢集換式卡牌 Pocket 環境·牌組·強度分析",
    description: "寶可夢集換式卡牌 Pocket 的牌組強度·環境分析·代表牌組攻略·卡片查詢一站式。以賽事勝率數據為基礎的強度表與原創牌組策略。",
    ogTitle: "TCG Note — 寶可夢卡牌 Pocket 環境·牌組分析",
    ogDescription: "勝率為基礎的牌組強度 + 代表牌組攻略 + 卡片工具",
  },
  nav: [
    { key: "briefing", path: "/tcg/briefing", label: "本週簡報" },
    { key: "meta", path: "/tcg/meta", label: "環境" },
    { key: "tier", path: "/tcg/tier", label: "牌組強度" },
    { key: "decks", path: "/tcg/decks", label: "代表牌組" },
    { key: "builder", path: "/tcg/deck-builder", label: "牌組製作" },
    { key: "counters", path: "/tcg/counters", label: "剋星" },
    { key: "matchups", path: "/tcg/matchups", label: "對戰分析" },
    { key: "cards", path: "/tcg/cards", label: "卡片" },
    { key: "handsim", path: "/tcg/hand-sim", label: "機率計算" },
    { key: "packsim", path: "/tcg/pack-sim", label: "開包" },
    { key: "packplanner", path: "/tcg/pack-planner", label: "推薦卡包" },
    { key: "guides", path: "/tcg/guides", label: "指南" },
  ],
  hero: {
    h1: "TCG Note — 寶可夢卡牌 Pocket 環境·牌組分析",
    mission: "結合公開卡片數據與賽事勝率，以牌組強度·代表牌組攻略·卡片工具分析寶可夢集換式卡牌 Pocket 的環境。不只是卡片列表，而是「該用什麼、為什麼」。",
  },
  funnel: [
    { path: "/tcg/meta", label: "環境分析" },
    { path: "/tcg/tier", label: "牌組強度表" },
    { path: "/tcg/decks", label: "代表牌組攻略" },
    { path: "/tcg/cards", label: "卡片查詢" },
  ],
  signature: {
    h: "TCG Note 自有分析 — 只有這裡看得到",
    items: [
      { t: "🏆 勝率為基礎的牌組強度", d: "並非憑感覺，而是以實際賽事結果勝率算出的牌組強度", href: "/tcg/tier" },
      { t: "🎯 代表牌組深入攻略", d: "牌表·出牌順序·對面對策·替換選項的原創攻略", href: "/tcg/decks" },
      { t: "📊 環境分析", d: "以數據解讀當前環境 — 屬性分布·集中度·超常發揮", href: "/tcg/meta" },
    ],
  },
  tools: {
    h: "可親自試用的工具",
    items: [
      { icon: "📊", t: "起手·連段機率計算機", d: "計算牌組關鍵卡·連段到手的機率", href: "/tcg/hand-sim" },
      { icon: "🃏", t: "牌組製作", d: "組20張牌組，查看需要的卡包並分享", href: "/tcg/deck-builder" },
      { icon: "⚔️", t: "剋星搜尋", d: "以實際賽事對戰找出剋制對手牌組的牌組", href: "/tcg/counters" },
      { icon: "🆚", t: "牌組對戰分析", d: "我方牌組的對環境期望勝率 + 有利/不利對手", href: "/tcg/matchups" },
      { icon: "🎰", t: "開包模擬器", d: "以公開機率開1/10/100包測試", href: "/tcg/pack-sim" },
      { icon: "📦", t: "卡包推薦計算機", d: "目標牌組 → 現在該開的卡包排名", href: "/tcg/pack-planner" },
      { icon: "📘", t: "新手·策略指南", d: "起步規則·選牌組·屬性相剋整理", href: "/tcg/guides" },
    ],
  },
  footerNote: "卡片數據：社群公開資料集 · 粉絲製作非官方網站",
  trust: {
    h: "以實際比賽資料計算的 Pokémon TCG Pocket 分析服務",
    intro: "這不是列卡片的網站。我們自行彙整公開比賽結果，計算牌組使用率、勝率與對手別相性，經樣本修正後得出分級與剋星；再加上代表牌組的打法與機率計算器。",
    stats: { tournaments: "彙整比賽", players: "參賽者樣本", matches: "計入對局", decks: "分析牌組", matchups: "相性組合", window: "統計區間", updated: "最近更新" },
    rawH: "原始資料（標示出處）",
    raw: "Limitless TCG 公開比賽名次與對戰表 (play.limitlesstcg.com)",
    oursH: "TCG Note 自行計算的部分",
    ours: ["以牌組原型為單位彙整、正規化名次與對戰", "使用率 · 勝率 · 3/7/30 日趨勢", "以 Wilson 95% 下限修正小樣本高估的牌組分級", "對手別相性矩陣 → 剋星與環境期望勝率", "依牌組構成以蒙地卡羅計算起手與連段機率"],
    principle: "原則：實測（比賽勝率）與計算機率（模擬）一律分開標示，所有數值都附上樣本數。",
    more: "網站介紹與完整方法論",
    method: "如何解讀分級與勝率（Wilson 修正）",
  },
};

const DICTS: Record<Locale, TcgDict> = { ko, en, ja, "zh-TW": zhTW };

export function getTcg(lang: Locale): TcgDict {
  return DICTS[lang] || ko;
}
