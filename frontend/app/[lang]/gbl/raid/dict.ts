// 레이드 딜러 허브(속성 인덱스) 페이지 문구(3개국어).
export type RaidHubDict = {
  navPvp: string; h1: string; intro: string;
  schedH: string; schedP: string; bossH: string; bossP: string;
  rankPrefix: string;
  explainerH: string; explainerBody: string; updateLabel: string;
  metaTitle: string; metaDesc: string; ogTitle: string; ogDesc: string;
};

const ko: RaidHubDict = {
  navPvp: "⚔️ PvP 티어표 →",
  h1: "포켓몬고 레이드 딜러 티어표",
  intro: "레이드에 넣을 속성별 최강 공격수를 DPS 순으로 정리했습니다. 잡으려는 레이드 보스의 약점 속성을 고르면, 그 타입 딜러 순위와 추천 기술배치가 나옵니다. 메가진화·섀도우 포함.",
  schedH: "레이드 스케줄", schedP: "5성·메가 로테이션 기간 + 레이드 아워·데이 일정",
  bossH: "지금 보스 · 100% CP", bossP: "현재 5성·메가 보스와 100% 개체 CP, 약점 딜러까지",
  rankPrefix: "1위 ",
  explainerH: "레이드 딜러, 이렇게 고르세요",
  explainerBody: "레이드 보스마다 약점 속성이 있습니다. 예를 들어 물 타입 보스에는 풀·전기 딜러가 강하죠. 위에서 보스 약점 속성을 눌러 상위 딜러를 확인하고, 가진 포켓몬 중 순위가 높은 걸 넣으면 됩니다. 메가진화 1마리를 넣으면 같은 속성 딜러 전체가 강해집니다. 순위는 공개 게임 데이터로 계산한 DPS 기준입니다.",
  updateLabel: "업데이트",
  metaTitle: "포켓몬고 레이드 딜러 티어표 · 속성별 어택커 DPS 순위 | GBL Note",
  metaDesc: "포켓몬 GO 레이드 공격수(어택커) 속성별 DPS·내구 순위. 18타입 최적 딜러와 추천 기술배치, 메가진화·섀도우 포함. 레이드 파밍 필수 티어표.",
  ogTitle: "포켓몬고 레이드 딜러 티어표 (속성별 DPS 순위)", ogDesc: "18타입 최적 어택커 + 추천 기술 · 메가/섀도우 포함",
};

const en: RaidHubDict = {
  navPvp: "⚔️ PvP tiers →",
  h1: "Pokémon GO Raid Attacker Tiers",
  intro: "The best attackers for raids, by type, ranked by DPS. Pick the raid boss's weakness type to see that type's attacker ranking and recommended movesets. Megas and Shadows included.",
  schedH: "Raid Schedule", schedP: "5★/Mega rotation periods + Raid Hour/Day schedule",
  bossH: "Current bosses · 100% CP", bossP: "Current 5★/Mega bosses with 100% IV catch CP and their counters",
  rankPrefix: "#1 ",
  explainerH: "How to pick raid attackers",
  explainerBody: "Every raid boss has weakness types — e.g., Grass and Electric attackers are strong against a Water boss. Tap the boss's weakness type above to see the top attackers, and use the highest-ranked one you own. Adding one Mega boosts all attackers of the same type. Rankings are DPS calculated from public game data.",
  updateLabel: "Updated",
  metaTitle: "Raid Attacker Tier List · DPS Ranking by Type | GBL Note",
  metaDesc: "Pokémon GO raid attacker DPS & bulk tier ranking by type. Best attackers for all 18 types with recommended movesets, Megas and Shadows included.",
  ogTitle: "Pokémon GO Raid Attacker Tiers (DPS by type)", ogDesc: "Best attackers for all 18 types + recommended moves · Megas/Shadows",
};

const ja: RaidHubDict = {
  navPvp: "⚔️ PvPティア表 →",
  h1: "ポケモンGO レイドアタッカーティア",
  intro: "レイド向けの属性別最強アタッカーをDPS順に整理。倒したいレイドボスの弱点属性を選ぶと、そのタイプのアタッカー順位と推奨技構成が出ます。メガ・シャドウ含む。",
  schedH: "レイドスケジュール", schedP: "5★・メガ ローテ期間 + レイドアワー・デイ日程",
  bossH: "現在のボス · 100%CP", bossP: "現在の5★・メガボスと100%個体CP、弱点アタッカーまで",
  rankPrefix: "1位 ",
  explainerH: "レイドアタッカーの選び方",
  explainerBody: "レイドボスには弱点属性があります。例えば水タイプのボスには草・電気アタッカーが強い。上でボスの弱点属性を押して上位アタッカーを確認し、手持ちで順位の高いものを入れましょう。メガを1体入れると同属性アタッカー全体が強化されます。順位は公開ゲームデータで計算したDPS基準です。",
  updateLabel: "更新",
  metaTitle: "ポケモンGO レイドアタッカー ティア表 · 属性別DPS順位 | GBL Note",
  metaDesc: "ポケモンGOレイドアタッカーの属性別DPS・耐久順位。18タイプ最適アタッカーと推奨技構成、メガ・シャドウ含む。レイド周回必須ティア表。",
  ogTitle: "ポケモンGO レイドアタッカーティア(属性別DPS順位)", ogDesc: "18タイプ最適アタッカー + 推奨技 · メガ/シャドウ含む",
};

const R = { ko, en, ja } as const;
export function getRaidHub(lang: string): RaidHubDict {
  return (R as Record<string, RaidHubDict>)[lang] || ko;
}
