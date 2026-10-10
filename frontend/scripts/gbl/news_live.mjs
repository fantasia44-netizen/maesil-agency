// 뉴스 글 발행 뒤 처리 — 배포 반영을 기다렸다가(최대 9분) 실서버 검증을 돌리고, 통과하면 IndexNow로 알린다. 한 명령으로.
//   node frontend/scripts/gbl/news_live.mjs <slug> [slug…]
// 종료 코드: 0 = 반영·검증·제출 완료 / 2 = 아직 반영 안 됨(잠시 뒤 같은 명령을 다시) / 1 = 검증 실패(글을 고치거나 되돌릴 것)
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const BASE = "https://gblnote.com";
const slugs = process.argv.slice(2);
if (!slugs.length) { console.error("사용: node frontend/scripts/gbl/news_live.mjs <slug> [slug…]"); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const live = async (slug) => { try { return (await fetch(`${BASE}/gbl/news/${slug}?cb=${Date.now()}`, { redirect: "manual" })).status === 200; } catch { return false; } };

let ready = false;
for (let i = 0; i < 27 && !ready; i++) {          // 20초 × 27 = 9분
  ready = (await Promise.all(slugs.map(live))).every(Boolean);
  if (!ready) await sleep(20000);
}
if (!ready) { console.log("아직 반영되지 않았습니다 — 잠시 뒤 같은 명령을 다시 실행하세요."); process.exit(2); }
console.log("배포 반영 확인:", slugs.join(", "));

const run = (script, args) => spawnSync(process.execPath, [script, ...args], { stdio: "inherit" }).status === 0;
if (!run(join(__dir, "news_verify.mjs"), [BASE, ...slugs])) { console.log("검증 실패 — 고쳐서 다시 올리거나 되돌릴 것"); process.exit(1); }
run(join(__dir, "../indexnow.mjs"), ["gblnote.com", ...slugs.map((s) => `${BASE}/gbl/news/${s}`), `${BASE}/gbl/news`]);
console.log("완료");
