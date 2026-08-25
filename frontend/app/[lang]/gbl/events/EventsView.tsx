"use client";
// 이벤트 달력 클라이언트 뷰 — 유형 필터 + 진행중/예정 분리 + 알(부화) 섹션.
// ScrapedDuck 시간은 현지 벽시계(타임존 없음)라 클라이언트 Date로 비교(사용자 로컬=이벤트 로컬).
// 진행중/예정 판정은 하이드레이션 안전하게 마운트 후(now 설정) 수행.
import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { saveDataUrl, shareDataUrl } from "../raid/raidShareUtil";
import { track } from "../../../../lib/track";
import type { EventsDict } from "./dict";
import type { Locale } from "../../../../lib/i18n";

export type ViewEvent = {
  id: string; type: string; filterKey: string; emoji: string; name: string;
  start: string; end: string; link?: string; image?: string; spawns?: boolean; research?: boolean;
};
export type ViewEggMon = { name: string; dex: string; image: string; shiny: boolean; regional: boolean; gift: boolean };
export type ViewEgg = { dist: string; adventure: boolean; mons: ViewEggMon[] };

const CARD = "#ffffff", BORDER = "#e3e8f2", INK = "#0f172a", SUB = "#64748b";
const DAY = 86400000;

const tpl = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export default function EventsView({ events, eggs, t, filterTypes }: { events: ViewEvent[]; eggs: ViewEgg[]; t: EventsDict; lang: Locale; filterTypes: string[] }) {
  const [now, setNow] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  // 이번 주(지금~+7일) 활성/예정 '단기' 이벤트 — 공유 카드용.
  // 장기 캠페인(레고 2개월 등, 8일 초과)은 제외해 "이번 주"답게(스포트라이트·레이드아워·커뮤데이·맥스먼데이 등).
  const thisWeek = useMemo(() => {
    if (now == null) return [];
    return events
      .filter((e) => {
        const s = +new Date(e.start), en = +new Date(e.end);
        const durDays = (en - s) / DAY;
        return en > now && s < now + 7 * DAY && durDays <= 8;
      })
      .sort((a, b) => +new Date(a.start) - +new Date(b.start))
      .slice(0, 12);
  }, [events, now]);

  const shortDate = (e: ViewEvent) => { const s = new Date(e.start); return tpl(t.dateSingle, { m: s.getMonth() + 1, d: s.getDate(), w: t.weekdays[s.getDay()] }); };
  const weekRange = () => { if (now == null) return ""; const a = new Date(now), b = new Date(now + 6 * DAY); return `${a.getMonth() + 1}/${a.getDate()} ~ ${b.getMonth() + 1}/${b.getDate()}`; };

  const genImage = async () => toPng(shareRef.current!, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
  const doShare = async () => {
    if (!shareRef.current || busy) return; setBusy(true);
    track("share", "/gbl/events", "event-calendar");
    try { await shareDataUrl(await genImage(), null, "gbl-events.png", t.shareFileTitle, `${t.shareFileTitle} · gblnote.com`); }
    catch (e) { console.error(e); } finally { setBusy(false); }
  };
  const doSave = async () => {
    if (!shareRef.current || busy) return; setBusy(true);
    track("download", "/gbl/events", "event-calendar");
    try { saveDataUrl(await genImage(), "gbl-events.png"); }
    catch (e) { console.error(e); } finally { setBusy(false); }
  };

  // 데이터에 실제 존재하는 필터만 노출
  const availFilters = useMemo(() => filterTypes.filter((f) => events.some((e) => e.filterKey === f)), [events, filterTypes]);

  const shown = useMemo(() => (filter === "all" ? events : events.filter((e) => e.filterKey === filter)), [events, filter]);

  const fmt = (e: ViewEvent) => {
    const s = new Date(e.start), en = new Date(e.end);
    const sameDay = s.getFullYear() === en.getFullYear() && s.getMonth() === en.getMonth() && s.getDate() === en.getDate();
    const wd = (d: Date) => t.weekdays[d.getDay()];
    if (sameDay) {
      const date = tpl(t.dateSingle, { m: s.getMonth() + 1, d: s.getDate(), w: wd(s) });
      const time = tpl(t.timeRange, { h1: s.getHours(), mm1: String(s.getMinutes()).padStart(2, "0"), h2: en.getHours(), mm2: String(en.getMinutes()).padStart(2, "0") });
      return `${date} ${time}`;
    }
    return tpl(t.dateRange, { m1: s.getMonth() + 1, d1: s.getDate(), w1: wd(s), m2: en.getMonth() + 1, d2: en.getDate(), w2: wd(en) });
  };

  // 상태 계산(now 없으면 예정 취급 — 초기 렌더 결정적)
  const status = (e: ViewEvent): "live" | "upcoming" | "ended" => {
    if (now == null) return "upcoming";
    const s = new Date(e.start).getTime(), en = new Date(e.end).getTime();
    if (now >= en) return "ended";
    if (now >= s) return "live";
    return "upcoming";
  };
  const badge = (e: ViewEvent): string => {
    if (now == null) return "";
    const s = new Date(e.start).getTime(), en = new Date(e.end).getTime();
    if (now >= s && now < en) {
      const d = Math.ceil((en - now) / DAY);
      return d <= 1 ? t.endsToday : tpl(t.endsInDays, { n: d });
    }
    const d = Math.ceil((s - now) / DAY);
    return d <= 1 ? t.startsToday : tpl(t.startsInDays, { n: d });
  };

  const live = shown.filter((e) => status(e) === "live").sort((a, b) => +new Date(a.end) - +new Date(b.end));
  const upcoming = shown.filter((e) => status(e) === "upcoming").sort((a, b) => +new Date(a.start) - +new Date(b.start));

  const chip = (key: string, label: string) => (
    <button key={key} onClick={() => setFilter(key)}
      style={{ padding: "6px 12px", borderRadius: 999, border: filter === key ? "none" : `1px solid ${BORDER}`, cursor: "pointer",
        background: filter === key ? "#3b5bdb" : "#fff", color: filter === key ? "#fff" : SUB, fontSize: "0.82rem", fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </button>
  );

  const Card = ({ e }: { e: ViewEvent }) => {
    const isLive = status(e) === "live";
    const inner = (
      <div style={{ display: "flex", alignItems: "center", gap: 11, background: CARD, border: `1px solid ${isLive ? "#fecaca" : BORDER}`, borderLeft: `4px solid ${isLive ? "#ef4444" : "#3b5bdb"}`, borderRadius: 12, padding: "10px 12px" }}>
        <span style={{ fontSize: "1.7rem", width: 46, textAlign: "center", flexShrink: 0 }}>{e.emoji}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#3b5bdb" }}>{e.emoji} {t.evtType[e.type] || ""}</span>
            {e.spawns && <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#059669", background: "#d1fae5", borderRadius: 999, padding: "1px 6px" }}>{t.tagSpawns}</span>}
            {e.research && <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#7c3aed", background: "#ede9fe", borderRadius: 999, padding: "1px 6px" }}>{t.tagResearch}</span>}
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: INK, lineHeight: 1.3, margin: "2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
          <div style={{ fontSize: "0.76rem", color: SUB }}>{fmt(e)}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: isLive ? "#ef4444" : "#64748b" }}>{badge(e)}</div>
        </div>
      </div>
    );
    return inner;
  };

  return (
    <div>
      {/* 필터 */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 12 }}>
        {chip("all", t.filterAll)}
        {availFilters.map((f) => chip(f, t.evtType[f === "raid" ? "raid-battles" : f === "max" ? "max-battles" : f] || f))}
      </div>

      {/* 이번 주 이벤트 공유 */}
      {thisWeek.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button onClick={doShare} disabled={busy} style={{ flex: 1, padding: "11px 16px", borderRadius: 999, border: "none", background: busy ? "#cbd5e1" : "linear-gradient(90deg,#0891b2,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: "0.9rem", cursor: busy ? "default" : "pointer" }}>{busy ? t.building : t.shareBtn}</button>
          <button onClick={doSave} disabled={busy} style={{ padding: "11px 18px", borderRadius: 999, border: "none", background: busy ? "#cbd5e1" : "#334155", color: "#fff", fontWeight: 800, fontSize: "0.9rem", cursor: busy ? "default" : "pointer" }}>{t.saveBtn}</button>
        </div>
      )}

      {/* 진행 중 */}
      <h2 style={{ fontSize: "1rem", fontWeight: 900, color: INK, margin: "10px 0 8px" }}>{t.liveH}</h2>
      {live.length === 0
        ? <div style={{ fontSize: "0.82rem", color: "#94a3b8", padding: "0.4rem 0 0.8rem" }}>{t.emptyLive}</div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>{live.map((e) => <Card key={e.id} e={e} />)}</div>}

      {/* 예정 */}
      <h2 style={{ fontSize: "1rem", fontWeight: 900, color: INK, margin: "14px 0 8px" }}>{t.upcomingH}</h2>
      {upcoming.length === 0
        ? <div style={{ fontSize: "0.82rem", color: "#94a3b8", padding: "0.4rem 0" }}>{t.emptyUpcoming}</div>
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{upcoming.map((e) => <Card key={e.id} e={e} />)}</div>}

      {/* 부화 알 */}
      {eggs.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 900, color: INK, margin: "0 0 4px" }}>{t.eggH}</h2>
          <p style={{ fontSize: "0.78rem", color: SUB, margin: "0 0 10px" }}>{t.eggIntro}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {eggs.map((g) => (
              <div key={g.dist} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "#0891b2", marginBottom: 8 }}>{g.dist}{g.adventure ? " · " + t.eggAdventure : ""}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 8 }}>
                  {g.mons.map((m, i) => (
                    <div key={i} style={{ textAlign: "center", position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.image} alt="" width={44} height={44} style={{ objectFit: "contain" }} loading="lazy" />
                      {m.shiny && <span style={{ position: "absolute", top: -2, right: 8, fontSize: "0.7rem" }} title={t.eggShiny}>✨</span>}
                      <div style={{ fontSize: "0.66rem", color: INK, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                      {(m.regional || m.gift) && <div style={{ fontSize: "0.56rem", color: m.regional ? "#dc2626" : "#0891b2" }}>{m.regional ? t.eggRegional : t.eggGift}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 공유용 오프스크린 카드 (이모지+텍스트만 — CORS/스프라이트 없음) */}
      <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
        <div ref={shareRef} style={{ width: 540, background: "#fff", padding: "24px 26px", boxSizing: "border-box" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, color: INK }}>🗓️ {t.shareCardTitle}</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0891b2", marginTop: 2 }}>{t.shareCardWeek} · {weekRange()}</div>
          <div style={{ height: 2, background: "#e6ebf5", margin: "14px 0" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {thisWeek.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
                <span style={{ fontSize: "1.1rem", width: 24, textAlign: "center", flexShrink: 0 }}>{e.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: "0.96rem", fontWeight: 800, color: INK }}>{e.name}</span>
                  <span style={{ fontSize: "0.76rem", color: "#94a3b8", marginLeft: 6 }}>{t.evtType[e.type] || ""}</span>
                </div>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: SUB, flexShrink: 0 }}>{shortDate(e)}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 2, background: "#e6ebf5", margin: "16px 0 10px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gbl-icon.png" alt="" width={22} height={22} style={{ objectFit: "contain" }} />
            <span style={{ fontSize: "1rem", fontWeight: 900, color: "#1a2570" }}>gblnote.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
