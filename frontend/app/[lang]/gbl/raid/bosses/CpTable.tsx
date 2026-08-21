"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { saveDataUrl, shareDataUrl, loadSprites, loadImg, loadLogo, drawBrandTop, drawBrandFooter } from "../raidShareUtil";
import { shinySprite } from "../../sprite";
import { track } from "../../../../../lib/track";
import { isLocale, defaultLocale, type Locale } from "../../../../../lib/i18n";
import ShareModal from "../../ShareModal";

// CpTable 문구(3개국어) — 자체 useParams로 로케일 판별(호출부 변경 불필요).
type CpDict = {
  boss: string; cpSuffix: string; weather: string; hundoNote: string;
  ivHead: string; normalL20: string; weatherL25: string; footer: string;
  tipPre: string; tipMid1: string; tipMid2: string; tipHundo: string; tipBang: string; tipShadow: string; tipPost: string;
  close: string; openBtn: string; ivShort: string; saveShareBtn: string; cpShareText: string;
  share: string; save: string; closeBtn: string;
};
const T: Record<string, CpDict> = {
  ko: {
    boss: "레이드 보스", cpSuffix: "100% CP", weather: "날씨",
    hundoNote: "💯 = 100% 개체 · 섀도우(그림자)는 13~15 개체값이면 정화 시 100% (모든 능력치 +2)",
    ivHead: "개체값 (공/방/체)", normalL20: "일반 L20", weatherL25: "날씨 L25", footer: "포켓몬GO 레이드 보스 CP 정보",
    tipPre: "잡은 CP가 ", tipMid1: "(날씨 ", tipMid2: ")이면 ", tipHundo: "100개체", tipBang: "! · ", tipShadow: "섀도우(그림자)", tipPost: "는 13~15 개체값이면 정화 시 100% (정화=모든 능력치 +2)",
    close: "▲ CP표 닫기", openBtn: "▼ 개체값별 CP표 (13~15)", ivShort: "개체값", saveShareBtn: "📸 이 CP표 이미지 저장·공유", cpShareText: "레이드 CP · gblnote.com",
    share: "📤 공유", save: "💾 저장", closeBtn: "닫기",
  },
  en: {
    boss: "Raid Boss", cpSuffix: "100% CP", weather: "Weather",
    hundoNote: "💯 = 100% IV · Shadow: at 13–15 IVs, purifying gives 100% (all stats +2)",
    ivHead: "IV (Atk/Def/HP)", normalL20: "Normal L20", weatherL25: "Weather L25", footer: "Pokémon GO Raid Boss CP",
    tipPre: "If the CP you catch is ", tipMid1: "(weather ", tipMid2: "), it's a ", tipHundo: "100% IV", tipBang: "! · ", tipShadow: "Shadow", tipPost: " reaches 100% at 13–15 IVs after purifying (purify = all stats +2)",
    close: "▲ Close CP table", openBtn: "▼ CP table by IV (13–15)", ivShort: "IV", saveShareBtn: "📸 Save/Share this CP table", cpShareText: "raid CP · gblnote.com",
    share: "📤 Share", save: "💾 Save", closeBtn: "Close",
  },
  ja: {
    boss: "レイドボス", cpSuffix: "100% CP", weather: "天候",
    hundoNote: "💯 = 100%個体 · シャドウは13〜15の個体値ならリトレーン時100%(全ステータス+2)",
    ivHead: "個体値 (攻/防/HP)", normalL20: "通常 L20", weatherL25: "天候 L25", footer: "ポケモンGO レイドボスCP情報",
    tipPre: "捕獲時のCPが ", tipMid1: "(天候 ", tipMid2: ")なら ", tipHundo: "100%個体", tipBang: "! · ", tipShadow: "シャドウ", tipPost: "は13〜15の個体値ならリトレーン時100%(リトレーン=全ステータス+2)",
    close: "▲ CP表を閉じる", openBtn: "▼ 個体値別CP表 (13〜15)", ivShort: "個体値", saveShareBtn: "📸 このCP表を保存・共有", cpShareText: "レイドCP · gblnote.com",
    share: "📤 共有", save: "💾 保存", closeBtn: "閉じる",
  },
};

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

