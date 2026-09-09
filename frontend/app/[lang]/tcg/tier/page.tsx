// 덱 티어표 — Limitless 대회 데이터를 자체 집계한 통계(점유율·승률·Wilson 하한) 기반.
// 깊이 백본 #1. 방법론 명시(투명성=독창) + 원본 해석(오버퍼포머·함정덱).
import Link from "next/link";
import type { Metadata } from "next";
import META from "../data/meta.json";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const revalidate = 3600;
const PATH = "/tcg/tier";

type Deck = { id: string; name: string; icons: string[]; count: number; share: number; wins: number; losses: number; ties: number; n: number; winrate: number; wilsonLo: number; tier: string };
const DECKS = (META.decks as Deck[]);

// 로케일별 문구
const TL: Record<Locale, {
  title: string; desc: string; h1: string; intro: string;
  method: string; methodBody: (t: typeof META) => string;
  colDeck: string; colShare: string; colWin: string; colN: string; colTier: string;
  tierNames: Record<string, string>;
  overH: string; overP: string; trapH: string; trapP: string;
  updated: string; sample: string; src: string;
}> = {
  ko: {
    title: "포켓몬 카드 게임 Pocket 덱 티어표 — 대회 승률 기반",
    desc: "포켓몬 카드 게임 Pocket(포켓포켓) 덱 티어표. 최근 대회 결과를 자체 집계한 점유율·승률·표본수 기반. 의견이 아닌 데이터로 본 현재 메타.",
    h1: "포켓몬 카드 게임 Pocket 덱 티어표",
    intro: "최근 대회 결과(Limitless)를 자체 집계한 점유율·승률 기반 티어입니다. 감이 아니라 실제 데이터 — 각 덱의 표본 경기 수(N)와 승률을 함께 봅니다.",
    method: "📐 산출 방법",
    methodBody: (t) => `최근 ${t.windowDays}일, ${t.minPlayers}인 이상 대회 ${t.sampleTournaments}개 · 참가 ${t.samplePlayers.toLocaleString()}명 · ${t.sampleMatches.toLocaleString()}경기를 집계했습니다. 점유율=해당 덱 사용 비율, 승률=승/(승+패). 표본이 적은 덱의 승률 과대평가를 막기 위해 Wilson 95% 하한으로 티어를 보정합니다. 티어 규칙: S=점유율≥5%·하한≥48%, A=≥2.5%·≥47%, B=≥1%·≥46%, C=≥0.5%.`,
    colDeck: "덱", colShare: "점유율", colWin: "승률", colN: "표본", colTier: "티어",
    tierNames: { S: "S — 메타 정점", A: "A — 강력", B: "B — 준수", C: "C — 변두리", "?": "표본 부족" },
    overH: "📈 오버퍼포머 (점유율 낮지만 승률↑)", overP: "덜 알려졌지만 대회 승률이 높은 덱 — 떠오르는 카운터·다크호스.",
    trapH: "⚠️ 함정덱 (인기지만 승률↓)", trapP: "많이 쓰이는데 승률이 50% 미만 — 인기에 비해 실속이 떨어지는 덱.",
    updated: "갱신", sample: "표본", src: "출처",
  },
  en: {
    title: "Pokémon TCG Pocket Deck Tier List — Win-Rate Based",
    desc: "Pokémon TCG Pocket deck tier list built from recent tournament results: meta share, win rate and sample size we aggregate ourselves. The current meta by data, not opinion.",
    h1: "Pokémon TCG Pocket Deck Tier List",
    intro: "Tiers from recent tournament results (Limitless), aggregated by us: meta share and win rate. Data, not opinion — each deck shows its sample size (N) and win rate.",
    method: "📐 Methodology",
    methodBody: (t) => `Aggregated from ${t.sampleTournaments} tournaments (≥${t.minPlayers} players, last ${t.windowDays} days) · ${t.samplePlayers.toLocaleString()} players · ${t.sampleMatches.toLocaleString()} matches. Share = play rate; win rate = wins/(wins+losses). Tiers use the Wilson 95% lower bound to avoid overrating small-sample decks. Rule: S = share≥5% & lower bound≥48%, A = ≥2.5% & ≥47%, B = ≥1% & ≥46%, C = ≥0.5%.`,
    colDeck: "Deck", colShare: "Share", colWin: "Win %", colN: "N", colTier: "Tier",
    tierNames: { S: "S — Meta-defining", A: "A — Strong", B: "B — Solid", C: "C — Fringe", "?": "Low sample" },
    overH: "📈 Overperformers (low share, high win rate)", overP: "Under-played decks with high tournament win rates — rising counters and dark horses.",
    trapH: "⚠️ Traps (popular but losing)", trapP: "Widely played yet under 50% win rate — decks that underdeliver on their popularity.",
    updated: "Updated", sample: "Sample", src: "Source",
  },
  ja: {
    title: "ポケポケ デッキティア表 — 大会勝率ベース",
    desc: "ポケモンカードゲーム Pocket(ポケポケ)のデッキティア表。直近大会結果を自前集計した使用率・勝率・サンプル数ベース。感覚ではなくデータで見る現環境。",
    h1: "ポケポケ デッキティア表",
    intro: "直近の大会結果(Limitless)を自前集計した使用率・勝率ベースのティアです。感覚ではなく実データ — 各デッキのサンプル試合数(N)と勝率を併記します。",
    method: "📐 算出方法",
    methodBody: (t) => `直近${t.windowDays}日・${t.minPlayers}人以上の大会${t.sampleTournaments}件 · 参加${t.samplePlayers.toLocaleString()}人 · ${t.sampleMatches.toLocaleString()}試合を集計。使用率=そのデッキの割合、勝率=勝/(勝+負)。サンプルが少ないデッキの勝率過大評価を防ぐためWilson95%下限でティア補正。ルール: S=使用率≥5%・下限≥48%、A=≥2.5%・≥47%、B=≥1%・≥46%、C=≥0.5%。`,
    colDeck: "デッキ", colShare: "使用率", colWin: "勝率", colN: "N", colTier: "ティア",
    tierNames: { S: "S — 環境の頂点", A: "A — 強力", B: "B — 安定", C: "C — 傍流", "?": "サンプル不足" },
    overH: "📈 オーバーパフォーマー(使用率↓・勝率↑)", overP: "知名度は低いが大会勝率が高いデッキ — 台頭中の対策・ダークホース。",
    trapH: "⚠️ 罠デッキ(人気だが勝率↓)", trapP: "使用率は高いのに勝率50%未満 — 人気の割に実力が伴わないデッキ。",
    updated: "更新", sample: "サンプル", src: "出典",
  },
  "zh-TW": {
    title: "寶可夢卡牌 Pocket 牌組強度表 — 賽事勝率為基礎",
    desc: "寶可夢集換式卡牌 Pocket 牌組強度表。以近期賽事結果自行彙整的使用率·勝率·樣本數為基礎。用數據而非感覺看目前環境。",
    h1: "寶可夢卡牌 Pocket 牌組強度表",
    intro: "以近期賽事結果(Limitless)自行彙整的使用率·勝率為基礎的強度表。並非憑感覺而是實際數據 — 每個牌組附上樣本場數(N)與勝率。",
    method: "📐 計算方法",
    methodBody: (t) => `彙整近${t.windowDays}天、${t.minPlayers}人以上賽事${t.sampleTournaments}場 · 參加${t.samplePlayers.toLocaleString()}人 · ${t.sampleMatches.toLocaleString()}場對戰。使用率=該牌組比例，勝率=勝/(勝+敗)。為避免小樣本牌組勝率被高估，以Wilson 95%下限修正強度。規則: S=使用率≥5%·下限≥48%，A=≥2.5%·≥47%，B=≥1%·≥46%，C=≥0.5%。`,
    colDeck: "牌組", colShare: "使用率", colWin: "勝率", colN: "N", colTier: "強度",
    tierNames: { S: "S — 環境頂點", A: "A — 強力", B: "B — 穩健", C: "C — 邊緣", "?": "樣本不足" },
    overH: "📈 超常發揮(使用率低但勝率高)", overP: "知名度低但賽事勝率高的牌組 — 崛起中的剋制與黑馬。",
    trapH: "⚠️ 陷阱牌組(熱門但勝率低)", trapP: "使用率高但勝率不到50% — 名氣大於實力的牌組。",
    updated: "更新", sample: "樣本", src: "來源",
  },
};

