// 포켓몬 상세 페이지 색인 게이트 — 구글 "가치 낮은 콘텐츠" 대응(URL 다이어트).
// PvPoke 편집 메타(+마스터 점수 보강)에 든 몬만 index. 나머지는 페이지·데이터·IV찾기 전부 그대로 두고
// robots noindex,follow + 사이트맵 제외만 적용(사용자 영향 없음, 구글 검색 노출만 압축).
// 리스트 갱신: node scripts/gbl/build_meta_mons.mjs
import META from "./gbl_meta_mons.json";

const LEAGUES = (META as { leagues: Record<string, string[]> }).leagues;
const SETS: Record<string, Set<string>> = Object.fromEntries(Object.entries(LEAGUES).map(([l, ids]) => [l, new Set(ids)]));

// 메가 리그(*_mega) 등 리스트에 없는 리그는 false → noindex(사이트맵에도 원래 없음).
export function isMetaMon(league: string, id: string): boolean {
  return SETS[league]?.has(id) ?? false;
}
