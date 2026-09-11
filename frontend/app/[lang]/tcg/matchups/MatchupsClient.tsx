"use client";
// 덱 상성 분석 — 내 덱(메타 아키타입) 선택 → 현재 메타 상대별 승률 + 점유율 가중 "메타 기대 승률".
// counters(상대 잡기)와 달리 "내 덱이 메타 전체에서 강한가/약한가"를 종합. matchups + 점유율 재활용.
import { useMemo, useState } from "react";
import Link from "next/link";
import META from "../data/meta.json";
import MATCHUPS from "../data/matchups.json";
import { localizePath, type Locale } from "../../../../lib/i18n";
import ShareCard, { shareUiFor } from "../ShareCard";

type MDeck = { id: string; name: string; nm?: Record<string, string>; tier: string; share: number };
const DECKS = META.decks as MDeck[];
const MU = MATCHUPS as Record<string, Record<string, { w: number; l: number }>>;
const BY_ID: Record<string, MDeck> = Object.fromEntries(DECKS.map((d) => [d.id, d]));
const RANKED = new Set(DECKS.filter((d) => ["S", "A", "B", "C"].includes(d.tier)).map((d) => d.id));
const PICKABLE = DECKS.filter((d) => RANKED.has(d.id) && MU[d.id]).sort((a, b) => b.share - a.share);
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a" };
const MIN = 8;

const L: Record<Locale, {
  title: string; intro: string; pickL: string; expWR: string; strong: string; even: string; weak: string;
  strongH: string; weakH: string; allH: string; wr: string; rec: string; sh: string; none: string; method: string;
  cardTitle: string; foot: string; vsField: string;
}> = {
  ko: { title: "덱 상성 분석", intro: "내 덱을 고르면, 현재 메타 상대별 승률과 점유율을 반영한 '메타 기대 승률'을 계산합니다.", pickL: "내 덱", expWR: "메타 기대 승률", strong: "메타에서 강함", even: "메타에서 무난", weak: "메타에서 약함", strongH: "⚔️ 강한 상대", weakH: "🛡️ 약한 상대(주의)", allH: "전체 상성", wr: "승률", rec: "전적", sh: "점유율", none: "표본 충분한 상성 데이터 없음", method: "메타 기대 승률 = 각 상대 승률을 그 상대의 점유율로 가중 평균(표본 8경기+ 상대만). 상대를 자주 만날수록 크게 반영됩니다. 매치업은 Limitless 대회 결과 자체 집계.", cardTitle: "메타 상성", foot: "실제 대회 매치업 × 점유율 가중", vsField: "vs 현재 메타" },
  en: { title: "Deck Matchup Analysis", intro: "Pick your deck to compute a meta-share-weighted 'expected win rate' vs the current field.", pickL: "Your deck", expWR: "Expected vs meta", strong: "Strong in meta", even: "Even in meta", weak: "Weak in meta", strongH: "⚔️ Good matchups", weakH: "🛡️ Bad matchups (watch)", allH: "Full spread", wr: "Win %", rec: "Record", sh: "Share", none: "No matchup data with enough sample", method: "Expected win rate = each matchup win rate weighted by that opponent's meta share (min 8 games). The more you face an opponent, the more it counts. Matchups aggregated from Limitless results.", cardTitle: "Meta matchups", foot: "Real tournament matchups × share-weighted", vsField: "vs current meta" },
  ja: { title: "デッキ相性分析", intro: "自分のデッキを選ぶと、現環境の相手別勝率と使用率を反映した『メタ期待勝率』を計算します。", pickL: "マイデッキ", expWR: "メタ期待勝率", strong: "環境で強い", even: "環境で無難", weak: "環境で弱い", strongH: "⚔️ 有利な相手", weakH: "🛡️ 不利な相手(注意)", allH: "全相性", wr: "勝率", rec: "戦績", sh: "使用率", none: "十分なサンプルの相性データなし", method: "メタ期待勝率 = 各相手の勝率をその相手の使用率で加重平均(8試合以上)。よく当たる相手ほど大きく反映。相性はLimitless結果の自前集計。", cardTitle: "メタ相性", foot: "実際の大会マッチアップ × 使用率加重", vsField: "vs 現環境" },
  "zh-TW": { title: "牌組對戰分析", intro: "選擇你的牌組，計算以對手使用率加權的『對環境期望勝率』。", pickL: "我的牌組", expWR: "對環境期望勝率", strong: "環境中強勢", even: "環境中普通", weak: "環境中偏弱", strongH: "⚔️ 有利對手", weakH: "🛡️ 不利對手(注意)", allH: "完整對戰", wr: "勝率", rec: "戰績", sh: "使用率", none: "無足夠樣本的對戰資料", method: "對環境期望勝率 = 各對手勝率以其使用率加權平均(至少8場)。越常遇到的對手權重越大。對戰為Limitless結果自行彙整。", cardTitle: "環境對戰", foot: "實際賽事對戰 × 使用率加權", vsField: "vs 目前環境" },
};

