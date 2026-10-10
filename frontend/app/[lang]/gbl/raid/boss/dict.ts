// 보스별 레이드 공략 페이지 문구(4개 언어). 숫자·이름은 전부 데이터에서 오고, 여기에는 틀이 되는 말만 둔다.
import type { Locale } from "../../../../../lib/i18n";
import type { BossKind } from "./bosses";

export type BossDict = {
  navRaid: string; navList: string;
  kind: Record<BossKind, string>;
  shadowPrefix: string;
  h1: (name: string) => string;
  metaTitle: (name: string, weak: string, cp: number) => string;
  metaDesc: (name: string, top: string, weak: string, cp20: number, cp25: number) => string;
  lead: (name: string, types: string, weak: string, top: string) => string;
  stNow: string; stUntil: (end: string) => string; stNext: (start: string, end: string) => string; stNone: string; stUnknown: string; shiny: string;
  weakH: string; resistH: string; doubleWeak: string; cpH: string; cpNormal: string; cpBoost: string; bossWeather: (w: string) => string;
  atkWeatherH: string;
  countersH: (name: string) => string; countersSub: string;
  plainH: string; plainSub: string;
  colRank: string; colMon: string; colType: string; colMoves: string; colDps: string; colOverall: string;
  tagShadow: string; tagMega: string; tagUpcoming: string; legacyNote: string; fastResisted: string;
  movesH: (name: string) => string; movesSub: string; fast: string; charged: string; weakTo: (names: string) => string; noneWeak: string;
  catchH: string; catchSub: string; megaCatch: string; shadowCatch: string;
  moreH: string; newsH: string; othersH: string; listAll: string; typeTable: (type: string) => string;
  faqH: string;
  faqWeakQ: (name: string) => string; faqWeakA: (name: string, list: string) => string;
  faqCpQ: (name: string) => string; faqCpA: (cp20: number, cp25: number, weather: string) => string;
  faqTopQ: (name: string) => string; faqTopA: (top3: string, plain3: string) => string;
  basisH: string; basisGame: (d: string) => string; basisCalc: (d: string) => string; basisSchedule: (d: string) => string; basisSource: string;
  weather: Record<string, string>;
  date: (iso: string) => string;
  // 목록 페이지
  listTitle: string; listDesc: string; listH1: string; listIntro: string; listNow: string; listSoon: string;
};

