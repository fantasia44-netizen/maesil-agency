// 운영자 실전 평가 노트 가져오기 — 레포 루트 GBL_MON_NOTES.csv(사람이 엑셀로 작성) → app/[lang]/gbl/gbl_mon_notes.json
// 컬럼: league / id / name_ko / tier / score / note_ko   (note_ko 비어있으면 그 몬은 건너뜀 → 페이지에 블록 미노출)
// 엑셀 대응: .csv(쉼표) 또는 .tsv(탭) 자동 감지, UTF-8(BOM)·UTF-16·cp949 인코딩 자동 감지, 셀 따옴표("...", "")·셀 안 줄바꿈 처리.
// 기존 JSON의 en/ja/zh-TW 번역은 보존, ko만 갱신. 실행: cd frontend && node scripts/gbl/import_mon_notes.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "../../..");
const SRC = ["GBL_MON_NOTES.csv", "GBL_MON_NOTES.tsv"].map((f) => join(ROOT, f)).find(existsSync);
const OUT = join(__dir, "../../app/[lang]/gbl/gbl_mon_notes.json");
if (!SRC) throw new Error("레포 루트에 GBL_MON_NOTES.csv(또는 .tsv)가 없습니다");

// 인코딩 자동 감지 — 엑셀 기본 저장(cp949), 'CSV UTF-8'(BOM), '유니코드 텍스트'(UTF-16LE) 전부 수용
function decode(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.toString("utf16le").replace(/^﻿/, "");
  if (buf[0] === 0xfe && buf[1] === 0xff) { const sw = Buffer.alloc(buf.length); for (let i = 0; i + 1 < buf.length; i += 2) { sw[i] = buf[i + 1]; sw[i + 1] = buf[i]; } return sw.toString("utf16le").replace(/^﻿/, ""); }
  const u8 = buf.toString("utf8");
  if (!u8.includes("�")) return u8.replace(/^﻿/, "");
  try { return new TextDecoder("euc-kr").decode(buf); } catch { return u8; } // WHATWG euc-kr = cp949 전체 한글
}

// 따옴표 인식 구분자 파서 — "..." 안의 구분자·줄바꿈은 셀 내용으로, "" 는 " 로
function parseDelimited(text, delim) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"' && cell === "") { q = true; continue; }
    if (c === delim) { row.push(cell); cell = ""; continue; }
    if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

const text = decode(readFileSync(SRC));
const firstLine = text.split(/\r?\n/, 1)[0];
const delim = firstLine.includes("\t") ? "\t" : ",";
const rows = parseDelimited(text, delim);
const header = rows[0].map((h) => h.trim().toLowerCase());
const iL = header.indexOf("league"), iI = header.indexOf("id"), iN = header.indexOf("note_ko");
if (iL < 0 || iI < 0 || iN < 0) throw new Error(`헤더에 league/id/note_ko 필요 (현재: ${header.join(" | ")})`);

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const notes = { great: {}, ultra: {}, master: {} };
let filled = 0, skipped = 0; const bad = [];
for (const r of rows.slice(1)) {
  const league = (r[iL] || "").trim(), id = (r[iI] || "").trim(), ko = (r[iN] || "").trim().replace(/\r/g, "");
  if (!league || !id) continue;
  if (!notes[league]) { bad.push(`${league}/${id}`); continue; }
  if (!ko) { skipped++; continue; }
  notes[league][id] = { ...(prev[league]?.[id] || {}), ko };
  filled++;
}
writeFileSync(OUT, JSON.stringify(notes, null, 1));
console.log(`[${SRC.split(/[\\/]/).pop()} · ${delim === "\t" ? "탭" : "쉼표"}] 노트 반영 ${filled}마리 (미작성 ${skipped}${bad.length ? `, 리그 인식 실패 ${bad.length}: ${bad.slice(0, 3).join(", ")}` : ""}) → gbl_mon_notes.json`);