export default function MatchupsClient({ lang }: { lang: Locale }) {
  const t = L[lang];
  const [sel, setSel] = useState(PICKABLE[0]?.id || "");
  const dn = (id: string) => { const d = BY_ID[id]; return (d?.nm && d.nm[lang]) || d?.name || id; };
  const L2 = (p: string) => localizePath(lang, p);

  const data = useMemo(() => {
    const rows: { id: string; wr: number; w: number; l: number; share: number }[] = [];
    for (const [oid, r] of Object.entries(MU[sel] || {})) {
      if (!RANKED.has(oid) || oid === sel) continue;
      const n = r.w + r.l; if (n < MIN) continue;
      rows.push({ id: oid, wr: Math.round((r.w / n) * 100), w: r.w, l: r.l, share: BY_ID[oid]?.share || 0 });
    }
    rows.sort((a, b) => b.wr - a.wr);
    const wsum = rows.reduce((a, r) => a + r.share, 0);
    const exp = wsum ? Math.round(rows.reduce((a, r) => a + r.wr * r.share, 0) / wsum * 10) / 10 : null;
    return { rows, exp };
  }, [sel]);

  const exp = data.exp;
  const verdict = exp == null ? "" : exp >= 53 ? t.strong : exp >= 47 ? t.even : t.weak;
  const vColor = exp == null ? "#94a3b8" : exp >= 53 ? "#16a34a" : exp >= 47 ? "#d97706" : "#dc2626";
  const strong = data.rows.filter((r) => r.wr >= 55).slice(0, 5);
  const weak = [...data.rows].filter((r) => r.wr <= 45).sort((a, b) => a.wr - b.wr).slice(0, 5);
  const selDeck = BY_ID[sel];

  const selBox: React.CSSProperties = { fontSize: "0.9rem", padding: "8px 12px", borderRadius: 8, border: "1px solid #fbd8d8", background: "#fff", color: "#0f172a", fontWeight: 700, maxWidth: 380, width: "100%" };
  const Row = ({ id, wr, w, l, share }: { id: string; wr: number; w: number; l: number; share: number }) => {
    const d = BY_ID[id];
    const c = wr >= 55 ? "#16a34a" : wr <= 45 ? "#dc2626" : "#64748b";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderTop: "1px solid #f6e0e0" }}>
        {d && <span style={{ background: TIER_COLOR[d.tier] || "#64748b", color: "#fff", borderRadius: 5, padding: "0 6px", fontSize: "0.7rem", fontWeight: 900 }}>{d.tier}</span>}
        <Link href={L2(`/tcg/decks/${id}`)} style={{ flex: 1, fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", textDecoration: "none", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dn(id)}</Link>
        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{t.sh} {share}%</span>
        <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: c, minWidth: 40, textAlign: "right" }}>{wr}%</span>
        <span style={{ minWidth: 44, textAlign: "right", fontSize: "0.74rem", color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{w}–{l}</span>
      </div>
    );
  };

  return (
    <div>
      <p style={{ margin: "0 0 14px", fontSize: "0.88rem", color: "#5b4a4a", lineHeight: 1.6 }}>{t.intro}</p>
      <label style={{ display: "block", fontSize: "0.78rem", color: "#64748b", marginBottom: 4 }}>{t.pickL}</label>
      <select value={sel} onChange={(e) => setSel(e.target.value)} style={selBox}>
        {PICKABLE.map((d) => <option key={d.id} value={d.id}>[{d.tier}] {dn(d.id)}</option>)}
      </select>

      {exp != null && (
        <>
          {/* 기대 승률 공유카드 */}
          <div style={{ background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "1rem", margin: "16px 0" }}>
            <ShareCard ui={shareUiFor(lang)} filename={`tcg-matchup-${sel}.png`} shareTitle={`${dn(sel)} ${t.vsField}`} trackLabel={`matchup:${sel}`} trackPath="/tcg/matchups" compact>
              <div style={{ width: 420, background: "linear-gradient(160deg,#fee6e6,#fef7f5)", padding: "22px 22px 18px", fontFamily: "system-ui,'Malgun Gothic',sans-serif" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>🎴</span><span style={{ fontSize: 18, fontWeight: 900, color: "#b91c1c" }}>TCG Note</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  {selDeck && <span style={{ background: "#dc2626", color: "#fff", borderRadius: 6, padding: "1px 9px", fontSize: 13, fontWeight: 900 }}>{selDeck.tier}</span>}
                  <span style={{ fontSize: 16, fontWeight: 900, color: "#0f172a", flex: 1, minWidth: 0, lineHeight: 1.2, wordBreak: "keep-all" }}>{dn(sel)}</span>
                </div>
                <div style={{ background: "#fff", borderRadius: 12, padding: "12px", textAlign: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{t.expWR} · {t.vsField}</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: vColor, lineHeight: 1 }}>{exp}%</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: vColor, marginTop: 3 }}>{verdict}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, background: "#fff", borderRadius: 10, padding: "8px 10px", borderLeft: "3px solid #16a34a" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#16a34a", marginBottom: 3 }}>{t.strongH}</div>
                    {strong.slice(0, 3).map((r) => <div key={r.id} style={{ fontSize: 11.5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, padding: "1px 0" }}><span style={{ color: "#334155", flex: 1, minWidth: 0, lineHeight: 1.25, wordBreak: "keep-all" }}>{dn(r.id)}</span><b style={{ color: "#16a34a", flexShrink: 0 }}>{r.wr}%</b></div>)}
                    {strong.length === 0 && <div style={{ fontSize: 11, color: "#cbd5e1" }}>-</div>}
                  </div>
                  <div style={{ flex: 1, background: "#fff", borderRadius: 10, padding: "8px 10px", borderLeft: "3px solid #dc2626" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#dc2626", marginBottom: 3 }}>{t.weakH}</div>
                    {weak.slice(0, 3).map((r) => <div key={r.id} style={{ fontSize: 11.5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, padding: "1px 0" }}><span style={{ color: "#334155", flex: 1, minWidth: 0, lineHeight: 1.25, wordBreak: "keep-all" }}>{dn(r.id)}</span><b style={{ color: "#dc2626", flexShrink: 0 }}>{r.wr}%</b></div>)}
                    {weak.length === 0 && <div style={{ fontSize: 11, color: "#cbd5e1" }}>-</div>}
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 9, borderTop: "1px solid #f3d4d4", fontSize: 10.5, color: "#a15b5b", lineHeight: 1.5 }}>{t.foot}<br /><b style={{ color: "#dc2626" }}>tcgnote.net</b></div>
              </div>
            </ShareCard>
          </div>

          {/* 전체 상성 */}
          <h2 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{t.allH}</h2>
          <div style={{ background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "0.4rem 1rem 0.8rem" }}>
            {data.rows.length === 0 ? <div style={{ fontSize: "0.82rem", color: "#94a3b8", padding: "10px 0" }}>{t.none}</div> :
              data.rows.map((r) => <Row key={r.id} {...r} />)}
          </div>
          <p style={{ marginTop: 14, fontSize: "0.72rem", color: "#cbd5e1", lineHeight: 1.6 }}>📐 {t.method}</p>
        </>
      )}
    </div>
  );
}
