"use client";
// GBL 이벤트 공유 포스터(브로마이드) — 배틀리그 혜택 + 진화 특별기술 + 대표 포켓몬. 공유/다운로드(html-to-image).
// 레이드 브로마이드(EventBrochure)와 별개: 보스가 아닌 GBL 보너스 중심.
import { useRef, useState, useEffect } from "react";
import { toPng, toJpeg } from "html-to-image";
import { pokeSprite, monSprite } from "../sprite";
import type { Locale } from "../../../../lib/i18n";
import type { GblEvent } from "./gblEvents";
import type { ScheduleDict } from "./dict";

const INK = "#0f172a", SUB = "#64748b";
const PANEL = "#f7f5fd", BORDER = "#e9d5ff";

// 대표 포켓몬(피카츄 2종) — 이미지 파일 있으면 그것, 없으면 기본 피카츄 스프라이트로 폴백.
const HEROES = [
  { img: "/gbl/events/pikachu-xp.png", label: { ko: "PokémonXP 피카츄", en: "PokémonXP Pikachu", ja: "PokémonXPピカチュウ" } },
  { img: "/gbl/events/pikachu-wcs.png", label: { ko: "월챔 피카츄 2026", en: "WCS Pikachu 2026", ja: "WCSピカチュウ2026" } },
];

