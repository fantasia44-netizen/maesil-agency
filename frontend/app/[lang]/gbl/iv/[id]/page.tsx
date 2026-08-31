// 개체값 타협 분석 라우트 — 관리자 전용(완성 전까지). noindex + 클라이언트 admin 게이트.
// 완성 시: robots noindex 제거 + IvAnalysisView의 게이트 제거 + sitemap/네비 연결 → 전체 공개.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale, type Locale } from "../../../../../lib/i18n";
import { ivEntry, IV_ANALYSIS } from "../analysis/registry";
import IvAnalysisView from "./IvAnalysisView";

export const revalidate = 86400;

export function generateStaticParams() {
  return Object.keys(IV_ANALYSIS).map((id) => ({ id }));
}

export function generateMetadata({ params }: { params: { lang: string; id: string } }): Metadata {
  const e = ivEntry(params.id);
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const title = e ? `${(e.article[lang] || e.article.en).title} | GBL Note` : "GBL Note";
  // 관리자 검수 단계 — 완성 전까지 색인 금지(완성 시 이 robots 제거).
  return { title, robots: { index: false, follow: false } };
}

export default function IvAnalysisPage({ params }: { params: { lang: string; id: string } }) {
  const e = ivEntry(params.id);
  if (!e) notFound();
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  return <IvAnalysisView lang={lang} id={params.id} />;
}
