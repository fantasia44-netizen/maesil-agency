// 포켓몬 상세 페이지 색인 게이트 — 구글 "가치 낮은 콘텐츠" 대응(URL 다이어트).
// PvPoke 편집 메타(+마스터 점수 보강)에 든 몬만 index. 나머지는 페이지·데이터·IV찾기 전부 그대로 두고
// robots noindex,follow + 사이트맵 제외만 적용(사용자 영향 없음). ※ 10/8부터 색인 범위는 아래 isIndexableMon(상위 200 전부).
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
const CUR = (SNAP_BY_SLUG[currentSeason().slug] || DETAIL_S28) as Record<string, { id: string; tier?: string; dex?: number }[]>;
const CUR_IDS: Record<string, Set<string>> = Object.fromEntries(Object.entries(CUR).map(([l, arr]) => [l, new Set(arr.map((e) => e.id))]));

// 확장 스냅샷 — 리그 201위 이후 전 종(gbl_compile_detail.py가 gbl_detail_ext_<시즌>.json으로 출력). 상세 페이지 "존재" 판정·조회 전용.
// 티어표·CMP·색인 판정·그림자 통합은 계속 상위 200(CUR)만 본다 → 확장 종은 전부 noindex·사이트맵 제외(isMetaMon이 CUR 티어를 요구).
const EXT_BY_SLUG: Record<string, unknown> = { s28: DETAIL_EXT_S28 };
const EXT = (EXT_BY_SLUG[currentSeason().slug] || {}) as Record<string, { id: string; tier?: string; rank?: number; dex?: number }[]>;
const EXT_IDS: Record<string, Set<string>> = Object.fromEntries(Object.entries(EXT).map(([l, arr]) => [l, new Set(arr.map((e) => e.id))]));
export const extDetail = (league: string, id: string): unknown => (EXT[league] || []).find((e) => e.id === id);
export const extRows = (): Record<string, { id: string }[]> => EXT;
// 랭킹 밖(어느 리그 랭킹에도 없는 미진화 등) — 기본 정보 페이지. 리그 무관 데이터라 가장 낮은 리그(great) 경로 한 곳에만 둔다.
export const UNRANKED_LEAGUE = "great";
const UNRANKED_MAP = UNRANKED as unknown as Record<string, unknown>;
export const unrankedDetail = (league: string, id: string): unknown => (league === UNRANKED_LEAGUE ? UNRANKED_MAP[id] : undefined);
// 상세 페이지가 있는 전 종의 (id, dex) — 도감 번호 → 대표 speciesId 매핑용(dexHub.ts).
export function speciesDexPairs(): { id: string; dex: number }[] {
  const seen = new Map<string, number>();
  for (const src of [CUR, EXT]) for (const lg of ["great", "ultra", "master"]) for (const r of src[lg] || []) if (r.dex && !seen.has(r.id)) seen.set(r.id, r.dex);
  for (const [id, u] of Object.entries(UNRANKED_MAP)) { const dex = (u as { dex?: number }).dex; if (dex && !seen.has(id)) seen.set(id, dex); }
  return [...seen].map(([id, dex]) => ({ id, dex }));
}

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

// 리그 안에서의 위치 — 상위 200이면 티어·순위, 201위 이후면 확장 행의 티어·순위. 그 리그에 페이지가 없으면 null.
export function leagueStanding(league: string, id: string): { id: string; tier: string; rank: number; ext: boolean } | null {
  const t = linkMonId(league, id);
  const i = (CUR[league] || []).findIndex((e) => e.id === t);
  if (i >= 0) return { id: t, tier: CUR[league][i].tier || "", rank: i + 1, ext: false };
  const e = (EXT[league] || []).find((x) => x.id === t);
  return e ? { id: t, tier: e.tier || "", rank: e.rank || 0, ext: true } : null;
}

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
// ── 색인 범위 ──────────────────────────────────────────────────────────
// isMetaMon = "메타 포켓몬"(노트 박스·추천 파트너·분석 등 본문 구성 판정)으로 계속 쓰고, 색인 여부는 isIndexableMon이 따로 결정.
//  · 2026-09-12~10-07: 색인 = 메타만(URL 다이어트, 사이트맵 포켓몬 123종).
//  · 2026-10-08(사용자 결정 — AdSense 승인 후 "구글 노출은 무시하고 계속 확장"): 코어 3리그 상위 200 전부 색인·사이트맵 복귀.
//    되돌리려면 INDEX_TOP200 = false 한 줄.
//  · 같은 날 추가 결정("심사 때문에 감춰둘 이유가 없다, 원래 구조 전부 복구"): 확장(201위 이후)도 색인 — INDEX_EXT.
//    랭킹 밖(미진화 등) 기본 정보 페이지와 메가 리그 상세만 noindex 유지.
export const INDEX_TOP200 = true;
export const INDEX_EXT = true;
export function isIndexableMon(league: string, id: string): boolean {
  if (isMetaMon(league, id)) return true;
  if (!INDEX_TOP200 || !SETS[league]) return false;       // 메가 리그 등은 대상 아님
  if (mergedShadowBase(league, id)) return false;          // 통합된 그림자·사이즈 폼은 308
  return !!CUR_IDS[league]?.has(id) || (INDEX_EXT && !!EXT_IDS[league]?.has(id));
}
// 사이트맵용 — 현재 시즌 스냅샷 기준 색인 대상 id 목록(페이지의 robots 판정과 같은 소스·같은 시즌).
export const indexableMonIds = (league: string): string[] => [...(CUR[league] || []), ...(EXT[league] || [])].map((e) => e.id).filter((id) => isIndexableMon(league, id));
const NOTES = MON_NOTES as Record<string, Record<string, unknown>>;
const hasNote = (league: string, id: string) => !!NOTES[league]?.[id] || !!NOTES[league]?.[`${id}_shadow`];
const tierOf = (league: string, id: string) => (CUR[league] || []).find((e) => e.id === id)?.tier || "";
