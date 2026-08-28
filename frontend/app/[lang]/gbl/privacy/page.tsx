// 개인정보처리방침 — 서버렌더 공개 페이지 (AdSense·검색·스토어 요건, 3개국어).
import Link from "next/link";
import type { Metadata } from "next";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { getPrivacy } from "./dict";

const CONTACT = "support@maesil-insight.com";  // 실제 수신 운영 창구
const EFFECTIVE = "2026-08-19";

const META: Record<string, { title: string; description: string }> = {
  ko: { title: "개인정보처리방침 | GBL Note", description: "GBL Note(gblnote.com)의 개인정보 수집·이용·보관 및 제3자 처리(광고·분석) 안내." },
  en: { title: "Privacy Policy | GBL Note", description: "How GBL Note (gblnote.com) collects, uses, and stores personal data, and third-party processing (ads/analytics)." },
  ja: { title: "プライバシーポリシー | GBL Note", description: "GBL Note(gblnote.com)の個人情報の収集・利用・保管、および第三者処理(広告・分析)について。" },
  "zh-TW": { title: "隱私權政策 | GBL Note", description: "GBL Note（gblnote.com）的個人資料蒐集·利用·保管及第三方處理（廣告·分析）說明。" },
};

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const lang = isLocale(params.lang) ? params.lang : defaultLocale;
  const m = META[lang] || META[defaultLocale];
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: localizePath(lang, "/gbl/privacy"), languages: hreflangLanguages("/gbl/privacy") },
  };
}

const h2: React.CSSProperties = { fontSize: "1.05rem", fontWeight: 800, margin: "1.6rem 0 0.5rem", color: "#0f172a" };
const p: React.CSSProperties = { margin: "0.4rem 0", lineHeight: 1.75, color: "#334155", fontSize: "0.92rem" };
const li: React.CSSProperties = { ...p, margin: "0.25rem 0" };
const aStyle: React.CSSProperties = { color: "#3b5bdb" };

export default function GblPrivacy({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getPrivacy(lang);
  const L = (path: string) => localizePath(lang, path);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.1rem 4rem", background: "#fff", color: "#0f172a" }}>
      <div style={{ marginBottom: 6 }}>
        <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
      </div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "0.3rem 0 0.2rem" }}>{t.title}</h1>
      <p style={{ ...p, color: "#94a3b8", fontSize: "0.8rem" }}>{t.effectiveLabel}: {EFFECTIVE}</p>

      <p style={p}>{t.intro}</p>

      <h2 style={h2}>{t.s1h}</h2>
      {t.s1.map((l, i) => <p key={i} style={li}>{l}</p>)}

      <h2 style={h2}>{t.s2h}</h2>
      {t.s2.map((l, i) => <p key={i} style={li}>{l}</p>)}

      <h2 style={h2}>{t.s3h}</h2>
      {t.s3.map((l, i) => <p key={i} style={p}>{l}</p>)}

      <h2 style={h2}>{t.s4h}</h2>
      <p style={p}>{t.s4intro}</p>
      <p style={li}>{t.s4providers}</p>
      <p style={li}>
        {t.s4gaPre}
        <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={aStyle}>{t.s4gaLink}</a>
        {t.s4gaPost}
      </p>
      <p style={li}>
        {t.s4adsPre}
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" style={aStyle}>{t.s4adsLink}</a>
        {t.s4adsPost}
      </p>
      <p style={li}>{t.s4coupang}</p>
      <p style={li}>{t.s4cookie}</p>

      <h2 style={h2}>{t.s5h}</h2>
      {t.s5.map((l, i) => <p key={i} style={p}>{l}</p>)}

      <h2 style={h2}>{t.contactHead}</h2>
      <p style={p}>{t.contactSuffix} <a href={`mailto:${CONTACT}`} style={aStyle}>{CONTACT}</a></p>

      <p style={{ ...p, marginTop: "1.8rem", color: "#94a3b8", fontSize: "0.8rem" }}>
        {t.changeNote}{" "}
        <Link href={L("/gbl/terms")} style={aStyle}>{t.termsLink}</Link>
      </p>
    </div>
  );
}
