"use client";
// 이중타입 상성 도구 — 타입 2개 선택 → 조합 방어 프로필(이중약점 ×2.56 / 약점 ×1.6 / 반감 ×0.625 / 이중반감 ×0.39).
// 일반 상성표는 흔하지만 "이중타입의 이중반감·이중약점"을 계산해주는 곳은 드묾(차별 콘텐츠).
import { useState } from "react";
import { ALL_TYPES, defensiveProfile } from "../../pokemon/[league]/[id]/typeChart";
import { typeLabel } from "../../typeLabels";
import type { Locale } from "../../../../../lib/i18n";

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};

const LB: Record<Locale, { h: string; note: string; t1: string; t2: string; none: string; dweak: string; weak: string; resist: string; dresist: string; neutralAll: string; presets: string }> = {
  ko: { h: "🔀 이중타입 상성 — 조합의 진짜 약점", note: "타입 2개를 고르면 곱연산으로 계산합니다. 양쪽 다 약점이면 이중약점 ×2.56, 양쪽 다 반감이면 이중반감 ×0.39 — 이 이중반감이 실전에서 '왜 안 아프지?' 하는 벽입니다.",
        t1: "타입 1", t2: "타입 2 (선택)", none: "— 없음(단일) —", dweak: "이중약점 ×2.56", weak: "약점 ×1.6", resist: "반감 ×0.625", dresist: "이중반감 ×0.39↓", neutralAll: "특별한 약점/반감 없음", presets: "예시" },
  en: { h: "🔀 Dual-Type Matchups — a combo's real weakness", note: "Pick two types and it multiplies. Weak to both = double weak ×2.56; resists both = double resist ×0.39 — that double-resist is the wall that makes attacks 'not hurt'.",
        t1: "Type 1", t2: "Type 2 (optional)", none: "— none (single) —", dweak: "Double weak ×2.56", weak: "Weak ×1.6", resist: "Resist ×0.625", dresist: "Double resist ×0.39↓", neutralAll: "No notable weakness/resist", presets: "Examples" },
  ja: { h: "🔀 複合タイプ相性 — 組み合わせの本当の弱点", note: "2タイプを選ぶと掛け算で計算。両方弱点なら二重弱点×2.56、両方半減なら二重半減×0.39 — この二重半減が「なぜ効かない?」の壁です。",
        t1: "タイプ1", t2: "タイプ2（任意）", none: "— なし(単一) —", dweak: "二重弱点 ×2.56", weak: "弱点 ×1.6", resist: "半減 ×0.625", dresist: "二重半減 ×0.39↓", neutralAll: "特筆すべき弱点/半減なし", presets: "例" },
  "zh-TW": { h: "🔀 雙屬性相剋 — 組合的真正弱點", note: "選兩個屬性即相乘計算。雙方皆弱=雙重弱點×2.56；雙方皆抗=雙重抵抗×0.39 — 這個雙重抵抗就是實戰中「怎麼不痛」的牆。",
        t1: "屬性1", t2: "屬性2（選填）", none: "— 無(單屬性) —", dweak: "雙重弱點 ×2.56", weak: "弱點 ×1.6", resist: "抵抗 ×0.625", dresist: "雙重抵抗 ×0.39↓", neutralAll: "無特別弱點/抵抗", presets: "範例" },
};

// 예시 조합(실존 유명 조합)
const PRESETS: [string, string][] = [["ground", "normal"], ["water", "flying"], ["grass", "ground"], ["dragon", "flying"], ["steel", "fairy"], ["ghost", "dark"]];

function Badge({ t, lang }: { t: string; lang: Locale }) {
  const c = TYPE_COLOR[t] || "#94a3b8";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", fontWeight: 700, color: "#fff", background: c, padding: "3px 9px 3px 5px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/gbl/types/${t}.svg`} alt="" width={15} height={15} style={{ display: "block" }} />
      {typeLabel(lang, t)}
    </span>
  );
}

function Row({ label, color, types, lang }: { label: string; color: string; types: string[]; lang: Locale }) {
  if (!types.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 7 }}>
      <span style={{ fontSize: "0.72rem", fontWeight: 800, color, minWidth: 96, flexShrink: 0, paddingTop: 3 }}>{label}</span>
      <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{types.map((x) => <Badge key={x} t={x} lang={lang} />)}</span>
    </div>
  );
}

export default function DualType({ lang }: { lang: Locale }) {
  const t = LB[lang] || LB.en;
  const [t1, setT1] = useState("ground");
  const [t2, setT2] = useState("normal");
  const types = [t1, ...(t2 && t2 !== "none" ? [t2] : [])];
  const dp = defensiveProfile(types);
  const sel: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid #dbe4f5", background: "#fff", fontSize: "0.86rem", fontWeight: 700, color: "#0f172a", flex: "1 1 140px" };
  const empty = !dp.doubleWeak.length && !dp.weak.length && !dp.resist.length && !dp.strongResist.length;

  return (
    <div style={{ margin: "18px 0 8px", background: "#fff", border: "1px solid #e3e8f2", borderRadius: 14, padding: "1rem 1.1rem" }}>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>{t.h}</h2>
      <p style={{ margin: "0 0 12px", fontSize: "0.82rem", color: "#64748b", lineHeight: 1.7 }}>{t.note}</p>

      {/* 셀렉터 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <select value={t1} onChange={(e) => setT1(e.target.value)} style={sel}>
          {ALL_TYPES.map((x) => <option key={x} value={x}>{typeLabel(lang, x)}</option>)}
        </select>
        <select value={t2} onChange={(e) => setT2(e.target.value)} style={sel}>
          <option value="none">{t.none}</option>
          {ALL_TYPES.filter((x) => x !== t1).map((x) => <option key={x} value={x}>{typeLabel(lang, x)}</option>)}
        </select>
      </div>
      {/* 예시 프리셋 */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700 }}>{t.presets}:</span>
        {PRESETS.map(([a, b]) => (
          <button key={a + b} onClick={() => { setT1(a); setT2(b); }}
            style={{ fontSize: "0.7rem", fontWeight: 700, border: "1px solid #e3e8f2", background: "#f8fafc", color: "#475569", borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}>
            {typeLabel(lang, a)}·{typeLabel(lang, b)}
          </button>
        ))}
      </div>

      {/* 선택 조합 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        {types.map((x) => <Badge key={x} t={x} lang={lang} />)}
      </div>

      {/* 결과 */}
      {empty ? (
        <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: 8 }}>{t.neutralAll}</div>
      ) : (
        <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 8, paddingTop: 4 }}>
          <Row label={t.dweak} color="#b91c1c" types={dp.doubleWeak} lang={lang} />
          <Row label={t.weak} color="#dc2626" types={dp.weak} lang={lang} />
          <Row label={t.resist} color="#0891b2" types={dp.resist} lang={lang} />
          <Row label={t.dresist} color="#334155" types={dp.strongResist} lang={lang} />
        </div>
      )}
    </div>
  );
}
