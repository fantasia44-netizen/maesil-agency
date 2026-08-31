// GBL Note 소개 — 서버렌더 SEO(신뢰 페이지, AdSense 권장).
import Link from "next/link";
import type { Metadata } from "next";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { getAbout } from "./dict";

const PATH = "/gbl/about";

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getAbout(lang);
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) },
    openGraph: { title: t.ogTitle, description: t.ogDesc, url: localizePath(lang, PATH), images: ["/gbl-og.png"], type: "website" },
  };
}

const P: React.CSSProperties = { margin: "0 0 1rem", fontSize: "0.92rem", color: "#334155", lineHeight: 1.85 };
const H2: React.CSSProperties = { fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: "1.6rem 0 0.5rem" };

export default function About({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getAbout(lang);
  const L = (p: string) => localizePath(lang, p);

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.6rem 1rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href={L("/gbl")} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
        <h1 style={{ margin: "0.4rem 0 0.6rem", fontSize: "1.6rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>

        <p style={P}>
          {t.p1a}<b>{t.p1b}</b>{t.p1c}
        </p>

        {/* 운영자 신원(E-E-A-T) — 실제 레전드 랭커. 신뢰 시그널로 상단 배치. */}
        <div style={{ margin: "1.2rem 0", padding: "1rem 1.15rem", background: "#fff", border: "1px solid #e3e8f2", borderLeft: "4px solid #7c3aed", borderRadius: 12 }}>
          <h2 style={{ ...H2, margin: "0 0 0.5rem" }}>{t.creatorH}</h2>
          <p style={{ ...P, margin: 0 }}>
            <b>{t.creatorLeadB}</b>{t.creatorBody}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gbl/legend-proof.jpg" alt={t.creatorProofAlt}
            style={{ display: "block", maxWidth: 260, width: "100%", height: "auto", margin: "0.9rem auto 0", borderRadius: 12, border: "1px solid #e3e8f2" }} />
        </div>

        <h2 style={H2}>{t.whatH}</h2>
        <p style={P}>
          <b>{t.whatLogB}</b>{t.whatLogRest}
        </p>
        <p style={P}>
          <b>{t.whatRecordB}</b>{t.whatRecordRest}
        </p>
        <p style={P}>
          <b>{t.whatMetaB}</b>{t.whatMetaRest}
        </p>

        <h2 style={H2}>{t.dataH}</h2>
        <p style={P}>
          {t.dataA}<b>{t.dataB}</b>{t.dataC}
        </p>

        <h2 style={H2}>{t.usageH}</h2>
        <p style={P}>
          {t.usageA}<b>{t.usageB}</b>{t.usageC}
          <Link href={L("/gbl/contact")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.usageLink}</Link>{t.usageD}
        </p>

        <div style={{ marginTop: 20, fontSize: "0.86rem" }}>
          <Link href={L("/gbl/login")} style={{ color: "#3b5bdb", fontWeight: 700 }}>{t.startCta}</Link>
        </div>
        <div style={{ textAlign: "center", marginTop: 24, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/gbl/guide")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerGuide}</Link> ·{" "}
          <Link href={L("/gbl/contact")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerContact}</Link> ·{" "}
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerPrivacy}</Link>
        </div>
      </div>
    </div>
  );
}
