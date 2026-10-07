// 기술 도감(/gbl/moves) 문구 — 4개국어. 숫자·이름은 페이지에서 주입(함수형 키).
import type { Locale } from "../../../../lib/i18n";

export type MovesDict = {
  // 공통
  navLabel: string; navTier: string; navGuide: string; kindFast: string; kindCharged: string; turnUnit: string; secUnit: string; hitsUnit: string;
  power: string; energyCost: string; energyGain: string; turns: string; effect: string; noEffect: string;
  dptLong: string; eptLong: string; dpeLong: string;
  buffSelf: string; buffOpp: string; buffAtk: string; buffDef: string; buffStage: (n: number) => string; buffChance: (pct: string) => string;
  // 허브
  hubMetaTitle: string; hubMetaDesc: (fast: number, charged: number) => string;
  hubH1: string; hubIntro1: (fast: number, charged: number) => string; hubIntro2: string;
  topUsedH: string; topUsedSub: string; usedSuffix: (n: number) => string;
  viewTable: string; viewTree: string; all: string; searchPh: string; shown: (n: number | string, total: number | string) => string;
  colName: string; colType: string; colUsers: string; colLearners: string; sortHint: string; noResult: string;
  hubExplainH: string; hubExplainBody: (date: string) => string;
  // 상세
  back: string; metaTitle: (name: string, kind: string) => string; metaDesc: (name: string, kind: string) => string; h1Suffix: string;
  rankOf: (rank: number, total: number) => string;
  countsHCharged: (name: string) => string; countsHFast: (name: string) => string; countsSub: string;
  colFastMoves: string; colChargedMoves: string; colPerTurn: string; colCounts: string; colFirst: string; more: (n: number) => string;
  usersH: (name: string) => string; usersSub: (def: number, hp: number) => string;
  colMon: string; colTier: string; colRecFast: string; colRecCharged: string; colDmg: string; colPct: string; colDmgHit: string; colDmgTurn: string;
  noUsers: string; stab: string; usersCount: (n: number) => string;
  effH: (type: string) => string; effSuper: string; effResist: string; effDouble: string; effNone: string;
  learnersH: (name: string, n: number) => string; learnersSub: string; legacyLegend: string;
  relatedH: (type: string, kind: string) => string;
  explainH: string; explainBody: (date: string) => string;
};

