// 18타입 상성표(방어자 기준) — 포켓몬 게임 사실 데이터. 각 몬의 "장점"을 계산해 폴백 산문에 사용.
// GO 배율: 효과굉장 1.6 / 반감 0.625 / 무효(원작0배) 0.390625. 복합타입은 곱연산.
const DEF_WEAK: Record<string, string[]> = {
  normal: ["fighting"], fire: ["water", "ground", "rock"], water: ["electric", "grass"],
  electric: ["ground"], grass: ["fire", "ice", "poison", "flying", "bug"], ice: ["fire", "fighting", "rock", "steel"],
  fighting: ["flying", "psychic", "fairy"], poison: ["ground", "psychic"], ground: ["water", "grass", "ice"],
  flying: ["electric", "ice", "rock"], psychic: ["bug", "ghost", "dark"], bug: ["fire", "flying", "rock"],
  rock: ["water", "grass", "fighting", "ground", "steel"], ghost: ["ghost", "dark"], dragon: ["ice", "dragon", "fairy"],
  dark: ["fighting", "bug", "fairy"], steel: ["fire", "fighting", "ground"], fairy: ["poison", "steel"],
};
const DEF_RESIST: Record<string, string[]> = {
  normal: [], fire: ["fire", "grass", "ice", "bug", "steel", "fairy"], water: ["fire", "water", "ice", "steel"],
  electric: ["electric", "flying", "steel"], grass: ["water", "electric", "grass", "ground"], ice: ["ice"],
  fighting: ["bug", "rock", "dark"], poison: ["grass", "fighting", "poison", "bug", "fairy"], ground: ["poison", "rock"],
  flying: ["grass", "fighting", "bug"], psychic: ["fighting", "psychic"], bug: ["grass", "fighting", "ground"],
  rock: ["normal", "fire", "poison", "flying"], ghost: ["poison", "bug"], dragon: ["fire", "water", "electric", "grass"],
  dark: ["ghost", "dark"], steel: ["normal", "grass", "ice", "flying", "psychic", "bug", "rock", "dragon", "steel", "fairy"], fairy: ["fighting", "bug", "dark"],
};
const DEF_IMMUNE: Record<string, string[]> = {
  normal: ["ghost"], ground: ["electric"], flying: ["ground"], ghost: ["normal", "fighting"],
  dark: ["psychic"], steel: ["poison"], fairy: ["dragon"],
};
export const ALL_TYPES = Object.keys(DEF_WEAK);

const mono = (atk: string, def: string): number =>
  DEF_IMMUNE[def]?.includes(atk) ? 0.390625 : DEF_WEAK[def]?.includes(atk) ? 1.6 : DEF_RESIST[def]?.includes(atk) ? 0.625 : 1;

// 단일 타입 상성 배율(공격 타입 → 방어 타입). 매트릭스 표용.
export const typeMult = (atk: string, def: string): number => mono(atk, def);

const mult = (atk: string, types: string[]): number => types.reduce((m, d) => m * mono(atk, d), 1);

// 방어 프로필 — 이 몬이 반감/이중반감(무효)하는 공격 타입, 약점 타입.
export function defensiveProfile(types: string[]): { resist: string[]; strongResist: string[]; weak: string[]; doubleWeak: string[] } {
  const resist: string[] = [], strongResist: string[] = [], weak: string[] = [], doubleWeak: string[] = [];
  if (!types.length) return { resist, strongResist, weak, doubleWeak };
  for (const atk of ALL_TYPES) {
    const m = mult(atk, types);
    if (m <= 0.4) strongResist.push(atk);
    else if (m < 1) resist.push(atk);
    else if (m >= 2.5) doubleWeak.push(atk);
    else if (m > 1) weak.push(atk);
  }
  return { resist, strongResist, weak, doubleWeak };
}

// 자속(STAB) 공격 커버리지 — 이 몬의 타입 기술이 효과굉장으로 찌르는 상대 타입(대표 몇 개).
export function stabCoverage(types: string[]): string[] {
  const hit = new Set<string>();
  for (const atk of types) for (const def of ALL_TYPES) if (DEF_WEAK[def]?.includes(atk)) hit.add(def);
  return [...hit];
}
