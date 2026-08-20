"use client";
import { useState } from "react";
import { saveDataUrl, shareDataUrl } from "../raidShareUtil";
import { track } from "../../../../lib/track";

const CPM_L20 = 0.5974, CPM_L25 = 0.667934;
function cpAt(st: Stats, iv: number[], cpm: number): number {
  return Math.max(10, Math.floor((st.a + iv[0]) * Math.sqrt(st.d + iv[1]) * Math.sqrt(st.s + iv[2]) * cpm * cpm / 10));
}
type Stats = { a: number; d: number; s: number };

// 13~15 전체 조합(27) — 개체값 높은 순, 같으면 CP 높은 순
const COMBOS: number[][] = (() => {
  const out: number[][] = [];
  for (const a of [15, 14, 13]) for (const d of [15, 14, 13]) for (const s of [15, 14, 13]) out.push([a, d, s]);
  return out;
})();

export default function CpTable({ stats, hundoL20, hundoL25, name = "", accent = "#ea580c" }: { stats: Stats; hundoL20: number; hundoL25: number; name?: string; accent?: string }) {
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const rows = COMBOS.map((iv) => ({ iv, pct: Math.round(((iv[0] + iv[1] + iv[2]) / 45) * 100), l20: cpAt(stats, iv, CPM_L20), l25: cpAt(stats, iv, CPM_L25) }))
    .sort((a, b) => (b.iv[0] + b.iv[1] + b.iv[2]) - (a.iv[0] + a.iv[1] + a.iv[2]) || b.l20 - a.l20);

  const buildImage = () => {
    const W = 1080, headH = 210, rowH = 46, footH = 150;
    const H = headH + rowH * (rows.length + 1) + footH;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#0f1225"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = accent; ctx.fillRect(0, 0, W, 12);
    ctx.textAlign = "left"; ctx.fillStyle = "#ffffff"; ctx.font = "900 58px system-ui, sans-serif";
    ctx.fillText(name || "레이드 보스", 44, 92);
    ctx.fillStyle = "#93a4cf"; ctx.font = "700 34px system-ui, sans-serif";
    ctx.fillText(`100% CP  ${hundoL20.toLocaleString()}  ·  날씨 ${hundoL25.toLocaleString()}`, 46, 146);
    ctx.fillStyle = "#7c9dff"; ctx.font = "600 26px system-ui, sans-serif";
    ctx.fillText("잡은 CP로 개체값 확인 · 💯=100% · ✨=13/13/13(정화 시 100%)", 46, 186);
    // 표 헤더
    const cols = [60, 470, 720, 1010];
    ctx.font = "700 30px system-ui, sans-serif"; ctx.fillStyle = "#93a4cf";
    ctx.textAlign = "left"; ctx.fillText("개체값", cols[0], headH + 30);
    ctx.textAlign = "right"; ctx.fillText("%", cols[1], headH + 30);
    ctx.fillText("일반 L20", cols[2], headH + 30);
    ctx.fillText("날씨 L25", cols[3], headH + 30);
    rows.forEach((r, i) => {
      const y = headH + rowH * (i + 1) + 34;
      const hundo = r.pct === 100, purify = r.iv.join("") === "131313";
      if (hundo) { ctx.fillStyle = "rgba(234,88,12,0.16)"; ctx.fillRect(24, y - 34, W - 48, rowH); }
      else if (purify) { ctx.fillStyle = "rgba(59,130,246,0.14)"; ctx.fillRect(24, y - 34, W - 48, rowH); }
      const col = hundo ? "#ffb37a" : purify ? "#8ec5ff" : "#e2e8f0";
      ctx.font = `${hundo || purify ? 800 : 500} 32px system-ui, sans-serif`;
      ctx.textAlign = "left"; ctx.fillStyle = col;
      ctx.fillText(`${hundo ? "💯 " : purify ? "✨ " : ""}${r.iv.join(" / ")}`, cols[0], y);
      ctx.textAlign = "right"; ctx.fillStyle = "#93a4cf"; ctx.font = "500 30px system-ui, sans-serif";
      ctx.fillText(`${r.pct}%`, cols[1], y);
      ctx.fillStyle = col; ctx.font = `${hundo || purify ? 800 : 600} 32px system-ui, sans-serif`;
      ctx.fillText(r.l20.toLocaleString(), cols[2], y);
      ctx.fillText(r.l25.toLocaleString(), cols[3], y);
    });
    const fy = headH + rowH * (rows.length + 1);
    ctx.textAlign = "center"; ctx.fillStyle = accent; ctx.font = "900 60px system-ui, sans-serif";
    ctx.fillText("gblnote.com", W / 2, fy + 84);
    ctx.fillStyle = "#93a4cf"; ctx.font = "600 28px system-ui, sans-serif";
    ctx.fillText("포켓몬GO 레이드 보스 CP · GBL Note", W / 2, fy + 126);
    setImg(c.toDataURL("image/png"));
    setFile(null);
    c.toBlob((b) => { if (b) setFile(new File([b], `gbl-cp-${name || "boss"}.png`, { type: "image/png" })); }, "image/png");
  };

  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #e3e8f2" }}>
      <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: open ? 8 : 0 }}>
        잡은 CP가 <b style={{ color: "#c2410c" }}>{hundoL20.toLocaleString()}</b>(날씨 <b style={{ color: "#c2410c" }}>{hundoL25.toLocaleString()}</b>)이면 <b style={{ color: "#c2410c" }}>100개체</b>! · 그림자는 <b>13/13/13</b>(정화 시 100%)
      </div>
      <button onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", padding: "6px", borderRadius: 8, border: "1px solid #ffd0a8", background: "#fff7ed", color: "#c2410c", fontWeight: 700, fontSize: "0.76rem", cursor: "pointer" }}>
        {open ? "▲ CP표 닫기" : "▼ 개체값별 CP표 (13~15)"}
      </button>
      {open && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 1 }}>
          <div style={{ display: "flex", fontSize: "0.64rem", color: "#94a3b8", fontWeight: 700, padding: "0 4px" }}>
            <span style={{ flex: 1.5 }}>개체값</span>
            <span style={{ flex: 0.7, textAlign: "right" }}>%</span>
            <span style={{ flex: 1, textAlign: "right" }}>일반 L20</span>
            <span style={{ flex: 1, textAlign: "right" }}>날씨 L25</span>
          </div>
          {rows.map((r) => {
            const hundo = r.pct === 100;
            const purify = r.iv[0] === 13 && r.iv[1] === 13 && r.iv[2] === 13;
            const bg = hundo ? "#fff1e6" : purify ? "#eef7ff" : "transparent";
            const col = hundo ? "#c2410c" : purify ? "#2563eb" : "#334155";
            const fw = hundo || purify ? 800 : 500;
            return (
              <div key={r.iv.join("")} style={{ display: "flex", fontSize: "0.72rem", padding: "2px 4px", background: bg, borderRadius: 4, alignItems: "baseline" }}>
                <span style={{ flex: 1.5, fontWeight: fw, color: col }}>{hundo ? "💯 " : purify ? "✨ " : ""}{r.iv.join(" / ")}</span>
                <span style={{ flex: 0.7, textAlign: "right", color: "#94a3b8" }}>{r.pct}%</span>
                <span style={{ flex: 1, textAlign: "right", fontWeight: fw, color: col }}>{r.l20.toLocaleString()}</span>
                <span style={{ flex: 1, textAlign: "right", fontWeight: fw, color: col }}>{r.l25.toLocaleString()}</span>
              </div>
            );
          })}
          <button onClick={buildImage}
            style={{ marginTop: 8, padding: "8px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 800, fontSize: "0.78rem", background: `linear-gradient(90deg,${accent},#7c3aed)`, color: "#fff" }}>
            📸 이 CP표 이미지 저장·공유
          </button>
        </div>
      )}

      {img && (
        <div onClick={() => setImg(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.72)", zIndex: 10000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="CP표" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "74vh", borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,.4)" }} />
          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { track("share", "/gbl/raid/bosses"); shareDataUrl(img, file, `gbl-cp-${name || "boss"}.png`, `${name} 100% CP`, `${name} 레이드 CP · gblnote.com`); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: `linear-gradient(90deg,${accent},#7c3aed)`, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>📤 공유</button>
            <button onClick={() => { track("download", "/gbl/raid/bosses"); saveDataUrl(img, `gbl-cp-${name || "boss"}.png`); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "#334155", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>💾 저장</button>
            <button onClick={() => setImg(null)} style={{ padding: "11px 16px", borderRadius: 10, border: "none", background: "rgba(255,255,255,.15)", color: "#e2e8f0", cursor: "pointer", fontSize: "0.9rem" }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
