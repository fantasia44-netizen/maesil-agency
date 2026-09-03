"use client";
// 포켓몬 교환 목록 이미지 메이커 — 원하는 것/줄 수 있는 것 + 이로치 + 배경(차별점) + 트레이너코드 + 워터마크.
// 공유이미지(html-to-image). pogokit/9db엔 배경 없음 → 배경 지원이 차별점.
import { useEffect, useMemo, useRef, useState } from "react";
import { toPng, toJpeg } from "html-to-image";
import PKN from "../pokedex_names.json";
import COS from "../costumes.json";
import { pokeSprite } from "../sprite";
import type { Locale } from "../../../../lib/i18n";
import { getTrade, type TradeDict } from "./dict";
import { BG_SWATCHES, resolveBg, bgLabel } from "./backgrounds";
import { track } from "../../../../lib/track";
import { shareDataUrl } from "../raid/raidShareUtil";

type PKN_T = Record<string, { ko: string; en: string; ja: string }>;
const NAMES = PKN as unknown as PKN_T;
const DEXES = Object.keys(NAMES).map(Number).filter((d) => d > 0).sort((a, b) => a - b);
// 코스튬(WatWowMap UICONS): dex → [{cid, f(파일명), s(이로치有)}]
const COSTUMES = COS as unknown as Record<string, { cid: string; f: string; s: number }[]>;
const UICONS = "https://raw.githubusercontent.com/WatWowMap/wwm-uicons/main/pokemon/";

type Item = { dex: number; shiny: boolean; cf?: string; max?: "d" | "g"; bg?: string }; // cf: 코스튬, max: 다이맥스/거다이맥스, bg: 배경 id
type Variant = { dex: number; cf?: string; hasShiny: boolean };
const nameOf = (lang: Locale, dex: number) => {
  const n = NAMES[String(dex)];
  return n ? (lang === "en" ? n.en : lang === "ja" ? n.ja : lang === "zh-TW" ? ((n as Record<string, string>)["zh-TW"] || n.en) : n.ko) : String(dex);
};
// 전부 UICONS(게임 아이콘)로 통일 — 기본/코스튬 art 스타일 일치.
const variantSprite = (v: { dex: number; cf?: string }, shiny: boolean) => {
  const stem = v.cf ? v.cf.replace(/\.png$/, "") : String(v.dex);
  return UICONS + stem + (shiny ? "_s" : "") + ".png";
};
const spriteOf = (it: Item) => variantSprite(it, it.shiny);
const fallbackSprite = (it: Item) => (it.cf ? "" : pokeSprite(it.dex)); // UICONS 실패 시 기본 대체

// 화이트 테마로 통일(집중도↑). 카드는 흰 배경 + 진한 텍스트.
const INK = "#0f172a", SUB = "#475569", LINE = "#e6ebf5", PANEL = "#f7f9fd";
const DESIGN_W = 620;

