// 대표 덱 심층 공략 — 실제 대회 덱리스트 + 통계 + 매치업 행렬(데이터) + 원본 전략(analysis).
// 얕은 페이지 금지 → 원본 전략(analysis)이 있는 덱만 상세 페이지 생성. 없는 덱은 notFound.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import META from "../../data/meta.json";
import DECKS from "../../data/decks.json";
import MATCHUPS from "../../data/matchups.json";
import { getDeckAnalysis, analyzedDeckIds } from "../analysis";
import DeckShareCard from "./DeckShareCard";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, locales, type Locale } from "../../../../../lib/i18n";
import { elementName } from "../../loc";

export const revalidate = 3600;

type Card = { count: number; set: string; number: string; name: string; nm?: Record<string, string> };
type Deck = { id: string; name: string; nm?: Record<string, string>; icons: string[]; tier: string; share: number; winrate: number; wilsonLo: number; n: number; wr3?: number | null; n3?: number; wr7?: number | null; n7?: number; trend?: { d: number; w: number } | null; decklist: { pokemon: Card[]; trainer: Card[]; energy: string[] } | null; sampleFrom: { wins: number; losses: number } | null };
const DECK_LIST = DECKS as Deck[];
const NAME_BY_ID: Record<string, string> = Object.fromEntries((META.decks as { id: string; name: string }[]).map((d) => [d.id, d.name]));
const NM_BY_ID: Record<string, Record<string, string> | undefined> = Object.fromEntries((META.decks as { id: string; nm?: Record<string, string> }[]).map((d) => [d.id, d.nm]));
const dName = (id: string, name: string, lang: string) => (NM_BY_ID[id] && NM_BY_ID[id]![lang]) || name;
const MU = MATCHUPS as Record<string, Record<string, { w: number; l: number }>>;

export function generateStaticParams() {
  return analyzedDeckIds().flatMap((id) => locales.map((lang) => ({ lang, id })));
}

const ENERGY_COLOR: Record<string, string> = {
  Grass: "#3fa129", Fire: "#e62829", Water: "#2980ef", Lightning: "#d9a900", Psychic: "#ef4179",
  Fighting: "#ff8000", Darkness: "#4b4243", Metal: "#5a8a9c", Dragon: "#5060e1", Colorless: "#9fa19f",
};
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a" };

