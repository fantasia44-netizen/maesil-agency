// pull 후 .claude/settings.local.json 합치기 — 원격(방금 받은 것)의 허용 목록 뒤에 이 PC에만 있던 항목을 덧붙인다(합집합, 순서 유지).
const fs = require("fs");
const [, , pulledPath, localBackupPath] = process.argv;
const raw = fs.readFileSync(pulledPath, "utf8");
const pulled = JSON.parse(raw);
const local = JSON.parse(fs.readFileSync(localBackupPath, "utf8"));

for (const k of ["allow", "deny", "ask"]) {
  const a = pulled.permissions?.[k] || [], b = local.permissions?.[k] || [];
  if (!a.length && !b.length) continue;
  const seen = new Set(a);
  const add = b.filter((x) => !seen.has(x));
  pulled.permissions[k] = [...a, ...add];
  console.log(`${k}: 원격 ${a.length} + 이 PC 전용 ${add.length} = ${pulled.permissions[k].length}`);
}
// 원본 파일의 줄바꿈·끝 개행 유지
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
let out = JSON.stringify(pulled, null, 2);
if (eol === "\r\n") out = out.replace(/\n/g, "\r\n");
if (/\r?\n$/.test(raw)) out += eol;
fs.writeFileSync(pulledPath, out);

// 검증: 양쪽 항목이 하나도 빠지지 않았는지
const merged = JSON.parse(fs.readFileSync(pulledPath, "utf8"));
const m = new Set(merged.permissions.allow);
const missLocal = (local.permissions.allow || []).filter((x) => !m.has(x)).length;
const missPulled = (JSON.parse(raw).permissions.allow || []).filter((x) => !m.has(x)).length;
console.log(`검증 — 빠진 항목: 이 PC ${missLocal} · 원격 ${missPulled} · 중복 ${merged.permissions.allow.length - m.size}`);
