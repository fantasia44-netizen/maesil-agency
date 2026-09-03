"use client";
// 18×18 타입 상성 매트릭스(공격→방어) + 다운로드/공유. GO 배율(효과굉장 ×1.6 / 반감 ×0.625 / 이중반감 ×0.39).
// 원작의 "무효(0배)"는 GO에선 ×0.39(이중반감)이므로 0x가 아닌 0.4×로 표기.
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { ALL_TYPES, typeMult } from "../../pokemon/[league]/[id]/typeChart";
import { typeLabel } from "../../typeLabels";
import { shareDataUrl, saveDataUrl } from "../../raid/raidShareUtil";
import type { Locale } from "../../../../../lib/i18n";

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};

const LB: Record<Locale, { title: string; sub: string; defAxis: string; atkAxis: string; se: string; nve: string; dr: string; stab: string; download: string; share: string; scroll: string }> = {
  ko: { title: "포켓몬 GO 타입 상성표", sub: "Type Chart", defAxis: "방어 타입 (맞는 쪽)", atkAxis: "공격 타입 (때리는 쪽)",
        se: "효과굉장 ×1.6", nve: "반감 ×0.625", dr: "이중반감 ×0.39", stab: "자속(STAB) ×1.2 · 이중타입은 곱연산(이중약점 ×2.56)",
        download: "저장", share: "공유", scroll: "← 좌우로 넘겨보세요 →" },
  en: { title: "Pokémon GO Type Chart", sub: "Type Chart", defAxis: "Defending (hit)", atkAxis: "Attacking (hits)",
        se: "Super ×1.6", nve: "Resist ×0.625", dr: "Double resist ×0.39", stab: "STAB ×1.2 · dual types multiply (double weak ×2.56)",
        download: "Save", share: "Share", scroll: "← scroll horizontally →" },
  ja: { title: "ポケモンGO タイプ相性表", sub: "Type Chart", defAxis: "防御タイプ (受ける側)", atkAxis: "攻撃タイプ (与える側)",
        se: "抜群 ×1.6", nve: "半減 ×0.625", dr: "二重半減 ×0.39", stab: "タイプ一致 ×1.2 · 複合は掛け算（二重弱点 ×2.56）",
        download: "保存", share: "共有", scroll: "← 左右にスクロール →" },
  "zh-TW": { title: "寶可夢GO 屬性相剋表", sub: "Type Chart", defAxis: "防禦屬性 (被打)", atkAxis: "攻擊屬性 (出手)",
        se: "絕佳 ×1.6", nve: "抵抗 ×0.625", dr: "雙重抵抗 ×0.39", stab: "本系 ×1.2 · 雙屬性相乘（雙重弱點 ×2.56）",
        download: "儲存", share: "分享", scroll: "← 左右滑動 →" },
};

function cellOf(m: number): { bg: string; label: string; color: string } | null {
  if (m >= 2.5) return { bg: "#991b1b", label: "2.56×", color: "#fff" };
  if (m > 1.05) return { bg: "#dc2626", label: "1.6×", color: "#fff" };
  if (m <= 0.4) return { bg: "#334155", label: "0.4×", color: "#cbd5e1" };
  if (m < 0.95) return { bg: "#16a34a", label: "0.6×", color: "#fff" };
  return null;
}

function Ico({ t, size }: { t: string; size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: TYPE_COLOR[t] || "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 1px 2px rgba(0,0,0,.3)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/gbl/types/${t}.svg`} alt={t} width={Math.round(size * 0.6)} height={Math.round(size * 0.6)} style={{ display: "block" }} />
    </div>
  );
}

