// 레이드 기술 도감(/gbl/raid/moves) 문구 — 4개국어. 숫자·이름은 페이지에서 주입(함수형 키).
// 배틀 기술 도감(moves/dict.ts)과 용어를 맞춘다: ko 노멀 기술/스페셜 기술, ja ノーマルアタック/スペシャルアタック, zh-TW 一般招式/特殊招式.
import type { Locale } from "../../../../../lib/i18n";

export type RaidMovesDict = {
  // 공통
  navLabel: string; navRaid: string; navBattle: string; kindFast: string; kindCharged: string; secUnit: string;
  power: string; duration: string; energyGain: string; energyCost: string; bars: (n: number) => string;
  dpsLong: string; epsLong: string; dpeLong: string; windowAt: string;
  // 허브
  hubMetaTitle: string; hubMetaDesc: (fast: number, charged: number) => string;
  hubH1: string; hubIntro1: (fast: number, charged: number) => string; hubIntro2: string;
  topUsedH: string; topUsedSub: string; usedSuffix: (n: number) => string;
  viewTable: string; viewTree: string; all: string; searchPh: string; shown: (n: number | string, total: number | string) => string;
  colName: string; colType: string; colUsers: string; sortHint: string; noResult: string;
  hubExplainH: string; hubExplainBody: (date: string) => string;
  // 상세
  back: string; metaTitle: (name: string, kind: string) => string; metaDesc: (name: string, kind: string) => string; h1Suffix: string;
  rankOf: (rank: number, total: number) => string;
  vsH: string; vsSub: string; vsRaid: string; vsBattle: string; vsLink: string; colSpeed: string; turnsText: (turns: number, sec: string) => string; instant: string;
  topH: (name: string) => string; topSub: string; topCount: (shown: number, total: number) => string;
  colRank: string; colMon: string; colPairFast: string; colPairCharged: string; colCycle: string; cycleText: (n: number, sec: string) => string; colDps: string; noTop: string;
  shadow: string; legacyLegend: string;
  tableH: (name: string) => string; tableSub: (ver: string) => string; colTypeRank: string; rankText: (n: number) => string; noTable: string; verMega: string; verCurrent: string;
  effH: (type: string) => string; effSuper: string; effResist: string; effDouble: string; effNone: string;
  relatedH: (type: string, kind: string) => string;
  explainH: string; explainBody: (date: string) => string; footer: (n: number, date: string) => string;
};

