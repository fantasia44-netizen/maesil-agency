// 카드 개별 페이지 — SEO 롱테일. 카드정보 + 이 카드를 쓰는 메타 덱 + 필요 팩 + 관련 카드(독창 파생).
// 레이아웃이 force-dynamic이라 요청 시 SSR(3879장 빌드 폭발 없음). 승인 전 noindex(env로 전환).
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CARDS from "../../data/cards.json";
import DECKS from "../../data/decks.json";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../../lib/i18n";

export const revalidate = 86400;
// 승인 전엔 noindex(카드 검색과 동일 정책). AdSense 승인 후 NEXT_PUBLIC_TCG_INDEX_CARDS=1 로 색인 개방.
const INDEX = process.env.NEXT_PUBLIC_TCG_INDEX_CARDS === "1";

type Card = { s: string; n: number; name: string; r?: string; packs?: string[]; nm?: Record<string, string>; e?: string; w?: string };
type DeckEntry = { count: number; set: string; number: string | number; name: string };
type MetaDeck = { id: string; name: string; nm?: Record<string, string>; tier?: string; winrate?: number; decklist?: { pokemon?: DeckEntry[]; trainer?: DeckEntry[] } };
const DATA = CARDS as Card[];
const META = DECKS as MetaDeck[];

const ELEMENT_COLOR: Record<string, string> = {
  grass: "#3fa129", fire: "#e62829", water: "#2980ef", lightning: "#d9a900", psychic: "#ef4179",
  fighting: "#ff8000", darkness: "#4b4243", metal: "#5a8a9c", dragon: "#5060e1", colorless: "#9fa19f",
};

const T: Record<Locale, {
  back: string; set: string; num: string; rarity: string; type: string; weak: string; packs: string; packFrom: string; packSim: string;
  usedIn: string; usedNone: string; related: string; note: string; descA: string; descB: string; tier: string; wr: string;
  elem: Record<string, string>;
}> = {
  ko: { back: "← 카드 검색", set: "세트", num: "번호", rarity: "희귀도", type: "타입", weak: "약점", packs: "나오는 팩", packFrom: "이 카드는 다음 팩에서 나옵니다", packSim: "팩 시뮬레이터에서 확률 보기 →",
    usedIn: "이 카드를 쓰는 메타 덱", usedNone: "현재 대회 상위 메타 덱에는 채용되지 않았습니다.", related: "같은 팩의 다른 카드", note: "카드 데이터: 커뮤니티 공개 데이터셋 · 팬 제작 비공식 사이트",
    descA: "의 카드 정보", descB: "타입·약점·나오는 팩과 이 카드를 채용하는 대회 메타 덱을 확인하세요.", tier: "티어", wr: "승률",
    elem: { grass: "풀", fire: "불꽃", water: "물", lightning: "번개", psychic: "에스퍼", fighting: "격투", darkness: "악", metal: "강철", dragon: "드래곤", colorless: "무색" } },
  en: { back: "← Card search", set: "Set", num: "No.", rarity: "Rarity", type: "Type", weak: "Weak", packs: "From packs", packFrom: "This card comes from these packs", packSim: "See odds in the Pack Simulator →",
    usedIn: "Meta decks that use this card", usedNone: "Not currently played in top tournament meta decks.", related: "Other cards from the same pack", note: "Card data: community open dataset · unofficial fan-made site",
    descA: " card details", descB: "See its type, weakness, the packs it comes from, and the tournament meta decks that run it.", tier: "Tier", wr: "WR",
    elem: { grass: "Grass", fire: "Fire", water: "Water", lightning: "Lightning", psychic: "Psychic", fighting: "Fighting", darkness: "Darkness", metal: "Metal", dragon: "Dragon", colorless: "Colorless" } },
  ja: { back: "← カード検索", set: "セット", num: "No.", rarity: "レアリティ", type: "タイプ", weak: "弱点", packs: "出るパック", packFrom: "このカードは次のパックから出ます", packSim: "パックシミュで確率を見る →",
    usedIn: "このカードを使うメタデッキ", usedNone: "現在の大会上位メタデッキには採用されていません。", related: "同じパックの他のカード", note: "カードデータ: コミュニティ公開データセット · ファン制作の非公式サイト",
    descA: "のカード情報", descB: "タイプ·弱点·出るパックと、このカードを採用する大会メタデッキを確認。", tier: "ティア", wr: "勝率",
    elem: { grass: "草", fire: "炎", water: "水", lightning: "雷", psychic: "超", fighting: "闘", darkness: "悪", metal: "鋼", dragon: "竜", colorless: "無" } },
  "zh-TW": { back: "← 卡片查詢", set: "卡包", num: "編號", rarity: "稀有度", type: "屬性", weak: "弱點", packs: "出自卡包", packFrom: "此卡片來自以下卡包", packSim: "在開包模擬器查看機率 →",
    usedIn: "使用此卡的主流牌組", usedNone: "目前賽事上位主流牌組未採用。", related: "同卡包的其他卡片", note: "卡片數據：社群公開資料集 · 粉絲製作非官方網站",
    descA: " 卡片資訊", descB: "查看屬性·弱點·出自哪些卡包，以及採用此卡的賽事主流牌組。", tier: "強度", wr: "勝率",
    elem: { grass: "草", fire: "火", water: "水", lightning: "雷", psychic: "超", fighting: "鬥", darkness: "惡", metal: "鋼", dragon: "龍", colorless: "無" } },
};

