"use client";
// 추천 기술배치 + 스킬 타수 — 빠른기술(노멀기) 선택 시 차지 타수를 즉석 재계산.
// 데이터: 서버(page.tsx)에서 이름·타입색 해석해 prop으로 전달. 타수만 클라 계산.
// 선택 상태(sel)는 상위(MovesetShare)에서 관리 — 공유/저장 카드와 동기화.

export type MoveDisp = { id: string; label: string; color: string };
export type FastOpt = MoveDisp & { gain: number; turns: number };
export type ChargedOpt = MoveDisp & { energy: number; rec: boolean };
export type PanelLabels = {
  fastLabel: string; chargedHint: string; energyUnit: string; hitsUnit: string;
  fastTurns: string; recTag: string; altFastHint: string;
};

// 연속 발동 시 타수 시퀀스(에너지 이월). taus_seq(파이썬)와 동일.
export function tausSeq(cost: number, gain: number, n = 5): number[] {
  if (!gain || !cost) return [];
  let energy = 0; const seq: number[] = [];
  for (let i = 0; i < n; i++) {
    const need = cost - energy;
    const t = need > 0 ? Math.ceil(need / gain) : 0;
    energy += t * gain - cost;
    seq.push(t);
  }
  return seq;
}

function Chip({ m, dim }: { m: MoveDisp; dim?: boolean }) {
  const c = m.color;
  return (
    <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 9px", borderRadius: 10, background: c + (dim ? "14" : "22"), color: c, border: `1px solid ${c}${dim ? "33" : "55"}`, whiteSpace: "nowrap", opacity: dim ? 0.85 : 1 }}>
      {m.label}
    </span>
  );
}

export default function MovesetPanel({ fasts, charged, sel, onSel, labels }: {
  fasts: FastOpt[]; charged: ChargedOpt[]; sel: string; onSel: (id: string) => void; labels: PanelLabels;
}) {
  const selFast = fasts.find((f) => f.id === sel) || fasts[0];
  if (!selFast) return null;
  return (
    <div>
      {/* 빠른기술(노멀기) 선택 — 대체기술 있으면 칩으로 전환 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <span style={{ fontSize: "0.72rem", color: "#94a3b8", minWidth: 52 }}>{labels.fastLabel}</span>
        {fasts.map((f) => {
          const on = f.id === selFast.id;
          return (
            <button key={f.id} onClick={() => onSel(f.id)} disabled={fasts.length <= 1}
              style={{ padding: 0, border: "none", background: "none", cursor: fasts.length > 1 ? "pointer" : "default",
                outline: on && fasts.length > 1 ? `2px solid ${f.color}` : "none", outlineOffset: 2, borderRadius: 10, opacity: on ? 1 : 0.45 }}>
              <Chip m={f} />
            </button>
          );
        })}
        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{selFast.turns}{labels.fastTurns}{selFast.gain}</span>
      </div>
      {fasts.length > 1 && <div style={{ fontSize: "0.68rem", color: "#94a3b8", margin: "0 0 8px 60px" }}>{labels.altFastHint}</div>}

      <div style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "6px 0 5px" }}>{labels.chargedHint}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {charged.map((c) => {
          const counts = tausSeq(c.energy, selFast.gain);
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Chip m={c} dim={!c.rec} />
              {c.rec && <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#3b5bdb", background: "#e8eeff", borderRadius: 5, padding: "1px 5px" }}>{labels.recTag}</span>}
              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{c.energy} {labels.energyUnit}</span>
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3 }}>
                {counts.map((n, i) => (
                  <span key={i} style={{ fontSize: "0.82rem", fontWeight: 800, color: i === 0 ? "#3b5bdb" : "#64748b",
                    background: i === 0 ? "#e8eeff" : "#f1f5f9", borderRadius: 6, padding: "1px 7px" }}>{n}</span>
                ))}
                {labels.hitsUnit && <span style={{ fontSize: "0.72rem", color: "#94a3b8", marginLeft: 2 }}>{labels.hitsUnit}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
