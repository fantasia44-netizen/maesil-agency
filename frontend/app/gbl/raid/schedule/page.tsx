// 레이드 스케줄 — 서버렌더(ISR). ScrapedDuck(LeekDuck) events 오픈피드를 런타임 페치, 자동 갱신.
// 5성·메가·섀도우 로테이션(기간) + 레이드 아워 + 레이드 데이. PvP 시즌일정(/gbl/schedule)과 별개.
import Link from "next/link";
import type { Metadata } from "next";
import POKEDEX from "../../pokedex_ko.json";

export const revalidate = 21600; // 6시간

const KO = POKEDEX as Record<string, string>;

type Boss = { name: string; image: string; canBeShiny?: boolean };
type EventItem = {
  eventID: string; name: string; eventType: string;
  start: string; end: string; image?: string;
  extraData?: { raidbattles?: { bosses?: Boss[] } };
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
function bossKo(b: Boss): string {
  const dex = dexOf(b.image || "");
  let base = KO[dex] || b.name;
  if (/^Mega /.test(b.name)) base = "메가 " + base;
  if (/^Shadow /.test(b.name)) base = "섀도우 " + base;
  if (/Alola/i.test(b.name)) base = "알로라 " + base;
  if (/Galarian/i.test(b.name)) base = "가라르 " + base;
  if (/Hisui/i.test(b.name)) base = "히스이 " + base;
  return base;
}

const WD = ["일", "월", "화", "수", "목", "금", "토"];
function fmt(iso: string, withTime = false): string {
  const d = new Date(iso);
  const base = `${d.getMonth() + 1}.${d.getDate()}(${WD[d.getDay()]})`;
  if (!withTime) return base;
  return `${base} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export const metadata: Metadata = {
  title: "포켓몬고 레이드 스케줄 · 5성·메가 로테이션 일정 | GBL Note",
  description: "지금과 앞으로 열리는 포켓몬 GO 레이드 일정. 5성 전설·메가·섀도우 레이드 로테이션 기간, 레이드 아워·레이드 데이 날짜를 한눈에. 자동 업데이트.",
  keywords: ["포켓몬고 레이드 일정", "5성 레이드 로테이션", "메가 레이드 일정", "레이드 아워", "레이드 데이", "포켓몬고 레이드 스케줄"],
  alternates: { canonical: "/gbl/raid/schedule" },
  openGraph: { title: "포켓몬고 레이드 스케줄 (5성·메가 로테이션)", description: "레이드 로테이션 기간 + 레이드 아워·데이", url: "/gbl/raid/schedule", images: ["/gbl-og.png"], type: "website" },
};

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

export default async function RaidSchedulePage() {
  const events = await getEvents();
  const now = Date.now();
  const isRaidBattle = (e: EventItem) => e.eventType === "raid-battles";
  const rotations = events.filter(isRaidBattle)
    .filter((e) => new Date(e.end).getTime() > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const hours = events.filter((e) => e.eventType === "raid-hour" && new Date(e.end).getTime() > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const days = events.filter((e) => e.eventType === "raid-day" && new Date(e.end).getTime() > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const status = (e: EventItem) => {
    const s = new Date(e.start).getTime(), en = new Date(e.end).getTime();
    if (now < s) return { t: "예정", c: "#3b5bdb", bg: "#e8eeff" };
    if (now > en) return { t: "종료", c: "#94a3b8", bg: "#f1f5f9" };
    return { t: "진행 중", c: "#16a34a", bg: "#dcfce7" };
  };

  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #ffe3d1 0%, transparent 60%), linear-gradient(180deg,#fdf8f4,#f4eef8)",
    padding: "1.4rem 1rem 4rem",
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/gbl/raid" style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none" }}>← 레이드 딜러 티어</Link>
          <Link href="/gbl/raid/bosses" style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>🗓️ 지금 보스 · CP →</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          레이드 스케줄
        </h1>
        <p style={{ margin: "0.4rem 0 0.6rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          지금·앞으로 열리는 <b style={{ color: "#334155" }}>5성 전설·메가·섀도우 레이드</b> 로테이션과 <b style={{ color: "#334155" }}>레이드 아워·데이</b> 일정입니다. 자동 업데이트.
        </p>

        {rotations.length === 0 && hours.length === 0 && days.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>
        ) : (
          <>
            {/* 5성·메가·섀도우 로테이션 */}
            {rotations.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>🔥 레이드 보스 로테이션</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rotations.map((e) => {
                    const st = status(e);
                    const bosses = e.extraData?.raidbattles?.bosses || [];
                    return (
                      <div key={e.eventID} style={{ background: CARD, border: `1px solid ${st.t === "진행 중" ? "#86efac" : BORDER}`, borderRadius: 12, padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 800, color: st.c, background: st.bg, borderRadius: 8, padding: "2px 8px" }}>{st.t}</span>
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>{fmt(e.start)} ~ {fmt(e.end)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          {bosses.map((b, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={b.image} alt={bossKo(b)} width={38} height={38} style={{ objectFit: "contain" }} />
                              <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a" }}>{bossKo(b)}</span>
                              {b.canBeShiny && <span style={{ fontSize: "0.78rem" }} title="색이 다른 개체 가능">✨</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 8, fontSize: "0.74rem", color: "#94a3b8" }}>
                  지금 열린 보스의 <Link href="/gbl/raid/bosses" style={{ color: "#ea580c", fontWeight: 600 }}>100% CP·약점 딜러 보기 →</Link>
                </div>
              </div>
            )}

            {/* 레이드 아워 */}
            {hours.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>⏰ 레이드 아워</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {hours.map((e) => (
                    <div key={e.eventID} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#c2410c", whiteSpace: "nowrap" }}>{fmt(e.start, true)}</span>
                      <span style={{ fontSize: "0.84rem", color: "#334155" }}>{e.name.replace(/ Raid Hour$/, "")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 레이드 데이 */}
            {days.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>🎉 레이드 데이</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {days.map((e) => (
                    <div key={e.eventID} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#7c3aed", whiteSpace: "nowrap" }}>{fmt(e.start)}</span>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{fmt(e.start, true).split(" ")[1]}~{fmt(e.end, true).split(" ")[1]}</span>
                      <span style={{ fontSize: "0.84rem", color: "#334155" }}>{e.name}</span>
                    </div>
                  ))}
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
