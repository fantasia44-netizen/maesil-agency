// RSS 피드 — gblnote.com/rss.xml (뉴스 글, 한국어). 네이버 서치어드바이저의 "RSS 제출"용: 새 글을 올리면 수집이 빨라진다.
// 미들웨어는 점(.)이 든 경로를 그대로 통과시키므로 [lang] 트리 밖(루트)에 둔다. tcgnote.net 호스트에서는 404.
import { headers } from "next/headers";
import { postsFor, postContent } from "../[lang]/gbl/news/posts";
import { getNews } from "../[lang]/gbl/news/dict";

const SITE = "https://gblnote.com";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// 글 날짜(YYYY-MM-DD)는 한국 시각 오전 9시로 본다.
const rfc822 = (d: string) => new Date(`${d}T09:00:00+09:00`).toUTCString();

export function GET() {
  const host = (headers().get("host") || "").toLowerCase();
  if (host.includes("tcgnote")) return new Response("Not found", { status: 404 });
  const t = getNews("ko");
  const posts = postsFor("ko").slice(0, 50);
  const items = posts.map((p) => {
    const c = postContent(p, "ko")!;
    const url = `${SITE}/gbl/news/${p.slug}`;
    return `    <item>
      <title>${esc(c.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(c.desc)}</description>
      <category>${esc(t.cat[p.cat])}</category>
      <pubDate>${rfc822(p.published)}</pubDate>
    </item>`;
  }).join("\n");
  const last = posts[0] ? rfc822(posts[0].updated || posts[0].published) : new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(t.rssTitle)}</title>
    <link>${SITE}/gbl/news</link>
    <description>${esc(t.rssDesc)}</description>
    <language>ko</language>
    <lastBuildDate>${last}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=3600" } });
}