const ko: MovesDict = {
  navLabel: "기술 도감", navTier: "🏆 티어표", navGuide: "📘 기술배치 고르는 법", kindFast: "빠른 기술", kindCharged: "차지 기술", turnUnit: "턴", secUnit: "초", hitsUnit: "타",
  power: "위력", energyCost: "필요 에너지", energyGain: "획득 에너지", turns: "턴", effect: "부가 효과", noEffect: "없음",
  dptLong: "DPT · 턴당 데미지", eptLong: "EPT · 턴당 에너지", dpeLong: "DPE · 에너지당 데미지",
  buffSelf: "자신", buffOpp: "상대", buffAtk: "공격", buffDef: "방어", buffStage: (n) => `${n > 0 ? "+" : ""}${n}단계`, buffChance: (p) => `확률 ${p}%`,
  hubMetaTitle: "포켓몬GO 기술 도감 — PvP 위력·에너지·타수·사용 포켓몬 | GBL Note",
  hubMetaDesc: (f, c) => `배틀리그 빠른 기술 ${f}개·차지 기술 ${c}개의 위력·에너지·턴·DPT·EPT·DPE를 한 표로. 기술별 타수와 이번 시즌 그 기술을 쓰는 메타 포켓몬, 예상 데미지까지.`,
  hubH1: "포켓몬GO 기술 도감 — PvP 수치 · 타수 · 사용 포켓몬",
  hubIntro1: (f, c) => `배틀리그(PvP)에서 쓰는 빠른 기술 ${f}개와 차지 기술 ${c}개의 위력·에너지·턴을 한 표로 정리했습니다. 기술을 누르면 빠른 기술별 타수, 이번 시즌 그 기술을 쓰는 메타 포켓몬, 평균 상대에게 들어가는 예상 데미지를 볼 수 있습니다.`,
  hubIntro2: "DPT = 턴당 데미지, EPT = 턴당 에너지(1턴 = 0.5초), DPE = 에너지 1당 데미지. EPT가 높을수록 차지 기술이 빨리 차고, DPE가 높을수록 같은 에너지로 더 세게 칩니다. 머리글을 누르면 그 수치로 정렬됩니다.",
  topUsedH: "이번 시즌 메타가 가장 많이 쓰는 기술", topUsedSub: "슈퍼·하이퍼·마스터 상위권 포켓몬의 추천 기술배치 집계", usedSuffix: (n) => `${n}종 채용`,
  viewTable: "표로 보기", viewTree: "타입별로 보기", all: "전체", searchPh: "기술 이름 검색…", shown: (n, t) => `${t}개 중 ${n}개`,
  colName: "기술", colType: "타입", colUsers: "메타 채용", colLearners: "배우는 포켓몬", sortHint: "머리글을 누르면 정렬", noResult: "조건에 맞는 기술이 없습니다.",
  hubExplainH: "수치는 어디서 나온 건가요?",
  hubExplainBody: (d) => `위력·에너지·턴은 PvPoke 공개 게임마스터(${d}) 기준 PvP 수치입니다(레이드·체육관 수치와 다릅니다). DPT·EPT·DPE와 타수, 메타 채용 수는 GBL Note가 그 수치와 현재 시즌 티어 데이터로 계산했습니다. 밸런스 패치가 있으면 다시 계산해 갱신합니다.`,
  back: "← 기술 도감", metaTitle: (n, k) => `${n} — ${k} 위력·타수·사용 포켓몬 | GBL Note`,
  metaDesc: (n, k) => `${n}(${k})의 PvP 위력·에너지·턴, 빠른 기술별 타수, 이번 시즌 이 기술을 쓰는 메타 포켓몬과 예상 데미지, 배울 수 있는 포켓몬 전체.`,
  h1Suffix: "PvP 수치 · 타수 · 사용 포켓몬",
  rankOf: (r, t) => `${t}개 중 ${r}위`,
  countsHCharged: (n) => `${n} — 빠른 기술별 타수`, countsHFast: (n) => `${n} — 차지 기술까지 타수`,
  countsSub: "타수 = 차지 기술을 쓰기까지 빠른 기술 횟수. 1·2·3번째 발동 순서이며 남은 에너지 이월을 반영했습니다. 1턴 = 0.5초.",
  colFastMoves: "빠른 기술", colChargedMoves: "차지 기술", colPerTurn: "획득 / 턴", colCounts: "타수 (1·2·3번째)", colFirst: "첫 발동까지", more: (n) => `외 ${n}개`,
  usersH: (n) => `${n} — 이 기술을 쓰는 메타 포켓몬`,
  usersSub: (d, h) => `현재 시즌 추천 기술배치 기준. 예상 데미지는 그 리그 상위권의 중앙값 상대(방어 ${d} · HP ${h})에게 상성 중립으로 맞췄을 때의 값입니다.`,
  colMon: "포켓몬", colTier: "티어", colRecFast: "추천 빠른 기술 · 타수", colRecCharged: "추천 차지 기술 · 타수", colDmg: "예상 데미지", colPct: "상대 HP 대비", colDmgHit: "1타 데미지", colDmgTurn: "턴당",
  noUsers: "이번 시즌 상위권 포켓몬의 추천 기술배치에는 이 기술이 없습니다.", stab: "자속", usersCount: (n) => `${n}종`,
  effH: (t) => `${t} 타입 기술의 상성`, effSuper: "효과가 굉장함 ×1.6", effResist: "효과가 별로 ×0.625", effDouble: "이중 반감 ×0.39", effNone: "해당 없음",
  learnersH: (n, c) => `${n} — 배우는 포켓몬 ${c}종`, learnersSub: "그림자·메가는 기본 폼과 같아 생략했습니다(전용 기술만 따로 표기). 이름에 링크가 있는 포켓몬은 상세 페이지가 있습니다.", legacyLegend: "★ = 레거시(엘리트 기술머신·이벤트 한정)",
  relatedH: (t, k) => `${t} 타입의 다른 ${k}`,
  explainH: "이 페이지의 숫자는 어떻게 계산했나요?",
  explainBody: (d) => `위력·에너지·턴은 PvPoke 공개 게임마스터(${d}) 기준입니다. 타수는 에너지 이월을 반영해 GBL Note가 계산했습니다. 예상 데미지는 현재 시즌 각 리그 상위권 포켓몬의 방어·HP 중앙값을 평균 상대로 놓고 PvP 데미지 공식(자속 1.2배 · 그림자 공격 1.2배 · 배틀 보정 1.3배 · 상성 중립)으로 계산한 참고값이며, 실제 데미지는 상대 타입과 개체값에 따라 달라집니다.`,
};

