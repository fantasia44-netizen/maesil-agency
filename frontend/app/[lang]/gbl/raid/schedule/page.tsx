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
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// 비-레이드 이벤트명 로케일화: 오버라이드맵 → 포켓몬명 → 유형어구 → 월이름 순 치환.
// 피드가 영어 전용이라 반복 요소만 자동 번역, 일회성 캠페인명은 evtNameMap 수동 매핑.
function localMajorName(lang: Locale, name: string, t: ScheduleDict): string {
  const clean = name.replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  if (lang === "en") return clean;
  if (t.evtNameMap[clean]) return t.evtNameMap[clean];
  // 1) 포켓몬명 치환(단어 단위) — Mega/Shadow 등 접두 포함 2단어는 monLocal 경유
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
  ];
  for (const [re, to] of P) s = s.replace(re, to);
  // 3) 월 이름 치환
  EN_MONTHS.forEach((m, i) => { s = s.replace(new RegExp(`\\b${m}\\b`, "gi"), t.months[i]); });
  return s.replace(/\s{2,}/g, " ").trim();
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
// 스케줄에 표시할 비-레이드 이벤트 타입 → 이모지 (여기 있는 타입만 노출; go-battle-league/season 등 제외)
const MAJOR_EMOJI: Record<string, string> = {
  "community-day": "🌟", "pokemon-spotlight-hour": "🔦", "max-mondays": "🔴", "max-battles": "🔴",
  "pokemon-go-fest": "🎪", "event": "🎈", "research": "🔍", "go-pass": "🎫",
};

