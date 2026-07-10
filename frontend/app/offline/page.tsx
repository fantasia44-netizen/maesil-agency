"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, hasToken } from "../../lib/api";

type Lead = {
  id: string;
  company_name: string;
  industry: string | null;
  stage: string;
  owner_engagement: string | null;
  has_dedicated_staff: boolean | null;
  staff_capability: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscribed_at: string | null;
  coaching_cadence_days: number | null;
  next_action: string | null;
  next_action_due: string | null;
  last_contact_at: string | null;
  notes: string | null;
  updated_at: string;
};

type Activity = {
  id: string;
  kind: string;
  summary: string;
  happened_at: string;
};

type Summary = {
  total: number;
  by_stage: Record<string, number>;
  attention: Array<Lead & { reason: string }>;
};

const STAGES: Array<[string, string, string]> = [
  ["contacted", "접촉", "#64748b"],
  ["meeting", "미팅·시작예정", "#0891b2"],
  ["trial", "체험중", "#d97706"],
  ["coaching", "사용중·코칭", "#16a34a"],
  ["subscribed", "유료전환", "#1A6F3C"],
  ["partner", "파트너", "#7c3aed"],
  ["stalled", "정체", "#dc2626"],
  ["churned", "이탈", "#9ca3af"],
];
const stageLabel = (s: string) => STAGES.find(([k]) => k === s)?.[1] || s;
const stageColor = (s: string) => STAGES.find(([k]) => k === s)?.[2] || "#64748b";

const KINDS: Array<[string, string]> = [
  ["visit", "방문"], ["call", "전화"], ["kakao", "카톡"],
  ["coaching", "코칭"], ["meeting", "미팅"], ["note", "메모"],
];

const ENGAGEMENT: Array<[string, string]> = [["high", "높음"], ["medium", "보통"], ["low", "낮음"]];

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ background: color + "1a", color, padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {text}
    </span>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: "100%",
};
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 2, display: "block" };

