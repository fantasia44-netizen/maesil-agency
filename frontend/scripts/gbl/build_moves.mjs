// 기술 도감 데이터 생성 — sim/pvpoke/gamemaster_s28.json(PvPoke 게임마스터) → app/[lang]/gbl/gbl_moves.json
// 산출: 기술별 수치(위력·에너지·턴·버프) + 4개국어 이름 + 배우는 포켓몬(그림자 제외, 메가는 전용기만) + 레거시(엘리트) 표시.
// "이 기술을 추천 기술배치로 쓰는 메타 포켓몬·타수·데미지"는 페이지 렌더 시 시즌 스냅샷(gbl_detail_s28.json)에서 계산 → 여기엔 넣지 않음.
// 실행: cd frontend && node scripts/gbl/build_moves.mjs   (게임마스터 갱신(build_season28.mjs) 직후 재실행)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const GBL = join(__dir, "../../app/[lang]/gbl");
const J = (f) => JSON.parse(readFileSync(join(GBL, f), "utf8"));

const gm = J("sim/pvpoke/gamemaster_s28.json");
const MN = J("pvp_move_names.json");          // id → {ko,en,ja,zh-TW}
const GDM = J("gbl_data.json").moves;          // id → {ko,en,ja,type,kind} (ko는 9세대 정식명 교정본·잠재파워 타입 표기)
const PN = J("pokedex_names.json");            // dex → {ko,en,ja,zh-TW}
const FORMS = Object.fromEntries(J("gbl_forms.json").map((f) => [f.id, f])); // 메가·원시 4개국어 이름
const FORM_NAMES = J("gbl_form_names.json"); // 그 밖의 폼 공식 명칭(build_form_names.mjs) — full이면 완성형, 아니면 "기본명 (라벨)"

// ── 포켓몬 표시명(4개국어) — gbl_compile_detail.py의 _disp와 같은 규칙(+zh-TW). 미지원 폼은 기본 종 이름으로 떨어짐.
const AFF = {
  ko: { reg: { _alolan: "알로라 ", _galarian: "가라르 ", _hisuian: "히스이 ", _paldean: "팔데아 " }, white: "화이트 ", black: "블랙 ",
        origin: " (오리진)", therian: " (영물폼)", crowned_sword: " (검왕)", crowned_shield: " (방패왕)", dusk_mane: " (황혼의 갈기)", dawn_wings: " (새벽의 날개)", hero: " (역전의 용사)" },
  en: { reg: { _alolan: "Alolan ", _galarian: "Galarian ", _hisuian: "Hisuian ", _paldean: "Paldean " }, white: "White ", black: "Black ",
        origin: " (Origin)", therian: " (Therian)", crowned_sword: " (Crowned Sword)", crowned_shield: " (Crowned Shield)", dusk_mane: " (Dusk Mane)", dawn_wings: " (Dawn Wings)", hero: " (Hero)" },
  ja: { reg: { _alolan: "アローラ", _galarian: "ガラル", _hisuian: "ヒスイ", _paldean: "パルデア" }, white: "ホワイト", black: "ブラック",
        origin: "（オリジンフォルム）", therian: "（れいじゅうフォルム）", crowned_sword: " (けんのおう)", crowned_shield: " (たてのおう)", dusk_mane: " (たそがれのたてがみ)", dawn_wings: " (あかつきのつばさ)", hero: " (れきせんのゆうしゃ)" },
  "zh-TW": { reg: { _alolan: "阿羅拉", _galarian: "伽勒爾", _hisuian: "洗翠", _paldean: "帕底亞" }, white: "焰白", black: "闇黑",
        origin: "（起源）", therian: "（靈獸）", crowned_sword: "（劍之王）", crowned_shield: "（盾之王）", dusk_mane: "（黃昏之鬃）", dawn_wings: "（拂曉之翼）", hero: "（百戰勇者）" },
};
const LANGS = ["ko", "en", "ja", "zh-TW"];
function dispName(sid, dex, lang) {
  const f = FORMS[sid];
  if (f && f[lang === "zh-TW" ? "zh-TW" : lang]) return f[lang];
  const base = PN[String(dex)]?.[lang] || PN[String(dex)]?.en;
  if (!base) return null;
  const a = AFF[lang];
  const fn = FORM_NAMES[sid];
  if (fn && fn[lang]) {
    if (fn.full) return fn[lang];
    const reg0 = Object.entries(a.reg).find(([suf]) => sid.includes(suf))?.[1] || "";
    return lang === "ja" || lang === "zh-TW" ? `${reg0}${base}（${fn[lang]}）` : `${reg0}${base} (${fn[lang]})`;
  }
  if (f) { // 메가·원시인데 해당 언어 이름이 없을 때(zh-TW 등) — 접두만
    const pre = f.primal ? { ko: "원시 ", en: "Primal ", ja: "ゲンシ", "zh-TW": "原始" }[lang] : { ko: "메가 ", en: "Mega ", ja: "メガ", "zh-TW": "超級" }[lang];
    const xy = /_mega_x$/.test(sid) ? " X" : /_mega_y$/.test(sid) ? " Y" : "";
    return pre + base + xy;
  }
  const reg = Object.entries(a.reg).find(([suf]) => sid.includes(suf))?.[1] || "";
  let name = sid.includes("_white") ? a.white + base : sid.includes("_black") ? a.black + base : reg + base;
  for (const k of ["origin", "therian", "crowned_sword", "crowned_shield", "dusk_mane", "dawn_wings", "hero"]) if (sid.includes("_" + k)) { name += a[k]; break; }
  return name;
}

