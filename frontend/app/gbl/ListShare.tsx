"use client";
import { useState } from "react";
import { loadSprites, loadLogo, drawBrandTop, drawBrandFooter, saveDataUrl, shareDataUrl } from "./raid/raidShareUtil";
import { track } from "../../lib/track";
import ShareModal from "./ShareModal";

export type ShareItem = { dex: string; name: string; main: string; sub?: string; note?: string };

export default function ListShare({
  title, subtitle, path, accent, items, buttonLabel, filename, footerTag = "포켓몬GO 올인원 가이드", trackLabel = "list",
}: {
  title: string; subtitle?: string; path: string; accent: string;
  items: ShareItem[]; buttonLabel: string; filename: string; footerTag?: string; trackLabel?: string;
}) {
  const [img, setImg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const url = `gblnote.com${path}`;

  const build = async () => {
    setBusy(true);
    try {
      const [imgs, logo] = await Promise.all([loadSprites(items.map((i) => i.dex)), loadLogo()]);
      const W = 1080, rowH = 100, headH = 196, footH = 156;
      const H = headH + rowH * items.length + footH;
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d"); if (!ctx) { setBusy(false); return; }
      // 라이트 테마: 연회색 바탕 + 흰 카드 + 상단 액센트 바
      ctx.fillStyle = "#eceff7"; ctx.fillRect(0, 0, W, H);
      const M = 22;
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.roundRect(M, M, W - M * 2, H - M * 2, 28); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.roundRect(M, M, W - M * 2, 14, 28); ctx.clip();
      ctx.fillStyle = accent; ctx.fillRect(M, M, W - M * 2, 20); ctx.restore();
      // 헤더
      drawBrandTop(ctx, logo, W, accent, 66);  // 상단 우측 로고(다운로드본 상단 브랜딩)
      ctx.textAlign = "left"; ctx.fillStyle = "#0f172a"; ctx.font = "900 60px system-ui, sans-serif";
      ctx.fillText(title, 52, 108);
      if (subtitle) { ctx.fillStyle = "#64748b"; ctx.font = "600 32px system-ui, sans-serif"; ctx.fillText(subtitle, 54, 158); }
      // 행
      items.forEach((it, i) => {
        const y = headH + rowH * i;
        const cy = y + rowH / 2;
        if (i % 2 === 1) { ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.roundRect(40, y + 4, W - 80, rowH - 8, 12); ctx.fill(); }
        // 순위 배지(top3 컬러)
        const badge = i === 0 ? accent : i === 1 ? "#cbd5e1" : i === 2 ? "#fb923c" : null;
        if (badge) {
          ctx.fillStyle = badge; ctx.beginPath(); ctx.roundRect(52, cy - 26, 52, 52, 12); ctx.fill();
          ctx.textAlign = "center"; ctx.fillStyle = i === 1 ? "#475569" : "#ffffff"; ctx.font = "800 34px system-ui, sans-serif";
          ctx.fillText(String(i + 1), 78, cy + 12);
        } else {
          ctx.textAlign = "center"; ctx.fillStyle = "#94a3b8"; ctx.font = "700 34px system-ui, sans-serif";
          ctx.fillText(String(i + 1), 78, cy + 12);
        }
        const im = imgs[it.dex]; if (im) ctx.drawImage(im, 122, cy - 42, 84, 84);
        ctx.textAlign = "left"; ctx.fillStyle = "#0f172a"; ctx.font = "700 42px system-ui, sans-serif";
        ctx.fillText(it.name, 222, cy + 4);
        if (it.note) { const nw = ctx.measureText(it.name).width; ctx.fillStyle = accent; ctx.font = "700 30px system-ui, sans-serif"; ctx.fillText(it.note, 222 + nw + 12, cy + 2); }
        ctx.textAlign = "right"; ctx.fillStyle = accent; ctx.font = "900 46px system-ui, sans-serif";
        ctx.fillText(it.main, W - 52, cy + (it.sub ? -6 : 14));
        if (it.sub) { ctx.fillStyle = "#94a3b8"; ctx.font = "600 27px system-ui, sans-serif"; ctx.fillText(it.sub, W - 52, cy + 32); }
      });
      // 푸터(로고+주소)
      const fy = headH + rowH * items.length;
      drawBrandFooter(ctx, logo, W, fy, footH, accent, footerTag);

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
        <ShareModal img={img} onClose={() => setImg(null)}>
          <button onClick={() => { track("share", path, trackLabel); shareDataUrl(img, file, filename, title, `${title} · ${url}`); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: `linear-gradient(90deg,${accent},#7c3aed)`, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>📤 공유</button>
          <button onClick={() => { track("download", path, trackLabel); saveDataUrl(img, filename); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "#334155", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>💾 저장</button>
          <button onClick={() => setImg(null)} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #e3e8f2", background: "#f1f5f9", color: "#64748b", cursor: "pointer", fontSize: "0.9rem" }}>닫기</button>
        </ShareModal>
      )}
    </>
  );
}
