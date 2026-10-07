// 포켓몬 상세 페이지 색인 게이트 — 구글 "가치 낮은 콘텐츠" 대응(URL 다이어트).
// PvPoke 편집 메타(+마스터 점수 보강)에 든 몬만 index. 나머지는 페이지·데이터·IV찾기 전부 그대로 두고
// robots noindex,follow + 사이트맵 제외만 적용(사용자 영향 없음, 구글 검색 노출만 압축).
// 리스트 갱신: node scripts/gbl/build_meta_mons.mjs
import META from "./gbl_meta_mons.json";
import DETAIL from "./gbl_detail.json";
import DETAIL_S28 from "./gbl_detail_s28.json";
import DETAIL_EXT_S28 from "./gbl_detail_ext_s28.json";
import UNRANKED from "./gbl_unranked.json";
import MON_NOTES from "./gbl_mon_notes.json";
import { currentSeason } from "./seasons";

const LEAGUES = (META as { leagues: Record<string, string[]> }).leagues;
const SETS: Record<string, Set<string>> = Object.fromEntries(Object.entries(LEAGUES).map(([l, ids]) => [l, new Set(ids)]));

// 현재 시즌 상세 스냅샷의 리그→id 집합 (그림자 통합 판정 기준). 시즌 스냅샷을 추가하면 여기도 등록.
const SNAP_BY_SLUG: Record<string, unknown> = { s27: DETAIL, s28: DETAIL_S28 };
const CUR = (SNAP_BY_SLUG[currentSeason().slug] || DETAIL_S28) as Record<string, { id: string; tier?: string }[]>;
const CUR_IDS: Record<string, Set<string>> = Object.fromEntries(Object.entries(CUR).map(([l, arr]) => [l, new Set(arr.map((e) => e.id))]));

// 확장 스냅샷 — 리그 201위 이후 전 종(gbl_compile_detail.py가 gbl_detail_ext_<시즌>.json으로 출력). 상세 페이지 "존재" 판정·조회 전용.
// 티어표·CMP·색인 판정·그림자 통합은 계속 상위 200(CUR)만 본다 → 확장 종은 전부 noindex·사이트맵 제외(isMetaMon이 CUR 티어를 요구).
const EXT_BY_SLUG: Record<string, unknown> = { s28: DETAIL_EXT_S28 };
const EXT = (EXT_BY_SLUG[currentSeason().slug] || {}) as Record<string, { id: string }[]>;
const EXT_IDS: Record<string, Set<string>> = Object.fromEntries(Object.entries(EXT).map(([l, arr]) => [l, new Set(arr.map((e) => e.id))]));
export const extDetail = (league: string, id: string): unknown => (EXT[league] || []).find((e) => e.id === id);
export const extRows = (): Record<string, { id: string }[]> => EXT;
// 랭킹 밖(어느 리그 랭킹에도 없는 미진화 등) — 기본 정보 페이지. 리그 무관 데이터라 가장 낮은 리그(great) 경로 한 곳에만 둔다.
export const UNRANKED_LEAGUE = "great";
const UNRANKED_MAP = UNRANKED as unknown as Record<string, unknown>;
export const unrankedDetail = (league: string, id: string): unknown => (league === UNRANKED_LEAGUE ? UNRANKED_MAP[id] : undefined);