// ── 대상 포켓몬: 공개(released) + 그림자 제외. 메가·원시는 "기본 폼이 못 배우는 기술"만 학습자로 추가(중복 방지).
const isMega = (p) => (p.tags || []).some((t) => t === "mega" || t === "supermega") || /_primal$/.test(p.speciesId);
const pool = gm.pokemon.filter((p) => p.released && !(p.tags || []).includes("shadow"));
const baseByDex = {};
for (const p of pool) if (!isMega(p)) (baseByDex[p.dex] = baseByDex[p.dex] || []).push(p);
const movesOf = (p) => [...(p.fastMoves || []), ...(p.chargedMoves || [])];

const learners = {}, elite = {}, species = {};
const addSpecies = (p) => {
  if (species[p.speciesId]) return;
  const n = {}; for (const l of LANGS) n[l] = dispName(p.speciesId, p.dex, l) || p.speciesName;
  species[p.speciesId] = { dex: p.dex, types: (p.types || []).filter((t) => t && t !== "none"), n };
};
for (const p of pool) {
  const mega = isMega(p);
  const baseMoves = mega ? new Set((baseByDex[p.dex] || []).flatMap(movesOf)) : null;
  for (const m of movesOf(p)) {
    if (mega && baseMoves.has(m)) continue;
    (learners[m] = learners[m] || []).push(p.speciesId);
    if ((p.eliteMoves || []).includes(m) || (p.legacyMoves || []).includes(m)) (elite[m] = elite[m] || []).push(p.speciesId);
    addSpecies(p);
  }
}
// 같은 표시명으로 떨어지는 폼(테오키스 4폼·캐스퐁 4폼 등)은 한 번만 — ko 이름 기준 중복 제거(첫 폼 유지, 레거시 표시는 합침).
for (const m of Object.keys(learners)) {
  const seen = new Map(); const out = [];
  for (const sid of learners[m]) {
    const key = species[sid].n.ko;
    if (seen.has(key)) { if ((elite[m] || []).includes(sid) && !(elite[m] || []).includes(seen.get(key))) elite[m].push(seen.get(key)); continue; }
    seen.set(key, sid); out.push(sid);
  }
  learners[m] = out.sort((a, b) => species[a].dex - species[b].dex || a.localeCompare(b));
  if (elite[m]) elite[m] = elite[m].filter((sid) => out.includes(sid));
}

