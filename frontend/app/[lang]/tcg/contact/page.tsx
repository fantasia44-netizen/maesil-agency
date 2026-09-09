// 문의(Contact) — 서버렌더 SEO(신뢰 페이지, AdSense 요건: 실제 연락 수단).
// gblnote 고지를 tcg에 맞게 적응 — 동일 운영 이메일, 게시판 없이 이메일 중심.
import Link from "next/link";
import type { Metadata } from "next";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { getContact } from "./dict";

const CONTACT = "support@maesil-insight.com";
const PATH = "/tcg/contact";

export const revalidate = 86400;

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getContact(lang);
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) },
    openGraph: { title: t.ogTitle, description: t.ogDesc, url: localizePath(lang, PATH), images: ["/tcg-og.png"], type: "website" },
  };
}

const P: React.CSSProperties = { margin: "0 0 1rem", fontSize: "0.92rem", color: "#334155", lineHeight: 1.85 };

export default function Contact({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getContact(lang);
  const L = (p: string) => localizePath(lang, p);

  return (
    <div style={{ padding: "1.6rem 1rem 4rem" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link href={L("/tcg")} style={{ fontSize: "0.8rem", color: "#dc2626", textDecoration: "none" }}>← TCG Note</Link>
        <h1 style={{ margin: "0.4rem 0 0.6rem", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>

        <p style={P}>
          {t.introA}<b>{t.introB}</b>{t.introC}
        </p>

        <div style={{ background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "1rem 1.1rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 4 }}>{t.emailLabel}</div>
          <a href={`mailto:${CONTACT}`} style={{ fontSize: "1.05rem", fontWeight: 700, color: "#dc2626", textDecoration: "none" }}>{CONTACT}</a>
        </div>

        <p style={P}>{t.tipsP}</p>
        <p style={P}>
          {t.privacyA}
          <Link href={L("/tcg/privacy")} style={{ color: "#dc2626", fontWeight: 600 }}>{t.privacyLink}</Link>{t.privacyC}
        </p>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/tcg/about")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerAbout}</Link> ·{" "}
          <Link href={L("/tcg/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerPrivacy}</Link>
        </div>
      </div>
    </div>
  );
}