export default function CpTable({ stats, hundoL20, hundoL25, name = "", accent = "#ea580c", dex = "", shiny = false, defaultOpen = false }: { stats: Stats; hundoL20: number; hundoL25: number; name?: string; accent?: string; dex?: string; shiny?: boolean; defaultOpen?: boolean }) {
  const params = useParams();
  const lang: Locale = isLocale(params?.lang as string) ? (params!.lang as Locale) : defaultLocale;
  const t = T[lang] || T.ko;
  const [open, setOpen] = useState(defaultOpen);
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
    drawBrandTop(ctx, logo, W, accent, 74);  // 상단 우측 로고(다운로드본 상단 브랜딩)
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
    ctx.fillText(name || t.boss, nx, 104);
    ctx.fillStyle = "#64748b"; ctx.font = "700 32px system-ui, sans-serif";
    ctx.fillText(`${t.cpSuffix}  ${hundoL20.toLocaleString()}  ·  ${t.weather} ${hundoL25.toLocaleString()}`, nx, 146);
    ctx.fillStyle = "#7c3aed"; ctx.font = "600 24px system-ui, sans-serif";
    ctx.fillText(t.hundoNote, 52, 190);
    // 표 헤더
    const cols = [72, 470, 748, 1006];
    ctx.font = "700 29px system-ui, sans-serif"; ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "left"; ctx.fillText(t.ivHead, cols[0], headH + 28);
    ctx.textAlign = "right"; ctx.fillText("%", cols[1], headH + 28);
    ctx.fillText(t.normalL20, cols[2], headH + 28);
    ctx.fillText(t.weatherL25, cols[3], headH + 28);
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
    drawBrandFooter(ctx, logo, W, fy, footH, accent, t.footer);
    setImg(c.toDataURL("image/png"));
    setFile(null);
    c.toBlob((b) => { if (b) setFile(new File([b], `gbl-cp-${name || "boss"}.png`, { type: "image/png" })); }, "image/png");
  };

  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed #e3e8f2" }}>
      <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: open ? 8 : 0, lineHeight: 1.5 }}>
        {t.tipPre}<b style={{ color: "#c2410c" }}>{hundoL20.toLocaleString()}</b>{t.tipMid1}<b style={{ color: "#c2410c" }}>{hundoL25.toLocaleString()}</b>{t.tipMid2}<b style={{ color: "#c2410c" }}>{t.tipHundo}</b>{t.tipBang}<b style={{ color: "#7c3aed" }}>{t.tipShadow}</b>{t.tipPost}
      </div>
      <button onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", padding: "6px", borderRadius: 8, border: "1px solid #ffd0a8", background: "#fff7ed", color: "#c2410c", fontWeight: 700, fontSize: "0.76rem", cursor: "pointer" }}>
        {open ? t.close : t.openBtn}
      </button>
      {open && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 1 }}>
          <div style={{ display: "flex", fontSize: "0.64rem", color: "#94a3b8", fontWeight: 700, padding: "0 4px" }}>
            <span style={{ flex: 1.5 }}>{t.ivShort}</span>
            <span style={{ flex: 0.7, textAlign: "right" }}>%</span>
            <span style={{ flex: 1, textAlign: "right" }}>{t.normalL20}</span>
            <span style={{ flex: 1, textAlign: "right" }}>{t.weatherL25}</span>
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
            {t.saveShareBtn}
          </button>
        </div>
      )}

      {img && (
        <ShareModal img={img} onClose={() => setImg(null)}>
          <button onClick={() => { track("share", "/gbl/raid/bosses", "cp-table"); shareDataUrl(img, file, `gbl-cp-${name || "boss"}.png`, `${name} ${t.cpSuffix}`, `${name} ${t.cpShareText}`); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: `linear-gradient(90deg,${accent},#7c3aed)`, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>{t.share}</button>
          <button onClick={() => { track("download", "/gbl/raid/bosses", "cp-table"); saveDataUrl(img, `gbl-cp-${name || "boss"}.png`); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "#334155", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>{t.save}</button>
          <button onClick={() => setImg(null)} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #e3e8f2", background: "#f1f5f9", color: "#64748b", cursor: "pointer", fontSize: "0.9rem" }}>{t.closeBtn}</button>
        </ShareModal>
      )}
    </div>
  );
}
