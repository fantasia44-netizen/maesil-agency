// 포켓몬 상세 색인 게이트용 "메타몬" 리스트 생성 — PvPoke master 브랜치 랭킹의 editorScore>0(편집진 메타 픽)
// + 마스터리그는 편집 픽이 적어(12) 점수 상위 30으로 보강. 우리 실측(유저 기록)은 아직 표본이 없어 쓰지 않음.
// 산출물: app/[lang]/gbl/gbl_meta_mons.json   실행: node scripts/gbl/build_meta_mons.mjs   (시즌/메타 변동 시 재실행)
// 소비처: app/[lang]/gbl/indexGate.ts → 포켓몬 상세 robots(noindex) + app/sitemap.ts 포함 여부.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "../../app/[lang]/gbl/gbl_meta_mons.json");
const RAW = (p) => `https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/${p}`;
const RANK = { great: "rankings-1500", ultra: "rankings-2500", master: "rankings-10000" };
const MASTER_SCORE_TOP = 30;

async function getJson(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }

(async () => {
  const leagues = {};
  for (const [league, file] of Object.entries(RANK)) {
    const rk = await getJson(RAW(`rankings/all/overall/${file}.json`));
    const editor = rk.filter((e) => e.editorScore > 0).map((e) => e.speciesId);
    const supp = league === "master" ? [...rk].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, MASTER_SCORE_TOP).map((e) => e.speciesId) : [];
    leagues[league] = [...new Set([...editor, ...supp])];
    console.log(`${league}: 편집픽 ${editor.length}${supp.length ? ` + 점수top${MASTER_SCORE_TOP} → ` : " → "}${leagues[league].length}`);
  }
  writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), source: "PvPoke rankings (master) editorScore>0 + master score top30", leagues }, null, 0));
  console.log("→", OUT);
})();
