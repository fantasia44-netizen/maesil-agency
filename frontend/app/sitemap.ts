import type { MetadataRoute } from "next";
import DETAIL from "./[lang]/gbl/gbl_detail.json";
import RAIDS from "./[lang]/gbl/gbl_raids.json";
import { GUIDES } from "./[lang]/gbl/guide/guides";
import { locales, localeMeta, localizePath, defaultLocale } from "../lib/i18n";

// gblnote.com 공개 SEO 사이트맵. 검색엔진이 리그별 실측 메타·티어·포켓몬 상세를 발견하도록.
// 각 경로를 ko/en/ja 3개 URL로 발행하고, 항목마다 hreflang(alternates.languages)로 상호연결.
const BASE = "https://gblnote.com";
const LEAGUES = ["master", "great", "ultra"];
const RAID_TYPES = Object.keys((RAIDS as unknown as { types: Record<string, unknown> }).types);
const POKE_TOP = 20; // 리그별 상위 N종 포켓몬 상세만 사이트맵에(신규도메인 자연스러운 규모)
const DET = DETAIL as unknown as Record<string, { id: string }[]>;

type CF = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  // 하나의 "맨몸" 경로(/gbl/...)를 로케일별 URL로 확장 + hreflang 상호연결.
  const langs = (path: string): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const l of locales) out[localeMeta[l].htmlLang] = `${BASE}${localizePath(l, path)}`;
    out["x-default"] = `${BASE}${localizePath(defaultLocale, path)}`;
    return out;
  };
  const entry = (path: string, changeFrequency: CF, priority: number): MetadataRoute.Sitemap =>
    locales.map((l) => ({
      url: `${BASE}${localizePath(l, path)}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages: langs(path) },
    }));

  const paths: [string, CF, number][] = [
    ["/gbl", "weekly", 1],
    ["/gbl/meta", "daily", 0.9],
    ...LEAGUES.map((l) => [`/gbl/meta/${l}`, "daily", 0.9] as [string, CF, number]),
    ...LEAGUES.map((l) => [`/gbl/tier/${l}`, "weekly", 0.8] as [string, CF, number]),
    ...LEAGUES.map((l) => [`/gbl/cmp/${l}`, "weekly", 0.7] as [string, CF, number]),
    ["/gbl/iv", "weekly", 0.8],
    ["/gbl/trade", "weekly", 0.7],
    ...LEAGUES.flatMap((l) =>
      (DET[l] || []).slice(0, POKE_TOP).map((d) => [`/gbl/pokemon/${l}/${d.id}`, "weekly", 0.6] as [string, CF, number]),
    ),
    ["/gbl/raid", "weekly", 0.9],
    ["/gbl/raid/bosses", "daily", 0.8],
    ["/gbl/raid/schedule", "daily", 0.8],
    ...RAID_TYPES.map((t) => [`/gbl/raid/${t}`, "weekly", 0.8] as [string, CF, number]),
    ["/gbl/schedule", "weekly", 0.7],
    ["/gbl/guide", "weekly", 0.7],
    ...Object.keys(GUIDES).map((slug) => [`/gbl/guide/${slug}`, "monthly", 0.6] as [string, CF, number]),
    ["/gbl/about", "monthly", 0.4],
    ["/gbl/contact", "yearly", 0.3],
    ["/gbl/login", "monthly", 0.5],
    ["/gbl/privacy", "yearly", 0.3],
    ["/gbl/terms", "yearly", 0.3],
  ];

  return paths.flatMap(([path, cf, pri]) => entry(path, cf, pri));
}