const md = (iso: string) => ({ m: Number(iso.slice(5, 7)), d: Number(iso.slice(8, 10)) });
// 한국어 조사 — 이름 끝 글자의 받침 유무로 고른다(괄호로 끝나면 괄호 안 마지막 글자).
const josa = (w: string, withB: string, without: string): string => {
  const ch = w.replace(/[\s)）\]]+$/g, "").slice(-1), c = ch.charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0 ? withB : without;
  return /[lmnrLMNR0136780]/.test(ch) ? withB : without;
};
const EN_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ko: BossDict = {
  navRaid: "← 레이드 딜러 티어", navList: "보스별 공략 목록",
  kind: { t5: "5성 레이드", mega: "메가 레이드", primal: "원시 레이드", shadow: "섀도우 레이드" },
  shadowPrefix: "섀도우 ",
  h1: (n) => `${n} 레이드 공략`,
  metaTitle: (n, w, cp) => `포켓몬고 ${n} 레이드 공략 — 약점 ${w} · 100% CP ${cp}`,
  metaDesc: (n, top, w, a, b) => `${n} 레이드 약점은 ${w}. 추천 포켓몬 ${top}. 100% 개체 CP는 ${a}(날씨 부스트 ${b}). 보스 타입에 맞춰 다시 계산한 추천 순위와 기술배치, 보스가 쓰는 기술까지 정리했습니다.`,
  lead: (n, ty, w, top) => `${n}${josa(n, "은", "는")} ${ty} 타입 보스입니다. 약점 타입은 ${w}. 지금 딜러 데이터로 계산한 추천 1순위는 ${top}입니다. 아래 순위는 타입별 딜러표를 이 보스의 상성에 맞춰 다시 계산한 것입니다.`,
  stNow: "지금 등장 중", stUntil: (e) => `${e}까지`, stNext: (s, e) => `등장 예정 ${s} ~ ${e}`, stNone: "지금은 레이드에 나오지 않습니다", stUnknown: "등장 여부를 확인하지 못했습니다", shiny: "색이 다른 포켓몬 가능",
  weakH: "약점", resistH: "반감", doubleWeak: "이중 약점", cpH: "잡을 때 CP", cpNormal: "100% 개체", cpBoost: "날씨 부스트", bossWeather: (w) => `${w} 날씨면 레벨 25로 잡힙니다`,
  atkWeatherH: "약점 타입이 강해지는 날씨",
  countersH: (n) => `${n} 추천 포켓몬`, countersSub: "레벨 40 · 개체값 15 · 상대 방어 180 기준. 딜러 티어표의 기술배치를 이 보스의 타입 상성(노멀 기술·스페셜 기술 각각)으로 다시 계산했습니다. 종합은 화력과 버티는 시간을 함께 본 점수입니다.",
  plainH: "메가·섀도우 없이 고른다면", plainSub: "메가진화와 섀도우 포켓몬을 뺀 순위입니다.",
  colRank: "순위", colMon: "포켓몬", colType: "공격 타입", colMoves: "기술배치", colDps: "DPS", colOverall: "종합",
  tagShadow: "섀도우", tagMega: "메가", tagUpcoming: "출시예정", legacyNote: "★ = 레거시 기술(일반 기술머신으로 배울 수 없음)", fastResisted: "노멀 기술 반감",
  movesH: (n) => `${n}${josa(n, "이", "가")} 쓰는 기술`, movesSub: "이 포켓몬의 현재 기술 풀(레거시 제외) 기준입니다. 보스는 이 가운데 노멀 기술 하나와 스페셜 기술 하나를 들고 나옵니다.", fast: "노멀 기술", charged: "스페셜 기술", weakTo: (x) => `약점인 추천 포켓몬: ${x}`, noneWeak: "추천 상위 10마리 중 이 기술이 약점인 포켓몬 없음",
  catchH: "개체값별 CP", catchSub: "레이드에서 잡을 때 표시되는 CP로 개체값을 가늠할 수 있습니다.", megaCatch: "메가 레이드를 이기면 메가진화 전의 포켓몬을 잡습니다. CP도 그 기준입니다.", shadowCatch: "섀도우 레이드에서 잡는 포켓몬은 섀도우 상태입니다. 100% 개체 CP는 일반 개체와 같습니다.",
  moreH: "이 포켓몬의 다른 정보", newsH: "관련 소식", othersH: "다른 보스 공략", listAll: "보스별 공략 전체 →", typeTable: (t) => `${t} 딜러 순위`,
  faqH: "자주 묻는 질문",
  faqWeakQ: (n) => `${n}의 약점은 무엇인가요?`, faqWeakA: (n, l) => `${n}의 약점은 ${l}입니다.`,
  faqCpQ: (n) => `${n} 100% 개체 CP는 얼마인가요?`, faqCpA: (a, b, w) => `레이드에서 잡을 때 100% 개체는 CP ${a}입니다. ${w} 날씨로 부스트되면 CP ${b}입니다.`,
  faqTopQ: (n) => `${n} 레이드에 어떤 포켓몬을 데려가야 하나요?`, faqTopA: (t, p) => `종합 점수 상위는 ${t}입니다. 메가·섀도우를 빼면 ${p} 순입니다.`,
  basisH: "자료 기준", basisGame: (d) => `게임 데이터(기술 위력·시전 시간·종족값): ${d} 기준`, basisCalc: (d) => `추천 순위: GBL Note 자체 계산 — 딜러 티어표(${d}) + 이 보스의 타입 상성`, basisSchedule: (d) => `등장 일정: 공개 일정 피드에서 자동으로 확인 (${d})`, basisSource: "출처: PokeMiners 게임마스터 · PvPoke 게임마스터 · LeekDuck 일정 데이터(ScrapedDuck)",
  weather: { sunny: "맑음", rainy: "비", partly: "때때로 흐림", cloudy: "흐림", windy: "강풍", snow: "눈", fog: "안개" },
  date: (iso) => { const { m, d } = md(iso); return `${m}월 ${d}일`; },
  listTitle: "포켓몬고 레이드 보스별 공략 — 약점·추천 포켓몬·100% CP", listDesc: "포켓몬고 5성·메가·원시·섀도우 레이드 보스별 공략. 보스마다 약점, 타입 상성에 맞춰 계산한 추천 포켓몬 순위, 100% 개체 CP를 정리했습니다.",
  listH1: "레이드 보스별 공략", listIntro: "보스를 고르면 약점, 그 보스에 맞춰 계산한 추천 포켓몬 순위, 100% 개체 CP를 볼 수 있습니다.", listNow: "등장 중", listSoon: "예정",
};

