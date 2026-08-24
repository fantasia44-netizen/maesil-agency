// PvP IV 체커 페이지 문구(3개국어).
export type IvDict = {
  navBack: string; navTier: string;
  h1: string; intro: string;
  searchPlaceholder: string; searchHint: string; selectPrompt: string; noResult: string;
  bestBuddy: string;
  findH: string; ivAtk: string; ivDef: string; ivHp: string; findBtn: string; yourRank: string; rankUnit: string; invalidIv: string;
  thRank: string; thIv: string; thCp: string; thLv: string; thAtk: string; thDef: string; thHp: string; thProduct: string;
  topNote: string; explainerH: string; explainerBody: string;
  footerGuide: string; footerPrivacy: string;
  metaTitle: string; metaDesc: string; ogTitle: string; ogDesc: string;
};

const ko: IvDict = {
  navBack: "← GBL Note", navTier: "🏆 티어표",
  h1: "포켓몬고 PvP IV 순위 체커",
  intro: "포켓몬을 검색하면 리그별(슈퍼·하이퍼·마스터) 최적 IV 순위를 스탯곱(Product) 기준으로 보여줍니다. 슈퍼·하이퍼리그는 CP 제한 때문에 공격 IV가 낮을수록 순위가 높은 경우가 많습니다.",
  searchPlaceholder: "포켓몬 이름 검색 (예: 가디안, 케르디오)",
  searchHint: "전체 도감에서 검색 — 레이드몬·일반몬 모두",
  selectPrompt: "포켓몬을 검색해 선택하세요.", noResult: "검색 결과가 없습니다.",
  bestBuddy: "베스트버디(+1레벨)",
  findH: "내 IV 순위 찾기", ivAtk: "공격", ivDef: "방어", ivHp: "체력", findBtn: "순위 확인", yourRank: "내 IV 순위", rankUnit: "위", invalidIv: "IV는 0~15로 입력하세요.",
  thRank: "순위", thIv: "IV (공/방/체)", thCp: "CP", thLv: "레벨", thAtk: "공격", thDef: "방어", thHp: "체력", thProduct: "Product",
  topNote: "상위 100위까지 표시 · 내 IV는 위에서 조회",
  explainerH: "IV 순위란?",
  explainerBody: "PvP(GBL)에서는 리그 CP 제한(슈퍼 1500·하이퍼 2500) 안에서 스탯곱(공격×방어×체력)이 높을수록 강합니다. CP 제한이 있으면 공격 종족값이 낮은 개체가 더 높은 레벨까지 올라가 방어·체력이 커져 순위가 높아집니다. 마스터리그는 제한이 없어 15/15/15가 항상 1위입니다.",
  footerGuide: "가이드", footerPrivacy: "개인정보처리방침",
  metaTitle: "포켓몬고 PvP IV 순위 체커 · 리그별 최적 개체값 | GBL Note",
  metaDesc: "포켓몬 GO PvP(배틀리그) IV 순위 체커. 원하는 포켓몬의 슈퍼·하이퍼·마스터리그 최적 개체값(IV)을 스탯곱 순위로 확인하세요. 전체 도감 지원.",
  ogTitle: "포켓몬고 PvP IV 순위 체커", ogDesc: "리그별 최적 IV를 스탯곱 순위로",
};

