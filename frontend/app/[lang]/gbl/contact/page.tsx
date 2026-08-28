// 문의(Contact) — 서버렌더 SEO(신뢰 페이지, AdSense 권장).
import Link from "next/link";
import type { Metadata } from "next";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { getContact } from "./dict";

const CONTACT = "support@maesil-insight.com";
const PATH = "/gbl/contact";

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getContact(lang);
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) },
    openGraph: { title: t.ogTitle, description: t.ogDesc, url: localizePath(lang, PATH), images: ["/gbl-og.png"], type: "website" },
  };
}

const P: React.CSSProperties = { margin: "0 0 1rem", fontSize: "0.92rem", color: "#334155", lineHeight: 1.85 };

export default function Contact({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getContact(lang);
  const L = (p: string) => localizePath(lang, p);

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.6rem 1rem 4rem" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link href={L("/gbl")} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
        <h1 style={{ margin: "0.4rem 0 0.6rem", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>

        <p style={P}>
          {t.introA}<b>{t.introB}</b>{t.introC}<b>{t.introD}</b>{t.introE}
        </p>

        <div style={{ background: "#eef2fb", border: "1px solid #d5ddf3", borderRadius: 12, padding: "1.1rem 1.1rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: 8 }}>{t.boardLabel}</div>
          <Link href={L("/gbl/board")} style={{ display: "inline-block", background: "#3b5bdb", color: "#fff", fontWeight: 800, fontSize: "0.95rem", padding: "11px 20px", borderRadius: 10, textDecoration: "none" }}>
            {t.boardCta}
          </Link>
          <div style={{ fontSize: "0.76rem", color: "#94a3b8", marginTop: 8 }}>{t.boardNote}</div>
        </div>

        <p style={P}>
          {t.privateA}<b>{t.privateB}</b>{t.privateC}
        </p>

        <div style={{ background: "#ffffff", border: "1px solid #e3e8f2", borderRadius: 12, padding: "1rem 1.1rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 4 }}>{t.emailLabel}</div>
          <a href={`mailto:${CONTACT}`} style={{ fontSize: "1.05rem", fontWeight: 700, color: "#3b5bdb", textDecoration: "none" }}>{CONTACT}</a>
        </div>

        <p style={P}>
          {t.tipsP}
        </p>
        <p style={P}>
          {t.privacyA}
          <Link href={L("/gbl/privacy")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.privacyLink}</Link>{t.privacyC}
        </p>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/gbl/about")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerAbout}</Link> ·{" "}
          <Link href={L("/gbl/guide")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerGuide}</Link> ·{" "}
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerPrivacy}</Link>
        </div>
      </div>
    </div>
  );
}