const en: BossDict = {
  navRaid: "← Raid attacker tiers", navList: "All boss guides",
  kind: { t5: "5-Star Raid", mega: "Mega Raid", primal: "Primal Raid", shadow: "Shadow Raid" },
  shadowPrefix: "Shadow ",
  h1: (n) => `${n} Raid Guide`,
  metaTitle: (n, w, cp) => `${n} Raid Guide — Weak to ${w} · 100% CP ${cp}`,
  metaDesc: (n, top, w, a, b) => `${n} is weak to ${w}. Best counters: ${top}. 100% IV CP is ${a} (${b} weather boosted). Counter rankings recalculated for this boss's typing, with movesets and the boss's own moves.`,
  lead: (n, ty, w, top) => `${n} is a ${ty}-type boss. It is weak to ${w}, and the top counter in our current attacker data is ${top}. The ranking below is our per-type attacker table recalculated for this boss's type matchups.`,
  stNow: "In raids now", stUntil: (e) => `until ${e}`, stNext: (s, e) => `Scheduled ${s} – ${e}`, stNone: "Not in raids right now", stUnknown: "Could not check current availability", shiny: "Shiny available",
  weakH: "Weak to", resistH: "Resists", doubleWeak: "double weakness", cpH: "Catch CP", cpNormal: "100% IV", cpBoost: "Weather boosted", bossWeather: (w) => `Caught at level 25 in ${w} weather`,
  atkWeatherH: "Weather that boosts its weaknesses",
  countersH: (n) => `Best ${n} counters`, countersSub: "Level 40, 15 IVs, target defense 180. Each attacker's moveset from our tier table is recalculated with this boss's type matchups (fast and charged moves separately). Overall combines damage output and time survived.",
  plainH: "Without Megas or Shadows", plainSub: "The same ranking with Mega and Shadow Pokémon removed.",
  colRank: "#", colMon: "Pokémon", colType: "Attack type", colMoves: "Moveset", colDps: "DPS", colOverall: "Overall",
  tagShadow: "Shadow", tagMega: "Mega", tagUpcoming: "Upcoming", legacyNote: "★ = legacy move (not available from a regular TM)", fastResisted: "fast move resisted",
  movesH: (n) => `Moves ${n} can use`, movesSub: "Based on this Pokémon's current move pool, legacy moves excluded. The boss carries one fast move and one charged move from this list.", fast: "Fast moves", charged: "Charged moves", weakTo: (x) => `Counters weak to it: ${x}`, noneWeak: "None of the top 10 counters is weak to this move",
  catchH: "CP by IV", catchSub: "The CP shown on the catch screen tells you the IVs.", megaCatch: "Winning a Mega Raid lets you catch the Pokémon before Mega Evolution. The CP is for that form.", shadowCatch: "Pokémon caught from Shadow Raids are Shadow Pokémon. The 100% IV CP is the same as the regular one.",
  moreH: "More on this Pokémon", newsH: "Related news", othersH: "Other boss guides", listAll: "All boss guides →", typeTable: (t) => `${t} attackers`,
  faqH: "FAQ",
  faqWeakQ: (n) => `What is ${n} weak to?`, faqWeakA: (n, l) => `${n} is weak to ${l}.`,
  faqCpQ: (n) => `What is the 100% IV CP for ${n}?`, faqCpA: (a, b, w) => `A 100% IV catch from the raid is CP ${a}. With a ${w} weather boost it is CP ${b}.`,
  faqTopQ: (n) => `Which Pokémon should I bring to a ${n} raid?`, faqTopA: (t, p) => `The top overall counters are ${t}. Without Megas or Shadows: ${p}.`,
  basisH: "Data basis", basisGame: (d) => `Game data (move power, duration, base stats): as of ${d}`, basisCalc: (d) => `Counter ranking: GBL Note's own calculation — attacker tier table (${d}) with this boss's type matchups`, basisSchedule: (d) => `Availability: checked automatically from a public schedule feed (${d})`, basisSource: "Sources: PokeMiners game master · PvPoke game master · LeekDuck schedule data (ScrapedDuck)",
  weather: { sunny: "Sunny", rainy: "Rainy", partly: "Partly Cloudy", cloudy: "Cloudy", windy: "Windy", snow: "Snow", fog: "Fog" },
  date: (iso) => { const { m, d } = md(iso); return `${EN_MON[m - 1]} ${d}`; },
  listTitle: "Pokémon GO Raid Boss Guides — Weaknesses, Counters, 100% CP", listDesc: "Guides for Pokémon GO 5-Star, Mega, Primal and Shadow raid bosses: weaknesses, counter rankings calculated for each boss's typing, and 100% IV CP.",
  listH1: "Raid Boss Guides", listIntro: "Pick a boss to see its weaknesses, counters ranked for that boss, and 100% IV CP.", listNow: "Now", listSoon: "Soon",
};

