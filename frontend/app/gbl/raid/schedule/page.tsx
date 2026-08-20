// 레이드 스케줄 — 서버렌더(ISR). ScrapedDuck(LeekDuck) events 오픈피드 런타임 페치.
// 달력 뷰(클라이언트) + 로테이션 아젠다. 한글 이벤트명. PvP 시즌일정(/gbl/schedule)과 별개.
import Link from "next/link";
import type { Metadata } from "next";
import POKEDEX from "../../pokedex_ko.json";
import NAME_EN_KO from "../../name_en_ko.json";
import RaidCalendar, { type CalEvent, type CalBoss } from "./RaidCalendar";
import { monSprite } from "../../sprite";

export const revalidate = 600; // 6시간

const KO = POKEDEX as Record<string, string>;
const EN_KO = NAME_EN_KO as Record<string, string>;

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
// 영문 포켓몬명 → 한글 (메가/섀도우/지역폼 접두 처리)
function koMon(english: string): string {
  let n = english.trim(), prefix = "";
  const pfs: [RegExp, string][] = [[/^Mega\s+/i, "메가 "], [/^Shadow\s+/i, "섀도우 "], [/^Alolan\s+/i, "알로라 "], [/^Galarian\s+/i, "가라르 "], [/^Hisuian\s+/i, "히스이 "], [/^Paldean\s+/i, "팔데아 "]];
  for (const [re, k] of pfs) { if (re.test(n)) { prefix = k; n = n.replace(re, ""); break; } }
  n = n.replace(/\s*\(.*\)\s*$/, ""); // "(Altered)" 등 폼 괄호 제거
  return prefix + (EN_KO[n.toLowerCase()] || n);
}
// 이벤트명 전체 한글화
function koEventName(name: string): string {
  let s = name.replace(/\s+in\s+.*$/i, "");
  let suffix = "";
  const m = s.match(/(Super Mega Raid Day|Mega Raid Day|Raid Hour|Raid Day)\s*$/i);
  if (m) {
    suffix = { "super mega raid day": "슈퍼 메가 레이드 데이", "mega raid day": "메가 레이드 데이", "raid hour": "레이드 아워", "raid day": "레이드 데이" }[m[1].toLowerCase()] || m[1];
    s = s.slice(0, m.index).trim();
  }
  const mons = s ? s.split(/,\s*and\s+|,\s*|\s+and\s+/).filter(Boolean).map(koMon).join("·") : "";
  return (mons ? mons + " " : "") + suffix;
}
function rotInfo(name: string): { title: string; variant: "star" | "shadow" | "mega" } {
  if (/Mega Raid/i.test(name)) return { title: "메가 레이드", variant: "mega" };
  if (/Shadow Raid/i.test(name)) return { title: "그림자 5성", variant: "shadow" };
  return { title: "5성 레전드", variant: "star" };
}
const ROT_STYLE = {
  star: { icon: "⭐", label: "5성", c: "#dc2626", bg: "#fee2e2" },
  shadow: { icon: "🌑", label: "그림자 5성", c: "#4b0082", bg: "#ede9fe" },
  mega: { icon: "🔷", label: "메가", c: "#7c3aed", bg: "#f3e8ff" },
};
function bossesOf(e: EventItem): CalBoss[] {
  return (e.extraData?.raidbattles?.bosses || []).map((b) => ({
    ko: koMon(b.name), dex: dexOf(b.image), image: b.image, shiny: !!b.canBeShiny,
  }));
}

