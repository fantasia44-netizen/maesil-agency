// 현재 레이드 보스 · 100% CP 페이지 문구(3개국어).
// 굵게 강조는 세그먼트 배열({t, b?})로 표현 — 로케일별 자연스러운 어순 반영.
type Seg = { t: string; b?: boolean };

export type BossesDict = {
  navBack: string; navHub: string;
  h1: string;
  intro: Seg[];
  sub: Seg[];
  shareTitle: string; shareSubtitle: string; shareButton: string; shareFooter: string;
  loadFail: string; noneOpen: string;
  tierElite: string; tierMega: string; tier5: string; tierPrimal: string; tierShadow: string;
  countSuffix: string;
  weatherLabel: string;
  weakDealer: string;
  explainH: string; explainBody: Seg[]; explainLink: string;
  dataSource: string; privacy: string;
  pfx: { mega: string; shadow: string; hisui: string; alola: string; galar: string; paldea: string; origin: string };
  metaTitle: string; metaDesc: string; metaKeywords: string[]; ogTitle: string; ogDesc: string;
};

const ko: BossesDict = {
  navBack: "← 레이드 딜러 티어", navHub: "GBL Note →",
  h1: "현재 레이드 보스 · 100% CP",
  intro: [
    { t: "지금 열리는 레이드 보스와 " },
    { t: "100% 개체값 CP", b: true },
    { t: "(잡을 때 이 CP면 15/15/15)입니다. " },
    { t: "약점 속성", b: true },
    { t: "을 누르면 그 속성 " },
    { t: "추천 딜러 티어표", b: true },
    { t: "로 이동합니다." },
  ],
  sub: [
    { t: "5성·메가 레이드만 표시(1·3성 제외). 각 보스 아래 " },
    { t: "개체값별 포획 CP표", b: true },
    { t: "로 100개체(15/15/15)인지 확인하세요. 날씨부스트 = 해당 날씨일 때 레벨25로 등장(더 높은 CP). 메가·원시 레이드는 " },
    { t: "기본폼을 포획", b: true },
    { t: "합니다(표는 잡는 CP). ✨ = 샤이니 가능. 자동 업데이트." },
  ],
  shareTitle: "이달 레이드 보스 100% CP",
  shareSubtitle: "잡을 때 이 CP면 100개체(15/15/15) · 날씨=부스트",
  shareButton: "📸 이달 보스 CP표 이미지로 공유·저장",
  shareFooter: "포켓몬GO 레이드 보스 CP",
  loadFail: "보스 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
  noneOpen: "지금 열린 5성·메가 레이드가 없습니다.",
  tierElite: "엘리트 레이드", tierMega: "메가 레이드", tier5: "5성 레이드 (전설)", tierPrimal: "원시 레이드", tierShadow: "섀도우 레이드",
  countSuffix: "종",
  weatherLabel: "날씨",
  weakDealer: "약점 딜러 →",
  explainH: "100% CP가 뭔가요?",
  explainBody: [
    { t: "레이드에서 잡을 때 CP는 개체값(IV)에 따라 정해진 값으로만 나옵니다. 표시된 " },
    { t: "100% CP", b: true },
    { t: "는 " },
    { t: "15/15/15(최고 개체값)", b: true },
    { t: "일 때의 CP예요. 잡기 화면 CP가 이 숫자와 같으면 100% 개체입니다(날씨부스트면 날씨 CP 기준). 약점 속성을 눌러 어떤 포켓몬으로 잡을지 확인하세요. " },
  ],
  explainLink: "속성별 딜러 티어표 →",
  dataSource: "보스 데이터: LeekDuck(ScrapedDuck) · ", privacy: "개인정보처리방침",
  pfx: { mega: "메가 ", shadow: "섀도우 ", hisui: "히스이 ", alola: "알로라 ", galar: "가라르 ", paldea: "팔데아 ", origin: " (오리진)" },
  metaTitle: "포켓몬고 현재 레이드 보스 · 100% CP 표 | GBL Note",
  metaDesc: "지금 열리는 포켓몬 GO 5성·메가 레이드 보스 목록. 보스별 개체값(IV)별 포획 CP표 — 100개체(15/15/15) CP를 일반·날씨부스트 기준으로 확인. 약점 속성·추천 딜러까지. 자동 업데이트.",
  metaKeywords: ["포켓몬고 레이드 보스", "100 CP", "100개체 CP", "레이드 CP표", "개체값 CP", "15 15 15 CP", "5성 레이드", "메가 레이드", "포켓몬고 꿀박"],
  ogTitle: "포켓몬고 현재 레이드 보스 · 100% CP", ogDesc: "5성·메가·3성 보스 100% CP + 약점 딜러",
};

