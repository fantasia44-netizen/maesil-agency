// 레이드 스케줄 — 서버렌더(ISR). ScrapedDuck(LeekDuck) events 오픈피드 런타임 페치.
// 달력 뷰(클라이언트) + 로테이션 아젠다. 다국어 이벤트명. PvP 시즌일정(/gbl/schedule)과 별개.
import Link from "next/link";
import type { Metadata } from "next";
import PKN from "../../pokedex_names.json";
import NAME_EN_KO from "../../name_en_ko.json";
import RaidCalendar, { type CalEvent, type CalBoss } from "./RaidCalendar";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../../lib/i18n";
import { localName } from "../../contentI18n";
import { getSchedule, type ScheduleDict } from "./dict";

export const revalidate = 600; // 6시간

const EN_KO = NAME_EN_KO as Record<string, string>;
const PKNAMES = PKN as unknown as Record<string, { ko: string; en: string; ja: string }>;
// 영문 이름 → {ko,en,ja} 역참조(이벤트명은 영문 문자열만 있어 dex가 없으므로 이름 기반).
const BY_EN: Record<string, { ko: string; en: string; ja: string }> = {};
for (const e of Object.values(PKNAMES)) if (e?.en) BY_EN[e.en.toLowerCase()] = e;

type RawBoss = { name: string; image: string; canBeShiny?: boolean };
type EventItem = {
  eventID: string; name: string; eventType: string;
  start: string; end: string; image?: string;
  extraData?: { raidbattles?: { bosses?: RawBoss[] } };
};

async function getEvents(): Promise<EventItem[]> {
  try {
    const res = await fetch("https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json", { next: { revalidate } });
    if (!res.ok) return [];
    return (await res.json()) as EventItem[];
  } catch {
    return [];
  }
}

function dexOf(image: string): string {
  const m = image.match(/\/pm(\d+)\./) || image.match(/pokemon_icon_(\d+)_/);
  return m ? String(Number(m[1])) : "";
}
// 영문 포켓몬명 → 한글 (메가/섀도우/지역폼 접두 처리) — 스프라이트 폼 판정용(한글 유지 필수)
function koMon(english: string): string {
  let n = english.trim(), prefix = "";
  const pfs: [RegExp, string][] = [[/^Mega\s+/i, "메가 "], [/^Shadow\s+/i, "섀도우 "], [/^Alolan\s+/i, "알로라 "], [/^Galarian\s+/i, "가라르 "], [/^Hisuian\s+/i, "히스이 "], [/^Paldean\s+/i, "팔데아 "]];
  for (const [re, k] of pfs) { if (re.test(n)) { prefix = k; n = n.replace(re, ""); break; } }
  n = n.replace(/\s*\(.*\)\s*$/, ""); // "(Altered)" 등 폼 괄호 제거
  return prefix + (EN_KO[n.toLowerCase()] || n);
}
// 영문 포켓몬명 → 로케일 표시명(접두는 사전 기반)
function monLocal(lang: Locale, english: string, t: ScheduleDict): string {
  let n = english.trim(), prefix = "";
  const pfs: [RegExp, string][] = [[/^Mega\s+/i, t.pfx.mega], [/^Shadow\s+/i, t.pfx.shadow], [/^Alolan\s+/i, t.pfx.alola], [/^Galarian\s+/i, t.pfx.galar], [/^Hisuian\s+/i, t.pfx.hisui], [/^Paldean\s+/i, t.pfx.paldea]];
  for (const [re, k] of pfs) { if (re.test(n)) { prefix = k; n = n.replace(re, ""); break; } }
  n = n.replace(/\s*\(.*\)\s*$/, "");
  const key = n.toLowerCase();
  return prefix + localName(lang, BY_EN[key], EN_KO[key] || n);
}
// 이벤트명 전체 로케일화
function localEventName(lang: Locale, name: string, t: ScheduleDict): string {
  let s = name.replace(/\s+in\s+.*$/i, "");
  let suffix = "";
  const m = s.match(/(Super Mega Raid Day|Mega Raid Day|Raid Hour|Raid Day)\s*$/i);
  if (m) {
    suffix = { "super mega raid day": t.sfxSuperMega, "mega raid day": t.sfxMega, "raid hour": t.sfxRaidHour, "raid day": t.sfxRaidDay }[m[1].toLowerCase()] || m[1];
    s = s.slice(0, m.index).trim();
  }
  const mons = s ? s.split(/,\s*and\s+|,\s*|\s+and\s+/).filter(Boolean).map((x) => monLocal(lang, x, t)).join("·") : "";
  return (mons ? mons + " " : "") + suffix;
}
function rotInfo(name: string, t: ScheduleDict): { title: string; variant: "star" | "shadow" | "mega" } {
  if (/Mega Raid/i.test(name)) return { title: t.rotMegaTitle, variant: "mega" };
  if (/Shadow Raid/i.test(name)) return { title: t.rotShadowTitle, variant: "shadow" };
  return { title: t.rotStarTitle, variant: "star" };
}
function bossesOf(lang: Locale, e: EventItem, t: ScheduleDict): CalBoss[] {
  return (e.extraData?.raidbattles?.bosses || []).map((b) => ({
    ko: koMon(b.name), name: monLocal(lang, b.name, t), dex: dexOf(b.image), image: b.image, shiny: !!b.canBeShiny,
  }));
}

