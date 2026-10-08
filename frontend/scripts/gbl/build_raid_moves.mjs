// 레이드 기술 도감 데이터 생성 → app/[lang]/gbl/gbl_raid_moves.json
// 배틀(PvP) 기술 도감(gbl_moves.json)과 "같은 기술 목록"에 레이드·체육관(PvE) 수치를 붙인다 — 두 수치 체계는 완전히 다름
//   · 배틀: 위력 / 에너지 / 턴(0.5초 단위)        ← PvPoke 게임마스터
//   · 레이드: 위력 / 에너지(100 게이지) / 시전 시간(초) ← PokeMiners 게임마스터 moveSettings (이 스크립트가 받아 옴)
// 산출:
//   ① 기술별 PvE 수치(위력·시전 시간·에너지·데미지 발생 구간)
//   ② 기술별 "이 기술을 가장 세게 쓰는 포켓몬" 상위 30 — 딜러 티어표(scripts/gbl_compile_raids.py)와 같은 공식·같은 가정
//        공격 = (종족공격+15) × CPM(L40) × 그림자 1.2 / 상대 방어 180 고정 / 자속 1.2
//        역할 타입 = 스페셜 기술 타입(그 타입이 약점인 보스 가정 ×1.6, 노멀 기술도 같은 타입이면 ×1.6)
//        DPS = (노멀 n회 + 스페셜 1회 데미지) / 걸린 시간,  n = ceil(스페셜 에너지 / 노멀 획득 에너지)
//   ③ 메가·원시 이름(4개국어) — gbl_moves.json의 species에 없는 것만
// 실행: cd frontend && node scripts/gbl/build_raid_moves.mjs      (build_moves.mjs 다음에. 네트워크 필요)
//   오프라인 재실행: node scripts/gbl/build_raid_moves.mjs <저장해 둔 PokeMiners latest.json 경로>
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const GBL = join(__dir, "../../app/[lang]/gbl");
const J = (f) => JSON.parse(readFileSync(join(GBL, f), "utf8"));
const PVE_GM = "https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json";

const CPM40 = 0.7903001, TARGET_DEF = 180, SHADOW_ATK = 1.2, STAB = 1.2, SUPER = 1.6, TOP = 30;

// ── PvE 수치
const local = process.argv[2];
const pm = local ? JSON.parse(readFileSync(local, "utf8")) : await (await fetch(PVE_GM)).json();
const ptype = (s) => (s || "").replace("POKEMON_TYPE_", "").toLowerCase();
const MV = {};
for (const t of pm) {
  const ms = t.data?.moveSettings; if (!ms) continue;
  const m = /^V(\d+)_MOVE_(.+)$/.exec(t.templateId || "");
  let mid = ms.movementId; if (typeof mid !== "string") mid = m ? m[2] : null;   // 신규 기술은 movementId가 숫자 → templateId에서 이름
  if (!mid) continue;
  MV[mid] = { type: ptype(ms.pokemonType), power: Number(ms.power || 0), dur: Number(ms.durationMs || 0) / 1000, energy: Number(ms.energyDelta || 0),
    ws: Number(ms.damageWindowStartMs || 0) / 1000, we: Number(ms.damageWindowEndMs || 0) / 1000 };
}
// PvPoke ↔ PokeMiners 기술 id 표기 차이(딜러표 컴파일러와 같은 표)
const ALIAS = { FUTURE_SIGHT: "FUTURESIGHT", PYRO_BALL: "PYROBALL", TECHNO_BLAST_DOUSE: "TECHNO_BLAST_WATER" };
// 잠재파워는 PvE에 한 항목(HIDDEN_POWER_FAST)뿐 — 수치는 같고 타입만 개체마다 다르다. PvPoke의 타입별 변형 16개에 같은 수치를 붙인다.
const pve = (id, fast) => {
  if (/^HIDDEN_POWER_/.test(id)) { const h = MV.HIDDEN_POWER_FAST; return h ? { ...h, type: id.replace("HIDDEN_POWER_", "").toLowerCase() } : undefined; }
  const a = ALIAS[id] || id;
  return fast ? (MV[a + "_FAST"] || MV[a]) : MV[a];
};