const en: BossesDict = {
  navBack: "← Raid attacker tiers", navHub: "GBL Note →",
  h1: "Current Raid Bosses · 100% CP",
  intro: [
    { t: "The raid bosses live right now and their " },
    { t: "100% IV CP", b: true },
    { t: " (if the catch CP matches, it's 15/15/15). Tap a " },
    { t: "weakness type", b: true },
    { t: " to jump to the " },
    { t: "recommended attacker tier list", b: true },
    { t: " for that type." },
  ],
  sub: [
    { t: "Only 5-star and Mega raids are shown (1/3-star hidden). Under each boss, use the " },
    { t: "per-IV catch CP table", b: true },
    { t: " to check for a 100% (15/15/15). Weather boost = appears at level 25 in matching weather (higher CP). Mega and Primal raids " },
    { t: "are caught in their base form", b: true },
    { t: " (the table shows catch CP). ✨ = shiny available. Auto-updated." },
  ],
  shareTitle: "This Month's Raid Bosses · 100% CP",
  shareSubtitle: "Catch CP matching = 100% (15/15/15) · Weather = boosted",
  shareButton: "📸 Save/Share this month's boss CP list",
  shareFooter: "Pokémon GO raid boss CP",
  loadFail: "Couldn't load boss data. Please try again shortly.",
  noneOpen: "No 5-star or Mega raids are open right now.",
  tierElite: "Elite Raids", tierMega: "Mega Raids", tier5: "5★ Raids (Legendary)", tierPrimal: "Primal Raids", tierShadow: "Shadow Raids",
  countSuffix: "",
  weatherLabel: "Weather",
  weakDealer: "Weakness attackers →",
  explainH: "What is 100% CP?",
  explainBody: [
    { t: "In raids, catch CP only takes fixed values based on IVs. The " },
    { t: "100% CP", b: true },
    { t: " shown is the CP at " },
    { t: "15/15/15 (perfect IVs)", b: true },
    { t: ". If the catch-screen CP equals this number, it's a 100% IV catch (use the weather CP if weather-boosted). Tap a weakness type to see which Pokémon to catch it with. " },
  ],
  explainLink: "Attacker tiers by type →",
  dataSource: "Boss data: LeekDuck (ScrapedDuck) · ", privacy: "Privacy Policy",
  pfx: { mega: "Mega ", shadow: "Shadow ", hisui: "Hisuian ", alola: "Alolan ", galar: "Galarian ", paldea: "Paldean ", origin: " (Origin)" },
  metaTitle: "Pokémon GO Current Raid Bosses · 100% CP Table | GBL Note",
  metaDesc: "Live Pokémon GO 5-star and Mega raid bosses. Per-IV catch CP table for each boss — check the 100% (15/15/15) CP, normal and weather-boosted.",
  metaKeywords: ["pokemon go raid bosses", "100 IV CP", "hundo CP", "raid CP table", "IV CP", "15 15 15 CP", "5-star raid", "mega raid", "pokemon go raid"],
  ogTitle: "Pokémon GO Current Raid Bosses · 100% CP", ogDesc: "5-star, Mega and 3-star boss 100% CP + weakness attackers",
};

const ja: BossesDict = {
  navBack: "← レイドアタッカーティア", navHub: "GBL Note →",
  h1: "現在のレイドボス · 100% CP",
  intro: [
    { t: "今開催中のレイドボスと" },
    { t: "100%個体値CP", b: true },
    { t: "(捕獲時にこのCPなら15/15/15)です。" },
    { t: "弱点タイプ", b: true },
    { t: "を押すと、そのタイプの" },
    { t: "おすすめアタッカーティア表", b: true },
    { t: "へ移動します。" },
  ],
  sub: [
    { t: "5★・メガレイドのみ表示(1・3★は非表示)。各ボスの下の" },
    { t: "個体値別 捕獲CP表", b: true },
    { t: "で100%(15/15/15)か確認できます。天候ブースト = その天候時にレベル25で出現(より高いCP)。メガ・ゲンシレイドは" },
    { t: "基本フォルムを捕獲", b: true },
    { t: "します(表は捕獲CP)。✨ = 色違い可能。自動更新。" },
  ],
  shareTitle: "今月のレイドボス 100% CP",
  shareSubtitle: "捕獲時このCPなら100%(15/15/15) · 天候=ブースト",
  shareButton: "📸 今月のボスCP表を画像で共有・保存",
  shareFooter: "ポケモンGO レイドボスCP",
  loadFail: "ボス情報を読み込めませんでした。しばらくして再度お試しください。",
  noneOpen: "現在開催中の5★・メガレイドはありません。",
  tierElite: "エリートレイド", tierMega: "メガレイド", tier5: "5★レイド (伝説)", tierPrimal: "ゲンシレイド", tierShadow: "シャドウレイド",
  countSuffix: "種",
  weatherLabel: "天候",
  weakDealer: "弱点アタッカー →",
  explainH: "100% CPとは?",
  explainBody: [
    { t: "レイドでの捕獲CPは個体値(IV)に応じた固定値のみになります。表示された" },
    { t: "100% CP", b: true },
    { t: "は" },
    { t: "15/15/15(最高個体値)", b: true },
    { t: "のときのCPです。捕獲画面のCPがこの数字と同じなら100%個体です(天候ブースト時は天候CP基準)。弱点タイプを押して、どのポケモンで捕獲するか確認しましょう。" },
  ],
  explainLink: "タイプ別アタッカーティア表 →",
  dataSource: "ボスデータ: LeekDuck(ScrapedDuck) · ", privacy: "プライバシーポリシー",
  pfx: { mega: "メガ ", shadow: "シャドウ ", hisui: "ヒスイ ", alola: "アローラ ", galar: "ガラル ", paldea: "パルデア ", origin: "(オリジン)" },
  metaTitle: "ポケモンGO 現在のレイドボス · 100% CP表 | GBL Note",
  metaDesc: "開催中のポケモンGO 5★・メガレイドボス一覧。ボスごとの個体値(IV)別 捕獲CP表 — 100%(15/15/15)CPを通常・天候ブースト基準で確認。弱点タイプ・おすすめアタッカーまで。自動更新。",
  metaKeywords: ["ポケモンGO レイドボス", "100% CP", "個体値CP", "レイドCP表", "IV CP", "15 15 15 CP", "5★レイド", "メガレイド", "ポケモンGO"],
  ogTitle: "ポケモンGO 現在のレイドボス · 100% CP", ogDesc: "5★・メガ・3★ボスの100% CP + 弱点アタッカー",
};

