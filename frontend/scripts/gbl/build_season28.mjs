// 시즌28(황혼의 여정 / Twilight Trails) 시뮬 데이터 생성 — PvPoke twilight-trails 브랜치에서 추출.
// 산출물: sim/pvpoke/gamemaster_s28.json + meta_{great,ultra,master}_s28.json
// 실행:  node scripts/gbl/build_season28.mjs
// ※ 시즌 시작(2026-09-09) 전후 PvPoke가 데이터를 확정하면 재실행해 갱신.
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "../../app/[lang]/gbl/sim/pvpoke");
const BRANCH = "twilight-trails";
const RAW = (p) => `https://raw.githubusercontent.com/pvpoke/pvpoke/${BRANCH}/src/data/${p}`;

const RANK = { great: "rankings-1500", ultra: "rankings-2500", master: "rankings-10000" };
const TOP = 100;

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

function toMeta(rankings) {
  return [...rankings]
    .filter((e) => e.speciesId && Array.isArray(e.moveset))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, TOP)
    .map((e) => ({ s: e.speciesId, m: e.moveset, sc: Math.round((e.score ?? 0) * 10) / 10 }));
}

(async () => {
  // 1) gamemaster
  const gm = await getJson(RAW("gamemaster.json"));
  writeFileSync(join(OUT, "gamemaster_s28.json"), JSON.stringify(gm));
  console.log(`gamemaster_s28.json  ts=${gm.timestamp}  pokemon=${gm.pokemon.length}  moves=${gm.moves.length}`);

  // 현재(S27) gamemaster와 스키마 정합성 체크
  const cur = JSON.parse(readFileSync(join(OUT, "gamemaster.json"), "utf8"));
  const curKeys = Object.keys(cur.pokemon[0]).sort().join(",");
  const s28Keys = Object.keys(gm.pokemon[0]).sort().join(",");
  console.log(`  schema pokemon[0] keys ${curKeys === s28Keys ? "일치" : "차이:\n   S27="+curKeys+"\n   S28="+s28Keys}`);

  // 2) 리그별 메타(상위 100)
  for (const [league, file] of Object.entries(RANK)) {
    const rk = await getJson(RAW(`rankings/all/overall/${file}.json`));
    const meta = toMeta(rk);
    writeFileSync(join(OUT, `meta_${league}_s28.json`), JSON.stringify(meta));
    console.log(`meta_${league}_s28.json  entries=${meta.length}  #1=${meta[0].s}(${meta[0].sc})  #2=${meta[1].s}`);
  }
  console.log("done.");
})();
