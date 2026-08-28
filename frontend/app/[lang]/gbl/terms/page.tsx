// 이용약관 — 서버렌더 공개 페이지(3개국어).
import Link from "next/link";
import type { Metadata } from "next";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { getTerms } from "./dict";

const CONTACT = "support@maesil-insight.com";
const EFFECTIVE = "2026-08-19";

const META: Record<string, { title: string; description: string }> = {
  ko: { title: "이용약관 | GBL Note", description: "GBL Note(gblnote.com) 서비스 이용약관 — 계정, 이용자 의무, 콘텐츠, 광고, 면책, 준거법 안내." },
  en: { title: "Terms of Service | GBL Note", description: "GBL Note (gblnote.com) Terms of Service — accounts, user obligations, content, advertising, disclaimer, and governing law." },
  ja: { title: "利用規約 | GBL Note", description: "GBL Note(gblnote.com)の利用規約 — アカウント、利用者の義務、コンテンツ、広告、免責、準拠法について。" },
  "zh-TW": { title: "使用條款 | GBL Note", description: "GBL Note（gblnote.com）服務使用條款 — 帳號、使用者義務、內容、廣告、免責、準據法說明。" },
};

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const lang = isLocale(params.lang) ? params.lang : defaultLocale;
  const m = META[lang] || META[defaultLocale];
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: localizePath(lang, "/gbl/terms"), languages: hreflangLanguages("/gbl/terms") },
  };
}

const h2: React.CSSProperties = { fontSize: "1.05rem", fontWeight: 800, margin: "1.6rem 0 0.5rem", color: "#0f172a" };
const p: React.CSSProperties = { margin: "0.4rem 0", lineHeight: 1.75, color: "#334155", fontSize: "0.92rem" };
const aStyle: React.CSSProperties = { color: "#3b5bdb" };

export default function GblTerms({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getTerms(lang);
  const L = (path: string) => localizePath(lang, path);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.1rem 4rem", background: "#fff", color: "#0f172a" }}>
      <div style={{ marginBottom: 6 }}>
        <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
      </div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "0.3rem 0 0.2rem" }}>{t.title}</h1>
      <p style={{ ...p, color: "#94a3b8", fontSize: "0.8rem" }}>{t.effectiveLabel}: {EFFECTIVE}</p>

      {t.articles.map((art) => (
        <section key={art.h}>
          <h2 style={h2}>{art.h}</h2>
          {art.lines.map((line, i) => <p key={i} style={line.startsWith("•") ? { ...p, margin: "0.25rem 0" } : p}>{line}</p>)}
        </section>
      ))}

      <h2 style={h2}>{t.contactHead}</h2>
      <p style={p}>{t.contactSuffix} <a href={`mailto:${CONTACT}`} style={aStyle}>{CONTACT}</a> (<Link href={L("/gbl/contact")} style={aStyle}>{t.contactPageLink}</Link>)</p>

      <p style={{ ...p, marginTop: "1.8rem", color: "#94a3b8", fontSize: "0.8rem" }}>{t.changeNote}</p>
    </div>
  );
}
