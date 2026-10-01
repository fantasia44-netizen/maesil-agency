// 메타덱 완성하기 — 보유 카드 체크 → 없는 카드 → 까야 할 팩. 재방문 유도(체크 기록이 쌓이는 도구).
import type { Metadata } from "next";
import CompleteClient from "./CompleteClient";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const dynamic = "force-dynamic";
const PATH = "/tcg/deck-complete";

const META: Record<Locale, { title: string; desc: string; h1: string }> = {
  ko: { title: "메타덱 완성하기 — 내 카드로 만들 수 있는 덱", desc: "덱리스트에서 가진 카드를 체크하면 부족한 카드와 지금 까야 할 팩을 알려줍니다. 보유 카드만으로 완성되는 메타덱도 한눈에.", h1: "🧩 메타덱 완성하기" },
  en: { title: "Complete a Meta Deck — What You Can Build", desc: "Check the cards you own in a decklist and see what's missing plus which packs to open. Also shows which meta decks you can already build.", h1: "🧩 Complete a Meta Deck" },
  ja: { title: "環境デッキ完成 — 手持ちで組めるデッキ", desc: "デッキリストで所持カードをチェックすると、足りないカードと開くべきパックが分かります。所持カードだけで組めるデッキも一覧。", h1: "🧩 環境デッキ完成" },
  "zh-TW": { title: "完成環境牌組 — 你能組出什麼", desc: "在牌組清單勾選持有卡片，立刻看到缺少的卡與該開的卡包，也會列出現在就能組成的環境牌組。", h1: "🧩 完成環境牌組" },
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

export default function DeckCompletePage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.4rem 1rem 3rem" }}>
      <h1 style={{ margin: "0 0 10px", fontSize: "clamp(1.3rem,4.5vw,1.6rem)", fontWeight: 900, color: "#b91c1c" }}>{META[lang].h1}</h1>
      <CompleteClient lang={lang} />
    </div>
  );
}