export default function TradeMaker({ lang, t }: { lang: Locale; t: TradeDict }) {
  const [want, setWant] = useState<Item[]>([]);
  const [offer, setOffer] = useState<Item[]>([]);
  const [target, setTarget] = useState<"want" | "offer">("want");
  const [shinyMode, setShinyMode] = useState(false);
  const [maxMode, setMaxMode] = useState<"" | "d" | "g">("");
  const [curBg, setCurBg] = useState<string>(""); // 선택 중인 배경(추가/페인트에 적용)
  const [bgOpen, setBgOpen] = useState(false); // 배경 팔레트 접기(기본 닫힘)
  const [code, setCode] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  // 카드(출력물) 언어 — 페이지 언어와 별개로 선택(해외 공유용). 기본=페이지 언어.
  const [cardLang, setCardLang] = useState<Locale>(lang);
  const ct = getTrade(cardLang);

  const cardRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // 검색 결과 = 매칭 몬의 변형(기본 + 코스튬 전부). 9db식 변형 그리드.
  const results = useMemo<Variant[]>(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const dexes = DEXES.filter((d) => {
      const n = NAMES[String(d)];
      return n && (n.ko.toLowerCase().includes(s) || n.en.toLowerCase().includes(s) || (n.ja || "").includes(s) || (((n as Record<string, string>)["zh-TW"]) || "").includes(s) || String(d) === s);
    }).slice(0, 6);
    const out: Variant[] = [];
    for (const d of dexes) {
      out.push({ dex: d, hasShiny: true }); // 기본형
      for (const c of COSTUMES[String(d)] || []) out.push({ dex: d, cf: c.f, hasShiny: c.s === 1 });
    }
    return out.slice(0, 400);
  }, [q]);

  const add = (v: Variant) => {
    const it: Item = { dex: v.dex, shiny: shinyMode && v.hasShiny, cf: v.cf, max: maxMode || undefined, bg: curBg || undefined };
    if (target === "want") setWant((a) => [...a, it]); else setOffer((a) => [...a, it]);
  };
  const remove = (list: "want" | "offer", i: number) => {
    const set = list === "want" ? setWant : setOffer;
    set((a) => a.filter((_, j) => j !== i));
  };

  const [scale, setScale] = useState(1);
  const [cardH, setCardH] = useState(0); // 카드 실측 높이(스케일 래퍼 흐름 높이 예약용)
  // 카드 높이 실측 → 스케일 래퍼 흐름 높이 예약
  useEffect(() => {
    const el = cardRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setCardH(el.offsetHeight));
    ro.observe(el); setCardH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);
  // 스케일 실측 — 모바일(단일컬럼)에선 그리드 폭에 카드를 맞춰 가로 오버플로우 방지, 데스크톱은 원본(1)
  useEffect(() => {
    const el = gridRef.current; if (!el) return;
    const compute = () => {
      const w = el.clientWidth; if (!w) return; // 0폭(숨김/하이드레이션)일 땐 유지
      const mobile = window.matchMedia("(max-width:820px)").matches;
      setScale(mobile ? Math.min(1, w / DESIGN_W) : 1);
    };
    const ro = new ResizeObserver(compute);
    ro.observe(el); compute();
    window.addEventListener("orientationchange", compute);
    return () => { ro.disconnect(); window.removeEventListener("orientationchange", compute); };
  }, []);

  const baseOpts = () => ({ cacheBust: true, backgroundColor: "#ffffff", width: DESIGN_W, height: cardRef.current!.offsetHeight,
    filter: (n: HTMLElement) => !(n instanceof HTMLElement && n.dataset && n.dataset.noshot === "1") });
  const download = async () => {
    if (!cardRef.current || busy) return; setBusy(true);
    track("download", "/gbl/trade", "trade");
    try { const url = await toPng(cardRef.current, { ...baseOpts(), pixelRatio: 2 }); const a = document.createElement("a"); a.href = url; a.download = "gblnote-trade.png"; a.click(); }
    catch (e) { console.error(e); } finally { setBusy(false); }
  };
  const share = async () => {
    if (!cardRef.current || busy) return; setBusy(true);
    track("share", "/gbl/trade", "trade");
    try {
      const dataUrl = await toJpeg(cardRef.current, { ...baseOpts(), pixelRatio: 1.6, quality: 0.92 });
      await shareDataUrl(dataUrl, null, "gblnote-trade.jpg", ct.shareTitle, "gblnote.com");   // 모바일=파일공유 / PC=링크복사
    } catch (e) { if (e instanceof DOMException && e.name === "AbortError") { /* 취소 */ } else console.error(e); }
    finally { setBusy(false); }
  };

  const chipBtn = (on: boolean): React.CSSProperties => ({
    padding: "7px 13px", borderRadius: 999, fontSize: "0.84rem", fontWeight: 800, cursor: "pointer",
    border: on ? "none" : "1px solid #dbe2ee", background: on ? "#3b5bdb" : "#fff", color: on ? "#fff" : "#475569",
  });

  // 배경 스와치(이미지 썸네일 + 라벨 오버레이)
  const bgSwatch = (s: (typeof BG_SWATCHES)[number], showLabel: boolean) => {
    const on = curBg === s.id;
    return (
      <button key={s.id} onClick={() => setCurBg(s.id)} title={bgLabel(s.id, lang)}
        style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 7, overflow: "hidden", padding: 0, cursor: "pointer",
          border: on ? "2px solid #3b5bdb" : "1px solid #dbe2ee", boxShadow: on ? "0 0 0 2px rgba(59,91,219,.3)" : "none" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.sample} alt={bgLabel(s.id, lang)} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        {showLabel && (
          <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, fontSize: "0.5rem", fontWeight: 800, color: "#fff",
            background: "rgba(0,0,0,.5)", textAlign: "center", padding: "1px 1px", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {bgLabel(s.id, lang)}
          </span>
        )}
      </button>
    );
  };
  const bgGroupLabel: React.CSSProperties = { fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", margin: "6px 0 4px" };

  // 미리보기 섹션(원하는것/줄것)
  const Section = ({ list, items, title, dot }: { list: "want" | "offer"; items: Item[]; title: string; dot: string }) => (
    <div style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 14, padding: "10px 12px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <span style={{ fontSize: "1rem" }}>{dot}</span>
        <span style={{ fontSize: "1.05rem", fontWeight: 900, color: INK, letterSpacing: "-0.3px" }}>{title}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", color: "#94a3b8" }}>{ct.emptySlot}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
          {items.map((it, i) => {
            const bgUrl = resolveBg(it.bg);
            return (
            <button key={i} data-noshot={undefined} onClick={() => remove(list, i)} title={t.tapShiny}
              style={{ position: "relative", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: "4px 2px", cursor: "pointer", overflow: "hidden" }}>
              {bgUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={bgUrl} alt="" aria-hidden="true" crossOrigin="anonymous"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />
              ) : (
                <>
                  {/* 반짝이 데코(9db식) — 배경 없을 때만 */}
                  <span style={{ position: "absolute", top: 4, left: 5, fontSize: "0.5rem", color: "#38bdf8" }}>✦</span>
                  <span style={{ position: "absolute", bottom: 6, right: 6, fontSize: "0.62rem", color: "#7dd3fc" }}>✦</span>
                  <span style={{ position: "absolute", top: 12, right: 8, fontSize: "0.42rem", color: "#bae6fd" }}>✦</span>
                </>
              )}
              {it.shiny && <span data-noshot="0" style={{ position: "absolute", top: 0, right: 3, fontSize: "0.8rem", zIndex: 2, filter: bgUrl ? "drop-shadow(0 1px 1px rgba(0,0,0,.5))" : undefined }}>✨</span>}
              {it.max && <span style={{ position: "absolute", bottom: -1, left: "50%", transform: "translateX(-50%)", fontSize: "0.46rem", fontWeight: 900, color: "#fff", background: it.max === "d" ? "#ef4444" : "#a855f7", borderRadius: 4, padding: "0px 4px", zIndex: 2, letterSpacing: "0.02em" }}>{it.max === "d" ? "DMAX" : "GMAX"}</span>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={spriteOf(it)} alt="" width={46} height={46} crossOrigin="anonymous"
                onError={(e) => { const fb = fallbackSprite(it); if (fb && e.currentTarget.src !== fb) e.currentTarget.src = fb; }}
                style={{ position: "relative", zIndex: 1, objectFit: "contain", display: "block", margin: "0 auto", filter: bgUrl ? "drop-shadow(0 1px 2px rgba(0,0,0,.45))" : undefined }} />
            </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        .tm-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:start;max-width:1000px;margin:0 auto}
        @media(max-width:820px){ .tm-grid{grid-template-columns:minmax(0,1fr)} }
      `}</style>
      <div className="tm-grid" ref={gridRef}>
      {/* ── 좌: 빌더 컨트롤 ── */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* 대상 섹션 */}
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b", marginBottom: 6 }}>{t.addTo}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button style={chipBtn(target === "want")} onClick={() => setTarget("want")}>🟢 {t.wanted}</button>
            <button style={chipBtn(target === "offer")} onClick={() => setTarget("offer")}>🟡 {t.offer}</button>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <button style={chipBtn(shinyMode)} onClick={() => setShinyMode((v) => !v)}>✨ {t.shinyMode}</button>
            <button style={chipBtn(maxMode === "d")} onClick={() => setMaxMode((m) => (m === "d" ? "" : "d"))}>🔴 {t.dmax}</button>
            <button style={chipBtn(maxMode === "g")} onClick={() => setMaxMode((m) => (m === "g" ? "" : "g"))}>🟣 {t.gmax}</button>
          </div>
        </div>
        {/* 🎨 배경 팔레트 — 접기(기본 닫힘). 누르면 배경들 펼쳐짐. */}
        <div>
          <button onClick={() => setBgOpen((v) => !v)}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 10px", borderRadius: 10, cursor: "pointer",
              border: "1px solid #dbe2ee", background: bgOpen ? "#f1f5ff" : "#fff", textAlign: "left" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b" }}>
              {t.bgSection} <span style={{ color: "#db2777", fontWeight: 700 }}>{t.bgBadge}</span>
              {curBg ? <span style={{ color: "#3b5bdb", fontWeight: 700 }}> · {bgLabel(curBg, lang)}</span> : null}
            </span>
            <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 800 }}>{bgOpen ? "▲" : "▼"}</span>
          </button>
          {bgOpen && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                {BG_SWATCHES.filter((s) => s.kind === "special").map((s) => {
                  const on = curBg === s.id;
                  return (
                    <button key={s.id || "none"} onClick={() => setCurBg(s.id)}
                      style={{ padding: "5px 11px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 800, cursor: "pointer",
                        border: on ? "none" : "1px solid #dbe2ee",
                        background: on ? "#3b5bdb" : "#fff", color: on ? "#fff" : "#475569" }}>
                      {s.id === "" ? "🚫 " : ""}{bgLabel(s.id, lang)}
                    </button>
                  );
                })}
              </div>
              {/* 전설 마스코트 (자시안·자마젠타·가이오가·그란돈·창조삼신 등) — 경쟁사 배경 대응 */}
              <div style={bgGroupLabel}>{t.bgLegendGroup}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                {BG_SWATCHES.filter((s) => s.kind === "legend").map((s) => bgSwatch(s, false))}
              </div>
              {/* 이벤트·우주 (울트라홀·고페 글로벌/피날레·바다·불·팀리더 등) */}
              <div style={bgGroupLabel}>{t.bgEventGroup}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                {BG_SWATCHES.filter((s) => s.kind === "event").map((s) => bgSwatch(s, false))}
              </div>
              {/* 지역 (고페 도시·지역축제) */}
              <div style={bgGroupLabel}>{t.bgRegionGroup}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                {BG_SWATCHES.filter((s) => s.kind === "region").map((s) => bgSwatch(s, false))}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 6 }}>{t.tapApplyBg}</div>
            </div>
          )}
        </div>
        {/* 검색 */}
        <div style={{ position: "relative" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPh}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #dbe2ee", borderRadius: 10, fontSize: "0.92rem" }} />
          {results.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 30, marginTop: 4, maxHeight: 320, overflowY: "auto", background: "#fff", border: "1px solid #dbe2ee", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)", padding: 6, display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 3 }}>
              {results.map((v, i) => (
                <button key={i} onClick={() => add(v)} title={nameOf(lang, v.dex) + (v.cf ? " (코스튬)" : "")}
                  style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, background: v.cf ? "#faf5ff" : "none", border: `1px solid ${v.cf ? "#e9d5ff" : "#eef2f7"}`, borderRadius: 8, padding: "5px 2px", cursor: "pointer" }}>
                  {shinyMode && v.hasShiny && <span style={{ position: "absolute", top: 0, right: 2, fontSize: "0.6rem" }}>✨</span>}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={variantSprite(v, shinyMode && v.hasShiny)} alt="" width={40} height={40} loading="lazy"
                    onError={(e) => { if (!v.cf) { const fb = pokeSprite(v.dex); if (e.currentTarget.src !== fb) e.currentTarget.src = fb; } }}
                    style={{ objectFit: "contain" }} />
                </button>
              ))}
            </div>
          )}
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 5 }}>{t.searchHint}</div>
        </div>
        {/* 트레이너 코드 */}
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b", marginBottom: 6 }}>{t.trainerCode}</div>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9\s]/g, "").slice(0, 14))} placeholder="1234 5678 9012"
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #dbe2ee", borderRadius: 10, fontSize: "0.92rem", letterSpacing: "0.05em" }} />
        </div>
      </div>

      {/* ── 우: 라이브 미리보기(캡처 대상) ── */}
      <div style={{ width: DESIGN_W * scale, maxWidth: "100%", margin: "0 auto", overflow: "hidden" }}>
        {/* 카드 출력 언어 선택(해외 공유용) — 캡처 대상 밖 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: "0.85rem" }}>🌐</span>
          {(["ko", "en", "ja", "zh-TW"] as Locale[]).map((lc) => (
            <button key={lc} onClick={() => setCardLang(lc)}
              style={{ padding: "5px 12px", borderRadius: 999, border: cardLang === lc ? "none" : "1px solid #dbe2ee",
                background: cardLang === lc ? "#3b5bdb" : "#fff", color: cardLang === lc ? "#fff" : "#475569",
                fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}>
              {lc === "ko" ? "한국어" : lc === "en" ? "English" : lc === "ja" ? "日本語" : "繁體中文"}
            </button>
          ))}
        </div>
        {/* 외부: 스케일된 크기로 흐름 높이 예약(버튼 위치 정확) · 내부: transform만 */}
        <div style={{ width: DESIGN_W * scale, height: cardH * scale, maxWidth: "100%", overflow: "hidden" }}>
          <div style={{ width: DESIGN_W, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <div ref={cardRef} style={{ width: "100%", background: "#ffffff", border: `1px solid ${LINE}`, borderRadius: 20, padding: "18px 18px 14px", boxShadow: "0 20px 50px -20px rgba(15,23,42,.3)" }}>
            <div style={{ textAlign: "center", fontSize: "1.5rem", fontWeight: 900, color: INK, letterSpacing: "0.02em", marginBottom: 12 }}>
              🔄 {ct.cardTitle}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Section list="want" items={want} title={ct.wanted} dot="🟢" />
              <Section list="offer" items={offer} title={ct.offer} dot="🟡" />
            </div>
            {/* 푸터 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${LINE}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gbl-icon.png" alt="" width={20} height={20} style={{ objectFit: "contain" }} />
                <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#1a2570" }}>gblnote.com</span>
              </div>
              {code.trim() && <span style={{ fontSize: "0.9rem", fontWeight: 800, color: INK, letterSpacing: "0.06em" }}>👤 {code.trim()}</span>}
            </div>
          </div>
          </div>
        </div>
        {/* 내보내기 — 완성 카드 바로 아래 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={share} disabled={busy} style={{ flex: 1, padding: "12px 16px", borderRadius: 999, border: "none", background: busy ? "#cbd5e1" : "linear-gradient(90deg,#db2777,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: busy ? "default" : "pointer" }}>{busy ? t.building : `📤 ${t.shareBtn}`}</button>
          <button onClick={download} disabled={busy} style={{ padding: "12px 18px", borderRadius: 999, border: "none", background: busy ? "#cbd5e1" : "#334155", color: "#fff", fontWeight: 800, fontSize: "0.95rem", cursor: busy ? "default" : "pointer" }}>💾 {t.saveBtn}</button>
        </div>
      </div>
      </div>
    </>
  );
}
