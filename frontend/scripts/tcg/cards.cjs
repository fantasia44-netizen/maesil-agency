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

const { localize } = require("./localizeName.cjs"); // 카드명 현지화 공용 모듈

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
      // 주의: cards.extra.json의 health는 전 카드 50 고정(플레이스홀더·깨짐) → HP 미포함.
      // element·weakness는 정확 → 유지. "모르면 비워둔다 > 틀린 값 표시".
      ...(d && d.element ? { e: d.element, w: d.weakness || "" } : {}),
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
