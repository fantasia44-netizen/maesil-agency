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
  "type-chart": {
    updated: "2026-09-03",
    keywords: {
      ko: ["포켓몬고 타입 상성표", "포켓몬고 약점표", "포켓몬고 타입 약점", "포켓몬고 상성", "포켓몬고 이중약점", "포켓몬고 타입 배율"],
      en: ["Pokémon GO type chart", "Pokémon GO weakness chart", "Pokémon GO type effectiveness", "Pokémon GO type weaknesses", "Pokémon GO double weakness", "GO type multipliers"],
      ja: ["ポケモンGO タイプ相性表", "ポケモンGO 弱点表", "ポケモンGO タイプ弱点", "ポケモンGO 相性", "ポケモンGO 二重弱点", "GO タイプ倍率"],
      "zh-TW": ["寶可夢GO 屬性相剋表", "寶可夢GO 弱點表", "寶可夢GO 屬性弱點", "寶可夢GO 相剋", "寶可夢GO 雙重弱點", "GO 屬性倍率"],
    },
    ko: {
      title: "포켓몬GO 타입 상성·약점표 — 18타입 한눈에 (GO 배율 기준)",
      desc: "포켓몬 GO 배틀리그·레이드의 18타입 약점·반감·이중반감·공격 강점을 한 표로 정리했습니다. 원작과 다른 GO 배율(효과굉장 ×1.6, 반감 ×0.625, 이중약점 ×2.56, 이중반감 ×0.39) 기준입니다.",
      sections: [
        { p: "타입 상성은 배틀리그(PvP)든 레이드(PvE)든 승패의 핵심입니다. 상대의 약점을 찌르는 기술은 데미지가 크게 오르고, 반감·이중반감 관계면 크게 줄어듭니다. 아래에 18타입 각각의 약점·반감·이중반감·공격 강점을 표로 정리했으니, 교체 타이밍과 기술 선택에 활용하세요." },
        { h: "GO 배율은 원작과 다릅니다", p: "포켓몬 GO는 원작(2배·0.5배·0배)과 달리 — 효과굉장(약점) ×1.6, 반감 ×0.625, 원작에서 '무효(0배)'인 관계도 GO에서는 ×0.390625로 완전 무효가 없습니다. 자속(STAB)은 ×1.2입니다. (자세한 계산은 'PvP 계산법' 가이드 참고)" },
        { h: "이중타입은 곱연산", p: "타입이 둘인 포켓몬은 각 타입 배율을 곱합니다. 양쪽 다 약점인 공격은 이중약점 ×2.56(1.6×1.6), 양쪽 다 반감이면 ×0.39(0.625×0.625)입니다. 그래서 같은 '약점'이라도 이중약점 상대에겐 데미지가 훨씬 큽니다." },
        { h: "표 보는 법", p: "아래 각 타입 카드는 방어 기준입니다 — 빨강 '약점 ×1.6'은 이 타입이 맞으면 아픈 공격 타입, 파랑 '반감 ×0.625'은 이 타입이 잘 버티는 공격, 회색 '이중반감 ×0.39'는 거의 안 통하는 공격입니다. 초록 '공격 강점'은 반대로 이 타입 기술이 효과굉장으로 찌르는 상대 타입입니다." },
      ],
    },
    en: {
      title: "Pokémon GO Type Chart & Weakness Table — All 18 Types (GO Multipliers)",
      desc: "The weaknesses, resistances, double-resists and offensive coverage of all 18 types for Pokémon GO's Battle League and raids, in one chart — using GO's multipliers (super-effective ×1.6, resist ×0.625, double weak ×2.56, double resist ×0.39).",
      sections: [
        { p: "Type matchups decide battles in both PvP (Battle League) and PvE (raids). Hitting a weakness boosts damage a lot; a resisted or double-resisted matchup cuts it hard. Below is every one of the 18 types with its weaknesses, resistances, double-resists and offensive coverage — use it for switch timing and move choices." },
        { h: "GO multipliers differ from the main games", p: "Unlike the main series (×2 / ×0.5 / ×0), Pokémon GO uses super-effective ×1.6, resisted ×0.625, and even 'immune (×0)' relationships deal ×0.390625 — there is no true immunity. STAB is ×1.2. (See the 'PvP damage math' guide for full details.)" },
        { h: "Dual types multiply", p: "A dual-type Pokémon multiplies each type's factor. An attack that both types are weak to is doubly super-effective ×2.56 (1.6×1.6); one both resist is ×0.39 (0.625×0.625). So the same 'weakness' hits far harder against a double-weak target." },
        { h: "How to read the chart", p: "Each type card below is defensive — red 'Weak ×1.6' are the attack types that hurt it, blue 'Resist ×0.625' are what it tanks well, grey 'Double resist ×0.39' barely does anything. Green 'Strong vs' is the reverse: the types this type's moves hit super-effectively." },
      ],
    },
    ja: {
      title: "ポケモンGO タイプ相性・弱点表 — 全18タイプ一覧（GO倍率）",
      desc: "ポケモンGOのバトルリーグ・レイド向けに、全18タイプの弱点・半減・二重半減・攻撃有利を1つの表に整理。原作と異なるGO倍率（効果抜群×1.6、半減×0.625、二重弱点×2.56、二重半減×0.39）基準です。",
      sections: [
        { p: "タイプ相性はPvP（バトルリーグ）でもPvE（レイド）でも勝敗の核心です。弱点を突く技はダメージが大きく上がり、半減・二重半減なら大きく下がります。以下に全18タイプの弱点・半減・二重半減・攻撃有利を表にまとめたので、交代タイミングや技選びに活用してください。" },
        { h: "GO倍率は原作と異なります", p: "原作（×2・×0.5・×0）と違い、ポケモンGOは効果抜群×1.6、半減×0.625、原作で「無効（×0）」の関係もGOでは×0.390625で完全無効はありません。タイプ一致（STAB）は×1.2です。（詳しい計算は「PvP計算」ガイド参照）" },
        { h: "複合タイプは掛け算", p: "2タイプのポケモンは各タイプの倍率を掛けます。両タイプとも弱点の攻撃は二重弱点×2.56（1.6×1.6）、両方半減なら×0.39（0.625×0.625）。同じ「弱点」でも二重弱点相手にはダメージが大きくなります。" },
        { h: "表の見方", p: "以下の各タイプカードは防御基準です — 赤「弱点×1.6」はこのタイプに刺さる攻撃タイプ、青「半減×0.625」はよく耐える攻撃、灰「二重半減×0.39」はほぼ通らない攻撃です。緑「攻撃で有利」は逆に、このタイプの技が効果抜群で突く相手タイプです。" },
      ],
    },
    "zh-TW": {
      title: "寶可夢GO 屬性相剋·弱點表 — 全18屬性一覽（GO倍率）",
      desc: "為寶可夢GO對戰聯盟·團體戰整理全18屬性的弱點·抵抗·雙重抵抗·攻擊剋制於一表。採用與原作不同的GO倍率（效果絕佳×1.6、抵抗×0.625、雙重弱點×2.56、雙重抵抗×0.39）。",
      sections: [
        { p: "屬性相剋在PvP（對戰聯盟）與PvE（團體戰）都是勝敗核心。攻擊弱點傷害大增，抵抗·雙重抵抗則大減。以下整理全18屬性的弱點·抵抗·雙重抵抗·攻擊剋制，供換場時機與招式選擇參考。" },
        { h: "GO倍率與原作不同", p: "與原作（×2・×0.5・×0）不同，寶可夢GO為效果絕佳×1.6、抵抗×0.625，原作中「無效（×0）」在GO也是×0.390625，沒有完全無效。本系（STAB）為×1.2。（詳細計算見「PvP計算」指南）" },
        { h: "雙屬性為相乘", p: "雙屬性寶可夢將各屬性倍率相乘。兩屬性皆弱的攻擊為雙重弱點×2.56（1.6×1.6），兩者皆抵抗則×0.39（0.625×0.625）。因此同樣是「弱點」，對雙重弱點目標傷害大得多。" },
        { h: "看表方式", p: "以下各屬性卡以防禦為基準 — 紅「弱點×1.6」是剋制此屬性的攻擊屬性，藍「抵抗×0.625」是能扛的攻擊，灰「雙重抵抗×0.39」幾乎無傷。綠「攻擊剋制」相反，是此屬性招式效果絕佳的對象屬性。" },
      ],
    },
  },
  "cct": {
    updated: "2026-09-03",
    keywords: {
      ko: ["포켓몬고 CCT", "CCT 계산법", "포켓몬고 평할", "차지무브 타이밍", "CCT 턴수 표", "포켓몬고 차지 타이밍", "포켓몬고 패스트무브 턴"],
      en: ["Pokémon GO CCT", "Circle Control Tactic", "charged move timing", "fast move timing", "CCT turn table", "fast move turns", "Pokémon GO PvP timing"],
      ja: ["ポケモンGO CCT", "サークルコントロール", "チャージ技 タイミング", "通常攻撃 ターン", "CCT 計算", "チャージ タイミング", "ポケモンGO PvP タイミング"],
      "zh-TW": ["寶可夢GO CCT", "大招時機", "平A時機", "CCT 計算", "平A回合", "寶可夢GO PvP 時機", "循環控制"],
    },
    ko: {
      title: "포켓몬GO CCT 타이밍 완벽 정리 — 상대 평할 차단 차지 타이밍",
      desc: "배틀리그 고급 테크닉 CCT(Circle Control Tactic)를 매치업별 표로 정리했습니다. 내 평타·상대 평타 턴수에 맞춰 몇 번째 평타 뒤에 차지를 눌러야 상대에게 여분의 평타(평할)를 안 주는지 한눈에.",
      sections: [
        { p: "CCT(Circle Control Tactic)는 차지무브 타이밍을 조절해 상대에게 여분의 평타(속칭 '평할')를 주지 않는 배틀리그 고급 테크닉입니다. 차지무브를 쓰면 상대 패스트무브(평타)의 쿨타임이 리셋되는데, 아무 때나 누르면 이 리셋 때문에 상대가 평타를 한 대 더 공짜로 얻습니다. 내 평타와 상대 평타의 턴수에 맞춰 '정해진 번째 평타' 뒤에 차지를 눌러 이 손해를 0으로 막는 게 CCT입니다." },
        { h: "원리 — 차지무브는 상대 평타 쿨을 리셋한다", p: "포켓몬 GO의 1턴은 0.5초이고, 패스트무브는 기술마다 1~5턴 길이가 다릅니다(예: 머드샷 1턴, 카운터 2턴, 볼트체인지 4턴, 불태우기 5턴). 두 포켓몬의 평타 길이가 다르면 서로의 '턴 시계'가 어긋나는데, 이때 차지무브가 상대 평타 쿨을 리셋하면서 타이밍에 따라 상대가 평타 1대를 더 넣을 여지가 생깁니다. 반대로 상대 평타가 막 나간(쿨 0) 순간에 차지를 누르면 리셋해도 0이라 손해가 없습니다." },
        { h: "표 보는 법 — 몇 번째 평타 뒤에 차지?", p: "위 표는 '내 평타 턴수 × 상대 평타 턴수'별로, 내 평타를 몇 번째 친 뒤에 차지무브를 눌러야 평할이 안 나는지를 보여줍니다. 예를 들어 내 평타가 2턴이고 상대가 3턴이면 1·4·7번째 평타 뒤에 차지하면 됩니다. 같은 턴수(미러)거나 상대가 1턴이면 언제 눌러도 안전합니다. 실전에서 카운트를 놓쳤다면 내 포켓몬이 받는 데미지 틱을 지표로 삼을 수도 있습니다." },
        { h: "공식 — 최소공배수 기반", p: "표는 암기용이지만 원리는 간단합니다. 반복 주기 P = 상대 턴수 ÷ 최대공약수(내 턴수, 상대 턴수)이고, 그 주기마다 안전한 평타가 되풀이됩니다. 그래서 매치업마다 '홀수 번째', '1·4·7', '2·5·8'처럼 규칙적인 수열이 나옵니다. 이 페이지의 도구는 이 공식을 그대로 계산해 매치업만 고르면 답을 보여줍니다." },
        { h: "출처", p: "CCT 턴수 표는 포켓몬 GO 배틀리그 커뮤니티에서 정리·공유된 계산법을 기반으로 합니다. 본 페이지는 이를 4개 언어로 정리한 해설과, 매치업별 타이밍(최소공배수 공식)을 자동 산출하는 도구입니다." },
      ],
    },
    en: {
      title: "Pokémon GO CCT Timing Guide — Deny the Opponent's Free Fast Move",
      desc: "The advanced Battle League technique CCT (Circle Control Tactic) as a matchup table — tap your charged move after the right fast-move count so the opponent never gets a free fast move.",
      sections: [
        { p: "CCT (Circle Control Tactic) is an advanced Battle League technique: you time your charged move so the opponent never gets an extra 'free' fast move. Throwing a charged move resets the cooldown of the opponent's fast move, and if you tap it at the wrong moment that reset lets them squeeze in one more fast move for free. CCT means tapping your charge after a specific fast-move count — based on both fast-move lengths — so that loss becomes zero." },
        { h: "The mechanic — a charged move resets the opponent's fast-move cooldown", p: "One turn in Pokémon GO is 0.5s, and fast moves are 1–5 turns long (e.g. Mud Shot 1 turn, Counter 2 turns, Volt Switch 4 turns, Incinerate 5 turns). When two Pokémon have different fast-move lengths their 'turn clocks' drift apart, and a charged move resetting the opponent's fast-move cooldown can hand them an extra fast move depending on timing. Tap the charge right when their fast move just fired (cooldown 0) and the reset does nothing — no loss." },
        { h: "Reading the table — after which fast move do I charge?", p: "The table above shows, for each 'my fast-move turns × opponent fast-move turns', after how many of your fast moves you should tap the charged move to avoid giving up a free one. For example, if your fast move is 2 turns and the opponent's is 3, charge after your 1st, 4th, 7th fast move. If both are the same length (mirror) or the opponent is 1-turn, you're safe anytime. If you lose count mid-battle, the damage tick on your own Pokémon can serve as an indicator." },
        { h: "The formula — based on the least common multiple", p: "The table is for memorizing, but the rule is simple. The repeat period P = opponent turns ÷ greatest-common-divisor(my turns, opponent turns), and a safe fast move recurs every period. That is why each matchup gives a clean sequence like 'odd numbers', '1·4·7' or '2·5·8'. The tool on this page runs that formula directly — just pick the matchup." },
        { h: "Credits", p: "The CCT turn table is based on the calculation method compiled and shared by the Pokémon GO Battle League community. This page is a four-language explainer plus a tool that computes the timing (via the least-common-multiple formula) for each matchup automatically." },
      ],
    },
    ja: {
      title: "ポケモンGO CCT タイミング完全ガイド — 相手の献上を防ぐチャージ",
      desc: "バトルリーグの上級テクニックCCT（Circle Control Tactic）をマッチアップ表で整理。自分と相手の通常攻撃ターン数に応じて何回目の通常攻撃の後にチャージすれば相手に献上しないか、ひと目で分かります。",
      sections: [
        { p: "CCT（Circle Control Tactic）は、チャージ技のタイミングを調整して相手に余分な通常攻撃（いわゆる「献上」）を与えないバトルリーグの上級テクニックです。チャージ技を撃つと相手の通常攻撃のクールタイムがリセットされ、適当なタイミングで押すとそのリセットのせいで相手が通常攻撃を1回タダで得ます。自分と相手の通常攻撃ターン数に合わせて「決まった回数目」の後にチャージを押し、この損を0にするのがCCTです。" },
        { h: "原理 — チャージ技は相手の通常攻撃クールをリセットする", p: "ポケモンGOの1ターンは0.5秒で、通常攻撃は技ごとに1〜5ターンの長さがあります（例：マッドショット1ターン、カウンター2ターン、ボルトチェンジ4ターン、やきつくす5ターン）。2匹の通常攻撃の長さが違うと互いの「ターン時計」がずれ、チャージ技が相手の通常攻撃クールをリセットする際、タイミングによって相手が通常攻撃を1回多く入れる余地が生まれます。逆に相手の通常攻撃が撃たれた直後（クール0）にチャージを押せば、リセットしても0なので損はありません。" },
        { h: "表の見方 — 何回目の通常攻撃の後にチャージ？", p: "上の表は「自分の通常ターン数 × 相手の通常ターン数」ごとに、自分の通常攻撃を何回目に撃った後でチャージ技を押せば献上しないかを示します。例えば自分の通常が2ターンで相手が3ターンなら、1・4・7回目の後にチャージ。同じターン数（ミラー）や相手が1ターンならいつでも安全です。実戦でカウントを見失ったら、自分のポケモンが受けるダメージのタイミングを指標にできます。" },
        { h: "公式 — 最小公倍数ベース", p: "表は暗記用ですが原理は単純です。繰り返し周期 P = 相手ターン数 ÷ 最大公約数(自分ターン数, 相手ターン数) で、その周期ごとに安全な通常攻撃が繰り返します。だから各マッチアップで「奇数回目」「1・4・7」「2・5・8」のような規則的な数列になります。このページのツールはこの公式をそのまま計算し、マッチアップを選ぶだけで答えを表示します。" },
        { h: "出典", p: "CCTターン表はポケモンGOバトルリーグのコミュニティで整理・共有された計算法を基にしています。本ページはこれを4言語で整理した解説と、マッチアップごとのタイミング（最小公倍数の公式）を自動計算するツールです。" },
      ],
    },
    "zh-TW": {
      title: "寶可夢GO CCT 時機完全指南 — 阻止對手免費平A",
      desc: "將對戰聯盟高階技巧CCT（Circle Control Tactic）整理成對戰表——依我方與對手平A回合數，在第幾次平A後放大招才不會送對手免費平A，一目了然。",
      sections: [
        { p: "CCT（Circle Control Tactic）是對戰聯盟的高階技巧：調整大招時機，讓對手拿不到多餘的免費平A。放大招會重置對手平A的冷卻，若隨意亂放，這個重置會讓對手多賺一次免費平A。CCT就是依我方與對手的平A回合數，在「特定次數」的平A後才放大招，把這個損失歸零。" },
        { h: "原理 — 大招會重置對手平A的冷卻", p: "寶可夢GO一回合為0.5秒，平A依招式有1〜5回合長度（例：泥巴射擊1回合、地球上投2回合、伏特替換4回合、燒盡5回合）。兩隻寶可夢平A長度不同時，彼此的「回合時鐘」會錯開；此時大招重置對手平A冷卻，會依時機讓對手多打一次平A。反之，在對手平A剛打出（冷卻0）的瞬間放大招，重置後仍是0，就沒有損失。" },
        { h: "看表方式 — 第幾次平A後放大招？", p: "上表依「我方平A回合數 × 對手平A回合數」，列出你要在第幾次平A後放大招才不會送對手免費平A。例如我方平A為2回合、對手為3回合，就在第1·4·7次平A後放大招。同回合數（鏡像）或對手為1回合時隨時安全。實戰若數錯，可用自己寶可夢受到傷害的節奏當指標。" },
        { h: "公式 — 以最小公倍數為基礎", p: "表是給你背的，但原理很簡單。重複週期 P = 對手回合數 ÷ 最大公因數(我方回合數, 對手回合數)，每個週期會重複出現安全的平A。因此每個對戰都得到「奇數次」「1·4·7」「2·5·8」這類規律數列。本頁工具直接套用這個公式，只要選對戰就給答案。" },
        { h: "來源", p: "CCT回合表以寶可夢GO對戰聯盟社群整理·分享的計算法為基礎。本頁是將其以四種語言整理的解說，並附上自動計算各對戰時機（最小公倍數公式）的工具。" },
      ],
    },
  },
  "moveset": {
    updated: "2026-09-03",
    keywords: {
      ko: ["포켓몬고 기술배치", "PvP 추천 기술배치", "포켓몬고 무브셋", "빠른기술 차지기술", "기술 고르는 법", "포켓몬고 베이팅", "DPT EPT"],
      en: ["Pokémon GO moveset", "best PvP moveset", "fast move charged move", "how to choose moves", "Pokémon GO baiting", "DPT EPT DPE"],
      ja: ["ポケモンGO 技構成", "PvP 技構成", "ノーマルアタック ゲージ技", "技の選び方", "ポケモンGO ベイト", "DPT EPT"],
      "zh-TW": ["寶可夢GO 招式配置", "PvP 招式配置", "一般招式 特殊招式", "招式選擇法", "寶可夢GO 誘騙", "DPT EPT"],
    },
    ko: {
      title: "포켓몬GO 추천 기술배치 고르는 법 — 빠른기술·차지기술·베이팅",
      desc: "포켓몬 GO PvP 기술배치(무브셋)를 고르는 기준을 정리했습니다. 빠른 기술의 DPT·EPT·턴수, 차지 기술의 에너지·데미지·효과, 자속·커버리지, 실드 베이팅까지 — 데이터로 어떤 기술이 왜 추천되는지.",
      sections: [
        { p: "포켓몬 GO 배틀리그에서는 같은 포켓몬이라도 기술배치에 따라 성능이 완전히 달라집니다. 기술배치는 보통 빠른 기술 1개 + 차지 기술 2개 조합이고, 각각을 고르는 기준이 분명합니다. 아래 기준을 알면 각 포켓몬 상세의 '추천 기술배치'가 왜 그렇게 나오는지도 이해됩니다." },
        { h: "빠른 기술 — DPT·EPT·턴수", p: "빠른 기술은 두 수치로 봅니다. DPT(턴당 데미지)는 딜, EPT(턴당 에너지)는 차지 기술을 얼마나 빨리 채우는가입니다. 대부분의 PvP는 EPT(에너지 발전)가 높은 기술을 선호합니다 — 차지 기술을 자주 써야 압박이 되니까요. 또 기술마다 1~4턴 길이가 달라(예: 머드샷 1턴, 카운터 2턴), 짧을수록 입력·CMP·타이밍에서 유리합니다." },
        { h: "차지 기술 — 에너지·데미지·효과", p: "차지 기술은 에너지 비용, 데미지, 부가 효과(상대 방어↓·내 공격↑ 등)로 평가합니다. 보통 저코스트 1개(35에너지 이하 — 자주 쏴서 베이팅·압박) + 고코스트 1개(메인 딜, 강한 한 방)를 섞습니다. DPE(에너지당 데미지)가 높을수록 효율적입니다." },
        { h: "자속(STAB)과 커버리지", p: "자기 타입과 같은 기술은 자속 보너스 ×1.2를 받아 기본 우선입니다. 다만 두 차지 기술의 타입을 다르게 가져가 '커버리지'를 확보하면, 자속 기술을 반감하는 상대의 약점을 다른 타입으로 찌를 수 있습니다. 자속 메인 + 커버리지 서브가 정석입니다." },
        { h: "베이팅(실드 유도)", p: "저코스트 차지 기술을 먼저 던져 상대 실드를 유도(bait)하고, 실드가 빠지면 고코스트 기술로 큰 데미지를 넣는 게 베이팅입니다. 그래서 저코스트 차지 기술은 '딜'뿐 아니라 '실드 빼는 도구'로 가치가 큽니다. 상대 실드 개수(0/1/2)에 따라 어떤 기술부터 쓸지가 달라집니다." },
        { h: "실전 — 추천 기술배치 확인", p: "위 기준을 개별 포켓몬에 적용한 결과가 각 포켓몬 상세 페이지의 '추천 기술배치'입니다. 공개 시뮬레이션(PvPoke) 기준으로 계산했고, 빠른 기술을 바꾸면 차지 기술의 타수도 다시 계산됩니다. 리그별로 다르니 실드 시나리오별 시뮬 결과와 함께 확인하세요." },
      ],
    },
    en: {
      title: "How to Choose the Best PvP Moveset — Fast, Charged & Baiting",
      desc: "The criteria for picking a Pokémon GO PvP moveset. Fast-move DPT/EPT/turns, charged-move energy/damage/effects, STAB & coverage, and shield baiting — how the data decides which moves are recommended.",
      sections: [
        { p: "In Pokémon GO Battle League the same Pokémon performs completely differently depending on its moveset. A moveset is usually one fast move + two charged moves, and there are clear criteria for each. Knowing them explains why each Pokémon detail page recommends the moves it does." },
        { h: "Fast move — DPT, EPT, turns", p: "Judge a fast move by two numbers: DPT (damage per turn) is damage, EPT (energy per turn) is how fast it fills your charged moves. Most PvP favors high-EPT moves — you want to throw charged moves often to apply pressure. Fast moves are also 1–4 turns long (e.g. Mud Shot 1 turn, Counter 2 turns); shorter is better for input, CMP and timing." },
        { h: "Charged move — energy, damage, effect", p: "Judge charged moves by energy cost, damage, and side effects (lower foe defense, raise own attack, etc.). Usually you mix one cheap move (≤35 energy — thrown often to bait/pressure) with one expensive move (main damage, a big hit). Higher DPE (damage per energy) is more efficient." },
        { h: "STAB & coverage", p: "Moves matching the Pokémon's type get the STAB bonus ×1.2 and are the default priority. But giving your two charged moves different types secures 'coverage', letting you hit opponents that resist your STAB with a different type. STAB main + coverage secondary is the standard." },
        { h: "Baiting (drawing shields)", p: "Baiting means throwing a cheap charged move first to draw the opponent's shield, then landing your expensive move for big damage once the shield is gone. So a cheap charged move is valuable not just for damage but as a shield-removal tool. Which move to throw first changes with the opponent's shield count (0/1/2)." },
        { h: "In practice — see the recommended moveset", p: "Applying these criteria to each Pokémon gives the 'recommended moveset' on every Pokémon detail page. It's computed from public simulation (PvPoke), and switching the fast move recomputes the charged-move counts. It differs by league, so check it alongside the per-shield sim results." },
      ],
    },
    ja: {
      title: "ポケモンGO 技構成の選び方 — ノーマル・ゲージ技・ベイト",
      desc: "ポケモンGO PvPの技構成の選び方を整理。ノーマルアタックのDPT・EPT・ターン数、ゲージ技のエネルギー・威力・効果、タイプ一致・範囲、そしてシールドベイトまで — データがどの技を推奨するか。",
      sections: [
        { p: "ポケモンGOバトルリーグでは同じポケモンでも技構成で性能がまったく変わります。技構成は通常ノーマルアタック1つ+ゲージ技2つで、それぞれ選ぶ基準が明確です。これを知ると、各ポケモン詳細の「推奨技構成」がなぜそうなるのかも分かります。" },
        { h: "ノーマルアタック — DPT・EPT・ターン数", p: "ノーマルアタックは2つの数値で見ます。DPT(1ターンあたりダメージ)は火力、EPT(1ターンあたりエネルギー)はゲージ技をどれだけ速く溜めるかです。多くのPvPはEPT(エネルギー生成)が高い技を好みます — ゲージ技を頻繁に撃つほど圧をかけられるからです。また技ごとに1〜4ターンの長さがあり(例:マッドショット1ターン、カウンター2ターン)、短いほど入力・CMP・タイミングで有利です。" },
        { h: "ゲージ技 — エネルギー・威力・効果", p: "ゲージ技はエネルギー消費、威力、追加効果(相手の防御↓・自分の攻撃↑など)で評価します。通常は低コスト1つ(35エネルギー以下 — 頻繁に撃ってベイト・圧)+高コスト1つ(メイン火力の大技)を混ぜます。DPE(エネルギーあたりダメージ)が高いほど効率的です。" },
        { h: "タイプ一致(STAB)と範囲", p: "自分と同じタイプの技はタイプ一致ボーナス×1.2を受け、基本優先です。ただし2つのゲージ技のタイプを分けて「範囲(カバレッジ)」を確保すると、一致技を半減する相手の弱点を別タイプで突けます。一致メイン+範囲サブが定石です。" },
        { h: "ベイト(シールド誘導)", p: "低コストのゲージ技を先に撃って相手のシールドを誘い(ベイト)、シールドが切れたら高コスト技で大ダメージを入れるのがベイトです。だから低コストゲージ技は「火力」だけでなく「シールドを剥がす道具」として価値があります。相手のシールド数(0/1/2)でどの技から撃つかが変わります。" },
        { h: "実戦 — 推奨技構成を確認", p: "この基準を各ポケモンに当てはめた結果が、各ポケモン詳細ページの「推奨技構成」です。公開シミュ(PvPoke)基準で計算し、ノーマルアタックを変えるとゲージ技の回数も再計算されます。リーグごとに違うので、シールド別のシミュ結果と一緒に確認してください。" },
      ],
    },
    "zh-TW": {
      title: "寶可夢GO 招式配置選擇法 — 一般·特殊招式·誘騙",
      desc: "整理寶可夢GO PvP招式配置的選擇標準。一般招式的DPT·EPT·回合數、特殊招式的能量·威力·效果、本系與打點，以及護盾誘騙——數據如何決定推薦招式。",
      sections: [
        { p: "在寶可夢GO對戰聯盟，同一隻寶可夢因招式配置不同，表現天差地別。招式配置通常是一般招式1個+特殊招式2個，各有明確的選擇標準。了解後，也能明白每隻寶可夢詳細頁的「推薦招式配置」為何如此。" },
        { h: "一般招式 — DPT·EPT·回合數", p: "一般招式看兩個數值：DPT(每回合傷害)是輸出，EPT(每回合能量)是充特殊招式的速度。多數PvP偏好高EPT(能量生成)的招式——越常放特殊招式越能施壓。招式也有1〜4回合長度(例：泥巴射擊1回合、地球上投2回合)，越短在輸入·CMP·時機上越有利。" },
        { h: "特殊招式 — 能量·威力·效果", p: "特殊招式以能量消耗、威力與附加效果(降對手防禦·升自身攻擊等)評估。通常混搭低消耗1個(35能量以下——常放來誘騙·施壓)+高消耗1個(主要輸出的大招)。DPE(每能量傷害)越高越有效率。" },
        { h: "本系(STAB)與打點", p: "與寶可夢同屬性的招式享有本系加成×1.2，是基本優先。但把兩個特殊招式的屬性分開以取得「打點(範圍)」，就能用別的屬性攻擊那些抵抗本系招式的對手弱點。本系主招+打點副招是標準配置。" },
        { h: "誘騙(引誘護盾)", p: "誘騙是先放低消耗特殊招式引誘對手開盾，等護盾用完再用高消耗招式打大傷害。所以低消耗特殊招式不只是輸出，更是「拆盾工具」。依對手護盾數(0/1/2)，先放哪個招式會不同。" },
        { h: "實戰 — 查看推薦招式配置", p: "把這些標準套用到各寶可夢，就是每隻寶可夢詳細頁的「推薦招式配置」。以公開模擬(PvPoke)為準計算，切換一般招式時特殊招式次數也會重算。各聯盟不同，請搭配各護盾模擬結果一起看。" },
      ],
    },
  },
  "pogo-pvp-calc": {
    updated: "2026-09-02",
    keywords: {
      ko: ["포켓몬고 타입 상성", "포켓몬고 데미지 계산", "포켓몬고 PvP 배율", "포켓몬고 자속 STAB", "CMP 동시차징", "포켓몬고 원작 차이"],
      en: ["Pokémon GO type effectiveness", "Pokémon GO damage formula", "Pokémon GO PvP multipliers", "Pokémon GO STAB", "CMP charged priority", "GO vs main series"],
      ja: ["ポケモンGO タイプ相性", "ポケモンGO ダメージ計算", "ポケモンGO PvP 倍率", "ポケモンGO タイプ一致 STAB", "CMP 同時ゲージ", "原作との違い"],
      "zh-TW": ["寶可夢GO 屬性相剋", "寶可夢GO 傷害計算", "寶可夢GO PvP 倍率", "寶可夢GO 本系加成", "CMP 同時充能", "與原作差異"],
    },
    ko: {
      title: "포켓몬GO PvP 계산법 — 원작과 다른 점 (타입 배율·자속·CP)",
      desc: "포켓몬 GO 배틀리그는 원작 게임과 데미지 계산이 다릅니다. 타입 상성 배율(1.6·0.625배), 자속 1.2배, CP·CPM, 동시차징(CMP), 그림자 보정까지 GBL Note 시뮬레이터 기준으로 정확히 정리했습니다.",
      sections: [
        { p: "포켓몬 GO 배틀리그(PvP)는 원작(본편 게임)과 계산식이 다릅니다. 같은 '약점'이라도 배율이 다르고, 자속·CP·기술 시스템도 GO만의 방식입니다. 이 글은 GBL Note 배틀 시뮬레이터(오픈소스 PvPoke 엔진)가 실제로 쓰는 수치를 그대로 정리한 것입니다." },
        { h: "1. 타입 상성 배율 — GO는 1.6배 / 0.625배", p: "가장 큰 차이입니다. 원작은 약점 2배·반감 0.5배·무효 0배지만, 포켓몬 GO는 다릅니다. 효과굉장(약점) ×1.6, 이중 약점(양 타입 모두 약점) ×2.56, 반감 ×0.625, 이중반감 ×0.390625입니다. 원작에서 '무효(0배)'인 관계도 GO에서는 0이 아니라 ×0.390625로 데미지가 들어갑니다 — 즉 GO에는 완전 무효가 없습니다. 흔히 말하는 '2배 약점·0.5배 반감·4배 약점'은 원작 수치이며, GO 실제 값이 아닙니다." },
        { h: "2. 자속(STAB) — GO는 1.2배", p: "포켓몬의 타입과 같은 타입 기술을 쓰면 붙는 '자속' 보너스도 GO는 ×1.2입니다(원작 ×1.5). 자속 기술이 강하긴 하지만 원작만큼 압도적이진 않습니다." },
        { h: "3. CP·레벨·개체값(IV)", p: "GO의 CP는 공격·방어·체력 종족값과 개체값(IV 0~15), 레벨(CPM)으로 계산됩니다. 리그 CP 제한(슈퍼 1500·하이퍼 2500) 안에서 최대 스탯을 내는 개체값 조합이 리그마다 달라, 원작처럼 '무조건 6V가 최고'가 아닙니다. 낮은 리그일수록 방어·체력을 살린 개체가 유리한 경우가 많습니다." },
        { h: "4. 기술 시스템 — 에너지·턴·타수, 그리고 CMP", p: "빠른 기술은 턴마다 정해진 에너지를 모으고, 차지 기술은 필요한 에너지를 채우면 발동합니다(그래서 '몇 번 만에 차는가' = 타수 개념이 생깁니다). 두 포켓몬이 같은 턴에 차지를 채우면 공격 실능력치가 높은 쪽이 먼저 발동하는데, 이것이 동시차징 우선권(CMP)입니다. 그래서 마스터리그에서는 공격 개체값이 미러전 승패를 가르기도 합니다." },
        { h: "5. 그림자·버프/디버프", p: "그림자 포켓몬은 공격 ×1.2로 데미지가 세지지만 받는 데미지도 늘어납니다(방어 ×0.833). 또 일부 기술은 공격/방어 능력치 단계를 올리거나 내리는 버프·디버프가 있어, 단순 스탯 비교만으로는 실전 결과를 알 수 없습니다." },
        { h: "GBL Note는 이 수치로 계산합니다", p: "GBL Note의 티어표·타입 분석·타협개체 연구·배틀 시뮬레이터는 모두 위 GO 배율로 계산됩니다. 그래서 원작 위키의 배율(2배·0.5배)과 달라 보일 수 있는데, 이것이 실제 GBL에서 일어나는 수치입니다." },
      ],
    },
    en: {
      title: "Pokémon GO PvP Damage Math — How It Differs From the Main Games",
      desc: "Pokémon GO's Battle League calculates damage differently from the main series. Type multipliers (×1.6 / ×0.625), 1.2× STAB, CP/CPM, charged-move priority (CMP) and shadow modifiers — all exactly as GBL Note's simulator uses them.",
      sections: [
        { p: "Pokémon GO's Battle League (PvP) uses different formulas from the main series. The same 'weakness' has a different multiplier, and STAB, CP and the move system all work the GO way. This article lays out the exact values GBL Note's simulator (the open-source PvPoke engine) actually uses." },
        { h: "1. Type effectiveness — GO uses ×1.6 / ×0.625", p: "This is the biggest difference. The main games use ×2 for a weakness, ×0.5 for a resist and ×0 for an immunity — but Pokémon GO is different: super-effective ×1.6, doubly super-effective (both types weak) ×2.56, resisted ×0.625, double-resisted ×0.390625. Even 'immunity' relationships aren't 0 in GO — they deal ×0.390625, so there is no true immunity. The familiar '2× weak, 0.5× resist, 4× weak' figures are main-series values, not GO's." },
        { h: "2. STAB — GO uses ×1.2", p: "The same-type attack bonus (STAB) for using a move matching the Pokémon's type is ×1.2 in GO (×1.5 in the main games). STAB moves are strong, but not as overwhelming as in the core series." },
        { h: "3. CP, level and IVs", p: "GO's CP comes from Attack/Defense/HP base stats, IVs (0–15) and level (CPM). Within a league's CP cap (Great 1500, Ultra 2500), the IV spread that yields the best stats differs by league — so 'max IVs are always best' isn't true like in the main games. In lower leagues, a spread favoring Defense/HP is often better." },
        { h: "4. Moves — energy, turns, counts, and CMP", p: "Fast moves gain a set amount of energy per turn, and a charged move fires once you have enough energy (hence the 'how many fast moves to charge' = move count). If two Pokémon reach a charged move on the same turn, the one with the higher Attack stat fires first — this is Charged Move Priority (CMP). That's why in the Master League an Attack IV can decide the mirror match." },
        { h: "5. Shadow and buffs/debuffs", p: "Shadow Pokémon hit harder (Attack ×1.2) but also take more damage (Defense ×0.833). Some moves also raise or lower Attack/Defense stat stages (buffs/debuffs), so raw stat comparisons alone don't tell you the real outcome." },
        { h: "GBL Note calculates with these values", p: "GBL Note's tier lists, type analysis, compromise-IV research and battle simulator all use the GO multipliers above. That's why numbers may look different from a main-series wiki (×2, ×0.5) — these are what actually happens in GBL." },
      ],
    },
    ja: {
      title: "ポケモンGO PvP計算 — 原作との違い（タイプ倍率・タイプ一致・CP）",
      desc: "ポケモンGOのバトルリーグは原作とダメージ計算が異なります。タイプ相性倍率（×1.6・×0.625）、タイプ一致×1.2、CP・CPM、同時ゲージ（CMP）、シャドウ補正まで、GBL Noteシミュレーター基準で正確に整理しました。",
      sections: [
        { p: "ポケモンGOのバトルリーグ（PvP）は原作（本編）と計算式が異なります。同じ「弱点」でも倍率が違い、タイプ一致・CP・技システムもGO独自です。この記事はGBL Noteのバトルシミュレーター（オープンソースPvPokeエンジン）が実際に使う数値をそのまま整理したものです。" },
        { h: "1. タイプ相性倍率 — GOは×1.6 / ×0.625", p: "最大の違いです。原作は弱点×2・半減×0.5・無効×0ですが、ポケモンGOは異なります。効果抜群（弱点）×1.6、二重弱点（両タイプとも弱点）×2.56、半減×0.625、二重半減×0.390625。原作で「無効（×0）」の関係もGOでは0ではなく×0.390625でダメージが入ります — つまりGOに完全無効はありません。よく言う「2倍弱点・0.5倍半減・4倍弱点」は原作の数値で、GOの実値ではありません。" },
        { h: "2. タイプ一致（STAB）— GOは×1.2", p: "ポケモンのタイプと同じタイプの技に付く「タイプ一致」ボーナスもGOは×1.2です（原作×1.5）。強力ですが原作ほど圧倒的ではありません。" },
        { h: "3. CP・レベル・個体値(IV)", p: "GOのCPは攻撃・防御・HP種族値と個体値(IV 0〜15)、レベル(CPM)で計算されます。リーグのCP制限（スーパー1500・ハイパー2500）内で最大ステータスになる個体値の組み合わせはリーグごとに異なり、原作のように「常に6Vが最強」ではありません。低いリーグほど防御・HPを活かした個体が有利な場合が多いです。" },
        { h: "4. 技システム — エネルギー・ターン・回数、そしてCMP", p: "ノーマルアタックはターンごとに一定のエネルギーを貯め、ゲージ技は必要エネルギーが貯まると発動します（そこで「何回で貯まるか」=発動回数の概念が生まれます）。2匹が同じターンにゲージを貯めると、攻撃実数値が高い方が先に発動します — これが同時ゲージ優先（CMP）です。だからマスターリーグでは攻撃個体値がミラー戦の勝敗を分けることがあります。" },
        { h: "5. シャドウ・バフ/デバフ", p: "シャドウポケモンは攻撃×1.2でダメージが上がる一方、受けるダメージも増えます（防御×0.833）。また一部の技は攻撃/防御ランクを上げ下げするバフ・デバフがあり、単純なステータス比較だけでは実戦結果は分かりません。" },
        { h: "GBL Noteはこの数値で計算します", p: "GBL Noteのティア表・タイプ分析・妥協個体研究・バトルシミュレーターはすべて上記GO倍率で計算されます。原作Wikiの倍率（×2・×0.5）と違って見えることがありますが、これがGBLで実際に起きる数値です。" },
      ],
    },
    "zh-TW": {
      title: "寶可夢GO PvP傷害計算 — 與原作的差異（屬性倍率·本系·CP）",
      desc: "寶可夢GO對戰聯盟的傷害計算與原作不同。屬性相剋倍率（×1.6・×0.625）、本系×1.2、CP·CPM、同時充能（CMP）、暗影修正，皆以GBL Note模擬器基準精確整理。",
      sections: [
        { p: "寶可夢GO對戰聯盟（PvP）與原作（本傳）計算方式不同。同樣是「弱點」倍率也不同，本系加成·CP·招式系統都是GO獨有。本文整理GBL Note對戰模擬器（開源PvPoke引擎）實際使用的數值。" },
        { h: "1. 屬性相剋倍率 — GO為×1.6 / ×0.625", p: "這是最大差異。原作弱點×2·減半×0.5·無效×0，但寶可夢GO不同：效果絕佳（弱點）×1.6、雙重弱點（兩屬性皆弱）×2.56、減半×0.625、雙重減半×0.390625。原作中「無效（×0）」的關係在GO也不是0，而是×0.390625仍會造成傷害 — 也就是GO沒有完全無效。常說的「2倍弱點·0.5倍減半·4倍弱點」是原作數值，並非GO實際值。" },
        { h: "2. 本系加成（STAB）— GO為×1.2", p: "使用與寶可夢同屬性招式的「本系」加成，GO為×1.2（原作×1.5）。本系招式雖強，但不如原作壓倒性。" },
        { h: "3. CP·等級·個體值(IV)", p: "GO的CP由攻擊·防禦·HP種族值與個體值(IV 0~15)、等級(CPM)計算。在聯盟CP上限（超級1500·高級2500）內能達到最佳數值的個體值組合各聯盟不同，並非像原作「6V永遠最強」。越低的聯盟，偏重防禦·HP的個體往往更有利。" },
        { h: "4. 招式系統 — 能量·回合·次數，以及CMP", p: "一般招式每回合累積固定能量，特殊招式在能量足夠時發動（因此有「幾次充滿」=發動次數的概念）。兩隻在同一回合充滿時，攻擊實數值較高者先發動 — 這就是同時充能優先權（CMP）。所以在大師聯盟，攻擊個體值有時決定鏡像對戰勝負。" },
        { h: "5. 暗影·強化/弱化", p: "暗影寶可夢攻擊×1.2傷害更高，但受到的傷害也增加（防禦×0.833）。部分招式還會提升或降低攻擊/防禦等級（強化·弱化），因此單看數值無法得知實戰結果。" },
        { h: "GBL Note以這些數值計算", p: "GBL Note的階級表·屬性分析·妥協個體研究·對戰模擬器全以上述GO倍率計算。因此可能與原作Wiki倍率（×2·×0.5）看起來不同，但這才是GBL實際發生的數值。" },
      ],
    },
  },
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
