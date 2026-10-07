"use client";
// 기술 도감 표 — 종류 탭(차지/빠른) · 타입 필터 · 이름 검색 · 머리글 정렬 · 타입별 트리 보기.
// 행 데이터는 서버(page.tsx)에서 이름·수치를 다 풀어 plain row로 받는다(스냅샷 JSON을 클라 번들에 싣지 않음).
// 두 종류 표를 모두 SSR로 내보내고 display로만 전환 → 비활성 탭의 기술 링크도 HTML에 존재.
import Link from "next/link";
import { useMemo, useState } from "react";
import { TYPE_COLOR } from "../typeLabels";

export type MoveRow = {
  slug: string; href: string; name: string; alt: string; type: string; typeLabel: string; kind: "fast" | "charged";
  power: number; energy: number; gain: number; turns: number; dpt: number; ept: number; dpe: number; effect: string; users: number; learners: number;
};
export type TableLabels = {
  kindFast: string; kindCharged: string; viewTable: string; viewTree: string; all: string; searchPh: string; sortHint: string; noResult: string;
  colName: string; colType: string; power: string; energyCost: string; energyGain: string; turns: string; effect: string; colUsers: string; colLearners: string;
  shown: string; // "{t}개 중 {n}개" — {n}/{t} 치환
};
type Col = { key: keyof MoveRow; label: string; num?: boolean; title?: string };

