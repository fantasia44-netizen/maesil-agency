"use client";
import { useState } from "react";
import { saveDataUrl, shareDataUrl, loadSprites, loadImg, loadLogo, drawBrandFooter } from "../raidShareUtil";
import { shinySprite } from "../../sprite";
import { track } from "../../../../lib/track";
import ShareModal from "../../ShareModal";

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

export default function CpTable({ stats, hundoL20, hundoL25, name = "", accent = "#ea580c", dex = "", shiny = false }: { stats: Stats; hundoL20: number; hundoL25: number; name?: string; accent?: string; dex?: string; shiny?: boolean }) {
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const rows = COMBOS.map((iv) => ({ iv, pct: Math.round(((iv[0] + iv[1] + iv[2]) / 45) * 100), l20: cpAt(stats, iv, CPM_L20), l25: cpAt(stats, iv, CPM_L25) }))
    .sort((a, b) => (b.iv[0] + b.iv[1] + b.iv[2]) - (a.iv[0] + a.iv[1] + a.iv[2]) || b.l20 - a.l20);

  const buildImage = async () => {
    const W = 1080, headH = 210, rowH = 46, footH = 150;
    const H = headH + rowH * (rows.length + 1) + footH;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const [sprite, shinySp, logo] = await Promise.all([
      dex ? loadSprites([dex]).then((m) => m[dex]) : Promise.resolve(null),
      shiny && dex ? loadImg(shinySprite(dex)) : Promise.resolve(null),
      loadLogo(),
    ]);
    // 라이트 테마: 연회색 바탕 + 흰 카드 + 상단 액센트 바
    ctx.fillStyle = "#eceff7"; ctx.fillRect(0, 0, W, H);
    const M = 22;
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.roundRect(M, M, W - M * 2, H - M * 2, 28); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.roundRect(M, M, W - M * 2, 14, 28); ctx.clip();
    ctx.fillStyle = accent; ctx.fillRect(M, M, W - M * 2, 20); ctx.restore();
    // 보스 스프라이트(+이로치 가능 시 이로치 스프라이트) + 이름
    const S = 104; let sx = 52; const spY = 46;
    if (sprite) { ctx.drawImage(sprite, sx, spY, S, S); sx += S + 4; }
    if (shinySp) {
      ctx.drawImage(shinySp, sx, spY, S, S);
      ctx.textAlign = "center"; ctx.font = "26px system-ui, sans-serif";
      ctx.fillText("✨", sx + S - 12, spY + 24);
      sx += S + 4;
    }
    const nx = sprite || shinySp ? sx + 10 : 52;
    ctx.textAlign = "left"; ctx.fillStyle = "#0f172a"; ctx.font = "900 58px system-ui, sans-serif";
    ctx.fillText(name || "레이드 보스", nx, 104);
    ctx.fillStyle = "#64748b"; ctx.font = "700 32px system-ui, sans-serif";
    ctx.fillText(`100% CP  ${hundoL20.toLocaleString()}  ·  날씨 ${hundoL25.toLocaleString()}`, nx, 146);
    ctx.fillStyle = "#7c3aed"; ctx.font = "600 24px system-ui, sans-serif";
    ctx.fillText("💯 = 100% 개체 · 섀도우(그림자)는 13~15 개체값이면 정화 시 100% (모든 능력치 +2)", 52, 190);
    // 표 헤더
    const cols = [72, 470, 748, 1006];
    ctx.font = "700 29px system-ui, sans-serif"; ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "left"; ctx.fillText("개체값 (공/방/체)", cols[0], headH + 28);
    ctx.textAlign = "right"; ctx.fillText("%", cols[1], headH + 28);
    ctx.fillText("일반 L20", cols[2], headH + 28);
    ctx.fillText("날씨 L25", cols[3], headH + 28);
    rows.forEach((r, i) => {
      const y = headH + rowH * (i + 1) + 33;
      const hundo = r.pct === 100;
      if (hundo) { ctx.fillStyle = "#fff1f2"; ctx.beginPath(); ctx.roundRect(48, y - 34, W - 96, rowH - 4, 8); ctx.fill(); }
      const col = hundo ? "#e11d48" : "#334155";
      ctx.font = `${hundo ? 800 : 500} 32px system-ui, sans-serif`;
      ctx.textAlign = "left"; ctx.fillStyle = col;
      ctx.fillText(`${hundo ? "💯 " : ""}${r.iv.join(" / ")}`, cols[0], y);
      ctx.textAlign = "right"; ctx.fillStyle = hundo ? col : "#94a3b8"; ctx.font = `${hundo ? 800 : 500} 30px system-ui, sans-serif`;
      ctx.fillText(`${r.pct}%`, cols[1], y);
      ctx.fillStyle = col; ctx.font = `${hundo ? 800 : 600} 32px system-ui, sans-serif`;
      ctx.fillText(r.l20.toLocaleString(), cols[2], y);
      ctx.fillText(r.l25.toLocaleString(), cols[3], y);
    });
    const fy = headH + rowH * (rows.length + 1);
    drawBrandFooter(ctx, logo, W, fy, footH, accent, "포켓몬GO 레이드 보스 CP 정보");
    setImg(c.toDataURL("image/png"));
    setFile(null);
    c.toBlob((b) => { if (b) setFile(new File([b], `gbl-cp-${name || "boss"}.png`, { type: "image/png" })); }, "image/png");
  };

  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #e3e8f2" }}>
      <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: open ? 8 : 0, lineHeight: 1.5 }}>
        잡은 CP가 <b style={{ color: "#c2410c" }}>{hundoL20.toLocaleString()}</b>(날씨 <b style={{ color: "#c2410c" }}>{hundoL25.toLocaleString()}</b>)이면 <b style={{ color: "#c2410c" }}>100개체</b>! · <b style={{ color: "#7c3aed" }}>섀도우(그림자)</b>는 13~15 개체값이면 정화 시 100% (정화=모든 능력치 +2)
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
            const bg = hundo ? "#fff1e6" : "transparent";
            const col = hundo ? "#c2410c" : "#334155";
            const fw = hundo ? 800 : 500;
            return (
              <div key={r.iv.join("")} style={{ display: "flex", fontSize: "0.72rem", padding: "2px 4px", background: bg, borderRadius: 4, alignItems: "baseline" }}>
                <span style={{ flex: 1.5, fontWeight: fw, color: col }}>{hundo ? "💯 " : ""}{r.iv.join(" / ")}</span>
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
        <ShareModal img={img} onClose={() => setImg(null)}>
          <button onClick={() => { track("share", "/gbl/raid/bosses", "cp-table"); shareDataUrl(img, file, `gbl-cp-${name || "boss"}.png`, `${name} 100% CP`, `${name} 레이드 CP · gblnote.com`); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: `linear-gradient(90deg,${accent},#7c3aed)`, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>📤 공유</button>
          <button onClick={() => { track("download", "/gbl/raid/bosses", "cp-table"); saveDataUrl(img, `gbl-cp-${name || "boss"}.png`); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "#334155", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>💾 저장</button>
          <button onClick={() => setImg(null)} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #e3e8f2", background: "#f1f5f9", color: "#64748b", cursor: "pointer", fontSize: "0.9rem" }}>닫기</button>
        </ShareModal>
      )}
    </div>
  );
}