const ko: RaidMovesDict = {
  navLabel: "레이드 기술 도감", navRaid: "🔥 레이드 딜러 티어", navBattle: "⚔️ 배틀 기술 도감", kindFast: "노멀 기술", kindCharged: "스페셜 기술", secUnit: "초",
  power: "위력", duration: "시전 시간", energyGain: "획득 에너지", energyCost: "필요 에너지", bars: (n) => `게이지 ${n}칸`,
  dpsLong: "DPS · 초당 위력", epsLong: "EPS · 초당 에너지", dpeLong: "DPE · 에너지당 위력", windowAt: "데미지 발생 시점",
  hubMetaTitle: "포켓몬고 레이드 기술 도감 — 위력·시전 시간·DPS·쓰는 포켓몬 | GBL Note",
  hubMetaDesc: (f, c) => `포켓몬고 레이드·체육관에서 쓰는 노멀 기술 ${f}개·스페셜 기술 ${c}개의 위력·시전 시간·에너지·DPS를 한 표로. 기술마다 가장 세게 쓰는 포켓몬 순위와 배틀리그 수치와의 차이까지.`,
  hubH1: "포켓몬고 레이드 기술 도감 — 위력 · 시전 시간 · DPS",
  hubIntro1: (f, c) => `레이드·체육관에서 쓰는 노멀 기술 ${f}개와 스페셜 기술 ${c}개의 수치입니다. 같은 기술이라도 배틀리그와는 위력·에너지·속도가 따로 정해져 있습니다. 배틀은 턴 단위로, 레이드는 초 단위로 움직입니다. 기술을 누르면 그 기술을 가장 세게 쓰는 포켓몬 순위와 배틀 수치 비교가 나옵니다.`,
  hubIntro2: "DPS = 위력 ÷ 시전 시간, EPS = 획득 에너지 ÷ 시전 시간, DPE = 위력 ÷ 필요 에너지. 스페셜 기술은 에너지 100이 게이지 1칸, 50이 2칸, 33이 3칸입니다. 머리글을 누르면 그 수치로 정렬됩니다.",
  topUsedH: "레이드 딜러 티어표에 가장 많이 오른 기술", topUsedSub: "18타입 딜러 티어표(타입별 상위 30)의 추천 기술배치 집계", usedSuffix: (n) => `${n}종 채용`,
  viewTable: "표로 보기", viewTree: "타입별로 보기", all: "전체", searchPh: "기술 이름 검색…", shown: (n, t) => `${t}개 중 ${n}개`,
  colName: "기술", colType: "타입", colUsers: "딜러표 채용", sortHint: "머리글을 누르면 정렬", noResult: "조건에 맞는 기술이 없습니다.",
  hubExplainH: "수치는 어디서 나온 건가요?",
  hubExplainBody: (d) => `위력·시전 시간·에너지는 공개 게임 데이터(PokeMiners 게임마스터, ${d} 기준)의 레이드·체육관 수치입니다. 배틀리그 수치는 따로 있으며 배틀 기술 도감에서 볼 수 있습니다. DPS·EPS·DPE와 포켓몬별 순위는 GBL Note가 그 수치로 계산했습니다. 밸런스 패치가 있으면 다시 계산해 갱신합니다.`,
  back: "← 레이드 기술 도감", metaTitle: (n) => `포켓몬고 ${n} 레이드 위력·DPS·쓰는 포켓몬 | GBL Note`,
  metaDesc: (n, k) => `${n}(${k})의 레이드·체육관 위력·시전 시간·에너지·DPS, 이 기술을 가장 세게 쓰는 포켓몬 순위, 배틀리그 수치와의 차이.`,
  h1Suffix: "레이드 수치 · DPS · 쓰는 포켓몬",
  rankOf: (r, t) => `${t}개 중 ${r}위`,
  vsH: "레이드 수치와 배틀 수치 비교", vsSub: "같은 기술이라도 레이드·체육관과 배틀리그는 수치가 따로 정해져 있습니다. 레이드에서 강한 기술이 배틀에서도 강한 것은 아닙니다.",
  vsRaid: "레이드 · 체육관", vsBattle: "배틀리그", vsLink: "배틀 타수 · 사용 포켓몬 보기 →", colSpeed: "속도", turnsText: (t, s) => `${t}턴 (${s}초)`, instant: "즉시 발동",
  topH: (n) => `${n} — 가장 세게 쓰는 포켓몬`,
  topSub: "이 기술을 포함한 최고 조합의 DPS 순위입니다. 딜러 티어표와 같은 기준(레벨 40 · 개체값 15 · 상대 방어 180 · 스페셜 기술 타입이 약점인 보스)이며, 메가 피날레 같은 이벤트 버프는 넣지 않은 기본 수치입니다.",
  topCount: (s, t) => `배울 수 있는 ${t}종(섀도우·메가 포함) 중 상위 ${s}종`,
  colRank: "순위", colMon: "포켓몬", colPairFast: "함께 쓰는 노멀 기술", colPairCharged: "함께 쓰는 스페셜 기술", colCycle: "한 사이클", cycleText: (n, s) => `노멀 ${n}회 + 스페셜 1회 · ${s}초`, colDps: "사이클 DPS",
  noTop: "출시된 포켓몬 중 이 기술을 레이드에서 쓸 수 있는 종이 없습니다.",
  shadow: "섀도우 ", legacyLegend: "★ = 레거시(엘리트 기술머신·이벤트 한정)",
  tableH: (n) => `${n} — 딜러 티어표 채용`, tableSub: (v) => `타입별 딜러 티어표(${v} 기준, 타입마다 상위 30)에서 이 기술이 추천 기술배치에 들어간 포켓몬입니다.`,
  colTypeRank: "타입 · 순위", rankText: (n) => `${n}위`, noTable: "지금 딜러 티어표(타입별 상위 30)의 추천 기술배치에는 이 기술이 없습니다.", verMega: "메가 피날레", verCurrent: "일반",
  effH: (t) => `${t} 타입 기술의 상성`, effSuper: "효과가 굉장함 ×1.6", effResist: "효과가 별로 ×0.625", effDouble: "이중 반감 ×0.39", effNone: "해당 없음",
  relatedH: (t, k) => `${t} 타입의 다른 ${k} — 레이드 수치`,
  explainH: "이 페이지의 숫자는 어떻게 계산했나요?",
  explainBody: (d) => `위력·시전 시간·에너지는 공개 게임 데이터(PokeMiners 게임마스터, ${d} 기준)의 레이드·체육관 수치입니다. 데미지는 floor(0.5 × 위력 × 공격 ÷ 방어 × 자속 1.2 × 상성) + 1 로 계산하고, 사이클 DPS는 노멀 기술로 에너지를 모아 스페셜 기술을 한 번 쓰기까지의 총 데미지를 걸린 시간으로 나눈 값입니다. 섀도우는 공격 1.2배입니다. 실제 레이드에서는 보스의 타입·기술·회피에 따라 달라지므로 포켓몬끼리 비교하는 참고값으로 보세요.`,
  footer: (n, d) => `레이드 기술 ${n}개 · 게임 데이터 ${d}`,
};

