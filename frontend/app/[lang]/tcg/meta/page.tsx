// 메타 환경 분석 — 현재 메타를 데이터로 읽는 개요. 티어/덱 데이터 재활용 + 원본 계산
// (에너지 타입 분포·상위 집중도·오버퍼포머). "왜 이 메타인지"를 다룸.
import Link from "next/link";
import type { Metadata } from "next";
import META from "../data/meta.json";
import DECKS from "../data/decks.json";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const revalidate = 3600;
const PATH = "/tcg/meta";

type MDeck = { id: string; name: string; tier: string; share: number; winrate: number; n: number };
const DECKS_STAT = META.decks as MDeck[];
type DDeck = { id: string; share: number; decklist: { energy?: string[] } | null };
const DECK_LISTS = DECKS as DDeck[];

const ENERGY_COLOR: Record<string, string> = {
  Grass: "#3fa129", Fire: "#e62829", Water: "#2980ef", Lightning: "#d9a900", Psychic: "#ef4179",
  Fighting: "#ff8000", Darkness: "#4b4243", Metal: "#5a8a9c", Dragon: "#5060e1", Colorless: "#9fa19f",
};

const T: Record<Locale, {
  title: string; desc: string; h1: string; intro: string;
  statTourneys: string; statPlayers: string; statMatches: string; statDecks: string;
  concH: string; concP: (top5: number) => string;
  typeH: string; typeP: string;
  topH: string; overH: string; overP: string;
  readH: string; read: (top: string, top5: number, over?: string) => string;
  tierLink: string; deckLink: string; energyNames: Record<string, string>;
}> = {
  ko: {
    title: "포켓몬 카드 게임 Pocket 메타 환경 분석", desc: "포켓몬 카드 게임 Pocket 현재 메타 분석 — 에너지 타입 분포·상위 덱 집중도·오버퍼포머. 대회 데이터 기반.",
    h1: "메타 환경 분석", intro: "현재 포켓몬 카드 게임 Pocket 메타를 대회 데이터로 읽습니다. 어떤 타입·덱이 판을 지배하고, 무엇이 떠오르는지.",
    statTourneys: "대회", statPlayers: "참가자", statMatches: "경기", statDecks: "등장 덱",
    concH: "📊 상위 집중도", concP: (t5) => `상위 5개 덱이 전체 메타의 ${t5}%를 차지합니다. 이 수치가 높을수록 소수 덱이 지배하는 '좁은' 메타, 낮을수록 다양한 덱이 공존하는 '넓은' 메타입니다.`,
    typeH: "⚡ 에너지 타입 분포", typeP: "랭크 덱을 대표 에너지 기준으로 집계한 메타 타입 구성입니다.",
    topH: "🏆 상위 덱", overH: "📈 오버퍼포머", overP: "점유율 대비 승률이 높은 다크호스.",
    readH: "🔎 지금 메타 한줄 읽기",
    read: (top, t5, over) => `현재 메타는 '${top}'가 점유율 1위로 중심을 잡고 있으며, 상위 5덱이 ${t5}%를 차지합니다.${over ? ` 점유율은 낮지만 승률이 높은 '${over}'가 떠오르는 다크호스로, 메타가 대비하기 전 선점 가치가 있습니다.` : ""}`,
    tierLink: "전체 덱 티어표 →", deckLink: "대표 덱 공략 →", energyNames: { Grass: "풀", Fire: "불꽃", Water: "물", Lightning: "번개", Psychic: "에스퍼", Fighting: "격투", Darkness: "악", Metal: "강철", Dragon: "드래곤", Colorless: "무색" },
  },
  en: {
    title: "Pokémon TCG Pocket Meta Analysis", desc: "Current Pokémon TCG Pocket meta analysis — energy-type distribution, top-deck concentration and overperformers. Tournament-data based.",
    h1: "Meta Analysis", intro: "Reading the current Pokémon TCG Pocket meta through tournament data — which types and decks rule the field, and what's rising.",
    statTourneys: "Tournaments", statPlayers: "Players", statMatches: "Matches", statDecks: "Decks seen",
    concH: "📊 Top concentration", concP: (t5) => `The top 5 decks make up ${t5}% of the meta. Higher means a 'narrow' meta dominated by few decks; lower means a 'wide' meta where many decks coexist.`,
    typeH: "⚡ Energy-type distribution", typeP: "Meta type composition, ranked decks tallied by their primary energy.",
    topH: "🏆 Top decks", overH: "📈 Overperformers", overP: "Dark horses with high win rate relative to share.",
    readH: "🔎 The meta in one line",
    read: (top, t5, over) => `The current meta is anchored by '${top}' at #1 in share, with the top 5 decks making up ${t5}%.${over ? ` '${over}' is a rising dark horse — low share but high win rate, worth picking up before the meta adapts.` : ""}`,
    tierLink: "Full tier list →", deckLink: "Deck guides →", energyNames: { Grass: "Grass", Fire: "Fire", Water: "Water", Lightning: "Lightning", Psychic: "Psychic", Fighting: "Fighting", Darkness: "Darkness", Metal: "Metal", Dragon: "Dragon", Colorless: "Colorless" },
  },
  ja: {
    title: "ポケポケ メタ環境分析", desc: "現在のポケモンカードゲーム Pocket 環境分析 — エネルギータイプ分布·上位デッキ集中度·オーバーパフォーマー。大会データ基準。",
    h1: "メタ環境分析", intro: "現在のポケポケ環境を大会データで読み解きます。どのタイプ·デッキが場を支配し、何が台頭しているか。",
    statTourneys: "大会", statPlayers: "参加者", statMatches: "試合", statDecks: "登場デッキ",
    concH: "📊 上位集中度", concP: (t5) => `上位5デッキが環境全体の${t5}%を占めます。高いほど少数が支配する「狭い」環境、低いほど多様なデッキが共存する「広い」環境です。`,
    typeH: "⚡ エネルギータイプ分布", typeP: "ランクデッキを代表エネルギー基準で集計したメタのタイプ構成です。",
    topH: "🏆 上位デッキ", overH: "📈 オーバーパフォーマー", overP: "使用率の割に勝率が高いダークホース。",
    readH: "🔎 今の環境を一言で",
    read: (top, t5, over) => `現環境は「${top}」が使用率1位で中心を担い、上位5デッキで${t5}%を占めます。${over ? ` 使用率は低いが勝率が高い「${over}」が台頭中のダークホースで、環境が対策する前に先取りする価値があります。` : ""}`,
    tierLink: "デッキティア表 →", deckLink: "デッキ攻略 →", energyNames: { Grass: "草", Fire: "炎", Water: "水", Lightning: "雷", Psychic: "超", Fighting: "闘", Darkness: "悪", Metal: "鋼", Dragon: "竜", Colorless: "無" },
  },
  "zh-TW": {
    title: "寶可夢卡牌 Pocket 環境分析", desc: "當前寶可夢集換式卡牌 Pocket 環境分析 — 能量屬性分布·上位牌組集中度·超常發揮。以賽事數據為基礎。",
    h1: "環境分析", intro: "以賽事數據解讀當前寶可夢卡牌 Pocket 環境 — 哪些屬性·牌組主宰戰場，什麼正在崛起。",
    statTourneys: "賽事", statPlayers: "參加者", statMatches: "對戰", statDecks: "登場牌組",
    concH: "📊 上位集中度", concP: (t5) => `前5個牌組佔整體環境的${t5}%。越高代表少數牌組主宰的「窄」環境，越低代表多樣牌組共存的「廣」環境。`,
    typeH: "⚡ 能量屬性分布", typeP: "以代表能量為準彙整排名牌組的環境屬性構成。",
    topH: "🏆 上位牌組", overH: "📈 超常發揮", overP: "相對使用率勝率偏高的黑馬。",
    readH: "🔎 一句話讀懂環境",
    read: (top, t5, over) => `當前環境由「${top}」以使用率第一坐鎮，前5牌組佔${t5}%。${over ? ` 使用率低但勝率高的「${over}」是崛起黑馬，值得在環境針對前搶先使用。` : ""}`,
    tierLink: "完整強度表 →", deckLink: "牌組攻略 →", energyNames: { Grass: "草", Fire: "火", Water: "水", Lightning: "雷", Psychic: "超", Fighting: "鬥", Darkness: "惡", Metal: "鋼", Dragon: "龍", Colorless: "無" },
  },
};

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return { title: `${t.title} | TCG Note`, description: t.desc, alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) } };
}

