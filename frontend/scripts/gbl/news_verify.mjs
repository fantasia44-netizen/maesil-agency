// 뉴스 글 발행 전·후 검증 — 글 하나가 제대로 렌더되는지, 글 안의 내부 링크가 전부 살아 있는지 확인한다.
//   발행 전(로컬 dev):  node scripts/gbl/news_verify.mjs http://localhost:3000 <slug> [<slug> ...]
//   발행 후(실서버):    node scripts/gbl/news_verify.mjs https://gblnote.com <slug> [<slug> ...]
// 하나라도 실패하면 종료 코드 1 — 실패한 글은 발행하지 않는다.
const [base, ...slugs] = process.argv.slice(2);
if (!base || !slugs.length) { console.error("사용: node scripts/gbl/news_verify.mjs <base> <slug> [...]"); process.exit(2); }
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";
const get = (p, redirect = "manual") => fetch(base + p, { headers: { "user-agent": UA }, redirect });
const live = /gblnote\.com/.test(base);
let fail = 0;
const bad = (m) => { fail++; console.log("  ✗ " + m); };
const ok = (m) => console.log("  ✔ " + m);

for (const slug of slugs) {
  console.log(`■ ${slug}`);
  const r = await get(`/gbl/news/${slug}`);
  if (r.status !== 200) { bad(`글 페이지 HTTP ${r.status}`); continue; }
  const html = await r.text();
  const text = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
  if (/\[\[|\]\]/.test(text)) bad("[[링크]] 문법이 풀리지 않고 그대로 보임"); else ok("링크 문법 정상");
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(text)) bad("본문에 undefined/NaN/[object Object]"); else ok("깨진 값 없음");
  if (!/"@type":"NewsArticle"/.test(html)) bad("NewsArticle 구조화 데이터 없음"); else ok("구조화 데이터 있음");
  const title = (html.match(/<title>([^<]*)/) || [])[1] || "";
  if (!title || /^GBL Note$/.test(title.trim())) bad("제목이 비어 있음"); else ok(`제목: ${title.slice(0, 60)}`);
  if (/<meta name="robots"[^>]*noindex/.test(html)) bad("noindex가 붙어 있음");
  // 자동 블록이 조용히 비지 않았는지 — 글 소스에 boss/counters/raidTop/dex 블록이 있으면 렌더에도 표·카드가 있어야 한다(대략 검사)
  const body = (html.match(/<article[\s\S]*?<\/article>/) || [""])[0];
  if (body.length < 1500) bad(`본문이 너무 짧음(${body.length}자) — 블록이 비었을 수 있음`);
  // 본문 + 아래 도구 영역의 내부 링크
  const hrefs = [...new Set([...html.matchAll(/<a\b[^>]*\bhref="(\/gbl\/[^"#?]*)/g)].map((m) => m[1]))];
  let dead = 0;
  for (let i = 0; i < hrefs.length; i += 5) await Promise.all(hrefs.slice(i, i + 5).map(async (h) => { const x = await get(h); if (x.status !== 200) { dead++; bad(`내부 링크 ${x.status}: ${h}`); } }));
  if (!dead) ok(`내부 링크 ${hrefs.length}개 전부 200`);
}

// 목록·RSS·사이트맵에 실렸는지
const list = await (await get("/gbl/news", "follow")).text();
const rss = await (await get("/rss.xml", "follow")).text();
const sm = await (await fetch(base + "/sitemap.xml", { headers: { "user-agent": UA, ...(live ? {} : { host: "gblnote.com" }) } })).text();
for (const slug of slugs) {
  if (!list.includes(`/gbl/news/${slug}"`)) bad(`목록에 없음: ${slug}`);
  if (!rss.includes(`/gbl/news/${slug}<`)) bad(`RSS에 없음: ${slug}`);
  if (!sm.includes(`/gbl/news/${slug}<`)) bad(`사이트맵에 없음: ${slug}`);
}
if (!fail) console.log("\n전부 통과");
else console.log(`\n실패 ${fail}건`);
process.exit(fail ? 1 : 0);
