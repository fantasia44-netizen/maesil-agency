// 운영자 실전 평가 노트 가져오기 — 레포 루트 GBL_MON_NOTES.tsv(사람이 작성) → app/[lang]/gbl/gbl_mon_notes.json
// TSV 컬럼: league / id / name_ko / tier / score / note_ko   (note_ko 비어있으면 그 몬은 건너뜀 → 페이지에 블록 미노출)
// 엑셀 저장 대응: UTF-8(BOM)·UTF-16·cp949(euc-kr) 자동 감지, 셀 따옴표("...", "" 이스케이프)·셀 안 줄바꿈 처리.
// 기존 JSON의 en/ja/zh-TW 번역은 보존, ko만 TSV로 갱신. 실행: cd frontend && node scripts/gbl/import_mon_notes.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const TSV = join(__dir, "../../../GBL_MON_NOTES.tsv");
const OUT = join(__dir, "../../app/[lang]/gbl/gbl_mon_notes.json");

// 인코딩 자동 감지 — 엑셀 '유니코드 텍스트'(UTF-16LE), 메모장/VS Code(UTF-8 BOM), 엑셀 기본 저장(cp949) 전부 수용
function decode(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.toString("utf16le").replace(/^﻿/, "");
  if (buf[0] === 0xfe && buf[1] === 0xff) { const sw = Buffer.alloc(buf.length); for (let i = 0; i + 1 < buf.length; i += 2) { sw[i] = buf[i + 1]; sw[i + 1] = buf[i]; } return sw.toString("utf16le").replace(/^﻿/, ""); }
  const u8 = buf.toString("utf8");
  if (!u8.includes("�")) return u8.replace(/^﻿/, "");
  try { return new TextDecoder("euc-kr").decode(buf); } catch { return u8; }
}

// 따옴표 인식 TSV 파서 — "..." 안의 탭·줄바꿈은 셀 내용으로, "" 는 " 로
function parseTsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"' && cell === "") { q = true; continue; }
    if (c === "\t") { row.push(cell); cell = ""; continue; }
    if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const notes = { great: {}, ultra: {}, master: {} };
const rows = parseTsv(decode(readFileSync(TSV)));
const header = rows[0].map((h) => h.trim().toLowerCase());
const iL = header.indexOf("league"), iI = header.indexOf("id"), iN = header.indexOf("note_ko");
if (iL < 0 || iI < 0 || iN < 0) throw new Error(`TSV 헤더에 league/id/note_ko 필요 (현재: ${header.join(" | ")})`);

let filled = 0, skipped = 0; const bad = [];
for (const r of rows.slice(1)) {
  const league = (r[iL] || "").trim(), id = (r[iI] || "").trim(), ko = (r[iN] || "").trim().replace(/\r/g, "");
  if (!league || !id) continue;
  if (!notes[league]) { bad.push(`${league}/${id}`); continue; }
  if (!ko) { skipped++; continue; }
  notes[league][id] = { ...(prev[league]?.[id] || {}), ko }; // en/ja/zh-TW 기존 번역 보존
  filled++;
}
writeFileSync(OUT, JSON.stringify(notes, null, 1));
console.log(`노트 반영 ${filled}마리 (미작성 ${skipped}${bad.length ? `, 리그 인식 실패 ${bad.length}: ${bad.slice(0, 3).join(", ")}` : ""}) → ${OUT}`);
