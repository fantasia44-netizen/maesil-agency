// 뉴스 소재 뽑기 — 이벤트 피드(ScrapedDuck)에서 "앞으로 며칠 안에 쓸 만한 글"을 뽑아 사실관계와 함께 출력한다.
// 뉴스 글(app/[lang]/gbl/news/posts.ts)을 쓰기 전에 먼저 돌린다. 여기 나온 날짜·요일·speciesId를 그대로 쓰면 틀릴 일이 없다.
//   실행: cd frontend && node scripts/gbl/news_candidates.mjs [앞으로 볼 일수=14]
// "이미 씀" 판정: posts.ts의 slug와 covers에 그 소재 키가 있으면 제외. 새 글을 쓸 때 covers에 아래 "키"를 꼭 적는다.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const GBL = join(__dir, "../../app/[lang]/gbl");
const J = (f) => JSON.parse(readFileSync(join(GBL, f), "utf8"));
const DAYS = Number(process.argv[2] || 14);
const FEED = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json";

// ── 이미 쓴 소재
const postsSrc = readFileSync(join(GBL, "news/posts.ts"), "utf8");
const covered = new Set([...postsSrc.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]));
for (const m of postsSrc.matchAll(/covers:\s*\[([^\]]*)\]/g)) for (const k of m[1].matchAll(/"([^"]+)"/g)) covered.add(k[1]);
const manualSrc = readFileSync(join(GBL, "events/eventManual.ts"), "utf8");
const hasManual = (id) => manualSrc.includes(`"${id}"`);

// ── 이름 → speciesId (PvPoke 게임마스터의 표기와 토큰이 같으면 같은 종: "Mega Charizard X" = "Charizard (Mega X)")
const gm = J("sim/pvpoke/gamemaster_s28.json");
const species = J("gbl_moves.json").species;
const forms = new Set(J("gbl_forms.json").map((f) => f.id));
const PN = J("pokedex_names.json");
const tokens = (s) => s.toLowerCase().replace(/é/g, "e").split(/[^a-z0-9]+/).filter((w) => w && !["forme", "form", "the", "shadow"].includes(w)).sort().join(" ");
const BY_TOK = new Map();
for (const p of gm.pokemon) if (!p.speciesId.endsWith("_shadow") && !BY_TOK.has(tokens(p.speciesName))) BY_TOK.set(tokens(p.speciesName), p);
const resolve = (name) => { const p = BY_TOK.get(tokens(name)); if (!p) return null; const ok = !!species[p.speciesId] || forms.has(p.speciesId); return { sid: p.speciesId, dex: p.dex, ko: PN[String(p.dex)]?.ko || p.speciesName, usable: ok }; };

