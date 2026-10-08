// 언어팩 정밀 진단 4 — "번역돼 있나"가 아니라 "그 나라 게임에서 실제 쓰는 말인가"를 검증.
// 포켓몬명·기술명·타입명을 PokéAPI의 공식 현지화와 대조한다(본편 공식 표기 = GO 표기와 동일).
// 실행: node scripts/gbl/audit_terms.cjs [샘플수]
const fs = require('fs');
const N = Number(process.argv[2] || 40);
const G = 'app/[lang]/gbl/';
const PK = JSON.parse(fs.readFileSync(G + 'pokedex_names.json', 'utf8'));
const MV = JSON.parse(fs.readFileSync(G + 'pvp_move_names.json', 'utf8'));

const LANGMAP = { ko: 'ko', ja: 'ja-Hrkt', 'zh-TW': 'zh-Hant' };
const norm = (s) => (s || '').replace(/[\s'’.\-·・（）()]/g, '').toLowerCase();

// PokéAPI 쪽이 구버전/오류인 것으로 확인된 건 — 우리 값이 맞으므로 재지적하지 않는다.
// 형식: "<대상ID>|<로케일>": "확인 경위"
const VERIFIED_OURS = {
  // 2026-10-09 사장님 인게임 확인: 한국어 공식 표기는 "깨트리기". PokéAPI는 "깨뜨리다"(구번역).
  'BRICK_BREAK|ko': '사장님 인게임 확인(2026-10-09)',
};
const isKnown = (key) => Object.prototype.hasOwnProperty.call(VERIFIED_OURS, key);

async function j(url) { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
function pick(names, lang) {
  const want = LANGMAP[lang];
  const hit = names.find((n) => n.language.name === want);
  return hit ? hit.name : null;
}

(async () => {
  const bad = { pokemon: [], move: [], type: [] };
  const cmp = { pokemon: 0, move: 0, type: 0 };
  const skip = { pokemon: 0, move: 0, type: 0 };

  // 1) 포켓몬명 — dex 번호 샘플
  const dexes = Object.keys(PK).map(Number).filter((d) => d >= 1 && d <= 1025).sort((a, b) => a - b);
  const step = Math.max(1, Math.floor(dexes.length / N));
  const sample = dexes.filter((_, i) => i % step === 0).slice(0, N);
  for (const d of sample) {
    try {
      const sp = await j(`https://pokeapi.co/api/v2/pokemon-species/${d}`);
      for (const l of ['ko', 'ja', 'zh-TW']) {
        const official = pick(sp.names, l);
        const ours = PK[String(d)]?.[l];
        if (!official || !ours) { skip.pokemon++; continue; }
        cmp.pokemon++;
        if (norm(official) !== norm(ours) && !isKnown(`${d}|${l}`)) bad.pokemon.push(`#${d} [${l}] 우리="${ours}" 공식="${official}"`);
      }
    } catch { skip.pokemon += 3; }
  }

  // 2) 기술명 — GO id → PokéAPI slug 로 변환해 조회
  const ids = Object.keys(MV).filter((k) => !/_PLUS$/.test(k));
  const mstep = Math.max(1, Math.floor(ids.length / N));
  const msample = ids.filter((_, i) => i % mstep === 0).slice(0, N);
  for (const id of msample) {
    const slug = id.toLowerCase().replace(/_fast$/, '').replace(/_/g, '-');
    try {
      const mv = await j(`https://pokeapi.co/api/v2/move/${slug}`);
      for (const l of ['ko', 'ja', 'zh-TW']) {
        const official = pick(mv.names, l);
        const ours = MV[id]?.[l];
        if (!official || !ours) { skip.move++; continue; }
        cmp.move++;
        if (norm(official) !== norm(ours) && !isKnown(`${id}|${l}`)) bad.move.push(`${id} [${l}] 우리="${ours}" 공식="${official}"`);
      }
    } catch { skip.move += 3; }
  }

  // 3) 타입명
  const TYPES = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
    'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
  const src = fs.readFileSync(G + 'typeLabels.ts', 'utf8');
  for (const t of TYPES) {
    try {
      const ty = await j(`https://pokeapi.co/api/v2/type/${t}`);
      for (const l of ['ko', 'ja', 'zh-TW']) {
        const official = pick(ty.names, l);
        if (!official) { skip.type++; continue; }
        cmp.type++;
        if (!src.includes(official)) bad.type.push(`${t} [${l}] 공식="${official}" — typeLabels.ts에 없음`);
      }
    } catch { /* skip */ }
  }

  const show = (k, title, checked) => {
    console.log(`\n■ ${title} (표본 ${checked})`);
    if (!bad[k].length) { console.log('   ✔ 공식 현지화와 일치'); return; }
    console.log(`   불일치 ${bad[k].length}건`);
    for (const x of bad[k].slice(0, 20)) console.log('   ' + x);
    if (bad[k].length > 20) console.log(`   … +${bad[k].length - 20}`);
  };
  show('pokemon', '포켓몬 이름', sample.length);
  show('move', '기술 이름', msample.length);
  show('type', '타입 이름', TYPES.length);
  const kn = Object.entries(VERIFIED_OURS);
  if (kn.length) {
    console.log(`
■ 확인 완료 예외 ${kn.length}건(우리 값이 맞음 — 재지적 안 함)`);
    for (const [k, why] of kn) console.log(`   ${k} — ${why}`);
  }
})();