const en: RaidMovesDict = {
  navLabel: "Raid Move Dex", navRaid: "🔥 Raid Attacker Tiers", navBattle: "⚔️ Battle Move Dex", kindFast: "Fast Move", kindCharged: "Charged Move", secUnit: "s",
  power: "Power", duration: "Duration", energyGain: "Energy gain", energyCost: "Energy cost", bars: (n) => `${n}-bar`,
  dpsLong: "DPS · power per second", epsLong: "EPS · energy per second", dpeLong: "DPE · power per energy", windowAt: "Damage lands at",
  hubMetaTitle: "Pokémon GO Raid Move Dex — Power, Duration, DPS & Best Users | GBL Note",
  hubMetaDesc: (f, c) => `Raid and Gym stats for ${f} Fast Moves and ${c} Charged Moves in Pokémon GO: power, duration, energy and DPS in one table, the Pokémon that hit hardest with each move, and how the numbers differ from GO Battle League.`,
  hubH1: "Pokémon GO Raid Move Dex — Power, Duration & DPS",
  hubIntro1: (f, c) => `Raid and Gym stats for ${f} Fast Moves and ${c} Charged Moves. The same move has separate power, energy and speed values in GO Battle League: battles run in turns, raids run in seconds. Tap a move to see which Pokémon hit hardest with it and how it compares to its battle stats.`,
  hubIntro2: "DPS = power ÷ duration, EPS = energy gain ÷ duration, DPE = power ÷ energy cost. For Charged Moves, 100 energy is a 1-bar move, 50 is 2-bar and 33 is 3-bar. Tap a column header to sort by it.",
  topUsedH: "Moves that appear most in the raid attacker tiers", topUsedSub: "Counted from recommended movesets across the 18 type tier lists (top 30 per type)", usedSuffix: (n) => `${n} users`,
  viewTable: "Table", viewTree: "By type", all: "All", searchPh: "Search move name…", shown: (n, t) => `${n} of ${t}`,
  colName: "Move", colType: "Type", colUsers: "Tier-list users", sortHint: "Tap a header to sort", noResult: "No moves match these filters.",
  hubExplainH: "Where do these numbers come from?",
  hubExplainBody: (d) => `Power, duration and energy are the Raid and Gym values from public game data (PokeMiners game master, as of ${d}). GO Battle League uses separate values, shown in the Battle Move Dex. DPS, EPS, DPE and the per-Pokémon rankings are calculated by GBL Note from those values and are recalculated after balance changes.`,
  back: "← Raid Move Dex", metaTitle: (n) => `${n} in Pokémon GO Raids — Power, DPS & Best Users | GBL Note`,
  metaDesc: (n, k) => `Raid and Gym stats for ${n} (${k}): power, duration, energy and DPS, the Pokémon that hit hardest with it, and how it differs from its GO Battle League stats.`,
  h1Suffix: "Raid stats, DPS & best users",
  rankOf: (r, t) => `#${r} of ${t}`,
  vsH: "Raid stats vs. battle stats", vsSub: "The same move has separate values for Raids and Gyms and for GO Battle League. A move that is strong in raids is not necessarily strong in battles.",
  vsRaid: "Raids · Gyms", vsBattle: "Battle League", vsLink: "See battle counts and users →", colSpeed: "Speed", turnsText: (t, s) => `${t} turn${t === 1 ? "" : "s"} (${s}s)`, instant: "Instant",
  topH: (n) => `${n} — Pokémon that hit hardest with it`,
  topSub: "Ranked by DPS of the best moveset that includes this move. Same assumptions as the raid attacker tiers (Level 40, 15 IVs, target Defense 180, a boss weak to the Charged Move's type). These are base values without event buffs such as Mega Finale.",
  topCount: (s, t) => `Top ${s} of ${t} that can learn it (Shadow and Mega included)`,
  colRank: "Rank", colMon: "Pokémon", colPairFast: "Paired Fast Move", colPairCharged: "Paired Charged Move", colCycle: "One cycle", cycleText: (n, s) => `${n} fast + 1 charged · ${s}s`, colDps: "Cycle DPS",
  noTop: "No released Pokémon can use this move in raids.",
  shadow: "Shadow ", legacyLegend: "★ = legacy (Elite TM / event-exclusive)",
  tableH: (n) => `${n} — in the raid attacker tiers`, tableSub: (v) => `Pokémon whose recommended moveset includes this move in the type tier lists (${v}, top 30 per type).`,
  colTypeRank: "Type · rank", rankText: (n) => `#${n}`, noTable: "No recommended moveset in the current raid attacker tiers (top 30 per type) uses this move.", verMega: "Mega Finale", verCurrent: "standard",
  effH: (t) => `${t}-type move effectiveness`, effSuper: "Super effective ×1.6", effResist: "Not very effective ×0.625", effDouble: "Double resisted ×0.39", effNone: "None",
  relatedH: (t, k) => `Other ${t}-type ${k}s — raid stats`,
  explainH: "How are these numbers calculated?",
  explainBody: (d) => `Power, duration and energy are the Raid and Gym values from public game data (PokeMiners game master, as of ${d}). Damage is floor(0.5 × power × Attack ÷ Defense × STAB 1.2 × effectiveness) + 1. Cycle DPS is the total damage of charging with the Fast Move and firing the Charged Move once, divided by the time it takes. Shadow Pokémon get 1.2× Attack. Real raids vary with the boss's type, moves and dodging, so treat these as values for comparing Pokémon.`,
  footer: (n, d) => `${n} raid moves · game data ${d}`,
};

