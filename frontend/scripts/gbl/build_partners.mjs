// GBL Note 추천 파트너 산출 — 메타몬(gbl_meta_mons.json) 각각에 대해 "이 몬의 주요 카운터를 이기는 메타몬" 상위 3.
// 데이터: gbl_detail.json(PvPoke 시뮬 매치업: counters=이 몬을 이기는 상대 5, r=이 몬 기준 레이팅 <500).
// 산식: 몬 A의 카운터 C마다 위협도 w(C)=(500-r_AC)/500 → C의 counters(=C를 이기는 몬)에 있는 메타몬 B에
//       w(C)×((500-r_CB)/500) 누적(+ B 티어점수 소폭 보정) → 상위 3. 같은 종(그림자/기본)은 1마리만.
// 산출물: app/[lang]/gbl/gbl_partners.json {league:{id:{p:[{id,covers:[...]}], note?:{ko,en,ja,"zh-TW"}}}}
//         (note는 import_party_notes.mjs가 채움 — 재실행 시 보존)  + _party_tmp.csv(UTF-8; write_party_csv.py가 cp949 CSV로)
// 실행: node scripts/gbl/build_partners.mjs && py scripts/gbl/write_party_csv.py
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const GBL = join(__dir, "../../app/[lang]/gbl");
const D = JSON.parse(readFileSync(join(GBL, "gbl_detail.json"), "utf8"));
const M = JSON.parse(readFileSync(join(GBL, "gbl_meta_mons.json"), "utf8")).leagues;
const OUT = join(GBL, "gbl_partners.json");
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const base = (id) => id.replace(/_shadow$/, "");
const TOP = 3;

const out = {}; const csv = [["league", "id", "name_ko", "partner1", "partner2", "partner3", "covers", "party_note"]];
for (const league of Object.keys(M)) {
  const meta = new Set(M[league]); const det = Object.fromEntries((D[league] || []).map((e) => [e.id, e]));
  out[league] = {};
  for (const aId of M[league]) {
    const A = det[aId]; if (!A) continue;
    const score = new Map(), covers = new Map();
    for (const c of A.counters || []) {
      const C = det[c.id]; if (!C) continue;
      const w = Math.max(0.1, (500 - c.r) / 500) * (meta.has(c.id) ? 1 : 0.5);
      for (const b of C.counters || []) {
        if (!meta.has(b.id) || base(b.id) === base(aId)) continue;
        const s = w * Math.max(0.1, (500 - b.r) / 500);
        score.set(b.id, (score.get(b.id) || 0) + s);
        if (!covers.has(b.id)) covers.set(b.id, []); covers.get(b.id).push(c.id);
      }
    }
    // 티어 점수 보정 + 같은 종 중복 제거 → 상위 3
    const ranked = [...score.entries()].map(([id, s]) => [id, s + 0.1 * ((det[id]?.score || 0) / 100)]).sort((x, y) => y[1] - x[1]);
    const picks = [], seen = new Set();
    for (const [id] of ranked) { if (seen.has(base(id))) continue; seen.add(base(id)); picks.push({ id, covers: covers.get(id) || [] }); if (picks.length === TOP) break; }
    // 부족하면 메타 상위 점수몬으로 보충(커버 없음)
    if (picks.length < TOP) for (const e of [...(D[league] || [])].filter((e) => meta.has(e.id) && base(e.id) !== base(aId)).sort((x, y) => y.score - x.score)) { if (seen.has(base(e.id))) continue; seen.add(base(e.id)); picks.push({ id: e.id, covers: [] }); if (picks.length === TOP) break; }
    out[league][aId] = { p: picks, ...(prev[league]?.[aId]?.note ? { note: prev[league][aId].note } : {}) };
    const nm = (id) => det[id]?.ko || id;
    csv.push([league, aId, nm(aId), ...picks.map((p) => nm(p.id)), picks.map((p) => p.covers.map(nm).join("·")).join(" / "), ""]);
  }
}
writeFileSync(OUT, JSON.stringify(out, null, 1));
const q = (v) => (/[,"\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
writeFileSync(join(__dir, "../../../_party_tmp.csv"), "﻿" + csv.map((r) => r.map(q).join(",")).join("\r\n") + "\r\n", "utf8");
console.log("파트너 산출:", Object.entries(out).map(([l, o]) => `${l} ${Object.keys(o).length}`).join(" · "), "→ gbl_partners.json, _party_tmp.csv");
