"use client";
// 일별 방문 추이 라인차트 — gbl-admin·tcg-admin 공용. PV·전체방문자·신규·재방문·세션 통합, 범례 클릭=표시/숨김(숨기면 축 자동 재조정).
import { useState } from "react";

export type DailyRow = { day: string; pageviews: number; uniques: number; new_visitors: number; returning_visitors?: number; sessions: number };
const CHART_SERIES: { key: keyof DailyRow; label: string; color: string }[] = [
  { key: "pageviews", label: "페이지뷰", color: "#3b5bdb" },
  { key: "uniques", label: "전체방문자", color: "#0f172a" },
  { key: "new_visitors", label: "신규방문자", color: "#16a34a" },
  { key: "returning_visitors", label: "재방문자", color: "#0891b2" },
  { key: "sessions", label: "세션", color: "#7c3aed" },
];

export default function TrafficChart({ daily: rawDaily }: { daily: DailyRow[] }) {
  // 재방문자 = 전체 − 신규(그날 이전에 첫 방문한 사람) — 일별 파생
  const daily = rawDaily.map((d) => ({ ...d, returning_visitors: Math.max(0, (d.uniques || 0) - (d.new_visitors || 0)) }));
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const visible = CHART_SERIES.filter((s) => !hidden.has(s.key));
  const maxY = Math.max(1, ...daily.flatMap((d) => visible.map((s) => d[s.key] as number)));
  const W = 680, H = 210, PL = 42, PR = 14, PT = 16, PB = 26, ticks = 4;
  const n = daily.length;
  const X = (i: number) => PL + (n <= 1 ? (W - PL - PR) / 2 : (i / (n - 1)) * (W - PL - PR));
  const Y = (v: number) => PT + (1 - v / maxY) * (H - PT - PB);
  const showLabels = n <= 14;
  const xIdx = [...new Set([0, Math.floor((n - 1) / 2), n - 1])].filter((v) => v >= 0);
  return (
    <div style={{ background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "0.9rem", marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>📈 일별 방문 추이</span>
        {CHART_SERIES.map((s) => { const off = hidden.has(s.key); return (
          <button key={s.key} onClick={() => toggle(s.key)} style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", cursor: "pointer", fontSize: "0.72rem", color: off ? "#cbd5e1" : "#475569", fontWeight: 600, textDecoration: off ? "line-through" : "none", padding: 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: off ? "#e2e8f0" : s.color }} />{s.label}
          </button>
        ); })}
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: n > 20 ? 520 : undefined, height: "auto", display: "block" }}>
          {Array.from({ length: ticks + 1 }).map((_, i) => { const v = Math.round(maxY * (1 - i / ticks)); const y = PT + (i / ticks) * (H - PT - PB); return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={PL - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{v.toLocaleString()}</text>
            </g>
          ); })}
          {xIdx.map((i) => <text key={i} x={X(i)} y={H - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">{daily[i]?.day.slice(5)}</text>)}
          {visible.map((s) => (
            <polyline key={s.key} points={daily.map((d, i) => `${X(i)},${Y(d[s.key] as number)}`).join(" ")} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {visible.map((s) => daily.map((d, i) => { const v = d[s.key] as number; return (
            <g key={s.key + i}>
              <circle cx={X(i)} cy={Y(v)} r={2.6} fill={s.color}><title>{`${d.day} · ${s.label} ${v}`}</title></circle>
              {showLabels && <text x={X(i)} y={Y(v) - 6} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={s.color}>{v}</text>}
            </g>
          ); }))}
          <text x={PL - 6} y={PT - 4} textAnchor="end" fontSize={8} fill="#cbd5e1">(명/회)</text>
        </svg>
      </div>
      <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: 4, textAlign: "right" }}>날짜(KST) · 범례 클릭으로 표시/숨김 · 점에 마우스=값</div>
    </div>
  );
}

// 일별 표 — 차트와 같은 데이터(최신순). 두 관리 페이지 공용.
export function DailyTable({ daily }: { daily: DailyRow[] }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "0.9rem", marginBottom: 12, overflowX: "auto" }}>
      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
        일별 방문객·조회 <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 500 }}>(자체 집계 · 최신순)</span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
        <thead>
          <tr style={{ color: "#94a3b8" }}>
            <th style={{ textAlign: "left", fontWeight: 600, padding: "4px 6px" }}>날짜</th>
            <th style={{ textAlign: "right", fontWeight: 600, padding: "4px 6px" }}>방문객</th>
            <th style={{ textAlign: "right", fontWeight: 600, padding: "4px 6px", color: "#16a34a" }}>신규</th>
            <th style={{ textAlign: "right", fontWeight: 600, padding: "4px 6px", color: "#0891b2" }}>재방문</th>
            <th style={{ textAlign: "right", fontWeight: 600, padding: "4px 6px" }}>조회</th>
            <th style={{ textAlign: "right", fontWeight: 600, padding: "4px 6px" }}>세션</th>
            <th style={{ textAlign: "right", fontWeight: 600, padding: "4px 6px" }}>조회/방문</th>
          </tr>
        </thead>
        <tbody>
          {[...daily].reverse().map((d) => (
            <tr key={d.day} style={{ borderTop: "1px solid #f1f5f9" }}>
              <td style={{ textAlign: "left", padding: "4px 6px", color: "#475569" }}>{d.day.slice(5)}</td>
              <td style={{ textAlign: "right", padding: "4px 6px", fontWeight: 700, color: "#0f172a" }}>{d.uniques}</td>
              <td style={{ textAlign: "right", padding: "4px 6px", fontWeight: 600, color: "#16a34a" }}>{d.new_visitors ?? 0}</td>
              <td style={{ textAlign: "right", padding: "4px 6px", fontWeight: 600, color: "#0891b2" }}>{Math.max(0, (d.uniques || 0) - (d.new_visitors || 0))}</td>
              <td style={{ textAlign: "right", padding: "4px 6px", fontWeight: 700, color: "#3b5bdb" }}>{d.pageviews}</td>
              <td style={{ textAlign: "right", padding: "4px 6px", color: "#7c3aed" }}>{d.sessions}</td>
              <td style={{ textAlign: "right", padding: "4px 6px", color: "#64748b" }}>{d.uniques ? (d.pageviews / d.uniques).toFixed(1) : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
