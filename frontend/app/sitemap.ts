import type { MetadataRoute } from "next";

// gbl.maesil.net 공개 SEO 사이트맵. 검색엔진이 리그별 실측 메타를 발견하도록.
const BASE = "https://gblnote.com";
const LEAGUES = ["master", "great", "ultra"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE}/gbl`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/gbl/meta`, lastModified, changeFrequency: "daily", priority: 0.9 },
    ...LEAGUES.map((l) => ({
      url: `${BASE}/gbl/meta/${l}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...LEAGUES.map((l) => ({
      url: `${BASE}/gbl/tier/${l}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${BASE}/gbl/login`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/gbl/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
