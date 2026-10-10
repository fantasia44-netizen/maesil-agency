// 측정용 묶음 사이트맵 — /sitemap.xml(전체)은 그대로 두고, 같은 주소를 언어별 · 유형별로 나눈 사이트맵을 따로 낸다.
// 서치 콘솔에 /sitemaps/index.xml 하나를 제출하면 묶음마다 색인 수를 따로 볼 수 있다("어느 언어 · 어느 유형이 색인되는가").
// 주소 목록은 app/sitemap.ts의 결과를 그대로 나눠 쓴다(목록이 두 곳에서 따로 놀지 않게). gblnote 전용.
//   /sitemaps/index.xml      묶음 목록(사이트맵 색인)
//   /sitemaps/lang-<언어>.xml  ko · en · ja · zh-TW
//   /sitemaps/type-<유형>.xml  hub · pokemon · moves · raid-moves · boss · iv · guide · news
import { headers } from "next/headers";
import sitemap from "../../sitemap";

export const dynamic = "force-dynamic";
const BASE = "https://gblnote.com";
const LANGS = ["ko", "en", "ja", "zh-TW"] as const;
const TYPES = ["hub", "pokemon", "moves", "raid-moves", "boss", "iv", "guide", "news"] as const;

function classify(url: string): { lang: string; type: string } {
  let p = url.replace(BASE, "");
  const m = /^\/(en|ja|zh-TW)(?=\/|$)/.exec(p);
  const lang = m ? m[1] : "ko";
  if (m) p = p.slice(m[0].length);
  const type = /^\/gbl\/pokemon\//.test(p) ? "pokemon"
    : /^\/gbl\/raid\/moves\/./.test(p) ? "raid-moves"
    : /^\/gbl\/moves\/./.test(p) ? "moves"
    : /^\/gbl\/raid\/boss\/./.test(p) ? "boss"
    : /^\/gbl\/iv\/./.test(p) ? "iv"
    : /^\/gbl\/guide\/./.test(p) ? "guide"
    : /^\/gbl\/news\/./.test(p) ? "news"
    : "hub";
  return { lang, type };
}
const xml = (body: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export function GET(_req: Request, { params }: { params: { name: string } }) {
  const host = (headers().get("host") || "").toLowerCase();
  if (host.includes("tcgnote")) return new Response("Not found", { status: 404 });
  const name = params.name.replace(/\.xml$/, "");
  const names = [...LANGS.map((l) => `lang-${l}`), ...TYPES.map((t) => `type-${t}`)];
  if (name === "index") {
    return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${names.map((n) => `<sitemap><loc>${BASE}/sitemaps/${n}.xml</loc></sitemap>`).join("\n")}\n</sitemapindex>\n`);
  }
  if (!names.includes(name)) return new Response("Not found", { status: 404 });
  const [kind, key] = [name.slice(0, 4), name.slice(5)];
  const rows = sitemap().filter((e) => { const c = classify(e.url); return kind === "lang" ? c.lang === key : c.type === key; });
  const body = rows.map((e) => `<url><loc>${esc(e.url)}</loc>${e.lastModified ? `<lastmod>${new Date(e.lastModified).toISOString()}</lastmod>` : ""}</url>`).join("\n");
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
}
