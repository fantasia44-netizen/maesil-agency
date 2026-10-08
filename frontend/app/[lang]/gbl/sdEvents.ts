// ScrapedDuck(LeekDuck) 오픈 피드 공유 유틸 — 이벤트/알 런타임 페치 + 이벤트명 다국어 번역.
// 재배포 없이 ISR(revalidate)로 자동 갱신. /gbl/events(전체 달력) + /gbl/raid/schedule(레이드) 공용 기반.
// 피드가 영어 전용이라 반복 요소(포켓몬명·유형어구·월)만 자동 번역, 일회성 캠페인명은 evtNameMap 수동 매핑.
import PKN from "./pokedex_names.json";
import NAME_EN_KO from "./name_en_ko.json";
import { localName } from "./contentI18n";
import type { Locale } from "../../../lib/i18n";

export const SD_EVENTS_URL = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json";
export const SD_EGGS_URL = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/eggs.json";

export type SDExtraGeneric = { hasSpawns?: boolean; hasFieldResearchTasks?: boolean };
export type SDEvent = {
  eventID: string;
  name: string;
  eventType: string;
  heading?: string;
  link?: string;
  image?: string;
  start: string; // 현지 벽시계(타임존 없음) — 스포트라이트=현지 18시 등
  end: string;
  extraData?: {
    generic?: SDExtraGeneric;
    raidbattles?: { bosses?: { name: string; image: string; canBeShiny?: boolean }[] };
    // 스포트라이트 아워 — 메인 포켓몬 + 보너스("2× Catch Candy")
    spotlight?: { name?: string; image?: string; canBeShiny?: boolean; bonus?: string };
    // 커뮤니티 데이 — 등장 포켓몬 + 보너스 목록(+ 각주)
    communityday?: {
      spawns?: { name: string; image: string }[];
      bonuses?: { text: string; image?: string }[];
      bonusDisclaimers?: string[];
      shinies?: { name: string; image: string }[];
    };
    promocodes?: string[];
  };
};

export type SDEgg = {
  name: string;
  eggType: string; // "2 km" 등
  isAdventureSync?: boolean;
  image: string;
  canBeShiny?: boolean;
  combatPower?: { min: number; max: number };
  isRegional?: boolean;
  isGiftExchange?: boolean;
  rarity?: number;
};

export async function getSDEvents(revalidate: number): Promise<SDEvent[]> {
  try {
    const res = await fetch(SD_EVENTS_URL, { next: { revalidate } });
    if (!res.ok) return [];
    return (await res.json()) as SDEvent[];
  } catch {
    return [];
  }
}

export async function getSDEggs(revalidate: number): Promise<SDEgg[]> {
  try {
    const res = await fetch(SD_EGGS_URL, { next: { revalidate } });
    if (!res.ok) return [];
    return (await res.json()) as SDEgg[];
  } catch {
    return [];
  }
}

// ── 이름 번역 인프라 (레이드 스케줄과 동일 로직 공유) ──
const EN_KO = NAME_EN_KO as Record<string, string>;
const PKNAMES = PKN as unknown as Record<string, { ko: string; en: string; ja: string }>;
const BY_EN: Record<string, { ko: string; en: string; ja: string }> = {};
for (const e of Object.values(PKNAMES)) if (e?.en) BY_EN[e.en.toLowerCase()] = e;

// 이벤트명 번역에 필요한 라벨(페이지 dict의 부분집합) — dict 간 공유 시그니처.
export type SDLabels = {
  pfx: { mega: string; shadow: string; alola: string; galar: string; hisui: string; paldea: string };
  evtType: Record<string, string>;
  months: string[];
  dynamax: string;
  evtClassic: string;
  evtNameMap: Record<string, string>;
  sfxSuperMega: string; sfxMega: string; sfxRaidHour: string; sfxRaidDay: string;
};

const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// 스프라이트/도감 dex 추출(이미지 URL 기반)
export function dexOf(image: string): string {
  const m = image.match(/\/pm(\d+)\./) || image.match(/pokemon_icon_(\d+)_/);
  return m ? String(Number(m[1])) : "";
}

