// 폼 이름 사전 생성 — 게임마스터의 폼 speciesId(deoxys_defense·rotom_heat·lycanroc_midnight …) → 공식 폼 명칭 4개국어.
// 출처: PokeAPI pokemon-form(form_names: ko / ja-Hrkt / zh-Hant / en). PokeAPI에 없는 것만 MANUAL로 보충.
// 산출: app/[lang]/gbl/gbl_form_names.json  { speciesId: { ko, en, ja, "zh-TW", full?: true } }
//   · 값은 "폼 라벨"(디펜스폼) — 표시는 "테오키스 (디펜스폼)". full=true면 라벨 자체가 완성된 이름(히트로토무).
//   · 지역폼·메가·원시와 기존 접사(오리진·영물폼·검왕·방패왕·황혼의 갈기·새벽의 날개·역전의 용사·블랙·화이트)는 각 스크립트의 접사 규칙이 처리 → 여기선 제외.
// 실행: cd frontend && node scripts/gbl/build_form_names.mjs   (새 폼이 게임마스터에 추가됐을 때. 네트워크 필요)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const GBL = join(__dir, "../../app/[lang]/gbl");
const gm = JSON.parse(readFileSync(join(GBL, "sim/pvpoke/gamemaster_s28.json"), "utf8"));

const REGION = { alolan: "alola", galarian: "galar", hisuian: "hisui", paldean: "paldea" };
// 기존 접사 규칙이 이미 이름을 붙이는 폼 / 기본 폼이라 라벨 없이 두는 폼
const SKIP = new Set(["origin", "therian", "crowned_sword", "crowned_shield", "dusk_mane", "dawn_wings", "hero", "black", "white", "altered", "incarnate", "standard"]);
// (standard = 불비달마 기본 모드. 가라르 불비달마는 지역 접두만으로 충분 — "가라르의 모습" 라벨은 중복)
// speciesId → PokeAPI pokemon-form 슬러그(자동 변환이 안 맞는 것만)
const SLUG = {
  cherrim_sunny: "cherrim-sunshine", zygarde_10: "zygarde-10", oricorio_pau: "oricorio-pau",
};
// PokeAPI에 4개국어가 다 없거나 GO 전용 코스튬인 것 — 공식 표기 기준 수기.
const MANUAL = {
  // 팔데아 켄타로스 3종 — PvPoke id에 지역 토큰이 없어(tauros_combat) 완성형 이름으로.
  tauros_combat: { ko: "팔데아 켄타로스 (컴뱃종)", en: "Paldean Tauros (Combat Breed)", ja: "パルデアケンタロス（コンバットしゅ）", "zh-TW": "帕底亞肯泰羅（鬥戰種）", full: true },
  tauros_blaze: { ko: "팔데아 켄타로스 (블레이즈종)", en: "Paldean Tauros (Blaze Breed)", ja: "パルデアケンタロス（ブレイズしゅ）", "zh-TW": "帕底亞肯泰羅（火熾種）", full: true },
  tauros_aqua: { ko: "팔데아 켄타로스 (워터종)", en: "Paldean Tauros (Aqua Breed)", ja: "パルデアケンタロス（ウォーターしゅ）", "zh-TW": "帕底亞肯泰羅（水瀾種）", full: true },
  // PokeAPI에 zh-Hant 또는 ko가 빠진 폼 — 같은 계열의 공식 표기로 보충.
  burmy_plant: { ko: "초목도롱", en: "Plant Cloak", ja: "くさきのミノ", "zh-TW": "草木蓑衣" },
  burmy_sandy: { ko: "모래땅도롱", en: "Sandy Cloak", ja: "すなちのミノ", "zh-TW": "砂土蓑衣" },
  burmy_trash: { ko: "슈레도롱", en: "Trash Cloak", ja: "ゴミのミノ", "zh-TW": "垃圾蓑衣" },
  genesect_burn: { ko: "블레이즈카세트", en: "Burn Drive", ja: "ブレイズカセット", "zh-TW": "火焰卡帶" },
  genesect_chill: { ko: "프리즈카세트", en: "Chill Drive", ja: "フリーズカセット", "zh-TW": "冰凍卡帶" },
  genesect_douse: { ko: "아쿠아카세트", en: "Douse Drive", ja: "アクアカセット", "zh-TW": "水流卡帶" },
  genesect_shock: { ko: "번개카세트", en: "Shock Drive", ja: "イナズマカセット", "zh-TW": "閃電卡帶" },
  oinkologne_female: { ko: "암컷의 모습", en: "Female", ja: "メスのすがた", "zh-TW": "雌性的樣子" },
  tatsugiri_curly: { ko: "젖힌 모습", en: "Curly Form", ja: "そったすがた", "zh-TW": "上弓姿勢" },
  tatsugiri_droopy: { ko: "늘어진 모습", en: "Droopy Form", ja: "たれたすがた", "zh-TW": "下垂姿勢" },
  tatsugiri_stretchy: { ko: "뻗은 모습", en: "Stretchy Form", ja: "のびたすがた", "zh-TW": "平挺姿勢" },
  mewtwo_armored: { ko: "아머드 뮤츠", en: "Armored Mewtwo", ja: "アーマードミュウツー", "zh-TW": "裝甲超夢", full: true },
  pikachu_libre: { ko: "마스크드", en: "Libre", ja: "マスクド", "zh-TW": "面罩摔角手" },
  pikachu_pop_star: { ko: "아이돌", en: "Pop Star", ja: "アイドル", "zh-TW": "偶像" },
  pikachu_rock_star: { ko: "하드록", en: "Rock Star", ja: "ハードロック", "zh-TW": "硬搖滾" },
  pikachu_flying: { ko: "플라잉", en: "Flying", ja: "そらをとぶ", "zh-TW": "飛翔" },
  pikachu_5th_anniversary: { ko: "5주년", en: "5th Anniversary", ja: "5周年", "zh-TW": "5週年" },
  pikachu_horizons: { ko: "호라이즌 캡틴", en: "Horizons", ja: "キャプテン", "zh-TW": "地平線" },
  pikachu_kariyushi: { ko: "가리유시", en: "Kariyushi", ja: "かりゆし", "zh-TW": "嘉利吉" },
  pikachu_shaymin: { ko: "쉐이미 스카프", en: "Shaymin Scarf", ja: "シェイミスカーフ", "zh-TW": "謝米圍巾" },
};

