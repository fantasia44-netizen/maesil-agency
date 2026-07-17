"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, getToken, hasToken } from "../../lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Card = {
  id: string;
  person_name: string | null;
  company_name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  ai_memo: string | null;
  event_name: string | null;
  mode: string;
  stage: string;
  notes: string | null;
  created_at: string;
};

const STAGES: Array<[string, string, string]> = [
  ["new", "신규", "#64748b"],
  ["contacted", "접촉함", "#0891b2"],
  ["replied", "회신", "#16a34a"],
  ["deal", "성사", "#1A6F3C"],
  ["archived", "보관", "#9ca3af"],
];
const stageLabel = (s: string) => STAGES.find(([k]) => k === s)?.[1] || s;
const stageColor = (s: string) => STAGES.find(([k]) => k === s)?.[2] || "#64748b";

const inputStyle: React.CSSProperties = {
  padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, width: "100%",
};
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 2, display: "block" };

function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ background: color + "1a", color, padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{text}</span>;
}

export default function NamecardPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [eventName, setEventName] = useState("");
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selected, setSelected] = useState<Card | null>(null);
  const [edit, setEdit] = useState<Partial<Card>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    apiFetch<Card[]>("/api/namecard/leads").then(setCards).catch((e) => setError(e.message));
  }, []);
  useEffect(() => { if (hasToken()) load(); }, [load]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  async function uploadFiles(files: FileList) {
    setUploading(true);
    setError(null);
    let ok = 0;
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("event_name", eventName);
        fd.append("mode", mode);
        const res = await fetch(`${API_BASE}/api/namecard/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` }, // Content-Type은 브라우저가 boundary와 함께 설정
          body: fd,
        });
        if (!res.ok) {
          const t = await res.json().catch(() => ({}));
          throw new Error(t.detail || `업로드 실패 (${res.status})`);
        }
        ok += 1;
      } catch (e: any) {
        setError(`${file.name}: ${e.message}`);
      }
    }
    setUploading(false);
    if (ok) { showToast(`📇 명함 ${ok}장 등록 완료`); load(); }
    if (fileRef.current) fileRef.current.value = "";
  }

  function selectCard(c: Card) { setSelected(c); setEdit({}); }

  async function saveEdit() {
    if (!selected || Object.keys(edit).length === 0) return;
    try {
      const updated = await apiFetch<Card>(`/api/namecard/leads/${selected.id}`, { method: "PATCH", body: JSON.stringify(edit) });
      setSelected(updated); setEdit({}); load();
      showToast("저장됨");
    } catch (e: any) { setError(e.message); }
  }

  async function toggleMode(c: Card) {
    const next = c.mode === "auto" ? "manual" : "auto";
    await apiFetch(`/api/namecard/leads/${c.id}`, { method: "PATCH", body: JSON.stringify({ mode: next }) });
    load();
    if (selected?.id === c.id) setSelected({ ...c, mode: next });
  }

  async function removeCard(c: Card) {
    if (!window.confirm(`"${c.company_name || c.person_name || "이 명함"}" 삭제할까요?`)) return;
    await apiFetch(`/api/namecard/leads/${c.id}`, { method: "DELETE" });
    if (selected?.id === c.id) setSelected(null);
    load();
  }

  const val = (k: keyof Card) => (edit[k] !== undefined ? edit[k] : selected?.[k]) as any;

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>명함 리드</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>박람회·미팅 명함 사진을 올리면 AI가 정보를 읽어 자동 등록합니다</p>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "8px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
          {error} <button onClick={() => setError(null)} style={{ marginLeft: 8, border: "none", background: "none", cursor: "pointer" }}>✕</button>
        </div>
      )}
      {toast && <div style={{ background: "#f0fdf4", color: "#15803d", padding: "8px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{toast}</div>}

      {/* 업로드 영역 */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ minWidth: 180 }}>
            <label style={labelStyle}>행사/박람회 (선택)</label>
            <input style={inputStyle} value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="예: 2026 서울국제식품전" />
          </div>
          <div>
            <label style={labelStyle}>접촉 방식</label>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setMode("manual")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", border: mode === "manual" ? "2px solid #1A6F3C" : "1px solid #d1d5db", background: "#fff", color: mode === "manual" ? "#1A6F3C" : "#64748b" }}>✋ 수동 (직접 연락)</button>
              <button onClick={() => setMode("auto")} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", border: mode === "auto" ? "2px solid #0891b2" : "1px solid #d1d5db", background: "#fff", color: mode === "auto" ? "#0891b2" : "#64748b" }}>⚡ 자동 (콜드메일)</button>
            </div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
          onChange={(e) => e.target.files && e.target.files.length > 0 && uploadFiles(e.target.files)} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{ width: "100%", padding: "18px", border: "2px dashed #86efac", borderRadius: 10, background: "#f0fdf4", color: "#15803d", fontWeight: 700, fontSize: 15, cursor: uploading ? "wait" : "pointer" }}>
          {uploading ? "🔍 명함 읽는 중…" : "📷 명함 사진 올리기 (여러 장 가능)"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* 목록 */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>총 {cards.length}장</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cards.map((c) => (
              <div key={c.id} onClick={() => selectCard(c)}
                style={{ background: "#fff", border: selected?.id === c.id ? "2px solid #1A6F3C" : "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {c.company_name || "(회사 미상)"}
                    {c.person_name && <span style={{ fontWeight: 400, color: "#64748b", marginLeft: 8 }}>{c.person_name} {c.title}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {[c.email, c.phone, c.event_name].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <Badge text={stageLabel(c.stage)} color={stageColor(c.stage)} />
                <button onClick={(e) => { e.stopPropagation(); toggleMode(c); }}
                  title="자동/수동 전환"
                  style={{ border: "none", background: c.mode === "auto" ? "#e0f2fe" : "#f1f5f9", color: c.mode === "auto" ? "#0891b2" : "#64748b", fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 12, cursor: "pointer" }}>
                  {c.mode === "auto" ? "⚡ 자동" : "✋ 수동"}
                </button>
              </div>
            ))}
            {cards.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>아직 명함이 없습니다. 위에서 사진을 올려보세요.</div>}
          </div>
        </div>

        {/* 상세/편집 */}
        {selected && (
          <div style={{ width: 360, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 18, position: "sticky", top: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>명함 상세</h3>
              <button onClick={() => setSelected(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>
            {selected.ai_memo && (
              <div style={{ background: "#f0faf4", borderRadius: 8, padding: "8px 11px", fontSize: 12.5, color: "#15803d", marginBottom: 12, lineHeight: 1.6 }}>
                🤖 {selected.ai_memo}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 10 }}>
              {([["person_name", "이름"], ["title", "직함"], ["company_name", "회사"], ["email", "이메일"], ["phone", "전화"], ["website", "웹"]] as const).map(([k, lab]) => (
                <div key={k} style={k === "company_name" || k === "email" ? { gridColumn: "1 / -1" } : undefined}>
                  <label style={labelStyle}>{lab}</label>
                  <input style={inputStyle} value={val(k) || ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>주소</label>
              <input style={inputStyle} value={val("address") || ""} onChange={(e) => setEdit({ ...edit, address: e.target.value })} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>단계</label>
                <select style={inputStyle} value={val("stage") || "new"} onChange={(e) => setEdit({ ...edit, stage: e.target.value })}>
                  {STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>행사</label>
                <input style={inputStyle} value={val("event_name") || ""} onChange={(e) => setEdit({ ...edit, event_name: e.target.value })} />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>메모</label>
              <textarea style={{ ...inputStyle, minHeight: 56, resize: "vertical" }} value={val("notes") || ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
            </div>
            {Object.keys(edit).length > 0 && (
              <button onClick={saveEdit} style={{ width: "100%", background: "#1A6F3C", color: "#fff", border: "none", padding: "9px 0", borderRadius: 8, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>변경사항 저장</button>
            )}
            <button onClick={() => removeCard(selected)} style={{ width: "100%", background: "#fff", color: "#dc2626", border: "1px solid #fecaca", padding: "8px 0", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>삭제</button>
          </div>
        )}
      </div>
    </div>
  );
}
