// 대표 덱 인덱스 — 원본 심층 공략이 있는 덱 목록(얕은 페이지 없이 깊은 것만 노출).
import Link from "next/link";
import type { Metadata } from "next";
import META from "../data/meta.json";
import { getDeckAnalysis, analyzedDeckIds } from "./analysis";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const revalidate = 3600;
const PATH = "/tcg/decks";
type MDeck = { id: string; name: string; nm?: Record<string, string>; tier: string; share: number; winrate: number };
const BY_ID: Record<string, MDeck> = Object.fromEntries((META.decks as MDeck[]).map((d) => [d.id, d]));
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a" };

const T: Record<Locale, { title: string; desc: string; h1: string; intro: string; share: string; win: string; more: string; tierLink: string }> = {
  ko: { title: "포켓몬 카드 게임 Pocket 대표 덱 공략", desc: "포켓몬 카드 게임 Pocket 메타 대표 덱 심층 공략 — 실제 대회 덱리스트·상성·운영 전략. 데이터로 검증한 덱 가이드.", h1: "대표 덱 심층 공략", intro: "현재 메타 상위 덱의 실제 대회 덱리스트 · 상성(실데이터) · 운영 전략을 다룹니다. 전체 티어는 티어표에서.", share: "점유율", win: "승률", more: "더 많은 덱 공략을 순차 추가합니다.", tierLink: "전체 덱 티어표 →" },
  en: { title: "Pokémon TCG Pocket Top Deck Guides", desc: "In-depth guides for the top Pokémon TCG Pocket meta decks — real tournament decklists, matchups and game plans. Data-verified deck guides.", h1: "Top Deck Guides", intro: "Real tournament decklists, matchups (real data) and game plans for the top meta decks. See the full tier list for everything.", share: "Share", win: "Win %", more: "More deck guides are being added.", tierLink: "Full deck tier list →" },
  ja: { title: "ポケポケ 主要デッキ攻略", desc: "ポケモンカードゲーム Pocket の主要メタデッキ詳細攻略 — 実際の大会デッキリスト・相性・立ち回り。データで検証したデッキガイド。", h1: "主要デッキ 詳細攻略", intro: "現環境上位デッキの実際の大会デッキリスト・相性(実データ)・立ち回りを扱います。全体はティア表で。", share: "使用率", win: "勝率", more: "デッキ攻略を順次追加します。", tierLink: "デッキティア表 →" },
  "zh-TW": { title: "寶可夢卡牌 Pocket 代表牌組攻略", desc: "寶可夢集換式卡牌 Pocket 主流牌組深入攻略 — 實際賽事牌表·對戰·操作策略。以數據驗證的牌組指南。", h1: "代表牌組深入攻略", intro: "涵蓋當前環境上位牌組的實際賽事牌表·對戰(實數據)·操作策略。完整強度請見強度表。", share: "使用率", win: "勝率", more: "陸續新增更多牌組攻略。", tierLink: "完整牌組強度表 →" },
};

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  return { title: `${t.title} | TCG Note`, description: t.desc, alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) } };
}

export default function DecksIndexPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = T[lang];
  const L = (p: string) => localizePath(lang, p);
  const decks = analyzedDeckIds()
    .map((id) => ({ id, m: BY_ID[id], a: getDeckAnalysis(id, lang) }))
    .filter((x) => x.m && x.a)
    .sort((x, y) => (y.m.share) - (x.m.share));

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ fontSize: "0.78rem", marginBottom: 6 }}><Link href={L("/tcg")} style={{ color: "#dc2626", textDecoration: "none" }}>← TCG Note</Link></div>
      <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>
      <p style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>{t.intro}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {decks.map(({ id, m, a }) => (
          <Link key={id} href={L(`/tcg/decks/${id}`)} style={{ display: "block", background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "0.85rem 1rem", textDecoration: "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ background: TIER_COLOR[m.tier] || "#64748b", color: "#fff", borderRadius: 6, padding: "1px 8px", fontSize: "0.78rem", fontWeight: 900 }}>{m.tier}</span>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#dc2626" }}>{a!.playstyle}</span>
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{(m.nm && m.nm[lang]) || m.name}</div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.5, marginBottom: 6 }}>{a!.summary.length > 70 ? a!.summary.slice(0, 70) + "…" : a!.summary}</div>
            <div style={{ display: "flex", gap: 12, fontSize: "0.78rem", color: "#475569" }}>
              <span>{t.share} <b style={{ color: "#dc2626" }}>{m.share}%</b></span>
              <span>{t.win} <b style={{ color: m.winrate >= 50 ? "#16a34a" : "#dc2626" }}>{m.winrate}%</b></span>
            </div>
          </Link>
        ))}
      </div>
      <p style={{ margin: "16px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>{t.more} · <Link href={L("/tcg/tier")} style={{ color: "#dc2626", textDecoration: "none", fontWeight: 700 }}>{t.tierLink}</Link></p>
    </div>
  );
}
