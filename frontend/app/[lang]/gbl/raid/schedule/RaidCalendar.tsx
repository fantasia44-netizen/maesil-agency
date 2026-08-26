"use client";
import { useState } from "react";
import { track } from "../../../../../lib/track";
import { monSprite, formDex } from "../../sprite";
import { loadLogo, drawBrandFooter } from "../raidShareUtil";
import ShareModal from "../../ShareModal";
import CpTable from "../bosses/CpTable";
import STATSJSON from "../../pokedex_stats.json";
import EventBrochure from "./EventBrochure";
import { brochureFor, BROCHURES, type Brochure } from "./eventBrochures";
import { isLocale, defaultLocale, type Locale } from "../../../../../lib/i18n";
import type { ScheduleDict } from "./dict";

const STATS = STATSJSON as Record<string, { a: number; d: number; s: number }>;
const CPM_L20 = 0.5974, CPM_L25 = 0.667934;
function cpAt(st: { a: number; d: number; s: number }, iv: number[], cpm: number): number {
  return Math.max(10, Math.floor((st.a + iv[0]) * Math.sqrt(st.d + iv[1]) * Math.sqrt(st.s + iv[2]) * cpm * cpm / 10));
}

export type CalBoss = { ko: string; name: string; dex: string; image: string; shiny: boolean };
export type RotVariant = "star" | "shadow" | "mega";
export type CalEvent = {
  kind: "rotation" | "hour" | "day";
  variant?: RotVariant;
  title: string;
  guide?: string;   // 레이드 아워·데이 타입별 상세 안내
  start: string; // ISO
  end: string;
  bosses: CalBoss[];
};

// 템플릿 치환({y}/{m}/{d}/{w}/{month})
function tpl(s: string, v: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? String(v[k]) : `{${k}}`));
}

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

export type MajorEvent = { eventType: string; emoji: string; name: string; start: string; end: string };

