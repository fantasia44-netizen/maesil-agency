// 개별 가이드 — 초보/전략 가이드 본문. 색인 대상(실질 콘텐츠) + 도구/티어로 내부링크.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GUIDES, guideBySlug } from "../guides";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, locales, type Locale } from "../../../../../lib/i18n";

export const revalidate = 86400;

export function generateStaticParams() {
  return locales.flatMap((lang) => GUIDES.map((g) => ({ lang, slug: g.slug })));
}

const BACK: Record<Locale, string> = { ko: "가이드", en: "Guides", ja: "ガイド", "zh-TW": "指南" };
const MORE: Record<Locale, string> = { ko: "다른 가이드", en: "More guides", ja: "他のガイド", "zh-TW": "其他指南" };

export function generateMetadata({ params }: { params: { lang: string; slug: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const g = guideBySlug(params.slug);
  if (!g) return { title: "TCG Note" };
  const b = g.i18n[lang];
  const path = `/tcg/guides/${g.slug}`;
  return { title: `${b.title} | TCG Note`, description: b.summary, alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) }, openGraph: { title: `${b.title} | TCG Note`, description: b.summary, url: localizePath(lang, path), type: "article" } };
}

export default function GuidePage({ params }: { params: { lang: string; slug: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const g = guideBySlug(params.slug);
  if (!g) notFound();
  const b = g.i18n[lang];
  const others = GUIDES.filter((x) => x.slug !== g.slug);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ fontSize: "0.78rem", marginBottom: 6 }}>
        <Link href={localizePath(lang, "/tcg")} style={{ color: "#dc2626", textDecoration: "none" }}>← TCG Note</Link>
        <span style={{ color: "#cbd5e1", margin: "0 6px" }}>/</span>
        <Link href={localizePath(lang, "/tcg/guides")} style={{ color: "#dc2626", textDecoration: "none" }}>{BACK[lang]}</Link>
      </div>
      <h1 style={{ margin: "0 0 6px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.35 }}>
        <span style={{ marginRight: 8 }}>{g.icon}</span>{b.title}
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: "0.92rem", color: "#475569", lineHeight: 1.7 }}>{b.summary}</p>

      <article>
        {b.sections.map((s, i) => (
          <section key={i} style={{ marginBottom: 22 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.08rem", fontWeight: 800, color: "#b91c1c" }}>{s.h}</h2>
            <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155", lineHeight: 1.85 }}>{s.p}</p>
          </section>
        ))}
      </article>

      {b.cta && b.cta.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, marginBottom: 26 }}>
          {b.cta.map((c) => (
            <Link key={c.href} href={localizePath(lang, c.href)} style={{
              fontSize: "0.85rem", fontWeight: 700, color: "#fff", textDecoration: "none",
              background: "#dc2626", borderRadius: 8, padding: "8px 14px",
            }}>{c.label}</Link>
          ))}
        </div>
      )}

      <div style={{ borderTop: "1px solid #f9e8e8", paddingTop: 16 }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#334155", marginBottom: 8 }}>{MORE[lang]}</div>
        <div style={{ display: "grid", gap: 8 }}>
          {others.map((o) => {
            const ob = o.i18n[lang];
            return (
              <Link key={o.slug} href={localizePath(lang, `/tcg/guides/${o.slug}`)} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", background: "#fef6f5", border: "1px solid #fbd8d8", borderRadius: 10, padding: "0.6rem 0.9rem" }}>
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{o.icon}</span>
                <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#b91c1c" }}>{ob.title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
