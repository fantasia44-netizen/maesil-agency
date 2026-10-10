// 뉴스 글 발행 전 검사 — 타입 검사 + 프로덕션 빌드를 한 명령으로(빌드가 글 페이지를 미리 렌더하므로 블록이 깨지면 여기서 실패한다).
// 예약 작업이 "cd … && … | grep …" 같은 이어 붙인 셸 명령 없이 돌 수 있게 만든 것. 저장소 어디에서 실행해도 된다.
//   node frontend/scripts/gbl/news_build.mjs        → 통과하면 종료 코드 0, 실패하면 1(마지막 출력 일부를 보여 준다)
// 빌드 앞뒤로 .next를 지운다(dev 서버가 쓰던 .next와 섞이면 꼬인다 — dev 서버는 미리 꺼 둘 것).
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const FE = join(dirname(fileURLToPath(import.meta.url)), "../..");
const clean = () => rmSync(join(FE, ".next"), { recursive: true, force: true });
function step(label, script, args) {
  const r = spawnSync(process.execPath, [join(FE, "node_modules", script), ...args], { cwd: FE, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.status !== 0) { console.log(`✗ ${label} 실패\n` + out.split(/\r?\n/).filter(Boolean).slice(-40).join("\n")); return false; }
  console.log(`✓ ${label} 통과`);
  return true;
}
let ok = step("타입 검사", "typescript/bin/tsc", ["--noEmit", "-p", "."]);
if (ok) { clean(); ok = step("빌드", "next/dist/bin/next", ["build"]); clean(); }
console.log(ok ? "전부 통과" : "실패 — 글을 고치거나 되돌릴 것");
process.exit(ok ? 0 : 1);
