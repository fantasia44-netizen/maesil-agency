// 포켓몬 상세 페이지 색인 게이트 — 구글 "가치 낮은 콘텐츠" 대응(URL 다이어트).
// PvPoke 편집 메타(+마스터 점수 보강)에 든 몬만 index. 나머지는 페이지·데이터·IV찾기 전부 그대로 두고
// robots noindex,follow + 사이트맵 제외만 적용(사용자 영향 없음, 구글 검색 노출만 압축).
// 리스트 갱신: node scripts/gbl/build_meta_mons.mjs
import META from "./gbl_meta_mons.json";

const LEAGUES = (META as { leagues: Record<string, string[]> }).leagues;
const SETS: Record<string, Set<string>> = Object.fromEntries(Object.entries(LEAGUES).map(([l, ids]) => [l, new Set(ids)]));

// 메가 리그(*_mega) 등 리스트에 없는 리그는 false → noindex(사이트맵에도 원래 없음).
// 그림자(_shadow)는 기본 폼과 노트·해설이 같아 중복 페이지로 읽히므로, 기본 폼이 같은 리그 메타에 있으면 그림자는 noindex.
// (기본 폼이 메타에 없는 그림자 단독 메타 — 그림자 깜까미·강철톤 등 — 는 중복이 없으니 그대로 색인)
export function isMetaMon(league: string, id: string): boolean {
  const set = SETS[league];
  if (!set?.has(id)) return false;
  return !(id.endsWith("_shadow") && set.has(id.replace(/_shadow$/, "")));
}
