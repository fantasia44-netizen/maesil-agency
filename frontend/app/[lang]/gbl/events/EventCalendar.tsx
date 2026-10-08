"use client";
// 이벤트 월 달력 — 레이드 달력(raid/schedule/RaidCalendar)과 같은 밴드+배지 구조를 이벤트 피드에 적용.
//
// 피드가 난잡한 이유: 한 달에 37건이 들어오는데 성격이 완전히 다르다. 시즌(84일)·GO 패스(28일)·
// 장기 리서치(112일)는 달의 모든 칸을 덮고, 스포트라이트/레이드 아워는 매주 1시간씩 쌓인다.
// 그래서 **유형이 아니라 기간**으로 갈라 배치한다:
//   · 14일 초과  → 달력 밖 "상시 진행" 줄 (칸을 먹지 않음)
//   ·  1~14일    → 가로 밴드 (레인 패킹)
//   ·  1일 이하  → 날짜 칸 이모지 배지 (클릭 → 하단 상세)
// 타임존: ssr:false로 마운트되므로 로컬 Date를 그대로 써도 하이드레이션 불일치가 없다.
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { saveDataUrl, shareDataUrl } from "../raid/raidShareUtil";
import { track } from "../../../../lib/track";
import EventExtras from "./EventExtras";
import type { EventsDict } from "./dict";
import type { ViewEvent } from "./EventsView";

const DAY = 86400000;
const LONG_DAYS = 14; // 이보다 길면 달력 밴드가 아니라 "상시 진행" 줄로
const CARD = "#ffffff", BORDER = "#e3e8f2", INK = "#0f172a", SUB = "#64748b";

// 필터 버킷별 색 — 밴드/배지/상세에서 같은 색을 쓴다.
const HUE: Record<string, { c: string; bg: string }> = {
  "community-day": { c: "#d97706", bg: "#fef3c7" },
  "pokemon-spotlight-hour": { c: "#0891b2", bg: "#cffafe" },
  raid: { c: "#ea580c", bg: "#ffedd5" },
  max: { c: "#dc2626", bg: "#fee2e2" },
  event: { c: "#3b5bdb", bg: "#e0e7ff" },
  research: { c: "#7c3aed", bg: "#ede9fe" },
};
const hueOf = (k: string) => HUE[k] || { c: "#64748b", bg: "#f1f5f9" };

const tpl = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayKeyOf = (iso: string) => ymd(new Date(iso));
const durDays = (e: ViewEvent) => (+new Date(e.end) - +new Date(e.start)) / DAY;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

type Band = { e: ViewEvent; sc: number; ec: number; lane: number; startsHere: boolean; endsHere: boolean };