export const metadata: Metadata = {
  title: "포켓몬고 레이드 스케줄 달력 · 5성·메가 로테이션 | GBL Note",
  description: "포켓몬 GO 레이드 일정을 달력으로. 5성 전설·메가·섀도우 레이드 로테이션 기간과 레이드 아워·레이드 데이를 날짜별로 확인. 보스 100% CP·약점 딜러 연결. 자동 업데이트.",
  keywords: ["포켓몬고 레이드 일정", "레이드 달력", "5성 레이드 로테이션", "메가 레이드 일정", "레이드 아워", "레이드 데이"],
  alternates: { canonical: "/gbl/raid/schedule" },
  openGraph: { title: "포켓몬고 레이드 스케줄 달력", description: "5성·메가 로테이션 + 레이드 아워·데이", url: "/gbl/raid/schedule", images: ["/gbl-og.png"], type: "website" },
};

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const fmtD = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}.${d.getDate()}(${WD[d.getDay()]})`; };
const CARD = "#ffffff", BORDER = "#e3e8f2";

export default async function RaidSchedulePage() {
  const events = await getEvents();
  const now = Date.now();

  // 달력엔 과거 이벤트도 포함(빈 날짜 채우기). 피드에 남아있는 범위까지.
  const calEvents: CalEvent[] = events.flatMap((e): CalEvent[] => {
    if (e.eventType === "raid-battles") { const r = rotInfo(e.name); return [{ kind: "rotation", variant: r.variant, title: r.title, start: e.start, end: e.end, bosses: bossesOf(e) }]; }
    if (e.eventType === "raid-hour") return [{ kind: "hour", title: koEventName(e.name), start: e.start, end: e.end, bosses: [] }];
    if (e.eventType === "raid-day") return [{ kind: "day", title: koEventName(e.name), start: e.start, end: e.end, bosses: [] }];
    return [];
  });

  // 아젠다(기간 목록)는 현재+예정만
  const rotations = calEvents.filter((e) => e.kind === "rotation" && new Date(e.end).getTime() > now).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #ffe3d1 0%, transparent 60%), linear-gradient(180deg,#fdf8f4,#f4eef8)",
    padding: "1.4rem 1rem 4rem",
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/gbl/raid" style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none" }}>← 레이드 딜러 티어</Link>
          <Link href="/gbl/raid/bosses" style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>🗓️ 지금 보스 · CP →</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>레이드 스케줄</h1>
        <p style={{ margin: "0.4rem 0 0.8rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          <b style={{ color: "#334155" }}>5성 전설·메가·섀도우 레이드</b> 로테이션과 <b style={{ color: "#334155" }}>레이드 아워·데이</b> 일정입니다. 날짜를 누르면 그날 레이드가 나오고, 보스를 누르면 CP·약점 딜러로 이동합니다.
        </p>

        {calEvents.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>
        ) : (
          <>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 12px 14px" }}>
              <RaidCalendar events={calEvents} today={today} />
            </div>

            {/* 로테이션 아젠다(기간) */}
            {rotations.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>🔥 보스 로테이션 기간</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rotations.map((e, i) => {
                    const live = now >= new Date(e.start).getTime() && now < new Date(e.end).getTime();
                    return (
                      <div key={i} style={{ background: CARD, border: `1px solid ${live ? "#86efac" : BORDER}`, borderRadius: 12, padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.66rem", fontWeight: 800, color: "#fff", background: live ? "#16a34a" : "#94a3b8", borderRadius: 8, padding: "2px 8px" }}>{live ? "진행 중" : "예정"}</span>
                          {e.variant && (() => { const rs = ROT_STYLE[e.variant]; return (
                            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: rs.c, background: rs.bg, border: `1px solid ${rs.c}44`, borderRadius: 8, padding: "2px 8px" }}>{rs.icon} {e.title}</span>
                          ); })()}
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>{fmtD(e.start)} ~ {fmtD(e.end)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {e.bosses.map((b, bi) => (
                            <Link key={bi} href={`/gbl/raid/bosses#b${b.dex}`} style={{ display: "flex", alignItems: "center", gap: 5, textDecoration: "none" }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={monSprite(b.ko, b.dex)} alt={b.ko} width={36} height={36} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
                              <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#3b5bdb" }}>{b.ko}{b.shiny ? " ✨" : ""}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 24, textAlign: "center", fontSize: "0.72rem", color: "#94a3b8" }}>
          일정 데이터: LeekDuck(ScrapedDuck) · 시간은 현지 기준 · <Link href="/gbl/raid" style={{ color: "#64748b", textDecoration: "none" }}>추천 딜러 티어표</Link>
        </div>
      </div>
    </div>
  );
}
