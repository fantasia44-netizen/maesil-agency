"use client";
import { useState } from "react";
import { loadSprites, loadLogo, drawBrandFooter, saveDataUrl, shareDataUrl } from "../../../raid/raidShareUtil";
import { track } from "../../../../../../lib/track";
import ShareModal from "../../../ShareModal";
import type { PokeShareDict } from "./dict";

export type PkShare = {
  name: string; dex: string; types: { label: string; color: string }[]; tier: string; tierColor: string;
  league: string; pickRate?: number | null; accent: string; shadow?: boolean;
  fastMove?: string; chargedMoves: { name: string; counts?: number[] }[];
  stats: { atk: number; def: number; hp: number };
  wins: { dex: string; name: string; rating: number }[];
  counters: { dex: string; name: string; rating: number }[];
  t: PokeShareDict;
  path: string;
};

export default function PokemonShare(p: PkShare) {
  const t = p.t;
  const [img, setImg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const build = async () => {
    setBusy(true);
    try {
      const win = p.wins.slice(0, 5), cnt = p.counters.slice(0, 5);
      const dexes = [p.dex, ...win.map((c) => c.dex), ...cnt.map((c) => c.dex)];
      const [imgs, logo] = await Promise.all([loadSprites(dexes), loadLogo()]);
      const rows = Math.max(win.length, cnt.length);
      const W = 1080, M = 22;
      // 기술칩을 폭에 맞춰 줄바꿈 배치(일/영 긴 기술명 겹침 방지) → moveH 동적 계산
      type Chip = { name: string; cntTxt: string; fast: boolean; nameW: number; w: number };
      const ms = document.createElement("canvas").getContext("2d")!;
      const chips: Chip[] = [];
      if (p.fastMove) { ms.font = "700 30px system-ui, sans-serif"; chips.push({ name: p.fastMove, cntTxt: "", fast: true, nameW: ms.measureText(p.fastMove).width, w: ms.measureText(p.fastMove).width + 34 }); }
      for (const cm of p.chargedMoves) {
        const cntTxt = cm.counts && cm.counts.length ? `  ${cm.counts.join("·")}${t.hitsUnit}` : "";
        ms.font = "700 30px system-ui, sans-serif"; const nameW = ms.measureText(cm.name).width;
        ms.font = "700 24px system-ui, sans-serif"; const cntW = cntTxt ? ms.measureText(cntTxt).width : 0;
        chips.push({ name: cm.name, cntTxt, fast: false, nameW, w: nameW + cntW + 34 });
      }
      const maxRowW = W - 112; // 좌우 여백 버퍼 확보(칩이 카드 가장자리 침범 방지)
      const chipRows: Chip[][] = [[]]; let curW = 0;
      for (const ch of chips) { if (curW > 0 && curW + ch.w > maxRowW) { chipRows.push([]); curW = 0; } chipRows[chipRows.length - 1].push(ch); curW += ch.w + 12; }
      const headH = 250, moveH = 60 + chipRows.length * 56, statH = 200, cntHead = 64, cntRowH = 72, footH = 150;
      const H = headH + moveH + statH + cntHead + cntRowH * rows + footH;
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d"); if (!ctx) { setBusy(false); return; }
      // 라이트 카드
      ctx.fillStyle = "#eceff7"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.roundRect(M, M, W - M * 2, H - M * 2, 28); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.roundRect(M, M, W - M * 2, 14, 28); ctx.clip();
      ctx.fillStyle = p.accent; ctx.fillRect(M, M, W - M * 2, 20); ctx.restore();

      // 헤더: 스프라이트 + 이름 + 타입 + 티어
      const sp = imgs[p.dex];
      if (p.shadow) {  // 그림자 아우라
        const scx = 108, scy = 124, rr = 74;
        const g = ctx.createRadialGradient(scx, scy, 0, scx, scy, rr);
        g.addColorStop(0, "#a855f7ee"); g.addColorStop(0.42, "#7c3aed99"); g.addColorStop(0.72, "rgba(124,58,237,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(scx, scy, rr, 0, Math.PI * 2); ctx.fill();
      }
      if (sp) ctx.drawImage(sp, 44, 60, 128, 128);
      const nx = 190;
      // 이름이 티어배지(좌단 W-150) 침범 않게 폰트 자동 축소 (긴 폼명·일/영 대응)
      const maxNameW = (W - 150) - nx - 18;
      ctx.textAlign = "left"; ctx.fillStyle = "#0f172a";
      let nf = 62; ctx.font = `900 ${nf}px system-ui, sans-serif`;
      while (nf > 32 && ctx.measureText(p.name).width > maxNameW) { nf -= 2; ctx.font = `900 ${nf}px system-ui, sans-serif`; }
      ctx.fillText(p.name, nx, 118);
      // 타입 배지
      let tx = nx;
      ctx.font = "700 26px system-ui, sans-serif";
      for (const ty of p.types) {
        const tw = ctx.measureText(ty.label).width + 26;
        ctx.fillStyle = ty.color || "#94a3b8"; ctx.beginPath(); ctx.roundRect(tx, 140, tw, 40, 10); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(ty.label, tx + tw / 2, 168);
        ctx.textAlign = "left"; tx += tw + 8;
      }
      ctx.fillStyle = "#94a3b8"; ctx.font = "600 26px system-ui, sans-serif";
      ctx.fillText(`· ${p.league}`, tx + 4, 168);
      // 티어 배지(우측)
      ctx.fillStyle = p.tierColor; ctx.beginPath(); ctx.roundRect(W - 150, 66, 96, 96, 18); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "900 62px system-ui, sans-serif";
      ctx.fillText(p.tier, W - 102, 132);
      ctx.fillStyle = "#94a3b8"; ctx.font = "600 22px system-ui, sans-serif";
      ctx.fillText(t.tierLabel, W - 102, 182);
      if (p.pickRate != null) {
        ctx.textAlign = "left"; ctx.fillStyle = "#334155"; ctx.font = "700 30px system-ui, sans-serif";
        ctx.fillText(`${t.pickPrefix} ${p.pickRate}%`, 46, 226);
      }

      // 추천 기술배치 (줄바꿈 배치)
      let y = headH;
      ctx.textAlign = "left"; ctx.fillStyle = "#0f172a"; ctx.font = "800 32px system-ui, sans-serif";
      ctx.fillText(t.movesetH, 46, y + 20);
      chipRows.forEach((row, ri) => {
        let mx = 46; const my = y + 78 + ri * 56;
        for (const ch of row) {
          ctx.beginPath(); ctx.roundRect(mx, my - 34, ch.w, 48, 12);
          ctx.fillStyle = ch.fast ? "#eef2ff" : "#f1f5f9"; ctx.fill();
          ctx.textAlign = "left";
          ctx.fillStyle = ch.fast ? "#3b5bdb" : "#475569"; ctx.font = "700 30px system-ui, sans-serif";
          ctx.fillText(ch.name, mx + 17, my);
          if (ch.cntTxt) { ctx.fillStyle = "#ea580c"; ctx.font = "700 24px system-ui, sans-serif"; ctx.fillText(ch.cntTxt, mx + 17 + ch.nameW, my); }
          mx += ch.w + 12;
        }
      });

      // 종족값
      y = headH + moveH;
      ctx.fillStyle = "#0f172a"; ctx.font = "800 32px system-ui, sans-serif";
      ctx.fillText(t.statsH, 46, y + 20);
      const bars: [string, number, number, string][] = [
        [t.atk, p.stats.atk, 300, "#ef4444"], [t.def, p.stats.def, 300, "#3b82f6"], [t.hp, p.stats.hp, 250, "#22c55e"],
      ];
      const barX = 210, barW = 690; // 라벨(공/방/체·こうげき 등 최대 4글자) 여백 확보 후 막대 시작
      bars.forEach((b, i) => {
        const by = y + 60 + i * 42;
        ctx.fillStyle = "#64748b"; ctx.font = "600 26px system-ui, sans-serif"; ctx.textAlign = "left";
        ctx.fillText(b[0], 46, by + 20);
        ctx.fillStyle = "#e5eaf3"; ctx.beginPath(); ctx.roundRect(barX, by, barW, 24, 8); ctx.fill();
        ctx.fillStyle = b[3]; ctx.beginPath(); ctx.roundRect(barX, by, Math.min(barW, (b[1] / b[2]) * barW), 24, 8); ctx.fill();
        ctx.fillStyle = "#0f172a"; ctx.font = "800 26px system-ui, sans-serif"; ctx.textAlign = "right";
        ctx.fillText(String(b[1]), W - 46, by + 20);
      });

      // 이기는 상대(좌) / 지는 상대=카운터(우) 2단
      y = headH + moveH + statH;
      const colW = 500, LX = 40, RX = 540;
      ctx.textAlign = "left"; ctx.font = "800 30px system-ui, sans-serif";
      ctx.fillStyle = "#16a34a"; ctx.fillText(`⚔️ ${t.winLabel}`, LX + 6, y + 26);
      ctx.fillStyle = "#dc2626"; ctx.fillText(`🛡️ ${t.loseLabel}`, RX + 6, y + 26);
      // 이름을 폭에 맞게 자르기
      const fit = (s: string, max: number) => {
        if (ctx.measureText(s).width <= max) return s;
        let t = s; while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
        return t + "…";
      };
      const drawCol = (arr: typeof win, colX: number, rateColor: string) => {
        arr.forEach((o, i) => {
          const ry = y + cntHead + i * cntRowH;
          if (i % 2 === 0) { ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.roundRect(colX, ry, colW, cntRowH - 8, 12); ctx.fill(); }
          const sp2 = imgs[o.dex]; if (sp2) ctx.drawImage(sp2, colX + 8, ry + 4, 56, 56);
          ctx.textAlign = "right"; ctx.fillStyle = rateColor; ctx.font = "800 30px system-ui, sans-serif";
          ctx.fillText(String(o.rating), colX + colW - 14, ry + cntRowH / 2 + 3);
          const rateW = ctx.measureText(String(o.rating)).width;
          ctx.textAlign = "left"; ctx.fillStyle = "#0f172a"; ctx.font = "700 29px system-ui, sans-serif";
          ctx.fillText(fit(o.name, colW - 76 - rateW - 24), colX + 74, ry + cntRowH / 2 + 3);
        });
      };
      drawCol(win, LX, "#16a34a");
      drawCol(cnt, RX, "#dc2626");

      drawBrandFooter(ctx, logo, W, headH + moveH + statH + cntHead + cntRowH * rows, footH, p.accent, `${t.gameWord} ${p.league} ${t.cardWord}`);

      setImg(c.toDataURL("image/png"));
      setFile(null);
      c.toBlob((b) => { if (b) setFile(new File([b], `gbl-${p.name}.png`, { type: "image/png" })); }, "image/png");
    } finally { setBusy(false); }
  };

  const fn = `gbl-${p.name}.png`;
  return (
    <>
      <button onClick={build} disabled={busy}
        style={{ width: "100%", marginTop: 12, padding: "11px", borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer", fontWeight: 800, fontSize: "0.9rem", background: busy ? "#cbd5e1" : `linear-gradient(90deg,${p.accent},#7c3aed)`, color: "#fff" }}>
        {busy ? t.building : `📸 ${p.name} ${t.cardWord} ${t.shareSaveWord}`}
      </button>
      {img && (
        <ShareModal img={img} onClose={() => setImg(null)}>
          <button onClick={() => { track("share", p.path, "pokemon-card"); shareDataUrl(img, file, fn, `${p.name} ${p.league}`, `${p.name} ${t.cardWord} · gblnote.com`); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: `linear-gradient(90deg,${p.accent},#7c3aed)`, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>{t.shareBtn}</button>
          <button onClick={() => { track("download", p.path, "pokemon-card"); saveDataUrl(img, fn); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "#334155", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>{t.saveBtn}</button>
          <button onClick={() => setImg(null)} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #e3e8f2", background: "#f1f5f9", color: "#64748b", cursor: "pointer", fontSize: "0.9rem" }}>{t.closeBtn}</button>
        </ShareModal>
      )}
    </>
  );
}
