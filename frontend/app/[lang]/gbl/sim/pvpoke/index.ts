// @ts-nocheck
// PvPoke 엔진 헤드리스 래퍼 — 깔끔한 API. 엔진은 pvpEngine.js(MIT, © 2019 pvpoke).
// 검증: pvpoke.com과 수치 완전일치(레이팅·타임라인·지속시간). 상세 memory: gbl-pvpoke-engine-integration.
import { Pokemon, Battle, GameMaster, __flushGm } from "./pvpEngine.js";
import META_GREAT from "./meta_great.json";
import META_ULTRA from "./meta_ultra.json";
import META_MASTER from "./meta_master.json";

let _gm: any = null;
export function gm() {
  if (!_gm) { _gm = GameMaster.getInstance(); __flushGm(); }
  return _gm;
}

export type League = "great" | "ultra" | "master";
export const CP: Record<League, number> = { great: 1500, ultra: 2500, master: 10000 };
const METAS: Record<League, MetaEntry[]> = { great: META_GREAT as any, ultra: META_ULTRA as any, master: META_MASTER as any };

export type IVs = [number, number, number]; // atk, def, hp
export type MetaEntry = { s: string; m: string[]; sc: number };

export type Cfg = {
  speciesId: string;
  shadow?: boolean;
  fast?: string;
  charged?: (string | null)[];
  ivs?: IVs;         // 지정 시 커스텀
  level?: number;    // 지정 시 커스텀(0.5 단위)
  bestBuddy?: boolean;
  shields: number;
};

// ---------- 데이터 접근 ----------

export type PokeInfo = {
  speciesId: string; speciesName: string; dex: number;
  types: string[]; fastMoves: string[]; chargedMoves: string[];
  tags: string[]; hasShadow: boolean;
};

let _list: PokeInfo[] | null = null;
export function pokemonList(): PokeInfo[] {
  if (_list) return _list;
  const g = gm();
  const shadowIds = new Set(g.data.pokemon.filter((p: any) => p.speciesId.endsWith("_shadow")).map((p: any) => p.speciesId.replace("_shadow", "")));
  _list = g.data.pokemon
    .filter((p: any) => !p.speciesId.endsWith("_shadow") && !(p.tags && p.tags.indexOf("duplicate") > -1))
    .map((p: any) => ({
      speciesId: p.speciesId, speciesName: p.speciesName, dex: p.dex,
      types: (p.types || []).filter((t: string) => t && t !== "none"),
      fastMoves: p.fastMoves || [], chargedMoves: p.chargedMoves || [],
      tags: p.tags || [], hasShadow: shadowIds.has(p.speciesId) || (g.data.shadowPokemon || []).indexOf(p.speciesId) > -1,
    }));
  return _list;
}

export function pokemonById(speciesId: string): any {
  return gm().getPokemonById(speciesId);
}

export type MoveInfo = { moveId: string; name: string; type: string; power: number; energy: number; energyGain: number; cooldown: number; buffs?: any };
export function moveInfo(moveId: string): MoveInfo | null {
  if (!moveId || moveId === "none") return null;
  const m = gm().getMoveById(moveId);
  if (!m) return null;
  return { moveId: m.moveId, name: m.name, type: m.type, power: m.power, energy: m.energy, energyGain: m.energyGain, cooldown: m.cooldown, buffs: m.buffs };
}

// 리그별 메타(상위 100). moveset 포함.
export function metaList(league: League): MetaEntry[] { return METAS[league] || []; }

// 종+리그의 기본 IV/레벨(커스텀 IV 패널 시드용) — 마스터=15/15/15, 그外=defaultIVs(랭크1)
export function defaultsFor(speciesId: string, league: League): { ivs: IVs; level: number } {
  const cap = CP[league];
  if (league === "master") return { ivs: [15, 15, 15], level: 50 };
  const p = pokemonById(speciesId) || pokemonById(speciesId.replace("_shadow", ""));
  const dv = p && p.defaultIVs && p.defaultIVs["cp" + cap];
  if (dv) return { ivs: [dv[1], dv[2], dv[3]], level: dv[0] };
  return { ivs: [15, 15, 15], level: 40 };
}

// 종의 추천 무브셋(메타에 있으면 그걸, 없으면 pokedex 첫 무브들)
export function recommendedMoveset(speciesId: string, league: League): { fast: string; charged: string[] } {
  const meta = METAS[league].find((e) => e.s === speciesId || e.s === speciesId.replace("_shadow", ""));
  if (meta && meta.m && meta.m.length) {
    return { fast: meta.m[0], charged: meta.m.slice(1) };
  }
  const p = pokemonById(speciesId) || pokemonById(speciesId.replace("_shadow", ""));
  if (p) return { fast: (p.fastMoves || [])[0], charged: (p.chargedMoves || []).slice(0, 2) };
  return { fast: "", charged: [] };
}

