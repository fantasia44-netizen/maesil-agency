"use client";
// 팩 추천 계산기 — 목표 덱 최대 3개 선택 → 필요 카드 → 까야 할 팩 순위(적중률) + 공유카드.
import { useMemo, useState } from "react";
import { planPacks, PLANNABLE, deckName, type NeededCard } from "./compute";
import { packName } from "../loc";
import ShareCard, { shareUiFor } from "../ShareCard";
import { type Locale } from "../../../../lib/i18n";

const RSYM: Record<string, string> = { C: "◇", U: "◇◇", R: "◇◇◇", RF: "◇◇◇", RR: "◇◇◇◇", AR: "☆", SR: "☆☆", SAR: "☆☆", IM: "☆☆☆", S: "✸", SSR: "✸✸", UR: "👑" };

const L: Record<Locale, {
  title: string; intro: string; pickL: string; pick: string; empty: string;
  rankH: string; need: string; hit: string; exp: string; per: string; cards: string; unob: string; method: string;
  cardTitle: string; foot: string; mustOpen: string;
}> = {
  ko: { title: "팩 추천 계산기", intro: "만들고 싶은 덱을 고르면, 실제 공개 확률로 '지금 어떤 팩을 까야 하는지' 순위로 알려줍니다.", pickL: "목표 덱 (최대 3개)", pick: "덱 선택…", empty: "위에서 목표 덱을 하나 이상 고르세요.",
    rankH: "🎰 지금 까야 할 팩", need: "필요 카드", hit: "팩당 적중률", exp: "팩당 기대", per: "종", cards: "이 팩의 목표 카드", unob: "팩에서 안 나오는 카드(프로모·기타)", method: "필요 카드는 목표 덱들의 대회 대표 리스트 기준. 팩당 적중률 = 이 팩 1개를 열 때 목표 카드가 1장 이상 나올 확률(공개 슬롯 확률 × 카드풀). 보유 카드 제외는 다음 단계.",
    cardTitle: "지금 까야 할 팩", foot: "실제 공개 확률 × 대회 덱 데이터로 계산", mustOpen: "1순위" },
  en: { title: "Pack Advisor", intro: "Pick the decks you want to build — we rank which packs to open now, using real pull rates.", pickL: "Target decks (up to 3)", pick: "Pick a deck…", empty: "Pick at least one target deck above.",
    rankH: "🎰 Packs to open now", need: "Needed cards", hit: "Per-pack hit", exp: "Exp/pack", per: "", cards: "Target cards in this pack", unob: "Cards not from packs (promo/other)", method: "Needed cards are from the decks' tournament representative lists. Per-pack hit = probability of pulling ≥1 target card from one pack (slot pull rates × card pool). Owned-card exclusion is next.",
    cardTitle: "Pack to open now", foot: "Computed from real pull rates × tournament deck data", mustOpen: "#1" },
  ja: { title: "パック推奨計算機", intro: "作りたいデッキを選ぶと、実際の排出確率で『今どのパックを開くべきか』を順位で示します。", pickL: "目標デッキ(最大3つ)", pick: "デッキ選択…", empty: "上で目標デッキを1つ以上選んでください。",
    rankH: "🎰 今開くべきパック", need: "必要カード", hit: "パック当たり率", exp: "期待/パック", per: "種", cards: "このパックの目標カード", unob: "パックから出ないカード(プロモ他)", method: "必要カードは目標デッキの大会代表リスト基準。パック当たり率 = パック1個で目標カードが1枚以上出る確率(スロット確率×カードプール)。所持カード除外は次段階。",
    cardTitle: "今開くべきパック", foot: "実際の排出確率 × 大会デッキデータで計算", mustOpen: "1位" },
  "zh-TW": { title: "卡包推薦計算機", intro: "選擇想組的牌組，以實際開包機率排出『現在該開哪個卡包』。", pickL: "目標牌組(最多3個)", pick: "選擇牌組…", empty: "請在上方選至少一個目標牌組。",
    rankH: "🎰 現在該開的卡包", need: "所需卡片", hit: "每包命中率", exp: "期望/包", per: "種", cards: "此卡包的目標卡", unob: "卡包不會出的卡(промо等)", method: "所需卡片依目標牌組的賽事代表清單。每包命中率 = 開1包出現≥1張目標卡的機率(槽位機率×卡池)。排除已有卡為下一步。",
    cardTitle: "現在該開的卡包", foot: "以實際開包機率 × 賽事牌組數據計算", mustOpen: "#1" },
};

