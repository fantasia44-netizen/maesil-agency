// 포켓몬 교환 목록 메이커 문구(3개국어).
export type TradeDict = {
  navBack: string;
  h1: string; intro: string;
  addTo: string; wanted: string; offer: string; shinyMode: string;
  searchPh: string; searchHint: string;
  background: string; bgBadge: string;
  trainerCode: string;
  shareBtn: string; saveBtn: string; building: string;
  cardTitle: string; emptySlot: string; tapShiny: string; shareTitle: string;
  footerGuide: string; footerPrivacy: string;
  metaTitle: string; metaDesc: string; ogTitle: string; ogDesc: string;
};

const ko: TradeDict = {
  navBack: "← GBL Note",
  h1: "포켓몬 GO 교환 목록 메이커",
  intro: "원하는 포켓몬과 줄 수 있는 포켓몬을 골라 교환 목록 이미지를 만드세요. 이로치·배경까지 넣어 카페·오픈채팅에 공유할 수 있습니다.",
  addTo: "어디에 추가할까요?", wanted: "원하는 것", offer: "줄 수 있는 것", shinyMode: "이로치로 추가",
  searchPh: "포켓몬 이름/도감번호 검색", searchHint: "전체 도감에서 검색 · 클릭하면 위 선택한 칸에 추가",
  background: "배경", bgBadge: "· 경쟁사엔 없는 기능",
  trainerCode: "트레이너 코드 (선택)",
  shareBtn: "공유하기", saveBtn: "저장", building: "생성 중…",
  cardTitle: "포켓몬 교환", emptySlot: "위에서 포켓몬을 추가하세요", tapShiny: "탭하면 이로치 전환 · ✕ 삭제", shareTitle: "포켓몬 GO 교환 목록",
  footerGuide: "가이드", footerPrivacy: "개인정보처리방침",
  metaTitle: "포켓몬고 교환 목록 메이커 · 이로치·배경 지원 | GBL Note",
  metaDesc: "포켓몬 GO 교환 목록 이미지를 만드세요. 원하는 것·줄 수 있는 것·이로치·배경·트레이너 코드까지. 카페·오픈채팅 공유용 이미지 생성기.",
  ogTitle: "포켓몬고 교환 목록 메이커", ogDesc: "이로치·배경 넣어 교환 목록 이미지 만들기",
};

const en: TradeDict = {
  navBack: "← GBL Note",
  h1: "Pokémon GO Trade List Maker",
  intro: "Pick the Pokémon you want and can offer, then make a trade-list image. Add shinies and a background, and share it to your community.",
  addTo: "Add to which list?", wanted: "Wanted", offer: "Can offer", shinyMode: "Add as shiny",
  searchPh: "Search Pokémon name / Dex no.", searchHint: "Search full Pokédex · click to add to the selected list",
  background: "Background", bgBadge: "· not on other sites",
  trainerCode: "Trainer code (optional)",
  shareBtn: "Share", saveBtn: "Save", building: "Generating…",
  cardTitle: "POKÉMON TRADE", emptySlot: "Add Pokémon above", tapShiny: "Tap to toggle shiny · ✕ to remove", shareTitle: "Pokémon GO Trade List",
  footerGuide: "Guides", footerPrivacy: "Privacy Policy",
  metaTitle: "Pokémon GO Trade List Maker · Shiny & Backgrounds | GBL Note",
  metaDesc: "Make a Pokémon GO trade-list image. Wanted, can-offer, shinies, backgrounds, and trainer code. A shareable image generator for your community.",
  ogTitle: "Pokémon GO Trade List Maker", ogDesc: "Make trade-list images with shinies & backgrounds",
};

const ja: TradeDict = {
  navBack: "← GBL Note",
  h1: "ポケモンGO 交換リストメーカー",
  intro: "欲しいポケモンと出せるポケモンを選んで交換リスト画像を作成。色違い・背景を入れてコミュニティに共有できます。",
  addTo: "どちらに追加？", wanted: "欲しい", offer: "出せる", shinyMode: "色違いで追加",
  searchPh: "ポケモン名/図鑑番号で検索", searchHint: "全図鑑から検索 · クリックで選択中のリストに追加",
  background: "背景", bgBadge: "· 他サイトにない機能",
  trainerCode: "トレーナーコード (任意)",
  shareBtn: "共有", saveBtn: "保存", building: "生成中…",
  cardTitle: "ポケモン交換", emptySlot: "上からポケモンを追加", tapShiny: "タップで色違い切替 · ✕で削除", shareTitle: "ポケモンGO 交換リスト",
  footerGuide: "ガイド", footerPrivacy: "プライバシーポリシー",
  metaTitle: "ポケモンGO 交換リストメーカー · 色違い・背景対応 | GBL Note",
  metaDesc: "ポケモンGOの交換リスト画像を作成。欲しい・出せる・色違い・背景・トレーナーコードまで。コミュニティ共有用の画像ジェネレーター。",
  ogTitle: "ポケモンGO 交換リストメーカー", ogDesc: "色違い・背景を入れて交換リスト画像を作成",
};

const M = { ko, en, ja } as const;
export function getTrade(lang: string): TradeDict {
  return (M as Record<string, TradeDict>)[lang] || ko;
}
