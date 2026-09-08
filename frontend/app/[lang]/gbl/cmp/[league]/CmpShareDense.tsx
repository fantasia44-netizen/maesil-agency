"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { loadSprites, loadLogo, drawBrandTop, drawBrandFooter, saveDataUrl, shareDataUrl } from "../../raid/raidShareUtil";
import { track } from "../../../../../lib/track";
import { isLocale, defaultLocale, type Locale } from "../../../../../lib/i18n";
import { typeLabel } from "../../typeLabels";
import ShareModal from "../../ShareModal";

// CMP 3열 고밀도 공유 카드 — 순위·타입·티어·공격력 + 추천 빠른기술 + 차지기술별 타수.
// 웹 그리드와 동일 데이터(page.tsx에서 조립해 prop 전달). Canvas로 렌더(스프라이트/공유는 raidShareUtil 재활용).
export type CmpMoveDisp = { label: string; color: string };
export type CmpVariant = { fast: CmpMoveDisp; charged: { label: string; color: string; counts: number[] }[] };
export type CmpShareItem = {
  dex: string; name: string; atk: string; tier: string; types: string[]; variants: CmpVariant[];
};

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129", ice: "#37b6c9",
  fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0", psychic: "#ef4179", bug: "#91a119",
  rock: "#96843d", ghost: "#704170", dragon: "#5060e1", dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a", D: "#64748b" };
const UI: Record<string, { busy: string; share: string; save: string; close: string }> = {
  ko: { busy: "이미지 생성 중…", share: "📤 공유", save: "💾 저장", close: "닫기" },
  en: { busy: "Generating…", share: "📤 Share", save: "💾 Save", close: "Close" },
  ja: { busy: "画像を生成中…", share: "📤 共有", save: "💾 保存", close: "閉じる" },
  "zh-TW": { busy: "產生圖片中…", share: "📤 分享", save: "💾 儲存", close: "關閉" },
};

