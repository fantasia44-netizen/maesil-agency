// 카드명 현지화 공용 모듈 — gblnote pokedex_names(ko/en/ja/zh-TW) 재활용 + 접두/접미/변형 처리.
// cards.cjs(카드 DB)·ingest.cjs(덱리스트) 공용. 트레이너/특수명은 매핑 실패 → null(영어 유지).
const PKN = require("../../app/[lang]/gbl/pokedex_names.json");
const norm = (s) => s.replace(/’/g, "'"); // 곡선 아포스트로피(’)→직선(')
const NAME = {}; // en(lower, 정규화) → {ko,ja,tw}
for (const v of Object.values(PKN)) if (v.en) NAME[norm(v.en).toLowerCase()] = { ko: v.ko, ja: v.ja, tw: v["zh-TW"] };

// 트레이너/아이템 공식명 override(수기 검증) — 포켓몬 종족명 사전엔 없는 서포트·아이템.
// 원칙(사장님): "정확도 > 커버리지". 공식 로케일명을 교차검증한 것만 등재하고, 애매하면 미등재(영어 유지).
// 검증 근거: 캐릭터=포켓몬 위키/나무위키 설명 대조(예 초련=노랑체육관 에스퍼 관장=Sabrina),
//           아이템=프랜차이즈 불변 TCG 정식명(박사의 연구·몬스터볼·이상한사탕 등).
const TRAINER = {
  // ── 서포트(캐릭터) ──
  "Cyrus":               { ko: "태홍",       ja: "アカギ",           "zh-TW": "赤日" },
  "Sabrina":             { ko: "초련",       ja: "ナツメ",           "zh-TW": "娜姿" },
  "Erika":               { ko: "민화",       ja: "エリカ",           "zh-TW": "莉佳" },
  "Wallace":             { ko: "윤진",       ja: "ミクリ",           "zh-TW": "米可利" },
  "Korrina":             { ko: "코르니",     ja: "コルニ",           "zh-TW": "可爾妮" },
  "Cynthia":             { ko: "시로나",     ja: "シロナ",           "zh-TW": "竹蘭" },
  "Clemont":             { ko: "시트론",     ja: "シトロン",         "zh-TW": "希特隆" },
  "Mars":                { ko: "마르스",     ja: "マーズ",           "zh-TW": "火星" },
  // ── 아이템(프랜차이즈 불변 정식명) ──
  "Professor's Research":{ ko: "박사의 연구", ja: "博士の研究",       "zh-TW": "博士的研究" },
  "Poké Ball":           { ko: "몬스터볼",   ja: "モンスターボール", "zh-TW": "精靈球" },
  "Rare Candy":          { ko: "이상한사탕", ja: "ふしぎなアメ",     "zh-TW": "神奇糖果" },
  "Rocky Helmet":        { ko: "딱딱헬멧",   ja: "ゴツゴツメット",   "zh-TW": "凸凸頭盔" },
  "Poison Barb":         { ko: "독바늘",     ja: "どくバリ",         "zh-TW": "毒針" },
  // ── RaenonX(ptcgp.raenonx.cc) 이중언어 사전에서 추출한 공식 ko·ja명(인덱스+position 정렬, 앵커 검증).
  //    zh-TW는 RaenonX 미보유 → 영어 폴백. 일본어명이 한국어명의 정확성 교차검증(예 Wally=민진/ミツル).
  "Copycat":                    { ko: "흉내내기 아가씨", ja: "モノマネむすめ" },
  "Field Blower":               { ko: "필드블로어", ja: "フィールドブロアー" },
  "Lucky Ice Pop":              { ko: "뽑기 아이스", ja: "当たりつきアイス" },
  "Pokémon Center Lady":        { ko: "포켓몬센터 직원", ja: "ポケモンセンターのお姉さん" },
  "X Speed":                    { ko: "스피드업", ja: "スピーダー" },
  "Training Area":              { ko: "트레이닝 에리어", ja: "トレーニングエリア" },
  "Lisia":                      { ko: "루티아", ja: "ルチア" },
  "Giant Cape":                 { ko: "커다란망토", ja: "大きなマント" },
  "Deceptive Needle":           { ko: "사기바늘", ja: "いんちきバリ" },
  "Protective Poncho":          { ko: "수호의 판초", ja: "まもりのポンチョ" },
  "Leaf Cape":                  { ko: "리프망토", ja: "リーフマント" },
  "Fragrant Forest":            { ko: "달콤한 향기의 숲", ja: "あまくかおる森" },
  "Small Balloon":              { ko: "작은 풍선", ja: "小さなふうせん" },
  "Repel":                      { ko: "벌레회피스프레이", ja: "むしよけスプレー" },
  "Flame Patch":                { ko: "플레임패치", ja: "フレイムパッチ" },
  "Hiking Trail":               { ko: "하이킹 코스", ja: "ハイキングコース" },
  "Rainbow Cave":               { ko: "무지갯빛 동굴", ja: "にじいろの洞窟" },
  "Quick-Grow Extract":         { ko: "조숙엑기스", ja: "そうじゅくエキス" },
  "Starting Plains":            { ko: "시작의 평원", ja: "はじまりの平原" },
  "Elegant Cape":               { ko: "우아한 망토", ja: "ゆうがなマント" },
  "Soothing Shore":             { ko: "치유의 바닷가", ja: "いやしの海辺" },
  "Wally":                      { ko: "민진", ja: "ミツル" },
  "Professor Turo":             { ko: "투로박사", ja: "フトゥー博士" },
  "Team Rocket's Goo-zooka":    { ko: "로켓단의 끈적끈적 바주카", ja: "ロケット団のベトベトバズーカ" },
  "Arena of Antiquity":         { ko: "옛 투기장", ja: "いにしえの闘技場" },
  "Inflatable Boat":            { ko: "워터 보트", ja: "ウォーターボート" },
  "Clemont's Backpack":         { ko: "시트론의 륙색", ja: "シトロンのリュック" },
  "Clear Veil":                 { ko: "클리어 베일", ja: "クリアヴェール" },
  "Leaf":                       { ko: "리프", ja: "リーフ" },
  "Team Rocket's Boss":         { ko: "로켓단의 보스", ja: "ロケット団のボス" },
  "Kid's Room":                 { ko: "아이 방", ja: "こども部屋" },
  "May":                        { ko: "봄이", ja: "ハルカ" },
};
const TRAINER_NORM = {}; // norm+lower → {ko,ja,"zh-TW"}
for (const [en, loc] of Object.entries(TRAINER)) TRAINER_NORM[norm(en).toLowerCase()] = loc;
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
  // 트레이너/아이템 override 우선(검증된 공식명). 없으면 포켓몬 종족명 파싱으로 진행.
  const ov = TRAINER_NORM[norm(cardName).toLowerCase()];
  if (ov) return { ko: ov.ko, ja: ov.ja, "zh-TW": ov["zh-TW"] };
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

