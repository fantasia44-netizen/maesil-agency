"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Summary = {
  active_mrr: number;
  subscription_count: number;
  manual_income: number;
  manual_expense: number;
  net: number;
};
type Entry = {
  id: string; kind: "income" | "expense"; category: string;
  amount: number; entry_date: string; description: string | null;
};

const INCOME_CATEGORIES = ["구독수입", "용역수입", "컨설팅", "커미션", "기타수입"];
const EXPENSE_CATEGORIES = ["마케팅비", "인건비", "서버비", "소프트웨어", "기타지출"];

export default function AccountingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    kind: "income" as "income" | "expense",
    category: "구독수입",
    amount: "",
    entry_date: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      apiFetch("/api/accounting/summary"),
      apiFetch("/api/accounting/entries?limit=100"),
    ]).then(([s, e]) => {
      setSummary(s as Summary);
      setEntries(Array.isArray(e) ? e as Entry[] : []);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function submitEntry() {
    if (!form.amount || !form.category) return;
    setSaving(true);
    await apiFetch("/api/accounting/entries", {
      method: "POST",
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setShowForm(false);
    setForm({ kind: "income", category: "구독수입", amount: "", entry_date: new Date().toISOString().slice(0, 10), description: "" });
    load();
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await apiFetch(`/api/accounting/entries/${id}`, { method: "DELETE" });
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748b" }}>로딩 중…</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>회계</h1>
        <button onClick={() => setShowForm(v => !v)} style={{
          padding: "7px 16px", borderRadius: 8, border: "none",
          background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: "0.875rem",
        }}>+ 항목 추가</button>
      </div>

      {/* 요약 카드 */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "이달 구독 MRR", value: `₩${summary.active_mrr.toLocaleString()}`, color: "#2563eb" },
            { label: "구독 계정", value: `${summary.subscription_count}개`, color: "#0f172a" },
            { label: "수동 수입", value: `₩${summary.manual_income.toLocaleString()}`, color: "#16a34a" },
            { label: "수동 지출", value: `₩${summary.manual_expense.toLocaleString()}`, color: "#dc2626" },
            { label: "순이익(수동)", value: `₩${summary.net.toLocaleString()}`, color: summary.net >= 0 ? "#16a34a" : "#dc2626" },
          ].map(c => (
            <div key={c.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1rem 1.25rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* 항목 추가 폼 */}
      {showForm && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: 4 }}>구분</label>
              <select value={form.kind} onChange={e => setForm(v => ({ ...v, kind: e.target.value as "income" | "expense", category: e.target.value === "income" ? "구독수입" : "마케팅비" }))}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.875rem" }}>
                <option value="income">수입</option>
                <option value="expense">지출</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: 4 }}>카테고리</label>
              <select value={form.category} onChange={e => setForm(v => ({ ...v, category: e.target.value }))}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.875rem" }}>
                {(form.kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: 4 }}>금액 (원)</label>
              <input type="number" value={form.amount} onChange={e => setForm(v => ({ ...v, amount: e.target.value }))}
                placeholder="100000" style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.875rem", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: 4 }}>날짜</label>
              <input type="date" value={form.entry_date} onChange={e => setForm(v => ({ ...v, entry_date: e.target.value }))}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.875rem", boxSizing: "border-box" }} />
            </div>
          </div>
          <input type="text" value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))}
            placeholder="메모 (선택)" style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.875rem", boxSizing: "border-box", marginBottom: "0.75rem" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={submitEntry} disabled={saving} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: "0.875rem" }}>
              {saving ? "저장 중…" : "저장"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: "6px 16px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "0.875rem" }}>취소</button>
          </div>
        </div>
      )}

      {/* 항목 목록 */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "#f8fafc", color: "#64748b" }}>
              {["날짜", "구분", "카테고리", "금액", "메모", ""].map(h => (
                <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap" }}>{e.entry_date}</td>
                <td style={{ padding: "0.7rem 1rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: e.kind === "income" ? "#16a34a" : "#dc2626" }}>
                    {e.kind === "income" ? "수입" : "지출"}
                  </span>
                </td>
                <td style={{ padding: "0.7rem 1rem" }}>{e.category}</td>
                <td style={{ padding: "0.7rem 1rem", fontWeight: 700, textAlign: "right",
                  color: e.kind === "income" ? "#16a34a" : "#dc2626" }}>
                  {e.kind === "expense" ? "-" : "+"}₩{e.amount.toLocaleString()}
                </td>
                <td style={{ padding: "0.7rem 1rem", color: "#64748b" }}>{e.description || "—"}</td>
                <td style={{ padding: "0.7rem 1rem" }}>
                  <button onClick={() => deleteEntry(e.id)} style={{ fontSize: "0.75rem", color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>삭제</button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>항목 없음</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