export default function MetaPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  const L = (p: string) => localizePath(lang, p);

  const ranked = DECKS_STAT.filter((d) => ["S", "A", "B", "C"].includes(d.tier));
  const top = [...DECKS_STAT].sort((a, b) => b.share - a.share);
  const top5share = +top.slice(0, 5).reduce((s, d) => s + d.share, 0).toFixed(1);
  const over = DECKS_STAT.filter((d) => d.n >= 80 && d.share < 2 && d.winrate >= 55).sort((a, b) => b.winrate - a.winrate)[0];

  // 에너지 타입 분포 — 랭크 덱을 대표(첫) 에너지 기준으로 share 합산
  const typeShare: Record<string, number> = {};
  for (const d of DECK_LISTS) {
    const e = d.decklist?.energy?.[0];
    if (e) typeShare[e] = (typeShare[e] || 0) + d.share;
  }
  const typeRows = Object.entries(typeShare).sort((a, b) => b[1] - a[1]);
  const typeMax = typeRows.length ? typeRows[0][1] : 1;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ fontSize: "0.78rem", marginBottom: 6 }}><Link href={L("/tcg")} style={{ color: "#dc2626", textDecoration: "none" }}>← TCG Note</Link></div>
      <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>
      <p style={{ margin: "0 0 14px", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>{t.intro}</p>

      {/* 핵심 수치 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginBottom: 16 }}>
        {[[t.statTourneys, META.sampleTournaments], [t.statPlayers, META.samplePlayers], [t.statMatches, META.sampleMatches], [t.statDecks, DECKS_STAT.length]].map(([label, val]) => (
          <div key={label as string} style={{ background: "#fff", border: "1px solid #fbd8d8", borderRadius: 10, padding: "0.7rem 0.9rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#dc2626" }}>{(val as number).toLocaleString()}</div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>{label as string}</div>
          </div>
        ))}
      </div>

      {/* 한줄 읽기 */}
      <section style={{ background: "#fef6f5", border: "1px solid #fbd8d8", borderRadius: 12, padding: "0.9rem 1.1rem", marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 5px", fontSize: "0.92rem", fontWeight: 800, color: "#b91c1c" }}>{t.readH}</h2>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#0f172a", lineHeight: 1.75 }}>{t.read(top[0]?.name, top5share, over?.name)}</p>
      </section>

      {/* 집중도 */}
      <section style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{t.concH}</h2>
        <p style={{ margin: "0 0 8px", fontSize: "0.84rem", color: "#475569", lineHeight: 1.6 }}>{t.concP(top5share)}</p>
        <div style={{ height: 14, background: "#f6e0e0", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(top5share, 100)}%`, height: "100%", background: "linear-gradient(90deg,#dc2626,#f87171)" }} />
        </div>
      </section>

      {/* 에너지 타입 분포 */}
      {typeRows.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 2px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{t.typeH}</h2>
          <p style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "#64748b" }}>{t.typeP}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {typeRows.map(([type, share]) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ minWidth: 52, fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>{t.energyNames[type] || type}</span>
                <div style={{ flex: 1, height: 16, background: "#f9e8e8", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((share / typeMax) * 100)}%`, height: "100%", background: ENERGY_COLOR[type] || "#9fa19f" }} />
                </div>
                <span style={{ minWidth: 42, textAlign: "right", fontSize: "0.78rem", fontWeight: 700, color: "#64748b", fontVariantNumeric: "tabular-nums" }}>{share.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 상위 덱 + 오버퍼포머 */}
      <section style={{ marginBottom: 8 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{t.topH}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {top.slice(0, 8).map((d, i) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.84rem", padding: "3px 0", borderTop: i ? "1px solid #f9e8e8" : "none" }}>
              <span style={{ minWidth: 20, color: "#cbd5e1", fontWeight: 800 }}>{i + 1}</span>
              <span style={{ flex: 1, fontWeight: 600, color: "#0f172a" }}>{d.name}</span>
              <span style={{ color: "#dc2626", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{d.share}%</span>
              <span style={{ minWidth: 46, textAlign: "right", color: d.winrate >= 50 ? "#16a34a" : "#dc2626", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{d.winrate}%</span>
            </div>
          ))}
        </div>
      </section>

      <p style={{ marginTop: 16, fontSize: "0.82rem" }}>
        <Link href={L("/tcg/tier")} style={{ color: "#dc2626", textDecoration: "none", fontWeight: 700, marginRight: 14 }}>{t.tierLink}</Link>
        <Link href={L("/tcg/decks")} style={{ color: "#dc2626", textDecoration: "none", fontWeight: 700 }}>{t.deckLink}</Link>
      </p>
      <p style={{ marginTop: 12, fontSize: "0.7rem", color: "#cbd5e1" }}>{META.source}</p>
    </div>
  );
}