const zhTW: BossesDict = {
  navBack: "← 團體戰攻擊手強度", navHub: "GBL Note →",
  h1: "當前團體戰頭目 · 100% CP",
  intro: [
    { t: "現正開放的團體戰頭目與 " },
    { t: "100% 個體值 CP", b: true },
    { t: "（捕捉時若為此 CP 即 15/15/15）。" },
    { t: "弱點屬性", b: true },
    { t: " 點下去會前往該屬性的 " },
    { t: "推薦攻擊手強度表", b: true },
    { t: "。" },
  ],
  sub: [
    { t: "僅顯示五星·超級團體戰（排除1·3星）。各頭目下方的 " },
    { t: "各個體值捕捉 CP 表", b: true },
    { t: " 可確認是否為 100 個體（15/15/15）。天氣加成 = 該天氣時以等級25出現（CP 更高）。超級·原始團體戰 " },
    { t: "捕捉基本型", b: true },
    { t: "（表為捕捉 CP）。✨ = 可能異色。自動更新。" },
  ],
  shareTitle: "本月團體戰頭目 100% CP",
  shareSubtitle: "捕捉時若為此 CP 即 100 個體（15/15/15）· 天氣=加成",
  shareButton: "📸 將本月頭目 CP 表以圖片分享·儲存",
  shareFooter: "寶可夢GO 團體戰頭目 CP",
  loadFail: "無法載入頭目資訊。請稍後再試。",
  noneOpen: "目前沒有開放的五星·超級團體戰。",
  tierElite: "菁英團體戰", tierMega: "超級團體戰", tier5: "五星團體戰（傳說）", tierPrimal: "原始團體戰", tierShadow: "暗影團體戰",
  countSuffix: "種",
  weatherLabel: "天氣",
  weakDealer: "弱點攻擊手 →",
  explainH: "100% CP 是什麼？",
  explainBody: [
    { t: "在團體戰捕捉時，CP 會依個體值(IV)呈現固定值。顯示的 " },
    { t: "100% CP", b: true },
    { t: " 是 " },
    { t: "15/15/15（最高個體值）", b: true },
    { t: " 時的 CP。捕捉畫面 CP 與此數字相同即為 100% 個體（天氣加成時以天氣 CP 為準）。點弱點屬性確認要用哪隻寶可夢捕捉。" },
  ],
  explainLink: "各屬性攻擊手強度表 →",
  dataSource: "頭目資料：LeekDuck(ScrapedDuck) · ", privacy: "隱私權政策",
  pfx: { mega: "超級", shadow: "暗影", hisui: "洗翠", alola: "阿羅拉", galar: "伽勒爾", paldea: "帕底亞", origin: "（起源）" },
  metaTitle: "寶可夢GO 當前團體戰頭目 · 100% CP 表 | GBL Note",
  metaDesc: "現正開放的寶可夢 GO 五星·超級團體戰頭目清單。各頭目依個體值(IV)的捕捉 CP 表 — 以一般·天氣加成確認 100 個體（15/15/15）CP。含弱點屬性·推薦攻擊手。自動更新。",
  metaKeywords: ["寶可夢GO 團體戰頭目", "100 CP", "100個體 CP", "團體戰 CP表", "個體值 CP", "15 15 15 CP", "五星團體戰", "超級團體戰"],
  ogTitle: "寶可夢GO 當前團體戰頭目 · 100% CP", ogDesc: "五星·超級·三星頭目 100% CP + 弱點攻擊手",
};

const B = { ko, en, ja, "zh-TW": zhTW } as const;
export function getBosses(lang: string): BossesDict {
  return (B as Record<string, BossesDict>)[lang] || ko;
}
