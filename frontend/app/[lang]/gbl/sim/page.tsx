// PvP 배틀 시뮬레이터 — 클라이언트 계산(엔진). 서버는 메타/hreflang 셸.
import Link from "next/link";
import type { Metadata } from "next";
import SimView from "./SimView";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { getSim } from "./dict";

const PATH = "/gbl/sim";
export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getSim(lang);
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    keywords: t.metaKeywords,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) },
    openGraph: { title: t.ogTitle, description: t.ogDesc, url: localizePath(lang, PATH), images: ["/gbl-og.png"], type: "website" },
  };
}

export default function SimPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getSim(lang);
  const L = (p: string) => localizePath(lang, p);
  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(1000px 500px at 50% -10%, #e0e7ff 0%, transparent 60%), linear-gradient(180deg,#f7f9ff,#eef2f8)", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto 10px" }}>
        <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{t.navBack}</Link>
        <h1 style={{ margin: "0.3rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>
        <p style={{ margin: "0.3rem 0 0.4rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.6 }}>{t.intro}</p>
      </div>
      <SimView lang={lang} t={t} />
    </div>
  );
}
