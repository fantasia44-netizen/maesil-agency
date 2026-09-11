// 이번 주 덱 브리핑 — 대회 데이터로 자동 생성되는 "지금 뭘 써야 하는지" 페이지(바이럴 엔진).
// 6종: 급상승·급락·인기·승률·저평가·거품. 전부 compute.ts에서 표본 게이팅+Wilson으로 산출.
import Link from "next/link";
import type { Metadata } from "next";
import { RISING, FALLING, POPULAR, TOP_WR, UNDERRATED, OVERRATED, BRIEF_META, type BDeck } from "./compute";
import BriefingShare, { type Highlight } from "./BriefingShare";
import { analyzedDeckIds } from "../decks/analysis";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const revalidate = 3600;
const PATH = "/tcg/briefing";

type L10 = {
  title: string; desc: string; h1: string; intro: string;
  rising: string; falling: string; popular: string; topwr: string; underrated: string; overrated: string;
  risingS: string; fallingS: string; popularS: string; topwrS: string; underratedS: string; overratedS: string;
  share: string; wr: string; games: string; useRank: string; wrRank: string; recent: string; view: string;
  method: string; empty: string;
  shareUi: string; saveUi: string; copyUi: string; copiedUi: string; closeUi: string; cardTitle: string; cardFooter: string; dateLabel: (d: string) => string;
};

