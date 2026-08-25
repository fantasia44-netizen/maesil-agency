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
  extraData?: { generic?: SDExtraGeneric; raidbattles?: { bosses?: { name: string; image: string; canBeShiny?: boolean }[] } };
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

// 영문 포켓몬명 → 한글명(스프라이트 폼 판정용 — formDex가 한글 키워드 사용)
export function koMon(english: string): string {
  let n = english.trim(), prefix = "";
  const pfs: [RegExp, string][] = [
    [/^Mega\s+/i, "메가 "], [/^Shadow\s+/i, "섀도우 "], [/^Alolan\s+/i, "알로라 "],
    [/^Galarian\s+/i, "가라르 "], [/^Hisuian\s+/i, "히스이 "], [/^Paldean\s+/i, "팔데아 "],
  ];
  for (const [re, k] of pfs) { if (re.test(n)) { prefix = k; n = n.replace(re, ""); break; } }
  n = n.replace(/\s*\(.*\)\s*$/, "");
  return prefix + (EN_KO[n.toLowerCase()] || n);
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
  const key = n.toLowerCase();
  return prefix + localName(lang, BY_EN[key], EN_KO[key] || n);
}

// 이벤트명 전체 로케일화: 오버라이드맵 → 포켓몬명 → 유형어구 → 월이름 순 치환.
export function localizeEventName(lang: Locale, name: string, t: SDLabels): string {
  const clean = name.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  if (lang === "en") return clean;
  if (t.evtNameMap[clean]) return t.evtNameMap[clean];
  // 1) 포켓몬명 치환 — 접두 포함 2단어는 monLocal 경유, 나머지는 단어 단위
  let s = clean.replace(/\b(Mega|Shadow|Alolan|Galarian|Hisuian|Paldean)\s+[A-Za-zé.'-]+/g, (m) => monLocal(lang, m, t));
  s = s.replace(/[A-Za-zé][A-Za-zé.'-]*/g, (w) => {
    const k = w.toLowerCase().replace(/[^a-zé]/g, "");
    return BY_EN[k] ? localName(lang, BY_EN[k], w) : w;
  });
  // 2) 유형 어구 치환(긴 것 우선)
  const P: [RegExp, string][] = [
    [/Super Mega Raid Day/gi, t.sfxSuperMega], [/Mega Raid Day/gi, t.sfxMega],
    [/Raid Hour/gi, t.sfxRaidHour], [/Raid Day/gi, t.sfxRaidDay],
    [/Community Day Classic/gi, `${t.evtType["community-day"]} ${t.evtClassic}`],
    [/Community Day/gi, t.evtType["community-day"]],
    [/Spotlight Hour/gi, t.evtType["pokemon-spotlight-hour"]],
    [/Max Battle Day/gi, t.evtType["max-battles"]],
    [/during Max Monday/gi, t.evtType["max-mondays"]], [/Max Monday/gi, t.evtType["max-mondays"]],
    [/GO Pass/gi, t.evtType["go-pass"]], [/GO Fest/gi, t.evtType["pokemon-go-fest"]],
    [/Dynamax/gi, t.dynamax],
    // 다마리 나열 정리: ", and " · " and " · 나머지 쉼표 → 가운뎃점
    [/,\s*and\s+/gi, "·"], [/\s+and\s+/gi, "·"], [/,\s+/g, "·"],
  ];
  for (const [re, to] of P) s = s.replace(re, to);
  // 3) 월 이름 치환
  EN_MONTHS.forEach((m, i) => { s = s.replace(new RegExp(`\\b${m}\\b`, "gi"), t.months[i]); });
  return s.replace(/\s{2,}/g, " ").trim();
}

// KST(UTC+9) 벽시계 '오늘' — 서버 UTC라도 한국 오늘 기준(새벽 밀림 방지)
export function kstToday(): string {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
