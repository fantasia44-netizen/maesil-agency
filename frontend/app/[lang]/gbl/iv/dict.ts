// PvP IV 체커 페이지 문구(3개국어).
export type IvDict = {
  navBack: string; navTier: string;
  h1: string; intro: string;
  searchPlaceholder: string; searchHint: string; selectPrompt: string; noResult: string;
  bestBuddy: string;
  findH: string; ivAtk: string; ivDef: string; ivHp: string; findBtn: string; yourRank: string; rankUnit: string; invalidIv: string;
  thRank: string; thIv: string; thCp: string; thLv: string; thAtk: string; thDef: string; thHp: string; thProduct: string;
  topNote: string; explainerH: string; explainerBody: string;
  shareBtn: string; imgBuilding: string; imgShare: string; imgSave: string; imgClose: string; imgFooter: string; imgTopLabel: string;
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
  shareBtn: "📸 이 IV 순위표 이미지로 공유·저장", imgBuilding: "이미지 생성 중…", imgShare: "📤 공유", imgSave: "💾 저장", imgClose: "닫기", imgFooter: "포켓몬GO PvP IV 순위", imgTopLabel: "상위 {n}위",
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
  shareBtn: "📸 Save/Share this IV ranking", imgBuilding: "Generating image…", imgShare: "📤 Share", imgSave: "💾 Save", imgClose: "Close", imgFooter: "Pokémon GO PvP IV Ranks", imgTopLabel: "Top {n}",
  footerGuide: "Guides", footerPrivacy: "Privacy Policy",
  metaTitle: "Pokémon GO PvP IV Checker · IV Ranking by League | GBL Note",
  metaDesc: "Pokémon GO PvP (Battle League) IV rank checker. Find any Pokémon's best IVs for Great, Ultra and Master League by stat product. Pokédex supported.",
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
  shareBtn: "📸 このIVランキングを保存・共有", imgBuilding: "画像を生成中…", imgShare: "📤 共有", imgSave: "💾 保存", imgClose: "閉じる", imgFooter: "ポケモンGO PvP個体値ランク", imgTopLabel: "上位{n}",
  footerGuide: "ガイド", footerPrivacy: "プライバシーポリシー",
  metaTitle: "ポケモンGO PvP個体値ランクチェッカー · リーグ別最適個体値 | GBL Note",
  metaDesc: "ポケモンGO PvP(バトルリーグ)個体値ランクチェッカー。好きなポケモンのスーパー・ハイパー・マスターリーグ最適個体値をステータス積順で確認。全図鑑対応。",
  ogTitle: "ポケモンGO PvP個体値ランクチェッカー", ogDesc: "リーグ別最適個体値をステータス積順で",
};

const zhTW: IvDict = {
  navBack: "← GBL Note", navTier: "🏆 強度表",
  h1: "寶可夢GO PvP IV 排名檢查器",
  intro: "搜尋寶可夢，即以能力值乘積(Product)顯示各聯盟（超級·高級·大師）的最佳 IV 排名。超級·高級聯盟因 CP 限制，攻擊 IV 越低排名越高的情況很常見。",
  searchPlaceholder: "搜尋寶可夢名稱（例：沙奈朵、代拉基翁）",
  searchHint: "從全圖鑑搜尋 — 團體戰寶可夢·一般寶可夢皆可",
  selectPrompt: "請搜尋並選擇寶可夢。", noResult: "沒有搜尋結果。",
  bestBuddy: "最佳夥伴(+1等級)",
  findH: "找我的 IV 排名", ivAtk: "攻擊", ivDef: "防禦", ivHp: "HP", findBtn: "確認排名", yourRank: "我的 IV 排名", rankUnit: "名", invalidIv: "IV 請輸入 0~15。",
  thRank: "排名", thIv: "IV（攻/防/HP）", thCp: "CP", thLv: "等級", thAtk: "攻擊", thDef: "防禦", thHp: "HP", thProduct: "Product",
  topNote: "顯示前 100 名 · 我的 IV 於上方查詢",
  explainerH: "IV 排名是什麼？",
  explainerBody: "在 PvP(GBL) 中，於聯盟 CP 限制（超級 1500·高級 2500）內，能力值乘積（攻擊×防禦×HP）越高越強。有 CP 限制時，攻擊種族值低的個體可升到更高等級，防禦·HP 更大而排名更高。大師聯盟沒有限制，15/15/15 永遠第一。",
  shareBtn: "📸 將此 IV 排名表以圖片分享·儲存", imgBuilding: "產生圖片中…", imgShare: "📤 分享", imgSave: "💾 儲存", imgClose: "關閉", imgFooter: "寶可夢GO PvP IV 排名", imgTopLabel: "前 {n} 名",
  footerGuide: "攻略", footerPrivacy: "隱私權政策",
  metaTitle: "寶可夢GO PvP IV 排名檢查器 · 各聯盟最佳個體值 | GBL Note",
  metaDesc: "寶可夢 GO PvP(對戰聯盟) IV 排名檢查器。以能力值乘積排名確認想要寶可夢在超級·高級·大師聯盟的最佳個體值(IV)。支援全圖鑑。",
  ogTitle: "寶可夢GO PvP IV 排名檢查器", ogDesc: "以能力值乘積排名顯示各聯盟最佳 IV",
};

const M = { ko, en, ja, "zh-TW": zhTW } as const;
export function getIv(lang: string): IvDict {
  return (M as Record<string, IvDict>)[lang] || ko;
}