const ja: RaidMovesDict = {
  navLabel: "レイド技図鑑", navRaid: "🔥 レイドアタッカー", navBattle: "⚔️ バトル技図鑑", kindFast: "ノーマルアタック", kindCharged: "スペシャルアタック", secUnit: "秒",
  power: "威力", duration: "発動時間", energyGain: "獲得エネルギー", energyCost: "必要エネルギー", bars: (n) => `${n}ゲージ`,
  dpsLong: "DPS · 1秒あたり威力", epsLong: "EPS · 1秒あたりエネルギー", dpeLong: "DPE · エネルギーあたり威力", windowAt: "ダメージ発生",
  hubMetaTitle: "ポケモンGO レイド技図鑑 — 威力・発動時間・DPS・使うポケモン | GBL Note",
  hubMetaDesc: (f, c) => `ポケモンGOのレイド・ジムで使うノーマルアタック${f}種・スペシャルアタック${c}種の威力・発動時間・エネルギー・DPSを一覧で。技ごとに最も火力が出るポケモンの順位と、GOバトルリーグの数値との違いも。`,
  hubH1: "ポケモンGO レイド技図鑑 — 威力 · 発動時間 · DPS",
  hubIntro1: (f, c) => `レイド・ジムで使うノーマルアタック${f}種とスペシャルアタック${c}種の数値です。同じ技でも、GOバトルリーグとは威力・エネルギー・速さが別に決められています。バトルはターン単位、レイドは秒単位で動きます。技を押すと、その技で最も火力が出るポケモンの順位とバトル数値との比較が見られます。`,
  hubIntro2: "DPS = 威力 ÷ 発動時間、EPS = 獲得エネルギー ÷ 発動時間、DPE = 威力 ÷ 必要エネルギー。スペシャルアタックはエネルギー100が1ゲージ、50が2ゲージ、33が3ゲージです。見出しを押すとその数値で並び替えます。",
  topUsedH: "レイドアタッカーティアに最も多く載っている技", topUsedSub: "18タイプのアタッカーティア(タイプ別上位30)の推奨技構成を集計", usedSuffix: (n) => `${n}種が採用`,
  viewTable: "表で見る", viewTree: "タイプ別に見る", all: "すべて", searchPh: "技名を検索…", shown: (n, t) => `${t}件中 ${n}件`,
  colName: "技", colType: "タイプ", colUsers: "ティア採用", sortHint: "見出しを押すと並び替え", noResult: "条件に合う技がありません。",
  hubExplainH: "この数値の出どころは?",
  hubExplainBody: (d) => `威力・発動時間・エネルギーは公開ゲームデータ(PokeMinersゲームマスター、${d}時点)のレイド・ジム用の数値です。GOバトルリーグの数値は別で、バトル技図鑑で確認できます。DPS・EPS・DPEとポケモン別の順位はGBL Noteがその数値から計算しました。バランス調整があれば再計算して更新します。`,
  back: "← レイド技図鑑", metaTitle: (n) => `ポケモンGO ${n} レイド威力・DPS・使うポケモン | GBL Note`,
  metaDesc: (n, k) => `${n}(${k})のレイド・ジムでの威力・発動時間・エネルギー・DPS、この技で最も火力が出るポケモンの順位、GOバトルリーグの数値との違い。`,
  h1Suffix: "レイド数値 · DPS · 使うポケモン",
  rankOf: (r, t) => `${t}種中 ${r}位`,
  vsH: "レイド数値とバトル数値の比較", vsSub: "同じ技でも、レイド・ジムとGOバトルリーグでは数値が別に決められています。レイドで強い技がバトルでも強いとは限りません。",
  vsRaid: "レイド · ジム", vsBattle: "バトルリーグ", vsLink: "バトルの回数・使うポケモンを見る →", colSpeed: "速さ", turnsText: (t, s) => `${t}ターン(${s}秒)`, instant: "即時発動",
  topH: (n) => `${n} — 最も火力が出るポケモン`,
  topSub: "この技を含む最良の技構成のDPS順位です。アタッカーティアと同じ条件(レベル40 · 個体値15 · 相手の防御180 · スペシャルアタックのタイプが弱点のボス)で、メガフィナーレなどのイベント強化を含まない基本の数値です。",
  topCount: (s, t) => `覚えられる${t}種(シャドウ・メガを含む)のうち上位${s}種`,
  colRank: "順位", colMon: "ポケモン", colPairFast: "組み合わせるノーマルアタック", colPairCharged: "組み合わせるスペシャルアタック", colCycle: "1サイクル", cycleText: (n, s) => `ノーマル${n}回 + スペシャル1回 · ${s}秒`, colDps: "サイクルDPS",
  noTop: "実装済みのポケモンに、この技をレイドで使えるものはいません。",
  shadow: "シャドウ", legacyLegend: "★=レガシー(すごいわざマシン・イベント限定)",
  tableH: (n) => `${n} — アタッカーティアでの採用`, tableSub: (v) => `タイプ別アタッカーティア(${v}、各タイプ上位30)で、推奨技構成にこの技が入っているポケモンです。`,
  colTypeRank: "タイプ · 順位", rankText: (n) => `${n}位`, noTable: "現在のアタッカーティア(タイプ別上位30)の推奨技構成にこの技はありません。", verMega: "メガフィナーレ", verCurrent: "通常",
  effH: (t) => `${t}タイプ技の相性`, effSuper: "こうかはばつぐん ×1.6", effResist: "いまひとつ ×0.625", effDouble: "二重耐性 ×0.39", effNone: "なし",
  relatedH: (t, k) => `${t}タイプのほかの${k} — レイド数値`,
  explainH: "このページの数値はどう計算している?",
  explainBody: (d) => `威力・発動時間・エネルギーは公開ゲームデータ(PokeMinersゲームマスター、${d}時点)のレイド・ジム用の数値です。ダメージは floor(0.5 × 威力 × 攻撃 ÷ 防御 × タイプ一致1.2 × 相性) + 1 で計算し、サイクルDPSはノーマルアタックでエネルギーをためてスペシャルアタックを1回使うまでの合計ダメージを、かかった時間で割った値です。シャドウは攻撃1.2倍です。実際のレイドではボスのタイプ・技・回避で変わるため、ポケモン同士を比べる目安としてご覧ください。`,
  footer: (n, d) => `レイド技 ${n}件 · ゲームデータ ${d}`,
};

