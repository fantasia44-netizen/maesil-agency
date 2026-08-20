// 포켓몬 스프라이트 공통 소스 — 자체 호스팅(/public/gbl/sprites).
// 외부 CDN(cdn.leekduck.com 등) 핫링크는 상대 정책변경·차단·URL변경 시 한꺼번에 깨지고
// 남의 서버 대역폭을 쓰는 문제라, PokeAPI 원본(워터마크 없음)을 우리 서버로 받아 서빙한다.
// 신규 세대 추가 시: scripts로 dex 스프라이트를 /public/gbl/sprites 에 재다운로드.
// (데이터 출처 표기 LeekDuck/ScrapedDuck은 그대로 유지 — 데이터와 이미지는 별개 이슈.)
export function pokeSprite(dex: string | number): string {
  const n = Number(dex);
  return n > 0 ? `/gbl/sprites/${n}.png` : "";
}

// 이로치(shiny) 스프라이트 — /public/gbl/sprites/shiny/{dex}.png
export function shinySprite(dex: string | number): string {
  const n = Number(dex);
  return n > 0 ? `/gbl/sprites/shiny/${n}.png` : "";
}

// 특수 폼(기본 dex와 스프라이트가 다른 종). 레이드 데이터에 폼 필드가 없어 한글 이름으로 식별.
// 매칭 오탐 방지 위해 반드시 (기본 dex + 키워드) 둘 다 확인.
export function formDex(name: string, dex: string | number): number {
  const d = Number(dex);
  const n = (name || "").replace(/[\s()]/g, "");
  if (d === 888 && (n.includes("검왕") || n.includes("검의왕"))) return 10188;   // 자시안 검왕(Crowned Sword)
  if (d === 889 && (n.includes("방패왕") || n.includes("방패의왕"))) return 10189; // 자마젠타 방패왕(Crowned Shield)
  if (d === 646 && n.includes("블랙")) return 10022;                              // 블랙 큐레무
  if (d === 646 && n.includes("화이트")) return 10023;                            // 화이트 큐레무
  if (d === 800 && (n.includes("새벽") || n.includes("새날"))) return 10156;       // 네크로즈마 새벽의 날개(Dawn Wings)
  if (d === 800 && (n.includes("황혼") || n.includes("황갈") || n.includes("갈기"))) return 10155; // 황혼의 갈기(Dusk Mane)
  return d;
}

// 이름까지 반영한 스프라이트 경로(폼 자동 보정)
export function monSprite(name: string, dex: string | number): string {
  return pokeSprite(formDex(name, dex));
}
