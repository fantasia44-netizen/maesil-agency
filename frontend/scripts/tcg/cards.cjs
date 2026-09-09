// 카드 데이터 인제스트 — flibustier(MIT) 공개 데이터셋 → 검색용 컴팩트 카드 인덱스.
// basic cards.json(전 카드·최신 B4a까지: 이름·세트·레어도·팩)에 cards.extra.json(타입·HP·약점, B1까지)을
// 좌조인. 최신 카드는 이름·팩·레어도까지, 구 카드는 타입·HP까지. 카드명은 영어(데이터 한계, 후속 현지화).
// 실행: node scripts/tcg/cards.cjs   산출: app/[lang]/tcg/data/cards.json
const fs = require("fs");
const path = require("path");

const BASE = "https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist";
const UA = "tcgnote.net card pipeline (+https://tcgnote.net)";
const OUT = path.join(__dirname, "..", "..", "app", "[lang]", "tcg", "data", "cards.json");

async function get(file) {
  const res = await fetch(`${BASE}/${file}`, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${file} → ${res.status}`);
  return res.json();
}

// ── 카드명 현지화 — gblnote pokedex_names(ko/en/ja/zh-TW) 재활용 + 접두/접미 처리 ──
const PKN = require("../../app/[lang]/gbl/pokedex_names.json");
const norm = (s) => s.replace(/’/g, "'"); // 곡선 아포스트로피(’)→직선(') 정규화
const NAME = {}; // en(lower, 정규화) → {ko,ja,tw}
for (const v of Object.values(PKN)) if (v.en) NAME[norm(v.en).toLowerCase()] = { ko: v.ko, ja: v.ja, tw: v["zh-TW"] };
// 접두(포켓몬명 앞) — [영어접두, {ko,ja,tw}]. ko는 뒤에 공백, ja/tw는 붙임.
const PFX = [
  ["Mega ", { ko: "메가 ", ja: "メガ", tw: "超級" }],
  ["Team Rocket's ", { ko: "로켓단의 ", ja: "ロケット団の", tw: "火箭隊的" }],
  ["Alolan ", { ko: "알로라 ", ja: "アローラ", tw: "阿羅拉" }],
  ["Galarian ", { ko: "가라르 ", ja: "ガラル", tw: "伽勒爾" }],
  ["Hisuian ", { ko: "히스이 ", ja: "ヒスイ", tw: "洗翠" }],
  ["Paldean ", { ko: "팔데아 ", ja: "パルデア", tw: "帕底亞" }],
];
function localize(cardName) {
  let n = norm(cardName), pfx = null, ex = false, variant = "";
  for (const [en, loc] of PFX) if (n.startsWith(en)) { pfx = loc; n = n.slice(en.length); break; }
  if (/ ex$/i.test(n)) { ex = true; n = n.replace(/ ex$/i, ""); }
  const vm = n.match(/ ([XY])$/);            // 메가 리자몽 X/Y 변형
  if (vm) { variant = " " + vm[1]; n = n.slice(0, vm.index); }
  const b = NAME[n.toLowerCase()];
  if (!b || !b.ko) return null;              // 매핑 실패(트레이너·특수명) → 영어 유지
  const suf = (ex ? "ex" : "");
  return {
    ko: (pfx ? pfx.ko : "") + b.ko + variant + (ex ? " ex" : ""),
    ja: (pfx ? pfx.ja : "") + b.ja + variant + suf,
    "zh-TW": (pfx ? pfx.tw : "") + b.tw + variant + suf,
  };
}

async function main() {
  const [basic, extra] = await Promise.all([get("cards.json"), get("cards.extra.json")]);
  // 상세 인덱스: "set-number" → {element,health,weakness,stage,retreatCost,type}
  const ex = {};
  for (const c of extra) ex[`${c.set}-${c.number}`] = c;

  const cards = basic.map((c) => {
    const d = ex[`${c.set}-${c.number}`];
    const nm = localize(c.name);
    return {
      s: c.set, n: c.number, name: c.name, r: c.rarity, packs: c.packs || [],
      ...(nm ? { nm } : {}),
      ...(d && d.element ? { e: d.element, hp: d.health, w: d.weakness || "", st: d.stage || "" } : {}),
    };
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(cards));
  const withType = cards.filter((c) => c.e).length;
  const sets = [...new Set(cards.map((c) => c.s))];
  console.log(`[tcg-cards] ${cards.length} cards → cards.json (${withType} with type/HP)`);
  console.log(`[tcg-cards] sets: ${sets.join(",")}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
