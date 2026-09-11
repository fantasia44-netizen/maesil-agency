"use client";
// 이번 주 브리핑 요약 공유카드 — 4섹션 1위를 한 장에. 공유 로직은 공용 ShareCard가 담당.
import ShareCard, { type ShareUI } from "../ShareCard";

export type Highlight = { emoji: string; label: string; deck: string; metric: string; sub?: string; color: string };
type UI = ShareUI & { title: string; footer: string };

export default function BriefingShare({ highlights, ui, dateLabel }: { highlights: Highlight[]; ui: UI; dateLabel: string }) {
  return (
    <ShareCard ui={ui} filename="tcg-briefing.png" shareTitle={ui.title} trackLabel="weekly-briefing" trackPath="/tcg/briefing">
      <div style={{ width: 420, background: "linear-gradient(160deg,#fee6e6,#fef7f5)", padding: "22px 22px 18px", fontFamily: "system-ui,'Malgun Gothic',sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 22 }}>🎴</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#b91c1c", letterSpacing: "-0.5px" }}>TCG Note</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>{ui.title}</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>{dateLabel}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {highlights.map((h) => (
            <div key={h.label} style={{ background: "#fff", borderRadius: 12, padding: "11px 13px", borderLeft: `4px solid ${h.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: h.color, marginBottom: 3 }}>{h.emoji} {h.label}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.deck}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: h.color, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{h.metric}</span>
              </div>
              {h.sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{h.sub}</div>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #f3d4d4", fontSize: 10.5, color: "#a15b5b", lineHeight: 1.5 }}>
          {ui.footer}<br /><b style={{ color: "#dc2626" }}>tcgnote.net</b>
        </div>
      </div>
    </ShareCard>
  );
}