const ja: BossDict = {
  navRaid: "← レイドアタッカーランク", navList: "ボス別攻略一覧",
  kind: { t5: "★5レイド", mega: "メガレイド", primal: "ゲンシレイド", shadow: "シャドウレイド" },
  shadowPrefix: "シャドウ",
  h1: (n) => `${n} レイド攻略`,
  metaTitle: (n, w, cp) => `ポケモンGO ${n} レイド攻略 — 弱点 ${w}・100% CP ${cp}`,
  metaDesc: (n, top, w, a, b) => `${n}レイドの弱点は${w}。おすすめポケモンは${top}。個体値100%のCPは${a}（天候ブースト${b}）。ボスのタイプ相性で計算し直したおすすめ順位とわざ構成、ボスが使うわざをまとめました。`,
  lead: (n, ty, w, top) => `${n}は${ty}タイプのボスです。弱点は${w}で、現在のアタッカーデータで計算したおすすめ1位は${top}です。下の順位は、タイプ別アタッカー表をこのボスの相性で計算し直したものです。`,
  stNow: "現在出現中", stUntil: (e) => `${e}まで`, stNext: (s, e) => `出現予定 ${s}〜${e}`, stNone: "現在レイドには出現していません", stUnknown: "出現状況を確認できませんでした", shiny: "色違いあり",
  weakH: "弱点", resistH: "いまひとつ", doubleWeak: "二重弱点", cpH: "ゲット時のCP", cpNormal: "個体値100%", cpBoost: "天候ブースト", bossWeather: (w) => `天候が${w}ならレベル25でゲットできます`,
  atkWeatherH: "弱点タイプが強くなる天候",
  countersH: (n) => `${n} おすすめポケモン`, countersSub: "レベル40・個体値15・相手の防御180が基準。アタッカー表のわざ構成を、このボスのタイプ相性（ノーマルアタック・スペシャルアタックそれぞれ）で計算し直しました。総合は火力と耐久時間を合わせた点数です。",
  plainH: "メガ・シャドウなしで選ぶなら", plainSub: "メガシンカとシャドウポケモンを除いた順位です。",
  colRank: "順位", colMon: "ポケモン", colType: "攻撃タイプ", colMoves: "わざ構成", colDps: "DPS", colOverall: "総合",
  tagShadow: "シャドウ", tagMega: "メガ", tagUpcoming: "実装予定", legacyNote: "★ = 限定わざ（通常のわざマシンでは覚えられません）", fastResisted: "ノーマルアタックいまひとつ",
  movesH: (n) => `${n}が使うわざ`, movesSub: "このポケモンの現在のわざ（限定わざを除く）が基準です。ボスはこの中からノーマルアタック1つとスペシャルアタック1つを持って出現します。", fast: "ノーマルアタック", charged: "スペシャルアタック", weakTo: (x) => `弱点になるおすすめポケモン: ${x}`, noneWeak: "おすすめ上位10匹にこのわざが弱点のポケモンはいません",
  catchH: "個体値別CP", catchSub: "ゲット画面のCPで個体値の見当がつきます。", megaCatch: "メガレイドに勝つと、メガシンカ前のポケモンをゲットできます。CPもその基準です。", shadowCatch: "シャドウレイドでゲットするポケモンはシャドウ状態です。個体値100%のCPは通常の個体と同じです。",
  moreH: "このポケモンのほかの情報", newsH: "関連ニュース", othersH: "ほかのボス攻略", listAll: "ボス別攻略一覧 →", typeTable: (t) => `${t}アタッカー順位`,
  faqH: "よくある質問",
  faqWeakQ: (n) => `${n}の弱点は？`, faqWeakA: (n, l) => `${n}の弱点は${l}です。`,
  faqCpQ: (n) => `${n}の個体値100%のCPは？`, faqCpA: (a, b, w) => `レイドでゲットするとき、個体値100%はCP ${a}です。天候（${w}）でブーストされるとCP ${b}です。`,
  faqTopQ: (n) => `${n}レイドにはどのポケモンを連れて行けばいい？`, faqTopA: (t, p) => `総合上位は${t}です。メガ・シャドウを除くと${p}の順です。`,
  basisH: "データの基準", basisGame: (d) => `ゲームデータ（わざの威力・発動時間・種族値）: ${d}時点`, basisCalc: (d) => `おすすめ順位: GBL Note独自の計算 — アタッカー表（${d}）＋このボスのタイプ相性`, basisSchedule: (d) => `出現日程: 公開の日程フィードから自動で確認（${d}）`, basisSource: "出典: PokeMiners ゲームマスター・PvPoke ゲームマスター・LeekDuck 日程データ（ScrapedDuck）",
  weather: { sunny: "晴れ", rainy: "雨", partly: "ときどき曇り", cloudy: "曇り", windy: "強風", snow: "雪", fog: "霧" },
  date: (iso) => { const { m, d } = md(iso); return `${m}月${d}日`; },
  listTitle: "ポケモンGO レイドボス別攻略 — 弱点・おすすめポケモン・100% CP", listDesc: "ポケモンGOの★5・メガ・ゲンシ・シャドウレイドのボス別攻略。ボスごとに弱点、タイプ相性で計算したおすすめポケモン順位、個体値100%のCPをまとめました。",
  listH1: "レイドボス別攻略", listIntro: "ボスを選ぶと、弱点、そのボスに合わせて計算したおすすめポケモン順位、個体値100%のCPが見られます。", listNow: "出現中", listSoon: "予定",
};