// id "a1-1" → { set:"a1", num:1 } · 카드 조회(대소문자 무시)
function findCard(id: string): Card | undefined {
  const i = id.lastIndexOf("-");
  if (i < 0) return undefined;
  const setL = id.slice(0, i).toLowerCase(), num = Number(id.slice(i + 1));
  if (!Number.isFinite(num)) return undefined;
  return DATA.find((c) => c.s.toLowerCase() === setL && c.n === num);
}
const cardId = (c: { s: string; n: number }) => `${c.s.toLowerCase()}-${c.n}`;
const nameOf = (c: { name: string; nm?: Record<string, string> }, lang: Locale) => (c.nm && c.nm[lang]) || c.name;

export function generateMetadata({ params }: { params: { lang: string; id: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const c = findCard(params.id);
  const t = T[lang];
  if (!c) return { title: "TCG Note", robots: { index: false, follow: true } };
  const nm = nameOf(c, lang);
  const path = `/tcg/cards/${params.id}`;
  const title = `${nm} (${c.s} ${c.n})${t.descA} | TCG Note`;
  const desc = `${nm} — ${c.e ? t.elem[c.e] : ""} · ${c.s} ${c.n}. ${t.descB}`;
  return {
    title, description: desc,
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    openGraph: { title, description: desc, url: localizePath(lang, path), type: "article" },
    robots: { index: INDEX, follow: true },
  };
}

export default function CardPage({ params }: { params: { lang: string; id: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  const c = findCard(params.id);
  if (!c) notFound();
  const nm = nameOf(c, lang);
  const color = c.e ? ELEMENT_COLOR[c.e] : "#94a3b8";

  // 이 카드를 쓰는 메타 덱
  const usedIn = META.filter((d) => [...(d.decklist?.pokemon || []), ...(d.decklist?.trainer || [])]
    .some((e) => e.set.toLowerCase() === c.s.toLowerCase() && Number(e.number) === c.n))
    .sort((a, b) => (b.winrate || 0) - (a.winrate || 0));
  // 같은 팩의 다른 카드(최대 12)
  const related = c.packs && c.packs.length
    ? DATA.filter((x) => x !== c && (x.packs || []).some((p) => c.packs!.includes(p))).slice(0, 12)
    : [];

  const box: React.CSSProperties = { background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "0.9rem 1.1rem" };
  const label: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 800, color: "#94a3b8" };
  const val: React.CSSProperties = { fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ fontSize: "0.78rem", marginBottom: 8 }}><Link href={localizePath(lang, "/tcg/cards")} style={{ color: "#dc2626", textDecoration: "none" }}>{t.back}</Link></div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        {c.e && <span style={{ width: 16, height: 16, borderRadius: 999, background: color, flexShrink: 0 }} />}
        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>{nm}</h1>
        {c.r && <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fff", background: color, borderRadius: 999, padding: "2px 11px" }}>{c.r}</span>}
      </div>
      <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginBottom: 16 }}>{c.s} · {c.n}{c.name !== nm ? ` · ${c.name}` : ""}</div>

      {/* 기본 정보 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8, marginBottom: 14 }}>
        <div style={box}><div style={label}>{t.set}</div><div style={val}>{c.s}</div></div>
        <div style={box}><div style={label}>{t.num}</div><div style={val}>{c.n}</div></div>
        {c.e && <div style={box}><div style={label}>{t.type}</div><div style={{ ...val, color }}>{t.elem[c.e]}</div></div>}
        {c.w && <div style={box}><div style={label}>{t.weak}</div><div style={val}>{c.w}</div></div>}
        {c.r && <div style={box}><div style={label}>{t.rarity}</div><div style={val}>{c.r}</div></div>}
      </div>

      {/* 나오는 팩 */}
      {c.packs && c.packs.length > 0 && (
        <div style={{ ...box, marginBottom: 14 }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>📦 {t.packs}</div>
          <p style={{ margin: "0 0 8px", fontSize: "0.84rem", color: "#475569" }}>{t.packFrom}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {c.packs.map((p) => <span key={p} style={{ fontWeight: 800, color: "#b91c1c", background: "#fee6e6", border: "1px solid #fbd8d8", borderRadius: 999, padding: "3px 12px", fontSize: "0.8rem" }}>{p}</span>)}
          </div>
          <Link href={localizePath(lang, "/tcg/pack-sim")} style={{ fontSize: "0.8rem", fontWeight: 700, color: "#dc2626", textDecoration: "none" }}>{t.packSim}</Link>
        </div>
      )}

      {/* 이 카드를 쓰는 메타 덱 — 독창 파생 콘텐츠 */}
      <div style={{ ...box, marginBottom: 14 }}>
        <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>🏆 {t.usedIn}</div>
        {usedIn.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.84rem", color: "#94a3b8" }}>{t.usedNone}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {usedIn.map((d) => (
              <Link key={d.id} href={localizePath(lang, `/tcg/decks/${d.id}`)} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", background: "#fef6f5", border: "1px solid #fbd8d8", borderRadius: 8, padding: "7px 11px" }}>
                {d.tier && <span style={{ fontSize: "0.7rem", fontWeight: 900, color: "#fff", background: "#dc2626", borderRadius: 6, padding: "1px 8px" }}>{d.tier}</span>}
                <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a", flex: 1 }}>{nameOf(d, lang)}</span>
                {d.winrate != null && <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#64748b" }}>{t.wr} {d.winrate}%</span>}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 같은 팩의 다른 카드 */}
      {related.length > 0 && (
        <div style={{ ...box, marginBottom: 14 }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>🎴 {t.related}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {related.map((x) => (
              <Link key={cardId(x)} href={localizePath(lang, `/tcg/cards/${cardId(x)}`)} style={{ display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none", background: "#fff", border: "1px solid #fbd8d8", borderRadius: 999, padding: "3px 11px" }}>
                {x.e && <span style={{ width: 8, height: 8, borderRadius: 999, background: ELEMENT_COLOR[x.e] }} />}
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{nameOf(x, lang)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p style={{ marginTop: 8, fontSize: "0.72rem", color: "#cbd5e1" }}>{t.note}</p>
    </div>
  );
}
