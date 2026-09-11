// 덱 상성 분석 — 내 덱 → 메타 상대별 승률 + 점유율 가중 기대 승률. counters(상대잡기)와 짝.
import type { Metadata } from "next";
import MatchupsClient from "./MatchupsClient";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const dynamic = "force-dynamic";
const PATH = "/tcg/matchups";

const META: Record<Locale, { title: string; desc: string; h1: string }> = {
  ko: { title: "덱 상성 분석 — 내 덱 메타 기대 승률", desc: "내 덱을 고르면 현재 메타 상대별 승률과 점유율 가중 기대 승률을 실제 대회 데이터로 계산. 강한/약한 상대까지.", h1: "⚔️ 덱 상성 분석" },
  en: { title: "Deck Matchup Analysis — Expected WR vs Meta", desc: "Pick your deck for a meta-share-weighted expected win rate vs the current field, from real tournament data, plus good and bad matchups.", h1: "⚔️ Deck Matchup Analysis" },
  ja: { title: "デッキ相性分析 — メタ期待勝率", desc: "自分のデッキを選ぶと、現環境の相手別勝率と使用率加重の期待勝率を実際の大会データで計算。有利・不利相手も。", h1: "⚔️ デッキ相性分析" },
  "zh-TW": { title: "牌組對戰分析 — 對環境期望勝率", desc: "選擇牌組，以實際賽事數據計算對手使用率加權的期望勝率，並列出有利與不利對手。", h1: "⚔️ 牌組對戰分析" },
};

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const m = META[lang];
  return {
    title: `${m.title} | TCG Note`,
    description: m.desc,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) },
    openGraph: { title: `${m.title} | TCG Note`, description: m.desc, url: localizePath(lang, PATH), type: "website" },
  };
}

export default function MatchupsPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.4rem 1rem 3rem" }}>
      <h1 style={{ margin: "0 0 10px", fontSize: "clamp(1.3rem,4.5vw,1.6rem)", fontWeight: 900, color: "#b91c1c" }}>{META[lang].h1}</h1>
      <MatchupsClient lang={lang} />
    </div>
  );
}
