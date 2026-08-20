"use client";
import { useState } from "react";
import { loadSprites, saveDataUrl, shareDataUrl } from "./raid/raidShareUtil";
import { track } from "../../lib/track";

export type ShareItem = { dex: string; name: string; main: string; sub?: string; note?: string };

export default function ListShare({
  title, subtitle, path, accent, items, buttonLabel, filename,
}: {
  title: string; subtitle?: string; path: string; accent: string;
  items: ShareItem[]; buttonLabel: string; filename: string;
}) {
  const [img, setImg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const url = `gblnote.com${path}`;

  const build = async () => {
    setBusy(true);
    try {
      const imgs = await loadSprites(items.map((i) => i.dex));
      const W = 1080, rowH = 96, headH = 188, footH = 168;
      const H = headH + rowH * items.length + footH;
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d"); if (!ctx) { setBusy(false); return; }
      // 배경
      ctx.fillStyle = "#0f1225"; ctx.fillRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, accent); g.addColorStop(1, "#7c3aed");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 12);
      // 헤더
      ctx.textAlign = "left"; ctx.fillStyle = "#ffffff"; ctx.font = "900 62px system-ui, sans-serif";
      ctx.fillText(title, 44, 96);
      if (subtitle) { ctx.fillStyle = "#93a4cf"; ctx.font = "600 34px system-ui, sans-serif"; ctx.fillText(subtitle, 46, 148); }
      // 행
      items.forEach((it, i) => {
        const y = headH + rowH * i;
        if (i % 2 === 0) { ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fillRect(24, y, W - 48, rowH - 8); }
        ctx.textAlign = "left"; ctx.font = "800 40px system-ui, sans-serif";
        ctx.fillStyle = i < 3 ? accent : "#64748b";
        ctx.fillText(String(i + 1), 44, y + rowH / 2 + 14);
        const im = imgs[it.dex]; if (im) ctx.drawImage(im, 96, y + 8, 80, 80);
        ctx.fillStyle = "#f1f5f9"; ctx.font = "700 42px system-ui, sans-serif";
        ctx.fillText(it.name, 188, y + rowH / 2 + 2);
        if (it.note) { const nw = ctx.measureText(it.name).width; ctx.fillStyle = "#fbbf24"; ctx.font = "700 30px system-ui, sans-serif"; ctx.fillText(it.note, 188 + nw + 12, y + rowH / 2 + 2); }
        ctx.textAlign = "right"; ctx.fillStyle = "#ffffff"; ctx.font = "900 46px system-ui, sans-serif";
        ctx.fillText(it.main, W - 44, y + rowH / 2 - (it.sub ? 10 : -12));
        if (it.sub) { ctx.fillStyle = "#8ea6ff"; ctx.font = "600 28px system-ui, sans-serif"; ctx.fillText(it.sub, W - 44, y + rowH / 2 + 30); }
      });
      // 푸터(출처/주소)
      const fy = headH + rowH * items.length;
      ctx.textAlign = "center";
      ctx.fillStyle = accent; ctx.font = "900 62px system-ui, sans-serif";
      ctx.fillText("gblnote.com", W / 2, fy + 94);
      ctx.fillStyle = "#93a4cf"; ctx.font = "600 30px system-ui, sans-serif";
      ctx.fillText("포켓몬GO 올인원 · GBL Note", W / 2, fy + 138);

      setImg(c.toDataURL("image/png"));
      setFile(null);
      c.toBlob((b) => { if (b) setFile(new File([b], filename, { type: "image/png" })); }, "image/png");
    } finally { setBusy(false); }
  };

  return (
    <>
      <button onClick={build} disabled={busy}
        style={{ width: "100%", marginTop: 14, padding: "11px", borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer", fontWeight: 800, fontSize: "0.9rem", background: busy ? "#cbd5e1" : `linear-gradient(90deg,${accent},#7c3aed)`, color: "#fff" }}>
        {busy ? "이미지 생성 중…" : buttonLabel}
      </button>
      {img && (
        <div onClick={() => setImg(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.72)", zIndex: 10000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16, gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="공유 이미지" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "72vh", borderRadius: 12, boxShadow: "0 10px 40px rgba(0,0,0,.4)" }} />
          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { track("share", path); shareDataUrl(img, file, filename, title, `${title} · ${url}`); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: `linear-gradient(90deg,${accent},#7c3aed)`, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>📤 공유</button>
            <button onClick={() => { track("download", path); saveDataUrl(img, filename); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "#334155", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>💾 저장</button>
            <button onClick={() => setImg(null)} style={{ padding: "11px 16px", borderRadius: 10, border: "none", background: "rgba(255,255,255,.15)", color: "#e2e8f0", cursor: "pointer", fontSize: "0.9rem" }}>닫기</button>
          </div>
          <div style={{ fontSize: "0.74rem", color: "#cbd5e1" }}>이미지를 길게 눌러 저장하거나 캡처해도 됩니다</div>
        </div>
      )}
    </>
  );
}