const L10N: Record<Locale, {
  share: string; win: string; sample: string; tierWord: string;
  listH: string; pokemon: string; trainer: string; energy: string; fromRecord: string;
  matchupH: string; matchupP: string; vsCol: string; wrCol: string; recCol: string; best: string; worst: string;
  planH: string; keyH: string; techH: string; updated: string; src: string; back: string; minNote: string; foot: string;
  periodH: string; d3: string; d7: string; d30: string; games: string; lowSample: string; trendMsg: (d: number, w: number) => string;
}> = {
  ko: { share: "점유율", win: "승률", sample: "표본", tierWord: "티어",
    listH: "🎴 대표 덱리스트", pokemon: "포켓몬", trainer: "트레이너", energy: "에너지", fromRecord: "출전 성적",
    matchupH: "⚔️ 상성 (실제 대회 데이터)", matchupP: "이 덱이 각 상대 덱을 만났을 때 실제 승률입니다(표본 8경기 이상).", vsCol: "상대 덱", wrCol: "승률", recCol: "전적", best: "유리", worst: "불리",
    planH: "🎯 운영 전략", keyH: "핵심 카드", techH: "🔄 대체·테크 카드", updated: "최근 업데이트", src: "통계 출처: Limitless TCG · 대회 결과 자체 집계", back: "← 전체 덱 티어", minNote: "표본이 적은 상대는 제외", foot: "최근 30일 대회 데이터 · 실제 승률",
    periodH: "📈 기간별 승률 (최근 흐름)", d3: "최근 3일", d7: "최근 7일", d30: "최근 30일", games: "전", lowSample: "표본 부족", trendMsg: (d, w) => `최근 ${w}일 승률이 30일 평균보다 ${d > 0 ? "+" : ""}${d}%p ${d >= 0 ? "높습니다" : "낮습니다"} (${d > 1.5 ? "상승세" : d < -1.5 ? "하락세" : "보합"}).` },
  en: { share: "Share", win: "Win %", sample: "N", tierWord: "Tier",
    listH: "🎴 Representative decklist", pokemon: "Pokémon", trainer: "Trainer", energy: "Energy", fromRecord: "Record",
    matchupH: "⚔️ Matchups (real tournament data)", matchupP: "Actual win rate when this deck faced each opponent (min 8 games).", vsCol: "Opponent", wrCol: "Win %", recCol: "Record", best: "Favored", worst: "Unfavored",
    planH: "🎯 Game plan", keyH: "Key cards", techH: "🔄 Tech / flex cards", updated: "Updated", src: "Stats: Limitless TCG · aggregated by us", back: "← All deck tiers", minNote: "Low-sample opponents excluded", foot: "Last 30 days tournament data · real win rate",
    periodH: "📈 Win rate by period (recent trend)", d3: "Last 3 days", d7: "Last 7 days", d30: "Last 30 days", games: "games", lowSample: "low sample", trendMsg: (d, w) => `The last ${w}-day win rate is ${d > 0 ? "+" : ""}${d}%p vs the 30-day average (${d > 1.5 ? "rising" : d < -1.5 ? "falling" : "flat"}).` },
  ja: { share: "使用率", win: "勝率", sample: "N", tierWord: "ティア",
    listH: "🎴 代表デッキリスト", pokemon: "ポケモン", trainer: "トレーナー", energy: "エネルギー", fromRecord: "戦績",
    matchupH: "⚔️ 相性(実際の大会データ)", matchupP: "このデッキが各相手と対戦した実際の勝率(8試合以上)。", vsCol: "相手デッキ", wrCol: "勝率", recCol: "戦績", best: "有利", worst: "不利",
    planH: "🎯 立ち回り", keyH: "キーカード", techH: "🔄 入れ替え候補", updated: "更新", src: "統計出典: Limitless TCG · 自前集計", back: "← デッキティア一覧", minNote: "サンプル僅少の相手は除外", foot: "直近30日の大会データ · 実勝率",
    periodH: "📈 期間別勝率(最近の傾向)", d3: "直近3日", d7: "直近7日", d30: "直近30日", games: "戦", lowSample: "サンプル僅少", trendMsg: (d, w) => `直近${w}日の勝率は30日平均より ${d > 0 ? "+" : ""}${d}%p (${d > 1.5 ? "上昇" : d < -1.5 ? "下降" : "横ばい"})。` },
  "zh-TW": { share: "使用率", win: "勝率", sample: "N", tierWord: "強度",
    listH: "🎴 代表牌組", pokemon: "寶可夢", trainer: "訓練家", energy: "能量", fromRecord: "戰績",
    matchupH: "⚔️ 對戰(實際賽事數據)", matchupP: "此牌組對上各對手的實際勝率(至少8場)。", vsCol: "對手牌組", wrCol: "勝率", recCol: "戰績", best: "有利", worst: "不利",
    planH: "🎯 操作策略", keyH: "關鍵卡", techH: "🔄 替換·彈性卡", updated: "更新", src: "數據來源: Limitless TCG · 自行彙整", back: "← 全部牌組強度", minNote: "樣本過少的對手已排除", foot: "近30日賽事數據 · 實際勝率",
    periodH: "📈 期間別勝率(近期趨勢)", d3: "近3日", d7: "近7日", d30: "近30日", games: "場", lowSample: "樣本不足", trendMsg: (d, w) => `近${w}日勝率較30日均值 ${d > 0 ? "+" : ""}${d}%p (${d > 1.5 ? "上升" : d < -1.5 ? "下降" : "持平"})。` },
};

