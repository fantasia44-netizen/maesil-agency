// 파티 포인트 노트 가져오기 — 레포 루트 GBL_PARTY_NOTES.csv(party_note 열, 사람이 작성) → gbl_partners.json 의 note.ko
// 인코딩(UTF-8/UTF-16/cp949)·따옴표·셀 내 줄바꿈 자동 처리. 기존 en/ja/zh-TW 번역 보존. 그림자 폼은 기본 폼 노트 상속.
// 실행: cd frontend && node scripts/gbl/import_party_notes.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dir = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dir, "../../../GBL_PARTY_NOTES.csv");
const OUT = join(__dir, "../../app/[lang]/gbl/gbl_partners.json");
const MIN_LEN = 10;

function decode(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.toString("utf16le").replace(/^﻿/, "");
  const u8 = buf.toString("utf8");
  if (!u8.includes("�")) return u8.replace(/^﻿/, "");
  try { return new TextDecoder("euc-kr").decode(buf); } catch { return u8; }
}
function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"' && cell === "") { q = true; continue; }
    if (c === ",") { row.push(cell); cell = ""; continue; }
    if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

const P = JSON.parse(readFileSync(OUT, "utf8"));
const rows = parseCsv(decode(readFileSync(SRC)));
const h = rows[0].map((x) => x.trim().toLowerCase());
const iL = h.indexOf("league"), iI = h.indexOf("id"), iN = h.indexOf("party_note");
if (iL < 0 || iI < 0 || iN < 0) throw new Error("헤더에 league/id/party_note 필요");
let filled = 0, partial = 0;
for (const r of rows.slice(1)) {
  const league = (r[iL] || "").trim(), id = (r[iI] || "").trim(), ko = (r[iN] || "").trim().replace(/\r/g, "");
  if (!P[league]?.[id]) continue;
  if (!ko) { delete P[league][id].note; continue; }
  if (ko.length < MIN_LEN) { partial++; continue; }
  P[league][id].note = { ...(P[league][id].note || {}), ko }; filled++;
}
let inherited = 0;
for (const league of Object.keys(P)) for (const id of Object.keys(P[league])) {
  if (!id.endsWith("_shadow") || P[league][id].note) continue;
  const b = P[league][id.replace(/_shadow$/, "")]; if (b?.note) { P[league][id].note = { ...b.note }; inherited++; }
}
writeFileSync(OUT, JSON.stringify(P, null, 1));
console.log(`파티 노트 반영 ${filled} + 그림자 상속 ${inherited}${partial ? ` (미완성 제외 ${partial})` : ""} → gbl_partners.json`);
