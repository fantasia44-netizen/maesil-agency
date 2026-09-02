// 발행된 타협개체 분석 speciesId 목록(경량) — 상세/랜딩에서 링크 노출용.
// registry.ts는 20종 데이터(6.3MB)를 import하므로, 존재 확인만 필요한 곳은 이 목록만 쓴다.
// registry의 published:true와 동기(시즌 상위 20). 몬 추가/제외 시 여기도 갱신.
export const PUBLISHED_ANALYSIS: ReadonlySet<string> = new Set([
  "groudon", "lunala", "reshiram", "zacian_crowned_sword", "xerneas", "kyurem_white",
  "palkia_origin", "kyogre", "zekrom", "zygarde_complete", "ho_oh", "eternatus",
  "dialga_origin", "rhyperior_shadow", "yveltal", "keldeo_resolute", "rhyperior",
  "metagross", "gholdengo", "garchomp",
]);