// ── 날짜: 피드의 시각은 대부분 "현지 벽시계"(타임존 없음). Z가 붙은 것만 UTC → 한국 시각으로 바꾼다.
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const parse = (s) => { const z = /Z$/.test(s); const d = new Date(z ? s : s + "Z"); return z ? new Date(d.getTime() + 9 * 3600e3) : d; };   // 값은 "벽시계를 UTC 필드에 담은" Date
const ko = (d) => { const h = d.getUTCHours(), m = d.getUTCMinutes(); const ap = h < 12 ? "오전" : "오후"; const h12 = h % 12 === 0 ? 12 : h % 12; return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${WD[d.getUTCDay()]}) ${ap} ${h12}시${m ? ` ${m}분` : ""}`; };
const ymd = (d) => d.toISOString().slice(0, 10);
const now = new Date(Date.now() + 9 * 3600e3);   // 한국 벽시계
const until = new Date(now.getTime() + DAYS * 864e5);

const feed = await (await fetch(FEED)).json();
const ev = feed.map((e) => ({ ...e, s: parse(e.start), e2: parse(e.end) })).filter((e) => e.e2 > now && e.s < until).sort((a, b) => a.s - b.s);
const tag = (key) => (covered.has(key) ? "  [이미 씀]" : "  [미작성]");

console.log(`오늘(한국 시각): ${ymd(now)} (${WD[now.getUTCDay()]}) · 앞으로 ${DAYS}일 · 피드 ${feed.length}건 중 해당 ${ev.length}건`);
console.log(`이미 쓴 소재 키 ${covered.size}개\n`);

console.log("■ A. 레이드 보스 공략 — slug: <sid>-raid-guide-<YYYY>-<MM>,  covers: [\"raid:<sid>:<YYYY-MM>\"]");
const hours = ev.filter((e) => e.eventType === "raid-hour");
for (const e of ev.filter((x) => x.eventType === "raid-battles")) {
  const kind = /Mega Raids/i.test(e.name) ? "메가" : /Shadow Raids/i.test(e.name) ? "섀도우" : "5성";
  for (const b of e.extraData?.raidbattles?.bosses || []) {
    const r = resolve(b.name);
    const key = r ? `raid:${r.sid}:${ymd(e.s).slice(0, 7)}` : `raid:?:${b.name}`;
    const rh = hours.find((h) => tokens(h.name.replace(/Raid Hour/i, "")) === tokens(b.name));
    console.log(`  · [${kind}] ${b.name}${r ? ` → sid "${r.sid}" (${r.ko}, 도감 ${r.dex})${r.usable ? "" : "  ⚠ 자동 블록 미지원 sid"}` : "  ⚠ sid 못 찾음"}${tag(key)}`);
    console.log(`      기간: ${ko(e.s)} ~ ${ko(e.e2)}${rh ? ` · 레이드 아워: ${ko(rh.s)} ~ ${ko(rh.e2).replace(/^.*\) /, "")}` : ""} · 이로치: ${b.canBeShiny ? "가능" : "피드에 표시 없음"}`);
    if (r) console.log(`      키: ${key}   slug: ${r.sid.replace(/_/g, "-")}-raid-guide-${ymd(e.s).slice(0, 7)}${kind === "섀도우" ? "   (섀도우 레이드 — 글에서 섀도우임을 밝힐 것)" : ""}`);
  }
}

console.log("\n■ B. 스포트라이트 아워 — slug: spotlight-hour-<YYYY-MM-DD>-<sid>,  covers: [\"<eventID>\"]");
for (const e of ev.filter((x) => x.eventType === "pokemon-spotlight-hour")) {
  const sp = e.extraData?.spotlight; const r = sp ? resolve(sp.name) : null;
  console.log(`  · ${e.name}${r ? ` → sid "${r.sid}" (${r.ko})` : "  ⚠ sid 못 찾음"}${tag(e.eventID)}`);
  console.log(`      시간: ${ko(e.s)} ~ ${ko(e.e2).replace(/^.*\) /, "")} (현지 시각) · 보너스(원문): ${sp?.bonus || "?"} · 이로치: ${sp?.canBeShiny ? "가능" : "표시 없음"}`);
  console.log(`      키: ${e.eventID}${r ? `   slug: spotlight-hour-${ymd(e.s)}-${r.sid.replace(/_/g, "-")}` : ""}`);
}

console.log("\n■ C. 커뮤니티 데이 — slug: community-day-<YYYY-MM>-<sid>,  covers: [\"<eventID>\"]");
for (const e of ev.filter((x) => x.eventType === "community-day")) {
  const cd = e.extraData?.communityday || {};
  const mons = (cd.spawns || []).map((s) => { const r = resolve(s.name); return r ? `${s.name}→"${r.sid}"(${r.ko})` : `${s.name}(sid ?)`; });
  console.log(`  · ${e.name}${tag(e.eventID)}`);
  console.log(`      시간: ${ko(e.s)} ~ ${ko(e.e2).replace(/^.*\) /, "")} (현지 시각) · 등장: ${mons.join(", ") || "피드에 없음(미공개)"}`);
  if ((cd.bonuses || []).length) console.log(`      보너스(원문): ${cd.bonuses.map((b) => b.text).join(" / ")}`);
  console.log(`      키: ${e.eventID}`);
}

console.log("\n■ D. 그 밖의 이벤트 — slug: 피드의 eventID 그대로,  covers: [\"<eventID>\"]");
const SKIP = new Set(["raid-battles", "raid-hour", "pokemon-spotlight-hour", "community-day", "go-battle-league", "season"]);
for (const e of ev.filter((x) => !SKIP.has(x.eventType))) {
  console.log(`  · [${e.eventType}] ${e.name}${tag(e.eventID)}`);
  console.log(`      기간: ${ko(e.s)} ~ ${ko(e.e2)} · 상세: ${hasManual(e.eventID) ? "events/eventManual.ts에 교차 확인된 내용 있음 → 그대로 써도 됨" : "피드엔 이름·기간뿐 → 공식 뉴스 등 2곳 이상에서 확인한 사실만 쓸 것(확인 못 하면 쓰지 않음)"}`);
  console.log(`      키: ${e.eventID}   출처 링크: ${e.link || "-"}`);
}

// 주간 일정 정리 — 이번 주 월요일 날짜가 키
const mon = new Date(now.getTime() - ((now.getUTCDay() + 6) % 7) * 864e5);
const wk = `weekly:${ymd(mon)}`;
console.log(`\n■ E. 주간 일정 정리 — slug: weekly-${ymd(mon)},  covers: ["${wk}"]${tag(wk)}`);
console.log(`    이번 주(${ymd(mon)} 월요일 시작)의 레이드·스포트라이트·커뮤니티 데이·이벤트를 위 A~D의 사실만으로 한 글에 정리. 주 1회.`);

console.log("\n■ GBL(배틀리그) 로테이션 — 글 소재가 아니라 참고용");
for (const e of ev.filter((x) => x.eventType === "go-battle-league")) console.log(`  · ${ko(e.s)} ~ ${ko(e.e2)} | ${e.name}`);
