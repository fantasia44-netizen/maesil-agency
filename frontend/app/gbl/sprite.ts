// 포켓몬 스프라이트 공통 소스 — 자체 호스팅(/public/gbl/sprites).
// 외부 CDN(cdn.leekduck.com 등) 핫링크는 상대 정책변경·차단·URL변경 시 한꺼번에 깨지고
// 남의 서버 대역폭을 쓰는 문제라, PokeAPI 원본(워터마크 없음)을 우리 서버로 받아 서빙한다.
// 신규 세대 추가 시: scripts로 dex 스프라이트를 /public/gbl/sprites 에 재다운로드.
// (데이터 출처 표기 LeekDuck/ScrapedDuck은 그대로 유지 — 데이터와 이미지는 별개 이슈.)
export function pokeSprite(dex: string | number): string {
  const n = Number(dex);
  return n > 0 ? `/gbl/sprites/${n}.png` : "";
}
