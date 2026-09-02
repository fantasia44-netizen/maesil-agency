// 트레이드카드 포켓몬별 배경 레지스트리 — 경쟁사(PokeXperience/PGTrade) 대응 차별 기능.
// 실제 포켓몬GO 로케이션 카드·이벤트 배경(울트라홀, 고페 도시, 지역 축제 등).
// 배경은 /public/gbl/bg/ 에 미러링(same-origin → html-to-image 캡처 안전).
// 소스: PokeMiners/pogo_assets (공식 게임 에셋 · LocationCards).
import type { Locale } from "../../../../lib/i18n";

// ── 배경 그룹 ── 이벤트·우주, 지역(같은 도시 2개씩도). 풍경/타입은 제거.
export const BG_EVENTS = [
  "gofest", "eternatus", "wormhole", "wormhole_sun", "wormhole_moon", "radiance", "umbra",
  "blue", "red", "yellow",
] as const;
export const BG_REGIONS = [
  "tokyo", "osaka", "osaka2", "seoul", "busan", "taipei", "tainan",
  "la", "newyork", "newjersey", "chicago", "paris", "paris2", "london", "copenhagen",
] as const;
// 전설 마스코트 배경(GO투어/고페 시그니처) — 경쟁사(PokeXperience) 배경 카탈로그 대응.
// gt25=유노바 흑백, gt26=호엔/신오/조토/칼로스 마스코트, 자시안·자마젠타는 자체 방사형 생성.
export const BG_LEGEND = [
  "zacian", "zamazenta", "kyogre", "groudon", "dialga", "palkia",
  "hooh", "lugia", "xerneas", "yveltal", "zekrom", "reshiram",
  "kyurem", "kyurem_bw", "mega",
] as const;

// id 접두어(e_/r_/l_) → 파일 접두어(ev_/rg_/lg_)
const FILE_PREFIX: Record<string, string> = { e: "ev_", r: "rg_", l: "lg_" };

// 배경 id → URL. ""=없음, "e_wormhole"/"r_tokyo"=지정.
export function resolveBg(bgId: string | undefined): string {
  if (!bgId) return "";
  const pre = FILE_PREFIX[bgId[0]];
  if (!pre) return "";
  return `/gbl/bg/${pre}${bgId.slice(2)}.webp`;
}

// ── 라벨(4개국어: ko/en/ja/zh-TW) ──
const LABELS: Record<string, [string, string, string, string]> = {
  "": ["없음", "None", "なし", "無"],
  // 이벤트·우주
  e_gofest: ["고페 글로벌'26", "GO Fest '26", "GOフェス'26", "GO Fest'26"],
  e_eternatus: ["고페 피날레'25", "Finale '25", "フィナーレ'25", "總決賽'25"],
  e_wormhole: ["울트라홀", "Ultra Wormhole", "ウルトラホール", "究極異洞"],
  e_wormhole_sun: ["울트라홀·솔", "Wormhole·Sun", "異洞·日", "異洞·日"],
  e_wormhole_moon: ["울트라홀·루나", "Wormhole·Moon", "異洞·月", "異洞·月"],
  e_radiance: ["광휘", "Radiance", "ラディアンス", "光輝"],
  e_umbra: ["어둠", "Umbra", "アンブラ", "暗影"],
  e_blue: ["미스틱", "Mystic", "ミスティック", "神秘"],
  e_red: ["발러", "Valor", "ヴァーラー", "勇氣"],
  e_yellow: ["인스팅트", "Instinct", "インスティンクト", "本能"],
  // 지역
  r_tokyo: ["도쿄", "Tokyo", "東京", "東京"],
  r_osaka: ["오사카", "Osaka", "大阪", "大阪"],
  r_osaka2: ["오사카2", "Osaka 2", "大阪2", "大阪2"],
  r_seoul: ["서울", "Seoul", "ソウル", "首爾"],
  r_busan: ["부산", "Busan", "釜山", "釜山"],
  r_taipei: ["타이베이", "Taipei", "台北", "台北"],
  r_tainan: ["타이난", "Tainan", "台南", "台南"],
  r_la: ["LA", "Los Angeles", "ロサンゼルス", "洛杉磯"],
  r_newyork: ["뉴욕", "New York", "ニューヨーク", "紐約"],
  r_newjersey: ["뉴저지", "New Jersey", "ニュージャージー", "紐澤西"],
  r_chicago: ["시카고", "Chicago", "シカゴ", "芝加哥"],
  r_paris: ["파리", "Paris", "パリ", "巴黎"],
  r_paris2: ["파리2", "Paris 2", "パリ2", "巴黎2"],
  r_london: ["런던", "London", "ロンドン", "倫敦"],
  r_copenhagen: ["코펜하겐", "Copenhagen", "コペンハーゲン", "哥本哈根"],
  // 전설 마스코트
  l_zacian: ["자시안", "Zacian", "ザシアン", "蒼響"],
  l_zamazenta: ["자마젠타", "Zamazenta", "ザマゼンタ", "藏瑪然特"],
  l_kyogre: ["가이오가", "Kyogre", "カイオーガ", "蓋歐卡"],
  l_groudon: ["그란돈", "Groudon", "グラードン", "固拉多"],
  l_dialga: ["디아루가", "Dialga", "ディアルガ", "帝牙盧卡"],
  l_palkia: ["펄기아", "Palkia", "パルキア", "帕路奇亞"],
  l_hooh: ["칠색조", "Ho-Oh", "ホウオウ", "鳳王"],
  l_lugia: ["루기아", "Lugia", "ルギア", "洛奇亞"],
  l_xerneas: ["제르네아스", "Xerneas", "ゼルネアス", "哲爾尼亞斯"],
  l_yveltal: ["이벨타르", "Yveltal", "イベルタル", "伊裴爾塔爾"],
  l_zekrom: ["제크로무", "Zekrom", "ゼクロム", "捷克羅姆"],
  l_reshiram: ["레시라무", "Reshiram", "レシラム", "雷希拉姆"],
  l_kyurem: ["큐레무", "Kyurem", "キュレム", "酋雷姆"],
  l_kyurem_bw: ["큐레무·흑백", "Kyurem B/W", "キュレム白黒", "酋雷姆黑白"],
  l_mega: ["메가", "Mega", "メガ", "超級"],
};

const LI = (lang: Locale) => (lang === "en" ? 1 : lang === "ja" ? 2 : lang === "zh-TW" ? 3 : 0);
export function bgLabel(id: string, lang: Locale): string {
  return LABELS[id]?.[LI(lang)] || id;
}

// ── 팔레트 스와치 ──
export type SwatchKind = "special" | "event" | "region" | "legend";
export type Swatch = { id: string; kind: SwatchKind; sample: string };
export const BG_SWATCHES: Swatch[] = [
  { id: "", kind: "special", sample: "" },
  ...BG_LEGEND.map((x) => ({ id: "l_" + x, kind: "legend" as const, sample: `/gbl/bg/lg_${x}.webp` })),
  ...BG_EVENTS.map((x) => ({ id: "e_" + x, kind: "event" as const, sample: `/gbl/bg/ev_${x}.webp` })),
  ...BG_REGIONS.map((x) => ({ id: "r_" + x, kind: "region" as const, sample: `/gbl/bg/rg_${x}.webp` })),
];
