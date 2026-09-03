// 18타입 약점·상성표(방어 기준 약점/반감/무효 + 공격 효과굉장) — 서버렌더, GO 배율 기준.
// 데이터는 포켓몬 상세의 typeChart(사실 데이터) 재사용. GO: 굉장 1.6 / 반감 0.625 / 무효 0.39 / 이중 곱연산.
import { ALL_TYPES, defensiveProfile, stabCoverage } from "../../pokemon/[league]/[id]/typeChart";
import { typeLabel } from "../../typeLabels";
import type { Locale } from "../../../../../lib/i18n";

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};

const LB: Record<Locale, { weak: string; resist: string; immune: string; se: string; none: string; header: string; note: string }> = {
  ko: { weak: "약점 ×1.6", resist: "반감 ×0.625", immune: "무효 ×0.39", se: "공격 강점", none: "없음",
        header: "타입별 약점·상성표 (포켓몬 GO 배율)", note: "GO는 원작과 배율이 다릅니다 — 효과굉장 ×1.6, 반감 ×0.625, 무효(원작 0배) ×0.39. 이중타입은 곱연산(이중약점 ×2.56, 이중반감 ×0.39)." },
  en: { weak: "Weak ×1.6", resist: "Resist ×0.625", immune: "Immune ×0.39", se: "Strong vs", none: "none",
        header: "Type weakness chart (Pokémon GO multipliers)", note: "GO differs from the main series — super effective ×1.6, resisted ×0.625, immune (0× in main) ×0.39. Dual types multiply (double weak ×2.56, double resist ×0.39)." },
  ja: { weak: "弱点 ×1.6", resist: "半減 ×0.625", immune: "無効 ×0.39", se: "攻撃で有利", none: "なし",
        header: "タイプ相性・弱点表（ポケモンGO倍率）", note: "GOは原作と倍率が異なります — 効果ばつぐん ×1.6、いまひとつ ×0.625、無効（原作0倍）×0.39。複合タイプは掛け算（二重弱点 ×2.56、二重半減 ×0.39）。" },
  "zh-TW": { weak: "弱點 ×1.6", resist: "抵抗 ×0.625", immune: "無效 ×0.39", se: "攻擊剋制", none: "無",
        header: "屬性弱點·相剋表（Pokémon GO 倍率）", note: "GO 與本傳倍率不同 — 效果絕佳 ×1.6、抵抗 ×0.625、無效（本傳0倍）×0.39。雙屬性為相乘（雙重弱點 ×2.56、雙重抵抗 ×0.39）。" },
};

function Badge({ t, lang }: { t: string; lang: Locale }) {
  const c = TYPE_COLOR[t] || "#94a3b8";
  return <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#fff", background: c, padding: "2px 8px", borderRadius: 7, whiteSpace: "nowrap", display: "inline-block" }}>{typeLabel(lang, t)}</span>;
}

function Row({ label, color, types, lang, none }: { label: string; color: string; types: string[]; lang: Locale; none: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 5 }}>
      <span style={{ fontSize: "0.68rem", fontWeight: 800, color, minWidth: 76, flexShrink: 0, paddingTop: 2 }}>{label}</span>
      <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {types.length ? types.map((x) => <Badge key={x} t={x} lang={lang} />) : <span style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>{none}</span>}
      </span>
    </div>
  );
}

export default function TypeChart({ lang }: { lang: Locale }) {
  const t = LB[lang] || LB.en;
  return (
    <div style={{ margin: "10px 0 20px" }}>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>🛡️ {t.header}</h2>
      <p style={{ margin: "0 0 12px", fontSize: "0.82rem", color: "#64748b", lineHeight: 1.7 }}>{t.note}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 8 }}>
        {ALL_TYPES.map((type) => {
          const dp = defensiveProfile([type]);
          const se = stabCoverage([type]);
          const c = TYPE_COLOR[type] || "#64748b";
          return (
            <div key={type} style={{ background: "#fff", border: "1px solid #e3e8f2", borderLeft: `4px solid ${c}`, borderRadius: 10, padding: "9px 11px" }}>
              <Badge t={type} lang={lang} />
              <Row label={t.weak} color="#dc2626" types={[...dp.weak, ...dp.doubleWeak]} lang={lang} none={t.none} />
              <Row label={t.resist} color="#0891b2" types={dp.resist} lang={lang} none={t.none} />
              {dp.strongResist.length > 0 && <Row label={t.immune} color="#64748b" types={dp.strongResist} lang={lang} none={t.none} />}
              <Row label={t.se} color="#16a34a" types={se} lang={lang} none={t.none} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