export default function RaidCalendar({ events, majorEvents, today, t, lang: langProp }: { events: CalEvent[]; majorEvents: MajorEvent[]; today: string; t: ScheduleDict; lang?: string }) {
  const lang: Locale = langProp && isLocale(langProp) ? langProp : defaultLocale;
  const WD = t.weekdays;
  const ROT: Record<RotVariant, { icon: string; label: string; c: string; bg: string }> = {
    star: { icon: "⭐", label: t.rotStar, c: "#dc2626", bg: "#fee2e2" },
    shadow: { icon: "🌑", label: t.rotShadow, c: "#4b0082", bg: "#ede9fe" },
    mega: { icon: "🔷", label: t.rotMega, c: "#7c3aed", bg: "#f3e8ff" },
  };
  const KIND = {
    hour: { icon: "⏰", label: t.kindHour, c: "#c2410c", bg: "#ffedd5" },
    day: { icon: "🎉", label: t.kindDay, c: "#7c3aed", bg: "#f3e8ff" },
  };

  const [y0, m0] = today.split("-").map(Number);
  const [cur, setCur] = useState({ y: y0, m: m0 }); // m: 1-12
  const [sel, setSel] = useState<string | null>(today);
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [cpBoss, setCpBoss] = useState<CalBoss | null>(null); // 클릭한 보스의 CP표 모달
  const [brochure, setBrochure] = useState<Brochure | null>(null); // 이벤트 브로마이드 팝업(수동 클릭). 자동팝업은 gbl 레이아웃의 EventPopupAuto가 담당.

  const monthName = (m: number) => t.months[m - 1] || String(m);
  const imgFileName = (m: number) => tpl(t.imgFile, { m });

  // 특정 날짜에 걸리는 이벤트
  const eventsOn = (dayKey: string): CalEvent[] => {
    const t2 = new Date(dayKey + "T12:00:00").getTime();
    return events.filter((e) => {
      const s = new Date(e.start).getTime(), en = new Date(e.end).getTime();
      if (e.kind === "rotation") return t2 >= new Date(dayKeyOf(e.start) + "T00:00:00").getTime() && t2 < en;
      return dayKeyOf(e.start) === dayKey || (t2 >= s && t2 <= en);
    });
  };

  // 달력을 이미지로 그려 저장/공유 (출처 gblnote.com). PokeAPI 스프라이트(CORS 허용)로 캔버스 오염 방지.
  const buildImage = async () => {
    setBusy(true);
    try {
      // 주별 로테이션 밴드 + 가변 행높이(페이지와 동일: 5성→메가→그림자 레인)
      const weekBands = weeks.map(bandsOfWeek);
      const DNUM_H_C = 30, BAND_H_C = 37, MIN_CELL_H = 80;
      const laneCount = (b: typeof weekBands[number]) => (b.length ? Math.max(...b.map((x) => x.lane)) + 1 : 0);
      const rowHeights = weekBands.map((b) => Math.max(MIN_CELL_H, DNUM_H_C + laneCount(b) * BAND_H_C + 12));

      // 밴드 보스 스프라이트 수집(폼 반영)
      const dexSet = new Set<string>();
      weekBands.forEach((bands) => bands.forEach((b) => b.e.bosses.slice(0, 3).forEach((boss) => { if (boss?.dex) dexSet.add(String(formDex(boss.ko, Number(boss.dex)))); })));
      const imgs: Record<string, HTMLImageElement> = {};
      const logoP = loadLogo();
      await Promise.all([...dexSet].map((dex) => new Promise<void>((res) => {
        const im = new Image(); im.crossOrigin = "anonymous";
        im.onload = () => { imgs[dex] = im; res(); }; im.onerror = () => res();
        im.src = `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${dex}.png`;
      })));
      const logo = await logoP;

      const W = 1080, gx = 30, gw = W - 60, cw = gw / 7;
      const HEADER_H = 148, WDAY_Y = HEADER_H + 30, GRID_TOP = HEADER_H + 56;
      const gridH = rowHeights.reduce((a, b) => a + b, 0);
      const LEGEND_H = 82, footH = 150;
      const H = GRID_TOP + gridH + LEGEND_H + footH;

      const SCALE = 2;   // 공유 시 재압축(카톡 등) 대비 고해상도 렌더(2160px)
      const c = document.createElement("canvas"); c.width = W * SCALE; c.height = H * SCALE;
      const ctx = c.getContext("2d"); if (!ctx) { setBusy(false); return; }
      ctx.scale(SCALE, SCALE);
      ctx.fillStyle = "#fbf7f3"; ctx.fillRect(0, 0, W, H);

      // 헤더
      ctx.textAlign = "left"; ctx.fillStyle = "#0f172a"; ctx.font = "900 66px system-ui, sans-serif";
      ctx.fillText(tpl(t.imgTitle, { m: cur.m, month: monthName(cur.m) }), 40, 96);
      ctx.textAlign = "right"; ctx.fillStyle = "#f97316"; ctx.font = "800 40px system-ui, sans-serif";
      ctx.fillText(`${cur.y}`, W - 40, 92);
      // 요일
      ctx.textAlign = "center"; ctx.font = "800 30px system-ui, sans-serif";
      WD.forEach((w, i) => { ctx.fillStyle = i === 0 ? "#dc2626" : i === 6 ? "#3b5bdb" : "#64748b"; ctx.fillText(w, gx + cw * i + cw / 2, WDAY_Y); });

      // 텍스트 말줄임(현재 폰트 기준)
      const fit = (text: string, maxW: number) => { if (ctx.measureText(text).width <= maxW) return text; let s = text; while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1); return s + "…"; };

      // 그리드(주별) — 날짜 칸 + 가로 로테이션 밴드 + 🎉/⏰ 배지
      let cy = GRID_TOP;
      weeks.forEach((wk, wi) => {
        const rh = rowHeights[wi];
        wk.forEach((dk, col) => {
          if (!dk) return;
          const cx = gx + cw * col;
          const evs = eventsOn(dk);
          const day = Number(dk.split("-")[2]);
          const isToday = dk === today;
          const hasDay = evs.some((e) => e.kind === "day"), hasHour = evs.some((e) => e.kind === "hour");
          ctx.fillStyle = isToday ? "#fff7ed" : "#ffffff";
          ctx.strokeStyle = isToday ? "#fb923c" : "#e8e2da"; ctx.lineWidth = isToday ? 3 : 1.5;
          ctx.beginPath(); ctx.roundRect(cx + 3, cy + 3, cw - 6, rh - 6, 14); ctx.fill(); ctx.stroke();
          ctx.textAlign = "left"; ctx.font = "800 23px system-ui, sans-serif";
          ctx.fillStyle = isToday ? "#ea580c" : col === 0 ? "#dc2626" : col === 6 ? "#3b5bdb" : "#94a3b8";
          ctx.fillText(String(day), cx + 13, cy + 28);
          if (hasDay || hasHour) { ctx.textAlign = "right"; ctx.font = "22px system-ui, sans-serif"; ctx.fillText((hasDay ? "🎉" : "") + (hasHour ? "⏰" : ""), cx + cw - 11, cy + 28); }
        });
        weekBands[wi].forEach((b) => {
          const rot = ROT[b.e.variant || "star"];
          const bosses = b.e.bosses.slice(0, 3);
          const first = b.e.bosses[0];
          const bx = gx + b.sc * cw + (b.startsHere ? 4 : 0);
          const bw = (b.ec - b.sc + 1) * cw - (b.startsHere ? 4 : 0) - (b.endsHere ? 4 : 0);
          const by = cy + DNUM_H_C + b.lane * BAND_H_C, bh = BAND_H_C - 8;
          ctx.fillStyle = rot.bg; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 9); ctx.fill();
          if (b.startsHere) { ctx.fillStyle = rot.c; ctx.beginPath(); ctx.roundRect(bx, by, 6, bh, 3); ctx.fill(); }
          const s = 27;
          let tx = bx + 7;
          bosses.forEach((boss) => {
            const dex = boss?.dex ? String(formDex(boss.ko, Number(boss.dex))) : "";
            const im = dex ? imgs[dex] : null;
            if (im) { ctx.drawImage(im, tx, by + (bh - s) / 2, s, s); tx += s + 3; }
          });
          tx += 4;
          ctx.textAlign = "left"; ctx.font = "800 20px system-ui, sans-serif"; ctx.fillStyle = rot.c;
          const label = `${rot.icon} ${b.e.bosses.length <= 1 ? (first ? first.name + (first.shiny ? " ✨" : "") : b.e.title) : t.nBosses.replace("{n}", String(b.e.bosses.length))}`;
          ctx.fillText(fit(label, bx + bw - tx - 7), tx, by + bh / 2 + 7);
        });
        cy += rh;
      });

      // 범례
      const legends: [string, string][] = [["⭐", t.rotStar], ["🔷", t.rotMega], ["🌑", t.rotShadow], ["🎉", t.kindDay], ["⏰", t.kindHour]];
      ctx.textAlign = "left"; ctx.font = "700 25px system-ui, sans-serif"; ctx.fillStyle = "#475569";
      let lx = gx + 4; const ly = cy + 48;
      legends.forEach(([ic, lb]) => { const seg = `${ic} ${lb}`; ctx.fillText(seg, lx, ly); lx += ctx.measureText(seg).width + 30; });

      // 워터마크/주소(로고 삽입)
      drawBrandFooter(ctx, logo, W, GRID_TOP + gridH + LEGEND_H, footH, "#ea580c", t.imgFooter);

      setCardImage(c.toDataURL("image/png"));
      setCardFile(null);
      c.toBlob((b) => { if (b) setCardFile(new File([b], imgFileName(cur.m), { type: "image/png" })); }, "image/png");
    } finally { setBusy(false); }
  };

  const saveCard = () => { if (!cardImage) return; track("download", "/gbl/raid/schedule", "raid-calendar"); const a = document.createElement("a"); a.href = cardImage; a.download = imgFileName(cur.m); a.click(); };
  const shareCard = async () => {
    track("share", "/gbl/raid/schedule", "raid-calendar");
    if (!cardImage) return;
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    try {
      let file = cardFile;
      if (!file) { const blob = await (await fetch(cardImage)).blob(); file = new File([blob], imgFileName(cur.m), { type: "image/png" }); }
      if (file && typeof navigator.share === "function" && nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: tpl(t.imgShareTitle, { m: cur.m, month: monthName(cur.m) }), text: "gblnote.com" });
        return;
      }
      saveCard();
    } catch (e) { if (e instanceof DOMException && e.name === "AbortError") return; saveCard(); }
  };

  // 달력 그리드
  const first = new Date(cur.y, cur.m - 1, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(cur.y, cur.m, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(ymd(new Date(cur.y, cur.m - 1, d)));
  while (cells.length % 7 !== 0) cells.push(null);

  // 주(week) 단위로 쪼개고, 각 주에 걸치는 로테이션을 가로 밴드로(변형별 고정 레인 → 주 넘어가도 연속감)
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const vOrd: Record<string, number> = { star: 0, mega: 1, shadow: 2 };
  const dayShift = (dk: string, delta: number) => ymd(new Date(new Date(dk + "T12:00:00").getTime() + delta * 86400000));
  type Band = { e: CalEvent; sc: number; ec: number; lane: number; startsHere: boolean; endsHere: boolean };
  const bandsOfWeek = (wk: (string | null)[]): Band[] => {
    const raw: Band[] = [];
    for (const e of events) {
      if (e.kind !== "rotation") continue;
      let sc = -1, ec = -1;
      wk.forEach((dk, col) => { if (dk && eventsOn(dk).includes(e)) { if (sc < 0) sc = col; ec = col; } });
      if (sc < 0) continue;
      const first = wk[sc]!, last = wk[ec]!;
      raw.push({
        e, sc, ec, lane: 0,
        startsHere: !eventsOn(dayShift(first, -1)).includes(e),   // 전날이 이벤트에 없으면 = 진짜 시작
        endsHere: !eventsOn(dayShift(last, 1)).includes(e),        // 다음날이 없으면 = 진짜 끝
      });
    }
    // 레인 = 변형(5성/메가/그림자)별 1줄. 같은 변형의 순차 로테이션(예: 큐레무→유크시)은
    // 시간이 안 겹치므로 한 줄 공유. 빈 변형 레인은 제거해 컴팩트(빈 줄로 높이 낭비 방지).
    raw.sort((a, b) => (vOrd[a.e.variant || "star"] ?? 9) - (vOrd[b.e.variant || "star"] ?? 9));
    const usedV = [...new Set(raw.map((b) => vOrd[b.e.variant || "star"] ?? 9))].sort((x, y) => x - y);
    raw.forEach((b) => { b.lane = usedV.indexOf(vOrd[b.e.variant || "star"] ?? 9); });
    return raw;
  };
  const DNUM_H = 26, BAND_H = 26;

  const shift = (delta: number) => {
    const d = new Date(cur.y, cur.m - 1 + delta, 1);
    setCur({ y: d.getFullYear(), m: d.getMonth() + 1 });
    setSel(null);   // 월 이동 시 선택 해제(다른 달 선택일 상세가 남는 것 방지)
  };

  const CARD = "#ffffff", BORDER = "#e3e8f2";
  const selEvents = sel ? eventsOn(sel) : [];

  // 표시 중인 월에 걸치는 로테이션 보스 목록(설명용)
  const mStart = new Date(cur.y, cur.m - 1, 1).getTime(), mEnd = new Date(cur.y, cur.m, 1).getTime();
  const monthBosses: { b: CalBoss; variant?: RotVariant; brochure?: Brochure }[] = [];
  const seenB = new Set<string>();
  // 브로마이드 이벤트 보스(예: 슈퍼메가 아쿠스타) — 목록 맨 위, 클릭 시 브로마이드 팝업
  for (const br of BROCHURES) {
    const bt = new Date(br.dateKey + "T12:00:00").getTime();
    if (bt < mStart || bt >= mEnd) continue;
    const label = br.newLabel || br.title;
    seenB.add(label);
    monthBosses.push({ b: { ko: label, name: label, dex: br.hero.spriteDex || "", image: "", shiny: !!br.hero.shiny }, variant: "mega", brochure: br });
  }
  for (const e of events) {
    if (e.kind !== "rotation") continue;
    if (new Date(e.start).getTime() >= mEnd || new Date(e.end).getTime() <= mStart) continue;
    for (const b of e.bosses) if (!seenB.has(b.ko)) { seenB.add(b.ko); monthBosses.push({ b, variant: e.variant }); }
  }
  const vOrder: Record<string, number> = { star: 0, mega: 1, shadow: 2 };
  // 브로마이드(특별 이벤트) 보스는 항상 맨 앞, 나머지는 변형순
  monthBosses.sort((a, b) => (a.brochure ? -1 : 0) - (b.brochure ? -1 : 0) || (vOrder[a.variant || "star"] ?? 9) - (vOrder[b.variant || "star"] ?? 9));

  // 보스 로테이션 기간 아젠다(전 기간, 시작일순) — 보스 클릭 시 CP 모달
  const fmtD = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}.${d.getDate()}`; };
  const nowTs = Date.now();
  // 진행 중/예정만 노출 — 종료된 로테이션(end ≤ now)은 숨김
  const rotations = events.filter((e) => e.kind === "rotation" && new Date(e.end).getTime() > nowTs)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const liveRots = rotations.filter((e) => nowTs >= new Date(e.start).getTime() && nowTs < new Date(e.end).getTime());

  return (
    <div>
      {/* 지금 열리는 레이드 — 히어로 */}
      {liveRots.length > 0 && (
        <div style={{ marginBottom: 12, borderRadius: 14, padding: "9px 12px 10px",
          background: "linear-gradient(135deg,#c2410c 0%,#db2777 55%,#7c3aed 100%)", boxShadow: "0 10px 24px -14px rgba(219,39,119,.5)" }}>
          <div style={{ fontSize: "0.76rem", fontWeight: 900, color: "#fff", marginBottom: 7, letterSpacing: "-0.2px" }}>{t.liveNowH}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {liveRots.flatMap((e, ei) => {
              const rs = e.variant ? ROT[e.variant] : null;
              return e.bosses.map((b, bi) => (
                <button key={`${ei}-${bi}`} onClick={() => setCpBoss(b)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.26)", borderRadius: 11, padding: "4px 10px 4px 4px", cursor: "pointer" }}>
                  <span style={{ width: 34, height: 34, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,.92)", borderRadius: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={monSprite(b.ko, b.dex)} alt={b.name} width={28} height={28} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
                  </span>
                  {rs && <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#fff", background: "rgba(255,255,255,.22)", borderRadius: 999, padding: "2px 7px", flexShrink: 0 }}>{rs.icon}</span>}
                  <span style={{ fontSize: "0.86rem", fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}{b.shiny ? " ✨" : ""}</span>
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
                    <span style={{ fontSize: "0.64rem", fontWeight: 700, color: "rgba(255,255,255,.8)" }}>~{fmtD(e.end)} {t.endsWord}</span>
                    <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "rgba(255,255,255,.9)" }}>{t.cpTableArrow}</span>
                  </span>
                </button>
              ));
            })}
          </div>
        </div>
      )}

      {/* 월 네비 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={() => shift(-1)} aria-label="prev" style={{ border: `1px solid ${BORDER}`, background: CARD, borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: "1.1rem", color: "#ea580c", fontWeight: 800, lineHeight: 1, boxShadow: "0 2px 6px -3px rgba(15,23,42,.15)" }}>‹</button>
        <span style={{ fontSize: "1.18rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.3px" }}>{tpl(t.navMonth, { y: cur.y, m: cur.m, month: monthName(cur.m) })}</span>
        <button onClick={() => shift(1)} aria-label="next" style={{ border: `1px solid ${BORDER}`, background: CARD, borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: "1.1rem", color: "#ea580c", fontWeight: 800, lineHeight: 1, boxShadow: "0 2px 6px -3px rgba(15,23,42,.15)" }}>›</button>
      </div>

      {/* 달력 이미지 저장·공유 (홍보) — 달력 위 */}
      <button onClick={buildImage} disabled={busy}
        style={{ width: "100%", marginBottom: 12, padding: "11px", borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer", fontWeight: 800, fontSize: "0.9rem", background: busy ? "#cbd5e1" : "linear-gradient(90deg,#ea580c,#db2777)", color: "#fff", boxShadow: busy ? "none" : "0 4px 12px -4px rgba(219,39,119,.5)" }}>
        {busy ? t.building : tpl(t.saveBtn, { m: cur.m, month: monthName(cur.m) })}
      </button>

      {/* 요일 헤더 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
        {WD.map((w, i) => (
          <div key={w} style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 700, color: i === 0 ? "#dc2626" : i === 6 ? "#3b5bdb" : "#94a3b8" }}>{w}</div>
        ))}
      </div>

      {/* 날짜 그리드 — 주 단위 + 가로 이벤트 밴드 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {weeks.map((wk, wi) => {
          const bands = bandsOfWeek(wk);
          const laneN = bands.length ? Math.max(...bands.map((b) => b.lane)) + 1 : 0;
          const rowH = Math.max(46, DNUM_H + laneN * BAND_H + 5);
          return (
            <div key={wi} style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
              {/* 날짜 칸 */}
              {wk.map((dk, col) => {
                if (!dk) return <div key={col} style={{ minHeight: rowH, borderRadius: 11, background: "rgba(0,0,0,.015)" }} />;
                const evs = eventsOn(dk);
                const isToday = dk === today, isSel = dk === sel;
                const day = Number(dk.split("-")[2]);
                const hasHour = evs.some((e) => e.kind === "hour");
                const hasDay = evs.some((e) => e.kind === "day");
                const wdow = new Date(dk + "T12:00:00").getDay();
                const hasBrochure = !!brochureFor(dk);   // 브로마이드 있는 이벤트일
                const clickable = hasHour || hasDay || hasBrochure;   // 아워·데이·브로마이드 있는 날만 클릭
                return (
                  <div key={col} onClick={clickable ? () => { const br = brochureFor(dk); if (br) setBrochure(br); else setSel(dk); } : undefined}
                    style={{
                      minHeight: rowH, borderRadius: 11, cursor: clickable ? "pointer" : "default", padding: 0, position: "relative", overflow: "hidden",
                      border: isSel && clickable ? "2px solid #ea580c" : isToday ? "1.5px solid #fb923c" : `1px solid ${BORDER}`,
                      background: isToday ? "linear-gradient(180deg,#fff7ed,#ffffff 60%)" : CARD,
                      boxShadow: isSel && clickable ? "0 6px 16px -8px rgba(234,88,12,.5)" : "none",
                    }}>
                    {isToday ? (
                      <span style={{ position: "absolute", top: 3, left: 5, zIndex: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 17, height: 17, padding: "0 3px", borderRadius: 999, background: "#ea580c", color: "#fff", fontSize: "0.64rem", fontWeight: 900, lineHeight: 1, boxShadow: "0 1px 4px rgba(234,88,12,.5)" }}>{day}</span>
                    ) : (
                      <span style={{ position: "absolute", top: 5, left: 7, zIndex: 3, fontSize: "0.66rem", fontWeight: 700, lineHeight: 1,
                        color: wdow === 0 ? "#f87171" : wdow === 6 ? "#93c5fd" : "#94a3b8" }}>{day}</span>
                    )}
                    {(hasDay || hasHour) && (
                      <span style={{ position: "absolute", top: 2, right: 3, zIndex: 7, display: "flex", gap: 3, lineHeight: 1 }}>
                        {hasDay && <span style={{ fontSize: "1.05rem", background: "#fff", borderRadius: "50%", padding: "2px", boxShadow: "0 1px 4px rgba(124,58,237,.45)", border: "1px solid #e9d5ff" }}>🎉</span>}
                        {hasHour && <span style={{ fontSize: "1.05rem", background: "#fff", borderRadius: "50%", padding: "2px", boxShadow: "0 1px 4px rgba(194,65,12,.45)", border: "1px solid #fed7aa" }}>⏰</span>}
                      </span>
                    )}
                  </div>
                );
              })}
              {/* 가로 로테이션 밴드 (레인별) */}
              {bands.map((b, bi) => {
                const rot = ROT[b.e.variant || "star"];
                const r = 8;
                return (
                  <div key={bi}
                    style={{
                      position: "absolute", top: DNUM_H + b.lane * BAND_H, height: BAND_H - 5,
                      left: `calc(${(b.sc / 7) * 100}% + ${b.startsHere ? 4 : 0}px)`,
                      width: `calc(${((b.ec - b.sc + 1) / 7) * 100}% - ${(b.startsHere ? 4 : 0) + (b.endsHere ? 4 : 0)}px)`,
                      background: rot.bg, border: `1px solid ${rot.c}40`, pointerEvents: "none",
                      borderTopLeftRadius: b.startsHere ? r : 0, borderBottomLeftRadius: b.startsHere ? r : 0,
                      borderTopRightRadius: b.endsHere ? r : 0, borderBottomRightRadius: b.endsHere ? r : 0,
                      borderLeft: b.startsHere ? `3px solid ${rot.c}` : `1px solid ${rot.c}40`,
                      display: "flex", alignItems: "center", gap: 5, padding: "0 8px 0 6px", overflow: "hidden", zIndex: 1,
                    }}>
                    {b.e.bosses.slice(0, 3).map((bo, ii) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={ii} src={monSprite(bo.ko, bo.dex)} alt="" width={20} height={20} style={{ imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }} />
                    ))}
                    <span style={{ fontSize: "0.7rem", fontWeight: 800, color: rot.c, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {rot.icon} {b.e.bosses.length === 0 ? b.e.title : b.e.bosses.length === 1 ? b.e.bosses[0].name + (b.e.bosses[0].shiny ? " ✨" : "") : t.nBosses.replace("{n}", String(b.e.bosses.length))}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: "0.66rem", color: "#94a3b8", flexWrap: "wrap", alignItems: "center" }}>
        <span>{t.legendMain}</span><span>{t.legendMega}</span><span>{t.legendShadow}</span><span>{t.legendDay}</span><span>{t.legendHour}</span>
      </div>

      {/* 다가오는 레이드 아워·데이 — 상시 표시(월 이동 없이 미래 이벤트 발견) + 타입별 상세 안내 */}
      {(() => {
        const up = events.filter((e) => (e.kind === "hour" || e.kind === "day") && new Date(e.start).getTime() < mEnd && new Date(e.end).getTime() >= mStart)
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        if (up.length === 0) return null;
        return (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>{tpl(t.upcomingSpecialH, { month: monthName(cur.m), m: cur.m })}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {up.map((e, i) => {
                const k = KIND[e.kind as "hour" | "day"];
                const sd = new Date(e.start);
                const dstr = tpl(t.upcomingDateFmt, { m: sd.getMonth() + 1, d: sd.getDate(), w: WD[sd.getDay()] });
                return (
                  <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${k.c}`, borderRadius: 12, padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: e.guide ? 5 : 0 }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#fff", background: k.c, borderRadius: 8, padding: "2px 9px" }}>{k.icon} {k.label}</span>
                      <span style={{ fontSize: "0.84rem", fontWeight: 800, color: "#0f172a" }}>{dstr}</span>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: k.c }}>{fmtTime(e.start)}~{fmtTime(e.end)}</span>
                      {e.title && <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>· {e.title}</span>}
                    </div>
                    {e.guide && <div style={{ fontSize: "0.76rem", color: "#475569", lineHeight: 1.65 }}>{e.guide}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: "0.66rem", color: "#94a3b8", marginTop: 6 }}>{t.guideNote}</div>
          </div>
        );
      })()}

      {/* 이 달 주요 이벤트(커뮤니티데이·스포트라이트·맥스 등) — 표시 중인 월에 걸치는 것만 */}
      {(() => {
        // 진행 중/예정만 — 종료된 이벤트(end ≤ now) 숨김, 진행 중 먼저
        const me = majorEvents.filter((e) => new Date(e.start).getTime() < mEnd && new Date(e.end).getTime() >= mStart && new Date(e.end).getTime() > nowTs)
          .map((e) => ({ e, live: nowTs >= new Date(e.start).getTime() && nowTs < new Date(e.end).getTime() }))
          .sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0) || new Date(a.e.start).getTime() - new Date(b.e.start).getTime());
        if (me.length === 0) return null;
        return (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>{tpl(t.majorEventsH, { month: monthName(cur.m), m: cur.m })}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {me.map(({ e, live }, i) => {
                const s = new Date(e.start), en = new Date(e.end);
                const multi = e.start.slice(0, 10) !== e.end.slice(0, 10);
                const dstr = `${s.getMonth() + 1}/${s.getDate()}` + (multi ? `~${en.getMonth() + 1}/${en.getDate()}` : "");
                const nm = e.name.replace(/\s+in\s+.*$/i, "").replace(/&amp;/g, "&").trim();
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: live ? "linear-gradient(180deg,#f0fdf4,#ffffff 60%)" : CARD, border: `1px solid ${live ? "#86efac" : BORDER}`, borderRadius: 10, padding: "8px 11px" }}>
                    <span style={{ fontSize: "0.66rem", fontWeight: 800, color: "#fff", background: live ? "#16a34a" : "#94a3b8", borderRadius: 8, padding: "2px 8px", whiteSpace: "nowrap" }}>{live ? t.live : t.upcoming}</span>
                    <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#7c3aed", background: "#f3e8ff", borderRadius: 8, padding: "2px 9px", whiteSpace: "nowrap" }}>{e.emoji} {t.evtType[e.eventType] || e.eventType}</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>{dstr}</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>{nm}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 선택한 날 특별 이벤트(레이드 아워·데이) — 로테이션 보스는 히어로·밴드로 대체(중복 제거) */}
      {sel && (() => {
        const special = selEvents.filter((e) => e.kind !== "rotation");
        if (special.length === 0) return null;
        return (
          <div style={{ marginTop: 14, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "11px 14px" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
              {tpl(t.selDateTitle, { m: Number(sel.split("-")[1]), d: Number(sel.split("-")[2]), w: WD[new Date(sel + "T12:00:00").getDay()], month: monthName(Number(sel.split("-")[1])) })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {special.map((e, idx) => {
                const k = KIND[e.kind as "hour" | "day"];
                return (
                  <div key={idx} style={{ background: k.bg, borderRadius: 9, padding: "7px 11px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.66rem", fontWeight: 800, color: "#fff", background: k.c, borderRadius: 6, padding: "1px 8px" }}>{k.icon} {k.label}</span>
                      <span style={{ fontSize: "0.74rem", fontWeight: 700, color: k.c }}>{fmtTime(e.start)}~{fmtTime(e.end)}</span>
                      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>{e.title}</span>
                    </div>
                    {e.guide && <div style={{ fontSize: "0.74rem", color: "#475569", lineHeight: 1.6, marginTop: 4 }}>{e.guide}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 이달 등장 보스 설명 */}
      {monthBosses.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: "0.84rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{tpl(t.monthBossesH, { m: cur.m, month: monthName(cur.m) })}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {monthBosses.map((m, i) => {
              const rs = m.variant ? ROT[m.variant] : null;
              const isBro = !!m.brochure;
              const spr = isBro && m.brochure!.hero.img ? m.brochure!.hero.img : monSprite(m.b.ko, m.b.dex);
              return (
                <button key={i} onClick={() => (m.brochure ? setBrochure(m.brochure) : setCpBoss(m.b))}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", cursor: "pointer",
                    background: isBro ? "linear-gradient(90deg,#faf5ff,#fdf2f8)" : CARD, border: `1px solid ${isBro ? "#e9d5ff" : BORDER}`, borderRadius: 10, padding: "6px 10px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={spr} alt={m.b.name} width={34} height={34} style={{ imageRendering: m.brochure?.hero.img ? "auto" : "pixelated", objectFit: "contain" }}
                    onError={(e) => { const f = monSprite(m.b.ko, m.b.dex); if (e.currentTarget.src !== f) { e.currentTarget.src = f; e.currentTarget.style.imageRendering = "pixelated"; } }} />
                  <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a" }}>{m.b.name}{m.b.shiny ? " ✨" : ""}</span>
                  {isBro ? <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#a21caf", background: "#fae8ff", border: "1px solid #f0abfc", borderRadius: 6, padding: "1px 7px" }}>🎉 이벤트</span>
                    : rs && <span style={{ fontSize: "0.6rem", fontWeight: 800, color: rs.c, background: rs.bg, border: `1px solid ${rs.c}44`, borderRadius: 6, padding: "1px 7px" }}>{rs.icon} {rs.label}</span>}
                  <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: isBro ? "#a21caf" : "#3b5bdb", fontWeight: 600, whiteSpace: "nowrap" }}>{isBro ? "이벤트 정보 →" : t.cpTableArrow}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 보스 로테이션 기간 — 보스 클릭 시 CP 모달 */}
      {rotations.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>{t.rotationH}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rotations.map((e, i) => {
              const live = nowTs >= new Date(e.start).getTime() && nowTs < new Date(e.end).getTime();
              const rs = e.variant ? ROT[e.variant] : null;
              return (
                <div key={i} style={{ background: CARD, border: `1px solid ${live ? "#86efac" : BORDER}`, borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.66rem", fontWeight: 800, color: "#fff", background: live ? "#16a34a" : "#94a3b8", borderRadius: 8, padding: "2px 8px" }}>{live ? t.live : t.upcoming}</span>
                    {rs && <span style={{ fontSize: "0.68rem", fontWeight: 800, color: rs.c, background: rs.bg, border: `1px solid ${rs.c}44`, borderRadius: 8, padding: "2px 8px" }}>{rs.icon} {e.title}</span>}
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>{fmtD(e.start)} ~ {fmtD(e.end)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {e.bosses.map((b, bi) => (
                      <button key={bi} onClick={() => setCpBoss(b)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={monSprite(b.ko, b.dex)} alt={b.name} width={36} height={36} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
                        <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#3b5bdb" }}>{b.name}{b.shiny ? " ✨" : ""}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 미리보기 모달 */}
      {cardImage && (
        <ShareModal img={cardImage} onClose={() => setCardImage(null)}>
          <button onClick={shareCard} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "linear-gradient(90deg,#ea580c,#db2777)", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>{t.share}</button>
          <button onClick={saveCard} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "#334155", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>{t.save}</button>
          <button onClick={() => setCardImage(null)} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #e3e8f2", background: "#f1f5f9", color: "#64748b", cursor: "pointer", fontSize: "0.9rem" }}>{t.close}</button>
        </ShareModal>
      )}

      {/* 스케줄 보스 클릭 → 그 보스 CP표만 (현재 보스 목록으로 안 보냄) */}
      {cpBoss && (() => {
        const st = STATS[cpBoss.dex];
        return (
          <div onClick={() => setCpBoss(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 16, maxWidth: 440, width: "100%", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(20,20,60,.35)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={monSprite(cpBoss.ko, cpBoss.dex)} alt={cpBoss.name} width={46} height={46} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" }}>{cpBoss.name}{cpBoss.shiny ? " ✨" : ""}</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{t.cpModalSub}</div>
                </div>
                <button onClick={() => setCpBoss(null)} style={{ border: "none", background: "#f1f5f9", color: "#64748b", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: "1rem", flexShrink: 0 }}>✕</button>
              </div>
              {st ? (
                <CpTable stats={st} hundoL20={cpAt(st, [15, 15, 15], CPM_L20)} hundoL25={cpAt(st, [15, 15, 15], CPM_L25)} name={cpBoss.name} accent="#ea580c" dex={String(formDex(cpBoss.ko, cpBoss.dex))} shiny={cpBoss.shiny} defaultOpen />
              ) : (
                <div style={{ padding: "1.5rem 1rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>{t.cpModalNoData}</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 이벤트 브로마이드 팝업 */}
      {brochure && <EventBrochure b={brochure} lang={lang} onClose={() => setBrochure(null)}
        onDismiss={() => { try { localStorage.setItem("gblBroDismiss:" + brochure.dateKey, "1"); } catch {} setBrochure(null); }} />}
    </div>
  );
}
