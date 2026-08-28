"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { loadSprites, loadLogo, loadTypeIcon, drawTypeIcon, drawBrandTop, drawBrandFooter, saveDataUrl, shareDataUrl } from "./raid/raidShareUtil";
import { track } from "../../../lib/track";
import { isLocale, defaultLocale, type Locale } from "../../../lib/i18n";
import { typeLabel } from "./typeLabels";
import ShareModal from "./ShareModal";

// types = 영문 타입 키 배열(예: ["fire","flying"]). headerIcon = 영문 타입 키.
export type ShareItem = { dex: string; name: string; main: string; sub?: string; note?: string; types?: string[]; moves?: string; shadow?: boolean };

// 영문 타입 키 → 색. 라벨은 로케일별로 typeLabel(lang,key) 사용.
const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129", ice: "#37b6c9",
  fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0", psychic: "#ef4179", bug: "#91a119",
  rock: "#96843d", ghost: "#704170", dragon: "#5060e1", dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};

const UI: Record<string, { busy: string; share: string; save: string; close: string; footer: string }> = {
  ko: { busy: "이미지 생성 중…", share: "📤 공유", save: "💾 저장", close: "닫기", footer: "포켓몬GO 올인원 가이드" },
  en: { busy: "Generating image…", share: "📤 Share", save: "💾 Save", close: "Close", footer: "Pokémon GO all-in-one guide" },
  ja: { busy: "画像を生成中…", share: "📤 共有", save: "💾 保存", close: "閉じる", footer: "ポケモンGO オールインワンガイド" },
  "zh-TW": { busy: "產生圖片中…", share: "📤 分享", save: "💾 儲存", close: "關閉", footer: "寶可夢GO 一站式指南" },
};