// 영문 이름 → 조회 키. 피드가 마침표를 빼고 주는 이름("Mime Jr")도 도감 표기("Mime Jr.")로 찾는다.
const enKey = (n: string): string => { const k = n.toLowerCase(); return BY_EN[k] || EN_KO[k] ? k : BY_EN[k + "."] || EN_KO[k + "."] ? k + "." : k; };

// 영문 포켓몬명 → 한글명(스프라이트 폼 판정용 — formDex가 한글 키워드 사용)
export function koMon(english: string): string {
  let n = english.trim(), prefix = "";
  const pfs: [RegExp, string][] = [
    [/^Mega\s+/i, "메가 "], [/^Shadow\s+/i, "섀도우 "], [/^Alolan\s+/i, "알로라 "],
    [/^Galarian\s+/i, "가라르 "], [/^Hisuian\s+/i, "히스이 "], [/^Paldean\s+/i, "팔데아 "],
  ];
  for (const [re, k] of pfs) { if (re.test(n)) { prefix = k; n = n.replace(re, ""); break; } }
  n = n.replace(/\s*\(.*\)\s*$/, ""); // "(Altered)" 등 폼 괄호 제거
  const xy = n.match(/\s+([XY])$/); if (xy) n = n.slice(0, xy.index); // 메가 리자몽 X/Y·뮤츠 X/Y — 접미 분리 후 조회
  return prefix + (EN_KO[enKey(n)] || n) + (xy ? ` ${xy[1]}` : "");
}

// 영문 포켓몬명 → 로케일 표시명(메가/섀도우/지역폼 접두는 사전 기반)
export function monLocal(lang: Locale, english: string, t: SDLabels): string {
  let n = english.trim(), prefix = "";
  const pfs: [RegExp, string][] = [
    [/^Mega\s+/i, t.pfx.mega], [/^Shadow\s+/i, t.pfx.shadow], [/^Alolan\s+/i, t.pfx.alola],
    [/^Galarian\s+/i, t.pfx.galar], [/^Hisuian\s+/i, t.pfx.hisui], [/^Paldean\s+/i, t.pfx.paldea],
  ];
  for (const [re, k] of pfs) { if (re.test(n)) { prefix = k; n = n.replace(re, ""); break; } }
  n = n.replace(/\s*\(.*\)\s*$/, "");
  const xy = n.match(/\s+([XY])$/); if (xy) n = n.slice(0, xy.index);
  const key = enKey(n);
  return prefix + localName(lang, BY_EN[key], EN_KO[key] || n) + (xy ? ` ${xy[1]}` : "");
}

