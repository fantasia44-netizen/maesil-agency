// 초보/전략 가이드 콘텐츠 — 포켓몬 카드 게임 Pocket. 4개국어. AdSense용 실질 콘텐츠 + 도구/티어로 연결.
// 데이터는 언어 무관 구조, 문구만 로케일별. slug로 /tcg/guides/[slug] 라우팅.
import { type Locale } from "../../../../lib/i18n";

export type GuideSection = { h: string; p: string };
export type GuideCTA = { label: string; href: string };
export type GuideBody = { title: string; summary: string; sections: GuideSection[]; cta?: GuideCTA[] };
export type Guide = { slug: string; icon: string; i18n: Record<Locale, GuideBody> };

export const GUIDES: Guide[] = [
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
          { h: "10개 타입과 대표 상성", p: "타입은 풀·불꽃·물·번개·에스퍼·격투·악·강철·드래곤·무색입니다. 대표적으로 불꽃→풀·강철, 물→불꽃, 풀→물, 번개→물, 격투→악·무색(카드에 따라), 에스퍼→격투, 악→에스퍼 식으로 약점이 잡혀 있습니다. 무색·드래곤은 약점을 거의 안 받는 편이라 안정적입니다." },
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
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
