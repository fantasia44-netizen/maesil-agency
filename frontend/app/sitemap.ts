import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import DETAIL from "./[lang]/gbl/gbl_detail.json";
import RAIDS from "./[lang]/gbl/gbl_raids.json";
import { GUIDES } from "./[lang]/gbl/guide/guides";
import { IV_ANALYSIS } from "./[lang]/gbl/iv/analysis/registry";
import { isMetaMon } from "./[lang]/gbl/indexGate";
import { analyzedDeckIds } from "./[lang]/tcg/decks/analysis";
import { GUIDES as TCG_GUIDES } from "./[lang]/tcg/guides/guides";
import { locales, localeMeta, localizePath, defaultLocale } from "../lib/i18n";

// 호스트별 사이트맵 — gblnote.com=/gbl 트리, tcgnote.net=/tcg 트리(같은 배포, 도메인 분리).
// 각 경로를 4개 로케일 URL로 발행 + hreflang 상호연결. headers()로 요청 호스트에 따라 분기(동적).
const LEAGUES = ["master", "great", "ultra"];
const RAID_TYPES = Object.keys((RAIDS as unknown as { types: Record<string, unknown> }).types);
const DET = DETAIL as unknown as Record<string, { id: string }[]>;

type CF = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

function build(base: string, paths: [string, CF, number][]): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const langs = (path: string): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const l of locales) out[localeMeta[l].htmlLang] = `${base}${localizePath(l, path)}`;
    out["x-default"] = `${base}${localizePath(defaultLocale, path)}`;
    return out;
  };
  const entry = (path: string, changeFrequency: CF, priority: number): MetadataRoute.Sitemap =>
    locales.map((l) => ({ url: `${base}${localizePath(l, path)}`, lastModified, changeFrequency, priority, alternates: { languages: langs(path) } }));
  return paths.flatMap(([path, cf, pri]) => entry(path, cf, pri));
}

// gblnote.com — 리그별 실측 메타·티어·포켓몬 상세 등.
function gblPaths(): [string, CF, number][] {
  return [
    ["/gbl", "weekly", 1],
    // /gbl/meta 허브는 noindex(리그 페이지로 유도) → 사이트맵 제외(noindex+사이트맵 동시는 GSC 경고)
    ...LEAGUES.map((l) => [`/gbl/meta/${l}`, "daily", 0.9] as [string, CF, number]),
    ...LEAGUES.map((l) => [`/gbl/tier/${l}`, "weekly", 0.8] as [string, CF, number]),
    ...LEAGUES.map((l) => [`/gbl/cmp/${l}`, "weekly", 0.7] as [string, CF, number]),
    ["/gbl/iv", "weekly", 0.8],
    ...Object.entries(IV_ANALYSIS).filter(([, e]) => e.published).map(([id]) => [`/gbl/iv/${id}`, "monthly", 0.7] as [string, CF, number]),
    ["/gbl/sim", "weekly", 0.8],
    ["/gbl/trade", "weekly", 0.7],
    ["/gbl/events", "daily", 0.8],
    // 포켓몬 개별 — 색인 게이트(PvPoke 편집 메타) 통과분만. 나머지는 페이지 유지·noindex(indexGate.ts).
    ...LEAGUES.flatMap((l) => (DET[l] || []).filter((d) => isMetaMon(l, d.id)).map((d) => [`/gbl/pokemon/${l}/${d.id}`, "weekly", 0.6] as [string, CF, number])),
    ["/gbl/raid", "weekly", 0.9],
    ["/gbl/raid/bosses", "daily", 0.8],
    ["/gbl/raid/schedule", "daily", 0.8],
    ...RAID_TYPES.map((t) => [`/gbl/raid/${t}`, "weekly", 0.8] as [string, CF, number]),
    ["/gbl/schedule", "weekly", 0.7],
    ["/gbl/guide", "weekly", 0.7],
    ...Object.keys(GUIDES).map((slug) => [`/gbl/guide/${slug}`, "monthly", 0.6] as [string, CF, number]),
    // /gbl/board 는 noindex(로그인 게이트·UGC) → 사이트맵 제외
    ["/gbl/about", "monthly", 0.4],
    ["/gbl/contact", "yearly", 0.3],
    ["/gbl/privacy", "yearly", 0.3],
    ["/gbl/terms", "yearly", 0.3],
  ];
}

// tcgnote.net — 덱 티어·대표 덱(원본 분석 있는 것만)·정책. 얕은 롱테일(전체 카드/덱)은 미포함.
function tcgPaths(): [string, CF, number][] {
  return [
    ["/tcg", "weekly", 1],
    ["/tcg/briefing", "daily", 0.9],
    ["/tcg/meta", "daily", 0.9],
    ["/tcg/tier", "daily", 0.9],
    ["/tcg/decks", "weekly", 0.8],
    ...analyzedDeckIds().map((id) => [`/tcg/decks/${id}`, "weekly", 0.7] as [string, CF, number]),
    ["/tcg/counters", "weekly", 0.8],
    ["/tcg/matchups", "weekly", 0.8],
    ["/tcg/deck-builder", "weekly", 0.7],
    ["/tcg/pack-sim", "weekly", 0.7],
    ["/tcg/pack-planner", "weekly", 0.8],
    ["/tcg/hand-sim", "weekly", 0.8],
    ["/tcg/guides", "weekly", 0.7],
    ...TCG_GUIDES.map((g) => [`/tcg/guides/${g.slug}`, "monthly", 0.6] as [string, CF, number]),
    // /tcg/cards(카드 DB 유틸)는 린 런치 동안 noindex → 사이트맵 제외. 승인 후 추가 검토.
    ["/tcg/about", "monthly", 0.4],
    ["/tcg/contact", "monthly", 0.4],
    ["/tcg/privacy", "yearly", 0.3],
    ["/tcg/terms", "yearly", 0.3],
  ];
}

export default function sitemap(): MetadataRoute.Sitemap {
  const host = (headers().get("host") || "").toLowerCase();
  if (host.includes("tcgnote")) return build("https://tcgnote.net", tcgPaths());
  return build("https://gblnote.com", gblPaths());
}