// ── 대상 기술 = 배틀 기술 도감과 같은 목록(이름·slug·종류를 그대로 공유)
const BM = J("gbl_moves.json");
const gm = J("sim/pvpoke/gamemaster_s28.json");
const FORMS = Object.fromEntries(J("gbl_forms.json").map((f) => [f.id, f]));
const PN = J("pokedex_names.json");

const isMega = (p) => (p.tags || []).some((t) => t === "mega" || t === "supermega") || /_primal$/.test(p.speciesId);
const isShadow = (p) => (p.tags || []).includes("shadow") || p.speciesId.endsWith("_shadow");
// 딜러표와 같은 대상: 출시된 종(그림자·메가 포함). 그림자·메가는 별도 행으로 경쟁한다.
const pool = gm.pokemon.filter((p) => p.released && p.baseStats?.atk && p.dex);

const dmg = (power, atk, stab, eff) => Math.floor(0.5 * power * (atk / TARGET_DEF) * stab * eff) + 1;
// 소수 1자리 반올림 — 딜러표 컴파일러(Python round)와 같은 결과가 나오게 정확히 .x5인 값은 짝수 쪽으로(은행가 반올림).
// 이걸 안 맞추면 같은 조합이 표에선 23.2, 여기선 23.3으로 0.1씩 어긋난다.
const r1 = (x) => { const y = x * 10, f = Math.floor(y); return (Math.abs(y - f - 0.5) < 1e-9 ? (f % 2 === 0 ? f : f + 1) : Math.round(y)) / 10; };

// 포켓몬별 (노멀, 스페셜) 전 조합의 사이클 DPS — 기술마다 "그 기술을 포함한 최고 조합"을 고른다.
const best = {};   // moveId → [{ sid, pair, dps, n, t, fl }]
const total = {};  // moveId → 그 기술을 배우는 대상 수
const bestOf = {}; // speciesId → 그 포켓몬의 최고 조합 { f, c, dps, fl }
for (const p of pool) {
  const sid = p.speciesId, types = new Set((p.types || []).filter((t) => t && t !== "none"));
  const atk = (p.baseStats.atk + 15) * CPM40 * (isShadow(p) ? SHADOW_ATK : 1);
  const elite = new Set([...(p.eliteMoves || []), ...(p.legacyMoves || [])]);
  const fasts = (p.fastMoves || []).map((id) => ({ id, s: pve(id, true) })).filter((x) => x.s && x.s.energy > 0 && x.s.dur > 0);
  const chargeds = (p.chargedMoves || []).map((id) => ({ id, s: pve(id, false) })).filter((x) => x.s && x.s.energy < 0 && x.s.dur > 0);
  const put = (id, row) => { const cur = best[id]?.[sid]; (best[id] = best[id] || {}); if (!cur || row.dps > cur.dps) best[id][sid] = row; };
  for (const c of chargeds) {
    const role = c.s.type, cost = -c.s.energy;
    const cDmg = dmg(c.s.power, atk, types.has(role) ? STAB : 1, SUPER);
    for (const f of fasts) {
      const fDmg = dmg(f.s.power, atk, types.has(f.s.type) ? STAB : 1, f.s.type === role ? SUPER : 1);
      const n = Math.ceil(cost / f.s.energy), t = n * f.s.dur + c.s.dur, dps = (n * fDmg + cDmg) / t;
      const fl = (elite.has(c.id) ? 1 : 0) | (elite.has(f.id) ? 2 : 0);   // 1 = 스페셜이 레거시, 2 = 노멀이 레거시
      // 잠재파워는 타입이 개체마다 무작위라 "원하는 타입을 골라 쓴다"고 가정할 수 없음 → 다른 기술의 짝으로는 쓰지 않는다(딜러표도 제외).
      // 잠재파워 자신의 페이지에서는 그 타입을 가졌을 때의 값으로 계산해 보여 준다.
      if (!/^HIDDEN_POWER_/.test(f.id)) put(c.id, { sid, pair: f.id, dps, n, t, fl });
      put(f.id, { sid, pair: c.id, dps, n, t, fl });
      // 이 포켓몬의 레이드 최고 기술배치(도감 페이지용) — 딜러표와 같은 조건이라 잠재파워 제외. 메가는 도감 페이지가 없어 뺀다.
      if (!/^HIDDEN_POWER_/.test(f.id) && !isMega(p) && (!bestOf[sid] || dps > bestOf[sid].dps)) bestOf[sid] = { f: f.id, c: c.id, dps, fl };
    }
  }
  for (const x of [...fasts, ...chargeds]) total[x.id] = (total[x.id] || 0) + 1;
}

