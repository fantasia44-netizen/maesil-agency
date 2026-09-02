// 포켓몬 교환 목록 메이커 문구(3개국어).
export type TradeDict = {
  navBack: string;
  h1: string; intro: string;
  addTo: string; wanted: string; offer: string; shinyMode: string; dmax: string; gmax: string;
  searchPh: string; searchHint: string;
  background: string; bgBadge: string;
  bgSection: string; bgLegendGroup: string; bgEventGroup: string; bgRegionGroup: string; bgSceneGroup: string; bgTypeGroup: string; tapApplyBg: string;
  trainerCode: string;
  shareBtn: string; saveBtn: string; building: string;
  cardTitle: string; emptySlot: string; tapShiny: string; shareTitle: string;
  footerGuide: string; footerPrivacy: string;
  metaTitle: string; metaDesc: string; ogTitle: string; ogDesc: string;
};

const ko: TradeDict = {
  navBack: "← GBL Note",
  h1: "포켓몬 GO 교환 목록 메이커",
  intro: "원하는 포켓몬과 줄 수 있는 포켓몬을 골라 교환 목록 이미지를 만드세요. 이로치·코스튬·다이맥스까지 넣어 카페·오픈채팅에 공유할 수 있습니다.",
  addTo: "어디에 추가할까요?", wanted: "원하는 것", offer: "줄 수 있는 것", shinyMode: "이로치로 추가", dmax: "다이맥스", gmax: "거다이맥스",
  searchPh: "포켓몬 이름/도감번호 검색", searchHint: "전체 도감에서 검색 · 클릭하면 위 선택한 칸에 추가",
  background: "배경", bgBadge: "",
  bgSection: "🎨 배경 (포켓몬마다)", bgLegendGroup: "전설 (GO투어·고페)", bgEventGroup: "이벤트·우주", bgRegionGroup: "지역", bgSceneGroup: "풍경", bgTypeGroup: "타입", tapApplyBg: "배경 선택 후 포켓몬을 추가하면 그 배경으로 들어갑니다 · 슬롯 탭=삭제",
  trainerCode: "트레이너 코드 (선택)",
  shareBtn: "공유하기", saveBtn: "저장", building: "생성 중…",
  cardTitle: "포켓몬 교환", emptySlot: "위에서 포켓몬을 추가하세요", tapShiny: "탭하면 삭제", shareTitle: "포켓몬 GO 교환 목록",
  footerGuide: "가이드", footerPrivacy: "개인정보처리방침",
  metaTitle: "포켓몬고 교환 목록 메이커 · 코스튬·이로치 지원 | GBL Note",
  metaDesc: "포켓몬 GO 교환 목록 이미지를 만드세요. 원하는 것·줄 수 있는 것·이로치·코스튬·다이맥스·트레이너 코드까지. 카페·오픈채팅 공유용 이미지 생성기.",
  ogTitle: "포켓몬고 교환 목록 메이커", ogDesc: "코스튬·이로치 넣어 교환 목록 이미지 만들기",
};

const en: TradeDict = {
  navBack: "← GBL Note",
  h1: "Pokémon GO Trade List Maker",
  intro: "Pick the Pokémon you want and can offer, then make a trade-list image. Add shinies, costumes and Dynamax, and share it to your community.",
  addTo: "Add to which list?", wanted: "Wanted", offer: "Can offer", shinyMode: "Add as shiny", dmax: "Dynamax", gmax: "Gigantamax",
  searchPh: "Search Pokémon name / Dex no.", searchHint: "Search full Pokédex · click to add to the selected list",
  background: "Background", bgBadge: "",
  bgSection: "🎨 Background (per Pokémon)", bgLegendGroup: "Legendary (GO Tour · Fest)", bgEventGroup: "Event · Cosmic", bgRegionGroup: "Region", bgSceneGroup: "Scenery", bgTypeGroup: "Type", tapApplyBg: "Pick a background, then add a Pokémon to apply it · tap a slot to remove",
  trainerCode: "Trainer code (optional)",
  shareBtn: "Share", saveBtn: "Save", building: "Generating…",
  cardTitle: "POKÉMON TRADE", emptySlot: "Add Pokémon above", tapShiny: "Tap to remove", shareTitle: "Pokémon GO Trade List",
  footerGuide: "Guides", footerPrivacy: "Privacy Policy",
  metaTitle: "Pokémon GO Trade List Maker · Costumes & Shiny | GBL Note",
  metaDesc: "Make a Pokémon GO trade-list image. Wanted, can-offer, shinies, costumes, Dynamax, and trainer code. A shareable image generator for your community.",
  ogTitle: "Pokémon GO Trade List Maker", ogDesc: "Make trade-list images with costumes & shinies",
};