const T: Record<Locale, L10> = {
  ko: {
    title: "이번 주 덱 브리핑 — 지금 뜨는·강한·과대평가 덱",
    desc: "포켓포켓 이번 주 덱 브리핑 — 급상승·인기·승률·저평가·거품 덱을 실제 대회 데이터로 자동 계산. 표본·Wilson 보정.",
    h1: "이번 주 덱 브리핑",
    intro: "지금 뭘 써야 하는지 — 실제 대회 데이터로 계산한 급상승·인기·승률·저평가·거품 덱. 매 집계마다 자동 갱신됩니다.",
    rising: "🔥 최근 급상승 덱", falling: "📉 급락 덱", popular: "👑 현재 인기 덱",
    topwr: "🏆 승률 TOP", underrated: "💎 저평가 덱 (숨은 꿀덱)", overrated: "☠️ 거품 덱 (과대평가)",
    risingS: "최근 7일 승률이 30일 평균보다 크게 오른 덱", fallingS: "최근 승률이 꺾인 덱 — 메타 변화 신호",
    popularS: "지금 대회에서 가장 많이 쓰는 덱(점유율)", topwrS: "표본 충분한 덱 중 Wilson 하한 승률 상위",
    underratedS: "적게 쓰는데 실제 승률은 높은 덱 — 사용률 순위 ≪ 승률 순위", overratedS: "많이 쓰는데 실제 승률은 낮은 덱 — 사용률 순위 ≫ 승률 순위",
    share: "사용률", wr: "승률", games: "경기", useRank: "사용", wrRank: "승률", recent: "최근7일", view: "덱 보기 →",
    method: "표본이 충분한 덱만 노출하고, 승률은 표본 크기를 보정한 Wilson 95% 하한으로 계산합니다. 저평가·거품은 절대 승률이 아니라 '사용률 순위 vs 승률 순위'의 격차로 판정 — 표본 없는 덱은 제외됩니다.",
    empty: "이번 집계에는 조건을 만족하는 덱이 없습니다.",
    shareUi: "공유", saveUi: "이미지 저장", copyUi: "링크 복사", copiedUi: "복사됨", closeUi: "닫기", cardTitle: "이번 주 덱 브리핑",
    cardFooter: `최근 ${BRIEF_META.windowDays}일 · ${BRIEF_META.tournaments}개 대회 · ${BRIEF_META.matches.toLocaleString()}경기 실제 승률 계산`,
    dateLabel: (d) => `${d} 기준 · Tournament Meta`,
  },
  en: {
    title: "Weekly Deck Briefing — Rising, Strong & Overrated Decks",
    desc: "Pokémon TCG Pocket weekly deck briefing — rising, popular, top win-rate, underrated and overrated decks, auto-computed from real tournament data with Wilson correction.",
    h1: "Weekly Deck Briefing",
    intro: "What to play right now — rising, popular, top win-rate, underrated and overrated decks computed from real tournament data. Auto-updates every aggregation.",
    rising: "🔥 Rising decks", falling: "📉 Falling decks", popular: "👑 Most-played decks",
    topwr: "🏆 Top win rate", underrated: "💎 Underrated (hidden gems)", overrated: "☠️ Overrated (bubble)",
    risingS: "7-day win rate up sharply vs the 30-day average", fallingS: "Win rate falling — a meta-shift signal",
    popularS: "Most-played decks in tournaments right now (share)", topwrS: "Highest Wilson-lower-bound win rate among well-sampled decks",
    underratedS: "Low usage but high real win rate — usage rank ≪ win-rate rank", overratedS: "High usage but low real win rate — usage rank ≫ win-rate rank",
    share: "Usage", wr: "WR", games: "games", useRank: "Use", wrRank: "WR", recent: "7-day", view: "View deck →",
    method: "Only well-sampled decks are shown, and win rate uses the sample-corrected Wilson 95% lower bound. Underrated/overrated is judged by the gap between usage rank and win-rate rank — not absolute win rate — so low-sample decks are excluded.",
    empty: "No decks met the criteria in this aggregation.",
    shareUi: "Share", saveUi: "Save image", copyUi: "Copy link", copiedUi: "Copied", closeUi: "Close", cardTitle: "Weekly Deck Briefing",
    cardFooter: `Last ${BRIEF_META.windowDays}d · ${BRIEF_META.tournaments} tournaments · ${BRIEF_META.matches.toLocaleString()} games`,
    dateLabel: (d) => `As of ${d} · Tournament Meta`,
  },
  ja: {
    title: "今週のデッキブリーフィング — 急上昇・強い・過大評価デッキ",
    desc: "ポケポケ 今週のデッキブリーフィング — 急上昇・人気・勝率・過小評価・過大評価デッキを実際の大会データで自動計算。Wilson補正。",
    h1: "今週のデッキブリーフィング",
    intro: "今何を使うべきか — 実際の大会データで計算した急上昇・人気・勝率・過小評価・過大評価デッキ。集計ごとに自動更新。",
    rising: "🔥 急上昇デッキ", falling: "📉 急落デッキ", popular: "👑 人気デッキ",
    topwr: "🏆 勝率TOP", underrated: "💎 過小評価(隠れ強デッキ)", overrated: "☠️ 過大評価(バブル)",
    risingS: "直近7日勝率が30日平均より大きく上昇", fallingS: "勝率が下降 — メタ変化のサイン",
    popularS: "今の大会で最も使われるデッキ(使用率)", topwrS: "十分なサンプルのうちWilson下限勝率が上位",
    underratedS: "使用率は低いのに実勝率が高い — 使用率順位 ≪ 勝率順位", overratedS: "使用率は高いのに実勝率が低い — 使用率順位 ≫ 勝率順位",
    share: "使用率", wr: "勝率", games: "戦", useRank: "使用", wrRank: "勝率", recent: "直近7日", view: "デッキを見る →",
    method: "十分なサンプルのデッキのみ表示し、勝率はサンプル補正したWilson95%下限で計算。過小/過大評価は絶対勝率ではなく『使用率順位と勝率順位の差』で判定 — 低サンプルは除外。",
    empty: "今回の集計では条件を満たすデッキがありません。",
    shareUi: "共有", saveUi: "画像を保存", copyUi: "リンクをコピー", copiedUi: "コピー完了", closeUi: "閉じる", cardTitle: "今週のデッキブリーフィング",
    cardFooter: `直近${BRIEF_META.windowDays}日 · ${BRIEF_META.tournaments}大会 · ${BRIEF_META.matches.toLocaleString()}戦`,
    dateLabel: (d) => `${d}時点 · Tournament Meta`,
  },
  "zh-TW": {
    title: "本週牌組簡報 — 急升·強勢·被高估牌組",
    desc: "寶可夢集換式卡牌 Pocket 本週牌組簡報 — 急升·熱門·勝率·被低估·被高估牌組，以實際賽事數據自動計算，Wilson 校正。",
    h1: "本週牌組簡報",
    intro: "現在該用什麼 — 以實際賽事數據計算的急升·熱門·勝率·被低估·被高估牌組。每次彙整自動更新。",
    rising: "🔥 近期急升牌組", falling: "📉 急跌牌組", popular: "👑 熱門牌組",
    topwr: "🏆 勝率 TOP", underrated: "💎 被低估(隱藏強牌)", overrated: "☠️ 被高估(泡沫)",
    risingS: "近7日勝率相對30日均值大幅上升", fallingS: "勝率下滑 — 環境變化訊號",
    popularS: "目前賽事中最多人用的牌組(使用率)", topwrS: "樣本足夠的牌組中 Wilson 下限勝率前段",
    underratedS: "使用率低但實際勝率高 — 使用率排名 ≪ 勝率排名", overratedS: "使用率高但實際勝率低 — 使用率排名 ≫ 勝率排名",
    share: "使用率", wr: "勝率", games: "場", useRank: "使用", wrRank: "勝率", recent: "近7日", view: "查看牌組 →",
    method: "僅顯示樣本足夠的牌組，勝率以樣本校正的 Wilson 95% 下限計算。被低估/高估以『使用率排名與勝率排名的差距』判定，而非絕對勝率 — 低樣本牌組排除。",
    empty: "本次彙整沒有符合條件的牌組。",
    shareUi: "分享", saveUi: "儲存圖片", copyUi: "複製連結", copiedUi: "已複製", closeUi: "關閉", cardTitle: "本週牌組簡報",
    cardFooter: `近${BRIEF_META.windowDays}日 · ${BRIEF_META.tournaments}場賽事 · ${BRIEF_META.matches.toLocaleString()}場對戰`,
    dateLabel: (d) => `${d} · Tournament Meta`,
  },
};

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return {
    title: `${t.title} | TCG Note`,
    description: t.desc,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) },
    openGraph: { title: `${t.title} | TCG Note`, description: t.desc, url: localizePath(lang, PATH), type: "website" },
  };
}

