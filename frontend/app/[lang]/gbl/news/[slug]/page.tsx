// 뉴스 글 — 서버 렌더. 본문은 posts.ts의 블록, 숫자·표는 자동 블록(NewsBlocks)이 사이트 데이터에서 채운다.
// 번역이 없는 언어의 주소는 404(한글 본문이 다른 언어 페이지에 나가지 않게).
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "../../AdSlot";
import JsonLd from "../../JsonLd";
import { formDexById } from "../../sprite";
import { isLocale, defaultLocale, localizePath, localeMeta, type Locale } from "../../../../../lib/i18n";
import { speciesOf } from "../../moves/movesData";
import { dexPath } from "../../dexHub";
import { getNews } from "../dict";
import NewsBlocks from "../NewsBlocks";
import { POSTS, postBySlug, postContent, postLangs, postsFor } from "../posts";

export const revalidate = 3600;
export function generateStaticParams() { return POSTS.map((p) => ({ slug: p.slug })); }

const SITE = "https://gblnote.com";
const CARD = "#ffffff", BORDER = "#e3e8f2";
const CAT_COLOR: Record<string, string> = { raid: "#ea580c", event: "#7c3aed", analysis: "#0891b2", battle: "#1d4ed8" };
const SPRITE = (sid: string, dex: number) => `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${formDexById(sid, dex)}.png`;

export function generateMetadata({ params }: { params: { lang: string; slug: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const p = postBySlug(params.slug);
  const c = p && postContent(p, lang);
  if (!p || !c) return { title: "GBL Note", robots: { index: false, follow: true } };
  const t = getNews(lang);
  const path = `/gbl/news/${p.slug}`;
  const languages: Record<string, string> = {};
  for (const l of postLangs(p)) languages[localeMeta[l].htmlLang] = localizePath(l, path);
  languages["x-default"] = localizePath(defaultLocale, path);
  return {
    title: `${c.title}${t.titleSuffix}`, description: c.desc, keywords: c.keywords,
    alternates: { canonical: localizePath(lang, path), languages },
    openGraph: { title: c.title, description: c.desc, url: localizePath(lang, path), images: ["/gbl-og.png"], type: "article", publishedTime: p.published, modifiedTime: p.updated || p.published },
  };
}

export default function NewsArticle({ params }: { params: { lang: string; slug: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const p = postBySlug(params.slug);
  const c = p && postContent(p, lang);
  if (!p || !c) notFound();
  const t = getNews(lang);
  const L = (x: string) => localizePath(lang, x);
  const path = `/gbl/news/${p.slug}`;
  const pageUrl = SITE + L(path);
  const col = CAT_COLOR[p.cat] || "#64748b";
  const others = postsFor(lang).filter((o) => o.slug !== p.slug).slice(0, 6);
  // 광고는 두 번째 소제목 앞(본문 초반을 지난 자리)에 한 번.
  const hIdx = c.blocks.map((b, i) => ("h" in b ? i : -1)).filter((i) => i >= 0);
  const adAfter = hIdx.length >= 2 ? hIdx[1] - 1 : Math.min(2, c.blocks.length - 1);

  const articleLd = {
    "@context": "https://schema.org", "@type": "NewsArticle",
    headline: c.title, description: c.desc, inLanguage: localeMeta[lang].htmlLang,
    datePublished: p.published, dateModified: p.updated || p.published,
    image: `${SITE}/gbl-og.png`,
    author: { "@type": "Organization", name: "GBL Note", url: SITE },
    publisher: { "@type": "Organization", name: "GBL Note", logo: { "@type": "ImageObject", url: `${SITE}/gbl-icon.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GBL Note", item: SITE + L("/gbl") },
      { "@type": "ListItem", position: 2, name: t.navLabel, item: SITE + L("/gbl/news") },
      { "@type": "ListItem", position: 3, name: c.title, item: pageUrl },
    ],
  };

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" }}>
      <JsonLd data={[articleLd, breadcrumbLd]} />
      <div style={{ maxWidth: 740, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>{t.back}</Link>
          <Link href={L("/gbl/news")} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{t.listNav}</Link>
        </div>

        <article>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#fff", background: col, padding: "2px 9px", borderRadius: 8 }}>{t.cat[p.cat]}</span>
            <span style={{ fontSize: "0.76rem", color: "#94a3b8" }}>{t.published(p.published)}{p.updated && p.updated !== p.published ? ` · ${t.updated(p.updated)}` : ""}</span>
          </div>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.35 }}>{c.title}</h1>

          {/* 머리 그림 — 글에 나오는 포켓몬(도감으로 연결) */}
          {(p.mons || []).length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 14px" }}>
              {p.mons!.map((sid) => {
                const sp = speciesOf(sid.replace(/_shadow$/, "")); if (!sp) return null;
                const href = dexPath(sid); const shadow = sid.endsWith("_shadow");
                const inner = (
                  <span style={{ width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center", background: shadow ? "radial-gradient(circle, #a855f7cc 0%, #7c3aed77 45%, transparent 72%)" : "#fff", border: shadow ? "none" : `1px solid ${BORDER}`, borderRadius: 14 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={SPRITE(sid, sp.dex)} alt={sp.n[lang] || sp.n.en} width={56} height={56} style={{ imageRendering: "pixelated" }} />
                  </span>
                );
                return href ? <Link key={sid} href={L(href)} prefetch={false} title={sp.n[lang] || sp.n.en}>{inner}</Link> : <span key={sid}>{inner}</span>;
              })}
            </div>
          )}

          <NewsBlocks lang={lang} t={t} blocks={c.blocks} adAfter={adAfter} ad={<AdSlot />} />
        </article>

        {/* 출처 */}
        {p.sources && p.sources.length > 0 && (
          <div style={{ marginTop: 18, fontSize: "0.76rem", color: "#64748b", lineHeight: 1.7 }}>
            <b style={{ color: "#475569" }}>{t.sourcesH}</b>{" · "}
            {p.sources.map((s, i) => (
              <span key={i}>{i > 0 && " · "}{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: "#3b5bdb", textDecoration: "none" }}>{s.label}</a> : s.label}</span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 22, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          {c.tools && c.tools.length > 0 && (
            <>
              <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{t.toolsH}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: others.length ? 16 : 0 }}>
                {c.tools.map((tl) => (
                  <Link key={tl.path} href={L(tl.path)} style={{ fontSize: "0.82rem", fontWeight: 700, color: "#3b5bdb", textDecoration: "none", background: "#eef2fb", border: `1px solid ${BORDER}`, borderRadius: 999, padding: "4px 12px" }}>{tl.label}</Link>
                ))}
              </div>
            </>
          )}
          {others.length > 0 && (
            <>
              <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{t.moreH}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {others.map((o) => (
                  <Link key={o.slug} href={L(`/gbl/news/${o.slug}`)} style={{ fontSize: "0.86rem", color: "#3b5bdb", textDecoration: "none" }}>· {postContent(o, lang)!.title}</Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
