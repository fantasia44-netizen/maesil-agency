// GBL 가이드 목록 — 서버렌더 SEO(3개국어).
import Link from "next/link";
import type { Metadata } from "next";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";
import { GUIDES, guideContent } from "./guides";
import { getGuideIndex } from "./dict";

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
