// 초보/전략 가이드 콘텐츠 — 포켓몬 카드 게임 Pocket. 4개국어. AdSense용 실질 콘텐츠 + 도구/티어로 연결.
// 데이터는 언어 무관 구조, 문구만 로케일별. slug로 /tcg/guides/[slug] 라우팅.
import { type Locale } from "../../../../lib/i18n";

export type GuideSection = { h: string; p: string };
export type GuideCTA = { label: string; href: string };
export type GuideBody = { title: string; summary: string; sections: GuideSection[]; cta?: GuideCTA[] };
export type Guide = { slug: string; icon: string; i18n: Record<Locale, GuideBody> };

export const GUIDES: Guide[] = [
  {
    slug: "why-tcg-note",
    icon: "💡",
    i18n: {
      ko: {
        title: "TCG Note는 무엇이 다른가 — 계산으로 답하는 포켓포켓 도구",
        summary: "카드를 나열하는 사이트는 많습니다. TCG Note는 공개 데이터를 재료로 '계산된 답'을 만듭니다. 무엇이 다른지, 그리고 200% 활용하는 법을 정리했습니다.",
        sections: [
          { h: "DB를 보여주는 게 아니라, 계산해서 답합니다", p: "카드 정보·대회 결과 같은 '공개 데이터'는 어느 사이트나 같습니다. TCG Note의 가치는 그 데이터를 재료로 직접 계산한 결과에 있습니다 — 대회 승률로 산출한 덱 티어, 실제 대전 기록으로 만든 매치업·카운터, 덱 구성으로 확률을 돌리는 첫패·콤보 계산기. 즉 '무슨 카드가 있나'가 아니라 '무엇을 왜 쓰고, 얼마나 통하나'에 답합니다." },
          { h: "세 겹의 가치 — 사실 · 분석 · 계산", p: "① 공개 사실(카드·덱리스트·대회 결과)은 출처(Limitless 등)를 명시해 그대로 제공합니다. ② 그 위에 TCG Note의 자체 분석을 얹습니다 — Wilson 보정 티어, 점유율과 기간별 승률(3·7·30일)·추세, 상성 카운터. ③ 마지막으로 자체 계산/시뮬을 제공합니다 — 첫 손에 핵심 카드가 잡힐 확률, 콤보가 갖춰질 확률, 팩 오픈 확률. 사실은 재료일 뿐, 우리가 만드는 건 '계산된 답'입니다." },
          { h: "이렇게 쓰면 200% — 덱 고르기부터 뽑기 계획까지", p: "① 덱 티어표에서 '표본도 충분하고 승률도 높은' 덱을 고릅니다(반짝 승률은 Wilson 하한이 걸러줍니다). ② 카운터 검색으로 요즘 많이 보이는 상대 덱의 카운터를 미리 준비합니다. ③ 첫패·콤보 계산기로 고른 덱의 일관성을 점검합니다(핵심 카드 첫 손 확률, 콤보 확보 확률). ④ 팩 시뮬레이터로 목표 카드가 어느 팩에서 얼마나 나오는지 확인해 젬 쓸 곳을 정합니다. ⑤ 기간별 승률·추세로 메타 흐름을 추적합니다 — 어제 강했던 덱이 오늘 꺾였는지 한눈에 봅니다." },
          { h: "우리가 지키는 원칙 — 정직한 숫자", p: "숫자를 믿을 수 있어야 도구가 됩니다. 그래서 TCG Note는 ① '실제 관측 승률'과 '계산한 예상 확률(시뮬)'을 반드시 구분해 표기하고, ② 모든 지표에 표본 수를 함께 보여줍니다(10경기 70%와 1,000경기 56%는 다릅니다 — Wilson 보정으로 소표본 과대평가를 막습니다), ③ 공개 데이터의 출처를 명시합니다. 예뻐 보이는 숫자보다 믿을 수 있는 숫자를 택합니다." },
        ],
        cta: [
          { label: "🏆 덱 티어표", href: "/tcg/tier" },
          { label: "📊 첫패·콤보 계산기", href: "/tcg/hand-sim" },
          { label: "⚔️ 카운터 검색", href: "/tcg/counters" },
        ],
      },
      en: {
        title: "What makes TCG Note different — a Pokémon TCG Pocket toolkit that computes answers",
        summary: "Plenty of sites list cards. TCG Note turns public data into computed answers. Here's what's different, and how to get the most out of it.",
        sections: [
          { h: "It doesn't just show a database — it computes answers", p: "Public data like card info and tournament results is the same everywhere. TCG Note's value is in what it computes from that data — deck tiers from tournament win rates, matchups and counters from real game records, and an opening-hand/combo calculator that runs the odds on your deck's composition. It answers not 'what cards exist' but 'what to play, why, and how well it works.'" },
          { h: "Three layers of value — facts · analysis · computation", p: "① Public facts (cards, decklists, tournament results) are shown as-is with their source (Limitless, etc.) credited. ② On top we add TCG Note's own analysis — Wilson-adjusted tiers, share and period win rates (3/7/30 days) with trend, and matchup counters. ③ Finally, our own computation/simulation — the probability a key card is in your opening hand, that a combo comes together, or what a pack opens. The facts are raw material; what we build is the computed answer." },
          { h: "How to get 200% out of it — from picking a deck to planning your pulls", p: "① In the tier list, pick a deck with both a solid sample and a high win rate (the Wilson lower bound filters out lucky streaks). ② Use Counter Search to prepare in advance against the decks you're facing a lot. ③ Check your chosen deck's consistency with the Opening Hand & Combo Calculator (opening-hand odds for key cards, combo odds). ④ Use the Pack Simulator to see how often target cards appear in each pack and decide where to spend gems. ⑤ Track the meta with period win rates and trends — see at a glance whether a deck that was strong yesterday has cooled off today." },
          { h: "The principles we keep — honest numbers", p: "A tool is only useful if you can trust its numbers. So TCG Note ① always labels 'observed win rate' separately from 'computed probability (simulation),' ② shows the sample size alongside every figure (70% over 10 games and 56% over 1,000 are different — the Wilson adjustment prevents small-sample overrating), and ③ credits the source of public data. We choose trustworthy numbers over pretty ones." },
        ],
        cta: [
          { label: "🏆 Deck tier list", href: "/tcg/tier" },
          { label: "📊 Opening Hand Calculator", href: "/tcg/hand-sim" },
          { label: "⚔️ Counter Search", href: "/tcg/counters" },
        ],
      },
      ja: {
        title: "TCG Note はどこが違うか — 計算で答えるポケポケツール",
        summary: "カードを並べるサイトは多い。TCG Note は公開データを材料に『計算された答え』を作ります。何が違うのか、そして200%活用する方法をまとめました。",
        sections: [
          { h: "DBを見せるのではなく、計算して答えます", p: "カード情報や大会結果といった『公開データ』はどのサイトも同じです。TCG Note の価値は、それを材料に自分で計算した結果にあります — 大会勝率で算出したデッキティア、実際の対戦記録で作った相性・カウンター、デッキ構成で確率を回す初手・コンボ計算機。『どんなカードがあるか』ではなく『何をなぜ使い、どれだけ通用するか』に答えます。" },
          { h: "三層の価値 — 事実 · 分析 · 計算", p: "①公開事実(カード・デッキリスト・大会結果)は出典(Limitless等)を明記してそのまま提供。②その上に TCG Note 独自の分析を重ねます — ウィルソン補正ティア、使用率・期間別勝率(3・7・30日)と推移、相性カウンター。③最後に独自の計算/シミュ — 初手にキーカードが来る確率、コンボが揃う確率、パック開封の確率。事実は材料にすぎず、作るのは『計算された答え』です。" },
          { h: "こう使えば200% — デッキ選びから引きの計画まで", p: "①ティア表で『標本も十分で勝率も高い』デッキを選ぶ(まぐれ勝率はウィルソン下限が弾きます)。②カウンター検索で、よく当たる相手デッキの対策を先に用意。③初手・コンボ計算機で選んだデッキの安定性を点検(キーカードの初手率、コンボ確保率)。④パックシミュで目標カードがどのパックでどれだけ出るか確認し、石の使い所を決める。⑤期間別勝率・推移で環境の流れを追う — 昨日強かったデッキが今日落ちたか一目で。" },
          { h: "私たちが守る原則 — 正直な数字", p: "数字が信頼できて初めて道具になります。だから TCG Note は①『実際の観測勝率』と『計算した予想確率(シミュ)』を必ず区別して表記し、②すべての指標に標本数を併記し(10試合70%と1,000試合56%は違います — ウィルソン補正で小標本の過大評価を防ぎます)、③公開データの出典を明記します。きれいな数字より信頼できる数字を選びます。" },
        ],
        cta: [
          { label: "🏆 デッキティア表", href: "/tcg/tier" },
          { label: "📊 初手・コンボ計算機", href: "/tcg/hand-sim" },
          { label: "⚔️ カウンター検索", href: "/tcg/counters" },
        ],
      },
      "zh-TW": {
        title: "TCG Note 有何不同 — 以計算回答的 Pocket 工具",
        summary: "列卡片的網站很多。TCG Note 以公開數據為材料，做出『計算後的答案』。這裡整理有何不同，以及如何200%活用。",
        sections: [
          { h: "不是展示資料庫，而是計算後回答", p: "卡片資訊、賽事結果這類『公開數據』每個網站都一樣。TCG Note 的價值在於用它計算出的結果 — 以賽事勝率算出的牌組強度、以實際對戰記錄做的對戰·剋星、以牌組構成跑機率的起手·連段計算機。回答的不是『有哪些卡』，而是『該用什麼、為什麼、有多有效』。" },
          { h: "三層價值 — 事實 · 分析 · 計算", p: "①公開事實(卡片·牌表·賽事結果)標明來源(Limitless等)原樣提供。②在其上疊加 TCG Note 自有分析 — Wilson 修正強度、使用率·期間別勝率(3·7·30日)與趨勢、對戰剋星。③最後是自有計算/模擬 — 起手抽到關鍵卡的機率、連段湊齊的機率、開包機率。事實只是材料，我們提供的是計算後的答案。" },
          { h: "這樣用能200% — 從選牌組到規劃抽卡", p: "①在強度表選『樣本充足且勝率高』的牌組(僥倖勝率會被 Wilson 下限濾掉)。②用剋星搜尋，先準備常遇到的對手牌組的剋制。③用起手·連段計算機檢查所選牌組的穩定度(關鍵卡起手率、連段確保率)。④用開包模擬器看目標卡在哪個卡包出多少，決定寶石花在哪。⑤用期間別勝率·趨勢追蹤環境 — 昨天強的牌組今天是否降溫，一目了然。" },
          { h: "我們堅守的原則 — 誠實的數字", p: "數字可信才成為工具。所以 TCG Note ①必定區分標示『實際觀測勝率』與『計算的預估機率(模擬)』，②每項指標都併示樣本數(10場70%與1,000場56%不同 — Wilson 修正防止小樣本高估)，③標明公開數據來源。我們選擇可信的數字，而非好看的數字。" },
        ],
        cta: [
          { label: "🏆 牌組強度表", href: "/tcg/tier" },
          { label: "📊 起手·連段計算機", href: "/tcg/hand-sim" },
          { label: "⚔️ 剋星搜尋", href: "/tcg/counters" },
        ],
      },
    },
  },
  {
    slug: "getting-started",
    icon: "🃏",
    i18n: {
      ko: {
        title: "포켓몬 카드 게임 Pocket 시작 가이드 — 규칙과 첫 덱",
        summary: "포켓포켓을 처음 시작하는 사람을 위한 기본 규칙·덱 구성·에너지 시스템·첫 덱 짜는 법을 한 번에 정리했습니다.",
        sections: [
          { h: "포켓몬 카드 게임 Pocket이란", p: "포켓몬 카드 게임 Pocket(포켓포켓)은 모바일에 맞게 간소화된 포켓몬 TCG입니다. 실물 카드 게임보다 규칙이 가볍고 한 판이 5분 안팎으로 빠르며, 매일 무료로 팩을 열어 카드를 모을 수 있습니다. 처음이라도 이 규칙 몇 가지만 알면 바로 대전할 수 있습니다." },
          { h: "승리 조건 — 포인트 3점", p: "상대 포켓몬을 기절시키면 포인트를 얻고, 먼저 3점을 모으면 승리합니다. 일반 포켓몬은 1점, ex 포켓몬은 기절시키면 2점을 줍니다. 그래서 강력한 ex를 쓰면 화력이 좋지만, 쓰러지면 상대에게 2점을 헌납하는 위험도 함께 있습니다." },
          { h: "덱 구성 규칙", p: "덱은 정확히 20장이며, 같은 이름의 카드는 최대 2장까지 넣을 수 있습니다. 실물 TCG와 달리 에너지 카드는 덱에 넣지 않습니다(아래 참고). 시작할 때 손에 든 5장 중 반드시 기본 포켓몬이 1장 이상 있어야 하므로, 기본 포켓몬을 넉넉히(보통 8~12장) 넣는 것이 안정적입니다." },
          { h: "에너지 존 — 덱과 별개", p: "포켓포켓은 에너지를 덱에 넣지 않고, '에너지 존'에서 매 턴 1개씩 자동으로 생성됩니다. 덱을 짤 때 이 덱이 쓸 에너지 타입을 1~3개 지정하며, 매 턴 그중 하나가 무작위로 나옵니다. 타입을 적게(1~2개) 잡을수록 필요한 에너지가 안정적으로 붙습니다." },
          { h: "첫 덱은 이렇게 짜세요", p: "① 한 가지 타입을 중심으로 잡고(에너지가 꼬이지 않게), ② 메인 어태커의 진화 라인을 2장씩 갖추고, ③ '박사의 연구'·'몬스터볼' 같은 서포트/아이템으로 카드를 뽑고 원하는 포켓몬을 찾도록 구성합니다. 처음에는 대표 덱을 그대로 따라 만든 뒤 조금씩 바꿔보는 것이 가장 빠릅니다." },
        ],
        cta: [
          { label: "🏆 덱 티어표 보기", href: "/tcg/tier" },
          { label: "🎯 대표 덱 공략", href: "/tcg/decks" },
          { label: "🃏 덱 빌더로 직접 만들기", href: "/tcg/deck-builder" },
        ],
      },
      en: {
        title: "Pokémon TCG Pocket Beginner Guide — Rules & Your First Deck",
        summary: "Everything a new player needs: the core rules, deck-building limits, the energy system, and how to build your first deck.",
        sections: [
          { h: "What is Pokémon TCG Pocket", p: "Pokémon TCG Pocket is a streamlined, mobile-first version of the Pokémon TCG. The rules are lighter than the physical game, a match takes about five minutes, and you open free packs every day to collect cards. Even as a beginner, these few rules are all you need to start playing." },
          { h: "How to win — 3 points", p: "Knock out an opponent's Pokémon to earn points; the first to 3 points wins. A regular Pokémon gives 1 point, while an ex Pokémon gives 2 points when knocked out. That's why ex Pokémon hit hard but are risky — if yours faints, you hand the opponent 2 points at once." },
          { h: "Deck-building rules", p: "A deck is exactly 20 cards, with a maximum of 2 copies of any single name. Unlike the physical TCG, you do not put Energy cards in your deck (see below). Your opening 5-card hand must contain at least one Basic Pokémon, so it's safest to run plenty of Basics (usually 8–12)." },
          { h: "The Energy Zone — separate from the deck", p: "In Pocket, Energy isn't in your deck — it's generated automatically, one per turn, from an 'Energy Zone.' When building, you choose the 1–3 Energy types your deck uses, and each turn one of them is produced at random. Fewer types (1–2) means the Energy you need attaches more reliably." },
          { h: "Building your first deck", p: "① Center the deck on a single type so your Energy doesn't get stuck; ② run 2 copies of your main attacker's evolution line; ③ add Supporters/Items like Professor's Research and Poké Ball to draw cards and find the Pokémon you want. The fastest start is to copy a top meta deck, then tweak it as you learn." },
        ],
        cta: [
          { label: "🏆 View the deck tier list", href: "/tcg/tier" },
          { label: "🎯 Top deck guides", href: "/tcg/decks" },
          { label: "🃏 Build one in the Deck Builder", href: "/tcg/deck-builder" },
        ],
      },
      ja: {
        title: "ポケポケ 初心者ガイド — ルールと最初のデッキ",
        summary: "ポケポケを始める人向けに、基本ルール・デッキ構築・エネルギーの仕組み・最初のデッキの組み方をまとめました。",
        sections: [
          { h: "ポケモンカードゲーム Pocket とは", p: "ポケモンカードゲーム Pocket(ポケポケ)は、モバイル向けに簡略化されたポケモンTCGです。紙のゲームよりルールが軽く、1試合は5分前後で終わり、毎日無料でパックを開いてカードを集められます。初めてでも、以下のルールさえ押さえればすぐに対戦できます。" },
          { h: "勝利条件 — ポイント3点", p: "相手のポケモンをきぜつさせるとポイントを獲得し、先に3点集めると勝ちです。通常ポケモンは1点、exポケモンをきぜつさせると2点入ります。強力なexは火力が高い一方、倒されると相手に一気に2点を渡すリスクもあります。" },
          { h: "デッキ構築ルール", p: "デッキはちょうど20枚、同名カードは最大2枚まで。紙のTCGと違い、エネルギーはデッキに入れません(下記参照)。開始時の手札5枚には必ずたねポケモンが1枚以上必要なので、たねポケモンは多め(通常8〜12枚)にすると安定します。" },
          { h: "エネルギーゾーン — デッキとは別", p: "ポケポケではエネルギーをデッキに入れず、『エネルギーゾーン』から毎ターン1つ自動で生成されます。構築時にそのデッキが使うエネルギータイプを1〜3種指定し、毎ターンそのうち1つがランダムで出ます。タイプを少なく(1〜2種)するほど、必要なエネルギーが安定して付きます。" },
          { h: "最初のデッキの組み方", p: "①エネルギーが事故らないよう1タイプ中心にまとめる、②メインアタッカーの進化ラインを2枚ずつ揃える、③『博士の研究』『モンスターボール』などのサポート/グッズでドローと必要なポケモン探しを入れる。最初は主要デッキをそのまま真似て組み、慣れたら少しずつ調整するのが最短です。" },
        ],
        cta: [
          { label: "🏆 デッキティア表を見る", href: "/tcg/tier" },
          { label: "🎯 主要デッキ攻略", href: "/tcg/decks" },
          { label: "🃏 デッキビルダーで作る", href: "/tcg/deck-builder" },
        ],
      },
      "zh-TW": {
        title: "寶可夢卡牌 Pocket 新手指南 — 規則與第一副牌組",
        summary: "為新手整理：基本規則、牌組構築限制、能量系統，以及如何組出你的第一副牌組。",
        sections: [
          { h: "什麼是寶可夢集換式卡牌 Pocket", p: "寶可夢集換式卡牌 Pocket 是為手機簡化的寶可夢TCG。規則比實體遊戲輕，一場約五分鐘，且每天可免費開包收集卡片。即使是新手，只要掌握以下幾條規則就能立刻對戰。" },
          { h: "勝利條件 — 3分", p: "擊倒對手的寶可夢可獲得分數，先拿到3分者獲勝。一般寶可夢給1分，ex寶可夢被擊倒時給2分。因此ex火力強，但風險也高 — 你的ex倒下就一次送給對手2分。" },
          { h: "牌組構築規則", p: "牌組剛好20張，同名卡最多2張。與實體TCG不同，能量卡不放進牌組(見下)。開局5張手牌中必須至少有1張基礎寶可夢，所以放足夠的基礎寶可夢(通常8〜12張)較穩定。" },
          { h: "能量區 — 與牌組分開", p: "在Pocket中，能量不放進牌組，而是由『能量區』每回合自動產生1個。構築時指定這副牌組使用的1〜3種能量屬性，每回合隨機產生其一。屬性越少(1〜2種)，需要的能量越能穩定附著。" },
          { h: "如何組第一副牌組", p: "①以單一屬性為主，避免能量卡住；②主攻手的進化系列各放2張；③加入『博士的研究』『精靈球』等支援/物品來抽牌並找到想要的寶可夢。最快的方式是直接照抄主流牌組，熟悉後再微調。" },
        ],
        cta: [
          { label: "🏆 查看牌組強度表", href: "/tcg/tier" },
          { label: "🎯 代表牌組攻略", href: "/tcg/decks" },
          { label: "🃏 用牌組製作自己組", href: "/tcg/deck-builder" },
        ],
      },
    },
  },
  {
    slug: "pick-a-deck",
    icon: "🎯",
    i18n: {
      ko: {
        title: "초보를 위한 덱 고르는 법 — 티어와 예산 사이",
        summary: "무엇을 왜 쓰는지 모른 채 카드만 모으면 헤맵니다. 티어표를 읽는 법, 강함과 예산의 균형, 초보에게 맞는 덱 고르는 기준을 정리했습니다.",
        sections: [
          { h: "티어표는 '승률'로 읽으세요", p: "TCG Note의 덱 티어는 감이 아니라 실제 대회 결과의 승률로 산출합니다. S·A 티어는 표본이 충분하면서 승률이 높은 덱이고, 표본이 적은 덱은 승률이 높아도 신뢰구간(윌슨 하한)이 낮게 잡혀 과대평가를 막습니다. 즉 '반짝 승률'과 '진짜 강함'을 구분해서 보세요." },
          { h: "강함 ≠ 나에게 맞음", p: "최상위 덱이라도 조작 난이도가 높거나, 특정 고레어 카드가 2장씩 필요해 만들기 어려울 수 있습니다. 초보라면 ① 조작이 단순하고(어택 루트가 1~2개), ② 필요한 핵심 카드가 적고, ③ 여러 상대에 두루 통하는 덱이 성장에 좋습니다." },
          { h: "예산으로 고르기", p: "고레어(ex·아트) 카드가 많이 필요한 덱은 완성까지 팩을 많이 열어야 합니다. 각 덱 공략과 카드 페이지에 '나오는 팩'을 정리해두었으니, 지금 가진 카드로 만들 수 있는 덱부터 시작하고, 팩 시뮬레이터로 목표 카드가 어느 팩에서 얼마나 나오는지 확인한 뒤 젬 쓸 곳을 정하세요." },
          { h: "메타를 읽고 상성 대비", p: "지금 많이 쓰이는 덱을 알면, 그걸 이기는 카운터를 미리 준비할 수 있습니다. 메타 환경 분석에서 상위 집중도·타입 분포를 보고, 카운터 검색으로 '상대 덱 → 이기는 덱'을 찾아보세요. 덱 선택은 '내가 뭘 하고 싶은가'와 '지금 뭐가 많은가'를 함께 봐야 합니다." },
        ],
        cta: [
          { label: "🏆 덱 티어표", href: "/tcg/tier" },
          { label: "📊 메타 환경 분석", href: "/tcg/meta" },
          { label: "🎯 카운터 검색", href: "/tcg/counters" },
        ],
      },
      en: {
        title: "How to Pick a Deck (for Beginners) — Between Tier and Budget",
        summary: "Collecting cards without knowing what to play or why leaves you lost. Here's how to read a tier list, balance power against budget, and choose a deck that fits a beginner.",
        sections: [
          { h: "Read tiers by win rate", p: "TCG Note's deck tiers come from real tournament win rates, not opinion. S/A tiers are decks with both a solid sample and a high win rate; decks with a small sample get a lower confidence bound (Wilson lower bound) so a lucky streak isn't overrated. In short, separate 'a hot streak' from 'genuinely strong.'" },
          { h: "Strong ≠ right for you", p: "Even a top deck can be hard to pilot, or need two copies of a specific high-rarity card that's tough to pull. As a beginner, a deck that ① is simple to play (1–2 attack lines), ② needs few key cards, and ③ performs well into many opponents is best for improving." },
          { h: "Choosing by budget", p: "Decks that need many high-rarity (ex/art) cards take a lot of packs to finish. Each deck guide and card page lists the packs a card comes from, so start with a deck you can build from what you already own — then use the Pack Simulator to see how often your target cards appear, and decide where to spend gems." },
          { h: "Read the meta, prep matchups", p: "Knowing what's popular right now lets you prepare counters in advance. Check concentration and type distribution in the Meta Analysis, and use Counter Search to go from 'opponent's deck → a deck that beats it.' Deck choice should weigh both 'what I want to do' and 'what's common now.'" },
        ],
        cta: [
          { label: "🏆 Deck tier list", href: "/tcg/tier" },
          { label: "📊 Meta analysis", href: "/tcg/meta" },
          { label: "🎯 Counter search", href: "/tcg/counters" },
        ],
      },
      ja: {
        title: "初心者のデッキの選び方 — ティアと予算の間で",
        summary: "何をなぜ使うか分からないままカードを集めると迷います。ティア表の読み方、強さと予算のバランス、初心者に合うデッキの選び方をまとめました。",
        sections: [
          { h: "ティア表は『勝率』で読む", p: "TCG Note のデッキティアは感覚ではなく実際の大会勝率で算出します。S・Aは十分な標本かつ高勝率のデッキで、標本が少ないデッキは勝率が高くても信頼区間(ウィルソン下限)が低く出て過大評価を防ぎます。『たまたまの勝率』と『本物の強さ』を分けて見ましょう。" },
          { h: "強い ≠ 自分に合う", p: "最上位デッキでも操作が難しかったり、特定の高レアカードを2枚必要として組みにくい場合があります。初心者なら①操作が単純(攻め筋が1〜2本)、②必要な核カードが少ない、③多くの相手に通用する、デッキが上達に向きます。" },
          { h: "予算で選ぶ", p: "高レア(ex・アート)を多く必要とするデッキは完成までパックを多く開けます。各デッキ攻略とカードページに『出るパック』を整理してあるので、今持っているカードで組めるデッキから始め、パックシミュで目標カードがどのパックでどれだけ出るか確認して石の使い所を決めましょう。" },
          { h: "環境を読み、相性に備える", p: "今よく使われるデッキを知れば、それに勝つカウンターを先に用意できます。メタ環境分析で集中度・タイプ分布を見て、カウンター検索で『相手デッキ→勝てるデッキ』を探しましょう。デッキ選びは『自分が何をしたいか』と『今何が多いか』を合わせて見ます。" },
        ],
        cta: [
          { label: "🏆 デッキティア表", href: "/tcg/tier" },
          { label: "📊 メタ環境分析", href: "/tcg/meta" },
          { label: "🎯 カウンター検索", href: "/tcg/counters" },
        ],
      },
      "zh-TW": {
        title: "新手如何選牌組 — 在強度與預算之間",
        summary: "不知道要用什麼、為什麼用就一直收卡，只會迷路。這裡整理如何看強度表、平衡強度與預算，以及選出適合新手的牌組。",
        sections: [
          { h: "用『勝率』看強度表", p: "TCG Note 的牌組強度以實際賽事勝率算出，並非憑感覺。S·A是樣本充足且勝率高的牌組；樣本少的牌組即使勝率高，信賴區間(Wilson下限)也會偏低，避免高估。請把『一時的勝率』和『真正的強』分開看。" },
          { h: "強 ≠ 適合你", p: "即使是頂級牌組，也可能操作難、或需要兩張特定高稀有卡而難以組成。新手適合①操作單純(攻擊路線1〜2條)、②需要的核心卡少、③對多數對手都有效的牌組，較利於進步。" },
          { h: "依預算選擇", p: "需要大量高稀有(ex·美術)卡的牌組，要開很多包才完成。每篇牌組攻略與卡片頁都整理了『出自哪些卡包』，先從手上已有卡片能組的牌組開始，再用開包模擬器看目標卡片在哪個卡包出現多少，決定寶石花在哪。" },
          { h: "讀環境、備相剋", p: "知道現在流行什麼，就能提前準備剋制。在環境分析看集中度與屬性分布，用剋星搜尋從『對手牌組→能贏的牌組』。選牌組要同時考量『我想做什麼』與『現在什麼多』。" },
        ],
        cta: [
          { label: "🏆 牌組強度表", href: "/tcg/tier" },
          { label: "📊 環境分析", href: "/tcg/meta" },
          { label: "🎯 剋星搜尋", href: "/tcg/counters" },
        ],
      },
    },
  },
  {
    slug: "type-matchups",
    icon: "⚡",
    i18n: {
      ko: {
        title: "타입 상성·약점 완전정리 — 포켓포켓 데미지 계산",
        summary: "포켓포켓의 약점 시스템(+20)과 10개 타입, 어떤 타입이 어떤 타입에 강한지, 덱을 짤 때 약점을 어떻게 활용·대비하는지 정리했습니다.",
        sections: [
          { h: "약점은 '데미지 +20'", p: "포켓포켓의 약점은 실물 TCG처럼 데미지가 2배가 되는 게 아니라, 공격 데미지에 고정으로 +20이 더해집니다. 저항(resistance)은 없습니다. 예를 들어 물 타입 상대에게 풀 타입 공격이 30이면, 약점을 찔러 50이 됩니다. 이 +20 한 방이 승패를 가르는 경우가 많습니다." },
          { h: "10개 타입과 대표 상성", p: "타입은 풀·불꽃·물·번개·에스퍼·격투·악·강철·드래곤·노말입니다. 대표적으로 불꽃→풀·강철, 물→불꽃, 풀→물, 번개→물, 격투→악·노말(카드에 따라), 에스퍼→격투, 악→에스퍼 식으로 약점이 잡혀 있습니다. 노말·드래곤은 약점을 거의 안 받는 편이라 안정적입니다." },
          { h: "덱을 짤 때 — 공격 쪽", p: "지금 메타에 많이 보이는 덱의 타입을 알면, 그 약점을 찌르는 어태커를 넣어 유리하게 시작할 수 있습니다. 상대 상위 덱이 물 계열이 많다면 번개·풀 어태커의 가치가 오릅니다. 카운터 검색은 이 상성을 실제 승률과 함께 계산해 '이기는 덱'을 뽑아줍니다." },
          { h: "덱을 짤 때 — 방어 쪽", p: "반대로 내 메인 어태커가 특정 타입에 약점을 잡히면, 그 상대를 만났을 때 크게 불리해집니다. 약점을 안 받는 서브 어태커를 한 축 넣거나, 상대가 약점을 찌르기 전에 빠르게 포인트를 가져오는 플랜을 준비하면 상성 열세를 줄일 수 있습니다." },
        ],
        cta: [
          { label: "🎯 카운터 검색으로 상성 확인", href: "/tcg/counters" },
          { label: "📊 메타 타입 분포", href: "/tcg/meta" },
          { label: "🔍 카드 타입·약점 검색", href: "/tcg/cards" },
        ],
      },
      en: {
        title: "Type Matchups & Weakness Explained — Pocket Damage Math",
        summary: "Pocket's weakness system (+20), the 10 types, which type beats which, and how to use and defend against weakness when building a deck.",
        sections: [
          { h: "Weakness is '+20 damage'", p: "In Pocket, weakness isn't double damage like the physical TCG — it adds a flat +20 to the attack's damage. There is no resistance. For example, if a Grass attack does 30 into a Water Pokémon, hitting the weakness makes it 50. That single +20 often decides the game." },
          { h: "The 10 types and key matchups", p: "The types are Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness, Metal, Dragon and Colorless. Common weaknesses: Fire → Grass/Metal, Water → Fire, Grass → Water, Lightning → Water, Fighting → Darkness/Colorless (card-dependent), Psychic → Fighting, Darkness → Psychic. Colorless and Dragon rarely take weakness, which makes them stable." },
          { h: "Building — the offense side", p: "Knowing the types common in the current meta lets you slot an attacker that hits their weakness for a favorable start. If top opposing decks skew Water, Lightning and Grass attackers rise in value. Counter Search combines these matchups with real win rates to surface a deck that beats a given opponent." },
          { h: "Building — the defense side", p: "Conversely, if your main attacker is weak to a common type, you're at a big disadvantage into that matchup. Adding a secondary attacker that doesn't share the weakness, or a plan to take points fast before they exploit it, reduces that matchup gap." },
        ],
        cta: [
          { label: "🎯 Check matchups in Counter Search", href: "/tcg/counters" },
          { label: "📊 Meta type distribution", href: "/tcg/meta" },
          { label: "🔍 Search card type & weakness", href: "/tcg/cards" },
        ],
      },
      ja: {
        title: "タイプ相性・弱点 完全まとめ — ポケポケのダメージ計算",
        summary: "ポケポケの弱点システム(+20)と10タイプ、どのタイプがどれに強いか、デッキ構築で弱点をどう突き・どう備えるかをまとめました。",
        sections: [
          { h: "弱点は『ダメージ+20』", p: "ポケポケの弱点は紙のTCGのように2倍ではなく、攻撃ダメージに固定で+20されます。抵抗力(レジスト)はありません。例えば水タイプ相手に草の攻撃が30なら、弱点を突いて50になります。この+20の一撃が勝敗を分けることが多いです。" },
          { h: "10タイプと主な相性", p: "タイプは草・炎・水・雷・超・闘・悪・鋼・竜・無色です。代表的に炎→草/鋼、水→炎、草→水、雷→水、闘→悪/無色(カード次第)、超→闘、悪→超のように弱点が設定されています。無色・竜は弱点を受けにくく安定します。" },
          { h: "構築 — 攻め側", p: "今の環境に多いデッキのタイプを知れば、その弱点を突くアタッカーを入れて有利に始められます。相手上位が水系なら雷・草アタッカーの価値が上がります。カウンター検索はこの相性を実際の勝率と合わせて計算し『勝てるデッキ』を出します。" },
          { h: "構築 — 守り側", p: "逆に自分の主軸が特定タイプに弱点を突かれると、その相手で大きく不利になります。弱点を共有しないサブアタッカーを一軸入れる、または突かれる前に速くポイントを取るプランを用意すれば、相性の不利を減らせます。" },
        ],
        cta: [
          { label: "🎯 カウンター検索で相性確認", href: "/tcg/counters" },
          { label: "📊 メタのタイプ分布", href: "/tcg/meta" },
          { label: "🔍 カードのタイプ・弱点検索", href: "/tcg/cards" },
        ],
      },
      "zh-TW": {
        title: "屬性相剋·弱點完整整理 — Pocket 傷害計算",
        summary: "Pocket 的弱點系統(+20)、10種屬性、哪個屬性剋哪個，以及構築時如何利用與防範弱點。",
        sections: [
          { h: "弱點是『傷害+20』", p: "在 Pocket，弱點不是像實體TCG那樣傷害兩倍，而是對攻擊傷害固定+20。沒有抵抗力。例如草屬性打水屬性30，命中弱點就變50。這+20的一擊常常決定勝負。" },
          { h: "10種屬性與主要相剋", p: "屬性有草·火·水·雷·超·鬥·惡·鋼·龍·無色。常見弱點：火→草/鋼、水→火、草→水、雷→水、鬥→惡/無色(依卡片)、超→鬥、惡→超。無色與龍較不受弱點，較穩定。" },
          { h: "構築 — 進攻面", p: "知道當前環境常見牌組的屬性，就能放入攻其弱點的攻擊手，取得有利開局。若對手上位偏水系，雷·草攻擊手價值上升。剋星搜尋會結合相剋與實際勝率，找出『能贏的牌組』。" },
          { h: "構築 — 防守面", p: "反之，若你的主攻手被常見屬性打弱點，該對局會很不利。放入不共用弱點的副攻擊手，或準備在被攻弱點前快速取分的計畫，可縮小相剋劣勢。" },
        ],
        cta: [
          { label: "🎯 用剋星搜尋確認相剋", href: "/tcg/counters" },
          { label: "📊 環境屬性分布", href: "/tcg/meta" },
          { label: "🔍 搜尋卡片屬性·弱點", href: "/tcg/cards" },
        ],
      },
    },
  },
  {
    slug: "deck-builder-guide",
    icon: "🃏",
    i18n: {
      ko: {
        title: "덱 빌더 사용법 — 메타 덱에서 시작해 20장 완성하기",
        summary: "TCG Note 덱 빌더로 규칙에 맞는 20장 덱을 만들고, 필요한 팩까지 확인해 공유하는 방법을 단계별로 정리했습니다.",
        sections: [
          { h: "이 도구가 하는 일", p: "덱 빌더는 포켓포켓 덱 규칙(정확히 20장, 같은 이름 최대 2장)을 자동으로 지켜주는 도구입니다. 카드를 담는 동안 20장을 넘기거나 같은 카드를 3장째 넣으려 하면 막아주고, 덱의 속성(타입) 분포와 '이 카드들이 나오는 팩'을 실시간으로 계산해 보여줍니다. 규칙을 외울 필요 없이 완성 가능한 덱만 만들어집니다." },
          { h: "메타 덱에서 시작하기", p: "처음부터 짜기 막막하면 상단의 템플릿에서 대회 상위 메타 덱을 불러오세요. 실제 대회 성적이 좋은 덱리스트가 그대로 들어오고, 거기서 카드를 빼고 넣으며 내 취향대로 손보면 됩니다. 초보에게 가장 빠른 길은 검증된 덱을 불러와 조금씩 바꿔보는 것입니다." },
          { h: "처음부터 직접 짜기", p: "아래 카드 풀에서 이름 검색과 타입 필터로 원하는 카드를 찾아 담습니다. 메인 어태커의 진화 라인을 2장씩 갖추고, 카드를 뽑아주는 서포트·아이템을 더하면 기본 골격이 됩니다. 담을 때마다 상단 요약에서 20장 중 몇 장인지, 속성이 한쪽으로 쏠리지 않는지 바로 확인할 수 있습니다." },
          { h: "필요 팩 확인 & 공유", p: "덱을 다 짜면 '이 덱을 완성하려면 어떤 팩을 까야 하는지'가 정리됩니다 — 팩 시뮬레이터와 이어서, 젬을 쓰기 전에 목표 팩을 정할 수 있습니다. 덱은 브라우저에 자동 저장되고, 공유 버튼을 누르면 덱 구성이 담긴 링크가 복사돼 친구에게 그대로 보낼 수 있습니다." },
        ],
        cta: [
          { label: "🃏 덱 빌더 열기", href: "/tcg/deck-builder" },
          { label: "🏆 덱 티어표", href: "/tcg/tier" },
          { label: "🎰 팩 시뮬레이터", href: "/tcg/pack-sim" },
        ],
      },
      en: {
        title: "How to Use the Deck Builder — Start From a Meta Deck",
        summary: "A step-by-step guide to building a rules-legal 20-card deck in the TCG Note Deck Builder, checking the packs you need, and sharing it.",
        sections: [
          { h: "What this tool does", p: "The Deck Builder enforces Pocket's deck rules for you — exactly 20 cards, and at most 2 copies of any single name. As you add cards it blocks a 21st card or a 3rd copy, and it computes your deck's type spread and the packs those cards come from in real time. You don't have to memorize the rules; only completable decks get built." },
          { h: "Start from a meta deck", p: "If building from scratch feels daunting, load a top tournament meta deck from the template menu. A decklist with a strong real-world record drops in, and you tweak it from there by swapping cards to taste. The fastest path for a beginner is to load a proven deck and adjust it gradually." },
          { h: "Build from scratch", p: "In the card pool below, use name search and type filters to find and add the cards you want. Run 2 copies of your main attacker's evolution line, then add Supporters/Items that draw cards to form the skeleton. The summary panel shows how many of 20 you've filled and whether your types are lopsided as you go." },
          { h: "Check packs & share", p: "Once built, the tool lays out which packs you'd need to open to complete the deck — pairing with the Pack Simulator so you can pick target packs before spending gems. Your deck auto-saves in the browser, and the share button copies a link containing the full list to send to a friend as-is." },
        ],
        cta: [
          { label: "🃏 Open the Deck Builder", href: "/tcg/deck-builder" },
          { label: "🏆 Deck tier list", href: "/tcg/tier" },
          { label: "🎰 Pack Simulator", href: "/tcg/pack-sim" },
        ],
      },
      ja: {
        title: "デッキビルダーの使い方 — メタデッキから20枚を完成",
        summary: "TCG Note のデッキビルダーでルールに沿った20枚デッキを作り、必要なパックまで確認して共有する手順をまとめました。",
        sections: [
          { h: "このツールの機能", p: "デッキビルダーはポケポケのデッキルール(ちょうど20枚、同名は最大2枚)を自動で守ります。カードを入れる途中で21枚目や3枚目を入れようとすると止め、デッキのタイプ分布と『そのカードが出るパック』をリアルタイムで計算します。ルールを覚えなくても、完成できるデッキだけが作られます。" },
          { h: "メタデッキから始める", p: "一から組むのが難しければ、上部のテンプレートから大会上位のメタデッキを読み込みましょう。実際に好成績のデッキリストがそのまま入り、そこからカードを入れ替えて好みに調整します。初心者の最短ルートは、実績あるデッキを読み込んで少しずつ変えることです。" },
          { h: "一から自分で組む", p: "下のカードプールで名前検索とタイプフィルターから欲しいカードを探して入れます。メインアタッカーの進化ラインを2枚ずつ揃え、ドローできるサポート・グッズを足すと骨格ができます。入れるたびに上部の要約で20枚中何枚か、タイプが偏っていないかをすぐ確認できます。" },
          { h: "必要パック確認 & 共有", p: "組み終えると『このデッキを完成させるにはどのパックを開ければいいか』が整理されます — パック開封シミュと連携し、石を使う前に狙うパックを決められます。デッキはブラウザに自動保存され、共有ボタンで構成入りのリンクがコピーされ、そのまま友達に送れます。" },
        ],
        cta: [
          { label: "🃏 デッキビルダーを開く", href: "/tcg/deck-builder" },
          { label: "🏆 デッキティア表", href: "/tcg/tier" },
          { label: "🎰 パック開封シミュ", href: "/tcg/pack-sim" },
        ],
      },
      "zh-TW": {
        title: "牌組製作使用方法 — 從主流牌組開始組出20張",
        summary: "以 TCG Note 牌組製作組出符合規則的20張牌組、確認需要的卡包並分享的逐步指南。",
        sections: [
          { h: "這個工具的功能", p: "牌組製作會自動遵守 Pocket 的牌組規則 — 剛好20張、同名卡最多2張。加卡時若想放第21張或第3張同名卡會被擋下，並即時計算牌組的屬性分布與『這些卡出自哪些卡包』。不必背規則，只會組出能完成的牌組。" },
          { h: "從主流牌組開始", p: "若從頭組覺得困難，可從上方範本載入賽事上位主流牌組。實際成績好的牌表會直接載入，再從中換卡調成自己喜好。新手最快的方式是載入經驗證的牌組再逐步調整。" },
          { h: "從頭自己組", p: "在下方卡池用名稱搜尋與屬性篩選找出想要的卡加入。主攻手的進化系列各放2張，再加入能抽牌的支援·物品即成骨架。每次加卡都能在上方摘要立即看到20張中已放幾張、屬性是否偏一邊。" },
          { h: "確認卡包 & 分享", p: "組好後工具會列出『要完成這副牌組需開哪些卡包』— 與開包模擬器連動，讓你在花寶石前先決定目標卡包。牌組會自動存在瀏覽器，分享鈕會複製含完整牌表的連結，可直接傳給朋友。" },
        ],
        cta: [
          { label: "🃏 開啟牌組製作", href: "/tcg/deck-builder" },
          { label: "🏆 牌組強度表", href: "/tcg/tier" },
          { label: "🎰 開包模擬器", href: "/tcg/pack-sim" },
        ],
      },
    },
  },
  {
    slug: "counter-search-guide",
    icon: "⚔️",
    i18n: {
      ko: {
        title: "카운터 검색 사용법 — 상대 덱을 이기는 덱 찾기",
        summary: "상대 덱을 고르면 실제 대회 매치업 승률로 그 덱을 이기는 카운터를 찾아주는 도구입니다. 감이 아니라 실측 데이터로 상성을 읽는 법을 정리했습니다.",
        sections: [
          { h: "이 도구가 하는 일", p: "카운터 검색은 '요즘 이 덱이 많이 보이는데 뭘로 이기지?'에 답하는 도구입니다. 상대 덱을 하나 고르면, 실제 대회에서 그 덱과 맞붙었을 때 승률이 높았던 덱들을 카운터로 정렬해 보여줍니다. 특정 덱을 저격하는 덱을 미리 준비할 때 씁니다." },
          { h: "감이 아니라 실측 매치업", p: "여기서 보여주는 카운터는 개인 의견이 아니라 대회 페어링(대전 기록) 데이터에서 계산한 매치업 승률입니다. 각 카운터에는 승률과 함께 표본(경기 수)이 표시되므로, '실제로 여러 번 이겨온 상성'인지 '표본이 적어 우연일 수 있는 상성'인지 구분해서 볼 수 있습니다." },
          { h: "사용 순서", p: "① 상대(대비하고 싶은) 덱을 선택합니다. ② 그 덱을 이기는 카운터 목록이 승률순으로 나옵니다. ③ 마음에 드는 카운터를 눌러 덱 상세 공략으로 이어가면, 실제 덱리스트·플레이 순서·다른 상대별 대응까지 확인할 수 있습니다." },
          { h: "타입 상성과 함께 보기", p: "카운터 승률은 결과(누가 이겼나)를 보여주고, 그 이유의 상당 부분은 타입 약점(+20)에서 옵니다. 카운터 검색으로 '이기는 덱'을 찾은 뒤 타입 상성 가이드로 '왜 이기는지'를 이해하면, 새 카드가 나와 데이터가 아직 없을 때도 스스로 상성을 예측할 수 있습니다." },
        ],
        cta: [
          { label: "⚔️ 카운터 검색 열기", href: "/tcg/counters" },
          { label: "⚡ 타입 상성 가이드", href: "/tcg/guides/type-matchups" },
          { label: "🏆 덱 티어표", href: "/tcg/tier" },
        ],
      },
      en: {
        title: "How to Use Counter Search — Find a Deck That Beats Theirs",
        summary: "Pick an opponent's deck and this tool surfaces counters by real tournament matchup win rate. Here's how to read matchups from data, not gut feeling.",
        sections: [
          { h: "What this tool does", p: "Counter Search answers 'this deck is everywhere right now — what beats it?' Pick one opponent deck and it ranks the decks that had the highest win rate against it in real tournaments. Use it to prepare a deck that targets a specific popular archetype." },
          { h: "Real matchups, not opinion", p: "The counters shown aren't personal opinion — they're matchup win rates computed from tournament pairing (game-record) data. Each counter shows its win rate alongside the sample (number of games), so you can tell a 'proven, repeatedly-won matchup' from one that 'might be luck on a small sample.'" },
          { h: "How to use it", p: "① Select the opponent deck you want to prepare against. ② A list of counters appears, sorted by win rate. ③ Click a counter you like to open its full deck guide, where you can see the actual decklist, play sequence, and answers to other matchups." },
          { h: "Read it with type matchups", p: "Counter win rates show the result (who won); much of the reason comes from type weakness (+20). After Counter Search finds a deck that wins, use the Type Matchups guide to understand why it wins — so you can predict matchups yourself even when a new card has no data yet." },
        ],
        cta: [
          { label: "⚔️ Open Counter Search", href: "/tcg/counters" },
          { label: "⚡ Type Matchups guide", href: "/tcg/guides/type-matchups" },
          { label: "🏆 Deck tier list", href: "/tcg/tier" },
        ],
      },
      ja: {
        title: "カウンター検索の使い方 — 相手デッキに勝てるデッキを探す",
        summary: "相手デッキを選ぶと、実際の大会マッチアップ勝率でそれに勝てるカウンターを提示するツールです。感覚ではなく実測データで相性を読む方法をまとめました。",
        sections: [
          { h: "このツールの機能", p: "カウンター検索は『最近このデッキが多いけど何で勝つ?』に答えるツールです。相手デッキを1つ選ぶと、実際の大会でそのデッキと当たった際に勝率が高かったデッキをカウンターとして並べます。特定デッキを狙い撃つデッキを事前に用意するときに使います。" },
          { h: "感覚ではなく実測マッチアップ", p: "ここで示すカウンターは個人の意見ではなく、大会ペアリング(対戦記録)データから計算したマッチアップ勝率です。各カウンターには勝率と共に標本(試合数)が表示されるので、『実際に何度も勝ってきた相性』か『標本が少なく偶然かもしれない相性』かを見分けられます。" },
          { h: "使う手順", p: "①対策したい相手デッキを選択。②そのデッキに勝つカウンターが勝率順に表示。③気になるカウンターを押すとデッキ詳細攻略へ進み、実際のデッキリスト·立ち回り·他対面の対応まで確認できます。" },
          { h: "タイプ相性と一緒に見る", p: "カウンター勝率は結果(誰が勝ったか)を示し、その理由の多くはタイプ弱点(+20)から来ます。カウンター検索で『勝てるデッキ』を見つけた後、タイプ相性ガイドで『なぜ勝つか』を理解すれば、新カードでデータがまだ無いときも自分で相性を予測できます。" },
        ],
        cta: [
          { label: "⚔️ カウンター検索を開く", href: "/tcg/counters" },
          { label: "⚡ タイプ相性ガイド", href: "/tcg/guides/type-matchups" },
          { label: "🏆 デッキティア表", href: "/tcg/tier" },
        ],
      },
      "zh-TW": {
        title: "剋星搜尋使用方法 — 找出能贏對手牌組的牌組",
        summary: "選擇對手牌組，此工具以實際賽事對戰勝率提示能贏它的剋星。這裡整理如何用實測數據而非憑感覺看相剋。",
        sections: [
          { h: "這個工具的功能", p: "剋星搜尋回答『最近這副牌組很多，要用什麼贏?』選一個對手牌組，它會把在實際賽事中對上它勝率高的牌組列為剋星。用來事先準備狙擊特定流行牌型的牌組。" },
          { h: "實測對戰，不是意見", p: "此處顯示的剋星並非個人意見，而是從賽事對戰(對局記錄)數據計算的對戰勝率。每個剋星都會顯示勝率與樣本(對局數)，讓你分辨『實際多次贏過的相剋』與『樣本少可能是運氣的相剋』。" },
          { h: "使用步驟", p: "①選擇想對策的對手牌組。②能贏它的剋星依勝率排序顯示。③點選中意的剋星進入牌組詳細攻略，可看到實際牌表·出牌順序·對其他對面的對應。" },
          { h: "與屬性相剋一起看", p: "剋星勝率顯示結果(誰贏)，原因很大部分來自屬性弱點(+20)。用剋星搜尋找到『能贏的牌組』後，再用屬性相剋指南理解『為何贏』，即使新卡尚無數據時也能自行預測相剋。" },
        ],
        cta: [
          { label: "⚔️ 開啟剋星搜尋", href: "/tcg/counters" },
          { label: "⚡ 屬性相剋指南", href: "/tcg/guides/type-matchups" },
          { label: "🏆 牌組強度表", href: "/tcg/tier" },
        ],
      },
    },
  },
  {
    slug: "reading-tier-winrate",
    icon: "📊",
    i18n: {
      ko: {
        title: "덱 티어표·승률 읽는 법 — 표본과 Wilson 보정",
        summary: "TCG Note 티어는 왜 단순 승률이 아니라 표본과 Wilson 하한으로 산출하는지, 티어표와 승률·표본 숫자를 어떻게 읽어야 속지 않는지 정리했습니다.",
        sections: [
          { h: "티어는 대회 승률로 산출합니다", p: "TCG Note의 덱 티어는 개인의 감이나 인기 투표가 아니라 실제 대회 결과의 승률로 계산합니다. 최근 일정 기간·일정 규모 이상의 대회를 모아 각 덱의 사용률·승률·표본 수·상대별 매치업을 집계하고, 갱신일과 원출처(Limitless TCG)를 함께 표시합니다." },
          { h: "승률만 보면 속습니다", p: "승률이 높다고 무조건 강한 게 아닙니다. 2경기 중 2승이면 승률 100%지만 이건 우연일 가능성이 큽니다. 반대로 500경기에서 55%는 훨씬 믿을 만한 강함입니다. 즉 승률은 반드시 '몇 경기에서 나온 승률인가(표본 수)'와 함께 봐야 합니다." },
          { h: "Wilson 95% 하한이란", p: "그래서 TCG Note는 단순 승률 대신 Wilson 95% 신뢰구간의 하한값으로 티어를 매깁니다. 쉽게 말해 '표본을 감안했을 때 이 덱의 실제 실력이 최소 이 정도는 된다'는 보수적인 하한선입니다. 표본이 적으면 하한이 크게 낮아져 소표본의 반짝 승률이 과대평가되지 않고, 표본이 쌓일수록 하한이 실제 승률에 가까워집니다." },
          { h: "실전에서 읽는 법", p: "S·A 티어는 '표본도 충분하고 하한 승률도 높은' 덱이라고 보면 됩니다. 덱을 고를 때는 티어(하한)와 함께 원승률·표본 수를 같이 보고, 표본이 아주 적은 덱은 아직 '검증 중'으로 취급하세요. 갱신일을 확인해 최신 메타가 반영됐는지도 함께 보면 좋습니다." },
        ],
        cta: [
          { label: "🏆 덱 티어표 보기", href: "/tcg/tier" },
          { label: "📊 메타 환경 분석", href: "/tcg/meta" },
          { label: "🎯 덱 고르는 법", href: "/tcg/guides/pick-a-deck" },
        ],
      },
      en: {
        title: "How to Read the Tier List & Win Rates — Sample Size and Wilson",
        summary: "Why TCG Note tiers use sample size and a Wilson lower bound instead of raw win rate, and how to read the tier table and win-rate/sample numbers without being fooled.",
        sections: [
          { h: "Tiers come from tournament win rates", p: "TCG Note's deck tiers are computed from real tournament win rates — not gut feeling or a popularity vote. We aggregate recent tournaments above a size threshold to compute each deck's usage, win rate, sample size and per-opponent matchups, shown with the update date and source (Limitless TCG)." },
          { h: "Win rate alone will fool you", p: "A high win rate isn't automatically strong. Going 2-0 in 2 games is a 100% win rate, but that's likely luck. By contrast, 55% over 500 games is far more trustworthy strength. In short, always read a win rate together with 'over how many games' — the sample size." },
          { h: "What the Wilson 95% lower bound is", p: "So instead of raw win rate, TCG Note ranks tiers by the lower bound of the Wilson 95% confidence interval. Plainly: 'accounting for the sample, this deck's true strength is at least this much' — a conservative floor. A small sample drops the floor sharply so a lucky small-sample streak isn't overrated, and as games accumulate the floor rises toward the real win rate." },
          { h: "How to read it in practice", p: "Treat S/A tiers as decks with both a solid sample and a high floor win rate. When choosing a deck, read the tier (the floor) alongside the raw win rate and sample size, and treat very-small-sample decks as still 'under review.' Checking the update date to confirm the latest meta is included helps too." },
        ],
        cta: [
          { label: "🏆 View the tier list", href: "/tcg/tier" },
          { label: "📊 Meta analysis", href: "/tcg/meta" },
          { label: "🎯 How to pick a deck", href: "/tcg/guides/pick-a-deck" },
        ],
      },
      ja: {
        title: "デッキティア表・勝率の読み方 — 標本とウィルソン補正",
        summary: "TCG Note のティアがなぜ単純勝率ではなく標本とウィルソン下限で算出されるのか、ティア表と勝率・標本の数字をどう読めば騙されないかをまとめました。",
        sections: [
          { h: "ティアは大会勝率で算出", p: "TCG Note のデッキティアは個人の感覚や人気投票ではなく、実際の大会結果の勝率で計算します。直近の一定期間・一定規模以上の大会を集め、各デッキの使用率・勝率・標本数・相手別マッチアップを集計し、更新日と出典(Limitless TCG)を併記します。" },
          { h: "勝率だけ見ると騙される", p: "勝率が高い=強い、とは限りません。2試合2勝なら勝率100%ですが、これは偶然の可能性が大きいです。逆に500試合で55%ははるかに信頼できる強さです。つまり勝率は必ず『何試合での勝率か(標本数)』と一緒に見る必要があります。" },
          { h: "ウィルソン95%下限とは", p: "そこで TCG Note は単純勝率ではなくウィルソン95%信頼区間の下限値でティアを付けます。簡単に言えば『標本を踏まえると、このデッキの実力は最低でもこの程度』という保守的な下限線です。標本が少ないと下限が大きく下がり、小標本の一時的な勝率が過大評価されず、標本が増えるほど下限は実際の勝率に近づきます。" },
          { h: "実戦での読み方", p: "S・Aティアは『標本も十分で下限勝率も高い』デッキと見てよいです。デッキを選ぶ際はティア(下限)と共に元勝率・標本数も見て、標本が極端に少ないデッキはまだ『検証中』として扱いましょう。更新日を確認し最新環境が反映されているかも合わせて見るとよいです。" },
        ],
        cta: [
          { label: "🏆 デッキティア表を見る", href: "/tcg/tier" },
          { label: "📊 メタ環境分析", href: "/tcg/meta" },
          { label: "🎯 デッキの選び方", href: "/tcg/guides/pick-a-deck" },
        ],
      },
      "zh-TW": {
        title: "牌組強度表·勝率的看法 — 樣本與 Wilson 修正",
        summary: "為何 TCG Note 強度以樣本與 Wilson 下限算出而非單純勝率，以及如何看強度表與勝率·樣本數字才不會被騙。",
        sections: [
          { h: "強度以賽事勝率算出", p: "TCG Note 的牌組強度以實際賽事結果勝率計算，而非憑感覺或人氣投票。彙整近期一定期間·一定規模以上的賽事，計算各牌組的使用率·勝率·樣本數·對手別對戰，並標示更新日與來源(Limitless TCG)。" },
          { h: "只看勝率會被騙", p: "勝率高不代表一定強。2場2勝是100%勝率，但很可能是運氣。相對地500場55%是可信得多的強度。也就是說，勝率一定要和『在幾場中得出(樣本數)』一起看。" },
          { h: "什麼是 Wilson 95% 下限", p: "因此 TCG Note 以 Wilson 95% 信賴區間的下限值而非單純勝率來排強度。簡單說就是『考量樣本後，這副牌組的真實實力至少有這麼多』的保守下限。樣本少時下限會大幅降低，使小樣本的一時勝率不被高估；樣本累積越多，下限越接近實際勝率。" },
          { h: "實戰中的看法", p: "可把 S·A 視為『樣本充足且下限勝率也高』的牌組。選牌組時將強度(下限)與原勝率·樣本數一起看，樣本極少的牌組視為仍在『驗證中』。確認更新日、看是否已反映最新環境也有幫助。" },
        ],
        cta: [
          { label: "🏆 查看牌組強度表", href: "/tcg/tier" },
          { label: "📊 環境分析", href: "/tcg/meta" },
          { label: "🎯 如何選牌組", href: "/tcg/guides/pick-a-deck" },
        ],
      },
    },
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
