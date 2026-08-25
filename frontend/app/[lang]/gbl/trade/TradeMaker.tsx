"use client";
// 포켓몬 교환 목록 이미지 메이커 — 원하는 것/줄 수 있는 것 + 이로치 + 배경(차별점) + 트레이너코드 + 워터마크.
// 공유이미지(html-to-image). pogokit/9db엔 배경 없음 → 배경 지원이 차별점.
import { useMemo, useRef, useState } from "react";
import { toPng, toJpeg } from "html-to-image";
import PKN from "../pokedex_names.json";
import { pokeSprite, shinySprite } from "../sprite";
import type { Locale } from "../../../../lib/i18n";
import type { TradeDict } from "./dict";

type PKN_T = Record<string, { ko: string; en: string; ja: string }>;
const NAMES = PKN as unknown as PKN_T;
const DEXES = Object.keys(NAMES).map(Number).filter((d) => d > 0).sort((a, b) => a - b);

type Item = { dex: number; shiny: boolean };
const nameOf = (lang: Locale, dex: number) => {
  const n = NAMES[String(dex)];
  return n ? (lang === "en" ? n.en : lang === "ja" ? n.ja : n.ko) : String(dex);
};
const spriteOf = (it: Item) => (it.shiny ? shinySprite(it.dex) : pokeSprite(it.dex));

// 배경 프리셋 — 경쟁사엔 없는 차별점. 그라디언트/패턴.
const BGS: { key: string; label: string; css: string; ink: string }[] = [
  { key: "aqua", label: "아쿠아", css: "linear-gradient(160deg,#0ea5e9,#2563eb 55%,#1e1b4b)", ink: "#fff" },
  { key: "sunset", label: "선셋", css: "linear-gradient(160deg,#f59e0b,#ef4444 55%,#7c2d12)", ink: "#fff" },
  { key: "grape", label: "그레이프", css: "linear-gradient(160deg,#a855f7,#6366f1 55%,#1e1b4b)", ink: "#fff" },
  { key: "forest", label: "포레스트", css: "linear-gradient(160deg,#22c55e,#0d9488 55%,#064e3b)", ink: "#fff" },
  { key: "rose", label: "로즈", css: "linear-gradient(160deg,#fb7185,#db2777 55%,#831843)", ink: "#fff" },
  { key: "night", label: "미드나잇", css: "radial-gradient(120% 100% at 50% 0%,#334155,#0f172a 60%)", ink: "#fff" },
  { key: "cloud", label: "클라우드", css: "linear-gradient(160deg,#e0f2fe,#eef2ff 60%,#faf5ff)", ink: "#0f172a" },
  { key: "mono", label: "모노", css: "#0b1020", ink: "#fff" },
];

const DESIGN_W = 620;