export function generateMetadata({ params }: { params: { lang: string; id: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const deck = DECK_LIST.find((d) => d.id === params.id);
  const a = getDeckAnalysis(params.id, lang);
  if (!deck || !a) return {};
  const path = `/tcg/decks/${params.id}`;
  const title = `${dName(deck.id, deck.name, lang)} — ${a.playstyle} · ${lang === "ko" ? "덱 공략·상성" : lang === "ja" ? "デッキ攻略・相性" : lang === "zh-TW" ? "牌組攻略·對戰" : "Deck Guide · Matchups"} | TCG Note`;
  return {
    title, description: a.summary,
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    openGraph: { title, description: a.summary, url: localizePath(lang, path), type: "article" },
  };
}

export default function DeckDetailPage({ params }: { params: { lang: string; id: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = L10N[lang];
  const L = (p: string) => localizePath(lang, p);
  const cn = (c: Card) => (c.nm && c.nm[lang]) || c.name; // 덱리스트 카드명 현지화(포켓몬)
  const deck = DECK_LIST.find((d) => d.id === params.id);
  const a = getDeckAnalysis(params.id, lang);
  if (!deck || !a) notFound();

  // 매치업 — 승률 계산 + 상대명, 표본 8+ 필터, 승률 정렬
  const rows = Object.entries(MU[deck.id] || {})
    .map(([oid, r]) => ({ oid, name: dName(oid, NAME_BY_ID[oid] || oid, lang), w: r.w, l: r.l, n: r.w + r.l, wr: r.w + r.l ? Math.round((r.w / (r.w + r.l)) * 100) : 0 }))
    .filter((x) => x.n >= 8)
    .sort((x, y) => y.wr - x.wr);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ fontSize: "0.78rem", marginBottom: 8 }}>
        <Link href={L("/tcg/tier")} style={{ color: "#dc2626", textDecoration: "none" }}>{t.back}</Link>
      </div>

      {/* 헤더 + 통계 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ background: TIER_COLOR[deck.tier] || "#64748b", color: "#fff", borderRadius: 7, padding: "2px 11px", fontSize: "1rem", fontWeight: 900 }}>{deck.tier}</span>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.2 }}>{dName(deck.id, deck.name, lang)}</h1>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.85rem", color: "#475569", marginBottom: 14 }}>
        <span>{t.share} <b style={{ color: "#dc2626" }}>{deck.share}%</b></span>
        <span>{t.win} <b style={{ color: deck.winrate >= 50 ? "#16a34a" : "#dc2626" }}>{deck.winrate}%</b></span>
        <span>{t.sample} <b>{deck.n.toLocaleString()}</b></span>
        <span style={{ color: "#94a3b8" }}>{t.updated} {new Date(META.generatedAt).toISOString().slice(0, 10)}</span>
      </div>

      {/* 대표덱 공유카드 (바이럴) */}
      <div style={{ background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "1rem", marginBottom: 16 }}>
        <DeckShareCard id={deck.id} name={dName(deck.id, deck.name, lang)} tier={deck.tier} share={deck.share}
          recentWr={deck.wr7 ?? deck.wr3 ?? deck.winrate} trendD={deck.trend ? deck.trend.d : 0} n={deck.n}
          fav={rows.filter((r) => r.wr >= 50).slice(0, 2).map((r) => ({ name: r.name, wr: r.wr }))}
          threat={(() => { const w = rows[rows.length - 1]; return w && w.wr < 50 ? { name: w.name, wr: w.wr } : null; })()}
          ui={{ share: t.share, win: t.win, games: t.games, best: t.best, worst: t.worst, d7: t.d7, foot: t.foot }} lang={lang} />
      </div>

      {/* 기간별 승률 — 2층 자체분석(재방문 루프): 관측 승률을 3/7/30일 창으로 + 추세. 표본 게이팅. */}
      <section style={{ background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "0.9rem 1.1rem", marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>{t.periodH}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {[{ label: t.d3, wr: deck.wr3 ?? null, n: deck.n3 ?? 0, cmp: true },
            { label: t.d7, wr: deck.wr7 ?? null, n: deck.n7 ?? 0, cmp: true },
            { label: t.d30, wr: deck.winrate, n: deck.n, cmp: false }].map((p, i) => {
            const enough = p.n >= 20 && p.wr != null;
            const delta = p.cmp && enough ? (p.wr as number) - deck.winrate : 0;
            const arrow = !p.cmp || !enough ? "" : delta > 1.5 ? "↑" : delta < -1.5 ? "↓" : "→";
            const arrowColor = delta > 1.5 ? "#16a34a" : delta < -1.5 ? "#dc2626" : "#94a3b8";
            const low = p.n > 0 && p.n < 15;
            return (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: "0.88rem" }}>
                <span style={{ width: 78, color: "#64748b" }}>{p.label}</span>
                {p.wr != null && p.n > 0 ? (
                  <>
                    <span style={{ fontWeight: 900, fontVariantNumeric: "tabular-nums", color: (p.wr as number) >= 50 ? "#16a34a" : "#dc2626" }}>{p.wr}%</span>
                    {arrow && <span style={{ fontWeight: 900, color: arrowColor }}>{arrow}</span>}
                    <span style={{ fontSize: "0.76rem", color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>{p.n.toLocaleString()}{t.games}{low ? ` · ${t.lowSample}` : ""}</span>
                  </>
                ) : (
                  <span style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>— {t.lowSample}</span>
                )}
              </div>
            );
          })}
        </div>
        {deck.trend && <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "#b91c1c", fontWeight: 600 }}>{t.trendMsg(deck.trend.d, deck.trend.w)}</p>}
      </section>

      {/* 원본 전략 */}
      <section style={{ background: "#fef6f5", border: "1px solid #fbd8d8", borderRadius: 12, padding: "1rem 1.1rem", marginBottom: 16 }}>
        <p style={{ margin: "0 0 10px", fontSize: "0.92rem", color: "#0f172a", lineHeight: 1.75, fontWeight: 600 }}>{a.summary}</p>
        <h2 style={{ margin: "0 0 4px", fontSize: "0.9rem", fontWeight: 800, color: "#b91c1c" }}>{t.planH}</h2>
        <p style={{ margin: "0 0 10px", fontSize: "0.86rem", color: "#475569", lineHeight: 1.75 }}>{a.gamePlan}</p>
        {a.keyCards.length > 0 && (
          <>
            <h2 style={{ margin: "0 0 4px", fontSize: "0.9rem", fontWeight: 800, color: "#b91c1c" }}>{t.keyH}</h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.85rem", color: "#475569", lineHeight: 1.7 }}>
              {a.keyCards.map((k, i) => <li key={i}>{k}</li>)}
            </ul>
          </>
        )}
        {a.techCards && a.techCards.length > 0 && (
          <>
            <h2 style={{ margin: "10px 0 4px", fontSize: "0.9rem", fontWeight: 800, color: "#b91c1c" }}>{t.techH}</h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.85rem", color: "#475569", lineHeight: 1.7 }}>
              {a.techCards.map((k, i) => <li key={i}>{k}</li>)}
            </ul>
          </>
        )}
      </section>

      {/* 매치업 행렬 — 데이터 스타 기능 */}
      {rows.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 2px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{t.matchupH}</h2>
          <p style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "#64748b" }}>{t.matchupP}</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
              <thead><tr style={{ color: "#94a3b8", textAlign: "left", fontSize: "0.74rem" }}>
                <th style={{ padding: "4px 8px", fontWeight: 700 }}>{t.vsCol}</th>
                <th style={{ padding: "4px 8px", fontWeight: 700, textAlign: "right" }}>{t.wrCol}</th>
                <th style={{ padding: "4px 8px", fontWeight: 700, textAlign: "right" }}>{t.recCol}</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.oid} style={{ borderTop: "1px solid #f6e0e0" }}>
                    <td style={{ padding: "7px 8px", fontWeight: 600, color: "#0f172a" }}>
                      {analyzedDeckIds().includes(r.oid) ? <Link href={L(`/tcg/decks/${r.oid}`)} style={{ color: "#0f172a", textDecoration: "none" }}>{r.name}</Link> : r.name}
                    </td>
                    <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: r.wr >= 55 ? "#16a34a" : r.wr <= 45 ? "#dc2626" : "#475569" }}>
                      {r.wr}% {r.wr >= 55 ? `· ${t.best}` : r.wr <= 45 ? `· ${t.worst}` : ""}
                    </td>
                    <td style={{ padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#94a3b8" }}>{r.w}–{r.l}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "0.7rem", color: "#cbd5e1" }}>{t.minNote}</p>
        </section>
      )}

      {/* 대표 덱리스트 */}
      {deck.decklist && (
        <section style={{ marginBottom: 8 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{t.listH}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <div style={{ background: "#fff", border: "1px solid #fbd8d8", borderRadius: 10, padding: "0.7rem 0.9rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#b91c1c", marginBottom: 4 }}>{t.pokemon}</div>
              {(deck.decklist.pokemon || []).map((c, i) => (
                <div key={i} style={{ fontSize: "0.83rem", color: "#334155", padding: "2px 0" }}><b>{c.count}×</b> {cn(c)}</div>
              ))}
            </div>
            <div style={{ background: "#fff", border: "1px solid #fbd8d8", borderRadius: 10, padding: "0.7rem 0.9rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#b91c1c", marginBottom: 4 }}>{t.trainer}</div>
              {(deck.decklist.trainer || []).map((c, i) => (
                <div key={i} style={{ fontSize: "0.83rem", color: "#334155", padding: "2px 0" }}><b>{c.count}×</b> {cn(c)}</div>
              ))}
              <div style={{ marginTop: 8, fontSize: "0.78rem", fontWeight: 800, color: "#b91c1c" }}>{t.energy}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 3 }}>
                {(deck.decklist.energy || []).map((e, i) => (
                  <span key={i} style={{ fontSize: "0.74rem", fontWeight: 700, color: "#fff", background: ENERGY_COLOR[e] || "#9fa19f", borderRadius: 999, padding: "2px 9px" }}>{elementName(lang, e)}</span>
                ))}
              </div>
            </div>
          </div>
          {deck.sampleFrom && (
            <p style={{ margin: "8px 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>{t.fromRecord}: {deck.sampleFrom.wins}–{deck.sampleFrom.losses}</p>
          )}
        </section>
      )}

      <p style={{ marginTop: 18, fontSize: "0.72rem", color: "#cbd5e1" }}>{t.src}</p>
    </div>
  );
}