// 사전(dict)에 없는 반복 어구 — 로케일별 내장 표(긴 것 우선). 레이드 일정·이벤트 달력 공용.
const EXTRA: Record<string, [RegExp, string][]> = {
  ko: [
    [/Mega Halloween Cup/gi, "메가 할로윈컵"], [/Mega Catch Cup/gi, "메가 캐치컵"],
    [/Great League Edition/gi, "슈퍼리그 에디션"], [/Mega Edition/gi, "메가 에디션"],
    [/Great League/gi, "슈퍼리그"], [/Ultra League/gi, "하이퍼리그"], [/Master League/gi, "마스터리그"],
    [/Little Cup/gi, "리틀컵"], [/Fantasy Cup/gi, "판타지컵"], [/Halloween Cup/gi, "할로윈컵"], [/Catch Cup/gi, "캐치컵"],
    [/\(Origin Forme\)/gi, "(오리진폼)"], [/\(Altered Forme\)/gi, "(어나더폼)"], [/\(Incarnate Forme\)/gi, "(화신폼)"], [/\(Therian Forme\)/gi, "(영물폼)"],
    [/Hatch Day/gi, "부화 데이"], [/Timed Research/gi, "타임 챌린지"], [/Showers/gi, "유성우"],
    [/Southern Delta Aquariids/gi, "물병자리 델타 남쪽"], [/Eta Aquariids/gi, "물병자리 에타"],
    [/Orionids/gi, "오리온자리"], [/Leonids/gi, "사자자리"], [/Geminids/gi, "쌍둥이자리"], [/Perseids/gi, "페르세우스자리"],
    [/Pokémon GO/g, "포켓몬 GO"], [/Halloween/gi, "할로윈"], [/Part III\b/g, "파트 3"], [/Part II\b/g, "파트 2"], [/Part I\b/g, "파트 1"],
  ],
  ja: [
    [/Mega Halloween Cup/gi, "メガハロウィンカップ"], [/Mega Catch Cup/gi, "メガキャッチカップ"],
    [/Great League Edition/gi, "スーパーリーグエディション"], [/Mega Edition/gi, "メガエディション"],
    [/Great League/gi, "スーパーリーグ"], [/Ultra League/gi, "ハイパーリーグ"], [/Master League/gi, "マスターリーグ"],
    [/Little Cup/gi, "リトルカップ"], [/Fantasy Cup/gi, "ファンタジーカップ"], [/Halloween Cup/gi, "ハロウィンカップ"], [/Catch Cup/gi, "キャッチカップ"],
    [/\s*\(Origin Forme\)/gi, "（オリジンフォルム）"], [/\s*\(Altered Forme\)/gi, "（アナザーフォルム）"], [/\s*\(Incarnate Forme\)/gi, "（けしんフォルム）"], [/\s*\(Therian Forme\)/gi, "（れいじゅうフォルム）"],
    [/Hatch Day/gi, "ふかの日"], [/Timed Research/gi, "タイムチャレンジ"], [/Showers/gi, "流星群"],
    [/Southern Delta Aquariids/gi, "みずがめ座δ南"], [/Eta Aquariids/gi, "みずがめ座η"],
    [/Orionids/gi, "オリオン座"], [/Leonids/gi, "しし座"], [/Geminids/gi, "ふたご座"], [/Perseids/gi, "ペルセウス座"],
    [/Pokémon GO/g, "ポケモンGO"], [/Halloween/gi, "ハロウィン"], [/Part III\b/g, "パート3"], [/Part II\b/g, "パート2"], [/Part I\b/g, "パート1"],
  ],
  "zh-TW": [
    [/Mega Halloween Cup/gi, "超級萬聖節盃"], [/Mega Catch Cup/gi, "超級捕捉盃"],
    [/Great League Edition/gi, "超級聯盟版"], [/Mega Edition/gi, "超級進化版"],
    [/Great League/gi, "超級聯盟"], [/Ultra League/gi, "高級聯盟"], [/Master League/gi, "大師聯盟"],
    [/Little Cup/gi, "小小盃"], [/Fantasy Cup/gi, "幻想盃"], [/Halloween Cup/gi, "萬聖節盃"], [/Catch Cup/gi, "捕捉盃"],
    [/\s*\(Origin Forme\)/gi, "（起源形態）"], [/\s*\(Altered Forme\)/gi, "（別種形態）"], [/\s*\(Incarnate Forme\)/gi, "（化身形態）"], [/\s*\(Therian Forme\)/gi, "（靈獸形態）"],
    [/Hatch Day/gi, "孵化日"], [/Timed Research/gi, "限時調查"], [/Showers/gi, "流星雨"],
    [/Southern Delta Aquariids/gi, "寶瓶座δ南"], [/Eta Aquariids/gi, "寶瓶座η"],
    [/Orionids/gi, "獵戶座"], [/Leonids/gi, "獅子座"], [/Geminids/gi, "雙子座"], [/Perseids/gi, "英仙座"],
    [/Pokémon GO/g, "寶可夢GO"], [/Halloween/gi, "萬聖節"], [/Part III\b/g, "第3部"], [/Part II\b/g, "第2部"], [/Part I\b/g, "第1部"],
  ],
};
// 일회성 캠페인명 — 사전의 evtNameMap(페이지별)에 없는 것을 여기서 공통으로 보완(zh-TW 포함).
const NAME_MAP: Record<string, Record<string, string>> = {
  ko: { "World Space Week 2026": "세계 우주 주간 2026", "Fall Marathon: Buddy Trek": "가을 마라톤: 파트너 트렉", "Pokémon TCG: 30th Celebration": "포켓몬 카드 게임 30주년 기념" },
  ja: { "World Space Week 2026": "世界宇宙週間 2026", "Fall Marathon: Buddy Trek": "秋のマラソン: 相棒トレック", "Pokémon TCG: 30th Celebration": "ポケモンカードゲーム 30周年記念" },
  "zh-TW": { "World Space Week 2026": "世界太空週 2026", "Fall Marathon: Buddy Trek": "秋季馬拉松: 夥伴健行", "Pokémon TCG: 30th Celebration": "寶可夢集換式卡牌遊戲 30週年慶" },
};

