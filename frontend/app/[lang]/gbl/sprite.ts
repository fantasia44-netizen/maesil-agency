// 포켓몬 스프라이트 공통 소스 — 자체 호스팅(/public/gbl/sprites).
// 외부 CDN(cdn.leekduck.com 등) 핫링크는 상대 정책변경·차단·URL변경 시 한꺼번에 깨지고
// 남의 서버 대역폭을 쓰는 문제라, PokeAPI 원본(워터마크 없음)을 우리 서버로 받아 서빙한다.
// 신규 세대 추가 시: scripts로 dex 스프라이트를 /public/gbl/sprites 에 재다운로드.
// (데이터 출처 표기 LeekDuck/ScrapedDuck은 그대로 유지 — 데이터와 이미지는 별개 이슈.)
export function pokeSprite(dex: string | number): string {
  const n = Number(dex);
  return n > 0 ? `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${n}.png` : "";
}

// 이로치(shiny) 스프라이트 — /publichttps://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/shiny/{dex}.png
export function shinySprite(dex: string | number): string {
  const n = Number(dex);
  return n > 0 ? `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/shiny/${n}.png` : "";
}

// ── 폼 스프라이트 매핑 ────────────────────────────────────────────────
// 레이드 데이터엔 폼 필드가 없어 한글 이름으로 식별. 번호는 PvP 번들(검증됨) +
// 표준 PokeAPI 폼 dex. 실존하지 않는 메가(데이터상 가짜)는 매핑 없음 → 기본형 유지.
const MEGA: Record<number, number> = { // 실존 메가만(base dex → 메가 스프라이트 dex)
  3: 10033, 9: 10036, 15: 10090, 18: 10091, 65: 10037, 80: 10071, 94: 10038,
  115: 10039, 127: 10040, 130: 10041, 142: 10042, 181: 10045, 208: 10072,
  212: 10046, 214: 10047, 229: 10048, 248: 10049, 254: 10065, 257: 10050,
  260: 10064, 282: 10051, 302: 10066, 303: 10052, 306: 10053, 308: 10054,
  310: 10055, 319: 10070, 323: 10087, 334: 10067, 354: 10056, 359: 10057,
  362: 10074, 373: 10089, 376: 10076, 380: 10062, 381: 10063, 384: 10079,
  428: 10088, 445: 10058, 448: 10059, 460: 10060, 475: 10068, 531: 10069, 719: 10075,
};
const MEGA_XY: Record<number, [number, number]> = { 6: [10034, 10035], 150: [10043, 10044] };
const PRIMAL: Record<number, number> = { 382: 10077, 383: 10078 };
const THERIAN: Record<number, number> = { 641: 10019, 642: 10020, 645: 10021, 905: 10249 };
const ORIGIN: Record<number, number> = { 487: 10007, 483: 10245, 484: 10246 };
const REGIONAL: Record<number, number> = { // 알로라/가라르/히스이 (base dex → 지역폼 dex)
  28: 10102, 38: 10104, 76: 10101, 89: 10112, 103: 10114, 105: 10115,   // 알로라
  110: 10167, 144: 10169, 145: 10170, 146: 10171, 222: 10173, 555: 10230, 618: 10180, // 가라르
  157: 10233, 713: 10243,                                                // 히스이
};
const SPECIAL: Array<[number, RegExp, number]> = [ // [baseDex, 이름키워드, 폼 dex]
  [888, /검왕|검의왕/, 10188], [889, /방패왕|방패의왕/, 10189],
  [646, /블랙/, 10022], [646, /화이트/, 10023],
  [800, /새벽|새날/, 10156], [800, /황혼|황갈|갈기/, 10155],
  [718, /10%|10퍼|텐퍼/, 10118], [718, /퍼펙트|컴플|complete/i, 10120],  // 지가르데 10%/퍼펙트(50%=기본)
];

// 특수 폼 → 올바른 스프라이트 dex (한글 이름 기반, 실존 폼만; 없으면 기본 dex 유지)
export function formDex(name: string, dex: string | number): number {
  const d = Number(dex);
  const n = (name || "").replace(/[\s()]/g, "");
  for (const [bd, re, fd] of SPECIAL) if (d === bd && re.test(n)) return fd;
  if (n.includes("메가")) {
    if (/X$|X\b/.test((name || "").trim()) && MEGA_XY[d]) return MEGA_XY[d][0];
    if (/Y$|Y\b/.test((name || "").trim()) && MEGA_XY[d]) return MEGA_XY[d][1];
    if (MEGA[d]) return MEGA[d];   // 실존 메가만; 가짜 메가는 기본형
  }
  if (n.includes("원시") && PRIMAL[d]) return PRIMAL[d];
  if (n.includes("영물") && THERIAN[d]) return THERIAN[d];
  if (n.includes("오리진") && ORIGIN[d]) return ORIGIN[d];
  if (/알로라|가라르|히스이|팔데아/.test(n) && REGIONAL[d]) return REGIONAL[d];
  return d;
}

// 이름까지 반영한 스프라이트 경로(폼 자동 보정)
export function monSprite(name: string, dex: string | number): string {
  return pokeSprite(formDex(name, dex));
}
