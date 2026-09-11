// 메가/원시 종족값 추출 → gbl_mega_stats.json (IV 체커 도감에 메가 폼 추가용).
// 소스: PvPoke GameMaster(sim/pvpoke/gamemaster_s28.json) baseStats + pokedex_names.
// 실행: node scripts/gbl/build_mega_stats.cjs
const fs = require("node:fs");
const path = require("node:path");
const base = path.join(__dirname, "../../app/[lang]/gbl");
const gm = JSON.parse(fs.readFileSync(path.join(base, "sim/pvpoke/gamemaster_s28.json"), "utf-8"));
const names = JSON.parse(fs.readFileSync(path.join(base, "pokedex_names.json"), "utf-8"));
const mons = Array.isArray(gm) ? gm : gm.pokemon;

// 실제 메가/원시만: 접미사 기준(meganium·yanmega 같은 이름-우연 매치 제외)
const SUF = [
  { s: "_mega_x", ko: (n) => `메가 ${n} X`, en: (n) => `Mega ${n} X`, ja: (n) => `メガ${n}X` },
  { s: "_mega_y", ko: (n) => `메가 ${n} Y`, en: (n) => `Mega ${n} Y`, ja: (n) => `メガ${n}Y` },
  { s: "_mega", ko: (n) => `메가 ${n}`, en: (n) => `Mega ${n}`, ja: (n) => `メガ${n}` },
  { s: "_primal", ko: (n) => `원시 ${n}`, en: (n) => `Primal ${n}`, ja: (n) => `ゲンシ${n}` },
];

const out = [];
const seen = new Set();
for (const m of mons) {
  const sid = String(m.speciesId || "");
  const suf = SUF.find((x) => sid.endsWith(x.s));
  if (!suf) continue;
  if (m.tags && m.tags.includes("shadow")) continue;
  if (seen.has(sid)) continue;
  seen.add(sid);
  const bs = m.baseStats || {};
  if (!bs.atk || !bs.def || !bs.hp) continue;
  const nm = names[String(m.dex)] || {};
  const koB = nm.ko || m.speciesName || sid;
  const enB = nm.en || m.speciesName || sid;
  const jaB = nm.ja || enB;
  out.push({
    id: sid, dex: m.dex,
    ko: suf.ko(koB), en: suf.en(enB), ja: suf.ja(jaB),
    a: bs.atk, d: bs.def, s: bs.hp,
  });
}
out.sort((a, b) => a.dex - b.dex || a.id.localeCompare(b.id));
fs.writeFileSync(path.join(base, "gbl_mega_stats.json"), JSON.stringify(out, null, 0) + "\n", "utf-8");
console.log(`gbl_mega_stats.json: ${out.length}종`);
console.log(out.slice(0, 4).map((x) => `${x.ko} ${x.a}/${x.d}/${x.s}`).join(" · "));
