// 팩 오픈 시뮬레이터 — 서버(메타데이터·에디토리얼 설명) + 클라이언트 시뮬. 바이럴 핵심 도구.
import Link from "next/link";
import type { Metadata } from "next";
import PackSimClient from "./PackSimClient";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const revalidate = 86400;
const PATH = "/tcg/pack-sim";

const T: Record<Locale, { title: string; desc: string; h1: string; intro: string; how: string; howBody: string; source: string }> = {
  ko: {
    title: "포켓몬 카드 게임 Pocket 팩 오픈 시뮬레이터 — 실제 확률로",
    desc: "포켓몬 카드 게임 Pocket(포켓포켓) 팩을 실제 공개 확률로 열어보는 시뮬레이터. 1팩/10팩/100팩 열고 레어·이머시브·크라운이 얼마나 나오는지 확인하세요.",
    h1: "팩 오픈 시뮬레이터",
    intro: "실제 공개 확률(pull rate)로 팩을 열어보세요. 100팩 까면 ◇◇◇◇(ex)·☆(아트)·👑(크라운)이 얼마나 나오는지 감이 옵니다 — 젬 쓰기 전에 미리.",
    how: "📐 확률은 어떻게 계산하나",
    howBody: "포켓포켓 팩은 카드 5장으로, 슬롯마다 등장하는 레어도 확률이 정해져 있습니다. 앞쪽 슬롯일수록 커먼(◇)이 많고, 4·5번째 슬롯에서 희귀 카드가 나옵니다. 여기서는 각 슬롯을 실제 확률로 굴린 뒤, 그 레어도에 해당하는 카드 중 하나를 무작위로 뽑습니다. 아주 낮은 확률(≈0.05%)로 전부 희귀한 '레어팩(갓팩)'도 반영됩니다. 실제 인게임 결과와 다를 수 있는 재미용 도구입니다.",
    source: "확률 데이터: 포켓몬 카드 게임 Pocket 인게임 공개 오퍼링 레이트(offering rates)를 커뮤니티가 문서화한 값 기준 · 확인 2026-09. 슬롯별 레어도 분포를 반영한 독립 시뮬레이션이며 실제 개봉 결과를 보장하지 않습니다.",
  },
  en: {
    title: "Pokémon TCG Pocket Pack Opening Simulator — Real Odds",
    desc: "Open Pokémon TCG Pocket packs at real pull rates. Open 1 / 10 / 100 packs and see how many rares, immersives and crowns you'd get.",
    h1: "Pack Opening Simulator",
    intro: "Open packs at the real pull rates. Rip 100 packs and get a feel for how often ◇◇◇◇ (ex), ☆ (art) and 👑 (crown) show up — before you spend gems.",
    how: "📐 How the odds work",
    howBody: "A Pocket pack has 5 cards, and each slot has its own rarity distribution — earlier slots skew common (◇), while the 4th/5th slots roll the rare cards. Here, each slot is rolled at its real rate, then a random card of that rarity is drawn. A very rare (~0.05%) all-rare 'god pack' is also modeled. It's a for-fun tool and may differ from actual in-game pulls.",
    source: "Odds data: based on the in-game offering rates of Pokémon TCG Pocket as documented by the community · verified 2026-09. This is an independent simulation reflecting per-slot rarity distributions and does not guarantee actual pull results.",
  },
  ja: {
    title: "ポケポケ パック開封シミュレーター — 実際の確率で",
    desc: "ポケモンカードゲーム Pocket(ポケポケ)のパックを実際の排出確率で開封するシミュレーター。1/10/100パック開けてレア・イマーシブ・クラウンがどれだけ出るか確認。",
    h1: "パック開封シミュレーター",
    intro: "実際の排出確率でパックを開けてみよう。100パック開ければ◇◇◇◇(ex)・☆(アート)・👑(クラウン)がどれくらい出るか感覚がつかめます — 石を使う前に。",
    how: "📐 確率の仕組み",
    howBody: "ポケポケのパックはカード5枚で、スロットごとに出現するレアリティ確率が決まっています。前のスロットほどコモン(◇)が多く、4・5番目で希少カードが出ます。ここでは各スロットを実際の確率で回し、そのレアリティのカードから1枚をランダムに引きます。ごく低確率(≈0.05%)の全希少「レアパック(神パック)」も反映。実際のゲーム結果と異なる場合がある娯楽用ツールです。",
    source: "確率データ: ポケモンカードゲーム Pocket のゲーム内公開オファリングレート(offering rates)をコミュニティが文書化した値に基づく · 確認 2026-09。スロット別レアリティ分布を反映した独立シミュレーションで、実際の開封結果を保証しません。",
  },
  "zh-TW": {
    title: "寶可夢卡牌 Pocket 開包模擬器 — 以真實機率",
    desc: "以真實開包機率開啟寶可夢集換式卡牌 Pocket 卡包的模擬器。開1/10/100包，看看能開出多少稀有、沉浸、皇冠卡。",
    h1: "開包模擬器",
    intro: "以真實開包機率開包吧。開100包就能抓到◇◇◇◇(ex)·☆(美術)·👑(皇冠)大概多常出現 — 在花寶石前先試。",
    how: "📐 機率如何計算",
    howBody: "Pocket卡包為5張卡，每個槽位有各自的稀有度機率分布 — 前面槽位偏普通(◇)，第4·5槽位開出稀有卡。此處以真實機率擲每個槽位，再從該稀有度卡片中隨機抽1張。極低機率(≈0.05%)的全稀有「稀有包(神包)」也已納入。此為娛樂用工具，可能與實際遊戲結果不同。",
    source: "機率數據：基於寶可夢集換式卡牌 Pocket 遊戲內公開的釋出機率(offering rates)，由社群整理記錄 · 確認 2026-09。此為反映各槽位稀有度分布的獨立模擬，不保證實際開包結果。",
  },
};

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return { title: `${t.title} | TCG Note`, description: t.desc, alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) }, openGraph: { title: `${t.title} | TCG Note`, description: t.desc, url: localizePath(lang, PATH), type: "website" } };
}

export default function PackSimPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ fontSize: "0.78rem", marginBottom: 6 }}><Link href={localizePath(lang, "/tcg")} style={{ color: "#dc2626", textDecoration: "none" }}>← TCG Note</Link></div>
      <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>
      <p style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>{t.intro}</p>
      <PackSimClient lang={lang} />
      <details style={{ marginTop: 18, background: "#fef6f5", border: "1px solid #fbd8d8", borderRadius: 10, padding: "0.7rem 0.9rem" }}>
        <summary style={{ fontSize: "0.86rem", fontWeight: 800, color: "#b91c1c", cursor: "pointer" }}>{t.how}</summary>
        <p style={{ margin: "8px 0 0", fontSize: "0.84rem", color: "#5b4a4a", lineHeight: 1.75 }}>{t.howBody}</p>
      </details>
      <p style={{ margin: "10px 2px 0", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.6 }}>{t.source}</p>
    </div>
  );
}