export default function GblEventBrochure({ ev, lang, t, onClose, onDismiss }: { ev: GblEvent; lang: Locale; t: ScheduleDict; onClose: () => void; onDismiss?: () => void }) {
  const lx = (o: { ko: string; en: string; ja: string }) => o[lang] ?? o.ko;
  const shinyNote = { ko: "운이 좋으면 색이 다른 포켓몬을 만날 수도 있습니다!", en: "If you're lucky, you might encounter a Shiny Pokémon!", ja: "運が良ければ色違いのポケモンに出会えるかも！" };
  const periodLabel = { ko: "이벤트 기간", en: "Event period", ja: "イベント期間" };
  const periodDates = lx(ev.period).replace(/\s*\([^)]*\)\s*$/, ""); // "(GBL 보너스)" 접미 제거 → 날짜만 크게
  const pikaFallback = pokeSprite(25);
  const moves = ev.moves || [];
  const showMoves = moves; // 전체 표시

  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const DESIGN_W = 680;
  const [scale, setScale] = useState(1);
  const [cardH, setCardH] = useState(0);
  useEffect(() => {
    const measure = () => {
      setScale(Math.min(1, (window.innerWidth - 24) / DESIGN_W));
      if (cardRef.current) setCardH(cardRef.current.offsetHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    const t1 = setTimeout(measure, 250), t2 = setTimeout(measure, 900);
    return () => { window.removeEventListener("resize", measure); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const baseOpts = () => ({ cacheBust: true, backgroundColor: "#ffffff", width: DESIGN_W, height: cardRef.current!.offsetHeight,
    filter: (n: HTMLElement) => !(n instanceof HTMLElement && n.dataset && n.dataset.noshot === "1") });
  const download = async () => {
    if (!cardRef.current || busy) return; setBusy(true);
    try { const url = await toPng(cardRef.current, { ...baseOpts(), pixelRatio: 2 }); const a = document.createElement("a"); a.href = url; a.download = "gblnote-gbl-event.png"; a.click(); }
    catch (e) { console.error(e); } finally { setBusy(false); }
  };
  const share = async () => {
    if (!cardRef.current || busy) return; setBusy(true);
    try {
      const dataUrl = await toJpeg(cardRef.current, { ...baseOpts(), pixelRatio: 1.5, quality: 0.9 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "gblnote-gbl-event.jpg", { type: "image/jpeg" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (typeof navigator.share === "function" && nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: lx(ev.title), text: "gblnote.com" });
      } else {
        const a = document.createElement("a"); a.href = dataUrl; a.download = "gblnote-gbl-event.jpg"; a.click();
      }
    } catch (e) { if (e instanceof DOMException && e.name === "AbortError") { /* 취소 */ } else console.error(e); }
    finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", zIndex: 10001, overflowY: "auto", padding: "16px 10px" }}>
     <div style={{ width: DESIGN_W * scale, maxWidth: "100%", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ width: DESIGN_W * scale, height: cardH ? cardH * scale : undefined }}>
       <div style={{ width: DESIGN_W, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <div ref={cardRef} onClick={(e) => e.stopPropagation()} style={{ position: "relative", width: "100%", background: "#ffffff", borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: "0 30px 80px -20px rgba(15,23,42,.4)", overflow: "hidden", color: INK }}>
          <button data-noshot="1" onClick={onClose} aria-label="close" style={{ position: "absolute", top: 10, right: 10, zIndex: 5, width: 32, height: 32, borderRadius: "50%", border: "1px solid #e2e8f0", background: "#f1f5f9", color: "#475569", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>✕</button>

          <div style={{ padding: "14px 16px 16px", background: "radial-gradient(700px 260px at 78% -6%, #f3e8ff 0%, transparent 60%)" }}>
            {/* 헤더 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gbl-icon.png" alt="" width={24} height={24} style={{ objectFit: "contain", flexShrink: 0 }} />
              <span style={{ fontSize: "1rem", fontWeight: 900, color: "#1a2570" }}>GBL Note</span>
              <span style={{ fontSize: "0.66rem", color: SUB, fontWeight: 700 }}>포켓몬 GO 배틀리그 정보</span>
              <span style={{ marginLeft: "auto", background: "linear-gradient(90deg,#f59e0b,#ef4444)", color: "#fff", fontWeight: 900, fontSize: "0.74rem", borderRadius: 999, padding: "4px 12px" }}>{ev.icon} {t.eventsH2}</span>
            </div>

            {/* 타이틀 + 피카츄 2종 */}
            <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 12, alignItems: "stretch", marginBottom: 12 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <h2 style={{ margin: "2px 0 8px", fontSize: "clamp(1.4rem, 5.4vw, 1.85rem)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.8px", wordBreak: "keep-all",
                  background: "linear-gradient(90deg,#db2777,#9333ea,#6366f1)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{lx(ev.title)}</h2>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", background: "linear-gradient(135deg,#fff7ed,#fefce8)", border: "1px solid #fdba74", borderRadius: 14, padding: "16px 18px" }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#b45309", marginBottom: 7, letterSpacing: "0.02em" }}>📅 {lx(periodLabel)}</div>
                  <div style={{ fontSize: "clamp(1.6rem, 6.5vw, 2.2rem)", fontWeight: 900, color: "#ea580c", lineHeight: 1.08, letterSpacing: "-0.5px" }}>{periodDates}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 6, width: "100%", minHeight: 138,
                  background: "radial-gradient(circle, rgba(250,204,21,.25) 0%, rgba(129,140,248,.08) 50%, transparent 72%)" }}>
                  {HEROES.map((h, i) => (
                    <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                      <span style={{ position: "absolute", top: -2, right: 4, fontSize: "1.1rem", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.25))" }}>✨</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={h.img} alt={lx(h.label)} style={{ maxWidth: 120, maxHeight: 118, objectFit: "contain", filter: "drop-shadow(0 8px 18px rgba(124,58,237,.3))" }}
                        onError={(e) => { if (e.currentTarget.src !== location.origin + pikaFallback && !e.currentTarget.src.endsWith(pikaFallback)) { e.currentTarget.src = pikaFallback; e.currentTarget.style.imageRendering = "pixelated"; } }} />
                      <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#7c3aed", textAlign: "center", lineHeight: 1.1 }}>{lx(h.label)} ✨</span>
                    </div>
                  ))}
                </div>
                {/* 이로치 안내 — 피카츄 바로 아래 */}
                <div style={{ width: "100%", fontSize: "0.64rem", fontWeight: 700, color: "#a16207", background: "#fefce8", border: "1px solid #fde68a", borderRadius: 9, padding: "6px 9px", lineHeight: 1.35, textAlign: "center" }}>
                  ✨ {lx(shinyNote)}
                </div>
              </div>
            </div>

            {/* GBL 혜택 카드 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {ev.bonuses.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: i === 0 ? "#fff7ed" : PANEL, border: `1px solid ${i === 0 ? "#fdba74" : BORDER}`, borderRadius: 12, padding: "11px 13px" }}>
                  <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: i === 0 ? "linear-gradient(135deg,#fb923c,#ef4444)" : "linear-gradient(135deg,#a855f7,#6366f1)", color: "#fff", fontWeight: 900, fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center" }}>{i === 0 ? "🎮" : "💎"}</span>
                  <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "#1e293b", lineHeight: 1.35 }}>{lx(b)}</span>
                </div>
              ))}
            </div>

            {/* 진화 특별기술 */}
            {showMoves.length > 0 && (
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "11px 13px" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 900, marginBottom: 2 }}>🧬 {(ev.movesTitle ? lx(ev.movesTitle) : "").replace("{n}", String(moves.length))}</div>
                {ev.movesNote && <div style={{ fontSize: "0.68rem", color: SUB, marginBottom: 8, lineHeight: 1.4 }}>{lx(ev.movesNote)}</div>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                  {showMoves.map((m, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, background: m.pvp ? "#eff6ff" : "#fff", border: `1px solid ${m.pvp ? "#bfdbfe" : "#eef2f7"}`, borderRadius: 9, padding: "5px 8px" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={monSprite(m.nameKo, m.dex)} alt="" width={28} height={28} style={{ imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "0.66rem", fontWeight: 700, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lx(m.mon)}</div>
                        <div style={{ fontSize: "0.76rem", fontWeight: 900, color: m.pvp ? "#1d4ed8" : "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.pvp ? "⚔️" : ""}{lx(m.move)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 푸터 바 */}
          <div style={{ background: "#1a2570", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gbl-icon.png" alt="" width={30} height={30} style={{ objectFit: "contain" }} />
              <div>
                <div style={{ fontWeight: 900, fontSize: "1rem", color: "#fff", lineHeight: 1.1 }}>GBL Note</div>
                <div style={{ fontSize: "0.6rem", color: "#a5b4fc" }}>포켓몬 GO 배틀리그 정보</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 130, background: "#fff", borderRadius: 999, padding: "7px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ color: "#1e293b", fontWeight: 900, fontSize: "0.9rem" }}>gblnote.com</span>
              <span style={{ color: "#64748b", fontSize: "0.85rem" }}>🔍</span>
            </div>
          </div>
        </div>
       </div>
      </div>

      {/* 컨트롤(공유 스크린샷 제외) */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 8 }}>
        <button onClick={share} disabled={busy} style={{ padding: "8px 18px", borderRadius: 999, border: "none", background: busy ? "#cbd5e1" : "linear-gradient(90deg,#db2777,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: "0.85rem", cursor: busy ? "default" : "pointer" }}>{busy ? (lang === "en" ? "Generating…" : lang === "ja" ? "生成中…" : "생성 중…") : (lang === "en" ? "📤 Share" : lang === "ja" ? "📤 共有" : "📤 공유하기")}</button>
        <button onClick={download} disabled={busy} style={{ padding: "8px 18px", borderRadius: 999, border: "none", background: busy ? "#cbd5e1" : "#334155", color: "#fff", fontWeight: 800, fontSize: "0.85rem", cursor: busy ? "default" : "pointer" }}>{lang === "en" ? "💾 Save" : lang === "ja" ? "💾 保存" : "💾 다운로드"}</button>
        <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 999, border: "none", background: "rgba(255,255,255,.92)", color: "#334155", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer" }}>{lang === "en" ? "Close" : lang === "ja" ? "閉じる" : "닫기"}</button>
        {onDismiss && <button onClick={onDismiss} style={{ padding: "8px 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,.5)", background: "rgba(255,255,255,.15)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>{lang === "en" ? "Don't show again" : lang === "ja" ? "今後表示しない" : "다시 보지 않기"}</button>}
      </div>
     </div>
    </div>
  );
}
