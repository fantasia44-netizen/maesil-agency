// GBL PvP 배틀 시뮬레이터 엔진 — 순수 TS(React 무관). 클라이언트/서버 어디서든 사용 가능.
// 공식: 데미지 = floor(파워 × 공/방 × STAB(1.2) × 타입상성 × 0.5 × 1.3) + 1. 턴=0.5초.
// 데이터: pokedex_stats(종족값) + mon_movepools(기술풀) + pvp_moves(전투수치). PokeMiners GameMaster 기반.
import STATS from "../pokedex_stats.json";
import MOVEPOOLS from "../mon_movepools.json";
import PVPMOVES from "../pvp_moves.json";

type BaseStat = { a: number; d: number; s: number };
type MoveRaw = { t: string; p: number; e: number; turns?: number; buff?: { c?: number; as?: number; ds?: number; ta?: number; td?: number } };
const DS = STATS as unknown as Record<string, BaseStat>;
const MP = MOVEPOOLS as unknown as Record<string, { fast: string[]; charged: string[] }>;
const PM = PVPMOVES as unknown as Record<string, MoveRaw>;

// ── CPM(레벨별 CP 배수) — 표준 PoGo 값(레벨 1~51, 0.5 단위) ──
export const CPM: Record<string, number> = {
  "1": 0.094, "1.5": 0.135137432, "2": 0.16639787, "2.5": 0.192650919, "3": 0.21573247, "3.5": 0.236572661,
  "4": 0.25572005, "4.5": 0.273530381, "5": 0.29024988, "5.5": 0.306057377, "6": 0.3210876, "6.5": 0.335445036,
  "7": 0.34921268, "7.5": 0.362457751, "8": 0.37523559, "8.5": 0.387592406, "9": 0.39956728, "9.5": 0.411193551,
  "10": 0.42250001, "10.5": 0.433059912, "11": 0.44310755, "11.5": 0.453059959, "12": 0.46279839, "12.5": 0.472336083,
  "13": 0.48168495, "13.5": 0.490855897, "14": 0.49985844, "14.5": 0.508701765, "15": 0.51739395, "15.5": 0.525942511,
  "16": 0.53435433, "16.5": 0.542635767, "17": 0.55079269, "17.5": 0.558830576, "18": 0.56675452, "18.5": 0.574569153,
  "19": 0.58227891, "19.5": 0.589887917, "20": 0.59740001, "20.5": 0.604818814, "21": 0.61215729, "21.5": 0.619399365,
  "22": 0.62656713, "22.5": 0.633644533, "23": 0.64065295, "23.5": 0.647576426, "24": 0.65443563, "24.5": 0.661214806,
  "25": 0.667934, "25.5": 0.674577537, "26": 0.68116492, "26.5": 0.687680648, "27": 0.69414365, "27.5": 0.700538673,
  "28": 0.70688421, "28.5": 0.713164996, "29": 0.71939909, "29.5": 0.725571552, "30": 0.7317, "30.5": 0.734741009,
  "31": 0.73776948, "31.5": 0.740785574, "32": 0.74378943, "32.5": 0.746781211, "33": 0.74976104, "33.5": 0.752729087,
  "34": 0.75568551, "34.5": 0.758630378, "35": 0.76156384, "35.5": 0.764486065, "36": 0.76739717, "36.5": 0.770297266,
  "37": 0.7731865, "37.5": 0.776064962, "38": 0.77893275, "38.5": 0.781790055, "39": 0.78463697, "39.5": 0.787473578,
  "40": 0.79030001, "40.5": 0.792803968, "41": 0.79530001, "41.5": 0.797800015, "42": 0.8003, "42.5": 0.802799995,
  "43": 0.8053, "43.5": 0.807799995, "44": 0.8103, "44.5": 0.812799985, "45": 0.8153, "45.5": 0.817799985,
  "46": 0.8203, "46.5": 0.822799985, "47": 0.8253, "47.5": 0.827799955, "48": 0.8303, "48.5": 0.832799955,
  "49": 0.8353, "49.5": 0.837799955, "50": 0.8403, "50.5": 0.842799965, "51": 0.8453,
};

