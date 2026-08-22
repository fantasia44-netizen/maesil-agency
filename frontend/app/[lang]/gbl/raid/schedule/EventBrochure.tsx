"use client";
// 이벤트 브로마이드 팝업 — A4 비율 포스터형(공유용), 라이트 테마(GBL Note 화이트). 데이터 기반.
import { useRef, useState, useEffect } from "react";
import { toPng, toJpeg } from "html-to-image";
import { monSprite } from "../../sprite";
import { TYPE_COLOR, typeLabel } from "../../typeLabels";
import type { Locale } from "../../../../../lib/i18n";
import type { Brochure } from "./eventBrochures";

const TYPE_EMOJI: Record<string, string> = {
  electric: "⚡", grass: "🌿", water: "💧", fire: "🔥", ice: "❄️", fighting: "🥊", poison: "☠️",
  ground: "⛰️", flying: "🕊️", psychic: "🔮", bug: "🐛", rock: "🪨", ghost: "👻", dragon: "🐉",
  dark: "🌑", steel: "⚙️", fairy: "✨", normal: "⭐",
};

const INK = "#0f172a", SUB = "#64748b";
const PANEL = "#f7f5fd", BORDER = "#e9d5ff";

function TypeChip({ tk, lang, sm }: { tk: string; lang: Locale; sm?: boolean }) {
  const c = TYPE_COLOR[tk] || "#64748b";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${c}1a`, border: `1px solid ${c}80`, color: "#1e293b", borderRadius: 999, padding: sm ? "2px 8px" : "3px 10px", fontSize: sm ? "0.72rem" : "0.8rem", fontWeight: 800 }}>
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: sm ? 16 : 18, height: sm ? 16 : 18, borderRadius: "50%", background: c, fontSize: "0.62rem" }}>{TYPE_EMOJI[tk] || "•"}</span>
      {typeLabel(lang, tk)}
    </span>
  );
}

function BonusCard({ sec }: { sec: Brochure["bonuses"][number] }) {
  return (
    <div style={{ background: sec.accent ? "#fdf2f8" : PANEL, border: `1px solid ${sec.accent ? "#f9a8d4" : BORDER}`, borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#a855f7,#6366f1)", color: "#fff", fontWeight: 900, fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>{sec.n}</span>
        <span style={{ fontWeight: 900, fontSize: "0.82rem", color: sec.accent ? "#be185d" : "#6d28d9", lineHeight: 1.25 }}>{sec.title}</span>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
        {sec.items.map((it, i) => (
          <li key={i} style={{ display: "flex", gap: 6, fontSize: "0.76rem", color: "#334155", lineHeight: 1.4 }}>
            <span style={{ color: "#a78bfa", flexShrink: 0 }}>›</span><span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function EventBrochure({ b, lang, onClose, onDismiss }: { b: Brochure; lang: Locale; onClose: () => void; onDismiss?: () => void }) {
  const spriteFallback = b.hero.spriteKo && b.hero.spriteDex ? monSprite(b.hero.spriteKo, b.hero.spriteDex) : "";
  const heroSrc = b.hero.img || spriteFallback;
  const bonus1 = b.bonuses.find((s) => s.n === 1 || s.accent);
  const restBonuses = b.bonuses.filter((s) => s !== bonus1);

  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  // 포스터는 720px(DESIGN_W) 고정 디자인 → 좁은 화면(폰)에선 통째로 축소해 비율 유지(세로로 늘어짐 방지).
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
    const t1 = setTimeout(measure, 250), t2 = setTimeout(measure, 900);  // 이미지 로드 후 재측정
    return () => { window.removeEventListener("resize", measure); clearTimeout(t1); clearTimeout(t2); };
  }, []);
  // 캡처는 화면 축소(scale)와 무관하게 항상 디자인 원본(DESIGN_W×cardH) 기준.
  const baseOpts = () => ({ cacheBust: true, backgroundColor: "#ffffff", width: DESIGN_W, height: cardRef.current!.offsetHeight,
    filter: (n: HTMLElement) => !(n instanceof HTMLElement && n.dataset && n.dataset.noshot === "1") });
  // 다운로드: 고화질 PNG(2x)로 파일 저장
  const download = async () => {
    if (!cardRef.current || busy) return; setBusy(true);
    try { const url = await toPng(cardRef.current, { ...baseOpts(), pixelRatio: 2 }); const a = document.createElement("a"); a.href = url; a.download = `gblnote-${b.dateKey}.png`; a.click(); }
    catch (e) { console.error(e); } finally { setBusy(false); }
  };
  // 공유: 카톡 등은 대용량 이미지를 강하게 재압축 → 저용량 JPEG(1.5x, q0.9)로 카톡이 덜 뭉개게.
  const share = async () => {
    if (!cardRef.current || busy) return; setBusy(true);
    try {
      const dataUrl = await toJpeg(cardRef.current, { ...baseOpts(), pixelRatio: 1.5, quality: 0.9 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `gblnote-${b.dateKey}.jpg`, { type: "image/jpeg" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (typeof navigator.share === "function" && nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: b.title, text: "gblnote.com" });
      } else {
        const a = document.createElement("a"); a.href = dataUrl; a.download = `gblnote-${b.dateKey}.jpg`; a.click();
      }
    } catch (e) { if (e instanceof DOMException && e.name === "AbortError") { /* 사용자 취소 */ } else console.error(e); }
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
            <span style={{ fontSize: "0.66rem", color: SUB, fontWeight: 700 }}>포켓몬 GO 레이드 정보 &amp; CP 계산기</span>
            <span style={{ marginLeft: "auto", background: "linear-gradient(90deg,#f59e0b,#ef4444)", color: "#fff", fontWeight: 900, fontSize: "0.74rem", borderRadius: 999, padding: "4px 12px" }}>⭐ {b.kindLabel}</span>
          </div>

          {/* 상단 2단 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <div>
              {b.eyebrow && <span style={{ display: "inline-block", background: "#f3e8ff", border: "1px solid #d8b4fe", color: "#7c3aed", fontWeight: 800, fontSize: "0.76rem", borderRadius: 8, padding: "3px 10px", marginBottom: 6 }}>{b.eyebrow}</span>}
              <h2 style={{ margin: "2px 0 4px", fontSize: "clamp(1.5rem, 6vw, 2rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-1px", wordBreak: "keep-all",
                background: "linear-gradient(90deg,#db2777,#9333ea,#6366f1)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{b.title}</h2>
              {b.subtitle && <p style={{ margin: "0 0 8px", fontSize: "0.82rem", color: "#475569", fontWeight: 600, lineHeight: 1.4 }}>{b.subtitle}</p>}
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "8px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1.1rem", fontWeight: 900 }}>📅 {b.dateLabel}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem", fontWeight: 800, color: "#ea580c", marginTop: 2 }}>🕐 {b.timeLabel}</div>
              </div>
              {/* 약점/저항 — 시간 아래(빈칸 채움) */}
              {(b.weakTypes?.length || b.resistTypes?.length) && (
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "9px 12px", marginTop: 10 }}>
                  {b.weakTypes?.length ? (
                    <div style={{ marginBottom: b.resistTypes?.length ? 8 : 0 }}>
                      <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#dc2626", marginBottom: 5 }}>⚔️ 약점</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{b.weakTypes.map((tk) => <TypeChip key={tk} tk={tk} lang={lang} sm />)}</div>
                    </div>
                  ) : null}
                  {b.resistTypes?.length ? (
                    <div>
                      <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#2563eb", marginBottom: 5 }}>🛡️ 저항</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{b.resistTypes.map((tk) => <TypeChip key={tk} tk={tk} lang={lang} sm />)}</div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {heroSrc && (
                <div style={{ position: "relative", width: "100%", height: 176, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "radial-gradient(circle, rgba(192,132,252,.28) 0%, rgba(129,140,248,.1) 45%, transparent 70%)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroSrc} alt={b.title} style={{ maxWidth: "100%", maxHeight: 172, imageRendering: b.hero.img ? "auto" : "pixelated", objectFit: "contain", filter: "drop-shadow(0 8px 20px rgba(124,58,237,.35))" }}
                    onError={(e) => { if (spriteFallback && e.currentTarget.src !== spriteFallback) { e.currentTarget.src = spriteFallback; e.currentTarget.style.imageRendering = "pixelated"; } }} />
                  {b.hero.shiny && <span style={{ position: "absolute", top: 4, right: 10, fontSize: "1.2rem" }}>✨</span>}
                </div>
              )}
              {(b.maxCp || b.bossTypes?.length) && (
                <div style={{ width: "100%", textAlign: "center", background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "8px 10px" }}>
                  {b.newLabel && <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#6d28d9", marginBottom: 2 }}>{b.newBadge ? `[${b.newBadge}] ` : ""}{b.newLabel} {b.hero.shiny ? "✨" : ""}</div>}
                  {b.maxCp && <div><span style={{ fontSize: "0.72rem", fontWeight: 800, color: SUB }}>{b.title} CP </span><span style={{ fontSize: "1.7rem", fontWeight: 900, background: "linear-gradient(90deg,#db2777,#6366f1)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>{b.maxCp.toLocaleString()}</span></div>}
                  {b.bossTypes?.length ? <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 4 }}>{b.bossTypes.map((tk) => <TypeChip key={tk} tk={tk} lang={lang} sm />)}</div> : null}
                </div>
              )}
            </div>
          </div>

          {/* 대량발생(강조) */}
          {bonus1 && <div style={{ marginBottom: 10 }}><BonusCard sec={bonus1} /></div>}

          {/* 나머지 보너스 — 긴 카드 우측 단독, 나머지 좌측 스택 */}
          {restBonuses.length > 0 && (() => {
            const tall = [...restBonuses].sort((a, b) => b.items.length - a.items.length)[0];
            const left = restBonuses.filter((s) => s !== tall);
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{left.map((s) => <BonusCard key={s.n} sec={s} />)}</div>
                <div>{tall && <BonusCard sec={tall} />}</div>
              </div>
            );
          })()}

          {/* 하단 2단: 좌(CP표 + 약점/저항) · 우(추천 TOP6) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {b.cpIv?.rows.length ? (
                <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: 900, marginBottom: 6 }}>💎 CP 표 <span style={{ fontSize: "0.66rem", color: SUB, fontWeight: 700 }}>(획득 CP)</span></div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                    <thead><tr style={{ color: SUB }}>
                      <th style={{ textAlign: "left", padding: "3px 2px", fontWeight: 800 }}>개체값</th>
                      <th style={{ padding: "3px 2px", fontWeight: 800 }}>%</th>
                      <th style={{ padding: "3px 2px", fontWeight: 800, color: "#c2410c" }}>일반</th>
                      <th style={{ padding: "3px 2px", fontWeight: 800, color: "#2563eb" }}>날씨</th>
                    </tr></thead>
                    <tbody>
                      {b.cpIv.rows.map((r, i) => (
                        <tr key={i} style={{ borderTop: "1px solid #ece7f5", background: r.pct === 100 ? "#fef9c3" : "transparent" }}>
                          <td style={{ padding: "4px 2px", fontWeight: r.pct === 100 ? 900 : 700, color: INK, whiteSpace: "nowrap" }}>{r.pct === 100 ? "💯 " : ""}{r.iv}</td>
                          <td style={{ padding: "4px 2px", textAlign: "center", color: SUB }}>{r.pct}%</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: r.pct === 100 ? 900 : 700, color: "#c2410c" }}>{r.l20.toLocaleString()}</td>
                          <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: r.pct === 100 ? 900 : 700, color: "#2563eb" }}>{r.l25.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ fontSize: "0.62rem", color: SUB, marginTop: 4 }}>일반=L20 · 날씨(강풍/눈)=L25 획득</div>
                </div>
              ) : null}
            </div>

            {/* 추천 TOP6 */}
            {b.counters?.length ? (
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: "0.86rem", fontWeight: 900, marginBottom: 8 }}>👾 추천 포켓몬 TOP 6</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                  {b.counters.map((c, i) => {
                    const tc = TYPE_COLOR[c.type] || "#64748b";
                    return (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "#fff", border: `1px solid ${tc}55`, borderRadius: 10, padding: "6px 2px" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={monSprite(c.ko, c.dex)} alt={c.ko} width={40} height={40} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
                        <span style={{ fontSize: "0.62rem", fontWeight: 800, color: INK, textAlign: "center", lineHeight: 1.15 }}>{c.ko}</span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: "0.56rem", fontWeight: 800, color: "#fff", background: tc, borderRadius: 999, padding: "0px 6px" }}>{TYPE_EMOJI[c.type] || "•"} {typeLabel(lang, c.type)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : <div />}
          </div>

          {b.note && <div style={{ marginTop: 10, fontSize: "0.72rem", color: "#92400e", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "7px 12px" }}>⚠️ {b.note}</div>}
        </div>

        {/* 푸터 바 (전체폭) */}
        <div style={{ background: "#1a2570", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gbl-icon.png" alt="" width={30} height={30} style={{ objectFit: "contain" }} />
            <div>
              <div style={{ fontWeight: 900, fontSize: "1rem", color: "#fff", lineHeight: 1.1 }}>GBL Note</div>
              <div style={{ fontSize: "0.6rem", color: "#a5b4fc" }}>포켓몬 GO 레이드 정보 &amp; CP 계산기</div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 130, background: "#fff", borderRadius: 999, padding: "7px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ color: "#1e293b", fontWeight: 900, fontSize: "0.9rem" }}>gblnote.com</span>
            <span style={{ color: "#64748b", fontSize: "0.85rem" }}>🔍</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: "0.64rem", fontWeight: 700, color: "#fff" }}>일정 공유하고 함께 레이드해요!</span>
            <div style={{ display: "flex", gap: 6 }}>
              {[["#FEE500", "💬"], ["#5865F2", "🎮"], ["#1DA1F2", "🐦"]].map(([bg, ic]) => (
                <span key={ic} style={{ width: 24, height: 24, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem" }}>{ic}</span>
              ))}
            </div>
          </div>
        </div>
        </div>
       </div>
      </div>

      {/* 카드 밖 컨트롤(공유 스크린샷엔 미포함) */}
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 8 }}>
        <button onClick={share} disabled={busy} style={{ padding: "8px 18px", borderRadius: 999, border: "none", background: busy ? "#cbd5e1" : "linear-gradient(90deg,#db2777,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: "0.85rem", cursor: busy ? "default" : "pointer" }}>{busy ? "생성 중…" : "📤 공유하기"}</button>
        <button onClick={download} disabled={busy} style={{ padding: "8px 18px", borderRadius: 999, border: "none", background: busy ? "#cbd5e1" : "#334155", color: "#fff", fontWeight: 800, fontSize: "0.85rem", cursor: busy ? "default" : "pointer" }}>💾 다운로드</button>
        <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 999, border: "none", background: "rgba(255,255,255,.92)", color: "#334155", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer" }}>닫기</button>
        {onDismiss && <button onClick={onDismiss} style={{ padding: "8px 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,.5)", background: "rgba(255,255,255,.15)", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>다시 안 보기</button>}
      </div>
     </div>
    </div>
  );
}