// ── 출력
const moves = {}; const skipped = [];
for (const m of BM.moves) {
  const s = pve(m.id, m.kind === "fast");
  if (!s || !s.dur || (m.kind === "fast" ? s.energy <= 0 : s.energy >= 0)) { skipped.push(m.id); continue; }
  const rows = Object.values(best[m.id] || {}).sort((a, b) => b.dps - a.dps || (a.sid < b.sid ? -1 : 1)).slice(0, TOP);
  moves[m.id] = {
    p: s.power, d: s.dur, e: Math.abs(s.energy), ws: s.ws, we: s.we,
    n: total[m.id] || 0,
    top: rows.map((r) => [r.sid, r.pair, r1(r.dps), r.n, r1(r.t), r.fl]),
  };
}
// 메가·원시 이름 — 상위 목록에 나오는데 gbl_moves.json species에 없는 것만(전용 기술이 없는 메가는 거기 없음)
const names = {};
const used = new Set(Object.values(moves).flatMap((m) => m.top.map((r) => r[0].replace(/_shadow$/, ""))));
for (const sid of used) {
  if (BM.species[sid]) continue;
  const f = FORMS[sid], p = gm.pokemon.find((x) => x.speciesId === sid);
  const zhBase = PN[String(p?.dex)]?.["zh-TW"];
  const xy = /_mega_x$/.test(sid) ? " X" : /_mega_y$/.test(sid) ? " Y" : "";
  if (f) names[sid] = { ko: f.ko, en: f.en, ja: f.ja, "zh-TW": f["zh-TW"] || (zhBase ? (f.primal ? "原始" : "超級") + zhBase + xy : f.en), dex: f.dex };
  else if (p) names[sid] = { ko: PN[String(p.dex)]?.ko || p.speciesName, en: p.speciesName, ja: PN[String(p.dex)]?.ja || p.speciesName, "zh-TW": zhBase || p.speciesName, dex: p.dex };
}

const stamp = pm.find((t) => t.data?.moveSettings) ? new Date().toISOString().slice(0, 10) : "";
// 포켓몬별 최고 기술배치 — [노멀 id, 스페셜 id, 사이클 DPS, 레거시 플래그]. 두 기술 모두 페이지가 있는 것만.
const bestSets = {};
for (const [sid, b] of Object.entries(bestOf)) if (moves[b.f] && moves[b.c]) bestSets[sid] = [b.f, b.c, r1(b.dps), b.fl];
writeFileSync(join(GBL, "gbl_raid_moves.json"), JSON.stringify({ generatedAt: stamp, moves, names, best: bestSets }));
const ids = Object.keys(moves);
console.log(`gbl_raid_moves.json — 기술 ${ids.length} (제외 ${skipped.length}: ${skipped.join(", ")}) · 이름 보충 ${Object.keys(names).length} · 대상 포켓몬 ${pool.length}`);
const noUser = ids.filter((id) => !moves[id].top.length);
if (noUser.length) console.log(`[warn] 쓰는 포켓몬이 없는 기술 ${noUser.length}: ${noUser.slice(0, 12).join(", ")}`);
