// 언어팩 정밀 진단 2 — 공개 다국어 경로(app/[lang]/**)에서 사전 밖 하드코딩 한글 탐지.
// 관리자 전용 페이지(/settings, /outreach, /chat, *-admin 등)는 한국어 전용이라 제외.
// 같은 줄에 가나·"zh-TW"·lang=== 분기가 있으면 4개국어 인라인 리터럴로 보고 통과.
const fs = require('fs');
const path = require('path');

const ROOTS = ['app/[lang]/gbl', 'app/[lang]/tcg'];
// 값 자체가 4개국어 표를 담고 있는 데이터/사전 모듈
const SKIP_FILE = /(dict\.ts|dictionaries[\\/]|guides\.ts|eventManual\.ts|registry\.ts|articleGen\.ts|oppNames\.ts|eventBrochures\.ts|contentI18n\.ts|typeLabels\.ts|seasons\.ts|sdEvents\.ts|monNames\.ts|dexHub\.ts|leagueAnalysis\.ts|guideLinks\.ts|formats\.ts|analysis\.ts|sprite\.ts|indexGate\.ts|monSlug\.ts)/;
const HANGUL = /[가-힣]/;
const KANA = /[぀-ヿ]/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => {
    const i = l.indexOf('//');
    if (i < 0) return l;
    const before = l.slice(0, i);
    return (before.match(/["'`]/g) || []).length % 2 === 1 ? l : before;
  }).join('\n');
}

const files = ROOTS.flatMap((r) => walk(r)).filter((f) => !SKIP_FILE.test(f));
const findings = [];
for (const f of files) {
  const lines = stripComments(fs.readFileSync(f, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    // 4개국어 리터럴 신호: 같은 줄 또는 ±6줄 안에 가나 / "zh-TW" / lang === "xx" 분기.
    // (ko 블록이 여러 줄로 나뉜 Record<Locale, …> 맵을 오탐하지 않도록 창을 본다)
    const win = lines.slice(Math.max(0, i - 6), i + 7).join('\n');
    if (KANA.test(win) || win.includes('zh-TW') || /lang\s*===\s*["']/.test(win)) return;
    for (const m of line.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
      const v = m[2];
      if (!HANGUL.test(v)) continue;
      findings.push({ f, line: i + 1, v: v.length > 56 ? v.slice(0, 56) + '…' : v });
    }
  });
}
const byFile = new Map();
for (const x of findings) { if (!byFile.has(x.f)) byFile.set(x.f, []); byFile.get(x.f).push(x); }
const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
console.log(`공개 경로 하드코딩 한글: ${findings.length}건 / ${byFile.size}개 파일\n`);
for (const [f, list] of sorted) {
  console.log(`■ ${f.replace(/\\/g, '/')} (${list.length})`);
  for (const x of list.slice(0, 10)) console.log(`   ${String(x.line).padStart(4)}: ${x.v}`);
  if (list.length > 10) console.log(`   … +${list.length - 10}`);
}
