"use client";
// 카운터 검색 — 상대 덱 선택 → 실제 대회 데이터로 그 덱을 이기는 카운터 TOP + 그 덱이 유리한 상대.
// 우리 매치업 행렬(matchups.json) 재활용. MU[A][B] = A가 B를 상대한 전적(A의 승/패).
import { useMemo, useState } from "react";
import Link from "next/link";
import META from "../data/meta.json";
import MATCHUPS from "../data/matchups.json";
import { localizePath, type Locale } from "../../../../lib/i18n";
import { track } from "../../../../lib/track";

type MDeck = { id: string; name: string; nm?: Record<string, string>; tier: string; share: number };
const DECKS = META.decks as MDeck[];
const MU = MATCHUPS as Record<string, Record<string, { w: number; l: number }>>;
const BY_ID: Record<string, MDeck> = Object.fromEntries(DECKS.map((d) => [d.id, d]));
const RANKED = new Set(DECKS.filter((d) => ["S", "A", "B", "C"].includes(d.tier)).map((d) => d.id));
const PICKABLE = DECKS.filter((d) => RANKED.has(d.id) && MU[d.id]).sort((a, b) => b.share - a.share);
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a" };

const L: Record<Locale, { title: string; pickL: string; counterH: string; counterP: string; favH: string; favP: string; wr: string; rec: string; none: string; note: string; analyzed: string }> = {
  ko: { title: "카운터 검색", pickL: "상대 덱", counterH: "🛡️ 이 덱을 이기는 카운터", counterP: "실제 대회에서 이 덱을 상대로 높은 승률을 낸 덱 (표본 8경기+).", favH: "⚔️ 이 덱이 유리한 상대", favP: "이 덱이 실제로 잘 이기는 상대.", wr: "승률", rec: "전적", none: "표본 충분한 상성 데이터 없음", note: "매치업은 Limitless 대회 결과 자체 집계 · 표본 8경기 이상만 표시", analyzed: "공략 보기" },
  en: { title: "Counter Finder", pickL: "Opponent deck", counterH: "🛡️ Decks that beat it (counters)", counterP: "Decks with a high real-tournament win rate against this deck (min 8 games).", favH: "⚔️ Favorable matchups", favP: "Decks this one actually beats.", wr: "Win %", rec: "Record", none: "No matchup data with enough sample", note: "Matchups aggregated from Limitless tournament results · min 8 games shown", analyzed: "Guide" },
  ja: { title: "カウンター検索", pickL: "相手デッキ", counterH: "🛡️ このデッキに勝つカウンター", counterP: "実際の大会でこのデッキ相手に高勝率を出したデッキ(8試合以上)。", favH: "⚔️ 有利な相手", favP: "このデッキが実際によく勝つ相手。", wr: "勝率", rec: "戦績", none: "十分なサンプルの相性データなし", note: "相性はLimitless大会結果の自前集計 · 8試合以上のみ表示", analyzed: "攻略" },
  "zh-TW": { title: "剋星查詢", pickL: "對手牌組", counterH: "🛡️ 剋制此牌組的牌組", counterP: "在實際賽事中對上此牌組勝率高的牌組(至少8場)。", favH: "⚔️ 有利對手", favP: "此牌組實際上常贏的對手。", wr: "勝率", rec: "戰績", none: "無足夠樣本的對戰資料", note: "對戰為Limitless賽事結果自行彙整 · 僅顯示8場以上", analyzed: "攻略" },
};

