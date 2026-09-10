// 가이드 허브 — 초보/전략 가이드 목록. 개별 가이드로 진입. AdSense용 색인 대상(실질 콘텐츠).
import Link from "next/link";
import type { Metadata } from "next";
import { GUIDES } from "./guides";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const revalidate = 86400;
const PATH = "/tcg/guides";

const T: Record<Locale, { title: string; desc: string; h1: string; intro: string }> = {
  ko: {
    title: "포켓몬 카드 게임 Pocket 가이드 — 초보 시작·덱 선택·타입 상성",
    desc: "포켓포켓 초보 가이드 모음 — 기본 규칙과 첫 덱, 덱 고르는 법, 타입 상성·약점(+20) 계산을 예제와 함께 정리.",
    h1: "포켓포켓 가이드",
    intro: "포켓몬 카드 게임 Pocket을 처음 시작하거나, 뭘 써야 할지 막막할 때 읽는 실전 가이드입니다. 규칙부터 덱 선택, 타입 상성까지 — 티어표·덱 공략·도구와 바로 이어집니다.",
  },
  en: {
    title: "Pokémon TCG Pocket Guides — Beginner Start, Deck Choice, Type Matchups",
    desc: "Beginner guides for Pokémon TCG Pocket: the core rules and your first deck, how to pick a deck as a beginner, and type matchups & weakness (+20) explained with examples.",
    h1: "Pocket Guides",
    intro: "Practical guides for when you're starting Pokémon TCG Pocket or unsure what to play. From the rules to deck choice and type matchups — each links straight into the tier list, deck guides and tools.",
  },
  ja: {
    title: "ポケポケ ガイド — 初心者スタート・デッキ選び・タイプ相性",
    desc: "ポケモンカードゲーム Pocket(ポケポケ)の初心者ガイド集。基本ルールと最初のデッキ、初心者のデッキの選び方、タイプ相性・弱点(+20)の計算を例付きでまとめました。",
    h1: "ポケポケ ガイド",
    intro: "ポケポケを始めたばかり、または何を使えばいいか迷ったときに読む実戦ガイドです。ルールからデッキ選び、タイプ相性まで — ティア表・デッキ攻略・ツールへ直接つながります。",
  },
  "zh-TW": {
    title: "寶可夢卡牌 Pocket 指南 — 新手起步·選牌組·屬性相剋",
    desc: "寶可夢集換式卡牌 Pocket 新手指南集。基本規則與第一副牌組、新手如何選牌組、屬性相剋與弱點(+20)計算，附範例說明。",
    h1: "Pocket 指南",
    intro: "剛開始玩寶可夢卡牌 Pocket、或不知道該用什麼時的實戰指南。從規則到選牌組、屬性相剋 — 每篇都直接連到強度表、牌組攻略與工具。",
  },
};

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return { title: `${t.title} | TCG Note`, description: t.desc, alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) }, openGraph: { title: `${t.title} | TCG Note`, description: t.desc, url: localizePath(lang, PATH), type: "website" } };
}

export default function GuidesHubPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ fontSize: "0.78rem", marginBottom: 6 }}><Link href={localizePath(lang, "/tcg")} style={{ color: "#dc2626", textDecoration: "none" }}>← TCG Note</Link></div>
      <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>
      <p style={{ margin: "0 0 18px", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>{t.intro}</p>
      <div style={{ display: "grid", gap: 12 }}>
        {GUIDES.map((g) => {
          const b = g.i18n[lang];
          return (
            <Link key={g.slug} href={localizePath(lang, `/tcg/guides/${g.slug}`)} style={{ display: "block", textDecoration: "none", background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "1rem 1.2rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{ fontSize: "1.6rem", lineHeight: 1, flexShrink: 0 }}>{g.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#b91c1c", marginBottom: 4 }}>{b.title}</div>
                  <div style={{ fontSize: "0.84rem", color: "#64748b", lineHeight: 1.6 }}>{b.summary}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
