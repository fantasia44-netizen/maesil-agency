// GBL 가이드 목록 — 서버렌더 SEO(3개국어).
import Link from "next/link";
import type { Metadata } from "next";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";
import { GUIDES, guideContent } from "./guides";
import { getGuideIndex } from "./dict";
import { IV_ANALYSIS } from "../iv/analysis/registry";

const PUB_IV = Object.values(IV_ANALYSIS).filter((e) => e.published);
const ivSprite = (dex: number) => `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${dex}.png`;
const IV_H: Record<Locale, string> = {
  ko: "🔬 타협개체 심층 분석", en: "🔬 Compromise-IV deep dives", ja: "🔬 妥協個体の詳細分析", "zh-TW": "🔬 妥協個體深入分析",
};
const IV_SUB: Record<Locale, string> = {
  ko: "100% 개체와 타협 IV를 마스터리그 상위 100종에 대해 0·1·2실드 전수 시뮬레이션하고, CMP·승패 변화·베스트파트너 효과를 비교해 실제 육성 가능한 타협선을 계산합니다. 타협선은 시즌 메타에 따라 달라지므로 시즌별로 재계산·갱신합니다.",
  en: "We simulate the 100% and each compromise IV against the Master League top 100 across 0/1/2 shields, then compare CMP, win/loss flips and Best Buddy effects to compute the real build-worthy compromise line. It shifts with the seasonal meta, so we recompute it each season.",
  ja: "100%個体と妥協個体を、マスターリーグ上位100種に対し0・1・2シールドで全数シミュレートし、CMP・勝敗変化・ベストパートナー効果を比較して実際に育成できる妥協ラインを計算します。妥協ラインはシーズンメタで変わるため毎シーズン再計算します。",
  "zh-TW": "將100%個體與妥協個體，對大師聯盟前100名以0·1·2護盾完整模擬，比較CMP·勝負變化·最佳夥伴效果，計算實際可養的妥協線。妥協線隨賽季環境變化，故每季重新計算更新。",
};

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getGuideIndex(lang);
  const path = "/gbl/guide";
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    keywords: t.keywords,
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    openGraph: { title: t.ogTitle, description: t.ogDesc, url: localizePath(lang, path), images: ["/gbl-og.png"], type: "website" },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

export default function GuideIndex({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getGuideIndex(lang);
  const L = (p: string) => localizePath(lang, p);
  const list = Object.entries(GUIDES);
  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href={L("/gbl")} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>{t.back}</Link>
        <h1 style={{ margin: "0.4rem 0 0.2rem", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>
        <p style={{ margin: "0 0 1.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          {t.intro}
        </p>

        {/* 🔬 타협개체 심층 분석 — 독창 콘텐츠 featured(시즌 한정 명시) */}
        {PUB_IV.length > 0 && (
          <div style={{ marginBottom: 20, background: "linear-gradient(120deg,#eef2ff,#ffffff 70%)", border: `1px solid ${BORDER}`, borderLeft: "4px solid #7c3aed", borderRadius: 14, padding: "1rem 1.1rem" }}>
            <div style={{ fontSize: "1.02rem", fontWeight: 900, color: "#0f172a", marginBottom: 4 }}>{IV_H[lang] || IV_H.en}</div>
            <p style={{ margin: "0 0 12px", fontSize: "0.82rem", color: "#475569", lineHeight: 1.65 }}>{IV_SUB[lang] || IV_SUB.en}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {PUB_IV.map((e) => (
                <Link key={e.sim.speciesId} href={L(`/gbl/iv/${e.sim.speciesId}`)}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.7rem 0.9rem", textDecoration: "none" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ivSprite(e.dex)} alt="" width={42} height={42} style={{ imageRendering: "pixelated", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a" }}>{e.name[lang] || e.name.en}</div>
                    <div style={{ fontSize: "0.7rem", color: "#7c3aed", fontWeight: 700 }}>{e.season}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map(([slug, g]) => {
            const c = guideContent(lang, g);
            return (
              <Link key={slug} href={L(`/gbl/guide/${slug}`)}
                style={{ textDecoration: "none", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.9rem 1rem", display: "block" }}>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>{c.desc}</div>
              </Link>
            );
          })}
        </div>
        <div style={{ marginTop: 20, fontSize: "0.84rem", color: "#475569" }}>
          {t.dataPre}<Link href={L("/gbl/meta/master")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.dataMeta}</Link>{t.dataMid}
          <Link href={L("/gbl/tier/master")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.dataTier}</Link>{t.dataSuf}
        </div>
        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/gbl/about")} style={{ color: "#64748b", textDecoration: "none" }}>{t.about}</Link> ·{" "}
          <Link href={L("/gbl/contact")} style={{ color: "#64748b", textDecoration: "none" }}>{t.contact}</Link> ·{" "}
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{t.privacy}</Link>
        </div>
      </div>
    </div>
  );
}
