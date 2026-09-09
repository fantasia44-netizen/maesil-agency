// 카드명 현지화 공용 모듈 — gblnote pokedex_names(ko/en/ja/zh-TW) 재활용 + 접두/접미/변형 처리.
// cards.cjs(카드 DB)·ingest.cjs(덱리스트) 공용. 트레이너/특수명은 매핑 실패 → null(영어 유지).
const PKN = require("../../app/[lang]/gbl/pokedex_names.json");
const norm = (s) => s.replace(/’/g, "'"); // 곡선 아포스트로피(’)→직선(')
const NAME = {}; // en(lower, 정규화) → {ko,ja,tw}
for (const v of Object.values(PKN)) if (v.en) NAME[norm(v.en).toLowerCase()] = { ko: v.ko, ja: v.ja, tw: v["zh-TW"] };
// 접두(포켓몬명 앞) — ko는 뒤 공백, ja/tw는 붙임.
const PFX = [
  ["Mega ", { ko: "메가 ", ja: "メガ", tw: "超級" }],
  ["Team Rocket's ", { ko: "로켓단의 ", ja: "ロケット団の", tw: "火箭隊的" }],
  ["Alolan ", { ko: "알로라 ", ja: "アローラ", tw: "阿羅拉" }],
  ["Galarian ", { ko: "가라르 ", ja: "ガラル", tw: "伽勒爾" }],
  ["Hisuian ", { ko: "히스이 ", ja: "ヒスイ", tw: "洗翠" }],
  ["Paldean ", { ko: "팔데아 ", ja: "パルデア", tw: "帕底亞" }],
];

// 영어 카드명 → {ko,ja,"zh-TW"} 또는 null(포켓몬 아님/미매핑).
function localize(cardName) {
  let n = norm(cardName), pfx = null, ex = false, variant = "";
  for (const [en, loc] of PFX) if (n.startsWith(en)) { pfx = loc; n = n.slice(en.length); break; }
  if (/ ex$/i.test(n)) { ex = true; n = n.replace(/ ex$/i, ""); }
  const vm = n.match(/ ([XY])$/); // 메가 리자몽 X/Y
  if (vm) { variant = " " + vm[1]; n = n.slice(0, vm.index); }
  const b = NAME[n.toLowerCase()];
  if (!b || !b.ko) return null;
  const suf = ex ? "ex" : "";
  return {
    ko: (pfx ? pfx.ko : "") + b.ko + variant + (ex ? " ex" : ""),
    ja: (pfx ? pfx.ja : "") + b.ja + variant + suf,
    "zh-TW": (pfx ? pfx.tw : "") + b.tw + variant + suf,
  };
}

module.exports = { localize };
