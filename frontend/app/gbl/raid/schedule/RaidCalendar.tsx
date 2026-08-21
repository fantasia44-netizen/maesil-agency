"use client";
import { useState } from "react";
import Link from "next/link";
import { track } from "../../../../lib/track";
import { monSprite, formDex } from "../../sprite";
import { loadLogo, drawBrandFooter } from "../raidShareUtil";
import ShareModal from "../../ShareModal";

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
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  // 특정 날짜에 걸리는 이벤트
  const eventsOn = (dayKey: string): CalEvent[] => {
    const t = new Date(dayKey + "T12:00:00").getTime();
    return events.filter((e) => {
      const s = new Date(e.start).getTime(), en = new Date(e.end).getTime();
      if (e.kind === "rotation") return t >= new Date(dayKeyOf(e.start) + "T00:00:00").getTime() && t < en;
      return dayKeyOf(e.start) === dayKey || (t >= s && t <= en);
    });
  };

  // 달력을 이미지로 그려 저장/공유 (출처 gblnote.com). PokeAPI 스프라이트(CORS 허용)로 캔버스 오염 방지.
  const buildImage = async () => {
    setBusy(true);
    try {
      const daysN = new Date(cur.y, cur.m, 0).getDate();
      const startPad = new Date(cur.y, cur.m - 1, 1).getDay();
      const info: { d: number; dexMain?: string; mega: boolean; shadow: boolean; rd: boolean; rh: boolean }[] = [];
      const dexSet = new Set<string>();
      for (let d = 1; d <= daysN; d++) {
        const dk = ymd(new Date(cur.y, cur.m - 1, d));
        const evs = eventsOn(dk);
        const rots = evs.filter((e) => e.kind === "rotation");
        const main = (rots.find((e) => e.variant === "star") || rots.find((e) => e.variant === "mega") || rots.find((e) => e.variant === "shadow"))?.bosses[0];
        const mdex = main?.dex ? String(formDex(main.ko, Number(main.dex))) : undefined;   // 폼 반영
        if (mdex) dexSet.add(mdex);
        info.push({ d, dexMain: mdex, mega: rots.some((e) => e.variant === "mega"), shadow: rots.some((e) => e.variant === "shadow"), rd: evs.some((e) => e.kind === "day"), rh: evs.some((e) => e.kind === "hour") });
      }
      const imgs: Record<string, HTMLImageElement> = {};
      const logoP = loadLogo();
      await Promise.all([...dexSet].map((dex) => new Promise<void>((res) => {
        const im = new Image(); im.crossOrigin = "anonymous";
        im.onload = () => { imgs[dex] = im; res(); }; im.onerror = () => res();
        im.src = `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${dex}.png`;
      })));
      const logo = await logoP;

      const W = 1080, gx = 40, gw = W - 80, cw = gw / 7, gyTop = 210, rowH = 176, footH = 150;
      const rows = Math.ceil((startPad + daysN) / 7);
      const H = gyTop + rowH * rows + footH;
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d"); if (!ctx) { setBusy(false); return; }
      ctx.fillStyle = "#fbf7f3"; ctx.fillRect(0, 0, W, H);
      // 헤더
      ctx.textAlign = "left"; ctx.fillStyle = "#0f172a"; ctx.font = "900 74px system-ui, sans-serif";
      ctx.fillText(`포켓몬고 ${cur.m}월 레이드`, 44, 108);
      ctx.textAlign = "right"; ctx.fillStyle = "#f97316"; ctx.font = "800 42px system-ui, sans-serif";
      ctx.fillText(`${cur.y}`, W - 44, 104);
      // 요일
      ctx.textAlign = "center"; ctx.font = "800 34px system-ui, sans-serif";
      WD.forEach((w, i) => { ctx.fillStyle = i === 0 ? "#dc2626" : i === 6 ? "#3b5bdb" : "#64748b"; ctx.fillText(w, gx + cw * i + cw / 2, 178); });
      // 그리드
      for (let idx = startPad; idx < startPad + daysN; idx++) {
        const col = idx % 7, row = Math.floor(idx / 7);
        const cx = gx + cw * col, cy = gyTop + rowH * row;
        const it = info[idx - startPad];
        ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#e8e2da"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(cx + 4, cy + 4, cw - 8, rowH - 8, 12); ctx.fill(); ctx.stroke();
        ctx.textAlign = "left"; ctx.font = "700 28px system-ui, sans-serif";
        ctx.fillStyle = col === 0 ? "#dc2626" : col === 6 ? "#3b5bdb" : "#94a3b8";
        ctx.fillText(String(it.d), cx + 16, cy + 40);
        const im = it.dexMain ? imgs[it.dexMain] : null;
        if (im) { const s = 96; ctx.drawImage(im, cx + cw / 2 - s / 2, cy + 40, s, s); }
        let ind = ""; if (it.mega) ind += "🔷"; if (it.shadow) ind += "🌑"; if (it.rd) ind += "🎉"; if (it.rh) ind += "⏰";
        if (ind) { ctx.textAlign = "center"; ctx.font = "26px system-ui, sans-serif"; ctx.fillStyle = "#334155"; ctx.fillText(ind, cx + cw / 2, cy + rowH - 16); }
      }
      // 워터마크/주소(로고 삽입)
      const fy = gyTop + rowH * rows;
      drawBrandFooter(ctx, logo, W, fy, footH, "#ea580c", "포켓몬GO 레이드 일정");

      setCardImage(c.toDataURL("image/png"));
      setCardFile(null);
      c.toBlob((b) => { if (b) setCardFile(new File([b], `gbl-raid-${cur.m}월.png`, { type: "image/png" })); }, "image/png");
    } finally { setBusy(false); }
  };

  const saveCard = () => { if (!cardImage) return; track("download", "/gbl/raid/schedule", "raid-calendar"); const a = document.createElement("a"); a.href = cardImage; a.download = `gbl-raid-${cur.m}월.png`; a.click(); };
  const shareCard = async () => {
    track("share", "/gbl/raid/schedule", "raid-calendar");
    if (!cardImage) return;
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    try {
      let file = cardFile;
      if (!file) { const blob = await (await fetch(cardImage)).blob(); file = new File([blob], `gbl-raid-${cur.m}월.png`, { type: "image/png" }); }
      if (file && typeof navigator.share === "function" && nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `포켓몬고 ${cur.m}월 레이드 일정`, text: "gblnote.com" });
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

  const shift = (delta: number) => {
    const d = new Date(cur.y, cur.m - 1 + delta, 1);
    setCur({ y: d.getFullYear(), m: d.getMonth() + 1 });
  };

  const CARD = "#ffffff", BORDER = "#e3e8f2";
  const selEvents = sel ? eventsOn(sel) : [];

  // 표시 중인 월에 걸치는 로테이션 보스 목록(설명용)
  const mStart = new Date(cur.y, cur.m - 1, 1).getTime(), mEnd = new Date(cur.y, cur.m, 1).getTime();
  const monthBosses: { b: CalBoss; variant?: RotVariant }[] = [];
  const seenB = new Set<string>();
  for (const e of events) {
    if (e.kind !== "rotation") continue;
    if (new Date(e.start).getTime() >= mEnd || new Date(e.end).getTime() <= mStart) continue;
    for (const b of e.bosses) if (!seenB.has(b.ko)) { seenB.add(b.ko); monthBosses.push({ b, variant: e.variant }); }
  }
  const vOrder: Record<string, number> = { star: 0, mega: 1, shadow: 2 };
  monthBosses.sort((a, b) => (vOrder[a.variant || "star"] ?? 9) - (vOrder[b.variant || "star"] ?? 9));

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
                <img src={monSprite(main.ko, main.dex)} alt="" width={26} height={26} style={{ imageRendering: "pixelated", objectFit: "contain", marginTop: -1 }} />
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
                            <img src={monSprite(b.ko, b.dex)} alt={b.ko} width={34} height={34} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
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

      {/* 이달 등장 보스 설명 */}
      {monthBosses.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: "0.84rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>📋 {cur.m}월 등장 보스</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {monthBosses.map((m, i) => {
              const rs = m.variant ? ROT[m.variant] : null;
              return (
                <Link key={i} href={`/gbl/raid/bosses#b${m.b.dex}`}
                  style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "6px 10px" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={monSprite(m.b.ko, m.b.dex)} alt={m.b.ko} width={34} height={34} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
                  <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a" }}>{m.b.ko}{m.b.shiny ? " ✨" : ""}</span>
                  {rs && <span style={{ fontSize: "0.6rem", fontWeight: 800, color: rs.c, background: rs.bg, border: `1px solid ${rs.c}44`, borderRadius: 6, padding: "1px 7px" }}>{rs.icon} {rs.label}</span>}
                  <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#3b5bdb", fontWeight: 600, whiteSpace: "nowrap" }}>CP·딜러 →</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 달력 이미지 저장·공유 (홍보) */}
      <button onClick={buildImage} disabled={busy}
        style={{ width: "100%", marginTop: 14, padding: "11px", borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer", fontWeight: 800, fontSize: "0.9rem", background: busy ? "#cbd5e1" : "linear-gradient(90deg,#ea580c,#db2777)", color: "#fff" }}>
        {busy ? "이미지 생성 중…" : `📅 ${cur.m}월 달력 이미지 저장·공유`}
      </button>

      {/* 미리보기 모달 */}
      {cardImage && (
        <ShareModal img={cardImage} onClose={() => setCardImage(null)}>
          <button onClick={shareCard} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "linear-gradient(90deg,#ea580c,#db2777)", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>📤 공유</button>
          <button onClick={saveCard} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "#334155", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>💾 저장</button>
          <button onClick={() => setCardImage(null)} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #e3e8f2", background: "#f1f5f9", color: "#64748b", cursor: "pointer", fontSize: "0.9rem" }}>닫기</button>
        </ShareModal>
      )}
    </div>
  );
}
