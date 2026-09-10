// IndexNow 제출 스크립트 — 사이트맵의 전 URL을 Bing·Naver 등에 즉시 색인 요청.
// 새 페이지 추가/대량 변경 후 실행:
//   node scripts/indexnow.mjs                 → gblnote.com(기본)
//   node scripts/indexnow.mjs tcgnote.net     → tcgnote.net
//   node scripts/indexnow.mjs tcgnote.net https://tcgnote.net/tcg ...  → 특정 URL만
// IndexNow는 Bing/Yandex/Naver/Seznam가 공유하는 프로토콜 — 한 번 제출로 모두에 전달됨(구글은 미지원).

// host별 IndexNow 키(키파일은 public/<key>.txt, 두 도메인 공유 서빙).
const KEYS = {
  "gblnote.com": "8c5c82349e896a340f9b20597e2c6472",
  "tcgnote.net": "6bcae8955974b0a4c2c29d0ca5036e90",
};
const args0 = process.argv.slice(2);
const HOST = (args0.find((a) => !a.startsWith("http")) || "gblnote.com").replace(/^https?:\/\//, "");
const KEY = KEYS[HOST];
if (!KEY) { console.error(`알 수 없는 host: ${HOST} (등록된 host: ${Object.keys(KEYS).join(", ")})`); process.exit(1); }
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

async function sitemapUrls() {
  const res = await fetch(`https://${HOST}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a.startsWith("http"));
  const urlList = args.length ? args : await sitemapUrls();
  if (!urlList.length) { console.error("제출할 URL이 없습니다."); process.exit(1); }
  console.log(`IndexNow 제출: ${urlList.length}개 URL → ${ENDPOINT}`);

  // IndexNow는 요청당 최대 10,000 URL. 넉넉히 배치.
  const BATCH = 9000;
  for (let i = 0; i < urlList.length; i += BATCH) {
    const chunk = urlList.slice(i, i + BATCH);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: chunk }),
    });
    const body = await res.text();
    // 200/202 = 접수됨. 403 = 키 검증 실패(키 파일 배포 확인). 422 = URL/host 불일치.
    console.log(`배치 ${i / BATCH + 1}: HTTP ${res.status} ${body || "(no body)"}`);
  }
  console.log("완료. (색인 반영엔 검색엔진별로 시간이 걸립니다)");
}

main().catch((e) => { console.error(e); process.exit(1); });