// ---------- 배틀 셋업 ----------

function resolveId(speciesId: string, shadow?: boolean): string {
  if (shadow && !speciesId.endsWith("_shadow")) {
    const sid = speciesId + "_shadow";
    if (gm().getPokemonById(sid)) return sid;
  }
  return speciesId;
}

// 커스텀 IV에서 CP캡 이하 최고 레벨 찾기
function maxLevelForCap(p: any, cap: number): number {
  const capLevel = p.levelCap || 50;
  let best = 1;
  for (let lv = 1; lv <= capLevel; lv += 0.5) {
    p.setLevel(lv, false);
    if (p.calculateCP() <= cap) best = lv; else break;
  }
  p.setLevel(best, false);
  return best;
}

function makePoke(c: Cfg, i: number, battle: any): any {
  const id = resolveId(c.speciesId, c.shadow);
  const p = new Pokemon(id, i, battle);
  const cap = battle.getCP();
  const custom = !!(c.ivs || typeof c.level === "number");

  if (!custom) {
    // PvPoke 기본(랭크1 IV/레벨) — pvpoke.com 기본값과 일치
    p.initialize(cap);
    if (c.bestBuddy && p.level < (p.levelCap || 50) + 1) {
      p.setLevel(Math.min((p.levelCap || 50) + 1, p.level + 1), false);
    }
  } else {
    p.isCustom = true;
    if (c.ivs) p.ivs = { atk: c.ivs[0], def: c.ivs[1], hp: c.ivs[2] };
    else { const dv = (pokemonById(id) || {}).defaultIVs; const combo = dv && dv["cp" + cap]; if (combo) p.ivs = { atk: combo[1], def: combo[2], hp: combo[3] }; }
    if (c.bestBuddy) p.levelCap = (p.levelCap || 50) + 1;
    if (typeof c.level === "number") p.setLevel(c.level, false);
    else maxLevelForCap(p, cap); // 커스텀 IV + 오토레벨
    p.initialize(cap); // isCustom=true라 IV/레벨 유지, 스탯 재계산
  }

  // 무브
  const rec = recommendedMoveset(id, leagueOf(cap));
  const fast = c.fast || rec.fast;
  if (fast) p.selectMove("fast", fast);
  // 차지무브: 사용자가 하나라도 지정하면 그 배열(빈 슬롯=단일무브 존중), 아니면 추천.
  // ※ initialize()가 기본 차지무브 2개를 넣으므로, 빈 슬롯은 "none"으로 비워 잔류 방지(노스킬 반영).
  const chargedInput = (c.charged && c.charged.some(Boolean)) ? c.charged : rec.charged;
  const chargedWanted = (chargedInput || []).filter((m) => m && m !== "none");
  p.selectMove("charged", "none", 1); // 2번 슬롯 먼저 비움
  if (chargedWanted[0]) p.selectMove("charged", chargedWanted[0], 0);
  else p.selectMove("charged", "none", 0);
  if (chargedWanted[1]) p.selectMove("charged", chargedWanted[1], 1);

  p.setShields(typeof c.shields === "number" ? c.shields : 1);
  return p;
}

function leagueOf(cap: number): League { return cap <= 1500 ? "great" : cap <= 2500 ? "ultra" : "master"; }

function pokeSummary(p: any) {
  return {
    speciesId: p.speciesId, name: p.speciesName, dex: p.dex,
    types: (p.types || []).filter((t: string) => t && t !== "none"),
    shadow: p.shadowType === "shadow",
    hp: p.hp, startHp: p.startHp, shields: p.shields, startShields: p.startingShields,
    energy: p.energy, cp: p.cp, level: p.level,
    ivs: [p.ivs.atk, p.ivs.def, p.ivs.hp] as IVs,
    stats: { atk: Math.round(p.stats.atk * 10) / 10, def: Math.round(p.stats.def * 10) / 10, hp: p.stats.hp },
    fast: p.fastMove ? { moveId: p.fastMove.moveId, name: p.fastMove.name, type: p.fastMove.type } : null,
    charged: (p.activeChargedMoves || []).map((m: any) => ({ moveId: m.moveId, name: m.name, type: m.type, energy: m.energy })),
    rating: p.getBattleRating ? p.getBattleRating() : null,
  };
}

