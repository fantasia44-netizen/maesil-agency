// 운영자 실전 평가 노트 가져오기 — 레포 루트 GBL_MON_NOTES.tsv(사람이 작성) → app/[lang]/gbl/gbl_mon_notes.json
// TSV 컬럼: league / id / name_ko / tier / score / note_ko   (note_ko 비어있으면 그 몬은 건너뜀 → 페이지에 블록 미노출)
// 기존 JSON의 en/ja/zh-TW 번역은 보존, ko만 TSV로 갱신. 실행: node scripts/gbl/import_mon_notes.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const TSV = join(__dir, "../../../GBL_MON_NOTES.tsv");
const OUT = join(__dir, "../../app/[lang]/gbl/gbl_mon_notes.json");

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const notes = { great: {}, ultra: {}, master: {} };
const lines = readFileSync(TSV, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
const header = lines[0].split("\t");
const iL = header.indexOf("league"), iI = header.indexOf("id"), iN = header.indexOf("note_ko");
if (iL < 0 || iI < 0 || iN < 0) throw new Error("TSV 헤더에 league/id/note_ko 필요");

let filled = 0, skipped = 0;
for (const line of lines.slice(1)) {
  const c = line.split("\t");
  const league = c[iL]?.trim(), id = c[iI]?.trim(), ko = (c[iN] || "").trim();
  if (!league || !id || !notes[league]) continue;
  if (!ko) { skipped++; continue; }
  notes[league][id] = { ...(prev[league]?.[id] || {}), ko }; // en/ja/zh-TW 기존 번역 보존
  filled++;
}
writeFileSync(OUT, JSON.stringify(notes, null, 1));
console.log(`노트 반영 ${filled}마리 (미작성 ${skipped}) → ${OUT}`);
