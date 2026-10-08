// 타협개체 분석 일괄 재생성 — 시즌 지정해서 전 종 precompute.
// 사용: node scripts/gbl/run_iv_all.cjs [시즌]   (기본 28)
// 시즌을 안 넘기면 엔진 기본값(27)으로 돌아 지난 시즌 결과가 박히므로 반드시 명시한다.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const SEASON = process.argv[2] || '28';

// 시즌 28 마스터 상위 + 기존 발행분 유지(사장님 결정: 기존 유지 + 신규 추가)
const TARGETS = [
  // 기존 20종
  'groudon', 'lunala', 'reshiram', 'zacian_crowned_sword', 'xerneas', 'kyurem_white',
  'palkia_origin', 'kyogre', 'zekrom', 'zygarde_complete', 'ho_oh', 'eternatus',
  'dialga_origin', 'rhyperior_shadow', 'yveltal', 'keldeo_resolute', 'rhyperior',
  'metagross', 'gholdengo', 'garchomp',
  // S28 상위권 신규 8종
  'ursaluna', 'kyurem_black', 'reshiram_shadow', 'lugia',
  'zamazenta_crowned_shield', 'ursaluna_shadow', 'necrozma_dawn_wings', 'marshadow',
];

const ok = [], fail = [];
for (const id of TARGETS) {
  try {
    execFileSync('node', ['scripts/gbl/build_iv.cjs', id, SEASON], { stdio: 'pipe' });
    const j = JSON.parse(fs.readFileSync(`scripts/gbl/out_${id}.json`, 'utf8'));
    if (j.season !== Number(SEASON)) throw new Error(`season mismatch: ${j.season}`);
    const line = (j.normal.spreads.find((s) => s.verdict === '타협') || {}).iv;
    ok.push(id);
    console.log(`OK  ${id.padEnd(26)} season=${j.season} hundoCP=${j.normal.hundo.cp} 첫타협=${line ? line.join('/') : '-'}`);
  } catch (e) {
    fail.push(id);
    console.log(`ERR ${id.padEnd(26)} ${String(e.message).split('\n')[0]}`);
  }
}
console.log(`\n성공 ${ok.length} / 실패 ${fail.length}${fail.length ? ' → ' + fail.join(', ') : ''}`);
