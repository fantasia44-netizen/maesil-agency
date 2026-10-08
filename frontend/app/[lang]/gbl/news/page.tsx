// 뉴스 목록 — 운영자가 발행하는 소식·공략(서버 렌더). 글 데이터는 posts.ts.
// 글이 없는 언어에서는 404(그 언어에 번역 글이 생기면 locales.ts에 로케일을 추가해 연다).
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "../AdSlot";
import JsonLd from "../JsonLd";
import { formDexById } from "../sprite";
import { isLocale, defaultLocale, localizePath, localeMeta, type Locale } from "../../../../lib/i18n";
import { speciesOf } from "../moves/movesData";
import { getNews } from "./dict";
import { NEWS_LOCALES, newsOpen } from "./locales";
import { postsFor, postContent } from "./posts";

export const revalidate = 3600;
const PATH = "/gbl/news";
const SITE = "https://gblnote.com";
const CARD = "#ffffff", BORDER = "#e3e8f2";
const CAT_COLOR: Record<string, string> = { raid: "#ea580c", event: "#7c3aed", analysis: "#0891b2", battle: "#1d4ed8" };
const SPRITE = (sid: string, dex: number) => `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${formDexById(sid, dex)}.png`;
// 뉴스가 열린 로케일만 hreflang으로 묶는다.
const hreflang = (path: string) => { const o: Record<string, string> = {}; for (const l of NEWS_LOCALES) o[localeMeta[l].htmlLang] = localizePath(l, path); o["x-default"] = localizePath(defaultLocale, path); return o; };

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  if (!newsOpen(lang)) return { title: "GBL Note", robots: { index: false, follow: true } };
  const t = getNews(lang);
  return {
    title: t.metaTitle, description: t.metaDesc,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflang(PATH), types: { "application/rss+xml": `${SITE}/rss.xml` } },
    openGraph: { title: t.metaTitle, description: t.metaDesc, url: localizePath(lang, PATH), images: ["/gbl-og.png"], type: "website" },
  };
}

export default function NewsList({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  if (!newsOpen(lang)) notFound();
  const t = getNews(lang);
  const L = (p: string) => localizePath(lang, p);
  const posts = postsFor(lang);
  const breadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GBL Note", item: SITE + L("/gbl") },
      { "@type": "ListItem", position: 2, name: t.navLabel, item: SITE + L(PATH) },
    ],
  };

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(1000px 500px at 50% -10%, #e9e4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" }}>
      <JsonLd data={breadcrumb} />
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 8 }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{t.back}</Link>
        </div>
        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>{t.h1}</h1>
        <p style={{ margin: "0.4rem 0 1.1rem", fontSize: "0.88rem", color: "#475569", lineHeight: 1.75 }}>{t.intro}</p>

        {posts.length === 0 && <p style={{ color: "#94a3b8", padding: "2rem 0", textAlign: "center" }}>{t.empty}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {posts.map((p, i) => {
            const c = postContent(p, lang)!;
            const col = CAT_COLOR[p.cat] || "#64748b";
            return (
              <div key={p.slug}>
                <Link href={L(`${PATH}/${p.slug}`)} style={{ display: "flex", gap: 12, alignItems: "center", textDecoration: "none", background: CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${col}`, borderRadius: 12, padding: "0.85rem 1rem" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: "0.66rem", fontWeight: 800, color: "#fff", background: col, padding: "1px 8px", borderRadius: 8 }}>{t.cat[p.cat]}</span>
                      <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{p.updated || p.published}</span>
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.4 }}>{c.title}</div>
                    <div style={{ marginTop: 4, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>{c.desc}</div>
                  </div>
                  <div style={{ display: "flex", flexShrink: 0 }}>
                    {(p.mons || []).slice(0, 2).map((sid) => { const sp = speciesOf(sid.replace(/_shadow$/, "")); return sp ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={sid} src={SPRITE(sid, sp.dex)} alt="" width={44} height={44} loading="lazy" style={{ imageRendering: "pixelated" }} />
                    ) : null; })}
                  </div>
                </Link>
                {i === 1 && <AdSlot />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
