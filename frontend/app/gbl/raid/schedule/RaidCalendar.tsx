"use client";
import { useState } from "react";
import Link from "next/link";

export type CalBoss = { ko: string; dex: string; image: string; shiny: boolean };
export type RotVariant = "star" | "shadow" | "mega";
export type CalEvent = {
  kind: "rotation" | "hour" | "day";
  variant?: RotVariant;
  title: string;
  start: string; // ISO
  end: string;
  bosses: CalBoss[];
};

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const ROT: Record<RotVariant, { icon: string; label: string; c: string; bg: string }> = {
  star: { icon: "⭐", label: "5성 레전드", c: "#dc2626", bg: "#fee2e2" },
  shadow: { icon: "🌑", label: "그림자 5성", c: "#4b0082", bg: "#ede9fe" },
  mega: { icon: "🔷", label: "메가", c: "#7c3aed", bg: "#f3e8ff" },
};
const KIND = {
  hour: { icon: "⏰", label: "레이드 아워", c: "#c2410c", bg: "#ffedd5" },
  day: { icon: "🎉", label: "레이드 데이", c: "#7c3aed", bg: "#f3e8ff" },
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  return ymd(d);
}
function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function RaidCalendar({ events, today }: { events: CalEvent[]; today: string }) {
  const [y0, m0] = today.split("-").map(Number);
  const [cur, setCur] = useState({ y: y0, m: m0 }); // m: 1-12
  const [sel, setSel] = useState<string | null>(today);

  // 특정 날짜에 걸리는 이벤트
  const eventsOn = (dayKey: string): CalEvent[] => {
    const t = new Date(dayKey + "T12:00:00").getTime();
    return events.filter((e) => {
      const s = new Date(e.start).getTime(), en = new Date(e.end).getTime();
      if (e.kind === "rotation") return t >= new Date(dayKeyOf(e.start) + "T00:00:00").getTime() && t < en;
      return dayKeyOf(e.start) === dayKey || (t >= s && t <= en);
    });
  };

  // 달력 그리드
  const first = new Date(cur.y, cur.m - 1, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(cur.y, cur.m, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(ymd(new Date(cur.y, cur.m - 1, d)));
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) => {
    const d = new Date(cur.y, cur.m - 1 + delta, 1);
    setCur({ y: d.getFullYear(), m: d.getMonth() + 1 });
  };

  const CARD = "#ffffff", BORDER = "#e3e8f2";
  const selEvents = sel ? eventsOn(sel) : [];

  return (
    <div>
      {/* 월 네비 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => shift(-1)} style={{ border: `1px solid ${BORDER}`, background: CARD, borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: "0.9rem", color: "#475569" }}>‹</button>
        <span style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{cur.y}년 {cur.m}월</span>
        <button onClick={() => shift(1)} style={{ border: `1px solid ${BORDER}`, background: CARD, borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: "0.9rem", color: "#475569" }}>›</button>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
        {WD.map((w, i) => (
          <div key={w} style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 700, color: i === 0 ? "#dc2626" : i === 6 ? "#3b5bdb" : "#94a3b8" }}>{w}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {cells.map((dk, i) => {
          if (!dk) return <div key={i} />;
          const evs = eventsOn(dk);
          const isToday = dk === today;
          const isSel = dk === sel;
          const day = Number(dk.split("-")[2]);
          const hasHour = evs.some((e) => e.kind === "hour");
          const hasDay = evs.some((e) => e.kind === "day");
          const rots = evs.filter((e) => e.kind === "rotation");
          const star = rots.find((e) => e.variant === "star");
          const mega = rots.find((e) => e.variant === "mega");
          const shadow = rots.find((e) => e.variant === "shadow");
          const main = (star || mega || shadow)?.bosses[0];
          const inRot = rots.length > 0;
          return (
            <button key={i} onClick={() => setSel(dk)}
              style={{
                minHeight: 58, borderRadius: 8, cursor: "pointer", padding: "2px 0", position: "relative", overflow: "hidden",
                border: isSel ? "2px solid #ea580c" : `1px solid ${isToday ? "#fdba74" : BORDER}`,
                background: inRot ? "#fffaf5" : CARD,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
              }}>
              <span style={{ fontSize: "0.66rem", fontWeight: isToday ? 800 : 600, color: isToday ? "#ea580c" : "#94a3b8", lineHeight: 1.2 }}>{day}</span>
              {main ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={main.image} alt="" width={26} height={26} style={{ objectFit: "contain", marginTop: -1 }} />
              ) : <span style={{ height: 26 }} />}
              <span style={{ display: "flex", gap: 2, alignItems: "center", height: 10, lineHeight: 1 }}>
                {mega && <span style={{ fontSize: "0.52rem" }}>🔷</span>}
                {shadow && <span style={{ fontSize: "0.52rem" }}>🌑</span>}
                {hasDay && <span style={{ fontSize: "0.52rem" }}>🎉</span>}
                {hasHour && <span style={{ fontSize: "0.52rem" }}>⏰</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: "0.66rem", color: "#94a3b8", flexWrap: "wrap", alignItems: "center" }}>
        <span>🖼️ 날짜 그림 = 5성 전설</span><span>🔷 메가</span><span>🌑 그림자</span><span>🎉 레이드 데이</span><span>⏰ 레이드 아워</span>
      </div>

      {/* 선택한 날 상세 */}
      {sel && (
        <div style={{ marginTop: 14, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ fontSize: "0.86rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
            {Number(sel.split("-")[1])}월 {Number(sel.split("-")[2])}일 ({WD[new Date(sel + "T12:00:00").getDay()]}) 레이드
          </div>
          {selEvents.length === 0 ? (
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>이 날 특별 레이드 일정이 없습니다.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selEvents.map((e, idx) => {
                const k = e.kind === "rotation" && e.variant ? ROT[e.variant] : KIND[e.kind as "hour" | "day"];
                return (
                  <div key={idx}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.66rem", fontWeight: 800, color: "#fff", background: k.c, borderRadius: 6, padding: "1px 7px" }}>{k.icon} {k.label}</span>
                      {e.kind !== "rotation" && <span style={{ fontSize: "0.74rem", color: "#64748b" }}>{fmtTime(e.start)}~{fmtTime(e.end)}</span>}
                      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>{e.title}</span>
                    </div>
                    {e.bosses.length > 0 && (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingLeft: 4 }}>
                        {e.bosses.map((b, bi) => (
                          <Link key={bi} href={`/gbl/raid/bosses#b${b.dex}`} style={{ display: "flex", alignItems: "center", gap: 5, textDecoration: "none" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={b.image} alt={b.ko} width={34} height={34} style={{ objectFit: "contain" }} />
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#3b5bdb" }}>{b.ko}{b.shiny ? " ✨" : ""}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>보스를 누르면 100% CP·약점 딜러를 볼 수 있어요.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