const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a", D: "#64748b", "?": "#94a3b8" };

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = TL[lang];
  return {
    title: `${t.title} | TCG Note`,
    description: t.desc,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) },
    openGraph: { title: `${t.title} | TCG Note`, description: t.desc, url: localizePath(lang, PATH), type: "website" },
  };
}

export default function TierPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = TL[lang];
  const L = (p: string) => localizePath(lang, p);

  const ranked = DECKS.filter((d) => d.tier !== "?" && d.tier !== "D");
  const tiers = ["S", "A", "B", "C"] as const;
  const byTier = Object.fromEntries(tiers.map((tr) => [tr, ranked.filter((d) => d.tier === tr)]));

  // 원본 해석: 오버퍼포머(표본 충분·점유율<2%·승률>52) / 함정(점유율>=3%·승률<49)
  const over = DECKS.filter((d) => d.n >= 80 && d.share < 2 && d.winrate >= 52).sort((a, b) => b.winrate - a.winrate).slice(0, 5);
  const traps = DECKS.filter((d) => d.share >= 3 && d.winrate < 49).sort((a, b) => a.winrate - b.winrate).slice(0, 5);

  const fmtDate = new Date(META.generatedAt).toISOString().slice(0, 10);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ fontSize: "0.78rem", color: "#b4258f", marginBottom: 6 }}>
        <Link href={L("/tcg")} style={{ color: "#b4258f", textDecoration: "none" }}>← TCG Note</Link>
      </div>
      <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.25 }}>{t.h1}</h1>
      <p style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>{t.intro}</p>

      {/* 방법론 — 투명성(독창 신호) */}
      <details style={{ background: "#fbf5fa", border: "1px solid #eadff2", borderRadius: 10, padding: "0.7rem 0.9rem", marginBottom: 16 }}>
        <summary style={{ fontSize: "0.86rem", fontWeight: 800, color: "#a01f7f", cursor: "pointer" }}>{t.method}</summary>
        <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "#5b4a58", lineHeight: 1.7 }}>{t.methodBody(META)}</p>
        <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>
          {t.updated} {fmtDate} · {t.src}: Limitless TCG
        </p>
      </details>

      {/* 티어 그룹 */}
      {tiers.map((tr) => byTier[tr].length > 0 && (
        <section key={tr} style={{ marginBottom: 18 }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1rem", fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>
            <span style={{ background: TIER_COLOR[tr], color: "#fff", borderRadius: 7, padding: "2px 10px", fontSize: "0.9rem", fontWeight: 900 }}>{tr}</span>
            <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>{t.tierNames[tr]}</span>
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
              <thead>
                <tr style={{ color: "#94a3b8", textAlign: "left", fontSize: "0.74rem" }}>
                  <th style={{ padding: "4px 8px", fontWeight: 700 }}>{t.colDeck}</th>
                  <th style={{ padding: "4px 8px", fontWeight: 700, textAlign: "right" }}>{t.colShare}</th>
                  <th style={{ padding: "4px 8px", fontWeight: 700, textAlign: "right" }}>{t.colWin}</th>
                  <th style={{ padding: "4px 8px", fontWeight: 700, textAlign: "right" }}>{t.colN}</th>
                </tr>
              </thead>
              <tbody>
                {byTier[tr].map((d) => (
                  <tr key={d.id} style={{ borderTop: "1px solid #f0e6f0" }}>
                    <td style={{ padding: "7px 8px", fontWeight: 600, color: "#0f172a" }}>{d.name}</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700, color: "#b4258f", fontVariantNumeric: "tabular-nums" }}>{d.share}%</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: d.winrate >= 50 ? "#16a34a" : "#dc2626", fontWeight: 700 }}>{d.winrate}%</td>
                    <td style={{ padding: "7px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#94a3b8" }}>{d.n.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* 원본 해석 — 오버퍼포머 / 함정덱 (남이 안 하는 데이터 해석) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, marginTop: 8 }}>
        {over.length > 0 && (
          <section style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "0.9rem 1rem" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: "0.92rem", fontWeight: 800, color: "#15803d" }}>{t.overH}</h2>
            <p style={{ margin: "0 0 8px", fontSize: "0.76rem", color: "#4d7c5a", lineHeight: 1.5 }}>{t.overP}</p>
            {over.map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", padding: "3px 0", color: "#0f172a" }}>
                <span style={{ fontWeight: 600 }}>{d.name}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "#15803d", fontWeight: 700 }}>{d.winrate}% · {d.share}%</span>
              </div>
            ))}
          </section>
        )}
        {traps.length > 0 && (
          <section style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "0.9rem 1rem" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: "0.92rem", fontWeight: 800, color: "#b91c1c" }}>{t.trapH}</h2>
            <p style={{ margin: "0 0 8px", fontSize: "0.76rem", color: "#a15757", lineHeight: 1.5 }}>{t.trapP}</p>
            {traps.map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", padding: "3px 0", color: "#0f172a" }}>
                <span style={{ fontWeight: 600 }}>{d.name}</span>
                <span style={{ fontVariantNumeric: "tabular-nums", color: "#b91c1c", fontWeight: 700 }}>{d.winrate}% · {d.share}%</span>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
