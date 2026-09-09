// 팩 확률 인제스트 — flibustier pullRates.json(세트별 Regular/Rare 팩 슬롯별 레어도 확률) → packrates.json.
// 팩 시뮬레이터용. pullRates는 현재 B3b까지(최신 B4/B4a 미포함, 상단 안내). 실행: node scripts/tcg/packrates.cjs
const fs = require("fs");
const path = require("path");
const SRC = "https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/pullRates.json";
const OUT = path.join(__dirname, "..", "..", "app", "[lang]", "tcg", "data", "packrates.json");

async function main() {
  const res = await fetch(SRC, { headers: { "User-Agent": "tcgnote.net pack pipeline (+https://tcgnote.net)", Accept: "application/json" } });
  if (!res.ok) throw new Error(`pullRates → ${res.status}`);
  const raw = await res.json();
  // 세트별 정규화: { regular:[slot1..5 {rarity:prob}], rare:[...], rareRate:% }
  const out = {};
  for (const [set, packs] of Object.entries(raw)) {
    const reg = packs["Regular Pack"], rare = packs["Rare Pack"];
    if (!reg || !reg.slots) continue;
    const slotsOf = (p) => [1, 2, 3, 4, 5].map((i) => p.slots[String(i)] || {});
    out[set] = { regular: slotsOf(reg), rareRate: rare ? (rare.appearance_rate || 0) : 0, rare: rare && rare.slots ? slotsOf(rare) : null };
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`[tcg-packrates] ${Object.keys(out).length} sets → packrates.json (${Object.keys(out).join(",")})`);
}
main().catch((e) => { console.error(e); process.exit(1); });