// ── 타입 상성(공격 타입 → 효과) — PoGo: 효과굿 1.6 / 별로 0.625 / 무효(2중저항) 0.390625 ──
const SE = 1.6, NVE = 0.625, IMM = 0.390625;
const CHART: Record<string, { se: string[]; nve: string[]; imm?: string[] }> = {
  normal: { se: [], nve: ["rock", "steel"], imm: ["ghost"] },
  fire: { se: ["grass", "ice", "bug", "steel"], nve: ["fire", "water", "rock", "dragon"] },
  water: { se: ["fire", "ground", "rock"], nve: ["water", "grass", "dragon"] },
  electric: { se: ["water", "flying"], nve: ["electric", "grass", "dragon"], imm: ["ground"] },
  grass: { se: ["water", "ground", "rock"], nve: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"] },
  ice: { se: ["grass", "ground", "flying", "dragon"], nve: ["fire", "water", "ice", "steel"] },
  fighting: { se: ["normal", "ice", "rock", "dark", "steel"], nve: ["poison", "flying", "psychic", "bug", "fairy"], imm: ["ghost"] },
  poison: { se: ["grass", "fairy"], nve: ["poison", "ground", "rock", "ghost"], imm: ["steel"] },
  ground: { se: ["fire", "electric", "poison", "rock", "steel"], nve: ["grass", "bug"], imm: ["flying"] },
  flying: { se: ["grass", "fighting", "bug"], nve: ["electric", "rock", "steel"] },
  psychic: { se: ["fighting", "poison"], nve: ["psychic", "steel"], imm: ["dark"] },
  bug: { se: ["grass", "psychic", "dark"], nve: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"] },
  rock: { se: ["fire", "ice", "flying", "bug"], nve: ["fighting", "ground", "steel"] },
  ghost: { se: ["psychic", "ghost"], nve: ["dark"], imm: ["normal"] },
  dragon: { se: ["dragon"], nve: ["steel"], imm: ["fairy"] },
  dark: { se: ["psychic", "ghost"], nve: ["fighting", "dark", "fairy"] },
  steel: { se: ["ice", "rock", "fairy"], nve: ["fire", "water", "electric", "steel"] },
  fairy: { se: ["fighting", "dragon", "dark"], nve: ["fire", "poison", "steel"] },
};

export function typeEff(atk: string, defTypes: string[]): number {
  const c = CHART[atk]; if (!c) return 1;
  let m = 1;
  for (const d of defTypes) {
    if (c.imm?.includes(d)) m *= IMM;
    else if (c.se.includes(d)) m *= SE;
    else if (c.nve.includes(d)) m *= NVE;
  }
  return m;
}

// 버프 스테이지 배수(-4~+4): s≥0 → (4+s)/4, s<0 → 4/(4-s)
export function buffMult(stage: number): number {
  const s = Math.max(-4, Math.min(4, stage));
  return s >= 0 ? (4 + s) / 4 : 4 / (4 - s);
}

export const moveOf = (id: string): MoveRaw | undefined => PM[id] || PM[id + "_FAST"];

// 그림자: 공격 ×1.2, 방어 ×0.833(5/6). 베스트버디: +1레벨.
export const SHADOW_ATK = 1.2, SHADOW_DEF = 0.8333333;
export const LEAGUES: Record<string, number> = { great: 1500, ultra: 2500, master: 9000000 };

export type PokeInput = {
  dex: number;
  types: string[];        // 소문자 타입 배열(예 ["grass","poison"])
  fast: string;           // 무브ID
  charged: string[];      // 무브ID 1~2개
  ivs: [number, number, number]; // atk,def,sta
  level: number;
  shadow?: boolean;
  bestBuddy?: boolean;    // +1 레벨
};

export type BuiltPoke = {
  dex: number; types: string[];
  atk: number; def: number; hp: number; cp: number;
  fast: MoveRaw & { id: string; turns: number };
  charged: (MoveRaw & { id: string })[];
};

export function statsOf(dex: number, ivs: [number, number, number], level: number) {
  const b = DS[String(dex)]; if (!b) return null;
  const cpm = CPM[String(level)] ?? CPM["50"];
  const atk = (b.a + ivs[0]) * cpm;
  const def = (b.d + ivs[1]) * cpm;
  const hp = Math.floor((b.s + ivs[2]) * cpm);
  const cp = Math.max(10, Math.floor((b.a + ivs[0]) * Math.sqrt(b.d + ivs[1]) * Math.sqrt(b.s + ivs[2]) * cpm * cpm / 10));
  return { atk, def, hp, cp };
}

// 리그 CP캡 이하 최대 레벨 찾기(0.5 단위). bestBuddy면 51까지.
export function maxLevelForCap(dex: number, ivs: [number, number, number], cap: number, bestBuddy = false): number {
  const top = bestBuddy ? 51 : 50;
  let best = 1;
  for (let L = 1; L <= top; L += 0.5) { const s = statsOf(dex, ivs, L); if (s && s.cp <= cap) best = L; else break; }
  return best;
}

export function build(p: PokeInput): BuiltPoke | null {
  const level = p.level + (p.bestBuddy ? 1 : 0);
  const s = statsOf(p.dex, p.ivs, level); if (!s) return null;
  const atk = s.atk * (p.shadow ? SHADOW_ATK : 1);   // 그림자: 전투 공격 ×1.2
  const def = s.def * (p.shadow ? SHADOW_DEF : 1);   // 그림자: 전투 방어 ×0.833 (CP엔 미반영)
  const f = moveOf(p.fast); if (!f) return null;
  const charged = p.charged.map((id) => { const m = moveOf(id); return m ? { ...m, id } : null; }).filter(Boolean) as (MoveRaw & { id: string })[];
  return { dex: p.dex, types: p.types, atk, def, hp: s.hp, cp: s.cp,
    fast: { ...f, id: p.fast, turns: f.turns || 1 }, charged };
}

// 데미지: floor(파워 × (공×버프)/(방×버프) × STAB × 타입상성 × 0.5 × 1.3) + 1
function damage(power: number, atk: number, def: number, stab: boolean, eff: number): number {
  return Math.floor(power * (atk / def) * (stab ? 1.2 : 1) * eff * 0.5 * 1.3) + 1;
}

export type TLEvent = { turn: number; side: "a" | "b"; move: string; dmg: number; shielded: boolean; hpA: number; hpB: number };
export type SideResult = { hp: number; hp0: number; dealt: number; energy: number; fastCount: number; chargedUsed: number; shieldsUsed: number };
export type SimResult = {
  winner: "a" | "b" | "tie";
  a: SideResult;
  b: SideResult;
  turns: number;
  timeline: TLEvent[];
  log: string[];
};

// 1v1 시뮬레이션 — 실드 수 지정. 전략: 패스트로 에너지 모아 차지 가능시 즉시 발사(가장 강한 차지 우선).
export function simulate(A: BuiltPoke, B: BuiltPoke, shieldsA = 1, shieldsB = 1, keepLog = false): SimResult {
  const state = (P: BuiltPoke, shields: number) => ({
    p: P, hp: P.hp, hp0: P.hp, energy: 0, shields,
    atkStage: 0, defStage: 0,
    cd: 0,                       // 패스트무브 남은 턴
    dealt: 0, fast: 0, throws: 0, shieldsUsed: 0,
  });
  const a = state(A, shieldsA), b = state(B, shieldsB);
  const timeline: TLEvent[] = [];
  const log: string[] = [];
  const MAX_TURNS = 500; // 250초
  let turn = 0;

  const eStat = (s: typeof a, which: "atk" | "def") =>
    (which === "atk" ? s.p.atk * buffMult(s.atkStage) : s.p.def * buffMult(s.defStage));

  const bestCharged = (s: typeof a) => {
    // 발사 가능한(에너지 충분) 차지 중 예상 데미지 최대
    let best: (MoveRaw & { id: string }) | null = null, bd = -1;
    for (const c of s.p.charged) {
      if (s.energy < Math.abs(c.e)) continue;
      const opp = s === a ? b : a;
      const dmg = damage(c.p, eStat(s, "atk"), eStat(opp, "def"), s.p.types.includes(c.t), typeEff(c.t, opp.p.types));
      if (dmg > bd) { bd = dmg; best = c; }
    }
    return best;
  };

  const applyBuff = (s: typeof a, o: typeof b, m: MoveRaw) => {
    const bf = m.buff; if (!bf || (bf.c ?? 0) <= 0) return;
    if (bf.as) s.atkStage = Math.max(-4, Math.min(4, s.atkStage + bf.as));
    if (bf.ds) s.defStage = Math.max(-4, Math.min(4, s.defStage + bf.ds));
    if (bf.ta) o.atkStage = Math.max(-4, Math.min(4, o.atkStage + bf.ta));
    if (bf.td) o.defStage = Math.max(-4, Math.min(4, o.defStage + bf.td));
  };

  const throwCharged = (s: typeof a, o: typeof b, c: MoveRaw & { id: string }) => {
    s.energy -= Math.abs(c.e); s.throws++;
    const shielded = o.shields > 0;
    let dmg = 0;
    if (shielded) { o.shields--; o.shieldsUsed++; }
    else { dmg = damage(c.p, eStat(s, "atk"), eStat(o, "def"), s.p.types.includes(c.t), typeEff(c.t, o.p.types)); o.hp -= dmg; s.dealt += dmg; }
    timeline.push({ turn, side: s === a ? "a" : "b", move: c.id, dmg, shielded, hpA: Math.max(0, a.hp), hpB: Math.max(0, b.hp) });
    applyBuff(s, o, c);
  };

  const doFast = (s: typeof a, o: typeof b) => {
    const dmg = damage(s.p.fast.p, eStat(s, "atk"), eStat(o, "def"), s.p.types.includes(s.p.fast.t), typeEff(s.p.fast.t, o.p.types));
    o.hp -= dmg; s.dealt += dmg; s.energy = Math.min(100, s.energy + s.p.fast.e); s.fast++;
  };

  while (turn < MAX_TURNS && a.hp > 0 && b.hp > 0) {
    turn++;
    // 차지 발사 결정(둘 다) — CMP: 공격 스탯 높은 쪽 먼저
    const ca = bestCharged(a), cb = bestCharged(b);
    if (ca || cb) {
      const order = (ca && cb) ? (eStat(a, "atk") >= eStat(b, "atk") ? [a, b] : [b, a]) : (ca ? [a] : [b]);
      for (const s of order) {
        if (s.hp <= 0) continue;
        const o = s === a ? b : a;
        const c = bestCharged(s); if (!c) continue;
        throwCharged(s, o, c);
      }
      if (a.hp <= 0 || b.hp <= 0) break;
    }
    // 패스트무브 진행(쿨다운) — 동시 진행
    for (const [s, o] of [[a, b], [b, a]] as const) {
      if (s.cd <= 0) { doFast(s, o); s.cd = s.p.fast.turns; }
      s.cd--;
    }
  }

  const winner: "a" | "b" | "tie" = a.hp > 0 && b.hp <= 0 ? "a" : b.hp > 0 && a.hp <= 0 ? "b"
    : a.hp === b.hp ? "tie" : a.hp > b.hp ? "a" : "b";
  const side = (s: typeof a): SideResult => ({ hp: Math.max(0, s.hp), hp0: s.hp0, dealt: s.dealt, energy: s.energy, fastCount: s.fast, chargedUsed: s.throws, shieldsUsed: s.shieldsUsed });
  return { winner, turns: turn, a: side(a), b: side(b), timeline, log };
}
