// 트레이드카드 포켓몬별 배경 레지스트리 — 경쟁사(PokeXperience/PGTrade) 대응 차별 기능.
// 실제 포켓몬GO 로케이션 카드·이벤트 배경(울트라홀, 고페 도시, 지역 축제 등) + 타입 배경.
// 배경은 /public/gbl/bg/ 에 미러링(same-origin → html-to-image 캡처 안전).
// 소스: PokeMiners/pogo_assets (공식 게임 에셋 · LocationCards + CatchCard).
import DEX_TYPE from "../dex_type.json";
import type { Locale } from "../../../../lib/i18n";

const DT = DEX_TYPE as Record<string, string>;

// ── 배경 그룹 ──
// 이벤트·우주(고페 글로벌/피날레·울트라홀 등), 지역(고페 도시·지역축제), 풍경, 타입 18종.
export const BG_EVENTS = ["gofest", "eternatus", "wormhole", "wormhole_sun", "wormhole_moon", "radiance", "umbra"] as const;
export const BG_REGIONS = ["tokyo", "osaka", "seoul", "busan", "taipei", "tainan", "la", "newyork", "chicago", "paris", "london", "copenhagen"] as const;
export const BG_SCENES = ["forest", "park", "snow", "stars", "camp"] as const;
export const BG_TYPES = [
  "normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
] as const;

// id 접두어(e_/r_/s_/t_) → 파일 접두어(ev_/rg_/scene_/type_)
const FILE_PREFIX: Record<string, string> = { e: "ev_", r: "rg_", s: "scene_", t: "type_" };

export function primaryType(dex: number): string {
  return DT[String(dex)] || "normal";
}

// 배경 id → URL. ""=없음, "auto"=몬 타입 자동, "e_wormhole"/"r_tokyo"/"s_forest"/"t_fire"=지정.
export function resolveBg(bgId: string | undefined, dex: number): string {
  if (!bgId) return "";
  if (bgId === "auto") return `/gbl/bg/type_${primaryType(dex)}.webp`;
  const pre = FILE_PREFIX[bgId[0]];
  if (!pre) return "";
  return `/gbl/bg/${pre}${bgId.slice(2)}.webp`;
}

// ── 라벨(4개국어: ko/en/ja/zh-TW) ──
const LABELS: Record<string, [string, string, string, string]> = {
  "": ["없음", "None", "なし", "無"],
  auto: ["타입 자동", "By type", "タイプ自動", "依屬性"],
  // 이벤트·우주
  e_gofest: ["고페 글로벌'26", "GO Fest '26", "GOフェス'26", "GO Fest'26"],
  e_eternatus: ["고페 피날레'25", "Finale '25", "フィナーレ'25", "總決賽'25"],
  e_wormhole: ["울트라홀", "Ultra Wormhole", "ウルトラホール", "究極異洞"],
  e_wormhole_sun: ["울트라홀·솔", "Wormhole·Sun", "異洞·日", "異洞·日"],
  e_wormhole_moon: ["울트라홀·루나", "Wormhole·Moon", "異洞·月", "異洞·月"],
  e_radiance: ["광휘", "Radiance", "ラディアンス", "光輝"],
  e_umbra: ["어둠", "Umbra", "アンブラ", "暗影"],
  // 지역
  r_tokyo: ["도쿄", "Tokyo", "東京", "東京"],
  r_osaka: ["오사카", "Osaka", "大阪", "大阪"],
  r_seoul: ["서울", "Seoul", "ソウル", "首爾"],
  r_busan: ["부산", "Busan", "釜山", "釜山"],
  r_taipei: ["타이베이", "Taipei", "台北", "台北"],
  r_tainan: ["타이난", "Tainan", "台南", "台南"],
  r_la: ["LA", "Los Angeles", "ロサンゼルス", "洛杉磯"],
  r_newyork: ["뉴욕", "New York", "ニューヨーク", "紐約"],
  r_chicago: ["시카고", "Chicago", "シカゴ", "芝加哥"],
  r_paris: ["파리", "Paris", "パリ", "巴黎"],
  r_london: ["런던", "London", "ロンドン", "倫敦"],
  r_copenhagen: ["코펜하겐", "Copenhagen", "コペンハーゲン", "哥本哈根"],
  // 풍경
  s_forest: ["숲", "Forest", "森", "森林"],
  s_park: ["공원", "Park", "公園", "公園"],
  s_snow: ["설원", "Snow", "雪原", "雪地"],
  s_stars: ["밤하늘", "Starry", "星空", "星空"],
  s_camp: ["캠프", "Campsite", "キャンプ", "營地"],
  // 타입
  t_normal: ["노말", "Normal", "ノーマル", "一般"],
  t_fire: ["불꽃", "Fire", "ほのお", "火"],
  t_water: ["물", "Water", "みず", "水"],
  t_grass: ["풀", "Grass", "くさ", "草"],
  t_electric: ["전기", "Electric", "でんき", "電"],
  t_ice: ["얼음", "Ice", "こおり", "冰"],
  t_fighting: ["격투", "Fighting", "かくとう", "格鬥"],
  t_poison: ["독", "Poison", "どく", "毒"],
  t_ground: ["땅", "Ground", "じめん", "地面"],
  t_flying: ["비행", "Flying", "ひこう", "飛行"],
  t_psychic: ["에스퍼", "Psychic", "エスパー", "超能力"],
  t_bug: ["벌레", "Bug", "むし", "蟲"],
  t_rock: ["바위", "Rock", "いわ", "岩"],
  t_ghost: ["고스트", "Ghost", "ゴースト", "幽靈"],
  t_dragon: ["드래곤", "Dragon", "ドラゴン", "龍"],
  t_dark: ["악", "Dark", "あく", "惡"],
  t_steel: ["강철", "Steel", "はがね", "鋼"],
  t_fairy: ["페어리", "Fairy", "フェアリー", "妖精"],
};

const LI = (lang: Locale) => (lang === "en" ? 1 : lang === "ja" ? 2 : lang === "zh-TW" ? 3 : 0);
export function bgLabel(id: string, lang: Locale): string {
  return LABELS[id]?.[LI(lang)] || id;
}

// ── 팔레트 스와치 ──
export type SwatchKind = "special" | "event" | "region" | "scene" | "type";
export type Swatch = { id: string; kind: SwatchKind; sample: string };
export const BG_SWATCHES: Swatch[] = [
  { id: "", kind: "special", sample: "" },
  { id: "auto", kind: "special", sample: "" },
  ...BG_EVENTS.map((x) => ({ id: "e_" + x, kind: "event" as const, sample: `/gbl/bg/ev_${x}.webp` })),
  ...BG_REGIONS.map((x) => ({ id: "r_" + x, kind: "region" as const, sample: `/gbl/bg/rg_${x}.webp` })),
  ...BG_SCENES.map((x) => ({ id: "s_" + x, kind: "scene" as const, sample: `/gbl/bg/scene_${x}.webp` })),
  ...BG_TYPES.map((x) => ({ id: "t_" + x, kind: "type" as const, sample: `/gbl/bg/type_${x}.webp` })),
];