const ja: TradeDict = {
  navBack: "← GBL Note",
  h1: "ポケモンGO 交換リストメーカー",
  intro: "欲しいポケモンと出せるポケモンを選んで交換リスト画像を作成。色違い・コスチューム・ダイマックスを入れてコミュニティに共有できます。",
  addTo: "どちらに追加？", wanted: "欲しい", offer: "出せる", shinyMode: "色違いで追加", dmax: "ダイマックス", gmax: "キョダイマックス",
  searchPh: "ポケモン名/図鑑番号で検索", searchHint: "全図鑑から検索 · クリックで選択中のリストに追加",
  background: "背景", bgBadge: "",
  bgSection: "🎨 背景(ポケモンごと)", bgLegendGroup: "伝説(GOツアー・フェス)", bgEventGroup: "イベント・宇宙", bgRegionGroup: "地域", bgSceneGroup: "風景", bgTypeGroup: "タイプ", tapApplyBg: "背景を選んでからポケモンを追加すると適用 · スロットをタップで削除",
  trainerCode: "トレーナーコード (任意)",
  shareBtn: "共有", saveBtn: "保存", building: "生成中…",
  cardTitle: "ポケモン交換", emptySlot: "上からポケモンを追加", tapShiny: "タップで削除", shareTitle: "ポケモンGO 交換リスト",
  footerGuide: "ガイド", footerPrivacy: "プライバシーポリシー",
  metaTitle: "ポケモンGO 交換リストメーカー · コスチューム・色違い対応 | GBL Note",
  metaDesc: "ポケモンGOの交換リスト画像を作成。欲しい・出せる・色違い・コスチューム・ダイマックス・トレーナーコードまで。コミュニティ共有用の画像ジェネレーター。",
  ogTitle: "ポケモンGO 交換リストメーカー", ogDesc: "コスチューム・色違いを入れて交換リスト画像を作成",
};

const zhTW: TradeDict = {
  navBack: "← GBL Note",
  h1: "寶可夢 GO 交換清單產生器",
  intro: "選擇想要的寶可夢與可以給的寶可夢，製作交換清單圖片。可加入異色·造型·極巨化，分享到社團·開放聊天室。",
  addTo: "要加到哪裡？", wanted: "想要的", offer: "可以給的", shinyMode: "以異色加入", dmax: "極巨化", gmax: "超極巨化",
  searchPh: "搜尋寶可夢名稱/圖鑑編號", searchHint: "從全圖鑑搜尋 · 點擊即加入上方選取的欄位",
  background: "背景", bgBadge: "",
  bgSection: "🎨 背景（每隻寶可夢）", bgLegendGroup: "傳說（GO Tour·Fest）", bgEventGroup: "活動·宇宙", bgRegionGroup: "地域", bgSceneGroup: "風景", bgTypeGroup: "屬性", tapApplyBg: "先選背景再加入寶可夢即套用 · 點擊格子刪除",
  trainerCode: "訓練家代碼（選填）",
  shareBtn: "分享", saveBtn: "儲存", building: "產生中…",
  cardTitle: "寶可夢交換", emptySlot: "從上方加入寶可夢", tapShiny: "點擊即刪除", shareTitle: "寶可夢 GO 交換清單",
  footerGuide: "攻略", footerPrivacy: "隱私權政策",
  metaTitle: "寶可夢GO 交換清單產生器 · 支援造型·異色 | GBL Note",
  metaDesc: "製作寶可夢 GO 交換清單圖片。想要的·可以給的·異色·造型·極巨化·訓練家代碼一應俱全。社團·開放聊天室分享用圖片產生器。",
  ogTitle: "寶可夢GO 交換清單產生器", ogDesc: "加入造型·異色製作交換清單圖片",
};

const M = { ko, en, ja, "zh-TW": zhTW } as const;
export function getTrade(lang: string): TradeDict {
  return (M as Record<string, TradeDict>)[lang] || ko;
}
