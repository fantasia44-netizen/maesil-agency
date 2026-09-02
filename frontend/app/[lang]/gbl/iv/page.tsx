// PvP IV 순위 체커 — 서버렌더 chrome(SEO) + 클라이언트 IvChecker(검색·계산).
import Link from "next/link";
import type { Metadata } from "next";
import IvChecker from "./IvChecker";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { getIv } from "./dict";
import { IV_ANALYSIS } from "./analysis/registry";
import { formDexById } from "../sprite";

const PUBLISHED_IV = Object.values(IV_ANALYSIS).filter((e) => e.published);
const ivSprite = (dex: number) => `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${dex}.png`;
const DEEP_H: Record<Locale, string> = {
  ko: "🔬 타협개체 심층 분석 — 어디까지 키워도 될까?",
  en: "🔬 Compromise-IV deep dives — how far can you build?",
  ja: "🔬 妥協個体の詳細分析 — どこまで育成OK？",
  "zh-TW": "🔬 妥協個體深入分析 — 能養到哪？",
};
const DEEP_P: Record<Locale, string> = {
  ko: "100% 개체와 타협 IV를 마스터리그 상위 100종에 0·1·2실드 전수 시뮬레이션하고, CMP·승패 변화·베스트파트너 효과를 비교해 실제 육성 가능한 타협선을 계산한 GBL Note 자체 분석입니다.",
  en: "GBL Note's own analysis: we simulate the 100% and each compromise IV against the Master League top 100 across 0/1/2 shields, comparing CMP, win/loss flips and Best Buddy effects to compute the real build-worthy compromise line.",
  ja: "100%個体と妥協個体をマスター上位100種に0・1・2シールドで全数シミュし、CMP・勝敗変化・ベストパートナー効果を比較して実育成できる妥協ラインを計算したGBL Note独自分析です。",
  "zh-TW": "GBL Note 自行分析：將100%與妥協個體對大師前100名以0·1·2護盾完整模擬，比較CMP·勝負變化·最佳夥伴效果，計算實際可養的妥協線。",
};

export const revalidate = 3600;
const PATH = "/gbl/iv";

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getIv(lang);
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) },
    openGraph: { title: t.ogTitle, description: t.ogDesc, url: localizePath(lang, PATH), images: ["/gbl-og.png"], type: "website" },
  };
}

const CARD = "#fff", BORDER = "#e3e8f2";

export default function IvPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getIv(lang);
  const L = (p: string) => localizePath(lang, p);

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{t.navBack}</Link>
          <Link href={L("/gbl/tier/master")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{t.navTier}</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3, letterSpacing: "-0.3px" }}>{t.h1}</h1>
        <p style={{ margin: "0.4rem 0 1rem", fontSize: "0.88rem", color: "#475569", lineHeight: 1.7 }}>{t.intro}</p>

        <IvChecker lang={lang} t={t} />

        {/* 타협개체 심층 분석 — 독창 콘텐츠 발견 경로(내부링크) */}
        {PUBLISHED_IV.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <h2 style={{ fontSize: "0.98rem", fontWeight: 800, margin: "0 0 4px", color: "#0f172a" }}>{DEEP_H[lang] || DEEP_H.en}</h2>
            <p style={{ margin: "0 0 10px", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.7 }}>{DEEP_P[lang] || DEEP_P.en}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {PUBLISHED_IV.map((e) => (
                <Link key={e.sim.speciesId} href={L(`/gbl/iv/${e.sim.speciesId}`)}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.7rem 0.9rem", textDecoration: "none" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ivSprite(formDexById(e.sim.speciesId, e.dex))} alt="" width={44} height={44} style={{ imageRendering: "pixelated", flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a" }}>{e.name[lang] || e.name.en}</div>
                    <div style={{ fontSize: "0.74rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(e.article[lang] || e.article.en).title}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 22, padding: "1rem 1.1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>{t.explainerH}</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>{t.explainerBody}</p>
        </div>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/gbl/guide")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerGuide}</Link> ·{" "}
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerPrivacy}</Link>
        </div>
      </div>
    </div>
  );
}