export default function EventCalendar({ events, t }: { events: ViewEvent[]; t: EventsDict }) {
  const now = useRef(Date.now()).current;
  const today = ymd(new Date(now));
  const [y0, m0] = [new Date(now).getFullYear(), new Date(now).getMonth() + 1];
  const [cur, setCur] = useState({ y: y0, m: m0 });
  const [sel, setSel] = useState<string | null>(today);
  const [busy, setBusy] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  const monthName = (m: number) => t.months[m - 1] || String(m);

  // 기간으로 3분류
  const { bandEvents, dayEvents, ongoing } = useMemo(() => {
    const b: ViewEvent[] = [], d: ViewEvent[] = [], o: ViewEvent[] = [];
    for (const e of events) {
      const n = durDays(e);
      if (n > LONG_DAYS) o.push(e);
      else if (n > 1) b.push(e);
      else d.push(e);
    }
    return { bandEvents: b, dayEvents: d, ongoing: o };
  }, [events]);

  // 날짜 칸 그리드
  const { weeks, mStart, mEnd } = useMemo(() => {
    const first = new Date(cur.y, cur.m - 1, 1);
    const daysInMonth = new Date(cur.y, cur.m, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(ymd(new Date(cur.y, cur.m - 1, d)));
    while (cells.length % 7 !== 0) cells.push(null);
    const w: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7));
    return { weeks: w, mStart: +new Date(cur.y, cur.m - 1, 1), mEnd: +new Date(cur.y, cur.m, 1) };
  }, [cur]);

  // 그 날에 걸리는지 — 종일 판정은 날짜 단위(시작일 00:00 ~ 종료 시각)
  const coversDay = (e: ViewEvent, dayKey: string) => {
    const noon = +new Date(dayKey + "T12:00:00");
    return noon >= +new Date(dayKeyOf(e.start) + "T00:00:00") && noon < +new Date(e.end);
  };
  const dayEventsOn = (dayKey: string) => dayEvents.filter((e) => dayKeyOf(e.start) === dayKey);

  // 주별 밴드 레인 패킹 — 유형 구분 없이 안 겹치는 것부터 같은 줄에(최소 레인).
  const bandsOfWeek = (wk: (string | null)[]): Band[] => {
    const raw: Band[] = [];
    for (const e of bandEvents) {
      let sc = -1, ec = -1;
      wk.forEach((dk, col) => { if (dk && coversDay(e, dk)) { if (sc < 0) sc = col; ec = col; } });
      if (sc < 0) continue;
      const shift = (dk: string, n: number) => ymd(new Date(+new Date(dk + "T12:00:00") + n * DAY));
      raw.push({ e, sc, ec, lane: 0, startsHere: !coversDay(e, shift(wk[sc]!, -1)), endsHere: !coversDay(e, shift(wk[ec]!, 1)) });
    }
    raw.sort((a, b) => a.sc - b.sc || b.ec - a.ec);
    const laneEnds: number[] = [];
    for (const b of raw) {
      let i = laneEnds.findIndex((ec) => ec < b.sc);
      if (i < 0) { i = laneEnds.length; laneEnds.push(b.ec); } else laneEnds[i] = b.ec;
      b.lane = i;
    }
    return raw;
  };

  const shift = (delta: number) => {
    const d = new Date(cur.y, cur.m - 1 + delta, 1);
    setCur({ y: d.getFullYear(), m: d.getMonth() + 1 });
    setSel(null);
  };

  // 이 달에 걸치는 상시 이벤트만
  const monthOngoing = ongoing.filter((e) => +new Date(e.start) < mEnd && +new Date(e.end) >= mStart)
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));

  // 선택일 상세 — 밴드(진행 중) + 그날 단기 이벤트
  const selList = useMemo(() => {
    if (!sel) return [];
    const inBand = bandEvents.filter((e) => coversDay(e, sel));
    return [...dayEventsOn(sel), ...inBand].sort((a, b) => +new Date(a.start) - +new Date(b.start));
  }, [sel, bandEvents, dayEvents]);  // eslint-disable-line react-hooks/exhaustive-deps

  const rangeLabel = (e: ViewEvent) => {
    const s = new Date(e.start), en = new Date(e.end);
    const same = s.toDateString() === en.toDateString();
    const wd = (d: Date) => t.weekdays[d.getDay()];
    if (same) return `${tpl(t.dateSingle, { m: s.getMonth() + 1, d: s.getDate(), w: wd(s) })} ${tpl(t.timeRange, { h1: s.getHours(), mm1: String(s.getMinutes()).padStart(2, "0"), h2: en.getHours(), mm2: String(en.getMinutes()).padStart(2, "0") })}`;
    return tpl(t.dateRange, { m1: s.getMonth() + 1, d1: s.getDate(), w1: wd(s), m2: en.getMonth() + 1, d2: en.getDate(), w2: wd(en) });
  };

  const genImage = async () => toPng(shareRef.current!, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
  const doSave = async () => {
    if (!shareRef.current || busy) return; setBusy(true);
    track("download", "/gbl/events", "event-calendar-month");
    try { saveDataUrl(await genImage(), `gbl-events-${cur.y}-${String(cur.m).padStart(2, "0")}.png`); }
    catch (e) { console.error(e); } finally { setBusy(false); }
  };
  const doShare = async () => {
    if (!shareRef.current || busy) return; setBusy(true);
    track("share", "/gbl/events", "event-calendar-month");
    try { await shareDataUrl(await genImage(), null, `gbl-events-${cur.y}-${String(cur.m).padStart(2, "0")}.png`, tpl(t.calTitle, { y: cur.y, m: cur.m, month: monthName(cur.m) }), `${t.shareFileTitle} · gblnote.com`); }
    catch (e) { console.error(e); } finally { setBusy(false); }
  };

  // ── 그리드(화면·이미지 공용) ──
  const Grid = ({ forImage }: { forImage?: boolean }) => {
    const DNUM_H = forImage ? 22 : 20, BAND_H = forImage ? 22 : 21, BADGE_H = forImage ? 22 : 20, MIN_H = forImage ? 54 : 48;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {weeks.map((wk, wi) => {
          const bands = bandsOfWeek(wk);
          const laneN = bands.length ? Math.max(...bands.map((b) => b.lane)) + 1 : 0;
          // 배지는 밴드 레인 "아래" 전용 줄에 둔다(겹쳐 보이지 않게) → 행 높이에 배지 줄도 포함.
          const badgeTop = DNUM_H + laneN * BAND_H;
          const rowH = Math.max(MIN_H, badgeTop + BADGE_H + 2);
          return (
            <div key={wi} style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
              {wk.map((dk, col) => {
                if (!dk) return <div key={col} style={{ minHeight: rowH, borderRadius: 9, background: "rgba(0,0,0,.015)" }} />;
                const evs = dayEventsOn(dk);
                const isToday = dk === today, isSel = !forImage && dk === sel;
                const day = Number(dk.split("-")[2]);
                const wdow = new Date(dk + "T12:00:00").getDay();
                const clickable = !forImage;
                return (
                  <div key={col} onClick={clickable ? () => setSel(dk) : undefined}
                    style={{
                      minHeight: rowH, borderRadius: 9, position: "relative", overflow: "hidden", cursor: clickable ? "pointer" : "default",
                      border: isSel ? "2px solid #3b5bdb" : isToday ? "1.5px solid #60a5fa" : `1px solid ${BORDER}`,
                      background: isToday ? "linear-gradient(180deg,#eff6ff,#ffffff 60%)" : CARD,
                      boxShadow: isSel ? "0 6px 16px -8px rgba(59,91,219,.5)" : "none",
                    }}>
                    {isToday ? (
                      <span style={{ position: "absolute", top: 3, left: 4, zIndex: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 16, height: 16, padding: "0 3px", borderRadius: 999, background: "#3b5bdb", color: "#fff", fontSize: "0.62rem", fontWeight: 900, lineHeight: 1 }}>{day}</span>
                    ) : (
                      <span style={{ position: "absolute", top: 4, left: 6, zIndex: 3, fontSize: "0.64rem", fontWeight: 700, lineHeight: 1, color: wdow === 0 ? "#f87171" : wdow === 6 ? "#93c5fd" : "#94a3b8" }}>{day}</span>
                    )}
                    {evs.length > 0 && (
                      <span style={{ position: "absolute", top: badgeTop, left: 0, right: 0, zIndex: 7, display: "flex", justifyContent: "center", gap: 1, lineHeight: 1 }}>
                        {evs.slice(0, 3).map((e) => (
                          <span key={e.id} title={e.name} style={{ fontSize: "0.86rem" }}>{e.emoji}</span>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
              {bands.map((b, bi) => {
                const h = hueOf(b.e.filterKey), r = 7;
                return (
                  <div key={bi} style={{
                    position: "absolute", top: DNUM_H + b.lane * BAND_H, height: BAND_H - 4,
                    left: `calc(${(b.sc / 7) * 100}% + ${b.startsHere ? 3 : 0}px)`,
                    width: `calc(${((b.ec - b.sc + 1) / 7) * 100}% - ${(b.startsHere ? 3 : 0) + (b.endsHere ? 3 : 0)}px)`,
                    background: h.bg, border: `1px solid ${h.c}40`, borderLeft: b.startsHere ? `3px solid ${h.c}` : `1px solid ${h.c}40`,
                    borderTopLeftRadius: b.startsHere ? r : 0, borderBottomLeftRadius: b.startsHere ? r : 0,
                    borderTopRightRadius: b.endsHere ? r : 0, borderBottomRightRadius: b.endsHere ? r : 0,
                    display: "flex", alignItems: "center", gap: 4, padding: "0 6px", overflow: "hidden", pointerEvents: "none", zIndex: 1,
                  }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 800, color: h.c, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {b.startsHere ? `${b.e.emoji} ${chipLabel(b.e.name)}` : chipLabel(b.e.name)}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const WdayRow = () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 3 }}>
      {t.weekdays.map((w, i) => (
        <div key={w} style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 700, color: i === 0 ? "#dc2626" : i === 6 ? "#3b5bdb" : "#94a3b8" }}>{w}</div>
      ))}
    </div>
  );

  // 다음 달 미리보기 — 달력 기본이 이번 달이라 11월 와일드 에어리어 같은 게 안 보인다는 지적.
  // 매주 반복(스포트라이트·레이드 아워·맥스 먼데이)은 빼고 "새로운 것"만 칩으로, 누르면 그 달·그 날로 이동.
  const RECURRING = new Set(["pokemon-spotlight-hour", "raid-hour", "max-mondays"]);
  const nextMonth = cur.m === 12 ? { y: cur.y + 1, m: 1 } : { y: cur.y, m: cur.m + 1 };
  const nStart = +new Date(nextMonth.y, nextMonth.m - 1, 1), nEnd = +new Date(nextMonth.y, nextMonth.m, 1);
  const nextList = [...bandEvents, ...dayEvents]
    .filter((e) => !RECURRING.has(e.type) && +new Date(e.start) >= nStart && +new Date(e.start) < nEnd)
    .sort((a2, b2) => +new Date(a2.start) - +new Date(b2.start))
    .slice(0, 6);
  const jumpTo = (e: ViewEvent) => { setCur(nextMonth); setSel(dayKeyOf(e.start)); };
  // 칩 라벨 — 게임명 접두와 연도를 떼서 "구분되는 부분"이 말줄임에 먹히지 않게.
  // ("포켓몬 GO 와일드 에어리어 2026: 센다이 • 도호쿠" → "와일드 에어리어: 센다이 • 도호쿠")
  const chipLabel = (n: string) =>
    n.replace(/^(포켓몬 GO|Pokémon GO|ポケモンGO|寶可夢GO)\s*/, "")
      .replace(/\s*\b20\d\d\b/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  const NextPreview = () => {
    if (nextList.length === 0) return null;
    return (
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${BORDER}` }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 800, color: SUB, marginBottom: 5 }}>
          {tpl(t.calNextH, { month: monthName(nextMonth.m), m: nextMonth.m, y: nextMonth.y })}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {nextList.map((e) => {
            const h = hueOf(e.filterKey), d = new Date(e.start);
            return (
              <button key={e.id} onClick={() => jumpTo(e)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#fff", border: `1px solid ${h.c}40`, borderLeft: `3px solid ${h.c}`,
                  borderRadius: 8, padding: "4px 9px", cursor: "pointer", fontSize: "0.73rem", fontWeight: 700, color: "#334155" }}>
                <span>{e.emoji}</span>
                <span style={{ color: h.c, fontWeight: 800 }}>{d.getMonth() + 1}/{d.getDate()}</span>
                <span style={{ maxWidth: 210, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chipLabel(e.name)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // 이모지 범례 — 이번 달에 실제로 쓰인 유형만. 칸의 이모지가 뭘 뜻하는지 바로 읽히게(달력의 핵심 난점).
  const TypeLegend = () => {
    const seen: { emoji: string; label: string; c: string }[] = [];
    for (const e of [...dayEvents, ...bandEvents]) {
      if (+new Date(e.start) >= mEnd || +new Date(e.end) < mStart) continue;
      const label = t.evtType[e.type] || e.type;
      if (seen.some((x) => x.label === label)) continue;
      seen.push({ emoji: e.emoji, label, c: hueOf(e.filterKey).c });
    }
    if (seen.length === 0) return null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: 7 }}>
        {seen.map((x) => (
          <span key={x.label} style={{ fontSize: "0.68rem", fontWeight: 700, color: x.c, whiteSpace: "nowrap" }}>{x.emoji} {x.label}</span>
        ))}
      </div>
    );
  };

  const OngoingStrip = ({ forImage }: { forImage?: boolean }) => {
    if (monthOngoing.length === 0) return null;
    return (
      <div style={{ marginBottom: forImage ? 12 : 10 }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 800, color: SUB, marginBottom: 4 }}>{t.calOngoingH}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {monthOngoing.map((e) => {
            const h = hueOf(e.filterKey);
            const en = new Date(e.end);
            return (
              <span key={e.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: h.bg, border: `1px solid ${h.c}40`, borderRadius: 999, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700, color: h.c }}>
                {e.emoji} {e.name}
                <span style={{ color: SUB, fontWeight: 600 }}>~{en.getMonth() + 1}/{en.getDate()}</span>
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 22 }}>
      {/* 월 네비 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => shift(-1)} aria-label="prev" style={{ border: `1px solid ${BORDER}`, background: CARD, borderRadius: "50%", width: 34, height: 34, cursor: "pointer", fontSize: "1.05rem", color: "#3b5bdb", fontWeight: 800, lineHeight: 1 }}>‹</button>
        <span style={{ fontSize: "1.14rem", fontWeight: 900, color: INK }}>{tpl(t.calTitle, { y: cur.y, m: cur.m, month: monthName(cur.m) })}</span>
        <button onClick={() => shift(1)} aria-label="next" style={{ border: `1px solid ${BORDER}`, background: CARD, borderRadius: "50%", width: 34, height: 34, cursor: "pointer", fontSize: "1.05rem", color: "#3b5bdb", fontWeight: 800, lineHeight: 1 }}>›</button>
      </div>

      {/* 달력 이미지 공유·저장 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={doShare} disabled={busy} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer", fontWeight: 800, fontSize: "0.88rem", background: busy ? "#cbd5e1" : "linear-gradient(90deg,#0891b2,#3b5bdb)", color: "#fff" }}>
          {busy ? t.building : tpl(t.calShareBtn, { m: cur.m, month: monthName(cur.m) })}
        </button>
        <button onClick={doSave} disabled={busy} style={{ padding: "10px 16px", borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer", fontWeight: 800, fontSize: "0.88rem", background: busy ? "#cbd5e1" : "#334155", color: "#fff" }}>{t.saveBtn}</button>
      </div>

      <OngoingStrip />
      <WdayRow />
      <Grid />

      {/* 범례 — 유형 이모지 + 읽는 법 */}
      <TypeLegend />
      <div style={{ display: "flex", gap: 9, marginTop: 5, fontSize: "0.64rem", color: "#94a3b8", flexWrap: "wrap" }}>
        <span>{t.calLegendBand}</span><span>{t.calLegendBadge}</span><span>{t.calLegendOngoing}</span>
      </div>

      <NextPreview />

      {/* 선택일 상세 */}
      {sel && (
        <div style={{ marginTop: 14, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "11px 13px" }}>
          <div style={{ fontSize: "0.88rem", fontWeight: 900, color: INK, marginBottom: selList.length ? 9 : 0 }}>
            {(() => { const d = new Date(sel + "T12:00:00"); return tpl(t.dateSingle, { m: d.getMonth() + 1, d: d.getDate(), w: t.weekdays[d.getDay()] }); })()}
          </div>
          {selList.length === 0 ? (
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>{t.calNoEvent}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {selList.map((e) => {
                const h = hueOf(e.filterKey);
                return (
                  <div key={e.id} style={{ display: "flex", gap: 9, borderLeft: `3px solid ${h.c}`, paddingLeft: 9 }}>
                    <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{e.emoji}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 800, color: h.c }}>{t.evtType[e.type] || ""}</div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 800, color: INK, lineHeight: 1.3 }}>{e.name}</div>
                      <div style={{ fontSize: "0.74rem", color: SUB }}>{rangeLabel(e)}</div>
                      <EventExtras e={e} t={t} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 공유용 오프스크린 카드 — 스프라이트 없이 이모지·텍스트만(CORS 무관) */}
      <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
        <div ref={shareRef} style={{ width: 620, background: "#fff", padding: "22px 24px", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: "1.45rem", fontWeight: 900, color: INK }}>🗓️ {tpl(t.calTitle, { y: cur.y, m: cur.m, month: monthName(cur.m) })}</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0891b2" }}>{t.calShareSub}</span>
          </div>
          <OngoingStrip forImage />
          <WdayRow />
          <Grid forImage />
          <TypeLegend />
          <div style={{ height: 2, background: "#e6ebf5", margin: "12px 0 9px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gbl-icon.png" alt="" width={20} height={20} style={{ objectFit: "contain" }} />
            <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#1a2570" }}>gblnote.com</span>
            <span style={{ marginLeft: "auto", fontSize: "0.68rem", color: "#94a3b8" }}>{t.footerData.replace(/ · $/, "")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