const BORDER = "#fbd8d8";
const nameOf = (d: BDeck, lang: Locale) => (d.nm && d.nm[lang]) || d.name;

export default function BriefingPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  const L = (p: string) => localizePath(lang, p);
  const analyzed = analyzedDeckIds();
  const dateOnly = BRIEF_META.generatedAt.slice(0, 10);

  // 섹션별 지표 렌더러
  const sections: { key: string; title: string; sub: string; color: string; list: BDeck[]; metric: (d: BDeck) => string; sub2?: (d: BDeck) => string }[] = [
    { key: "rising", title: t.rising, sub: t.risingS, color: "#16a34a", list: RISING,
      metric: (d) => `${d.wr7 ?? d.wr3 ?? d.winrate}% ${trendStr(d)}` },
    { key: "popular", title: t.popular, sub: t.popularS, color: "#d97706", list: POPULAR,
      metric: (d) => `${d.share}%`, sub2: (d) => `${t.wr} ${d.winrate}% · ${d.n.toLocaleString()}${t.games}` },
    { key: "topwr", title: t.topwr, sub: t.topwrS, color: "#2563eb", list: TOP_WR,
      metric: (d) => `${d.winrate}%`, sub2: (d) => `Wilson ${d.wilsonLo}% · ${d.n.toLocaleString()}${t.games}` },
    { key: "underrated", title: t.underrated, sub: t.underratedS, color: "#7c3aed", list: UNDERRATED,
      metric: (d) => `${d.winrate}%`, sub2: (d) => rankStr(d, t) },
    { key: "overrated", title: t.overrated, sub: t.overratedS, color: "#dc2626", list: OVERRATED,
      metric: (d) => `${d.winrate}%`, sub2: (d) => rankStr(d, t) },
    { key: "falling", title: t.falling, sub: t.fallingS, color: "#64748b", list: FALLING,
      metric: (d) => `${d.wr7 ?? d.wr3 ?? d.winrate}% ${trendStr(d)}` },
  ];

  // 공유카드 하이라이트(각 섹션 1위)
  const hi = (list: BDeck[], emoji: string, label: string, metric: (d: BDeck) => string, color: string, sub?: (d: BDeck) => string): Highlight | null => {
    const d = list[0]; if (!d) return null;
    return { emoji, label, deck: nameOf(d, lang), metric: metric(d), color, sub: sub ? sub(d) : undefined };
  };
  const highlights = [
    hi(RISING, "🔥", strip(t.rising), (d) => `${d.wr7 ?? d.winrate}% ${trendStr(d)}`, "#16a34a"),
    hi(POPULAR, "👑", strip(t.popular), (d) => `${d.share}%`, "#d97706"),
    hi(UNDERRATED, "💎", strip(t.underrated), (d) => `${d.winrate}%`, "#7c3aed", (d) => rankStr(d, t)),
    hi(OVERRATED, "☠️", strip(t.overrated), (d) => `${d.winrate}%`, "#dc2626", (d) => rankStr(d, t)),
  ].filter(Boolean) as Highlight[];

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "1.4rem 1rem 3rem" }}>
      <h1 style={{ margin: "0 0 6px", fontSize: "clamp(1.3rem,4.5vw,1.7rem)", fontWeight: 900, color: "#b91c1c" }}>{t.h1}</h1>
      <p style={{ margin: "0 0 4px", fontSize: "0.88rem", color: "#5b4a4a", lineHeight: 1.6 }}>{t.intro}</p>
      <p style={{ margin: "0 0 18px", fontSize: "0.74rem", color: "#94a3b8" }}>{dateOnly} · {BRIEF_META.tournaments} tournaments · {BRIEF_META.players.toLocaleString()} players · {BRIEF_META.matches.toLocaleString()} matches</p>

      {/* 공유카드 */}
      {highlights.length > 0 && (
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "1rem", marginBottom: 20 }}>
          <BriefingShare highlights={highlights} dateLabel={t.dateLabel(dateOnly)}
            ui={{ share: t.shareUi, save: t.saveUi, copy: t.copyUi, copied: t.copiedUi, close: t.closeUi, title: t.cardTitle, footer: t.cardFooter }} />
        </div>
      )}

      {/* 6 섹션 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
        {sections.map((s) => (
          <section key={s.key} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.8rem 1rem", borderTop: `3px solid ${s.color}` }}>
            <h2 style={{ margin: "0 0 2px", fontSize: "0.98rem", fontWeight: 800, color: "#0f172a" }}>{s.title}</h2>
            <p style={{ margin: "0 0 8px", fontSize: "0.73rem", color: "#94a3b8", lineHeight: 1.4 }}>{s.sub}</p>
            {s.list.length === 0 && <p style={{ fontSize: "0.8rem", color: "#cbd5e1", padding: "6px 0" }}>{t.empty}</p>}
            {s.list.map((d) => {
              const inner = (
                <div style={{ padding: "6px 0", borderTop: "1px solid #f6e0e0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.tier && <b style={{ color: s.color, marginRight: 4 }}>[{d.tier}]</b>}{nameOf(d, lang)}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: "0.85rem", fontWeight: 800, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.metric(d)}</span>
                  </div>
                  {s.sub2 && <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 1 }}>{s.sub2(d)}</div>}
                </div>
              );
              return analyzed.includes(d.id)
                ? <Link key={d.id} href={L(`/tcg/decks/${d.id}`)} style={{ textDecoration: "none", display: "block" }}>{inner}</Link>
                : <div key={d.id}>{inner}</div>;
            })}
          </section>
        ))}
      </div>

      <p style={{ margin: "18px 0 0", fontSize: "0.72rem", color: "#a3a3b3", lineHeight: 1.6, background: "#fef7f5", borderRadius: 8, padding: "10px 12px" }}>
        📐 {t.method}
      </p>
    </div>
  );
}

function trendStr(d: BDeck): string {
  const v = d.trend ? d.trend.d : 0;
  return `${v > 0 ? "+" : ""}${v}%p`;
}
function rankStr(d: BDeck, t: L10): string {
  return `${t.useRank} #${d.shareRank} · ${t.wrRank} #${d.wrRank} · ${d.n.toLocaleString()}${t.games}`;
}
function strip(s: string): string {
  // 앞 이모지 제거(공유카드 라벨용)
  return s.replace(/^[^\p{L}\p{N}]+/u, "").trim();
}
