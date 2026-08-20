"use client";
import { useState } from "react";

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

export default function CpTable({ stats, hundoL20, hundoL25 }: { stats: Stats; hundoL20: number; hundoL25: number }) {
  const [open, setOpen] = useState(false);
  const rows = COMBOS.map((iv) => ({ iv, pct: Math.round(((iv[0] + iv[1] + iv[2]) / 45) * 100), l20: cpAt(stats, iv, CPM_L20), l25: cpAt(stats, iv, CPM_L25) }))
    .sort((a, b) => (b.iv[0] + b.iv[1] + b.iv[2]) - (a.iv[0] + a.iv[1] + a.iv[2]) || b.l20 - a.l20);

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
        </div>
      )}
    </div>
  );
}