const en: IvDict = {
  navBack: "← GBL Note", navTier: "🏆 Tier list",
  h1: "Pokémon GO PvP IV Rank Checker",
  intro: "Search a Pokémon to see the best IVs per league (Great, Ultra, Master), ranked by stat product. In Great and Ultra League, a lower Attack IV often ranks higher because of the CP cap.",
  searchPlaceholder: "Search a Pokémon (e.g. Gardevoir, Keldeo)",
  searchHint: "Search the full Pokédex — raid and regular Pokémon",
  selectPrompt: "Search and select a Pokémon.", noResult: "No results.",
  bestBuddy: "Best Buddy (+1 level)",
  findH: "Find my IV rank", ivAtk: "Atk", ivDef: "Def", ivHp: "HP", findBtn: "Check rank", yourRank: "Your IV rank", rankUnit: "", invalidIv: "IVs must be 0–15.",
  thRank: "Rank", thIv: "IV (Atk/Def/HP)", thCp: "CP", thLv: "Level", thAtk: "Atk", thDef: "Def", thHp: "HP", thProduct: "Product",
  topNote: "Top 100 shown · look up your IV above",
  explainerH: "What is IV rank?",
  explainerBody: "In PvP (GBL), within the league CP cap (Great 1500, Ultra 2500), a higher stat product (Attack × Defense × HP) is stronger. With a CP cap, a lower Attack base lets the Pokémon reach a higher level, gaining Defense and HP, so it ranks higher. Master League has no cap, so 15/15/15 is always #1.",
  footerGuide: "Guides", footerPrivacy: "Privacy Policy",
  metaTitle: "Pokémon GO PvP IV Rank Checker · Best IVs by League | GBL Note",
  metaDesc: "Pokémon GO PvP (Battle League) IV rank checker. Find any Pokémon's best IVs for Great, Ultra and Master League ranked by stat product. Full Pokédex supported.",
  ogTitle: "Pokémon GO PvP IV Rank Checker", ogDesc: "Best IVs by league, ranked by stat product",
};

const ja: IvDict = {
  navBack: "← GBL Note", navTier: "🏆 ティア表",
  h1: "ポケモンGO PvP 個体値ランクチェッカー",
  intro: "ポケモンを検索するとリーグ別(スーパー・ハイパー・マスター)の最適個体値をステータス積(Product)順で表示します。スーパー・ハイパーはCP制限のため、こうげき個体値が低いほど順位が高いことが多いです。",
  searchPlaceholder: "ポケモン名で検索 (例: サーナイト, ケルディオ)",
  searchHint: "全図鑑から検索 — レイド・通常ポケモン両方",
  selectPrompt: "ポケモンを検索して選択してください。", noResult: "検索結果がありません。",
  bestBuddy: "バディ(+1レベル)",
  findH: "自分の個体値ランクを探す", ivAtk: "こうげき", ivDef: "ぼうぎょ", ivHp: "HP", findBtn: "ランク確認", yourRank: "あなたの個体値ランク", rankUnit: "位", invalidIv: "個体値は0〜15で入力してください。",
  thRank: "順位", thIv: "個体値 (攻/防/HP)", thCp: "CP", thLv: "レベル", thAtk: "攻", thDef: "防", thHp: "HP", thProduct: "Product",
  topNote: "上位100位まで表示 · 自分の個体値は上で照会",
  explainerH: "個体値ランクとは？",
  explainerBody: "PvP(GBL)ではリーグのCP制限(スーパー1500・ハイパー2500)内で、ステータス積(攻×防×HP)が高いほど強力です。CP制限があると、こうげき種族値が低い個体ほど高いレベルまで上げられ、防御・HPが増えて順位が上がります。マスターは制限なしのため15/15/15が常に1位です。",
  footerGuide: "ガイド", footerPrivacy: "プライバシーポリシー",
  metaTitle: "ポケモンGO PvP個体値ランクチェッカー · リーグ別最適個体値 | GBL Note",
  metaDesc: "ポケモンGO PvP(バトルリーグ)個体値ランクチェッカー。好きなポケモンのスーパー・ハイパー・マスターリーグ最適個体値をステータス積順で確認。全図鑑対応。",
  ogTitle: "ポケモンGO PvP個体値ランクチェッカー", ogDesc: "リーグ別最適個体値をステータス積順で",
};

const M = { ko, en, ja } as const;
export function getIv(lang: string): IvDict {
  return (M as Record<string, IvDict>)[lang] || ko;
}
