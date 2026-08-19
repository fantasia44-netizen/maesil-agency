import type { MetadataRoute } from "next";
import DETAIL from "./gbl/gbl_detail.json";

// gbl.maesil.net 공개 SEO 사이트맵. 검색엔진이 리그별 실측 메타·티어·포켓몬 상세를 발견하도록.
const BASE = "https://gblnote.com";
const LEAGUES = ["master", "great", "ultra"];
const POKE_TOP = 20; // 리그별 상위 N종 포켓몬 상세만 사이트맵에(신규도메인 자연스러운 규모)
const DET = DETAIL as unknown as Record<string, { id: string }[]>;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const pokemon = LEAGUES.flatMap((l) =>
    (DET[l] || []).slice(0, POKE_TOP).map((d) => ({
      url: `${BASE}/gbl/pokemon/${l}/${d.id}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  );
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
    ...pokemon,
    { url: `${BASE}/gbl/login`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/gbl/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
