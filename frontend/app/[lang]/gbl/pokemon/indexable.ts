// 포켓몬 상세 페이지 색인 정책 — "어떤 상세 페이지를 검색엔진·AdSense 심사에 노출할지".
//
// 배경: 상세 페이지는 리그당 200종 × 3리그 × 4로케일 = 2,400 URL이 사이트맵의 89%를 차지했고,
// 본문은 데이터 파생 문장(같은 조건이면 같은 문장)이라 심사 관점에서 "자동 생성·중복" 신호가 됐다.
// (AdSense '가치가 별로 없는 콘텐츠' 반복 판정의 1순위 원인)
//
// 정책: 리그별 상위 TOP_N(S·A 티어) + 타협개체 심층분석이 있는 종만 색인(index) 허용.
// 나머지는 페이지 자체는 유지(유저·내부링크·시뮬 대체 용도)하되 noindex,follow.
// 사이트맵(app/sitemap.ts)과 상세 페이지 robots 메타가 같은 목록을 쓴다.
import DETAIL from "../gbl_detail.json";
import { PUBLISHED_ANALYSIS } from "../iv/analysis/published";

export const INDEX_LEAGUES = ["master", "great", "ultra"] as const;
// 리그당 색인 허용 상한(점수순 상위 · S/A 티어만). 90 → 사이트맵 상세 360 URL(4로케일).
export const TOP_N = 30;

type Det = { id: string; tier: string; score: number };
const DET = DETAIL as unknown as Record<string, Det[]>;

function pick(league: string): string[] {
  const arr = DET[league] || [];
  // DETAIL은 점수 내림차순 정렬 스냅샷(상세 페이지 '이론 순위'와 동일 기준).
  const top = arr.filter((d) => d.tier === "S" || d.tier === "A").slice(0, TOP_N).map((d) => d.id);
  const deep = arr.filter((d) => PUBLISHED_ANALYSIS.has(d.id)).map((d) => d.id);
  return Array.from(new Set([...top, ...deep]));
}

export const INDEXABLE_POKEMON: Record<string, string[]> = Object.fromEntries(
  INDEX_LEAGUES.map((l) => [l, pick(l)]),
);

const SET: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(INDEXABLE_POKEMON).map(([l, ids]) => [l, new Set(ids)]),
);

// 메가 리그·시즌 쿼리 등 목록 밖 조합은 전부 noindex(canonical은 기본 시즌 URL).
export function isIndexablePokemon(league: string, id: string): boolean {
  return !!SET[league]?.has(id);
}
