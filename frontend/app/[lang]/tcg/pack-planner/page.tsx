// 팩 추천 계산기 — 목표 덱 → 까야 할 팩 순위(공개 확률). 리테인 도구(계속 돌아오는 유틸).
import type { Metadata } from "next";
import PackPlannerClient from "./PackPlannerClient";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const dynamic = "force-dynamic";
const PATH = "/tcg/pack-planner";

const META: Record<Locale, { title: string; desc: string; h1: string }> = {
  ko: { title: "팩 추천 계산기 — 어떤 팩 까야 하나", desc: "만들고 싶은 덱을 고르면 실제 공개 확률로 지금 까야 할 팩을 순위로. 젬 쓰기 전에 계획하세요.", h1: "🎰 팩 추천 계산기" },
  en: { title: "Pack Advisor — Which Pack to Open", desc: "Pick the decks you want and get a ranked list of which packs to open now, from real pull rates. Plan before you spend gems.", h1: "🎰 Pack Advisor" },
  ja: { title: "パック推奨計算機 — どのパックを開く?", desc: "作りたいデッキを選ぶと、実際の排出確率で今開くべきパックを順位で。ジェムを使う前に計画を。", h1: "🎰 パック推奨計算機" },
  "zh-TW": { title: "卡包推薦計算機 — 該開哪個包", desc: "選想組的牌組，以實際開包機率排出現在該開的卡包。花寶石前先規劃。", h1: "🎰 卡包推薦計算機" },
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

export default function PackPlannerPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.4rem 1rem 3rem" }}>
      <h1 style={{ margin: "0 0 10px", fontSize: "clamp(1.3rem,4.5vw,1.6rem)", fontWeight: 900, color: "#b91c1c" }}>{META[lang].h1}</h1>
      <PackPlannerClient lang={lang} />
    </div>
  );
}
