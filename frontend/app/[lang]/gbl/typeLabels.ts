// 포켓몬 18타입 로케일별 라벨 + 색. 콘텐츠 페이지·공유 이미지 공통.
import type { Locale } from "../../../lib/i18n";

export const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129", ice: "#37b6c9",
  fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0", psychic: "#ef4179", bug: "#91a119",
  rock: "#96843d", ghost: "#704170", dragon: "#5060e1", dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};

const LABELS: Record<Locale, Record<string, string>> = {
  ko: {
    normal: "노말", fire: "불꽃", water: "물", electric: "전기", grass: "풀", ice: "얼음", fighting: "격투", poison: "독",
    ground: "땅", flying: "비행", psychic: "에스퍼", bug: "벌레", rock: "바위", ghost: "고스트", dragon: "드래곤", dark: "악", steel: "강철", fairy: "페어리",
  },
  en: {
    normal: "Normal", fire: "Fire", water: "Water", electric: "Electric", grass: "Grass", ice: "Ice", fighting: "Fighting", poison: "Poison",
    ground: "Ground", flying: "Flying", psychic: "Psychic", bug: "Bug", rock: "Rock", ghost: "Ghost", dragon: "Dragon", dark: "Dark", steel: "Steel", fairy: "Fairy",
  },
  ja: {
    normal: "ノーマル", fire: "ほのお", water: "みず", electric: "でんき", grass: "くさ", ice: "こおり", fighting: "かくとう", poison: "どく",
    ground: "じめん", flying: "ひこう", psychic: "エスパー", bug: "むし", rock: "いわ", ghost: "ゴースト", dragon: "ドラゴン", dark: "あく", steel: "はがね", fairy: "フェアリー",
  },
  "zh-TW": {
    normal: "一般", fire: "火", water: "水", electric: "電", grass: "草", ice: "冰", fighting: "格鬥", poison: "毒",
    ground: "地面", flying: "飛行", psychic: "超能力", bug: "蟲", rock: "岩石", ghost: "幽靈", dragon: "龍", dark: "惡", steel: "鋼", fairy: "妖精",
  },
};

export function typeLabel(locale: Locale, key: string): string {
  return LABELS[locale]?.[key] || LABELS.ko[key] || key;
}
export function typeLabels(locale: Locale): Record<string, string> {
  return LABELS[locale] || LABELS.ko;
}
