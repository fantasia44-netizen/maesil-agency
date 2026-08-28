// GBL 가이드 데이터(3개국어) — 페이지 export 규칙 회피 위해 분리(sitemap도 여기서 import).
// slug/updated는 공유, 사람이 읽는 필드(title/desc/sections)와 keywords는 로케일별 제공.
type Section = { h?: string; p: string };
export type GuideContent = { title: string; desc: string; sections: Section[] };
type Guide = {
  updated: string;
  keywords: { ko: string[]; en: string[]; ja: string[]; "zh-TW": string[] };
  ko: GuideContent;
  en: GuideContent;
  ja: GuideContent;
  "zh-TW": GuideContent;
};

// 로케일별 콘텐츠 선택(해당 로케일 → ko 폴백).
export function guideContent(lang: string, g: Guide): GuideContent {
  return (g as unknown as Record<string, GuideContent>)[lang] || g.ko;
}
// 로케일별 keywords(해당 로케일 → ko 폴백).
export function guideKeywords(lang: string, g: Guide): string[] {
  return (g.keywords as Record<string, string[]>)[lang] || g.keywords.ko;
}

export const GUIDES: Record<string, Guide> = {
  "gbl-basics": {
    updated: "2026-08-19",
    keywords: {
      ko: ["포켓몬고 GBL", "배틀리그 입문", "GBL 하는법", "포켓몬고 PVP 기초"],
      en: ["Pokémon GO GBL", "Go Battle League beginner", "how to play GBL", "Pokémon GO PvP basics"],
      ja: ["ポケモンGO GBL", "GOバトルリーグ 入門", "GBL やり方", "ポケモンGO PvP 基礎"],
      "zh-TW": ["寶可夢GO GBL", "對戰聯盟 入門", "GBL 怎麼玩", "寶可夢GO PvP 基礎"],
    },
    ko: {
      title: "포켓몬고 GBL 입문 가이드 — 배틀리그 기본",
      desc: "포켓몬 GO 배틀리그(GBL)를 처음 시작하는 분을 위한 기본 가이드. 리그 종류, 실드, 에너지, 기술 구조를 쉽게 정리했습니다.",
      sections: [
        { p: "GBL(Go Battle League·배틀리그)은 포켓몬 GO의 실시간 3대3 대인전입니다. 두 트레이너가 각자 3마리로 구성한 파티로 겨루며, 상대 3마리를 먼저 모두 쓰러뜨리면 승리합니다. 이 글에서는 처음 시작하는 분이 알아야 할 핵심만 정리합니다." },
        { h: "1. 세 가지 리그", p: "GBL에는 CP 제한이 다른 세 리그가 있습니다. 슈퍼리그(Great, CP 1500 이하), 하이퍼리그(Ultra, CP 2500 이하), 마스터리그(Master, 제한 없음)입니다. 제한이 낮은 리그일수록 종족값보다 기술·상성 싸움이 중요해지고, 마스터리그는 전설·최고 CP 포켓몬이 주력이 됩니다." },
        { h: "2. 기술 — 빠른 기술과 차지 기술", p: "각 포켓몬은 빠른 기술 1개와 차지 기술 최대 2개를 씁니다. 빠른 기술은 계속 사용하며 에너지를 모으고, 에너지가 차면 큰 데미지의 차지 기술을 발동합니다. 어떤 기술을 배우느냐(기술배치)에 따라 같은 포켓몬도 성능이 크게 달라집니다." },
        { h: "3. 실드(방어막) 2개", p: "각자 배틀당 실드를 2번 쓸 수 있습니다. 실드는 상대의 차지 기술 데미지를 막아줍니다. 실드를 언제 쓰고 언제 아끼느냐가 GBL 실력의 핵심입니다. 상대 차지 기술을 무조건 막기보다, 큰 위협일 때 아껴 쓰는 판단이 중요합니다." },
        { h: "4. 교체와 선봉", p: "배틀 중 포켓몬을 교체할 수 있지만, 교체 후에는 일정 시간 다시 못 바꿉니다(스왑 쿨타임). 그래서 첫 번째로 내는 선봉 포켓몬 선택과, 불리할 때 안전하게 빼는 타이밍이 승패를 가릅니다." },
        { h: "5. 다음 단계", p: "기본을 익혔다면, 지금 리그에서 무엇을 많이 만나는지(실측 메타)와 어떤 포켓몬이 강한지(티어표)를 보는 것이 실전에 큰 도움이 됩니다. GBL Note의 실측 메타·티어표로 현재 유행을 확인해보세요." },
      ],
    },
    en: {
      title: "Pokémon GO GBL Beginner's Guide — Basics",
      desc: "A beginner's guide for anyone starting Pokémon GO's Go Battle League (GBL). We break down the leagues, shields, energy, and move structure in plain terms.",
      sections: [
        { p: "GBL (Go Battle League) is Pokémon GO's real-time 3-vs-3 player battle mode. Two trainers each field a party of three Pokémon, and the first to knock out all three of the opponent's Pokémon wins. This article covers just the essentials a first-timer needs to know." },
        { h: "1. The three leagues", p: "GBL has three leagues with different CP caps: the Great League (CP 1500 or below), the Ultra League (CP 2500 or below), and the Master League (no limit). The lower the cap, the more the battle comes down to movesets and type matchups rather than raw base stats; in the Master League, legendaries and the highest-CP Pokémon lead the way." },
        { h: "2. Moves — fast moves and charged moves", p: "Each Pokémon uses one fast move and up to two charged moves. You throw the fast move continuously to build energy, and once you have enough, you unleash a high-damage charged move. Which moves a Pokémon knows (its moveset) can dramatically change how the same Pokémon performs." },
        { h: "3. Two shields", p: "Each player can use two shields per battle. A shield blocks the damage of the opponent's charged move. Knowing when to throw a shield and when to save it is the core skill of GBL. Rather than blocking every charged move, the key is the judgment to hold your shields for the moves that genuinely threaten you." },
        { h: "4. Switching and your lead", p: "You can switch Pokémon during a battle, but after switching you can't switch again for a set time (the swap cooldown). Because of this, your choice of lead — the first Pokémon you send out — and your timing for safely pulling it back when you're at a disadvantage decide wins and losses." },
        { h: "5. Next steps", p: "Once you have the basics down, checking what you meet most in the current league (the live meta) and which Pokémon are strong (the tier list) helps a lot in real matches. Use GBL Note's live meta and tier list to see what's trending right now." },
      ],
    },
    ja: {
      title: "ポケモンGO GBL入門ガイド — GOバトルリーグの基本",
      desc: "ポケモンGOのGOバトルリーグ(GBL)を初めて始める方向けの基本ガイド。リーグの種類、シールド、エネルギー、技の仕組みをわかりやすく整理しました。",
      sections: [
        { p: "GBL(GOバトルリーグ)は、ポケモンGOのリアルタイム3対3の対人戦です。2人のトレーナーがそれぞれ3匹で編成したパーティで戦い、相手の3匹を先にすべて倒せば勝ちです。この記事では、初めての方が知っておくべき要点だけをまとめます。" },
        { h: "1. 3つのリーグ", p: "GBLにはCP制限が異なる3つのリーグがあります。スーパーリーグ(Great、CP1500以下)、ハイパーリーグ(Ultra、CP2500以下)、マスターリーグ(Master、制限なし)です。制限が低いリーグほど種族値より技・相性の戦いが重要になり、マスターリーグは伝説・最高CPのポケモンが主力になります。" },
        { h: "2. 技 — ノーマルアタックとゲージ技", p: "各ポケモンはノーマルアタック1つと、ゲージ技を最大2つ使います。ノーマルアタックを打ち続けてエネルギーをため、たまると大ダメージのゲージ技を発動します。どの技を覚えているか(技構成)によって、同じポケモンでも性能が大きく変わります。" },
        { h: "3. シールド(ぼうぎょ)は2枚", p: "各プレイヤーはバトルごとにシールドを2回使えます。シールドは相手のゲージ技のダメージを防ぎます。シールドをいつ使い、いつ温存するかがGBLの実力の核心です。相手のゲージ技をむやみに防ぐより、大きな脅威のときに残して使う判断が重要です。" },
        { h: "4. 交代と先発", p: "バトル中はポケモンを交代できますが、交代後は一定時間もう一度交代できません(交代のクールタイム)。そのため、最初に出す先発ポケモンの選択と、不利なときに安全に引くタイミングが勝敗を分けます。" },
        { h: "5. 次のステップ", p: "基本を身につけたら、今のリーグで何によく会うか(実測メタ)と、どのポケモンが強いか(ティア表)を見ることが実戦で大いに役立ちます。GBL Noteの実測メタ・ティア表で今の流行を確認してみましょう。" },
      ],
    },
    "zh-TW": {
      title: "寶可夢GO GBL 入門指南 — 對戰聯盟基礎",
      desc: "為初次接觸寶可夢 GO 對戰聯盟（GBL）的人準備的基礎指南。淺顯整理了聯盟種類、護盾、能量、招式結構。",
      sections: [
        { p: "GBL（Go Battle League·對戰聯盟）是寶可夢 GO 的即時 3 對 3 對人戰。兩位訓練家各以 3 隻組成的隊伍對戰，先擊倒對手 3 隻者獲勝。本文整理初學者該知道的核心重點。" },
        { h: "1. 三種聯盟", p: "GBL 有 CP 限制不同的三種聯盟：超級聯盟（Great，CP 1500 以下）、高級聯盟（Ultra，CP 2500 以下）、大師聯盟（Master，無限制）。限制越低的聯盟，比起種族值，招式·屬性相剋越重要；大師聯盟則以傳說·最高 CP 寶可夢為主力。" },
        { h: "2. 招式 — 一般招式與特殊招式", p: "每隻寶可夢使用 1 個一般招式與最多 2 個特殊招式。持續使出一般招式累積能量，能量滿了就發動高傷害的特殊招式。學會哪些招式（招式配置）會讓同一隻寶可夢的表現天差地別。" },
        { h: "3. 護盾 2 個", p: "每人每場對戰可用 2 次護盾。護盾能擋下對手特殊招式的傷害。何時用盾、何時留盾是 GBL 實力的核心。與其硬擋每個特殊招式，在重大威脅時留著使用的判斷更重要。" },
        { h: "4. 換手與先發", p: "對戰中可更換寶可夢，但換手後一段時間無法再換（換手冷卻）。因此第一隻先發寶可夢的選擇，以及劣勢時安全撤回的時機，會左右勝負。" },
        { h: "5. 下一步", p: "掌握基礎後，看看現在聯盟最常遇到什麼（實測環境）與哪些寶可夢強勢（強度表），對實戰大有幫助。用 GBL Note 的實測環境·強度表確認當前潮流吧。" },
      ],
    },
  },
  "league-cp": {
    updated: "2026-08-19",
    keywords: {
      ko: ["슈퍼리그 CP", "하이퍼리그 CP", "마스터리그", "포켓몬고 리그 제한", "GBL CP 제한"],
      en: ["Great League CP", "Ultra League CP", "Master League", "Pokémon GO league limits", "GBL CP cap"],
      ja: ["スーパーリーグ CP", "ハイパーリーグ CP", "マスターリーグ", "ポケモンGO リーグ 制限", "GBL CP制限"],
      "zh-TW": ["超級聯盟 CP", "高級聯盟 CP", "大師聯盟", "寶可夢GO 聯盟 限制", "GBL CP 限制"],
    },
    ko: {
      title: "리그별 CP 제한 — 슈퍼·하이퍼·마스터리그",
      desc: "포켓몬 GO 배틀리그의 슈퍼리그(1500)·하이퍼리그(2500)·마스터리그(무제한) CP 제한과 각 리그 특징을 정리했습니다.",
      sections: [
        { p: "GBL의 세 리그는 참가할 수 있는 포켓몬의 CP(전투력) 상한이 다릅니다. 이 제한이 각 리그의 전략과 주력 포켓몬을 완전히 다르게 만듭니다." },
        { h: "슈퍼리그 (Great League) — CP 1500 이하", p: "가장 낮은 제한이라 종족값 총량보다 상성·기술·내구가 중요합니다. 낮은 CP 안에서 스탯 균형이 좋은 포켓몬이 강세이며, 개체값(IV)도 공격이 낮고 방어·체력이 높은 쪽이 유리한 경우가 많습니다. 진입 장벽이 낮아 입문자에게 추천됩니다." },
        { h: "하이퍼리그 (Ultra League) — CP 2500 이하", p: "슈퍼리그보다 종족값이 큰 포켓몬이 등장하며, 준전설·지역 포켓몬도 활약합니다. 내구가 높은 포켓몬과 사탕·모래 투자가 어느 정도 필요해 중급자용 리그로 여겨집니다." },
        { h: "마스터리그 (Master League) — 제한 없음", p: "CP 제한이 없어 최고 종족값의 전설 포켓몬들이 주력입니다. 자시안, 디아루가·펄기아, 큐레무 등 고종족값 포켓몬이 메타를 지배하며, 최대 레벨·높은 IV·XL 사탕 투자가 성능에 직결됩니다." },
        { h: "어느 리그부터?", p: "시즌마다 열리는 리그가 로테이션됩니다. 입문자는 슈퍼리그로 상성·실드 운영을 익히고, 투자 여력이 생기면 마스터리그로 넓히는 흐름을 추천합니다. 현재 각 리그에서 무엇이 강한지는 GBL Note 티어표에서 확인할 수 있습니다." },
      ],
    },
    en: {
      title: "CP Limits by League — Great, Ultra, Master",
      desc: "The CP limits in Pokémon GO's Go Battle League — Great League (1500), Ultra League (2500), and Master League (no cap) — and what makes each distinct.",
      sections: [
        { p: "GBL's three leagues each set a different CP (Combat Power) ceiling on the Pokémon that can enter. That single cap makes each league's strategy and go-to Pokémon completely different." },
        { h: "Great League — CP 1500 or below", p: "With the lowest cap, type matchups, movesets, and bulk matter more than total base stats. Pokémon with well-balanced stats within that low CP shine, and for IVs a spread with low Attack but high Defense and HP is often the stronger choice. The low barrier to entry makes it the league we recommend for beginners." },
        { h: "Ultra League — CP 2500 or below", p: "Bigger base-stat Pokémon appear than in the Great League, and pseudo-legendaries and regional Pokémon get their time to shine. It's seen as an intermediate league, since it takes bulky Pokémon and a fair amount of Candy and Stardust investment." },
        { h: "Master League — no limit", p: "With no CP cap, the highest base-stat legendaries take the lead. High-stat Pokémon such as Zacian, Dialga, Palkia, and Kyurem dominate the meta, and maxing out level, high IVs, and XL Candy investment translate directly into performance." },
        { h: "Which league first?", p: "The active leagues rotate each season. We recommend beginners learn matchups and shield management in the Great League first, then branch out to the Master League once they have the resources to invest. You can check what's strong in each league right now on the GBL Note tier list." },
      ],
    },
    ja: {
      title: "リーグ別CP制限 — スーパー・ハイパー・マスターリーグ",
      desc: "ポケモンGOバトルリーグのスーパーリーグ(1500)・ハイパーリーグ(2500)・マスターリーグ(無制限)のCP制限と、各リーグの特徴を整理しました。",
      sections: [
        { p: "GBLの3つのリーグは、参加できるポケモンのCP(戦闘力)の上限が異なります。この制限が、各リーグの戦略と主力ポケモンをまったく違うものにします。" },
        { h: "スーパーリーグ(Great League) — CP1500以下", p: "最も低い制限のため、種族値の合計より相性・技・耐久が重要です。低いCPの中でステータスのバランスが良いポケモンが強く、個体値(IV)も攻撃が低く防御・HPが高いほうが有利な場合が多いです。参入のハードルが低く、初心者におすすめです。" },
        { h: "ハイパーリーグ(Ultra League) — CP2500以下", p: "スーパーリーグより種族値の大きいポケモンが登場し、準伝説・地域限定ポケモンも活躍します。耐久の高いポケモンと、アメ・すなの投資がある程度必要なため、中級者向けのリーグとされています。" },
        { h: "マスターリーグ(Master League) — 制限なし", p: "CP制限がないため、最高種族値の伝説ポケモンが主力です。ザシアン、ディアルガ・パルキア、キュレムなど高種族値のポケモンがメタを支配し、最大レベル・高いIV・XLアメの投資が性能に直結します。" },
        { h: "どのリーグから?", p: "シーズンごとに開催されるリーグがローテーションします。初心者はスーパーリーグで相性・シールドの運用を覚え、投資の余力ができたらマスターリーグへ広げる流れがおすすめです。今それぞれのリーグで何が強いかは、GBL Noteのティア表で確認できます。" },
      ],
    },
    "zh-TW": {
      title: "各聯盟 CP 限制 — 超級·高級·大師聯盟",
      desc: "整理寶可夢 GO 對戰聯盟的超級聯盟（1500）·高級聯盟（2500）·大師聯盟（無限制）CP 限制與各聯盟特色。",
      sections: [
        { p: "GBL 三種聯盟可參加寶可夢的 CP（戰鬥力）上限各不相同。這個限制讓各聯盟的策略與主力寶可夢完全不同。" },
        { h: "超級聯盟（Great League）— CP 1500 以下", p: "因限制最低，比起種族值總量，屬性相剋·招式·耐久更重要。在低 CP 中種族值均衡的寶可夢較強勢，個體值（IV）也常是攻擊低、防禦·HP 高的一方較有利。入門門檻低，推薦給初學者。" },
        { h: "高級聯盟（Ultra League）— CP 2500 以下", p: "會出現比超級聯盟種族值更高的寶可夢，準傳說·地區限定寶可夢也能活躍。需要高耐久寶可夢與一定程度的糖果·星塵投資，被視為中階聯盟。" },
        { h: "大師聯盟（Master League）— 無限制", p: "無 CP 限制，最高種族值的傳說寶可夢為主力。蒼響、帝牙盧卡·帕路奇亞、酋雷姆等高種族值寶可夢主宰環境，最高等級·高 IV·XL 糖果投資直接影響強度。" },
        { h: "從哪個聯盟開始？", p: "每季開放的聯盟會輪替。建議初學者先在超級聯盟練習屬性相剋·護盾運用，有投資餘力後再擴展到大師聯盟。現在各聯盟什麼強，可在 GBL Note 強度表確認。" },
      ],
    },
  },
  "iv-optimization": {
    updated: "2026-08-19",
    keywords: {
      ko: ["포켓몬고 IV", "개체값 최적화", "스탯 프로덕트", "슈퍼리그 IV", "GBL 개체값"],
      en: ["Pokémon GO IV", "IV optimization", "stat product", "Great League IV", "GBL IV"],
      ja: ["ポケモンGO 個体値", "IV 最適化", "ステータスプロダクト", "スーパーリーグ IV", "GBL 個体値"],
      "zh-TW": ["寶可夢GO 個體值", "IV 最佳化", "種族值乘積", "超級聯盟 IV", "GBL 個體值"],
    },
    ko: {
      title: "GBL 개체값(IV) 최적화 기초",
      desc: "슈퍼·하이퍼리그에서 왜 공격 IV가 낮은 개체가 유리한지, 스탯 프로덕트 개념과 IV 고르는 법을 쉽게 설명합니다.",
      sections: [
        { p: "많은 입문자가 '공격 15/15/15가 최고'라고 생각하지만, CP 제한이 있는 GBL에서는 오히려 공격 IV가 낮은 개체가 더 강한 경우가 많습니다. 왜 그런지 정리합니다." },
        { h: "CP 제한과 스탯 프로덕트", p: "CP는 공격·방어·체력을 종합한 값입니다. 같은 CP 상한(예: 슈퍼리그 1500) 안에서, 공격 IV가 낮으면 그만큼 방어·체력을 더 높인 채로 레벨을 올릴 수 있습니다. 결과적으로 공격은 조금 낮아도 전체 스탯의 곱(스탯 프로덕트)이 커져 더 오래 버티고 실드 싸움에서 유리해집니다." },
        { h: "그래서 낮은 공격이 유리", p: "슈퍼리그·하이퍼리그에서는 보통 공격 IV가 낮고 방어·체력이 높은 개체(이른바 'PVP 순위 1위 IV')를 찾습니다. 잡은 포켓몬을 순위 조회 앱이나 게임 내 PVP IV 표시로 확인해 방어·체력 위주 개체를 고르세요." },
        { h: "마스터리그는 반대", p: "CP 제한이 없는 마스터리그에서는 스탯을 최대한 높이는 게 이득이라, 공격 포함 IV가 높고 레벨(및 XL 사탕)이 높은 개체가 강합니다. 리그에 따라 원하는 IV 방향이 정반대라는 점을 기억하세요." },
        { h: "요약", p: "슈퍼·하이퍼 = 방어·체력 높은(공격 낮은) 개체, 마스터 = 전반적으로 높은 개체 + 고레벨. 어떤 포켓몬을 키울지는 티어표와 실측 픽률로 우선순위를 정하면 사탕·모래 낭비를 줄일 수 있습니다." },
      ],
    },
    en: {
      title: "GBL IV Optimization Basics",
      desc: "Why a low-Attack IV Pokémon is often stronger in the Great and Ultra Leagues — explained through the stat product concept and how to pick IVs.",
      sections: [
        { p: "Many beginners assume a 15/15/15 'hundo' is best, but in CP-capped GBL a Pokémon with a low Attack IV is often the stronger one. Here's why." },
        { h: "CP caps and the stat product", p: "CP is a single number combining Attack, Defense, and HP. Within the same CP ceiling (say, 1500 in the Great League), a lower Attack IV lets you push the level higher while keeping Defense and HP up. The result: Attack is slightly lower, but the product of all your stats (the stat product) is larger, so you last longer and gain an edge in the shield battle." },
        { h: "So low Attack wins out", p: "In the Great and Ultra Leagues, players usually hunt for a Pokémon with low Attack but high Defense and HP — the so-called 'rank 1 PvP IV.' Check your caught Pokémon with a ranking app or the in-game PvP IV display, and pick the Defense- and HP-heavy ones." },
        { h: "The Master League is the opposite", p: "In the uncapped Master League, maxing out stats is what pays off, so a Pokémon with high IVs — Attack included — and a high level (plus XL Candy) is the strong one. Remember that the ideal IV direction is exactly the opposite depending on the league." },
        { h: "Summary", p: "Great/Ultra = high Defense and HP (low Attack) spreads; Master = high across the board plus high level. Let the tier list and live pick rates set your priorities for which Pokémon to build, and you'll waste less Candy and Stardust." },
      ],
    },
    ja: {
      title: "GBL 個体値(IV)最適化の基礎",
      desc: "スーパー・ハイパーリーグでなぜ攻撃IVが低い個体が有利なのか、ステータスプロダクトの考え方とIVの選び方をわかりやすく説明します。",
      sections: [
        { p: "多くの初心者は「15/15/15の理想個体が最強」と思いがちですが、CP制限のあるGBLでは、むしろ攻撃IVが低い個体のほうが強い場合が多いです。その理由を整理します。" },
        { h: "CP制限とステータスプロダクト", p: "CPは攻撃・防御・HPを総合した値です。同じCP上限(例:スーパーリーグ1500)の中で、攻撃IVが低ければその分、防御・HPを高めたままレベルを上げられます。結果として攻撃は少し低くても、全体のステータスの積(ステータスプロダクト)が大きくなり、より長く耐えてシールドの戦いで有利になります。" },
        { h: "だから低い攻撃が有利", p: "スーパーリーグ・ハイパーリーグでは通常、攻撃IVが低く防御・HPが高い個体(いわゆる「PvPランキング1位のIV」)を探します。捕まえたポケモンをランキング確認アプリやゲーム内のPvP用IV表示でチェックし、防御・HP重視の個体を選びましょう。" },
        { h: "マスターリーグは逆", p: "CP制限のないマスターリーグでは、ステータスを最大限に高めるのが得なため、攻撃を含めIVが高く、レベル(およびXLアメ)が高い個体が強いです。リーグによって求めるIVの方向が正反対だという点を覚えておきましょう。" },
        { h: "まとめ", p: "スーパー・ハイパー=防御・HPが高い(攻撃が低い)個体、マスター=全体的に高い個体+高レベル。どのポケモンを育てるかはティア表と実測ピック率で優先順位を決めれば、アメ・すなの無駄を減らせます。" },
      ],
    },
    "zh-TW": {
      title: "GBL 個體值（IV）最佳化基礎",
      desc: "淺白說明為何超級·高級聯盟中攻擊 IV 低的個體較有利，以及種族值乘積概念與挑選 IV 的方法。",
      sections: [
        { p: "許多初學者以為「攻擊 15/15/15 最強」，但在有 CP 限制的 GBL 中，攻擊 IV 低的個體反而更強的情況很多。以下說明原因。" },
        { h: "CP 限制與種族值乘積", p: "CP 是綜合攻擊·防禦·HP 的數值。在同一 CP 上限（例：超級聯盟 1500）內，攻擊 IV 越低，就能在保持較高防禦·HP 的同時把等級拉高。結果攻擊雖略低，但整體數值的乘積（種族值乘積）更大，能撐更久、在護盾對決中更有利。" },
        { h: "所以低攻擊較有利", p: "在超級聯盟·高級聯盟通常會找攻擊 IV 低、防禦·HP 高的個體（俗稱「PvP 排名第 1 的 IV」）。用排名查詢 App 或遊戲內 PvP IV 顯示確認捕捉到的寶可夢，挑選防禦·HP 為主的個體。" },
        { h: "大師聯盟相反", p: "無 CP 限制的大師聯盟中，盡量拉高數值才划算，因此含攻擊在內 IV 高、等級（及 XL 糖果）高的個體較強。請記住依聯盟不同，想要的 IV 方向正好相反。" },
        { h: "總結", p: "超級·高級＝防禦·HP 高（攻擊低）的個體；大師＝整體高的個體＋高等級。要養哪隻寶可夢，用強度表與實測使用率決定優先順序，就能減少糖果·星塵的浪費。" },
      ],
    },
  },
  "party-building": {
    updated: "2026-08-19",
    keywords: {
      ko: ["GBL 파티", "포켓몬고 조합", "배틀리그 파티 구성", "안티메타", "포켓몬고 파티 짜기"],
      en: ["GBL team", "Pokémon GO team comp", "Go Battle League team building", "anti-meta", "Pokémon GO party building"],
      ja: ["GBL パーティ", "ポケモンGO 構成", "バトルリーグ パーティ構成", "アンチメタ", "ポケモンGO パーティ 組み方"],
      "zh-TW": ["GBL 隊伍", "寶可夢GO 組合", "對戰聯盟 隊伍組成", "反環境", "寶可夢GO 隊伍搭配"],
    },
    ko: {
      title: "GBL 파티 구성법 — 선봉·에이스·마무리",
      desc: "포켓몬 GO 배틀리그 3마리 파티를 짜는 기본 틀. 선봉·안티메타·안전 교체(마무리) 역할과 상성 코어를 설명합니다.",
      sections: [
        { p: "GBL은 3마리 파티의 상성 조합 싸움입니다. 좋은 파티는 세 마리가 서로의 약점을 메워, 어떤 상대가 나와도 대응할 수 있게 짜입니다. 기본 틀을 소개합니다." },
        { h: "1. 선봉 (리드)", p: "가장 먼저 내는 포켓몬입니다. 지금 메타에서 많이 나오는 상대에게 두루 무난한, 상성 손해가 적은 포켓몬이 좋습니다. 실측 픽률 상위 포켓몬에게 강한 선봉을 고르면 초반 유리하게 시작할 수 있습니다." },
        { h: "2. 에이스·안티메타", p: "메타 상위 포켓몬을 저격하는 역할입니다. 자주 만나는 강한 포켓몬(티어 S·실측 상위)을 확실히 잡는 카운터를 넣으면, 상대가 그 포켓몬을 꺼냈을 때 크게 이득을 봅니다." },
        { h: "3. 마무리·안전 교체", p: "불리할 때 안전하게 빼서 낼 수 있는, 약점이 적고 뒷심이 좋은 포켓몬입니다. 상대 실드가 빠진 후반에 차지 기술로 마무리하는 역할을 맡습니다." },
        { h: "상성 코어", p: "세 마리의 약점이 서로 겹치지 않게 하는 것이 핵심입니다. 예를 들어 한 마리가 땅 타입에 약하면, 다른 두 마리는 땅에 강하거나 땅을 잡을 수 있어야 합니다. 각 포켓몬의 카운터·잘 잡는 상대는 GBL Note 포켓몬 상세 페이지에서 확인할 수 있습니다." },
        { h: "실전 팁", p: "완벽한 파티는 없습니다. 지금 리그의 실측 메타를 보고 '내가 자주 만나는 상대'에 맞춰 조정하는 것이 승률을 올리는 가장 빠른 길입니다." },
      ],
    },
    en: {
      title: "GBL Team Building — Lead, Ace, and Closer",
      desc: "The framework for building a three-Pokémon party in Pokémon GO's Go Battle League — the lead, anti-meta, and safe-switch (closer) roles.",
      sections: [
        { p: "GBL is a battle of three-Pokémon parties and their type synergy. A good party is built so the three cover each other's weaknesses, letting you respond no matter what the opponent brings. Here's the basic framework." },
        { h: "1. The lead", p: "The Pokémon you send out first. You want one that's broadly serviceable against the opponents common in the current meta and rarely loses a matchup badly. Pick a lead that's strong against the top pick-rate Pokémon, and you can start the battle with an early edge." },
        { h: "2. The ace and anti-meta", p: "This slot exists to snipe the top-meta Pokémon. Slot in a counter that reliably beats the strong Pokémon you meet often (S-tier, top of the live rankings), and you gain a big advantage whenever the opponent leads with that Pokémon." },
        { h: "3. The closer and safe switch", p: "A Pokémon with few weaknesses and strong staying power that you can switch to safely when you're behind. Its job is to close out the game with charged moves in the late stage, once the opponent's shields are gone." },
        { h: "Type-coverage cores", p: "The key is making sure the three Pokémon's weaknesses don't overlap. For example, if one is weak to Ground, the other two should resist Ground or be able to beat Ground types. You can check each Pokémon's counters and favorable matchups on the GBL Note Pokémon detail pages." },
        { h: "A practical tip", p: "There's no perfect party. Looking at the current league's live meta and tuning your team to 'the opponents you actually meet often' is the fastest way to raise your win rate." },
      ],
    },
    ja: {
      title: "GBL パーティ構成法 — 先発・エース・締め",
      desc: "ポケモンGOバトルリーグの3匹パーティを組む基本の型。先発・アンチメタ・安全交代(締め)の役割と、相性のコアを説明します。",
      sections: [
        { p: "GBLは3匹パーティの相性の組み合わせの戦いです。良いパーティは3匹が互いの弱点を補い、どんな相手が出てきても対応できるように組まれます。基本の型を紹介します。" },
        { h: "1. 先発(リード)", p: "最初に出すポケモンです。今のメタでよく出てくる相手に対して一通り無難で、相性負けが少ないポケモンが良いです。実測ピック率上位のポケモンに強い先発を選べば、序盤を有利に始められます。" },
        { h: "2. エース・アンチメタ", p: "メタ上位のポケモンを狙い撃つ役割です。よく遭遇する強いポケモン(Sティア・実測上位)を確実に倒せるカウンターを入れておくと、相手がそのポケモンを出したときに大きく得をします。" },
        { h: "3. 締め・安全交代", p: "不利なときに安全に引いて出せる、弱点が少なく後半に強いポケモンです。相手のシールドが切れた終盤に、ゲージ技で締める役割を担います。" },
        { h: "相性のコア", p: "3匹の弱点が互いに重ならないようにするのが核心です。例えば1匹がじめんタイプに弱いなら、他の2匹はじめんに強いか、じめんを倒せる必要があります。各ポケモンのカウンター・有利な相手は、GBL Noteのポケモン詳細ページで確認できます。" },
        { h: "実戦のヒント", p: "完璧なパーティはありません。今のリーグの実測メタを見て、「自分がよく会う相手」に合わせて調整することが、勝率を上げる一番の近道です。" },
      ],
    },
    "zh-TW": {
      title: "GBL 隊伍組成法 — 先發·王牌·收尾",
      desc: "組成寶可夢 GO 對戰聯盟 3 隻隊伍的基本框架。說明先發·反環境·安全換手（收尾）的角色與屬性相剋核心。",
      sections: [
        { p: "GBL 是 3 隻隊伍的屬性相剋組合對決。好的隊伍讓三隻互補弱點，無論對手出什麼都能應對。以下介紹基本框架。" },
        { h: "1. 先發（Lead）", p: "最先派出的寶可夢。最好選對現在環境常見對手都能應付、相剋吃虧少的寶可夢。挑一隻剋制實測使用率前段寶可夢的先發，就能在開局取得優勢。" },
        { h: "2. 王牌·反環境", p: "狙殺環境上位寶可夢的角色。放進能確實擊倒常遇到的強勢寶可夢（S 強度·實測上位）的剋星，當對手派出那隻時就能大占便宜。" },
        { h: "3. 收尾·安全換手", p: "劣勢時能安全撤出再派上、弱點少且後勁強的寶可夢。負責在對手護盾用完的後期，用特殊招式收尾。" },
        { h: "屬性相剋核心", p: "讓三隻的弱點不互相重疊是關鍵。例如一隻怕地面屬性，另外兩隻就要能抗地面或剋制地面。各寶可夢的剋星·擅長對手可在 GBL Note 寶可夢詳細頁面確認。" },
        { h: "實戰小訣竅", p: "沒有完美的隊伍。看現在聯盟的實測環境，依「自己常遇到的對手」調整，是提升勝率最快的捷徑。" },
      ],
    },
  },
};
