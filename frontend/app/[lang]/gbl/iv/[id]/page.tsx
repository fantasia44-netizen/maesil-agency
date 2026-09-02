// 개체값 타협 분석 라우트 — 서버렌더(크롤 가능). 발행 여부는 IvEntry.published가 제어.
// published=true → 색인 허용 + FAQPage 리치결과. 미검수 몬은 published 생략 → noindex.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../../lib/i18n";
import { ivEntry, IV_ANALYSIS } from "../analysis/registry";
import IvAnalysisView from "./IvAnalysisView";
import JsonLd from "../../JsonLd";

export const revalidate = 86400;

export function generateStaticParams() {
  return Object.keys(IV_ANALYSIS).map((id) => ({ id }));
}

export function generateMetadata({ params }: { params: { lang: string; id: string } }): Metadata {
  const e = ivEntry(params.id);
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  if (!e) return { title: "GBL Note" };
  const a = e.article[lang] || e.article.en;
  const path = `/gbl/iv/${params.id}`;
  const desc = a.lead.replace(/\s+/g, " ").trim().slice(0, 155);
  // og:image를 리다이렉트 없는 직접 URL로 명시. 파일컨벤션 자동URL은 /ko/… 를 써서 301(→/…)되는데
  // 카카오·일부 스크래퍼는 이미지 리다이렉트를 안 따라가 미리보기 이미지가 비어버림.
  // localizePath: ko=프리픽스 없음(/gbl/…, 리다이렉트 안 됨), en/ja/zh=프리픽스 유지(패스스루).
  const ogImg = `https://gblnote.com${localizePath(lang, `${path}/opengraph-image`)}`;
  const md: Metadata = {
    title: `${a.title} | GBL Note`,
    description: desc,
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    openGraph: { title: a.title, description: desc, url: localizePath(lang, path), type: "article",
      images: [{ url: ogImg, width: 1200, height: 630, alt: a.title }] },
    twitter: { card: "summary_large_image", title: a.title, description: desc, images: [ogImg] },
  };
  // 미검수 몬은 색인 금지.
  return e.published ? md : { ...md, robots: { index: false, follow: false } };
}

export default function IvAnalysisPage({ params }: { params: { lang: string; id: string } }) {
  const e = ivEntry(params.id);
  if (!e) notFound();
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const a = e.article[lang] || e.article.en;
  // FAQPage 리치결과 — 발행된 몬만(noindex 페이지엔 스키마 미노출이 정석).
  const faqLd = e.published && a.faq && a.faq.length > 0 ? {
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
      <IvAnalysisView lang={lang} id={params.id} e={e} />
    </>
  );
}