export default function TradeMaker({ lang, t }: { lang: Locale; t: TradeDict }) {
  const [want, setWant] = useState<Item[]>([]);
  const [offer, setOffer] = useState<Item[]>([]);
  const [target, setTarget] = useState<"want" | "offer">("want");
  const [shinyMode, setShinyMode] = useState(false);
  const [bgIdx, setBgIdx] = useState(0);
  const [code, setCode] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const bg = BGS[bgIdx];
  const cardRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return DEXES.filter((d) => {
      const n = NAMES[String(d)];
      return n && (n.ko.toLowerCase().includes(s) || n.en.toLowerCase().includes(s) || (n.ja || "").includes(s) || String(d) === s);
    }).slice(0, 24);
  }, [q]);

  const add = (dex: number) => {
    const it: Item = { dex, shiny: shinyMode };
    if (target === "want") setWant((a) => [...a, it]); else setOffer((a) => [...a, it]);
    setQ("");
  };
  const toggleShiny = (list: "want" | "offer", i: number) => {
    const set = list === "want" ? setWant : setOffer;
    set((a) => a.map((x, j) => (j === i ? { ...x, shiny: !x.shiny } : x)));
  };
  const remove = (list: "want" | "offer", i: number) => {
    const set = list === "want" ? setWant : setOffer;
    set((a) => a.filter((_, j) => j !== i));
  };

  const [scale, setScale] = useState(1);
  useMemo(() => { if (typeof window !== "undefined") setScale(Math.min(1, (window.innerWidth - 28) / DESIGN_W)); }, []);

  const baseOpts = () => ({ cacheBust: true, backgroundColor: bg.ink === "#fff" ? "#0b1020" : "#ffffff", width: DESIGN_W, height: cardRef.current!.offsetHeight,
    filter: (n: HTMLElement) => !(n instanceof HTMLElement && n.dataset && n.dataset.noshot === "1") });
  const download = async () => {
    if (!cardRef.current || busy) return; setBusy(true);
    try { const url = await toPng(cardRef.current, { ...baseOpts(), pixelRatio: 2 }); const a = document.createElement("a"); a.href = url; a.download = "gblnote-trade.png"; a.click(); }
    catch (e) { console.error(e); } finally { setBusy(false); }
  };
  const share = async () => {
    if (!cardRef.current || busy) return; setBusy(true);
    try {
      const dataUrl = await toJpeg(cardRef.current, { ...baseOpts(), pixelRatio: 1.6, quality: 0.92 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "gblnote-trade.jpg", { type: "image/jpeg" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (typeof navigator.share === "function" && nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: t.shareTitle, text: "gblnote.com" });
      } else { const a = document.createElement("a"); a.href = dataUrl; a.download = "gblnote-trade.jpg"; a.click(); }
    } catch (e) { if (e instanceof DOMException && e.name === "AbortError") { /* 취소 */ } else console.error(e); }
    finally { setBusy(false); }
  };

  const chipBtn = (on: boolean): React.CSSProperties => ({
    padding: "7px 13px", borderRadius: 999, fontSize: "0.84rem", fontWeight: 800, cursor: "pointer",
    border: on ? "none" : "1px solid #dbe2ee", background: on ? "#3b5bdb" : "#fff", color: on ? "#fff" : "#475569",
  });

  // 미리보기 섹션(원하는것/줄것)
  const Section = ({ list, items, title, dot }: { list: "want" | "offer"; items: Item[]; title: string; dot: string }) => (
    <div style={{ background: "rgba(255,255,255,.1)", border: `1px solid ${bg.ink === "#fff" ? "rgba(255,255,255,.22)" : "rgba(15,23,42,.12)"}`, borderRadius: 14, padding: "10px 12px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <span style={{ fontSize: "1rem" }}>{dot}</span>
        <span style={{ fontSize: "1.05rem", fontWeight: 900, color: bg.ink, letterSpacing: "-0.3px" }}>{title}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: bg.ink, opacity: 0.5 }}>{t.emptySlot}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
          {items.map((it, i) => (
            <button key={i} data-noshot={undefined} onClick={() => toggleShiny(list, i)} title={t.tapShiny}
              style={{ position: "relative", background: "rgba(255,255,255,.08)", border: "none", borderRadius: 10, padding: "4px 2px", cursor: "pointer" }}>
              {it.shiny && <span data-noshot="0" style={{ position: "absolute", top: 0, right: 3, fontSize: "0.8rem" }}>✨</span>}
              <span data-noshot="1" onClick={(e) => { e.stopPropagation(); remove(list, i); }}
                style={{ position: "absolute", top: -6, left: -4, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: "0.6rem", lineHeight: "16px", textAlign: "center", zIndex: 3 }}>✕</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={spriteOf(it)} alt="" width={46} height={46} style={{ imageRendering: "pixelated", objectFit: "contain", display: "block", margin: "0 auto" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 18, alignItems: "start" }}>
      {/* ── 좌: 빌더 컨트롤 ── */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* 대상 섹션 */}
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b", marginBottom: 6 }}>{t.addTo}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={chipBtn(target === "want")} onClick={() => setTarget("want")}>🟢 {t.wanted}</button>
            <button style={chipBtn(target === "offer")} onClick={() => setTarget("offer")}>🟡 {t.offer}</button>
            <button style={{ ...chipBtn(shinyMode), marginLeft: "auto" }} onClick={() => setShinyMode((v) => !v)}>✨ {t.shinyMode}</button>
          </div>
        </div>
        {/* 검색 */}
        <div style={{ position: "relative" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPh}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #dbe2ee", borderRadius: 10, fontSize: "0.92rem" }} />
          {results.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 30, marginTop: 4, maxHeight: 280, overflowY: "auto", background: "#fff", border: "1px solid #dbe2ee", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)", padding: 6, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4 }}>
              {results.map((d) => (
                <button key={d} onClick={() => add(d)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "1px solid #eef2f7", borderRadius: 8, padding: "6px 2px", cursor: "pointer" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shinyMode ? shinySprite(d) : pokeSprite(d)} alt="" width={38} height={38} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
                  <span style={{ fontSize: "0.66rem", fontWeight: 700, color: "#334155", textAlign: "center", lineHeight: 1.1 }}>{nameOf(lang, d)}</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 5 }}>{t.searchHint}</div>
        </div>
        {/* 배경 */}
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b", marginBottom: 6 }}>🎨 {t.background} <span style={{ color: "#22c55e", fontWeight: 700 }}>{t.bgBadge}</span></div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {BGS.map((b, i) => (
              <button key={b.key} onClick={() => setBgIdx(i)} title={b.label}
                style={{ width: 40, height: 40, borderRadius: 10, cursor: "pointer", background: b.css, border: bgIdx === i ? "3px solid #3b5bdb" : "2px solid #e2e8f0" }} />
            ))}
          </div>
        </div>
        {/* 트레이너 코드 */}
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b", marginBottom: 6 }}>{t.trainerCode}</div>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9\s]/g, "").slice(0, 14))} placeholder="1234 5678 9012"
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #dbe2ee", borderRadius: 10, fontSize: "0.92rem", letterSpacing: "0.05em" }} />
        </div>
        {/* 내보내기 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={share} disabled={busy} style={{ flex: 1, padding: "11px 16px", borderRadius: 999, border: "none", background: busy ? "#cbd5e1" : "linear-gradient(90deg,#db2777,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: "0.92rem", cursor: busy ? "default" : "pointer" }}>{busy ? t.building : `📤 ${t.shareBtn}`}</button>
          <button onClick={download} disabled={busy} style={{ padding: "11px 16px", borderRadius: 999, border: "none", background: busy ? "#cbd5e1" : "#334155", color: "#fff", fontWeight: 800, fontSize: "0.92rem", cursor: busy ? "default" : "pointer" }}>💾 {t.saveBtn}</button>
        </div>
      </div>

      {/* ── 우: 라이브 미리보기(캡처 대상) ── */}
      <div style={{ width: DESIGN_W * scale, margin: "0 auto" }}>
        <div style={{ width: DESIGN_W, transform: `scale(${scale})`, transformOrigin: "top left", height: `calc(var(--h,0px) * ${scale})` }}>
          <div ref={cardRef} style={{ width: "100%", background: bg.css, borderRadius: 20, padding: "18px 18px 14px", boxShadow: "0 20px 50px -20px rgba(15,23,42,.5)" }}>
            <div style={{ textAlign: "center", fontSize: "1.5rem", fontWeight: 900, color: bg.ink, letterSpacing: "0.02em", marginBottom: 12, textShadow: bg.ink === "#fff" ? "0 2px 8px rgba(0,0,0,.3)" : "none" }}>
              🔄 {t.cardTitle}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Section list="want" items={want} title={t.wanted} dot="🟢" />
              <Section list="offer" items={offer} title={t.offer} dot="🟡" />
            </div>
            {/* 푸터 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${bg.ink === "#fff" ? "rgba(255,255,255,.2)" : "rgba(15,23,42,.1)"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gbl-icon.png" alt="" width={20} height={20} style={{ objectFit: "contain" }} />
                <span style={{ fontSize: "0.9rem", fontWeight: 900, color: bg.ink }}>gblnote.com</span>
              </div>
              {code.trim() && <span style={{ fontSize: "0.9rem", fontWeight: 800, color: bg.ink, letterSpacing: "0.06em" }}>👤 {code.trim()}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