const en: MovesDict = {
  navLabel: "Move Dex", navTier: "🏆 Tier List", navGuide: "📘 Choosing a moveset", kindFast: "Fast Move", kindCharged: "Charged Move", turnUnit: "T", secUnit: "s", hitsUnit: "",
  power: "Power", energyCost: "Energy cost", energyGain: "Energy gain", turns: "Turns", effect: "Effect", noEffect: "None",
  dptLong: "DPT · damage per turn", eptLong: "EPT · energy per turn", dpeLong: "DPE · damage per energy",
  buffSelf: "Self", buffOpp: "Opponent", buffAtk: "Attack", buffDef: "Defense", buffStage: (n) => `${n > 0 ? "+" : ""}${n}`, buffChance: (p) => `${p}% chance`,
  hubMetaTitle: "Pokémon GO PvP Move Dex — Power, Energy, Counts & Users | GBL Note",
  hubMetaDesc: (f, c) => `All ${f} fast moves and ${c} charged moves for GO Battle League in one table: power, energy, turns, DPT, EPT, DPE. Plus fast-move counts, this season's meta users and estimated damage per move.`,
  hubH1: "Pokémon GO Move Dex — PvP Stats, Counts & Users",
  hubIntro1: (f, c) => `Power, energy and turns for all ${f} fast moves and ${c} charged moves used in GO Battle League, in one table. Open a move for fast-move counts, the meta Pokémon running it this season, and estimated damage into an average opponent.`,
  hubIntro2: "DPT = damage per turn, EPT = energy per turn (1 turn = 0.5s), DPE = damage per point of energy. Higher EPT reaches charged moves sooner; higher DPE hits harder for the same energy. Tap a column header to sort.",
  topUsedH: "Most-used moves in this season's meta", topUsedSub: "Counted from recommended movesets of top-ranked Great, Ultra and Master League Pokémon", usedSuffix: (n) => `${n} users`,
  viewTable: "Table", viewTree: "By type", all: "All", searchPh: "Search move name…", shown: (n, t) => `${n} of ${t}`,
  colName: "Move", colType: "Type", colUsers: "Meta users", colLearners: "Learners", sortHint: "Tap a header to sort", noResult: "No moves match.",
  hubExplainH: "Where do these numbers come from?",
  hubExplainBody: (d) => `Power, energy and turns are PvP values from the public PvPoke gamemaster (${d}) — they differ from raid/gym values. DPT, EPT, DPE, counts and meta usage are computed by GBL Note from those values and the current season tier data, and are recomputed after balance changes.`,
  back: "← Move Dex", metaTitle: (n, k) => `${n} — ${k} Stats, Counts & Users (PvP) | GBL Note`,
  metaDesc: (n, k) => `${n} (${k}) in GO Battle League: power, energy, turns, fast-move counts, meta Pokémon using it this season with estimated damage, and every Pokémon that can learn it.`,
  h1Suffix: "PvP Stats · Counts · Users",
  rankOf: (r, t) => `#${r} of ${t}`,
  countsHCharged: (n) => `${n} — counts by fast move`, countsHFast: (n) => `${n} — counts to each charged move`,
  countsSub: "Count = fast moves needed before the charged move. Shown for the 1st, 2nd and 3rd use with leftover energy carried over. 1 turn = 0.5s.",
  colFastMoves: "Fast move", colChargedMoves: "Charged move", colPerTurn: "Gain / turns", colCounts: "Counts (1st·2nd·3rd)", colFirst: "First use in", more: (n) => `+${n} more`,
  usersH: (n) => `Meta Pokémon running ${n}`,
  usersSub: (d, h) => `From this season's recommended movesets. Estimated damage is neutral damage into that league's median top-ranked opponent (Def ${d} · HP ${h}).`,
  colMon: "Pokémon", colTier: "Tier", colRecFast: "Fast move · counts", colRecCharged: "Charged moves · counts", colDmg: "Est. damage", colPct: "% of HP", colDmgHit: "Per hit", colDmgTurn: "Per turn",
  noUsers: "No top-ranked Pokémon runs this move in its recommended moveset this season.", stab: "STAB", usersCount: (n) => `${n}`,
  effH: (t) => `${t}-type move effectiveness`, effSuper: "Super effective ×1.6", effResist: "Not very effective ×0.625", effDouble: "Double resisted ×0.39", effNone: "None",
  learnersH: (n, c) => `${c} Pokémon that learn ${n}`, learnersSub: "Shadow and Mega forms share the base form's moves and are omitted (exclusive moves are listed). Linked names have a detail page.", legacyLegend: "★ = legacy (Elite TM / event-exclusive)",
  relatedH: (t, k) => `Other ${t}-type ${k}s`,
  explainH: "How are these numbers calculated?",
  explainBody: (d) => `Power, energy and turns come from the public PvPoke gamemaster (${d}). Counts are computed by GBL Note with energy carryover. Estimated damage uses the PvP damage formula (STAB ×1.2, Shadow attack ×1.2, battle bonus ×1.3, neutral effectiveness) against each league's median Defense and HP among top-ranked Pokémon this season. It is a reference value — real damage depends on the opponent's typing and IVs.`,
};

