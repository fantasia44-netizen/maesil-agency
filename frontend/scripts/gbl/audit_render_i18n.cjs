// 언어팩 정밀 진단 3 — 실제 렌더 결과에서 로케일 누출 탐지(소스 스캔보다 확실).
// en/ja/zh-TW 페이지에 한글이 남아있는지, ja/zh 페이지가 통째로 영문인지 본다.
// 실행: node scripts/gbl/audit_render_i18n.cjs [base]   (기본 http://localhost:3000)
const BASE = process.argv[2] || 'http://localhost:3000';

const PATHS = [
  '/gbl', '/gbl/tier/great', '/gbl/tier/master_mega', '/gbl/cmp/great',
  '/gbl/meta', '/gbl/meta/great', '/gbl/raid', '/gbl/raid/electric',
  '/gbl/raid/bosses', '/gbl/raid/schedule', '/gbl/events', '/gbl/moves',
  '/gbl/pokemon/great/melmetal', '/gbl/iv', '/gbl/iv/groudon', '/gbl/iv/ursaluna',
  '/gbl/guide', '/gbl/guide/type-chart', '/gbl/guide/moveset', '/gbl/trade',
  '/gbl/sim', '/gbl/about', '/gbl/privacy', '/gbl/terms', '/gbl/schedule',
  // 2026-10-09 추가: 레이드 기술 도감 · 배틀 기술 상세 · 도감 허브 카드(레이드 기술 줄) · 폼 페이지 · 랭킹 밖 페이지
  '/gbl/raid/moves', '/gbl/raid/moves/psystrike', '/gbl/raid/moves/counter', '/gbl/raid/moves/hidden_power_fire',
  '/gbl/moves/psystrike', '/gbl/pokemon/master/giratina_origin', '/gbl/pokemon/master/mewtwo', '/gbl/pokemon/great/charmander',
  '/gbl/raid/fire', '/gbl/tier/master', '/gbl/cmp/master', '/gbl/meta/master',
  // 2026-10-10 추가: 보스별 레이드 공략(목록 · 5성 · 메가 · 원시 · 섀도우)
  '/gbl/raid/boss', '/gbl/raid/boss/dialga', '/gbl/raid/boss/charizard_mega_x', '/gbl/raid/boss/groudon_primal', '/gbl/raid/boss/landorus_incarnate_shadow',
  // 뉴스(/gbl/news)는 번역 글이 있는 언어만 열리므로 여기서 보지 않는다(없는 언어는 404가 정상).
];
const LOCALES = ['en', 'ja', 'zh-TW'];
const HANGUL = /[가-힣]/;

// 한국어가 남아도 되는 자리(브랜드·고유명사 없음 — 전부 누출로 본다)
// data-i18n-ok = 일부러 여러 언어를 함께 적은 자리(기술 페이지의 "다른 언어 이름" 줄 등) — 누출로 세지 않는다.
const STRIP = [
  /<(\w+)[^>]*\bdata-i18n-ok\b[^>]*>[^<]*<\/\1>/g,
  /<script[\s\S]*?<\/script>/g, /<style[\s\S]*?<\/style>/g,
  /<!--[\s\S]*?-->/g,
];

function text(html) {
  let t = html;
  for (const re of STRIP) t = t.replace(re, ' ');
  // alt/title 속성도 화면에 노출되므로 남긴다
  t = t.replace(/<[^>]+>/g, ' ');
  return t.replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ');
}

(async () => {
  const rows = [];
  for (const p of PATHS) {
    for (const l of LOCALES) {
      const url = `${BASE}/${l}${p}`;
      try {
        const r = await fetch(url);
        if (!r.ok) { rows.push({ p, l, err: 'HTTP ' + r.status }); continue; }
        const t = text(await r.text());
        const hits = [...new Set((t.match(/[가-힣][가-힣\s()·,.0-9%/-]{0,28}/g) || []).map((s) => s.trim()))];
        if (hits.length) rows.push({ p, l, hits });
      } catch (e) { rows.push({ p, l, err: String(e.message).slice(0, 40) }); }
    }
  }
  if (!rows.length) { console.log('✔ en/ja/zh-TW 전 페이지에 한글 누출 없음'); return; }
  console.log(`한글 누출/오류 ${rows.length}건\n`);
  for (const r of rows) {
    if (r.err) { console.log(`✗ [${r.l}] ${r.p} — ${r.err}`); continue; }
    console.log(`■ [${r.l}] ${r.p} — ${r.hits.length}종`);
    for (const h of r.hits.slice(0, 12)) console.log(`     ${h}`);
    if (r.hits.length > 12) console.log(`     … +${r.hits.length - 12}`);
  }
})();
