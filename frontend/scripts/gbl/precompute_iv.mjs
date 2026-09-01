// GBL 개체값 타협 분석 프리컴퓨트 — PvPoke 엔진 헤드리스 실행.
// 마스터 메타(100) 전수 시뮬 + CMP 미러/라이벌 대결 + 베스트버디(L51) + HP 사다리.
// 실행: esbuild 번들 후  node build_iv.cjs <speciesId>
import { runMulti, runBattle, pokemonById } from "../../app/[lang]/gbl/sim/pvpoke/index.ts";
import { writeFileSync } from "node:fs";

const dexOf = (id) => { try { return pokemonById(id)?.dex ?? null; } catch { return null; } };

const LEAGUE = "master";
const META_LIMIT = 100;
const SHIELDS = [0, 1, 2];
const TARGET = process.argv[2] || "groudon";

// 같은 종족값/CP 라이벌 — CMP(동시차징) 우선권 직접 대결용
const RIVALS = { groudon: "kyogre", kyogre: "groudon" };
const RIVAL = RIVALS[TARGET] || null;

// 분석할 IV 스프레드 (공격 우선 · HP 사다리 15/15/1x 포함)
const SPREADS = [
  [15, 15, 15], [14, 15, 15],
  [15, 15, 14], [15, 15, 13], [15, 15, 12],  // HP 사다리
  [15, 14, 15], [15, 14, 14], [15, 14, 13],
  [15, 13, 14], [15, 13, 13], [15, 12, 14], [15, 10, 14],
];

function statOf(iv, bb) {
  const r = runBattle({ speciesId: TARGET, ivs: iv, bestBuddy: bb, shields: 1 }, { speciesId: TARGET, ivs: iv, bestBuddy: bb, shields: 1 }, LEAGUE);
  return { cp: r.a.cp, level: r.a.level, stats: r.a.stats };
}

function metaRun(iv, shields, bb, oppBB = false) {
  // oppBB=상대도 베스트파트너 여부. 기본은 상대 노베파(L50).
  const r = runMulti({ speciesId: TARGET, ivs: iv, bestBuddy: bb, shields }, LEAGUE, shields, META_LIMIT, oppBB);
  const byOpp = {};
  for (const x of r.results) byOpp[x.oppId] = { id: x.oppId, name: x.oppName, dex: dexOf(x.oppId), types: x.oppTypes, rating: x.rating, win: x.win, score: x.score };
  return { wins: r.wins, losses: r.losses, byOpp };
}

// 레벨모드(일반/베스트버디)별 전수 분석
function analyze(bb) {
  const hundoStat = statOf([15, 15, 15], bb);
  const hundoRuns = {};
  for (const s of SHIELDS) hundoRuns[s] = metaRun([15, 15, 15], s, bb);

  const spreads = SPREADS.map((iv) => {
    const st = statOf(iv, bb);
    const effHundo = st.cp === hundoStat.cp && st.stats.hp === hundoStat.stats.hp
      && Math.abs(st.stats.atk - hundoStat.stats.atk) < 0.05 && Math.abs(st.stats.def - hundoStat.stats.def) < 0.05;
    const byShield = [], flips = [], nearFlips = [];
    for (const s of SHIELDS) {
      const run = metaRun(iv, s, bb);
      byShield.push({ shields: s, wins: run.wins, losses: run.losses });
      const base = hundoRuns[s].byOpp;
      for (const [oppId, cur] of Object.entries(run.byOpp)) {
        const b = base[oppId]; if (!b) continue;
        if (b.win !== cur.win) flips.push({ shields: s, oppId: cur.id, dex: dexOf(cur.id), opp: cur.name, types: cur.types, from: b.win, to: cur.win, delta: cur.rating - b.rating });
        else { const d = cur.rating - b.rating; if (d <= -8) nearFlips.push({ shields: s, oppId: cur.id, dex: dexOf(cur.id), opp: cur.name, types: cur.types, delta: d }); }
      }
    }
    nearFlips.sort((a, b) => a.delta - b.delta);
    // 판정: 공격<15 + 같은종족값 라이벌 → CMP탈락(미러·라이벌 필패). 승패 flip 또는 마진 급락(≤-150) → 타협.
    const atkMaxed = iv[0] === 15;
    const cmpFail = !atkMaxed && RIVAL != null;
    const worstNear = nearFlips.length ? nearFlips[0].delta : 0;
    const severeNear = worstNear <= -150;
    const verdict = cmpFail ? "CMP탈락"
      : (flips.length > 0 || severeNear) ? "타협"
      : (effHundo ? "실질백" : "유사백");
    return { iv, cp: st.cp, level: st.level, stats: st.stats, effHundo, verdict,
             byShield, flips, nearFlips: nearFlips.slice(0, 6) };
  });
  // 전체 메타 커버리지(백 기준) — "실제로 100종 전수 시뮬했다"를 시각화(팀빌더식 매치업 그리드)
  // 상대는 메타 랭킹(score) 순. 각 상대별 승/패·레이팅을 실드별로 저장.
  const coverage = SHIELDS.map((s) => ({
    shields: s,
    opps: Object.values(hundoRuns[s].byOpp).map((o) => ({
      id: o.id, name: o.name, dex: o.dex, types: o.types, rating: o.rating, win: o.win, score: o.score,
    })),
  }));

  return { hundo: { cp: hundoStat.cp, level: hundoStat.level, stats: hundoStat.stats,
                    byShield: SHIELDS.map((s) => ({ shields: s, wins: hundoRuns[s].wins, losses: hundoRuns[s].losses })) },
           coverage, spreads };
}

