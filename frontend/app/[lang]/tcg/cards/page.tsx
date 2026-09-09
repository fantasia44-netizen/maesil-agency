// 카드 검색 — 서버(메타데이터) + 클라이언트 브라우저. 현재 세트(B4a)까지 전 카드.
import Link from "next/link";
import type { Metadata } from "next";
import CardsClient from "./CardsClient";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const revalidate = 86400;
const PATH = "/tcg/cards";

const T: Record<Locale, { title: string; desc: string; h1: string; intro: string }> = {
  ko: { title: "포켓몬 카드 게임 Pocket 카드 검색", desc: "포켓몬 카드 게임 Pocket 전 카드 검색 — 이름·세트·타입으로 찾고, 어느 팩에서 나오는지 확인. 최신 세트까지.", h1: "카드 검색", intro: "이름·세트·타입으로 카드를 찾고, 각 카드가 어느 팩에서 나오는지 확인하세요. 최신 세트까지 포함합니다." },
  en: { title: "Pokémon TCG Pocket Card Search", desc: "Search every Pokémon TCG Pocket card by name, set and type, and see which pack it comes from. Up to the latest set.", h1: "Card Search", intro: "Find cards by name, set and type, and check which pack each card comes from. Includes the latest set." },
  ja: { title: "ポケポケ カード検索", desc: "ポケモンカードゲーム Pocket の全カードを名前·セット·タイプで検索し、どのパックから出るか確認。最新セットまで。", h1: "カード検索", intro: "名前·セット·タイプでカードを探し、各カードがどのパックから出るか確認できます。最新セットまで収録。" },
  "zh-TW": { title: "寶可夢卡牌 Pocket 卡片查詢", desc: "以名稱·卡包·屬性搜尋寶可夢集換式卡牌 Pocket 全部卡片，並查看來自哪個卡包。收錄至最新卡包。", h1: "卡片查詢", intro: "以名稱·卡包·屬性尋找卡片，並確認每張卡來自哪個卡包。收錄至最新卡包。" },
};

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  // 린 런치 — 카드 검색은 DB성 유틸이라 심사 기간 noindex(봇 동선을 에디토리얼로만).
  // 유저에겐 그대로 제공, 색인만 제외. 승인 후 index 전환 검토.
  return { title: `${t.title} | TCG Note`, description: t.desc, robots: { index: false, follow: true }, alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) } };
}

export default function CardsPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ fontSize: "0.78rem", marginBottom: 6 }}><Link href={localizePath(lang, "/tcg")} style={{ color: "#dc2626", textDecoration: "none" }}>← TCG Note</Link></div>
      <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>
      <p style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>{t.intro}</p>
      <CardsClient lang={lang} />
    </div>
  );
}