// 같은 dex의 speciesId들에서 공통 접두(= 기본 종 슬러그)를 구해 폼 접미를 분리.
const pool = gm.pokemon.filter((p) => p.released && !(p.tags || []).includes("shadow") && !(p.tags || []).some((t) => t === "mega" || t === "supermega") && !/_primal$/.test(p.speciesId));
const byDex = {};
for (const p of pool) (byDex[p.dex] = byDex[p.dex] || []).push(p.speciesId);
const commonPrefix = (ids) => {
  const parts = ids.map((s) => s.split("_")); const out = [];
  for (let i = 0; i < parts[0].length; i++) { const t = parts[0][i]; if (parts.every((p) => p[i] === t)) out.push(t); else break; }
  return out.join("_");
};
const targets = []; // { sid, slug }
for (const [, ids] of Object.entries(byDex)) {
  if (ids.length < 2) continue;
  const base = commonPrefix(ids);
  if (!base) continue;
  for (const sid of ids) {
    if (sid === base) continue;
    const toks = sid.slice(base.length + 1).split("_");
    const region = toks.find((t) => REGION[t]);
    const form = toks.filter((t) => !REGION[t]).join("_");
    if (!form || SKIP.has(form)) continue;          // 지역폼만이거나 기존 접사·기본 폼
    const slug = SLUG[sid] || [base.replace(/_/g, "-"), region ? REGION[region] : null, form.replace(/_/g, "-")].filter(Boolean).join("-");
    targets.push({ sid, slug });
  }
}

const pick = (arr, ...langs) => { for (const l of langs) { const x = (arr || []).find((n) => n.language.name.toLowerCase() === l); if (x?.name) return x.name; } return ""; };
const out = {}, unresolved = [];
for (const { sid, slug } of targets) {
  if (MANUAL[sid]) { out[sid] = MANUAL[sid]; continue; }
  let j = null;
  try { const r = await fetch(`https://pokeapi.co/api/v2/pokemon-form/${slug}`); if (r.ok) j = await r.json(); } catch { /* 네트워크 오류 → unresolved */ }
  const n = j ? { ko: pick(j.form_names, "ko"), en: pick(j.form_names, "en"), ja: pick(j.form_names, "ja-hrkt", "ja"), "zh-TW": pick(j.form_names, "zh-hant") } : null;
  if (!n || !n.ko || !n.en || !n.ja || !n["zh-TW"]) { unresolved.push(`${sid}(${slug})${n ? " " + JSON.stringify(n) : " 404"}`); continue; }
  out[sid] = n;
}
// 라벨이 종 이름을 이미 포함(히트로토무·초목도롱 계열 등)하면 full 표시 — 호출부가 "기본명 (라벨)" 대신 라벨만 씀.
const PN = JSON.parse(readFileSync(join(GBL, "pokedex_names.json"), "utf8"));
const dexOf = Object.fromEntries(pool.map((p) => [p.speciesId, p.dex]));
for (const [sid, n] of Object.entries(out)) {
  if (n.full) continue;
  const b = PN[String(dexOf[sid])];
  if (b && n.ko.includes(b.ko) && n.en.includes(b.en)) n.full = true;
}
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(GBL, "gbl_form_names.json"), JSON.stringify(sorted, null, 1));
console.log(`gbl_form_names.json — 폼 ${Object.keys(sorted).length}개 (대상 ${targets.length})`);
if (unresolved.length) console.log(`[미해결 ${unresolved.length}] MANUAL 또는 SLUG에 추가 필요:\n  ` + unresolved.join("\n  "));