// 그림자(_shadow) 페이지 통합 — 그림자는 기본 폼과 노트·해설이 같아 "중복 페이지"로 읽히므로 페이지 자체를 없앰.
// 현재 시즌에 기본 폼이 있으면 → 그림자 URL은 기본 폼으로 301, 내부 링크도 기본 폼으로(과거 시즌 ?s= 은 상세 페이지가 폴백 처리).
// 기본 폼 페이지가 없는 그림자(니로우 그림자 등)는 통합 대상 아님(자기 페이지 유지). 반환: 기본 폼 id 또는 null.
// 사이즈 폼 등 티어·점수·기술이 사실상 같은 폼도 대표 폼으로 통합(제목·설명까지 동일한 중복 페이지 방지). 대표 폼 = 노트가 있는 폼.
const FORM_MERGE: Record<string, string> = { gourgeist_super: "gourgeist_large", gourgeist_average: "gourgeist_large", gourgeist_small: "gourgeist_large" };
export function mergedShadowBase(league: string, id: string): string | null {
  const base = id.endsWith("_shadow") ? id.replace(/_shadow$/, "") : FORM_MERGE[id];
  if (!base) return null;
  return CUR_IDS[league]?.has(base) ? base : null;
}
// 대표 폼 페이지에 요약으로 얹을 통합 변형 id 목록(그림자 + 사이즈 폼), 현재 시즌에 있는 것만.
export function mergedVariantsOf(league: string, id: string): string[] {
  const out = [`${id}_shadow`, ...Object.entries(FORM_MERGE).filter(([, b]) => b === id).map(([v]) => v)];
  return out.filter((v) => CUR_IDS[league]?.has(v));
}
// 링크용 id — 통합된 그림자는 기본 폼으로(내부 301 방지).
// 상위 200 밖의 그림자는 확장 스냅샷에 행이 없음(기본 폼이 있으면 생략) → 기본 폼 페이지로 연결.
export const linkMonId = (league: string, id: string): string => {
  const merged = mergedShadowBase(league, id);
  if (merged) return merged;
  if (id.endsWith("_shadow") && !CUR_IDS[league]?.has(id) && !EXT_IDS[league]?.has(id)) {
    const base = id.replace(/_shadow$/, "");
    if (CUR_IDS[league]?.has(base) || EXT_IDS[league]?.has(base)) return base;
  }
  return id;
};

// 메가 리그(*_mega) 등 리스트에 없는 리그는 false → noindex(사이트맵에도 원래 없음).
// 통합된 그림자는 false(어차피 301). 기본 폼은 자신 또는 (통합된) 그림자가 메타면 true — 그림자 단독 메타(드래피온 등)의 노트가 기본 폼 페이지에서 색인되도록.
export function isMetaMon(league: string, id: string): boolean {
  const set = SETS[league];
  if (!set) return false;
  if (mergedShadowBase(league, id)) return false; // 통합된 그림자·사이즈 폼은 301이므로 색인 대상 아님
  const sh = `${id}_shadow`;
  const inMeta = id.endsWith("_shadow") ? set.has(id) : set.has(id) || (set.has(sh) && mergedShadowBase(league, sh) === id);
  if (!inMeta) return false;
  // 마지막 필터 — "실측 표본 부족 + 운영자 노트 없음 + 메타 비중 낮음(B 이하)"이 겹치는 몬은 노트가 채워질 때까지 noindex.
  // (노트를 쓰면 자동으로 색인 복귀: gbl_mon_notes.json 기준)
  return hasNote(league, id) || ["S", "A"].includes(tierOf(league, id));
}
// 내부 링크 게이트(MonLink.tsx) — 티어표·CMP·카운터·파트너·가이드 그리드·기술 도감이 전부 이 판정 하나를 씀.
//  · 2026-09-15~10-07: 색인 대상(메타)일 때만 링크 — AdSense 심사 봇(AdsBot)이 링크를 타고 얇은 페이지를 표본으로 뽑는 걸 막으려던 조치.
//  · 2026-10-08(승인 후, 사용자 결정): 다시 개방 — 상세 페이지가 "존재하면" 링크. 색인은 그대로(비메타는 noindex·사이트맵 제외, isMetaMon).
//  되돌리려면 LINK_ONLY_INDEXED = true 한 줄.
export const LINK_ONLY_INDEXED = false;
// 상세 페이지 존재 여부 = 현재 시즌 스냅샷(상위 200) 또는 확장 스냅샷(201위 이후)에 링크 목적지가 있는가. 랭킹에 아예 없는 종만 false(링크하면 404).
export const hasDetailPage = (league: string, id: string): boolean => { const t = linkMonId(league, id); return !!(CUR_IDS[league]?.has(t) || EXT_IDS[league]?.has(t) || unrankedDetail(league, t)); };
export const hasDetailLink = (league: string, id: string): boolean =>
  LINK_ONLY_INDEXED ? isMetaMon(league, linkMonId(league, id)) : hasDetailPage(league, id);
// 사이트맵용 — 현재 시즌 스냅샷 기준 색인 대상 id 목록(페이지의 robots 판정과 같은 소스·같은 시즌).
export const indexableMonIds = (league: string): string[] => (CUR[league] || []).map((e) => e.id).filter((id) => isMetaMon(league, id));
const NOTES = MON_NOTES as Record<string, Record<string, unknown>>;
const hasNote = (league: string, id: string) => !!NOTES[league]?.[id] || !!NOTES[league]?.[`${id}_shadow`];
const tierOf = (league: string, id: string) => (CUR[league] || []).find((e) => e.id === id)?.tier || "";