export default async function RaidSchedulePage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getSchedule(lang);
  const L = (p: string) => localizePath(lang, p);
  const events = await getEvents();

  // 달력엔 과거 이벤트도 포함(빈 날짜 채우기). 피드에 남아있는 범위까지.
  let calEvents: CalEvent[] = events.flatMap((e): CalEvent[] => {
    if (e.eventType === "raid-battles") { const r = rotInfo(e.name, t); return [{ kind: "rotation", variant: r.variant, title: r.title, start: e.start, end: e.end, bosses: bossesOf(lang, e, t) }]; }
    if (e.eventType === "raid-hour") return [{ kind: "hour", title: localEventName(lang, e.name, t), guide: t.guideHour, start: e.start, end: e.end, bosses: [] }];
    if (e.eventType === "raid-day") return [{ kind: "day", title: localEventName(lang, e.name, t), guide: /super mega|mega raid day/i.test(e.name) ? t.guideSuperMega : t.guideDay, start: e.start, end: e.end, bosses: [] }];
    return [];
  });

  // 과거 로테이션 백필 — LeekDuck 피드는 지난 이벤트를 버려 8월 초가 비어, 아카이브 기준 5성 라인 보충.
  // (미래·현행분은 피드가 제공. 새 달로 넘어가면 다른 연도라 노출 안 됨)
  const PAST_RAIDS: { variant: "star" | "mega" | "shadow"; start: string; end: string; bosses: { en: string; dex: string; shiny: boolean }[] }[] = [
    // 8/1~8/4: 7월 로테이션 꼬리
    { variant: "star", start: "2026-07-29T06:00:00.000", end: "2026-08-04T22:00:00.000", bosses: [{ en: "Kyurem", dex: "646", shiny: true }] },
    { variant: "mega", start: "2026-07-29T06:00:00.000", end: "2026-08-04T22:00:00.000", bosses: [{ en: "Mega Aggron", dex: "306", shiny: true }] },
    { variant: "shadow", start: "2026-07-01T06:00:00.000", end: "2026-08-04T22:00:00.000", bosses: [{ en: "Palkia", dex: "484", shiny: true }] },
    // 8/5~8/18: 5성 (레이크 트리오 → 그란돈)
    { variant: "star", start: "2026-08-05T06:00:00.000", end: "2026-08-11T22:00:00.000", bosses: [{ en: "Uxie", dex: "480", shiny: true }, { en: "Mesprit", dex: "481", shiny: true }, { en: "Azelf", dex: "482", shiny: true }] },
    { variant: "star", start: "2026-08-12T06:00:00.000", end: "2026-08-18T22:00:00.000", bosses: [{ en: "Groudon", dex: "383", shiny: true }] },
    // 8/5~8/18: 메가 (번치코 → 한바이트)
    { variant: "mega", start: "2026-08-05T06:00:00.000", end: "2026-08-11T22:00:00.000", bosses: [{ en: "Mega Blaziken", dex: "257", shiny: true }] },
    { variant: "mega", start: "2026-08-12T06:00:00.000", end: "2026-08-18T22:00:00.000", bosses: [{ en: "Mega Garchomp", dex: "445", shiny: true }] },
  ];
  for (const r of PAST_RAIDS) {
    calEvents.push({ kind: "rotation", variant: r.variant, title: rotInfo(r.variant === "mega" ? "Mega Raid" : r.variant === "shadow" ? "Shadow Raid" : "", t).title, start: r.start, end: r.end,
      bosses: r.bosses.map((b) => ({ ko: koMon(b.en), name: monLocal(lang, b.en, t), dex: b.dex, image: "", shiny: b.shiny })) });
  }

  // ── 메가 어센션(2026-08-31~09-06) — 이 기간 5성·그림자·정규 메가·레이드아워·스포트라이트 중단, 메가 레이드가 대체(LeekDuck 공식) ──
  const MA_START = "2026-08-31T06:00:00+09:00", MA_END = "2026-09-06T22:00:00+09:00";
  const maS = Date.parse(MA_START), maE = Date.parse(MA_END);
  const megaAscensionActive = Date.now() >= maS && Date.now() < maE;
  // 겹치는 정규 로테이션 클립 — 기간 안쪽 제거(그 기간엔 실제로 안 열림), 이전/이후 조각만 유지
  calEvents = calEvents.flatMap((ev): CalEvent[] => {
    if (ev.kind !== "rotation") return [ev];
    const s = Date.parse(ev.start), e = Date.parse(ev.end);
    if (e <= maS || s >= maE) return [ev];   // 겹침 없음
    const out: CalEvent[] = [];
    if (s < maS) out.push({ ...ev, end: MA_START });   // 이전 조각
    if (e > maE) out.push({ ...ev, start: MA_END });    // 이후 조각
    return out;
  });
  // 메가 어센션 대체 레이드(일자별 + 기간내내 라티아스/라티오스)
  const D = (day: string) => `2026-09-${day}T06:00:00+09:00`;
  const MEGA_ASCENSION: { start: string; end: string; bosses: { en: string; dex: string }[] }[] = [
    { start: MA_START, end: D("01"), bosses: [{ en: "Mega Victreebel", dex: "71" }, { en: "Mega Dragonite", dex: "149" }, { en: "Mega Malamar", dex: "687" }] },
    { start: D("01"), end: D("02"), bosses: [{ en: "Mega Falinks", dex: "870" }] },
    { start: D("02"), end: D("03"), bosses: [{ en: "Mega Skarmory", dex: "227" }] },
    { start: D("03"), end: D("04"), bosses: [{ en: "Mega Starmie", dex: "121" }] },
    { start: D("04"), end: D("05"), bosses: [{ en: "Mega Raichu", dex: "26" }] },
    { start: MA_START, end: MA_END, bosses: [{ en: "Mega Latias", dex: "380" }, { en: "Mega Latios", dex: "381" }] },
  ];
  const maLabel = lang === "en" ? "Mega Ascension" : lang === "ja" ? "メガアセンション" : lang === "zh-TW" ? "超級進化盛典" : "메가 어센션";
  for (const r of MEGA_ASCENSION) {
    calEvents.push({ kind: "rotation", variant: "mega", title: `${t.rotMegaTitle} · ${maLabel}`, start: r.start, end: r.end,
      bosses: r.bosses.map((b) => ({ ko: koMon(b.en), name: monLocal(lang, b.en, t), dex: b.dex, image: "", shiny: true })) });
  }

  // KST(UTC+9) 벽시계 날짜 — 서버가 UTC라도 한국 '오늘'이 맞도록(새벽 0~9시 하루 밀림 방지)
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  const today = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

  // 비-레이드 주요 이벤트(커뮤니티데이·스포트라이트·맥스·GO페스트·일반) — 전체 전달, 월 필터는 달력에서
  const majorEvents = events
    .filter((e) => MAJOR_EMOJI[e.eventType])
    .map((e) => ({ eventType: e.eventType, emoji: MAJOR_EMOJI[e.eventType], name: localMajorName(lang, e.name, t), start: e.start, end: e.end }));

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

        {/* 메가 어센션 진행 중 — 5성·그림자·정규 레이드 중단 안내 */}
        {megaAscensionActive && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "linear-gradient(120deg,#f5f3ff,#ffffff 70%)", border: "1px solid #ddd6fe", borderLeft: "4px solid #7c3aed", borderRadius: 12, padding: "0.85rem 1rem", marginBottom: 14 }}>
            <span style={{ fontSize: "1.3rem", lineHeight: 1.2 }}>🌙</span>
            <div style={{ fontSize: "0.86rem", color: "#4c1d95", lineHeight: 1.6 }}>
              <b style={{ color: "#6d28d9" }}>{maLabel} {lang === "ko" ? "진행 중 (8/31~9/6)" : "(Aug 31–Sep 6)"}</b>
              <div style={{ color: "#5b21b6", marginTop: 2 }}>
                {lang === "en" ? "5-star, Shadow, and regular Mega raids are paused. Mega Ascension raids replace them (megas below rotate daily)."
                  : lang === "ja" ? "5つ星・シャドウ・通常メガレイドは休止。メガアセンションのメガレイドが代替（下記メガが日替わり）。"
                  : lang === "zh-TW" ? "5星、暗影、常規超級Mega團戰暫停，改由超級進化盛典的Mega團戰替代（下方Mega每日輪替）。"
                  : "5성·그림자·정규 메가 레이드가 중단되고, 메가 어센션 메가 레이드로 대체됩니다 (아래 메가가 일자별 로테이션)."}
              </div>
            </div>
          </div>
        )}

        {calEvents.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>{t.loadFail}</div>
        ) : (
          <>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 12px 14px" }}>
              <RaidCalendar events={calEvents} majorEvents={majorEvents} today={today} t={t} lang={lang} />
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