export default function CountersClient({ lang }: { lang: Locale }) {
  const t = L[lang];
  const [sel, setSel] = useState(PICKABLE[0]?.id || "");
  const dn = (id: string) => { const d = BY_ID[id]; return (d?.nm && d.nm[lang]) || d?.name || id; };
  const L2 = (p: string) => localizePath(lang, p);

  // 카운터: 모든 덱 D 중 MU[D][sel]이 있고 D의 승률(vs sel)이 높은 것 (D가 sel을 이김)
  const counters = useMemo(() => {
    const out: { id: string; wr: number; w: number; l: number }[] = [];
    for (const d of PICKABLE) {
      const r = MU[d.id]?.[sel];
      if (!r || d.id === sel) continue;
      const n = r.w + r.l;
      if (n < 8) continue;
      out.push({ id: d.id, wr: Math.round((r.w / n) * 100), w: r.w, l: r.l });
    }
    return out.sort((a, b) => b.wr - a.wr).slice(0, 12);
  }, [sel]);

  // 유리한 상대: MU[sel][X]에서 sel의 승률 높은 것
  const favorable = useMemo(() => {
    const out: { id: string; wr: number; w: number; l: number }[] = [];
    for (const [oid, r] of Object.entries(MU[sel] || {})) {
      if (!RANKED.has(oid)) continue;
      const n = r.w + r.l;
      if (n < 8) continue;
      out.push({ id: oid, wr: Math.round((r.w / n) * 100), w: r.w, l: r.l });
    }
    return out.sort((a, b) => b.wr - a.wr).slice(0, 12);
  }, [sel]);

  const sel2: React.CSSProperties = { fontSize: "0.9rem", padding: "8px 12px", borderRadius: 8, border: "1px solid #fbd8d8", background: "#fff", color: "#0f172a", fontWeight: 700, maxWidth: 360, width: "100%" };
  const Row = ({ id, wr, w, l, good }: { id: string; wr: number; w: number; l: number; good: boolean }) => {
    const d = BY_ID[id];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderTop: "1px solid #f6e0e0" }}>
        {d && <span style={{ background: TIER_COLOR[d.tier] || "#64748b", color: "#fff", borderRadius: 5, padding: "0 6px", fontSize: "0.7rem", fontWeight: 900 }}>{d.tier}</span>}
        <Link href={L2(`/tcg/decks/${id}`)} style={{ flex: 1, fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", textDecoration: "none", minWidth: 0 }}>{dn(id)}</Link>
        <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: good ? "#16a34a" : "#dc2626" }}>{wr}%</span>
        <span style={{ minWidth: 44, textAlign: "right", fontSize: "0.76rem", color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{w}–{l}</span>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: "0.78rem", color: "#64748b", marginBottom: 4 }}>{t.pickL}</label>
        <select value={sel} onChange={(e) => { setSel(e.target.value); track("counter_search", undefined, e.target.value, "tcg"); }} style={sel2}>
          {PICKABLE.map((d) => <option key={d.id} value={d.id}>{dn(d.id)} ({d.tier})</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
        <section style={{ background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "0.9rem 1rem" }}>
          <h2 style={{ margin: "0 0 3px", fontSize: "0.95rem", fontWeight: 800, color: "#b91c1c" }}>{t.counterH}</h2>
          <p style={{ margin: "0 0 6px", fontSize: "0.76rem", color: "#64748b", lineHeight: 1.5 }}>{t.counterP}</p>
          {counters.length === 0 ? <div style={{ fontSize: "0.82rem", color: "#94a3b8", padding: "8px 0" }}>{t.none}</div> :
            counters.map((c) => <Row key={c.id} {...c} good />)}
        </section>
        <section style={{ background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "0.9rem 1rem" }}>
          <h2 style={{ margin: "0 0 3px", fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>{t.favH}</h2>
          <p style={{ margin: "0 0 6px", fontSize: "0.76rem", color: "#64748b", lineHeight: 1.5 }}>{t.favP}</p>
          {favorable.length === 0 ? <div style={{ fontSize: "0.82rem", color: "#94a3b8", padding: "8px 0" }}>{t.none}</div> :
            favorable.map((c) => <Row key={c.id} {...c} good />)}
        </section>
      </div>
      <p style={{ marginTop: 14, fontSize: "0.7rem", color: "#cbd5e1" }}>{t.note}</p>
    </div>
  );
}
