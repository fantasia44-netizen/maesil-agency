// GBL 가이드 아티클 — 서버렌더 SEO(3개국어). AdSense 가치 콘텐츠.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "../../AdSlot";
import CoupangAd from "../../CoupangAd";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, localeMeta, type Locale } from "../../../../../lib/i18n";
import { GUIDES, guideContent, guideKeywords } from "../guides";
import { getGuideArticle } from "../dict";
import JsonLd from "../../JsonLd";
import TypeChart from "./TypeChart";
import TypeMatrix from "./TypeMatrix";

const SITE = "https://gblnote.com";
const GUIDE_LABEL: Record<string, string> = { ko: "가이드", en: "Guide", ja: "ガイド", "zh-TW": "攻略" };

export const revalidate = 86400;

export function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { lang: string; slug: string } }): Metadata {
  const g = GUIDES[params.slug];
  if (!g) return { title: "GBL Note" };
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getGuideArticle(lang);
  const c = guideContent(lang, g);
  const path = `/gbl/guide/${params.slug}`;
  return {
    title: `${c.title}${t.titleSuffix}`,
    description: c.desc,
    keywords: guideKeywords(lang, g),
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    openGraph: { title: c.title, description: c.desc, url: localizePath(lang, path), images: ["/gbl-og.png"], type: "article" },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

export default function GuidePage({ params }: { params: { lang: string; slug: string } }) {
  const g = GUIDES[params.slug];
  if (!g) notFound();
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getGuideArticle(lang);
  const L = (p: string) => localizePath(lang, p);
  const c = guideContent(lang, g);
  const others = Object.entries(GUIDES).filter(([s]) => s !== params.slug);

  const path = `/gbl/guide/${params.slug}`;
  const pageUrl = SITE + localizePath(lang, path);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.title,
    description: c.desc,
    inLanguage: localeMeta[lang].htmlLang,
    datePublished: g.updated,
    dateModified: g.updated,
    image: `${SITE}/gbl-og.png`,
    author: { "@type": "Organization", name: "GBL Note", url: SITE },
    publisher: { "@type": "Organization", name: "GBL Note", logo: { "@type": "ImageObject", url: `${SITE}/gbl-icon.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GBL Note", item: SITE + localizePath(lang, "/gbl") },
      { "@type": "ListItem", position: 2, name: GUIDE_LABEL[lang] || "Guide", item: SITE + localizePath(lang, "/gbl/guide") },
      { "@type": "ListItem", position: 3, name: c.title, item: pageUrl },
    ],
  };

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" }}>
      <JsonLd data={[articleJsonLd, breadcrumbJsonLd]} />
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>{t.back}</Link>
          <Link href={L("/gbl/guide")} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>{t.listNav}</Link>
        </div>

        <article>
          <h1 style={{ margin: "0.2rem 0 0.3rem", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.35 }}>{c.title}</h1>
          <p style={{ margin: "0 0 1rem", fontSize: "0.76rem", color: "#94a3b8" }}>{t.updatedPre}{g.updated}{t.updatedSuf}</p>

          {c.sections.map((s, i) => (
            <section key={i} style={{ marginBottom: 16 }}>
              {s.h && <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>{s.h}</h2>}
              <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155", lineHeight: 1.85 }}>{s.p}</p>
              {i === 1 && <div style={{ marginTop: 14 }}><AdSlot /></div>}
            </section>
          ))}
          {/* 타입 상성 가이드 — 18타입 시각 약점표 + 전체 매트릭스(다운로드/공유). 섹션은 텍스트 전용이라 slug 조건부 삽입 */}
          {params.slug === "type-chart" && <><TypeMatrix lang={lang} /><TypeChart lang={lang} /></>}
        </article>

        <CoupangAd />

        <div style={{ marginTop: 24, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{t.othersH}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {others.map(([s, gg]) => (
              <Link key={s} href={L(`/gbl/guide/${s}`)} style={{ fontSize: "0.86rem", color: "#3b5bdb", textDecoration: "none" }}>· {guideContent(lang, gg).title}</Link>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: "0.82rem", color: "#475569" }}>
            {t.metaPre}<Link href={L("/gbl/meta/master")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.metaMeta}</Link>{t.metaMid}
            <Link href={L("/gbl/tier/master")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.metaTier}</Link>{t.metaSuf}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{t.privacy}</Link>
        </div>
      </div>
    </div>
  );
}
