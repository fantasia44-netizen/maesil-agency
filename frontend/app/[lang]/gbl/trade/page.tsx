// 포켓몬 교환 목록 메이커 — 서버 셸(메타/hreflang) + 클라이언트 TradeMaker.
import Link from "next/link";
import type { Metadata } from "next";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { getTrade } from "./dict";
import TradeMaker from "./TradeMaker";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getTrade(lang);
  const path = "/gbl/trade";
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    openGraph: { title: t.ogTitle, description: t.ogDesc, url: localizePath(lang, path), images: ["/gbl-og.png"], type: "website" },
  };
}

export default function TradePage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getTrade(lang);
  const L = (p: string) => localizePath(lang, p);

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(1100px 520px at 50% -12%, #dbe4ff 0%, transparent 62%), linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.2rem 1rem 4rem" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ marginBottom: 6 }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{t.navBack}</Link>
        </div>
        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.4px" }}>{t.h1}</h1>
        <p style={{ margin: "0.4rem 0 1.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>{t.intro}</p>

        <TradeMaker lang={lang} t={t} />

        <div style={{ textAlign: "center", marginTop: 26, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/gbl/guide")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerGuide}</Link> ·{" "}
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerPrivacy}</Link>
        </div>
      </div>
    </div>
  );
}
