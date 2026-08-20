import type { MetadataRoute } from "next";
import DETAIL from "./gbl/gbl_detail.json";
import RAIDS from "./gbl/gbl_raids.json";
import { GUIDES } from "./gbl/guide/[slug]/page";

// gbl.maesil.net 공개 SEO 사이트맵. 검색엔진이 리그별 실측 메타·티어·포켓몬 상세를 발견하도록.
const BASE = "https://gblnote.com";
const LEAGUES = ["master", "great", "ultra"];
const RAID_TYPES = Object.keys((RAIDS as unknown as { types: Record<string, unknown> }).types);
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
    ...LEAGUES.map((l) => ({
      url: `${BASE}/gbl/cmp/${l}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...pokemon,
    { url: `${BASE}/gbl/raid`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    ...RAID_TYPES.map((t) => ({
      url: `${BASE}/gbl/raid/${t}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${BASE}/gbl/schedule`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/gbl/guide`, lastModified, changeFrequency: "weekly", priority: 0.7 },
    ...Object.keys(GUIDES).map((slug) => ({
      url: `${BASE}/gbl/guide/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${BASE}/gbl/about`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/gbl/contact`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/gbl/login`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/gbl/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/gbl/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