// 타임라인 → 깔끔한 이벤트 + HP곡선 재구성
function processTimeline(rawTimeline: any[], startA: number, startB: number) {
  const events = rawTimeline.map((e: any) => ({
    actor: e.actor, type: e.type, name: e.name, time: e.time, turn: e.turn,
    damage: (e.values && e.values[0]) || 0, energy: (e.values && e.values[1]) || 0,
  }));
  // HP 재구성: 실제 데미지 이벤트(fast/charged {타입})만 차감.
  // "tap interaction"(값 2)·"Swipe"(값 i) 등은 데미지 아님 → 제외. 실드 막힌 차지는 엔진이 damage=1로 기록.
  let hpA = startA, hpB = startB;
  const hpCurve = { a: [{ time: 0, hp: startA }], b: [{ time: 0, hp: startB }] };
  for (const e of events) {
    const isMove = /^(fast|charged) /.test(String(e.type || ""));
    if (isMove && e.damage > 0) {
      if (e.actor === 0) { hpB = Math.max(0, hpB - e.damage); hpCurve.b.push({ time: e.time, hp: hpB }); }
      else { hpA = Math.max(0, hpA - e.damage); hpCurve.a.push({ time: e.time, hp: hpA }); }
    }
  }
  return { events, hpCurve };
}

// ---------- 공개 배틀 함수 ----------

export type BattleResult = ReturnType<typeof runBattle>;

export function runBattle(a: Cfg, b: Cfg, league: League) {
  gm();
  const cap = CP[league];
  const battle: any = new Battle();
  battle.setCP(cap);
  const pa = makePoke(a, 0, battle);
  const pb = makePoke(b, 1, battle);
  battle.setNewPokemon(pa, 0, false);
  battle.setNewPokemon(pb, 1, false);
  battle.setDecisionMethod("default");
  battle.setBuffChanceModifier(-1);
  const rawTimeline = battle.simulate();
  const ratings = battle.getBattleRatings();
  const startA = pa.startHp, startB = pb.startHp;
  const { events, hpCurve } = processTimeline(rawTimeline, startA, startB);
  return {
    league, cp: cap,
    a: { ...pokeSummary(pa), bestBuddy: !!a.bestBuddy },
    b: { ...pokeSummary(pb), bestBuddy: !!b.bestBuddy },
    ratings, // [a, b] 0~1000, 500=대등
    winner: ratings[0] > ratings[1] ? "a" : ratings[1] > ratings[0] ? "b" : "tie",
    duration: battle.getDuration(),
    timeline: events, hpCurve,
  };
}

// 1 vs 메타 — 각 상대별 레이팅/승패
export function runMulti(a: Cfg, league: League, shields = 1, limit = 100) {
  gm();
  const cap = CP[league];
  const meta = METAS[league].slice(0, limit);
  const results = meta.map((opp) => {
    try {
      const battle: any = new Battle();
      battle.setCP(cap);
      const pa = makePoke({ ...a, shields }, 0, battle);
      const pb = makePoke({ speciesId: opp.s, fast: opp.m[0], charged: opp.m.slice(1), shields }, 1, battle);
      battle.setNewPokemon(pa, 0, false);
      battle.setNewPokemon(pb, 1, false);
      battle.setDecisionMethod("default");
      battle.setBuffChanceModifier(-1);
      battle.simulate();
      const r = battle.getBattleRatings();
      return { oppId: opp.s, oppName: pb.speciesName, oppTypes: (pb.types || []).filter((t: string) => t && t !== "none"), rating: r[0], oppRating: r[1], win: r[0] > 500, score: opp.sc };
    } catch (e) { return { oppId: opp.s, oppName: opp.s, oppTypes: [], rating: 0, oppRating: 1000, win: false, score: opp.sc, error: String(e).slice(0, 80) }; }
  });
  const wins = results.filter((x) => x.win).length;
  return { league, opponent: a.speciesId, shields, wins, losses: results.length - wins, results };
}

// 메타 매트릭스 (NxN 레이팅) — 지정 종목록 또는 상위 limit 메타
export function runMatrix(league: League, speciesIds?: string[], shields = 1, limit = 20) {
  gm();
  const cap = CP[league];
  const meta = METAS[league];
  const ids = speciesIds && speciesIds.length ? speciesIds : meta.slice(0, limit).map((m) => m.s);
  const cfgs: Cfg[] = ids.map((id) => {
    const m = meta.find((e) => e.s === id);
    return { speciesId: id, fast: m ? m.m[0] : undefined, charged: m ? m.m.slice(1) : undefined, shields };
  });
  const grid: number[][] = [];
  for (let i = 0; i < cfgs.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < cfgs.length; j++) {
      if (i === j) { row.push(500); continue; }
      try {
        const battle: any = new Battle();
        battle.setCP(cap);
        const pa = makePoke(cfgs[i], 0, battle);
        const pb = makePoke(cfgs[j], 1, battle);
        battle.setNewPokemon(pa, 0, false);
        battle.setNewPokemon(pb, 1, false);
        battle.setDecisionMethod("default");
        battle.setBuffChanceModifier(-1);
        battle.simulate();
        row.push(battle.getBattleRatings()[0]);
      } catch (e) { row.push(0); }
    }
    grid.push(row);
  }
  return { league, ids, grid };
}