export default function ListShare({
  title, subtitle, path, accent, items, buttonLabel, filename, footerTag, trackLabel = "list", headerIcon,
}: {
  title: string; subtitle?: string; path: string; accent: string;
  items: ShareItem[]; buttonLabel: string; filename: string; footerTag?: string; trackLabel?: string; headerIcon?: string;
}) {
  const params = useParams();
  const lang: Locale = isLocale(params?.lang as string) ? (params!.lang as Locale) : defaultLocale;
  const ui = UI[lang] || UI.ko;
  const footerText = footerTag || ui.footer;
  const [img, setImg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const url = `gblnote.com${path}`;

  const build = async () => {
    setBusy(true);
    try {
      const [imgs, logo, typeIcon] = await Promise.all([
        loadSprites(items.map((i) => i.dex)), loadLogo(),
        headerIcon ? loadTypeIcon(headerIcon) : Promise.resolve(null),
      ]);
      const W = 1080, rowH = 100, headH = 196, footH = 156;
      const H = headH + rowH * items.length + footH;
      const SCALE = 2;   // 공유 재압축 대비 고해상도 렌더
      const c = document.createElement("canvas"); c.width = W * SCALE; c.height = H * SCALE;
      const ctx = c.getContext("2d"); if (!ctx) { setBusy(false); return; }
      ctx.scale(SCALE, SCALE);
      // 라이트 테마: 연회색 바탕 + 흰 카드 + 상단 액센트 바
      ctx.fillStyle = "#eceff7"; ctx.fillRect(0, 0, W, H);
      const M = 22;
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.roundRect(M, M, W - M * 2, H - M * 2, 28); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.roundRect(M, M, W - M * 2, 14, 28); ctx.clip();
      ctx.fillStyle = accent; ctx.fillRect(M, M, W - M * 2, 20); ctx.restore();
      // 헤더
      drawBrandTop(ctx, logo, W, accent, 66);  // 상단 우측 로고(다운로드본 상단 브랜딩)
      let titleX = 52;
      if (headerIcon) {  // 좌측 상단 속성 아이콘(속성색 원 + 흰색 심볼)
        const cx = 96, cy = 96, r = 46;
        ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        if (typeIcon) drawTypeIcon(ctx, typeIcon, cx, cy, 54, "#ffffff");
        titleX = cx + r + 22;
      }
      // 제목 폭이 우상단 로고(GBL Note) 영역을 침범하지 않게 자동 축소 (일/영 긴 제목 대응)
      const brandLeft = W - 262; // drawBrandTop 우측 블록 좌단 근사(로고+GBL Note)
      const maxTitleW = brandLeft - titleX - 12;
      ctx.textAlign = "left"; ctx.fillStyle = "#0f172a";
      let tf = 56; ctx.font = `900 ${tf}px system-ui, sans-serif`;
      while (tf > 32 && ctx.measureText(title).width > maxTitleW) { tf -= 2; ctx.font = `900 ${tf}px system-ui, sans-serif`; }
      ctx.fillText(title, titleX, headerIcon ? 92 : 108);
      if (subtitle) {
        ctx.fillStyle = "#64748b";
        let sf = 30; ctx.font = `600 ${sf}px system-ui, sans-serif`;
        while (sf > 20 && ctx.measureText(subtitle).width > maxTitleW) { sf -= 2; ctx.font = `600 ${sf}px system-ui, sans-serif`; }
        ctx.fillText(subtitle, titleX + 2, headerIcon ? 138 : 158);
      }
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
        if (it.shadow) {  // 그림자 아우라
          const scx = 164, r2 = 48;
          const g = ctx.createRadialGradient(scx, cy, 0, scx, cy, r2);
          g.addColorStop(0, "#a855f7ee"); g.addColorStop(0.42, "#7c3aed99"); g.addColorStop(0.72, "rgba(124,58,237,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(scx, cy, r2, 0, Math.PI * 2); ctx.fill();
        }
        const im = imgs[it.dex]; if (im) ctx.drawImage(im, 122, cy - 42, 84, 84);
        const hasTypes = !!(it.types && it.types.length);
        const line2 = hasTypes || !!it.moves;  // 2번째 줄(타입 배지+기술) 유무
        ctx.textAlign = "left"; ctx.fillStyle = "#0f172a"; ctx.font = "700 40px system-ui, sans-serif";
        ctx.fillText(it.name, 222, line2 ? cy - 8 : cy + 4);
        if (it.note) { const nw = ctx.measureText(it.name).width; ctx.fillStyle = accent; ctx.font = "700 28px system-ui, sans-serif"; ctx.fillText(it.note, 222 + nw + 12, line2 ? cy - 10 : cy + 2); }
        if (line2) {  // 이름 아래: 타입 배지 + 추천 기술
          let bx = 222;
          if (hasTypes) {
            ctx.font = "700 22px system-ui, sans-serif";
            for (const tp of it.types!) {
              const label = typeLabel(lang, tp);
              ctx.textAlign = "left"; const bw = ctx.measureText(label).width + 20;
              ctx.fillStyle = TYPE_COLOR[tp] || "#94a3b8"; ctx.beginPath(); ctx.roundRect(bx, cy + 12, bw, 30, 8); ctx.fill();
              ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.fillText(label, bx + bw / 2, cy + 33);
              bx += bw + 6;
            }
            bx += 6;
          }
          if (it.moves) {  // 추천 기술(회색), 점수 칸 침범 안 하게 잘라줌
            ctx.textAlign = "left"; ctx.fillStyle = "#94a3b8"; ctx.font = "600 23px system-ui, sans-serif";
            const maxX = W - 210;
            let mv = it.moves;
            while (mv.length > 1 && bx + ctx.measureText(mv + "…").width > maxX && ctx.measureText(mv).width > maxX - bx) mv = mv.slice(0, -1);
            ctx.fillText(mv === it.moves ? mv : mv + "…", bx, cy + 33);
          }
        }
        ctx.textAlign = "right"; ctx.fillStyle = accent; ctx.font = "900 46px system-ui, sans-serif";
        ctx.fillText(it.main, W - 52, cy + (it.sub ? -6 : 14));
        if (it.sub) { ctx.fillStyle = "#94a3b8"; ctx.font = "600 27px system-ui, sans-serif"; ctx.fillText(it.sub, W - 52, cy + 32); }
      });
      // 푸터(로고+주소)
      const fy = headH + rowH * items.length;
      drawBrandFooter(ctx, logo, W, fy, footH, accent, footerText);

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
          <button onClick={() => { track("share", path, trackLabel); shareDataUrl(img, file, filename, title, `${title} · ${url}`); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: `linear-gradient(90deg,${accent},#7c3aed)`, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>{ui.share}</button>
          <button onClick={() => { track("download", path, trackLabel); saveDataUrl(img, filename); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "#334155", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>{ui.save}</button>
          <button onClick={() => setImg(null)} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #e3e8f2", background: "#f1f5f9", color: "#64748b", cursor: "pointer", fontSize: "0.9rem" }}>{ui.close}</button>
        </ShareModal>
      )}
    </>
  );
}