// ── 기술
const nameOf = (id) => {
  const a = MN[id] || {}, b = GDM[id] || {};
  return { ko: b.ko || a.ko || id, en: b.en || a.en || id, ja: b.ja || a.ja || b.en || a.en || id, "zh-TW": a["zh-TW"] || b.en || a.en || id };
};
const buffOf = (m) => {
  if (!m.buffs && !m.buffsSelf && !m.buffsOpponent) return undefined;
  const chance = Number(m.buffApplyChance || 1);
  if (m.buffTarget === "both") return { self: m.buffsSelf || null, opp: m.buffsOpponent || null, chance };
  return m.buffTarget === "self" ? { self: m.buffs, opp: null, chance } : { self: null, opp: m.buffs, chance };
};
const moves = [];
for (const m of gm.moves) {
  const kind = m.energyGain > 0 ? "fast" : m.energy > 0 ? "charged" : null;
  if (!kind || !learners[m.moveId]) continue;   // 학습 포켓몬이 없는 변형(_PLUS·프러스트레이션 등)은 제외
  moves.push({
    id: m.moveId, slug: m.moveId.toLowerCase(), kind, type: m.type,
    power: m.power || 0, energy: m.energy || 0, gain: m.energyGain || 0, turns: kind === "fast" ? (m.turns || 1) : 1,
    ...(buffOf(m) ? { buff: buffOf(m) } : {}),
    n: nameOf(m.moveId),
    learners: learners[m.moveId], ...(elite[m.moveId]?.length ? { elite: elite[m.moveId] } : {}),
  });
}
moves.sort((a, b) => a.id.localeCompare(b.id));
const usedSpecies = new Set(moves.flatMap((m) => m.learners));
for (const k of Object.keys(species)) if (!usedSpecies.has(k)) delete species[k];

const out = { generatedAt: new Date().toISOString().slice(0, 10), gmTimestamp: gm.timestamp, species, moves };
writeFileSync(join(GBL, "gbl_moves.json"), JSON.stringify(out));

// ── 랭킹 밖 포켓몬(gbl_unranked.json) — PvPoke 리그 랭킹(상위 200 + 확장) 어디에도 없는 종의 기본 정보 페이지용.
// 대부분 미진화(레벨 50·15/15/15로도 CP 1,500 미달)라 배틀 데이터가 없음 → 종족값·최대 CP·배우는 기술·진화만 싣는다.
{
  const ranked = new Set();
  for (const f of ["gbl_detail_s28.json", "gbl_detail_ext_s28.json"]) { const d = J(f); for (const lg of ["great", "ultra", "master"]) for (const r of d[lg] || []) ranked.add(r.id); }
  const CPM50 = 0.84029999;   // 레벨 50 CP 배수
  const byId = Object.fromEntries(gm.pokemon.map((p) => [p.speciesId, p]));
  const mvById = Object.fromEntries(gm.moves.map((m) => [m.moveId, m]));
  const unranked = {};
  for (const sid of Object.keys(species)) {
    if (ranked.has(sid)) continue;
    const p = byId[sid]; if (!p) continue;
    const b = p.baseStats || { atk: 0, def: 0, hp: 0 };
    const maxCp = Math.max(10, Math.floor(((b.atk + 15) * Math.sqrt(b.def + 15) * Math.sqrt(b.hp + 15) * CPM50 * CPM50) / 10));
    const eliteSet = new Set([...(p.eliteMoves || []), ...(p.legacyMoves || [])]);
    unranked[sid] = {
      dex: p.dex, types: species[sid].types, n: species[sid].n, stats: b, maxCp,
      reason: maxCp < 1500 ? "cp" : "unlisted",
      fast: (p.fastMoves || []).filter((m) => mvById[m]?.energyGain > 0).map((m) => ({ id: m, gain: mvById[m].energyGain, turns: mvById[m].turns || 1 })),
      charged: (p.chargedMoves || []).filter((m) => mvById[m]?.energy > 0).map((m) => ({ id: m, energy: mvById[m].energy })),
      ...(eliteSet.size ? { elite: [...eliteSet] } : {}),
      ...(p.family?.parent ? { parent: p.family.parent } : {}),
      ...(p.family?.evolutions?.length ? { evo: p.family.evolutions } : {}),
    };
  }
  writeFileSync(join(GBL, "gbl_unranked.json"), JSON.stringify(unranked));
  const cp = Object.values(unranked).filter((u) => u.reason === "cp").length;
  console.log(`gbl_unranked.json — 랭킹 밖 ${Object.keys(unranked).length}종 (CP 미달 ${cp} · 랭킹 미수록 ${Object.keys(unranked).length - cp})`);
}
const fast = moves.filter((m) => m.kind === "fast").length;
console.log(`gbl_moves.json — 기술 ${moves.length} (빠른 ${fast} · 차지 ${moves.length - fast}) · 포켓몬 ${Object.keys(species).length} · gm ${gm.timestamp}`);
const noName = moves.filter((m) => LANGS.some((l) => !m.n[l] || m.n[l] === m.id));
if (noName.length) console.log(`[warn] 이름 누락 ${noName.length}: ${noName.slice(0, 8).map((m) => m.id).join(", ")}`);