export default function OfflinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [edit, setEdit] = useState<Partial<Lead>>({});
  const [newAct, setNewAct] = useState({ kind: "call", summary: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [newLead, setNewLead] = useState({ company_name: "", industry: "", stage: "contacted", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const qs = stageFilter ? `?stage=${stageFilter}` : "";
    apiFetch<Lead[]>(`/api/offline/leads${qs}`).then(setLeads).catch((e) => setError(e.message));
    apiFetch<Summary>("/api/offline/summary").then(setSummary).catch(() => {});
  }, [stageFilter]);

  useEffect(() => {
    if (!hasToken()) return;
    load();
  }, [load]);

  function select(lead: Lead) {
    setSelected(lead);
    setEdit({});
    apiFetch<Activity[]>(`/api/offline/leads/${lead.id}/activities`).then(setActivities).catch(() => setActivities([]));
  }

  async function saveEdit() {
    if (!selected || Object.keys(edit).length === 0) return;
    setSaving(true);
    try {
      const updated = await apiFetch<Lead>(`/api/offline/leads/${selected.id}`, {
        method: "PATCH", body: JSON.stringify(edit),
      });
      setSelected(updated);
      setEdit({});
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function addActivity() {
    if (!selected || !newAct.summary.trim()) return;
    try {
      await apiFetch(`/api/offline/leads/${selected.id}/activities`, {
        method: "POST", body: JSON.stringify(newAct),
      });
      setNewAct({ kind: "call", summary: "" });
      apiFetch<Activity[]>(`/api/offline/leads/${selected.id}/activities`).then(setActivities);
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function addLead() {
    if (!newLead.company_name.trim()) return;
    try {
      await apiFetch("/api/offline/leads", { method: "POST", body: JSON.stringify(newLead) });
      setShowAdd(false);
      setNewLead({ company_name: "", industry: "", stage: "contacted", notes: "" });
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function removeLead(lead: Lead) {
    if (!window.confirm(`"${lead.company_name}" 리드를 삭제할까요? 활동 이력도 함께 삭제됩니다.`)) return;
    await apiFetch(`/api/offline/leads/${lead.id}`, { method: "DELETE" });
    if (selected?.id === lead.id) setSelected(null);
    load();
  }

  const today = new Date().toISOString().slice(0, 10);
  const val = (k: keyof Lead) => (edit[k] !== undefined ? edit[k] : selected?.[k]) as any;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>오프라인 영업 관리</h2>
        <button onClick={() => setShowAdd(!showAdd)}
          style={{ background: "#1A6F3C", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
          + 업체 추가
        </button>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "8px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          {error} <button onClick={() => setError(null)} style={{ marginLeft: 8, border: "none", background: "none", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* 단계 요약 칩 */}
      {summary && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <button onClick={() => setStageFilter("")}
            style={{ border: stageFilter === "" ? "2px solid #1A6F3C" : "1px solid #e5e7eb", background: "#fff", borderRadius: 20, padding: "6px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
            전체 {summary.total}
          </button>
          {STAGES.map(([key, label, color]) => (
            <button key={key} onClick={() => setStageFilter(stageFilter === key ? "" : key)}
              style={{ border: stageFilter === key ? `2px solid ${color}` : "1px solid #e5e7eb", background: "#fff", borderRadius: 20, padding: "6px 14px", fontSize: 13, cursor: "pointer", color, fontWeight: 600 }}>
              {label} {summary.by_stage[key] || 0}
            </button>
          ))}
        </div>
      )}

      {/* 주의 필요 */}
      {summary && summary.attention.length > 0 && (
        <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 13 }}>
          <strong style={{ color: "#92400e" }}>⚠ 조치 필요 {summary.attention.length}건</strong>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
            {summary.attention.map((a) => (
              <span key={a.id} style={{ color: "#92400e" }}>
                <b>{a.company_name}</b> — {a.reason}{a.next_action ? ` · ${a.next_action}` : ""}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 업체 추가 폼 */}
      {showAdd && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ minWidth: 160 }}>
            <label style={labelStyle}>업체명 *</label>
            <input style={inputStyle} value={newLead.company_name} onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })} />
          </div>
          <div style={{ minWidth: 140 }}>
            <label style={labelStyle}>업종</label>
            <input style={inputStyle} value={newLead.industry} onChange={(e) => setNewLead({ ...newLead, industry: e.target.value })} />
          </div>
          <div style={{ minWidth: 130 }}>
            <label style={labelStyle}>단계</label>
            <select style={inputStyle} value={newLead.stage} onChange={(e) => setNewLead({ ...newLead, stage: e.target.value })}>
              {STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={labelStyle}>메모</label>
            <input style={inputStyle} value={newLead.notes} onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })} />
          </div>
          <button onClick={addLead} style={{ background: "#1A6F3C", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}>저장</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* 리드 테이블 */}
        <div style={{ flex: 1, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 10, overflow: "hidden" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                {["업체", "단계", "대표관여", "전담직원", "체험만료", "다음 액션", "마지막 접촉", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb", color: "#475569", fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const overdue = l.next_action_due && l.next_action_due < today && !["subscribed", "churned"].includes(l.stage);
                const trialOver = l.stage === "trial" && l.trial_ends_at && l.trial_ends_at <= today;
                return (
                  <tr key={l.id} onClick={() => select(l)}
                    style={{ cursor: "pointer", background: selected?.id === l.id ? "#f0faf4" : undefined, borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700 }}>
                      {l.company_name}
                      <div style={{ fontWeight: 400, fontSize: 11.5, color: "#94a3b8" }}>{l.industry}</div>
                    </td>
                    <td style={{ padding: "10px 12px" }}><Badge text={stageLabel(l.stage)} color={stageColor(l.stage)} /></td>
                    <td style={{ padding: "10px 12px" }}>{ENGAGEMENT.find(([k]) => k === l.owner_engagement)?.[1] || "-"}</td>
                    <td style={{ padding: "10px 12px" }}>{l.has_dedicated_staff == null ? "-" : l.has_dedicated_staff ? `있음${l.staff_capability ? ` (역량 ${ENGAGEMENT.find(([k]) => k === l.staff_capability)?.[1] || l.staff_capability})` : ""}` : "없음"}</td>
                    <td style={{ padding: "10px 12px", color: trialOver ? "#dc2626" : undefined, fontWeight: trialOver ? 700 : undefined }}>{l.trial_ends_at || "-"}</td>
                    <td style={{ padding: "10px 12px", maxWidth: 220 }}>
                      {l.next_action ? (
                        <>
                          {l.next_action}
                          {l.next_action_due && (
                            <span style={{ marginLeft: 6, fontSize: 11.5, color: overdue ? "#dc2626" : "#94a3b8", fontWeight: overdue ? 700 : 400 }}>
                              ~{l.next_action_due}{overdue ? " 초과" : ""}
                            </span>
                          )}
                        </>
                      ) : "-"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>{l.last_contact_at || "-"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <button onClick={(e) => { e.stopPropagation(); removeLead(l); }}
                        style={{ border: "none", background: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 14 }}>🗑</button>
                    </td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>리드가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 상세/편집 패널 */}
        {selected && (
          <div style={{ width: 380, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 18, position: "sticky", top: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>{selected.company_name}</h3>
              <button onClick={() => setSelected(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>단계</label>
                <select style={inputStyle} value={val("stage") || "contacted"} onChange={(e) => setEdit({ ...edit, stage: e.target.value })}>
                  {STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>대표 관여도</label>
                <select style={inputStyle} value={val("owner_engagement") || ""} onChange={(e) => setEdit({ ...edit, owner_engagement: e.target.value })}>
                  <option value="">-</option>
                  {ENGAGEMENT.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>체험 시작</label>
                <input type="date" style={inputStyle} value={val("trial_started_at") || ""} onChange={(e) => setEdit({ ...edit, trial_started_at: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>체험 만료</label>
                <input type="date" style={inputStyle} value={val("trial_ends_at") || ""} onChange={(e) => setEdit({ ...edit, trial_ends_at: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>코칭 주기(일)</label>
                <input type="number" style={inputStyle} value={val("coaching_cadence_days") ?? ""} onChange={(e) => setEdit({ ...edit, coaching_cadence_days: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div>
                <label style={labelStyle}>액션 기한</label>
                <input type="date" style={inputStyle} value={val("next_action_due") || ""} onChange={(e) => setEdit({ ...edit, next_action_due: e.target.value })} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>다음 액션</label>
              <input style={inputStyle} value={val("next_action") || ""} onChange={(e) => setEdit({ ...edit, next_action: e.target.value })} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>메모</label>
              <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={val("notes") || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
            </div>
            {Object.keys(edit).length > 0 && (
              <button onClick={saveEdit} disabled={saving}
                style={{ width: "100%", background: "#1A6F3C", color: "#fff", border: "none", padding: "9px 0", borderRadius: 8, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
                {saving ? "저장 중…" : "변경사항 저장"}
              </button>
            )}

            {/* 활동 기록 */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>활동 기록</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <select style={{ ...inputStyle, width: 90 }} value={newAct.kind} onChange={(e) => setNewAct({ ...newAct, kind: e.target.value })}>
                  {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <input style={inputStyle} placeholder="내용 (접촉 기록 시 마지막 접촉일 자동 갱신)" value={newAct.summary}
                  onChange={(e) => setNewAct({ ...newAct, summary: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addActivity()} />
                <button onClick={addActivity} style={{ background: "#0891b2", color: "#fff", border: "none", padding: "0 14px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>기록</button>
              </div>
              <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {activities.map((a) => (
                  <div key={a.id} style={{ fontSize: 12.5, background: "#f8fafc", borderRadius: 8, padding: "8px 10px" }}>
                    <span style={{ color: "#0891b2", fontWeight: 700 }}>{KINDS.find(([k]) => k === a.kind)?.[1] || a.kind}</span>
                    <span style={{ color: "#94a3b8", marginLeft: 6 }}>{a.happened_at}</span>
                    <div style={{ color: "#334155", marginTop: 2 }}>{a.summary}</div>
                  </div>
                ))}
                {activities.length === 0 && <div style={{ fontSize: 12.5, color: "#94a3b8" }}>기록 없음</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
