// 개체값 타협 분석 라우트 — 관리자 전용(완성 전까지). noindex + 클라이언트 admin 게이트.
// 완성 시: robots noindex 제거 + IvAnalysisView의 게이트 제거 + sitemap/네비 연결 → 전체 공개.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale, type Locale } from "../../../../../lib/i18n";
import { ivEntry, IV_ANALYSIS } from "../analysis/registry";
import IvAnalysisView from "./IvAnalysisView";
import JsonLd from "../../JsonLd";

export const revalidate = 86400;

// 발행 스위치 — 완성/검수 후 true로 바꾸면 색인 허용 + FAQPage 리치결과 방출.
// (IvAnalysisView의 클라이언트 admin 게이트도 함께 해제해야 완전 공개)
const PUBLISHED = false;

export function generateStaticParams() {
  return Object.keys(IV_ANALYSIS).map((id) => ({ id }));
}

export function generateMetadata({ params }: { params: { lang: string; id: string } }): Metadata {
  const e = ivEntry(params.id);
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const title = e ? `${(e.article[lang] || e.article.en).title} | GBL Note` : "GBL Note";
  // 검수 단계는 색인 금지. PUBLISHED=true 시 색인 허용.
  return PUBLISHED ? { title } : { title, robots: { index: false, follow: false } };
}

export default function IvAnalysisPage({ params }: { params: { lang: string; id: string } }) {
  const e = ivEntry(params.id);
  if (!e) notFound();
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const a = e.article[lang] || e.article.en;
  // FAQPage 리치결과 — 발행 후에만 방출(noindex 페이지엔 스키마 미노출이 정석).
  const faqLd = PUBLISHED && a.faq && a.faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: a.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;
  return (
    <>
      {faqLd && <JsonLd data={faqLd} />}
      <IvAnalysisView lang={lang} id={params.id} />
    </>
  );
}