function trunc(ctx: CanvasRenderingContext2D, s: string, maxW: number): string {
  if (ctx.measureText(s).width <= maxW) return s;
  let t = s; while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

export default function CmpShareDense({
  title, subtitle, path, items, buttonLabel, filename, footerTag, hitsUnit, accent = "#0891b2",
}: {
  title: string; subtitle: string; path: string; items: CmpShareItem[];
  buttonLabel: string; filename: string; footerTag: string; hitsUnit: string; accent?: string;
}) {
  const params = useParams();
  const lang: Locale = isLocale(params?.lang as string) ? (params!.lang as Locale) : defaultLocale;
  const ui = UI[lang] || UI.ko;
  const [img, setImg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const url = `gblnote.com${path}`;

  const build = async () => {
    setBusy(true);
    try {
      const [imgs, logo] = await Promise.all([loadSprites(items.map((i) => i.dex)), loadLogo()]);
      const COLS = 3, W = 1240, M = 22, gap = 12, rowGap = 10;
      const colW = Math.floor((W - M * 2 - gap * (COLS - 1)) / COLS);
      const headH = 168, footH = 150;
      const HEADER = 92, VGAP = 8, ROW = 30, PAD = 16;   // 셀 내부 높이 상수
      const itemH = (it: CmpShareItem) => HEADER + it.variants.reduce((s, v, vi) => s + (vi ? VGAP : 0) + ROW + v.charged.length * ROW, 0) + PAD;
      // 행별 높이(그 행 3칸 중 최대) — 변형 많은 몬이 있어도 침범 없이 정렬.
      const rowsN = Math.ceil(items.length / COLS);
      const rowHs: number[] = [], rowY: number[] = [];
      let yy = headH;
      for (let r = 0; r < rowsN; r++) {
        let m = 0; for (let cI = 0; cI < COLS; cI++) { const it = items[r * COLS + cI]; if (it) m = Math.max(m, itemH(it)); }
        rowHs.push(m); rowY.push(yy); yy += m + rowGap;
      }
      const gridBottom = yy - rowGap;
      const H = gridBottom + footH;
      const SCALE = 2;
      const c = document.createElement("canvas"); c.width = W * SCALE; c.height = H * SCALE;
      const ctx = c.getContext("2d"); if (!ctx) { setBusy(false); return; }
      ctx.scale(SCALE, SCALE);
      ctx.fillStyle = "#eceff7"; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.beginPath(); ctx.roundRect(M, M, W - M * 2, 12, 8); ctx.clip(); ctx.fillStyle = accent; ctx.fillRect(M, M, W - M * 2, 16); ctx.restore();
      drawBrandTop(ctx, logo, W, accent, 60);
      ctx.textAlign = "left"; ctx.fillStyle = "#0f172a";
      let tf = 50; ctx.font = `900 ${tf}px system-ui, sans-serif`;
      while (tf > 30 && ctx.measureText(title).width > W - 320) { tf -= 2; ctx.font = `900 ${tf}px system-ui, sans-serif`; }
      ctx.fillText(title, M + 16, 84);
      ctx.fillStyle = "#64748b"; ctx.font = "600 26px system-ui, sans-serif"; ctx.fillText(subtitle, M + 18, 122);

      items.forEach((it, i) => {
        const col = i % COLS, row = Math.floor(i / COLS);
        const x = M + col * (colW + gap), y = rowY[row], h = rowHs[row], w = colW;
        const tc = TYPE_COLOR[it.types[0]] || "#cbd5e1";
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.fill();
        ctx.fillStyle = tc; ctx.beginPath(); ctx.roundRect(x, y + 10, 6, h - 20, 3); ctx.fill();
        ctx.textAlign = "left"; ctx.fillStyle = i < 3 ? "#dc2626" : "#94a3b8"; ctx.font = "800 24px system-ui, sans-serif";
        ctx.fillText("#" + (i + 1), x + 18, y + 38);
        const im = imgs[it.dex]; if (im) ctx.drawImage(im, x + 54, y + 10, 52, 52);
        ctx.fillStyle = "#0f172a"; ctx.font = "800 27px system-ui, sans-serif";
        ctx.fillText(trunc(ctx, it.name, w - 220), x + 114, y + 40);
        ctx.textAlign = "right"; ctx.fillStyle = accent; ctx.font = "900 32px system-ui, sans-serif";
        ctx.fillText(it.atk, x + w - 16, y + 40);
        // 티어 + 타입 배지
        let bx = x + 18; const by = y + 58;
        ctx.textAlign = "center"; ctx.fillStyle = TIER_COLOR[it.tier] || "#64748b";
        ctx.beginPath(); ctx.roundRect(bx, by, 30, 26, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "800 18px system-ui, sans-serif"; ctx.fillText(it.tier, bx + 15, by + 19); bx += 38;
        ctx.font = "700 20px system-ui, sans-serif";
        for (const tp of it.types) {
          const label = typeLabel(lang, tp); ctx.textAlign = "left"; const bw = ctx.measureText(label).width + 18;
          ctx.fillStyle = TYPE_COLOR[tp] || "#94a3b8"; ctx.beginPath(); ctx.roundRect(bx, by, bw, 26, 7); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(label, bx + bw / 2, by + 19); bx += bw + 5;
        }
        // 변형(빠른기술 블록)들 — yc 누적으로 침범 없이 스택
        let yc = y + HEADER;
        it.variants.forEach((v, vi) => {
          if (vi) { yc += VGAP; ctx.strokeStyle = "#eef2f8"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 18, yc - VGAP / 2); ctx.lineTo(x + w - 16, yc - VGAP / 2); ctx.stroke(); }
          ctx.textAlign = "left"; ctx.font = "700 21px system-ui, sans-serif";
          const fw = ctx.measureText(v.fast.label).width + 20;
          ctx.fillStyle = v.fast.color; ctx.beginPath(); ctx.roundRect(x + 18, yc, fw, 28, 8); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(v.fast.label, x + 18 + fw / 2, yc + 20);
          yc += ROW;
          v.charged.forEach((ch) => {
            ctx.fillStyle = ch.color; ctx.beginPath(); ctx.arc(x + 26, yc + 8, 5, 0, Math.PI * 2); ctx.fill();
            const cntTxt = ch.counts.join("·") + hitsUnit;
            ctx.font = "700 21px system-ui, sans-serif"; const cntW = ctx.measureText(cntTxt).width;
            ctx.textAlign = "left"; ctx.fillStyle = "#334155"; ctx.font = "600 21px system-ui, sans-serif";
            ctx.fillText(trunc(ctx, ch.label, w - 60 - cntW - 16), x + 40, yc + 15);
            ctx.textAlign = "right"; ctx.fillStyle = "#94a3b8"; ctx.font = "700 21px system-ui, sans-serif";
            ctx.fillText(cntTxt, x + w - 16, yc + 15);
            yc += ROW;
          });
        });
      });

      drawBrandFooter(ctx, logo, W, gridBottom, footH, accent, footerTag);
      setImg(c.toDataURL("image/png"));
      setFile(null);
      c.toBlob((b) => { if (b) setFile(new File([b], filename, { type: "image/png" })); }, "image/png");
    } finally { setBusy(false); }
  };

  return (
    <>
      <button onClick={build} disabled={busy}
        style={{ width: "100%", marginTop: 14, padding: "11px", borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer", fontWeight: 800, fontSize: "0.9rem", background: busy ? "#cbd5e1" : `linear-gradient(90deg,${accent},#7c3aed)`, color: "#fff" }}>
        {busy ? ui.busy : buttonLabel}
      </button>
      {img && (
        <ShareModal img={img} onClose={() => setImg(null)}>
          <button onClick={() => { track("share", path, "cmp-rank"); shareDataUrl(img, file, filename, title, `${title} · ${url}`); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: `linear-gradient(90deg,${accent},#7c3aed)`, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>{ui.share}</button>
          <button onClick={() => { track("download", path, "cmp-rank"); saveDataUrl(img, filename); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "#334155", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>{ui.save}</button>
          <button onClick={() => setImg(null)} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #e3e8f2", background: "#f1f5f9", color: "#64748b", cursor: "pointer", fontSize: "0.9rem" }}>{ui.close}</button>
        </ShareModal>
      )}
    </>
  );
}
