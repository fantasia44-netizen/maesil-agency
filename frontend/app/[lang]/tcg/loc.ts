// TCG 데이터값 지역화 — 원소(타입/약점)·에너지·팩 이름. 데이터는 영어 원문이라 표시 시 로케일로 변환.
// 미지의 값(맵에 없는 팩 등)은 원문을 그대로 반환해 깨지지 않게 함.
import { type Locale } from "../../../lib/i18n";

// 원소명 — 타입키(fire, darkness…)와 약점/에너지 원문값(Fire, Dark, Fighting…) 모두 수용.
const ELEM: Record<string, Record<Locale, string>> = {
  grass: { ko: "풀", en: "Grass", ja: "草", "zh-TW": "草" },
  fire: { ko: "불꽃", en: "Fire", ja: "炎", "zh-TW": "火" },
  water: { ko: "물", en: "Water", ja: "水", "zh-TW": "水" },
  lightning: { ko: "번개", en: "Lightning", ja: "雷", "zh-TW": "雷" },
  psychic: { ko: "에스퍼", en: "Psychic", ja: "超", "zh-TW": "超" },
  fighting: { ko: "격투", en: "Fighting", ja: "闘", "zh-TW": "鬥" },
  darkness: { ko: "악", en: "Darkness", ja: "悪", "zh-TW": "惡" },
  metal: { ko: "강철", en: "Metal", ja: "鋼", "zh-TW": "鋼" },
  dragon: { ko: "드래곤", en: "Dragon", ja: "竜", "zh-TW": "龍" },
  colorless: { ko: "노말", en: "Colorless", ja: "無", "zh-TW": "無" },
};

// 약점/에너지 원문 → 원소키 정규화(대소문자·Dark/Steel 표기 흡수)
function elemKey(raw: string): string {
  const k = raw.trim().toLowerCase();
  if (k === "dark") return "darkness";
  if (k === "steel") return "metal";
  return k;
}

export function elementName(lang: Locale, raw?: string | null): string {
  if (!raw) return "";
  const e = ELEM[elemKey(raw)];
  return e ? e[lang] : raw; // 미지 값은 원문 유지
}

// 팩 이름 — 확실히 아는 마스코트/확장 대표 팩만 지역화. 나머지(Vol.·시리즈 등)는 원문 유지.
const PACK: Record<string, Record<Locale, string>> = {
  Pikachu: { ko: "피카츄", en: "Pikachu", ja: "ピカチュウ", "zh-TW": "皮卡丘" },
  Mewtwo: { ko: "뮤츠", en: "Mewtwo", ja: "ミュウツー", "zh-TW": "超夢" },
  Charizard: { ko: "리자몽", en: "Charizard", ja: "リザードン", "zh-TW": "噴火龍" },
  Mew: { ko: "뮤", en: "Mew", ja: "ミュウ", "zh-TW": "夢幻" },
  Dialga: { ko: "디아루가", en: "Dialga", ja: "ディアルガ", "zh-TW": "帝牙盧卡" },
  Palkia: { ko: "펄기아", en: "Palkia", ja: "パルキア", "zh-TW": "帕路奇亞" },
  Arceus: { ko: "아르세우스", en: "Arceus", ja: "アルセウス", "zh-TW": "阿爾宙斯" },
  Solgaleo: { ko: "솔가레오", en: "Solgaleo", ja: "ソルガレオ", "zh-TW": "索爾迦雷歐" },
  Lunala: { ko: "루나아라", en: "Lunala", ja: "ルナアーラ", "zh-TW": "露奈雅拉" },
  Eevee: { ko: "이브이", en: "Eevee", ja: "イーブイ", "zh-TW": "伊布" },
  "Ho-Oh": { ko: "칠색조", en: "Ho-Oh", ja: "ホウオウ", "zh-TW": "鳳王" },
  Lugia: { ko: "루기아", en: "Lugia", ja: "ルギア", "zh-TW": "洛奇亞" },
  Gardevoir: { ko: "가디안", en: "Gardevoir", ja: "サーナイト", "zh-TW": "沙奈朵" },
};

export function packName(lang: Locale, raw: string): string {
  const p = PACK[raw];
  return p ? p[lang] : raw; // 미지 팩은 원문 유지
}