const ja: MovesDict = {
  navLabel: "技図鑑", navTier: "🏆 ティア表", navGuide: "📘 技構成の選び方", kindFast: "ノーマルアタック", kindCharged: "スペシャルアタック", turnUnit: "ターン", secUnit: "秒", hitsUnit: "回",
  power: "威力", energyCost: "必要エネルギー", energyGain: "獲得エネルギー", turns: "ターン", effect: "追加効果", noEffect: "なし",
  dptLong: "DPT · ターンあたりダメージ", eptLong: "EPT · ターンあたりエネルギー", dpeLong: "DPE · エネルギーあたりダメージ",
  buffSelf: "自分", buffOpp: "相手", buffAtk: "こうげき", buffDef: "ぼうぎょ", buffStage: (n) => `${n > 0 ? "+" : ""}${n}段階`, buffChance: (p) => `確率${p}%`,
  hubMetaTitle: "ポケモンGO 技図鑑 — PvPの威力・エネルギー・発動回数・採用ポケモン | GBL Note",
  hubMetaDesc: (f, c) => `GOバトルリーグのノーマルアタック${f}種・スペシャルアタック${c}種の威力・エネルギー・ターン・DPT・EPT・DPEを一覧に。技ごとの発動回数、今シーズンの採用ポケモン、想定ダメージまで。`,
  hubH1: "ポケモンGO 技図鑑 — PvP数値 · 発動回数 · 採用ポケモン",
  hubIntro1: (f, c) => `GOバトルリーグ(PvP)で使うノーマルアタック${f}種とスペシャルアタック${c}種の威力・エネルギー・ターンを一つの表にまとめました。技を開くと、ノーマルアタック別の発動回数、今シーズンその技を採用しているメタポケモン、平均的な相手への想定ダメージが見られます。`,
  hubIntro2: "DPT=ターンあたりダメージ、EPT=ターンあたりエネルギー(1ターン=0.5秒)、DPE=エネルギー1あたりダメージ。EPTが高いほどゲージが早く溜まり、DPEが高いほど同じエネルギーで大きく削れます。見出しをタップで並べ替え。",
  topUsedH: "今シーズンのメタで最も使われている技", topUsedSub: "スーパー・ハイパー・マスター上位ポケモンの推奨技構成を集計", usedSuffix: (n) => `${n}種が採用`,
  viewTable: "表で見る", viewTree: "タイプ別に見る", all: "すべて", searchPh: "技名を検索…", shown: (n, t) => `${t}件中 ${n}件`,
  colName: "技", colType: "タイプ", colUsers: "メタ採用", colLearners: "覚えるポケモン", sortHint: "見出しをタップで並べ替え", noResult: "条件に合う技がありません。",
  hubExplainH: "この数値の出どころは?",
  hubExplainBody: (d) => `威力・エネルギー・ターンはPvPoke公開ゲームマスター(${d})のPvP数値です(レイド・ジムの数値とは異なります)。DPT・EPT・DPE、発動回数、メタ採用数は、その数値と今シーズンのティアデータからGBL Noteが計算しています。バランス調整があれば再計算して更新します。`,
  back: "← 技図鑑", metaTitle: (n, k) => `${n} — ${k}の威力・発動回数・採用ポケモン | GBL Note`,
  metaDesc: (n, k) => `${n}(${k})のPvP威力・エネルギー・ターン、ノーマルアタック別の発動回数、今シーズンの採用メタポケモンと想定ダメージ、覚えるポケモン一覧。`,
  h1Suffix: "PvP数値 · 発動回数 · 採用ポケモン",
  rankOf: (r, t) => `${t}種中 ${r}位`,
  countsHCharged: (n) => `${n} — ノーマルアタック別の発動回数`, countsHFast: (n) => `${n} — スペシャルアタックまでの回数`,
  countsSub: "回数=スペシャルアタックを撃つまでのノーマルアタック回数。1・2・3回目の順で、余ったエネルギーの持ち越しを反映。1ターン=0.5秒。",
  colFastMoves: "ノーマルアタック", colChargedMoves: "スペシャルアタック", colPerTurn: "獲得 / ターン", colCounts: "回数 (1・2・3回目)", colFirst: "初回発動まで", more: (n) => `ほか${n}種`,
  usersH: (n) => `${n}を採用しているメタポケモン`,
  usersSub: (d, h) => `今シーズンの推奨技構成より。想定ダメージは、そのリーグ上位の中央値の相手(ぼうぎょ${d} · HP${h})に等倍で当てた場合の値です。`,
  colMon: "ポケモン", colTier: "ティア", colRecFast: "推奨ノーマルアタック · 回数", colRecCharged: "推奨スペシャルアタック · 回数", colDmg: "想定ダメージ", colPct: "相手HP比", colDmgHit: "1発", colDmgTurn: "ターンあたり",
  noUsers: "今シーズン、上位ポケモンの推奨技構成にこの技はありません。", stab: "タイプ一致", usersCount: (n) => `${n}種`,
  effH: (t) => `${t}タイプ技の相性`, effSuper: "こうかはばつぐん ×1.6", effResist: "いまひとつ ×0.625", effDouble: "二重耐性 ×0.39", effNone: "なし",
  learnersH: (n, c) => `${n}を覚えるポケモン ${c}種`, learnersSub: "シャドウ・メガは通常フォルムと同じため省略(専用技のみ別記)。リンク付きの名前は詳細ページがあります。", legacyLegend: "★=レガシー(すごいわざマシン・イベント限定)",
  relatedH: (t, k) => `${t}タイプのほかの${k}`,
  explainH: "このページの数値はどう計算している?",
  explainBody: (d) => `威力・エネルギー・ターンはPvPoke公開ゲームマスター(${d})に基づきます。発動回数はエネルギー持ち越しを反映してGBL Noteが計算。想定ダメージは今シーズン各リーグ上位ポケモンのぼうぎょ・HP中央値を平均的な相手とし、PvPダメージ式(タイプ一致1.2倍 · シャドウ攻撃1.2倍 · バトル補正1.3倍 · 等倍)で計算した参考値で、実際のダメージは相手のタイプと個体値で変わります。`,
};