// CMP 대결 — 공격14(내) vs 공격15(상대). 미러 + 라이벌. (공격 IV 필수성 증명)
function cmpDuel(oppId, bb) {
  return SHIELDS.map((sh) => {
    const r = runBattle({ speciesId: TARGET, ivs: [14, 15, 15], bestBuddy: bb, shields: sh },
                        { speciesId: oppId, ivs: [15, 15, 15], bestBuddy: bb, shields: sh }, LEAGUE);
    return { shields: sh, mine: r.ratings[0], opp: r.ratings[1], result: r.winner === "a" ? "승" : r.winner === "b" ? "패" : "무" };
  });
}

const bbAnalysis = analyze(true); // 내 베파 vs 상대 노베파(L50)
// 상대도 베스트파트너(L51) 시나리오 — 백 커버리지만(공정: 내 L51 vs 상대 L51). 미러·라이벌은 여기서 무승부가 정상.
{
  const runs = {};
  for (const s of SHIELDS) runs[s] = metaRun([15, 15, 15], s, true, true);
  bbAnalysis.oppBB = {
    byShield: SHIELDS.map((s) => ({ shields: s, wins: runs[s].wins, losses: runs[s].losses })),
    coverage: SHIELDS.map((s) => ({ shields: s, opps: Object.values(runs[s].byOpp).map((o) => ({ id: o.id, name: o.name, dex: o.dex, types: o.types, rating: o.rating, win: o.win, score: o.score })) })),
  };
}

const out = {
  speciesId: TARGET, league: LEAGUE, metaLimit: META_LIMIT, rival: RIVAL, rivalDex: RIVAL ? dexOf(RIVAL) : null,
  normal: analyze(false),
  bestBuddy: bbAnalysis,
  cmp: {
    mirror: cmpDuel(TARGET, false),
    rival: RIVAL ? cmpDuel(RIVAL, false) : null,
  },
};

const path = `scripts/gbl/out_${TARGET}.json`;
writeFileSync(path, JSON.stringify(out, null, 2), "utf-8");

// 콘솔 요약
console.log(`\n═══ ${TARGET} 마스터 개체값 분석 (메타 ${META_LIMIT}, 실드 0/1/2) ═══`);
for (const [mode, key] of [["일반 L50", "normal"], ["베스트버디 L51", "bestBuddy"]]) {
  const a = out[key];
  console.log(`\n[${mode}] 백 CP ${a.hundo.cp} 스탯 ${JSON.stringify(a.hundo.stats)}`);
  for (const sp of a.spreads) {
    const flip = sp.flips.length ? " ✗" + [...new Set(sp.flips.map(f => f.opp))].join(",") : "";
    console.log(`  ${sp.iv.join("/")} CP${sp.cp} HP${sp.stats.hp} [${sp.verdict}]${flip}`);
  }
}
console.log(`\n[CMP 공14 vs 공15]`);
console.log("  미러:", out.cmp.mirror.map(d => `실${d.shields}=${d.result}(${d.mine})`).join(" "));
if (out.cmp.rival) console.log(`  vs ${RIVAL}:`, out.cmp.rival.map(d => `실${d.shields}=${d.result}(${d.mine})`).join(" "));
console.log(`\n→ 저장: ${path}`);
