import type { Metadata } from "next";
import LegalView from "../LegalView";
import { ABOUT } from "../legal";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";

export const revalidate = 86400;
const PATH = "/tcg/about";

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const d = ABOUT[lang];
  return { title: `${d.title} | TCG Note`, description: d.desc, alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) } };
}

export default function AboutPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  return <LegalView doc={ABOUT[lang]} lang={lang} />;
}
