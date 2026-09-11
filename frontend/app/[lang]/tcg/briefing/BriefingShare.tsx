"use client";
// 이번 주 브리핑 요약 공유카드 — 보이는 DOM을 html-to-image로 PNG 캡처(WYSIWYG).
// 공유/저장 시 tcg 자체계측(track share/download) 발사 = 바이럴 측정.
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { track } from "../../../../lib/track";

export type Highlight = { emoji: string; label: string; deck: string; metric: string; sub?: string; color: string };
type UI = { share: string; save: string; title: string; footer: string };

export default function BriefingShare({ highlights, ui, dateLabel }: { highlights: Highlight[]; ui: UI; dateLabel: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function render(): Promise<string | null> {
    if (!cardRef.current) return null;
    return toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
  }

  async function onShare() {
    setBusy(true);
    try {
      const url = await render();
      if (!url) return;
      track("share", "/tcg/briefing", "weekly-briefing", "tcg");
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "tcg-briefing.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: ui.title, text: `${ui.title} · tcgnote.net` });
      } else {
        save(url); // 공유 미지원 → 저장 폴백
      }
    } catch { /* 사용자 취소 등 무시 */ } finally { setBusy(false); }
  }

  async function onSave() {
    setBusy(true);
    try {
      const url = await render();
      if (!url) return;
      track("download", "/tcg/briefing", "weekly-briefing", "tcg");
      save(url);
    } catch { /* noop */ } finally { setBusy(false); }
  }

  function save(url: string) {
    const a = document.createElement("a");
    a.href = url; a.download = "tcg-briefing.png"; a.click();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      {/* 캡처 대상 카드 (1080폭 기준, 화면에선 축소) */}
      <div style={{ width: "100%", maxWidth: 420, overflow: "hidden", borderRadius: 16, boxShadow: "0 4px 24px rgba(220,38,38,0.12)" }}>
        <div ref={cardRef} style={{ width: 420, background: "linear-gradient(160deg,#fee6e6,#fef7f5)", padding: "22px 22px 18px", fontFamily: "system-ui,'Malgun Gothic',sans-serif" }}>
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
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onShare} disabled={busy} style={btn("#dc2626")}>📤 {ui.share}</button>
        <button onClick={onSave} disabled={busy} style={btn("#334155")}>⬇️ {ui.save}</button>
      </div>
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return { padding: "10px 18px", borderRadius: 10, border: "none", background: bg, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.9rem" };
}