const zh: MovesDict = {
  navLabel: "招式圖鑑", navTier: "🏆 強度表", navGuide: "📘 招式配置怎麼選", kindFast: "一般招式", kindCharged: "特殊招式", turnUnit: "回合", secUnit: "秒", hitsUnit: "次",
  power: "威力", energyCost: "所需能量", energyGain: "獲得能量", turns: "回合", effect: "附加效果", noEffect: "無",
  dptLong: "DPT · 每回合傷害", eptLong: "EPT · 每回合能量", dpeLong: "DPE · 每點能量傷害",
  buffSelf: "自己", buffOpp: "對手", buffAtk: "攻擊", buffDef: "防禦", buffStage: (n) => `${n > 0 ? "+" : ""}${n}階`, buffChance: (p) => `機率${p}%`,
  hubMetaTitle: "Pokémon GO 招式圖鑑 — PvP 威力·能量·所需次數·使用寶可夢 | GBL Note",
  hubMetaDesc: (f, c) => `GO對戰聯盟一般招式${f}種、特殊招式${c}種的威力·能量·回合·DPT·EPT·DPE 一表看完。各招式的所需次數、本賽季使用的主流寶可夢與預估傷害。`,
  hubH1: "Pokémon GO 招式圖鑑 — PvP 數值 · 所需次數 · 使用寶可夢",
  hubIntro1: (f, c) => `整理了GO對戰聯盟(PvP)使用的一般招式${f}種與特殊招式${c}種的威力·能量·回合。點開招式可看各一般招式的所需次數、本賽季使用該招式的主流寶可夢，以及對平均對手的預估傷害。`,
  hubIntro2: "DPT=每回合傷害，EPT=每回合能量(1回合=0.5秒)，DPE=每點能量的傷害。EPT越高特殊招式集得越快，DPE越高同樣能量打得越痛。點欄位標題可排序。",
  topUsedH: "本賽季主流最常用的招式", topUsedSub: "統計超級·高級·大師聯盟前段寶可夢的推薦招式配置", usedSuffix: (n) => `${n}種採用`,
  viewTable: "表格", viewTree: "依屬性", all: "全部", searchPh: "搜尋招式名稱…", shown: (n, t) => `${t}項中 ${n}項`,
  colName: "招式", colType: "屬性", colUsers: "主流採用", colLearners: "可學寶可夢", sortHint: "點標題排序", noResult: "沒有符合條件的招式。",
  hubExplainH: "這些數值從哪裡來?",
  hubExplainBody: (d) => `威力·能量·回合為PvPoke公開遊戲主檔(${d})的PvP數值(與團體戰·道館數值不同)。DPT·EPT·DPE、所需次數與主流採用數，由GBL Note依這些數值與本賽季強度資料計算，平衡調整後會重新計算更新。`,
  back: "← 招式圖鑑", metaTitle: (n, k) => `${n} — ${k}威力·所需次數·使用寶可夢 | GBL Note`,
  metaDesc: (n, k) => `${n}(${k})的PvP威力·能量·回合、各一般招式的所需次數、本賽季使用的主流寶可夢與預估傷害，以及所有可學的寶可夢。`,
  h1Suffix: "PvP 數值 · 所需次數 · 使用寶可夢",
  rankOf: (r, t) => `${t}種中第${r}名`,
  countsHCharged: (n) => `${n} — 各一般招式的所需次數`, countsHFast: (n) => `${n} — 到各特殊招式的次數`,
  countsSub: "次數=發動特殊招式前需要的一般招式次數。依第1·2·3次發動排列，已計入剩餘能量結轉。1回合=0.5秒。",
  colFastMoves: "一般招式", colChargedMoves: "特殊招式", colPerTurn: "獲得 / 回合", colCounts: "次數 (第1·2·3次)", colFirst: "首次發動", more: (n) => `另${n}種`,
  usersH: (n) => `使用${n}的主流寶可夢`,
  usersSub: (d, h) => `依本賽季推薦招式配置。預估傷害為對該聯盟前段中位數對手(防禦${d} · HP${h})、屬性相剋等倍時的數值。`,
  colMon: "寶可夢", colTier: "強度", colRecFast: "推薦一般招式 · 次數", colRecCharged: "推薦特殊招式 · 次數", colDmg: "預估傷害", colPct: "佔對手HP", colDmgHit: "單發", colDmgTurn: "每回合",
  noUsers: "本賽季前段寶可夢的推薦招式配置中沒有這個招式。", stab: "本系", usersCount: (n) => `${n}種`,
  effH: (t) => `${t}屬性招式的相剋`, effSuper: "效果絕佳 ×1.6", effResist: "效果不好 ×0.625", effDouble: "雙重抵抗 ×0.39", effNone: "無",
  learnersH: (n, c) => `可學${n}的寶可夢 ${c}種`, learnersSub: "暗影·超級進化與一般型態相同故省略(專屬招式另列)。有連結的名稱有詳細頁面。", legacyLegend: "★=絕版(厲害招式學習器·活動限定)",
  relatedH: (t, k) => `${t}屬性的其他${k}`,
  explainH: "這頁的數值怎麼算的?",
  explainBody: (d) => `威力·能量·回合依PvPoke公開遊戲主檔(${d})。所需次數由GBL Note計入能量結轉計算。預估傷害以本賽季各聯盟前段寶可夢的防禦·HP中位數為平均對手，用PvP傷害公式(本系1.2倍 · 暗影攻擊1.2倍 · 對戰補正1.3倍 · 等倍)計算，僅供參考，實際傷害依對手屬性與個體值而異。`,
};

const D: Record<Locale, MovesDict> = { ko, en, ja, "zh-TW": zh };
export const getMoves = (lang: Locale): MovesDict => D[lang] || ko;
