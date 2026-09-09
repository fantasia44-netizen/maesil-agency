// 카운터 검색 — 서버(메타데이터·설명) + 클라이언트 도구. 우리 대회 매치업 데이터 재활용.
import Link from "next/link";
import type { Metadata } from "next";
import CountersClient from "./CountersClient";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const revalidate = 3600;
const PATH = "/tcg/counters";

const T: Record<Locale, { title: string; desc: string; h1: string; intro: string }> = {
  ko: { title: "포켓몬 카드 게임 Pocket 덱 카운터 검색 — 실제 대회 승률", desc: "포켓몬 카드 게임 Pocket 덱 카운터 검색. 상대 덱을 고르면 실제 대회에서 그 덱을 높은 승률로 이긴 카운터 덱을 보여줍니다.", h1: "덱 카운터 검색", intro: "요즘 자주 만나는 덱이 있나요? 상대 덱을 고르면 실제 대회 데이터로 그 덱을 이긴 카운터 덱을 승률 순으로 보여줍니다. 감이 아니라 실측 상성입니다." },
  en: { title: "Pokémon TCG Pocket Deck Counter Finder — Real Win Rates", desc: "Pokémon TCG Pocket counter finder. Pick an opponent deck and see the decks that beat it with the highest real-tournament win rate.", h1: "Deck Counter Finder", intro: "Facing a deck too often? Pick the opponent and see which decks beat it, sorted by real-tournament win rate. Measured matchups, not opinion." },
  ja: { title: "ポケポケ デッキカウンター検索 — 実際の大会勝率", desc: "ポケモンカードゲーム Pocket のカウンター検索。相手デッキを選ぶと、実際の大会でそのデッキに高勝率で勝ったカウンターデッキを表示。", h1: "デッキカウンター検索", intro: "よく当たるデッキがありますか？相手デッキを選ぶと、実際の大会データでそれに勝ったカウンターを勝率順に表示します。感覚ではなく実測の相性です。" },
  "zh-TW": { title: "寶可夢卡牌 Pocket 牌組剋星查詢 — 真實賽事勝率", desc: "寶可夢集換式卡牌 Pocket 剋星查詢。選擇對手牌組，即顯示在實際賽事中以高勝率剋制它的牌組。", h1: "牌組剋星查詢", intro: "常遇到某個牌組嗎？選擇對手牌組，即以實際賽事數據依勝率顯示剋制它的牌組。是實測對戰，而非憑感覺。" },
};

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return { title: `${t.title} | TCG Note`, description: t.desc, alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) }, openGraph: { title: `${t.title} | TCG Note`, description: t.desc, url: localizePath(lang, PATH), type: "website" } };
}

export default function CountersPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ fontSize: "0.78rem", marginBottom: 6 }}><Link href={localizePath(lang, "/tcg")} style={{ color: "#dc2626", textDecoration: "none" }}>← TCG Note</Link></div>
      <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>
      <p style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>{t.intro}</p>
      <CountersClient lang={lang} />
    </div>
  );
}