const BORDER = "#e3e8f2";
const th: React.CSSProperties = { padding: "7px 6px", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", whiteSpace: "nowrap", borderBottom: `1px solid ${BORDER}`, background: "#f8fafc", cursor: "pointer", userSelect: "none" };
const td: React.CSSProperties = { padding: "6px 6px", fontSize: "0.78rem", color: "#334155", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" };

function TypeChip({ type, label, small }: { type: string; label: string; small?: boolean }) {
  const c = TYPE_COLOR[type] || "#94a3b8";
  return <span style={{ fontSize: small ? "0.6rem" : "0.64rem", fontWeight: 700, color: "#fff", background: c, padding: "1px 6px", borderRadius: 6, whiteSpace: "nowrap" }}>{label}</span>;
}

function KindTable({ rows, cols, visible, noResult }: { rows: MoveRow[]; cols: Col[]; visible: boolean; noResult: string }) {
  const [sort, setSort] = useState<{ key: keyof MoveRow; dir: 1 | -1 }>({ key: "users", dir: -1 });
  const sorted = useMemo(() => {
    const k = sort.key;
    return [...rows].sort((a, b) => {
      const x = a[k], y = b[k];
      const d = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return d * sort.dir || b.users - a.users || a.name.localeCompare(b.name);
    });
  }, [rows, sort]);
  const onSort = (key: keyof MoveRow, num?: boolean) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: num ? -1 : 1 }));
  return (
    <div style={{ display: visible ? "block" : "none", overflowX: "auto", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={String(c.key)} title={c.title} onClick={() => onSort(c.key, c.num)} style={{ ...th, textAlign: c.num ? "right" : "left" }}>
                {c.label}{sort.key === c.key ? (sort.dir === -1 ? " ▼" : " ▲") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && <tr><td colSpan={cols.length} style={{ ...td, textAlign: "center", color: "#94a3b8", padding: "1.6rem" }}>{noResult}</td></tr>}
          {sorted.map((r) => (
            <tr key={r.slug}>
              {cols.map((c) => {
                if (c.key === "name") return <td key="name" style={td}><Link href={r.href} style={{ color: "#1d4ed8", fontWeight: 700, textDecoration: "none" }}>{r.name}</Link></td>;
                if (c.key === "type") return <td key="type" style={td}><TypeChip type={r.type} label={r.typeLabel} /></td>;
                if (c.key === "effect") return <td key="effect" style={{ ...td, fontSize: "0.7rem", color: "#64748b", whiteSpace: "normal", minWidth: 120 }}>{r.effect}</td>;
                const v = r[c.key];
                return <td key={String(c.key)} style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: c.key === "dpe" || c.key === "ept" || c.key === "dpt" ? 700 : 500 }}>{typeof v === "number" && v === 0 && (c.key === "users") ? "–" : v}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MovesTable({ rows, types, labels }: { rows: MoveRow[]; types: { key: string; label: string }[]; labels: TableLabels }) {
  const [kind, setKind] = useState<"charged" | "fast">("charged");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"table" | "tree">("table");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => (!type || r.type === type) && (!ql || r.name.toLowerCase().includes(ql) || r.alt.toLowerCase().includes(ql)));
  }, [rows, type, q]);
  const fast = filtered.filter((r) => r.kind === "fast"), charged = filtered.filter((r) => r.kind === "charged");
  const total = rows.filter((r) => r.kind === kind).length, shown = (kind === "fast" ? fast : charged).length;

  const fastCols: Col[] = [
    { key: "name", label: labels.colName }, { key: "type", label: labels.colType },
    { key: "power", label: labels.power, num: true }, { key: "gain", label: labels.energyGain, num: true }, { key: "turns", label: labels.turns, num: true },
    { key: "dpt", label: "DPT", num: true }, { key: "ept", label: "EPT", num: true },
    { key: "users", label: labels.colUsers, num: true }, { key: "learners", label: labels.colLearners, num: true },
  ];
  const chargedCols: Col[] = [
    { key: "name", label: labels.colName }, { key: "type", label: labels.colType },
    { key: "power", label: labels.power, num: true }, { key: "energy", label: labels.energyCost, num: true }, { key: "dpe", label: "DPE", num: true },
    { key: "effect", label: labels.effect },
    { key: "users", label: labels.colUsers, num: true }, { key: "learners", label: labels.colLearners, num: true },
  ];
  const tab = (on: boolean): React.CSSProperties => ({ padding: "7px 14px", borderRadius: 16, fontSize: "0.82rem", fontWeight: 800, cursor: "pointer", border: `1px solid ${on ? "#0f172a" : BORDER}`, background: on ? "#0f172a" : "#fff", color: on ? "#fff" : "#64748b" });
  const chip = (on: boolean, c?: string): React.CSSProperties => ({ padding: "4px 10px", borderRadius: 14, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", border: `1px solid ${on ? (c || "#3b5bdb") : BORDER}`, background: on ? (c || "#3b5bdb") : "#fff", color: on ? "#fff" : "#64748b" });

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <button onClick={() => setKind("charged")} style={tab(kind === "charged")}>{labels.kindCharged} {rows.filter((r) => r.kind === "charged").length}</button>
        <button onClick={() => setKind("fast")} style={tab(kind === "fast")}>{labels.kindFast} {rows.filter((r) => r.kind === "fast").length}</button>
        <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button onClick={() => setView("table")} style={chip(view === "table")}>{labels.viewTable}</button>
          <button onClick={() => setView("tree")} style={chip(view === "tree")}>{labels.viewTree}</button>
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.searchPh}
          style={{ flex: "1 1 200px", fontSize: "0.85rem", padding: "7px 11px", borderRadius: 9, border: `1px solid ${BORDER}`, background: "#fff", color: "#0f172a" }} />
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
        <button onClick={() => setType("")} style={chip(type === "")}>{labels.all}</button>
        {types.map((t) => <button key={t.key} onClick={() => setType(type === t.key ? "" : t.key)} style={chip(type === t.key, TYPE_COLOR[t.key])}>{t.label}</button>)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#94a3b8", marginBottom: 6 }}>
        <span>{labels.shown.replace("{n}", String(shown)).replace("{t}", String(total))}</span>
        {view === "table" && <span>{labels.sortHint}</span>}
      </div>

      {/* 표 보기 — 두 종류 모두 DOM에 유지(링크 SSR) */}
      <div style={{ display: view === "table" ? "block" : "none" }}>
        <KindTable rows={charged} cols={chargedCols} visible={kind === "charged"} noResult={labels.noResult} />
        <KindTable rows={fast} cols={fastCols} visible={kind === "fast"} noResult={labels.noResult} />
      </div>

      {/* 타입별 트리 보기 — 타입 › 기술(메타 채용 많은 순). 전환했을 때만 렌더 */}
      {view === "tree" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {types.filter((t) => !type || t.key === type).map((t) => {
            const list = (kind === "fast" ? fast : charged).filter((r) => r.type === t.key).sort((a, b) => b.users - a.users || a.name.localeCompare(b.name));
            if (!list.length) return null;
            const c = TYPE_COLOR[t.key] || "#94a3b8";
            return (
              <div key={t.key} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `4px solid ${c}`, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <TypeChip type={t.key} label={t.label} /><span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{list.length}</span>
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {list.map((r) => (
                    <Link key={r.slug} href={r.href} style={{ fontSize: "0.74rem", fontWeight: 600, padding: "2px 9px", borderRadius: 10, textDecoration: "none", background: c + "18", color: c, border: `1px solid ${c}44`, whiteSpace: "nowrap" }}>
                      {r.name}{r.users > 0 && <span style={{ marginLeft: 4, fontSize: "0.62rem", opacity: 0.75 }}>{r.users}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          {(kind === "fast" ? fast : charged).length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: "1.6rem" }}>{labels.noResult}</div>}
        </div>
      )}
    </div>
  );
}