export default function TypeMatrix({ lang }: { lang: Locale }) {
  const t = LB[lang] || LB.en;
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const CELL = 34, ICO = 24, CORNER = 42;
  const boardW = CORNER + ALL_TYPES.length * CELL + 32; // 캡처 고정폭

  // 고정폭 요소 캡처(overflow 밖). skipFonts=폰트임베딩 hang 방지. 12초 타임아웃으로 버튼 영구멈춤 방지.
  const capture = async () => {
    const el = ref.current as HTMLElement;
    const p = toPng(el, { pixelRatio: 2, backgroundColor: "#f8fafc", skipFonts: true, width: el.scrollWidth, height: el.scrollHeight });
    return Promise.race([p, new Promise<string>((_, rej) => setTimeout(() => rej(new Error("capture timeout")), 12000))]);
  };
  const onSave = async () => { if (busy) return; setBusy(true); try { saveDataUrl(await capture(), "gbl-type-chart.png"); } catch { /* noop */ } setBusy(false); };
  const onShare = async () => { if (busy) return; setBusy(true); try { await shareDataUrl(await capture(), null, "gbl-type-chart.png", t.title, "gblnote.com"); } catch { /* noop */ } setBusy(false); };

  const btn: React.CSSProperties = { border: "none", cursor: "pointer", fontWeight: 800, fontSize: "0.84rem", borderRadius: 999, padding: "8px 18px", display: "inline-flex", alignItems: "center", gap: 6, color: "#fff" };

  return (
    <div style={{ margin: "14px 0 8px" }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
        <button onClick={onShare} disabled={busy} style={{ ...btn, background: busy ? "#94a3b8" : "linear-gradient(90deg,#3b5bdb,#7c3aed)" }}>📤 {t.share}</button>
        <button onClick={onSave} disabled={busy} style={{ ...btn, background: busy ? "#94a3b8" : "#334155" }}>💾 {t.download}</button>
      </div>
      <div style={{ fontSize: "0.68rem", color: "#94a3b8", textAlign: "center", marginBottom: 6 }}>{t.scroll}</div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: 14 }}>
        <div ref={ref} style={{ background: "#f8fafc", padding: 14, width: boardW, boxSizing: "border-box", border: "1px solid #e3e8f2", borderRadius: 14 }}>
          {/* 헤더: 타이틀 */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gbl-icon.png" alt="" width={26} height={26} />
            <div>
              <div style={{ color: "#0f172a", fontWeight: 900, fontSize: "0.98rem", lineHeight: 1.1 }}>{t.title}</div>
              <div style={{ color: "#6366f1", fontWeight: 800, fontSize: "0.66rem", letterSpacing: 1 }}>{t.sub} · gblnote.com</div>
            </div>
          </div>
          {/* 축 안내 — 왼쪽=공격(빨강) / 위=방어(파랑) */}
          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fee2e2", color: "#b91c1c", fontWeight: 800, fontSize: "0.66rem", borderRadius: 6, padding: "2px 8px" }}>⚔️ ← {t.atkAxis}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#dbeafe", color: "#1d4ed8", fontWeight: 800, fontSize: "0.66rem", borderRadius: 6, padding: "2px 8px" }}>🛡️ ↑ {t.defAxis}</span>
          </div>

          {/* 표 */}
          <div style={{ display: "inline-block" }}>
            {/* 방어 타입 바 + 방어 아이콘 헤더행 */}
            <div style={{ display: "flex", marginBottom: 3 }}>
              <div style={{ width: CORNER, flexShrink: 0 }} />
              <div style={{ width: ALL_TYPES.length * CELL, background: "linear-gradient(90deg,#1d4ed8,#2563eb)", color: "#fff", fontWeight: 800, fontSize: "0.66rem", textAlign: "center", borderRadius: 5, padding: "2px 0" }}>🛡️ {t.defAxis} ↓</div>
            </div>
            <div style={{ display: "flex" }}>
              {/* 코너: 공격 라벨 */}
              <div style={{ width: CORNER, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 3, position: "sticky", left: 0, background: "#f8fafc", zIndex: 2 }}>
                <span style={{ color: "#f87171", fontWeight: 900, fontSize: "0.6rem", lineHeight: 1 }}>⚔️</span>
                <span style={{ color: "#f87171", fontWeight: 900, fontSize: "0.56rem", lineHeight: 1.1 }}>{lang === "ko" ? "공격" : lang === "ja" ? "攻" : lang === "zh-TW" ? "攻" : "ATK"}↓</span>
              </div>
              {ALL_TYPES.map((d) => (
                <div key={d} style={{ width: CELL, display: "flex", justifyContent: "center", paddingBottom: 3 }}><Ico t={d} size={ICO} /></div>
              ))}
            </div>
            {/* 공격 타입 행들 — 첫 열(공격 아이콘) sticky로 가로 스크롤 시 유지 */}
            {ALL_TYPES.map((atk) => (
              <div key={atk} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ width: CORNER, flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center", position: "sticky", left: 0, background: "#f8fafc", zIndex: 1, borderRight: "2px solid #fca5a5" }}><Ico t={atk} size={ICO} /></div>
                {ALL_TYPES.map((def) => {
                  const cs = cellOf(typeMult(atk, def));
                  return (
                    <div key={def} style={{ width: CELL, height: CELL, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #cbd5e1", background: cs ? cs.bg : "#ffffff", boxSizing: "border-box" }}>
                      {cs && <span style={{ fontSize: 9, fontWeight: 800, color: cs.color }}>{cs.label}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 범례 + 자속 */}
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#334155", fontSize: "0.72rem", fontWeight: 700 }}><span style={{ width: 22, height: 15, borderRadius: 4, background: "#dc2626", display: "inline-block" }} />{t.se}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#334155", fontSize: "0.72rem", fontWeight: 700 }}><span style={{ width: 22, height: 15, borderRadius: 4, background: "#16a34a", display: "inline-block" }} />{t.nve}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#334155", fontSize: "0.72rem", fontWeight: 700 }}><span style={{ width: 22, height: 15, borderRadius: 4, background: "#334155", display: "inline-block", border: "1px solid #475569" }} />{t.dr}</span>
          </div>
          <div style={{ marginTop: 6, color: "#64748b", fontSize: "0.68rem", fontWeight: 600 }}>{t.stab}</div>
        </div>
      </div>
    </div>
  );
}
