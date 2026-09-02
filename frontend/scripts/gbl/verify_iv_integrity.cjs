// 타협개체 분석 20종 데이터 무결성 검증.
// 페이지명 = CMP명 = IV표명 = CP명 일치 여부 + 데이터 잔존값(잘못된 dex/rival/cp) 탐지.
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "app", "[lang]", "gbl", "iv", "data");
const PKN = require(path.join(__dirname, "..", "..", "app", "[lang]", "gbl", "pokedex_names.json"));

// registry.ts IV_ANALYSIS 키 → 데이터 파일 (groudon은 수기 엔트리지만 데이터도 존재)
const ENTRIES = [
  "groudon", "lunala", "reshiram", "zacian_crowned_sword", "xerneas", "kyurem_white",
  "palkia_origin", "kyogre", "zekrom", "zygarde_complete", "ho_oh", "eternatus",
  "dialga_origin", "rhyperior_shadow", "yveltal", "keldeo_resolute", "rhyperior",
  "metagross", "gholdengo", "garchomp",
];

// registry.ts monNames() 로직 복제
const NAME_AFFIX = {
  crowned_sword: [" (검왕)", "s"], crowned_shield: [" (방패왕)", "s"], origin: [" (오리진)", "s"],
  white: [" (화이트)", "s"], black: [" (블랙)", "s"], complete: [" (퍼펙트폼)", "s"],
  resolute: [" (각오의 모습)", "s"], shadow: ["그림자 ", "p"],
};
function nameKo(id, dex) {
  const base = (PKN[String(dex)] && (PKN[String(dex)].ko || PKN[String(dex)].en)) || id;
  let prefix = "", suffix = "";
  for (const [suf, v] of Object.entries(NAME_AFFIX)) {
    if (id.includes("_" + suf) || id === suf) { if (v[1] === "p") prefix += v[0]; else suffix += v[0]; }
  }
  return prefix + base + suffix;
}

let problems = 0;
const rows = [];
for (const key of ENTRIES) {
  const fp = path.join(DATA_DIR, key + ".json");
  if (!fs.existsSync(fp)) { console.log(`❌ ${key}: 데이터 파일 없음`); problems++; continue; }
  const d = JSON.parse(fs.readFileSync(fp, "utf8"));
  const sid = d.speciesId;
  const dex = d.dex;
  const cp = d.normal && d.normal.hundo && d.normal.hundo.cp;
  const rival = d.rival, rivalDex = d.rivalDex;
  const mirror = d.cmp && d.cmp.mirror;
  const nm = nameKo(sid, dex);
  const rnm = rival && rivalDex != null ? nameKo(rival, rivalDex) : "—";

  const issues = [];
  // 파일명(registry 키)과 speciesId 일치 (groudon 등 폼 없는 건 동일해야; 폼은 접미 포함)
  if (sid !== key) issues.push(`파일키≠speciesId (${key}≠${sid})`);
  if (dex == null || dex === 0) issues.push(`dex 없음/0`);
  if (!PKN[String(dex)]) issues.push(`dex ${dex} 도감명 없음`);
  if (!cp || cp < 1000) issues.push(`CP 이상(${cp})`);
  // 미러 상대는 자기 자신 — 별도 이름 필드 없음(라벨은 뷰에서 speciesId로 생성). mirror 듀얼 존재만 확인.
  if (!mirror || !mirror.length) issues.push(`cmp.mirror 없음`);
  // rival이 있으면 rivalDex도 있어야
  if (rival && rivalDex == null) issues.push(`rival명 있는데 rivalDex 없음`);
  // 자기 자신을 rival로 넣은 잔존값 방지
  if (rival && rival === sid) issues.push(`rival==self(${rival}) 잔존값 의심`);

  if (issues.length) problems++;
  rows.push({ key, sid, dex, name: nm, cp, rival: rnm, rivalId: rival || "—", issues });
}

console.log("\n=== 타협개체 20종 무결성 ===\n");
for (const r of rows) {
  const flag = r.issues.length ? "❌" : "✅";
  console.log(`${flag} ${r.key.padEnd(22)} dex=${String(r.dex).padEnd(6)} CP=${String(r.cp).padEnd(5)} 이름=${r.name.padEnd(14)} 라이벌=${r.rival}(${r.rivalId})`);
  if (r.issues.length) console.log(`     ⚠ ${r.issues.join(" / ")}`);
}
console.log(`\n총 ${rows.length}종, 문제 ${problems}종`);
