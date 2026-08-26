// PvP 배틀 시뮬레이터 문구(3개국어).
export type SimDict = {
  navBack: string; h1: string; intro: string;
  leagues: { great: string; ultra: string; master: string };
  searchPh: string; pickMon: string;
  fast: string; charged: string; ivLabel: string; atk: string; def: string; sta: string;
  level: string; cp: string; hp: string; shadow: string; bestBuddy: string; shields: string;
  vs: string; run: string;
  resultH: string; winA: string; winB: string; tie: string; empty: string;
  dealt: string; energyLeft: string; hpLeft: string; rating: string; shieldScenarios: string; fastHits: string; blocked: string; timelineH: string; chThrown: string; shUsed: string;
  metaTitle: string; metaDesc: string; metaKeywords: string[]; ogTitle: string; ogDesc: string;
};

const ko: SimDict = {
  navBack: "← GBL Note", h1: "포켓몬 GO PvP 배틀 시뮬레이터",
  intro: "두 포켓몬을 붙여보세요. 개체값(공/방/체)·기술·레벨·그림자·실드까지 지정해 실제 배틀 결과를 계산합니다.",
  leagues: { great: "슈퍼리그", ultra: "하이퍼리그", master: "마스터리그" },
  searchPh: "포켓몬 검색", pickMon: "포켓몬 선택",
  fast: "빠른 공격", charged: "차지 공격", ivLabel: "개체값", atk: "공격", def: "방어", sta: "체력",
  level: "레벨", cp: "CP", hp: "HP", shadow: "그림자", bestBuddy: "베스트버디(+1)", shields: "실드",
  vs: "VS", run: "배틀!",
  resultH: "배틀 결과", winA: "왼쪽 승", winB: "오른쪽 승", tie: "무승부", empty: "두 포켓몬을 선택하세요.",
  dealt: "가한 데미지", energyLeft: "남은 에너지", hpLeft: "남은 HP", rating: "배틀 점수", shieldScenarios: "실드 시나리오", fastHits: "패스트", blocked: "막힘", timelineH: "배틀 타임라인", chThrown: "차지", shUsed: "실드 사용",
  metaTitle: "포켓몬고 PvP 배틀 시뮬레이터 · 개체값·기술 지정 | GBL Note",
  metaDesc: "포켓몬 GO 배틀리그 1:1 시뮬레이터. 두 포켓몬의 개체값(공/방/체)·기술·레벨·그림자·실드를 지정해 실제 배틀 결과를 계산. 슈퍼·하이퍼·마스터리그.",
  metaKeywords: ["포켓몬고 배틀 시뮬레이터", "PvP 시뮬레이터", "배틀리그 시뮬", "포켓몬고 매치업", "1:1 배틀 계산기"],
  ogTitle: "포켓몬고 PvP 배틀 시뮬레이터", ogDesc: "개체값·기술 지정 1:1 배틀 계산",
};

const en: SimDict = {
  navBack: "← GBL Note", h1: "Pokémon GO PvP Battle Simulator",
  intro: "Pit two Pokémon against each other. Set IVs (Atk/Def/Sta), moves, level, shadow and shields to compute the real battle outcome.",
  leagues: { great: "Great League", ultra: "Ultra League", master: "Master League" },
  searchPh: "Search Pokémon", pickMon: "Pick a Pokémon",
  fast: "Fast Move", charged: "Charged Move", ivLabel: "IVs", atk: "ATK", def: "DEF", sta: "STA",
  level: "Level", cp: "CP", hp: "HP", shadow: "Shadow", bestBuddy: "Best Buddy (+1)", shields: "Shields",
  vs: "VS", run: "Battle!",
  resultH: "Battle Result", winA: "Left wins", winB: "Right wins", tie: "Tie", empty: "Pick two Pokémon.",
  dealt: "Damage dealt", energyLeft: "Energy left", hpLeft: "HP left", rating: "Battle score", shieldScenarios: "Shield scenarios", fastHits: "Fast", blocked: "Blocked", timelineH: "Battle timeline", chThrown: "Charged", shUsed: "Shields used",
  metaTitle: "Pokémon GO PvP Battle Simulator · IVs & Moves | GBL Note",
  metaDesc: "Pokémon GO Battle League 1v1 simulator. Set each Pokémon's IVs (Atk/Def/Sta), moves, level, shadow and shields to compute the real outcome. Great, Ultra & Master League.",
  metaKeywords: ["pokemon go battle simulator", "pvp simulator", "battle league sim", "pokemon go matchup", "1v1 calculator"],
  ogTitle: "Pokémon GO PvP Battle Simulator", ogDesc: "1v1 battle calc with custom IVs & moves",
};

const ja: SimDict = {
  navBack: "← GBL Note", h1: "ポケモンGO PvP バトルシミュレーター",
  intro: "2匹のポケモンを対戦。個体値(攻/防/HP)・技・レベル・シャドウ・シールドを指定して実際のバトル結果を計算します。",
  leagues: { great: "スーパーリーグ", ultra: "ハイパーリーグ", master: "マスターリーグ" },
  searchPh: "ポケモン検索", pickMon: "ポケモンを選択",
  fast: "ノーマルアタック", charged: "スペシャルアタック", ivLabel: "個体値", atk: "攻撃", def: "防御", sta: "HP",
  level: "レベル", cp: "CP", hp: "HP", shadow: "シャドウ", bestBuddy: "バディ(+1)", shields: "シールド",
  vs: "VS", run: "バトル!",
  resultH: "バトル結果", winA: "左の勝ち", winB: "右の勝ち", tie: "引き分け", empty: "2匹選んでください。",
  dealt: "与ダメージ", energyLeft: "残エネルギー", hpLeft: "残HP", rating: "バトルスコア", shieldScenarios: "シールド想定", fastHits: "通常", blocked: "シールド", timelineH: "バトルタイムライン", chThrown: "ゲージ", shUsed: "シールド使用",
  metaTitle: "ポケモンGO PvP バトルシミュレーター · 個体値・技指定 | GBL Note",
  metaDesc: "ポケモンGO バトルリーグ 1vs1 シミュレーター。2匹の個体値(攻/防/HP)・技・レベル・シャドウ・シールドを指定して実際の結果を計算。スーパー・ハイパー・マスターリーグ。",
  metaKeywords: ["ポケモンGO バトルシミュレーター", "PvP シミュ", "バトルリーグ 計算", "ポケモンGO 対面", "1vs1 計算機"],
  ogTitle: "ポケモンGO PvP バトルシミュレーター", ogDesc: "個体値・技指定の1vs1バトル計算",
};

const M = { ko, en, ja } as const;
export function getSim(lang: string): SimDict { return (M as Record<string, SimDict>)[lang] || ko; }
