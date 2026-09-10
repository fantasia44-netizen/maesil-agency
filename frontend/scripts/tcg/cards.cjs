// 카드 데이터 인제스트 — flibustier(MIT) 공개 데이터셋 → 검색용 컴팩트 카드 인덱스.
// basic cards.json(전 카드·최신 B4a까지: 이름·세트·레어도·팩)에 cards.extra.json(타입·HP·약점, B1까지)을
// 좌조인. 최신 카드는 이름·팩·레어도까지, 구 카드는 타입·HP까지. 카드명은 영어(데이터 한계, 후속 현지화).
// 실행: node scripts/tcg/cards.cjs   산출: app/[lang]/tcg/data/cards.json
const fs = require("fs");
const path = require("path");

const BASE = "https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist";
// stage(기본/진화) "사실"값 소스 — chase-manning/PocketDecks(v5). ⚠️ v5=AGPL-3.0(강카피레프트):
// 파일·DB를 재배포하지 않고 stage라는 "사실"값만 추출해 우리 cards.json에 병합(사실=저작권X, Feist).
// 첫패/콤보 확률 계산기의 전제(기본 포켓몬 판정=몰리건 규칙). 출처: 게임 인게임 데이터.
const STAGE_BASE = "https://raw.githubusercontent.com/chase-manning/pokemon-tcg-pocket-cards/main/data/v5";
const UA = "tcgnote.net card pipeline (+https://tcgnote.net)";
const OUT = path.join(__dirname, "..", "..", "app", "[lang]", "tcg", "data", "cards.json");

async function get(file) {
  const res = await fetch(`${BASE}/${file}`, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${file} → ${res.status}`);
  return res.json();
}

// stage 문자열 → 컴팩트 코드(B=Basic·1=Stage1·2=Stage2). 포켓몬 아님/미상 → null.
function stageCode(s) {
  if (!s) return null;
  if (/basic/i.test(s)) return "B";
  if (/stage\s*1/i.test(s)) return "1";
  if (/stage\s*2/i.test(s)) return "2";
  return null;
}

// chase-manning core에서 stage·원소(subtype) 사실 추출. 실패 세트는 조용히 skip(name fallback이 커버).
// 원소: flibustier cards.extra는 element를 B1까지만 → chase-manning subtype(B4a까지)로 빈 곳 채움(타입 필터 정확도).
async function getStages(sets) {
  const bySN = {}, byName = {}, elemBySN = {}, elemByName = {};
  await Promise.all(sets.map(async (s) => {
    const setL = s.toLowerCase();
    for (const f of [`${setL}.core.no-image.json`, `${setL}.no-image.json`]) {
      try {
        const r = await fetch(`${STAGE_BASE}/${setL}/${f}`, { headers: { "User-Agent": UA } });
        if (!r.ok) continue;
        let t = await r.text(); t = t.replace(/^﻿/, "");
        const arr = JSON.parse(t);
        for (const c of arr) {
          const m = String(c.id).match(/-(\d+)$/);
          const code = stageCode(c.stage);
          if (code) { // stage=포켓몬만
            if (m) bySN[`${setL}-${Number(m[1])}`] = code;
            if (c.name && byName[c.name] == null) byName[c.name] = code;
          }
          // 원소 — 포켓몬의 subtype(Grass/Fire…)만, 소문자 정규화(우리 e 포맷)
          if ((c.type === "Pokémon" || c.type === "Pokemon") && typeof c.subtype === "string") {
            const el = c.subtype.toLowerCase();
            if (m) elemBySN[`${setL}-${Number(m[1])}`] = el;
            if (c.name && elemByName[c.name] == null) elemByName[c.name] = el;
          }
        }
        return;
      } catch (e) { /* try next filename */ }
    }
  }));
  return { bySN, byName, elemBySN, elemByName };
}

const { localize } = require("./localizeName.cjs"); // 카드명 현지화 공용 모듈

async function main() {
  const [basic, extra] = await Promise.all([get("cards.json"), get("cards.extra.json")]);
  const sets = [...new Set(basic.map((c) => c.set))];
  const stages = await getStages(sets);
  // 상세 인덱스: "set-number" → {element,health,weakness,stage,retreatCost,type}
  const ex = {};
  for (const c of extra) ex[`${c.set}-${c.number}`] = c;

  let withStage = 0;
  const cards = basic.map((c) => {
    const d = ex[`${c.set}-${c.number}`];
    const nm = localize(c.name);
    const sn = `${c.set.toLowerCase()}-${c.number}`;
    // stage: set-번호 우선 → 이름 fallback(알트아트·프로모=같은 카드=같은 stage)
    const st = stages.bySN[sn] || stages.byName[c.name] || null;
    if (st) withStage++;
    // 원소(e): flibustier(B1까지) 우선 → chase-manning subtype(B4a까지)로 빈 곳 채움(타입 필터 정확도).
    // weakness(w)는 flibustier에만 있음(약점은 chase-manning core에 없음).
    const e = (((d && d.element) || stages.elemBySN[sn] || stages.elemByName[c.name] || "").toLowerCase()) || null; // 소문자 통일(타입 필터·색상 키와 일치)
    const w = d && d.element ? (d.weakness || "") : "";
    return {
      s: c.set, n: c.number, name: c.name, r: c.rarity, packs: c.packs || [],
      ...(nm ? { nm } : {}),
      // 주의: cards.extra.json의 health는 전 카드 50 고정(플레이스홀더·깨짐) → HP 미포함.
      ...(e ? { e, ...(w ? { w } : {}) } : {}),
      ...(st ? { st } : {}), // 기본/진화 단계(B/1/2) — 포켓몬만. 첫패 계산기용.
    };
  });

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(cards));
  const withType = cards.filter((c) => c.e).length;
  const setList = [...new Set(cards.map((c) => c.s))];
  console.log(`[tcg-cards] ${cards.length} cards → cards.json (${withType} with type, ${withStage} with stage)`);
  console.log(`[tcg-cards] sets: ${setList.join(",")}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