const zh: RaidMovesDict = {
  navLabel: "團體戰招式圖鑑", navRaid: "🔥 團體戰攻擊手排行", navBattle: "⚔️ 對戰招式圖鑑", kindFast: "一般招式", kindCharged: "特殊招式", secUnit: "秒",
  power: "威力", duration: "施放時間", energyGain: "獲得能量", energyCost: "所需能量", bars: (n) => `${n}格能量條`,
  dpsLong: "DPS · 每秒威力", epsLong: "EPS · 每秒能量", dpeLong: "DPE · 每點能量威力", windowAt: "傷害發生時間",
  hubMetaTitle: "寶可夢GO 團體戰招式圖鑑 — 威力·施放時間·DPS·使用寶可夢 | GBL Note",
  hubMetaDesc: (f, c) => `寶可夢GO團體戰·道館使用的一般招式${f}種·特殊招式${c}種，威力·施放時間·能量·DPS一表整理。每個招式輸出最高的寶可夢排名，以及與GO對戰聯盟數值的差異。`,
  hubH1: "寶可夢GO 團體戰招式圖鑑 — 威力 · 施放時間 · DPS",
  hubIntro1: (f, c) => `團體戰·道館使用的一般招式${f}種與特殊招式${c}種的數值。同一個招式在GO對戰聯盟的威力·能量·速度是另外設定的。對戰以回合計算，團體戰以秒計算。點選招式可查看用該招式輸出最高的寶可夢排名，以及與對戰數值的比較。`,
  hubIntro2: "DPS = 威力 ÷ 施放時間，EPS = 獲得能量 ÷ 施放時間，DPE = 威力 ÷ 所需能量。特殊招式的能量100為1格、50為2格、33為3格。點選欄位標題可依該數值排序。",
  topUsedH: "團體戰攻擊手排行中最常出現的招式", topUsedSub: "統計18屬性攻擊手排行(各屬性前30名)的推薦招式配置", usedSuffix: (n) => `${n}種採用`,
  viewTable: "表格", viewTree: "依屬性", all: "全部", searchPh: "搜尋招式名稱…", shown: (n, t) => `${t}項中 ${n}項`,
  colName: "招式", colType: "屬性", colUsers: "排行採用", sortHint: "點選標題可排序", noResult: "沒有符合條件的招式。",
  hubExplainH: "這些數值從哪裡來?",
  hubExplainBody: (d) => `威力·施放時間·能量為公開遊戲資料(PokeMiners遊戲主檔，${d})中團體戰·道館的數值。GO對戰聯盟的數值另外設定，可在對戰招式圖鑑查看。DPS·EPS·DPE與各寶可夢排名由GBL Note依這些數值計算，平衡調整後會重新計算更新。`,
  back: "← 團體戰招式圖鑑", metaTitle: (n) => `寶可夢GO ${n} 團體戰威力·DPS·使用寶可夢 | GBL Note`,
  metaDesc: (n, k) => `${n}(${k})在團體戰·道館的威力·施放時間·能量·DPS，用這個招式輸出最高的寶可夢排名，以及與GO對戰聯盟數值的差異。`,
  h1Suffix: "團體戰數值 · DPS · 使用寶可夢",
  rankOf: (r, t) => `${t}項中第${r}名`,
  vsH: "團體戰數值與對戰數值比較", vsSub: "同一個招式在團體戰·道館與GO對戰聯盟的數值是分開設定的。團體戰強的招式，在對戰中不一定強。",
  vsRaid: "團體戰 · 道館", vsBattle: "對戰聯盟", vsLink: "查看對戰所需次數·使用寶可夢 →", colSpeed: "速度", turnsText: (t, s) => `${t}回合(${s}秒)`, instant: "立即發動",
  topH: (n) => `${n} — 輸出最高的寶可夢`,
  topSub: "包含此招式的最佳招式配置DPS排名。條件與攻擊手排行相同(等級40 · 個體值15 · 對手防禦180 · 弱點為特殊招式屬性的頭目)，為不含超級大結局等活動加成的基本數值。",
  topCount: (s, t) => `可學會的${t}種(含暗影·超級進化)中前${s}名`,
  colRank: "排名", colMon: "寶可夢", colPairFast: "搭配的一般招式", colPairCharged: "搭配的特殊招式", colCycle: "一個循環", cycleText: (n, s) => `一般${n}次 + 特殊1次 · ${s}秒`, colDps: "循環DPS",
  noTop: "已推出的寶可夢中，沒有能在團體戰使用此招式的。",
  shadow: "暗影", legacyLegend: "★=傳承(厲害招式學習器·活動限定)",
  tableH: (n) => `${n} — 攻擊手排行採用`, tableSub: (v) => `在各屬性攻擊手排行(${v}，各屬性前30名)中，推薦招式配置包含此招式的寶可夢。`,
  colTypeRank: "屬性 · 排名", rankText: (n) => `第${n}名`, noTable: "目前攻擊手排行(各屬性前30名)的推薦招式配置中沒有此招式。", verMega: "超級大結局", verCurrent: "一般",
  effH: (t) => `${t}屬性招式的相剋`, effSuper: "效果絕佳 ×1.6", effResist: "效果不好 ×0.625", effDouble: "雙重抵抗 ×0.39", effNone: "無",
  relatedH: (t, k) => `${t}屬性的其他${k} — 團體戰數值`,
  explainH: "這頁的數值怎麼算的?",
  explainBody: (d) => `威力·施放時間·能量為公開遊戲資料(PokeMiners遊戲主檔，${d})中團體戰·道館的數值。傷害以 floor(0.5 × 威力 × 攻擊 ÷ 防禦 × 屬性一致1.2 × 相剋) + 1 計算，循環DPS是用一般招式累積能量後施放一次特殊招式的總傷害，除以所花的時間。暗影寶可夢攻擊1.2倍。實際團體戰會因頭目的屬性·招式·閃避而不同，請當作寶可夢之間比較的參考值。`,
  footer: (n, d) => `團體戰招式 ${n}個 · 遊戲資料 ${d}`,
};

const D: Record<Locale, RaidMovesDict> = { ko, en, ja, "zh-TW": zh };
export const getRaidMoves = (lang: Locale): RaidMovesDict => D[lang] || ko;