// 덱 아키타입명(복합) 현지화 — "Mega Lucario ex Lucario" 등 여러 포켓몬 결합명.
// 그리디 파싱: [접두] 베이스(최대3어) [X/Y변형] [ex] 를 반복. 한 컴포넌트라도 매칭 실패 시 null(영어 유지).
function locComp(pfxLoc, base, variant, ex) {
  const suf = ex ? "ex" : "";
  return {
    ko: (pfxLoc ? pfxLoc.ko : "") + base.ko + variant + (ex ? " ex" : ""),
    ja: (pfxLoc ? pfxLoc.ja : "") + base.ja + variant + suf,
    tw: (pfxLoc ? pfxLoc.tw : "") + base.tw + variant + suf,
  };
}
function localizeDeckName(name) {
  const words = norm(name).split(/\s+/).filter(Boolean);
  const comps = [];
  let i = 0;
  while (i < words.length) {
    let pfxLoc = null, j = i;
    for (const [en, loc] of PFX) {
      const pw = en.trim().split(/\s+/);
      if (words.slice(j, j + pw.length).join(" ") === en.trim()) { pfxLoc = loc; j += pw.length; break; }
    }
    let base = null, blen = 0;
    for (let len = Math.min(3, words.length - j); len >= 1; len--) {
      const cand = words.slice(j, j + len).join(" ").toLowerCase();
      if (NAME[cand] && NAME[cand].ko) { base = NAME[cand]; blen = len; break; }
    }
    if (!base) return null;
    j += blen;
    let variant = "";
    if (words[j] && /^[XY]$/.test(words[j])) { variant = " " + words[j]; j++; }
    let ex = false;
    if (words[j] && words[j].toLowerCase() === "ex") { ex = true; j++; }
    comps.push(locComp(pfxLoc, base, variant, ex));
    i = j;
  }
  if (!comps.length) return null;
  return { ko: comps.map((c) => c.ko).join(" "), ja: comps.map((c) => c.ja).join(" "), "zh-TW": comps.map((c) => c.tw).join(" ") };
}

module.exports = { localize, localizeDeckName };