const PATH = "/gbl/raid/schedule";
export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getSchedule(lang);
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    keywords: t.metaKeywords,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) },
    openGraph: { title: t.ogTitle, description: t.ogDesc, url: localizePath(lang, PATH), images: ["/gbl-og.png"], type: "website" },
  };
}

const CARD = "#ffffff", BORDER = "#e3e8f2";

export default async function RaidSchedulePage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getSchedule(lang);
  const L = (p: string) => localizePath(lang, p);
  const events = await getEvents();

  // 달력엔 과거 이벤트도 포함(빈 날짜 채우기). 피드에 남아있는 범위까지.
  const calEvents: CalEvent[] = events.flatMap((e): CalEvent[] => {
    if (e.eventType === "raid-battles") { const r = rotInfo(e.name, t); return [{ kind: "rotation", variant: r.variant, title: r.title, start: e.start, end: e.end, bosses: bossesOf(lang, e, t) }]; }
    if (e.eventType === "raid-hour") return [{ kind: "hour", title: localEventName(lang, e.name, t), start: e.start, end: e.end, bosses: [] }];
    if (e.eventType === "raid-day") return [{ kind: "day", title: localEventName(lang, e.name, t), start: e.start, end: e.end, bosses: [] }];
    return [];
  });

  // KST(UTC+9) 벽시계 날짜 — 서버가 UTC라도 한국 '오늘'이 맞도록(새벽 0~9시 하루 밀림 방지)
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  const today = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #ffe3d1 0%, transparent 60%), linear-gradient(180deg,#fdf8f4,#f4eef8)",
    padding: "1.4rem 1rem 4rem",
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl/raid")} style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none" }}>{t.navBack}</Link>
          <Link href={L("/gbl/raid/bosses")} style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>{t.navBosses}</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>{t.h1}</h1>
        <p style={{ margin: "0.4rem 0 0.8rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          {t.intro.map((s, i) => s.b ? <b key={i} style={{ color: "#334155" }}>{s.t}</b> : <span key={i}>{s.t}</span>)}
        </p>

        {calEvents.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>{t.loadFail}</div>
        ) : (
          <>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 12px 14px" }}>
              <RaidCalendar events={calEvents} today={today} t={t} />
            </div>
          </>
        )}

        <div style={{ marginTop: 24, textAlign: "center", fontSize: "0.72rem", color: "#94a3b8" }}>
          {t.footerData}<Link href={L("/gbl/raid")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerTierLink}</Link>
        </div>
      </div>
    </div>
  );
}