export default function PackPlannerClient({ lang }: { lang: Locale }) {
  const t = L[lang];
  const [sel, setSel] = useState<string[]>(["", "", ""]);
  const chosen = sel.filter(Boolean);
  const plan = useMemo(() => (chosen.length ? planPacks(chosen) : null), [sel.join("|")]);
  const cn = (c: NeededCard) => (c.nm && c.nm[lang]) || c.name;
  const opts = PLANNABLE;

  const selBox: React.CSSProperties = { fontSize: "0.85rem", padding: "8px 11px", borderRadius: 8, border: "1px solid #fbd8d8", background: "#fff", color: "#0f172a", fontWeight: 600, width: "100%" };
  const top = plan?.packs[0];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <p style={{ margin: "0 0 14px", fontSize: "0.88rem", color: "#5b4a4a", lineHeight: 1.6 }}>{t.intro}</p>

      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#64748b", marginBottom: 6 }}>{t.pickL}</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8, marginBottom: 18 }}>
        {[0, 1, 2].map((i) => (
          <select key={i} value={sel[i]} onChange={(e) => setSel((s) => s.map((v, j) => (j === i ? e.target.value : v)))} style={selBox}>
            <option value="">{t.pick}</option>
            {opts.map((d) => <option key={d.id} value={d.id}>[{d.tier}] {deckName(d, lang)}</option>)}
          </select>
        ))}
      </div>

      {!plan && <p style={{ fontSize: "0.85rem", color: "#94a3b8", padding: "1rem 0" }}>{t.empty}</p>}

      {plan && top && (
        <>
          {/* 1순위 공유카드 */}
          <div style={{ background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "1rem", marginBottom: 18 }}>
            <ShareCard ui={shareUiFor(lang)} filename="tcg-pack-advisor.png" shareTitle={`${t.cardTitle}: ${packName(lang, top.pack)}`} trackLabel={`pack:${top.set}:${top.pack}`} trackPath="/tcg/pack-planner" compact>
              <div style={{ width: 420, background: "linear-gradient(160deg,#fef3c7,#fef7f5)", padding: "22px 22px 18px", fontFamily: "system-ui,'Malgun Gothic',sans-serif" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>🎴</span><span style={{ fontSize: 18, fontWeight: 900, color: "#b91c1c" }}>TCG Note</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#b45309", marginBottom: 4 }}>🎰 {t.cardTitle}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", marginBottom: 10 }}>{packName(lang, top.pack)} <span style={{ fontSize: 13, color: "#94a3b8" }}>({top.set})</span></div>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1, background: "#fff", borderRadius: 10, padding: "9px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#d97706" }}>{top.coverage}{t.per}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.need}</div>
                  </div>
                  <div style={{ flex: 1, background: "#fff", borderRadius: 10, padding: "9px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "#16a34a" }}>{Math.round(top.hitRate * 100)}%</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.hit}</div>
                  </div>
                </div>
                <div style={{ background: "#fff", borderRadius: 10, padding: "9px 12px" }}>
                  {top.cards.slice(0, 4).map((c) => (
                    <div key={c.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "2px 0" }}>
                      <span style={{ color: "#0f172a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{RSYM[c.r] || ""} {cn(c)}</span>
                      <span style={{ color: "#64748b", flexShrink: 0 }}>{(c.p * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, paddingTop: 9, borderTop: "1px solid #f3d4d4", fontSize: 10.5, color: "#a15b5b", lineHeight: 1.5 }}>
                  {t.foot}<br /><b style={{ color: "#dc2626" }}>tcgnote.net</b>
                </div>
              </div>
            </ShareCard>
          </div>

          {/* 팩 순위 전체 */}
          <h2 style={{ margin: "0 0 10px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{t.rankH}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {plan.packs.map((pk, i) => (
              <div key={`${pk.set}-${pk.pack}`} style={{ background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "0.8rem 1rem", borderLeft: `4px solid ${i === 0 ? "#d97706" : "#fbd8d8"}` }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: "1.05rem", fontWeight: 900, color: i === 0 ? "#d97706" : "#94a3b8" }}>#{i + 1}</span>
                  <span style={{ fontSize: "0.98rem", fontWeight: 800, color: "#0f172a" }}>{packName(lang, pk.pack)}</span>
                  <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{pk.set}</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#475569" }}>{t.need} <b style={{ color: "#d97706" }}>{pk.coverage}{t.per}</b> · {t.hit} <b style={{ color: "#16a34a" }}>{Math.round(pk.hitRate * 100)}%</b></span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {pk.cards.map((c) => (
                    <span key={c.key} style={{ fontSize: "0.76rem", background: "#fef7f5", border: "1px solid #f6e0e0", borderRadius: 6, padding: "2px 8px", color: "#475569" }}>
                      {RSYM[c.r] || ""} {cn(c)} <span style={{ color: "#cbd5e1" }}>{(c.p * 100).toFixed(1)}%</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {plan.unobtainable.length > 0 && (
            <div style={{ marginTop: 14, fontSize: "0.78rem", color: "#94a3b8" }}>
              <b>{t.unob}:</b> {plan.unobtainable.map((c) => cn(c)).join(", ")}
            </div>
          )}
          <p style={{ marginTop: 14, fontSize: "0.72rem", color: "#cbd5e1", lineHeight: 1.6 }}>📐 {t.method}</p>
        </>
      )}
    </div>
  );
}