// 이벤트명 전체 로케일화: 오버라이드맵 → 유형어구 → 포켓몬명 → 나열 구분 → 월이름 순 치환.
export function localizeEventName(lang: Locale, name: string, t: SDLabels): string {
  const clean = name.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  if (lang === "en") return clean;
  const mapped = t.evtNameMap[clean] || NAME_MAP[lang]?.[clean];
  if (mapped) return mapped;
  // 1) 유형 어구 치환(긴 것 우선) — 포켓몬명보다 먼저. 순서가 반대면 "Super Mega Raid Day"·"Mega Edition"의 Mega가
  //    폼 접두("메가 Raid")로 먼저 바뀌어 "Super 메가 레이드 데이"처럼 반쯤만 번역됐음.
  let s = clean;
  const P: [RegExp, string][] = [
    ...(EXTRA[lang] || []),
    [/Super Mega Raid Day/gi, t.sfxSuperMega], [/Mega Raid Day/gi, t.sfxMega],
    [/Raid Hour/gi, t.sfxRaidHour], [/Raid Day/gi, t.sfxRaidDay],
    [/Community Day Classic/gi, `${t.evtType["community-day"]} ${t.evtClassic}`],
    [/Community Day/gi, t.evtType["community-day"]],
    [/Spotlight Hour/gi, t.evtType["pokemon-spotlight-hour"]],
    [/Max Battle Day/gi, t.evtType["max-battles"]],
    [/during Max Monday/gi, t.evtType["max-mondays"]], [/Max Monday/gi, t.evtType["max-mondays"]],
    [/GO Pass/gi, t.evtType["go-pass"]], [/GO Fest/gi, t.evtType["pokemon-go-fest"]],
    [/Dynamax/gi, t.dynamax],
  ];
  for (const [re, to] of P) s = s.replace(re, to);
  // 2) 포켓몬명 치환 — 접두 포함 2단어는 monLocal 경유, 나머지는 단어 단위
  s = s.replace(/\b(Mega|Shadow|Alolan|Galarian|Hisuian|Paldean)\s+[A-Za-zé.'-]+/g, (m) => monLocal(lang, m, t));
  s = s.replace(/[A-Za-zé][A-Za-zé.'-]*/g, (w) => {
    const k = w.toLowerCase().replace(/[^a-zé]/g, "");
    return BY_EN[k] ? localName(lang, BY_EN[k], w) : w;
  });
  // 다마리 나열 정리: ", and " · " and " · 나머지 쉼표 → 가운뎃점
  s = s.replace(/,\s*and\s+/gi, "·").replace(/\s+and\s+/gi, "·").replace(/,\s+/g, "·");
  // 3) 월 이름 치환
  EN_MONTHS.forEach((m, i) => { s = s.replace(new RegExp(`\\b${m}\\b`, "gi"), t.months[i]); });
  return s.replace(/\s{2,}/g, " ").trim();
}


// ── 이벤트 보너스 문구 로케일화 ──────────────────────────────────────────
// 피드(ScrapedDuck)의 보너스 텍스트는 어휘가 좁고 반복적이라 패턴 치환으로 충분하다.
// 못 맞춘 문구는 원문(영어) 그대로 둔다 — 틀린 번역보다 원문이 낫다.
const BONUS: Record<string, [RegExp, string][]> = {
  ko: [
    [/^Increased Spawns$/i, "출현 증가"],
    [/^(\d+)\s*[x×]\s*Catch XP\*?$/i, "포획 XP $1배"],
    [/^(\d+)\s*[x×]\s*Catch Candy\*?$/i, "포획 사탕 $1배"],
    [/^(\d+)\s*[x×]\s*Catch Stardust\*?$/i, "포획 별의모래 $1배"],
    [/^(\d+)\s*[x×]\s*Transfer Candy\*?$/i, "전송 사탕 $1배"],
    [/^(\d+)\s*[x×]\s*Evolution XP\*?$/i, "진화 XP $1배"],
    [/^(\d+)-hour Incense\*?$/i, "디퓨저 $1시간"],
    [/^(\d+)-hour Lures?\*?$/i, "루어모듈 $1시간"],
    [/^(\d+)x Chance for Trainers level (\d+) and up to receive Candy XL.*$/i, "레벨 $2 이상 포획 시 이상한사탕 XL 획득 확률 $1배"],
    [/^One additional Special Trade.*$/i, "특별 교환 1회 추가 (하루 최대 2회)"],
    [/^Trades made will require (\d+)% less Stardust.*$/i, "교환 별의모래 $1% 감소"],
  ],
  ja: [
    [/^Increased Spawns$/i, "出現増加"],
    [/^(\d+)\s*[x×]\s*Catch XP\*?$/i, "捕獲XP $1倍"],
    [/^(\d+)\s*[x×]\s*Catch Candy\*?$/i, "捕獲アメ $1倍"],
    [/^(\d+)\s*[x×]\s*Catch Stardust\*?$/i, "捕獲ほしのすな $1倍"],
    [/^(\d+)\s*[x×]\s*Transfer Candy\*?$/i, "転送アメ $1倍"],
    [/^(\d+)\s*[x×]\s*Evolution XP\*?$/i, "進化XP $1倍"],
    [/^(\d+)-hour Incense\*?$/i, "おこう $1時間"],
    [/^(\d+)-hour Lures?\*?$/i, "ルアーモジュール $1時間"],
    [/^(\d+)x Chance for Trainers level (\d+) and up to receive Candy XL.*$/i, "レベル$2以上の捕獲でふしぎなアメXL獲得確率 $1倍"],
    [/^One additional Special Trade.*$/i, "スペシャルトレード1回追加（1日最大2回）"],
    [/^Trades made will require (\d+)% less Stardust.*$/i, "交換に必要なほしのすな $1%減"],
  ],
  "zh-TW": [
    [/^Increased Spawns$/i, "出現增加"],
    [/^(\d+)\s*[x×]\s*Catch XP\*?$/i, "捕捉XP $1倍"],
    [/^(\d+)\s*[x×]\s*Catch Candy\*?$/i, "捕捉糖果 $1倍"],
    [/^(\d+)\s*[x×]\s*Catch Stardust\*?$/i, "捕捉星塵 $1倍"],
    [/^(\d+)\s*[x×]\s*Transfer Candy\*?$/i, "傳送糖果 $1倍"],
    [/^(\d+)\s*[x×]\s*Evolution XP\*?$/i, "進化XP $1倍"],
    [/^(\d+)-hour Incense\*?$/i, "薰香 $1小時"],
    [/^(\d+)-hour Lures?\*?$/i, "誘餌模組 $1小時"],
    [/^(\d+)x Chance for Trainers level (\d+) and up to receive Candy XL.*$/i, "$2級以上捕捉時獲得糖果XL機率 $1倍"],
    [/^One additional Special Trade.*$/i, "額外一次特別交換（每日最多兩次）"],
    [/^Trades made will require (\d+)% less Stardust.*$/i, "交換所需星塵減少 $1%"],
  ],
};
export function localizeBonus(lang: Locale, text: string): string {
  const raw = text.replace(/\s+/g, " ").trim();
  if (lang === "en") return raw;
  const star = /\*\s*$/.test(raw) ? "*" : "";
  for (const [re, to] of BONUS[lang] || []) if (re.test(raw)) return raw.replace(re, to) + star;
  return raw;
}

// KST(UTC+9) 벽시계 '오늘' — 서버 UTC라도 한국 오늘 기준(새벽 밀림 방지)
export function kstToday(): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