const zh: BossDict = {
  navRaid: "← 團體戰攻擊手排行", navList: "頭目攻略列表",
  kind: { t5: "五星團體戰", mega: "超級團體戰", primal: "原始團體戰", shadow: "暗影團體戰" },
  shadowPrefix: "暗影",
  h1: (n) => `${n} 團體戰攻略`,
  metaTitle: (n, w, cp) => `Pokémon GO ${n} 團體戰攻略 — 弱點 ${w}·100% CP ${cp}`,
  metaDesc: (n, top, w, a, b) => `${n}團體戰的弱點是${w}。推薦寶可夢：${top}。100%個體CP為${a}（天氣加成${b}）。依頭目屬性相剋重新計算的推薦排名與招式組合，以及頭目會使用的招式。`,
  lead: (n, ty, w, top) => `${n}是${ty}屬性頭目。弱點為${w}，以目前的攻擊手資料計算，推薦第一名是${top}。下方排名是將各屬性攻擊手表依這隻頭目的相剋重新計算的結果。`,
  stNow: "目前出現中", stUntil: (e) => `至${e}`, stNext: (s, e) => `預定出現 ${s}～${e}`, stNone: "目前未在團體戰出現", stUnknown: "無法確認出現狀況", shiny: "可遇到異色",
  weakH: "弱點", resistH: "抵抗", doubleWeak: "雙重弱點", cpH: "捕捉時的CP", cpNormal: "100%個體", cpBoost: "天氣加成", bossWeather: (w) => `天氣為${w}時以等級25捕捉`,
  atkWeatherH: "讓弱點屬性變強的天氣",
  countersH: (n) => `${n} 推薦寶可夢`, countersSub: "以等級40·個體值15·對手防禦180為基準。將攻擊手表的招式組合依這隻頭目的屬性相剋（一般招式與特殊招式分別）重新計算。綜合是同時考量火力與存活時間的分數。",
  plainH: "不使用超級·暗影的話", plainSub: "去除超級進化與暗影寶可夢後的排名。",
  colRank: "排名", colMon: "寶可夢", colType: "攻擊屬性", colMoves: "招式組合", colDps: "DPS", colOverall: "綜合",
  tagShadow: "暗影", tagMega: "超級", tagUpcoming: "即將推出", legacyNote: "★ = 絕版招式（無法以一般招式學習器學會）", fastResisted: "一般招式被抵抗",
  movesH: (n) => `${n}會使用的招式`, movesSub: "以這隻寶可夢目前的招式（不含絕版招式）為基準。頭目會從中帶一個一般招式和一個特殊招式出現。", fast: "一般招式", charged: "特殊招式", weakTo: (x) => `被剋的推薦寶可夢：${x}`, noneWeak: "推薦前10名中沒有被這招剋制的寶可夢",
  catchH: "各個體值的CP", catchSub: "可從捕捉畫面的CP推估個體值。", megaCatch: "贏得超級團體戰後捕捉的是超級進化前的寶可夢，CP也以該形態為準。", shadowCatch: "在暗影團體戰捕捉到的是暗影寶可夢。100%個體的CP與一般個體相同。",
  moreH: "這隻寶可夢的其他資訊", newsH: "相關消息", othersH: "其他頭目攻略", listAll: "頭目攻略列表 →", typeTable: (t) => `${t}攻擊手排名`,
  faqH: "常見問題",
  faqWeakQ: (n) => `${n}的弱點是什麼？`, faqWeakA: (n, l) => `${n}的弱點是${l}。`,
  faqCpQ: (n) => `${n}的100%個體CP是多少？`, faqCpA: (a, b, w) => `在團體戰捕捉時，100%個體為CP ${a}。受天氣（${w}）加成時為CP ${b}。`,
  faqTopQ: (n) => `${n}團體戰該帶哪些寶可夢？`, faqTopA: (t, p) => `綜合前幾名是${t}。不使用超級·暗影的話依序是${p}。`,
  basisH: "資料基準", basisGame: (d) => `遊戲資料（招式威力·施放時間·種族值）：${d}`, basisCalc: (d) => `推薦排名：GBL Note自行計算 — 攻擊手表（${d}）＋這隻頭目的屬性相剋`, basisSchedule: (d) => `出現日程：自公開日程資料自動確認（${d}）`, basisSource: "來源：PokeMiners 遊戲主檔·PvPoke 遊戲主檔·LeekDuck 日程資料（ScrapedDuck）",
  weather: { sunny: "晴天", rainy: "雨天", partly: "多雲", cloudy: "陰天", windy: "強風", snow: "下雪", fog: "起霧" },
  date: (iso) => { const { m, d } = md(iso); return `${m}月${d}日`; },
  listTitle: "Pokémon GO 團體戰頭目攻略 — 弱點·推薦寶可夢·100% CP", listDesc: "Pokémon GO 五星·超級·原始·暗影團體戰頭目攻略。整理各頭目的弱點、依屬性相剋計算的推薦寶可夢排名與100%個體CP。",
  listH1: "團體戰頭目攻略", listIntro: "選擇頭目即可查看弱點、針對該頭目計算的推薦寶可夢排名與100%個體CP。", listNow: "出現中", listSoon: "預定",
};

const DICTS: Record<Locale, BossDict> = { ko, en, ja, "zh-TW": zh };
export const getBossDict = (lang: Locale): BossDict => DICTS[lang] || ko;

// 타입 → 날씨 부스트(게임의 고정 표).
export const WEATHER_OF: Record<string, string> = {
  grass: "sunny", ground: "sunny", fire: "sunny", water: "rainy", electric: "rainy", bug: "rainy", normal: "partly", rock: "partly",
  fairy: "cloudy", fighting: "cloudy", poison: "cloudy", dragon: "windy", flying: "windy", psychic: "windy", ice: "snow", steel: "snow", dark: "fog", ghost: "fog",
};
