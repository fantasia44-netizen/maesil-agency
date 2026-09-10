// 첫패/콤보 확률 계산기 — 서버(메타데이터·에디토리얼) + 클라이언트 몬테카를로.
// TCG Note 시그니처 도구: 공용 대회 덱리스트를 재료로 '확률'을 계산(독창 가치·재방문).
import Link from "next/link";
import type { Metadata } from "next";
import HandSimClient from "./HandSimClient";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const revalidate = 86400;
const PATH = "/tcg/hand-sim";

const T: Record<Locale, { title: string; desc: string; h1: string; intro: string; how: string; howBody: string }> = {
  ko: {
    title: "포켓몬 카드 게임 Pocket 첫패·콤보 확률 계산기",
    desc: "포켓포켓 덱의 첫 손 기본 포켓몬·핵심 카드·콤보 확률을 몬테카를로로 계산. 메타 덱이나 내 덱의 일관성을 숫자로 확인.",
    h1: "첫패·콤보 확률 계산기",
    intro: "이 덱의 첫 손에 핵심 카드가 잡힐 확률은? 콤보 두 장이 함께 갖춰질 확률은? 공개 대회 덱리스트(또는 내 덱)를 재료로 TCG Note가 직접 확률을 계산합니다.",
    how: "📐 어떻게 계산하나 (방법론)",
    howBody: "포켓포켓 규칙 그대로 시뮬레이션합니다 — 덱 20장, 첫 손 5장(기본 포켓몬이 1장 이상 나오도록 자동 재드로우=몰리건), 턴당 1장 드로우. 이 조건에서 카드를 2만 번 뽑아보고, 각 카드가 첫 손·누적 7장·9장 시점에 손에 있을 확률과 기본 포켓몬 기대 매수, 두 카드가 함께 갖춰질 콤보 확률을 집계합니다. 이 수치는 '실제 대회 관측 승률'이 아니라 덱 구성으로 계산한 확률(시뮬레이션)입니다.",
  },
  en: {
    title: "Pokémon TCG Pocket Opening Hand & Combo Probability Calculator",
    desc: "Compute opening-hand Basic odds, key-card draw and combo probabilities for a Pokémon TCG Pocket deck via Monte Carlo. Check consistency with a meta deck or your own.",
    h1: "Opening Hand & Combo Calculator",
    intro: "How often does this deck open with its key card? What are the odds of assembling a two-card combo? Using public tournament decklists (or your own deck) as the input, TCG Note computes the probabilities directly.",
    how: "📐 How it's calculated (methodology)",
    howBody: "It simulates Pocket's real rules — a 20-card deck, a 5-card opening hand (auto-redrawn until it contains at least 1 Basic Pokémon, i.e. the mulligan), and 1 draw per turn. Under these conditions it draws 20,000 times and tallies the probability each card is in hand at the opening / by 9 cards, the expected number of Basics, and the odds of assembling a two-card combo. These figures are a computed probability (simulation), not an observed tournament win rate.",
  },
  ja: {
    title: "ポケポケ 初手・コンボ確率計算機",
    desc: "ポケモンカードゲーム Pocket(ポケポケ)デッキの初手たねポケモン・キーカード確保・コンボ確率をモンテカルロで計算。メタデッキやマイデッキで安定性を確認。",
    h1: "初手・コンボ確率計算機",
    intro: "このデッキの初手にキーカードが来る確率は? コンボ2枚が揃う確率は? 公開の大会デッキリスト(またはマイデッキ)を材料に、TCG Note が確率を直接計算します。",
    how: "📐 計算方法(メソドロジー)",
    howBody: "ポケポケのルール通りにシミュレーションします — デッキ20枚、初手5枚(たねポケモンが1枚以上出るまで自動リドロー=マリガン)、毎ターン1枚ドロー。この条件で2万回引き、各カードが初手・累計9枚時点で手札にある確率、たねポケモンの期待枚数、2枚コンボが揃う確率を集計します。これらは『実際の大会勝率』ではなく、デッキ構成から計算した確率(シミュレーション)です。",
  },
  "zh-TW": {
    title: "寶可夢卡牌 Pocket 起手·連段機率計算機",
    desc: "以蒙地卡羅計算寶可夢集換式卡牌 Pocket 牌組的起手基礎寶可夢、關鍵卡抽到與連段機率。可用主流牌組或自己的牌組檢查穩定度。",
    h1: "起手·連段機率計算機",
    intro: "這副牌組起手抽到關鍵卡的機率是多少? 兩張連段同時到手的機率呢? 以公開賽事牌表(或你的牌組)為材料，TCG Note 直接計算機率。",
    how: "📐 如何計算(方法論)",
    howBody: "依 Pocket 規則模擬 — 牌組20張、起手5張(自動重抽直到含至少1張基礎寶可夢，即調度)、每回合抽1張。在此條件下抽2萬次，統計各卡在起手／至9張時在手的機率、基礎寶可夢期望張數，以及兩張連段湊齊的機率。這些是依牌組構成計算的機率(模擬)，並非實際賽事勝率。",
  },
};

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return { title: `${t.title} | TCG Note`, description: t.desc, alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) }, openGraph: { title: `${t.title} | TCG Note`, description: t.desc, url: localizePath(lang, PATH), type: "website" } };
}

export default function HandSimPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ fontSize: "0.78rem", marginBottom: 6 }}><Link href={localizePath(lang, "/tcg")} style={{ color: "#dc2626", textDecoration: "none" }}>← TCG Note</Link></div>
      <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>
      <p style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>{t.intro}</p>
      <HandSimClient lang={lang} />
      <details style={{ marginTop: 18, background: "#fef6f5", border: "1px solid #fbd8d8", borderRadius: 10, padding: "0.7rem 0.9rem" }}>
        <summary style={{ fontSize: "0.86rem", fontWeight: 800, color: "#b91c1c", cursor: "pointer" }}>{t.how}</summary>
        <p style={{ margin: "8px 0 0", fontSize: "0.84rem", color: "#5b4a4a", lineHeight: 1.75 }}>{t.howBody}</p>
      </details>
    </div>
  );
}
