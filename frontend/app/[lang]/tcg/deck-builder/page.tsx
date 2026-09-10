// 덱 빌더 — 서버(메타데이터·에디토리얼) + 클라이언트 빌더. 체류시간·바이럴(공유) 핵심 도구.
import Link from "next/link";
import type { Metadata } from "next";
import DeckBuilderClient from "./DeckBuilderClient";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const revalidate = 86400;
const PATH = "/tcg/deck-builder";

const T: Record<Locale, { title: string; desc: string; h1: string; intro: string; how: string; howBody: string }> = {
  ko: {
    title: "포켓몬 카드 게임 Pocket 덱 빌더 — 20장 덱 만들고 공유",
    desc: "포켓포켓 덱을 직접 만드는 빌더. 메타 덱에서 시작하거나 카드를 골라 20장 덱을 짜고, 필요한 팩·속성 분포를 확인해 링크로 공유.",
    h1: "덱 빌더",
    intro: "카드를 골라 나만의 20장 덱을 만들어보세요. 대회 상위 메타 덱에서 시작해 손보거나, 처음부터 짜도 됩니다. 이 덱을 완성하려면 어떤 팩을 까야 하는지까지 알려주고, 링크로 바로 공유됩니다.",
    how: "📐 규칙 · 이 도구가 하는 일",
    howBody: "포켓포켓 덱은 정확히 20장이며, 같은 이름의 카드는 최대 2장까지 넣을 수 있습니다(에너지는 덱과 별도로 선택). 이 빌더는 그 규칙을 자동으로 지켜주고, 덱의 속성(타입) 분포와 '이 카드들이 나오는 팩'을 정리해줍니다 — 팩 오픈 시뮬레이터와 이어서, 목표 덱을 만들기 전에 어떤 팩에 젬을 쓸지 계획할 수 있습니다. 덱은 브라우저에 자동 저장되고, 공유 링크에 덱 구성이 담깁니다.",
  },
  en: {
    title: "Pokémon TCG Pocket Deck Builder — Build & Share a 20-Card Deck",
    desc: "Build your own Pokémon TCG Pocket deck. Start from a tournament meta deck or pick cards to make a 20-card deck, see the packs you need and type spread, and share it by link.",
    h1: "Deck Builder",
    intro: "Pick cards and build your own 20-card deck. Start from a top tournament meta deck and tweak it, or build from scratch. It even tells you which packs you need to open to complete the deck, and shares instantly by link.",
    how: "📐 Rules · what this tool does",
    howBody: "A Pocket deck is exactly 20 cards, with up to 2 copies of any single name (energy is chosen separately from the deck). This builder enforces those rules for you and breaks down your deck's type spread and the packs those cards come from — pairing with the Pack Opening Simulator so you can plan which packs to spend gems on before chasing a deck. Your deck auto-saves in the browser, and the share link carries the full list.",
  },
  ja: {
    title: "ポケポケ デッキビルダー — 20枚デッキを作って共有",
    desc: "ポケモンカードゲーム Pocket(ポケポケ)のデッキを自作するビルダー。大会メタデッキから開始、またはカードを選んで20枚デッキを組み、必要なパック・タイプ分布を確認してリンクで共有。",
    h1: "デッキビルダー",
    intro: "カードを選んで自分だけの20枚デッキを作ろう。大会上位のメタデッキから始めて調整しても、一から組んでもOK。このデッキを完成させるにはどのパックを開ければいいかまで教えてくれて、リンクですぐ共有できます。",
    how: "📐 ルール · このツールの機能",
    howBody: "ポケポケのデッキはちょうど20枚、同名カードは最大2枚まで(エネルギーはデッキとは別で選択)。このビルダーはそのルールを自動で守り、デッキのタイプ分布と『そのカードが出るパック』を整理します — パック開封シミュレーターと連携し、目標デッキを狙う前にどのパックに石を使うか計画できます。デッキはブラウザに自動保存され、共有リンクに構成が入ります。",
  },
  "zh-TW": {
    title: "寶可夢卡牌 Pocket 牌組製作 — 組20張牌組並分享",
    desc: "自製寶可夢集換式卡牌 Pocket 牌組的工具。從賽事主流牌組開始，或挑卡片組成20張牌組，查看需要的卡包與屬性分布，並以連結分享。",
    h1: "牌組製作",
    intro: "挑選卡片，組出專屬的20張牌組。可從賽事上位主流牌組開始微調，或從頭組起。它還會告訴你要完成這副牌組需要開哪些卡包，並可用連結即時分享。",
    how: "📐 規則 · 這個工具的功能",
    howBody: "Pocket牌組剛好20張，同名卡最多2張(能量與牌組分開選擇)。此工具會自動遵守規則，並拆解牌組的屬性分布與『這些卡出自哪些卡包』— 與開包模擬器連動，讓你在追牌組前先規劃要在哪些卡包花寶石。牌組會自動存在瀏覽器，分享連結也包含完整牌表。",
  },
};

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return { title: `${t.title} | TCG Note`, description: t.desc, alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) }, openGraph: { title: `${t.title} | TCG Note`, description: t.desc, url: localizePath(lang, PATH), type: "website" } };
}

export default function DeckBuilderPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ fontSize: "0.78rem", marginBottom: 6 }}><Link href={localizePath(lang, "/tcg")} style={{ color: "#dc2626", textDecoration: "none" }}>← TCG Note</Link></div>
      <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>
      <p style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>{t.intro}</p>
      <DeckBuilderClient lang={lang} />
      <details style={{ marginTop: 18, background: "#fef6f5", border: "1px solid #fbd8d8", borderRadius: 10, padding: "0.7rem 0.9rem" }}>
        <summary style={{ fontSize: "0.86rem", fontWeight: 800, color: "#b91c1c", cursor: "pointer" }}>{t.how}</summary>
        <p style={{ margin: "8px 0 0", fontSize: "0.84rem", color: "#5b4a4a", lineHeight: 1.75 }}>{t.howBody}</p>
      </details>
    </div>
  );
}
