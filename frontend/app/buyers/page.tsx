"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api";

type Buyer = {
  id: string; company_name: string; country: string;
  contact_name: string | null; contact_email: string | null; contact_title: string | null;
  industry: string | null; product_interest: string | null;
  source: string; status: string; created_at: string; notes: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  discovered: "발굴", contacted: "컨택", replied: "응답", negotiating: "협상", deal: "성사", rejected: "거절",
};
const STATUS_COLOR: Record<string, string> = {
  discovered: "#64748b", contacted: "#2563eb", replied: "#d97706",
  negotiating: "#7c3aed", deal: "#16a34a", rejected: "#dc2626",
};

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company_name: "", country: "", contact_name: "", contact_email: "", contact_title: "", industry: "", product_interest: "" });
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanKeywords, setScanKeywords] = useState("korean food, k-beauty, kimchi");
  const [scanResult, setScanResult] = useState<string>("");
  const [showScan, setShowScan] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (filterStatus) params.set("status", filterStatus);
    if (search) params.set("q", search);
    apiFetch(`/api/buyers?${params}`).then(d => {
      setBuyers(d.rows || []);
      setTotal(d.total || 0);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filterStatus, search]);

  async function addBuyer() {
    if (!form.company_name || !form.country) return;
    setSaving(true);
    await apiFetch("/api/buyers", { method: "POST", body: JSON.stringify({ ...form, source: "manual" }) });
    setShowForm(false);
    setForm({ company_name: "", country: "", contact_name: "", contact_email: "", contact_title: "", industry: "", product_interest: "" });
    load();
    setSaving(false);
  }

  async function runScan() {
    const keywords = scanKeywords.split(",").map(k => k.trim()).filter(Boolean);
    if (!keywords.length) return;
    setScanning(true);
    setScanResult("");
    try {
      const d = await apiFetch("/api/buyers/scan", {
        method: "POST",
        body: JSON.stringify({ keywords, sources: ["importyeti", "ec21", "tradekey"], limit_per_source: 30 }),
      });
      setScanResult(`발굴 완료: ${d.inserted || 0}건 저장 / ${d.unique || 0}건 고유 / ${d.total_found || 0}건 수집`);
      load();
    } catch {
      setScanResult("스캔 실패");
    }
    setScanning(false);
  }

  async function changeStatus(id: string, status: string) {
    await apiFetch(`/api/buyers/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    setBuyers(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  }

  async function uploadCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const token = localStorage.getItem("maesil_agency_token");
    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/buyers/import`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    const d = await resp.json();
    alert(`${d.inserted}건 업로드 완료`);
    load();
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 1200 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem" }}>바이어 발굴</h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>해외 B2B 바이어 {total.toLocaleString()}개</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <label style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "0.875rem", color: "#374151" }}>
            CSV 업로드
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={uploadCsv} />
          </label>
          <button onClick={() => setShowScan(v => !v)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #2563eb", background: "#eff6ff", color: "#2563eb", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}>
            🔍 자동 발굴
          </button>
          <button onClick={() => setShowForm(v => !v)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: "0.875rem" }}>
            + 바이어 추가
          </button>
        </div>
      </div>

      {/* 자동 발굴 패널 */}
      {showScan && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.75rem", color: "#1e40af" }}>
            🔍 무료 바이어 자동 발굴 (ImportYeti · EC21 · TradeKey)
          </div>
          <div style={{ fontSize: "0.8rem", color: "#3b82f6", marginBottom: "0.75rem" }}>
            키워드 쉼표 구분 입력 → 해외 B2B 디렉토리에서 수입업체 자동 수집
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              value={scanKeywords}
              onChange={e => setScanKeywords(e.target.value)}
              placeholder="korean food, k-beauty, kimchi, cosmetics"
              style={{ flex: 1, minWidth: 280, padding: "7px 10px", borderRadius: 8, border: "1px solid #bfdbfe", fontSize: "0.875rem" }}
            />
            <button onClick={runScan} disabled={scanning} style={{
              padding: "7px 18px", borderRadius: 8, border: "none",
              background: scanning ? "#93c5fd" : "#2563eb", color: "#fff",
              cursor: scanning ? "default" : "pointer", fontSize: "0.875rem", fontWeight: 600, whiteSpace: "nowrap",
            }}>
              {scanning ? "발굴 중… (최대 2분)" : "발굴 시작"}
            </button>
          </div>
          {scanResult && (
            <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", fontWeight: 600, color: "#1e40af" }}>
              ✅ {scanResult}
            </div>
          )}
        </div>
      )}

      {/* 필터 */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="회사명 검색"
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.875rem", width: 200 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.875rem" }}>
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            {[
              { key: "company_name", label: "회사명 *", placeholder: "ACME Corp" },
              { key: "country", label: "국가 *", placeholder: "USA" },
              { key: "contact_name", label: "담당자명", placeholder: "John Smith" },
              { key: "contact_email", label: "이메일", placeholder: "john@acme.com" },
              { key: "contact_title", label: "직함", placeholder: "Import Manager" },
              { key: "industry", label: "업종", placeholder: "Food Distribution" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: 4 }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.875rem", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: 4 }}>관심 제품</label>
            <input value={form.product_interest} onChange={e => setForm(v => ({ ...v, product_interest: e.target.value }))}
              placeholder="Korean food, K-beauty..."
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.875rem", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addBuyer} disabled={saving} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: "0.875rem" }}>
              {saving ? "저장 중…" : "저장"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: "6px 16px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "0.875rem" }}>취소</button>
          </div>
        </div>
      )}

      {/* CSV 안내 */}
      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "1rem" }}>
        CSV 컬럼: company_name, country, contact_name, contact_email, contact_title, industry, product_interest
      </div>

      {/* 바이어 테이블 */}
      {loading ? <div style={{ color: "#64748b", fontSize: "0.875rem" }}>로딩 중…</div> : (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                {["회사명", "국가", "담당자", "이메일", "업종", "관심제품", "소스", "상태", "등록일"].map(h => (
                  <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buyers.map(b => (
                <tr key={b.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.7rem 1rem", fontWeight: 600 }}>{b.company_name}</td>
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <span style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "2px 8px", borderRadius: 99 }}>{b.country}</span>
                  </td>
                  <td style={{ padding: "0.7rem 1rem", color: "#64748b" }}>{b.contact_name || "—"}</td>
                  <td style={{ padding: "0.7rem 1rem", color: "#2563eb", fontSize: "0.8rem" }}>{b.contact_email || "—"}</td>
                  <td style={{ padding: "0.7rem 1rem", color: "#64748b" }}>{b.industry || "—"}</td>
                  <td style={{ padding: "0.7rem 1rem", color: "#64748b", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.product_interest || "—"}</td>
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <span style={{ fontSize: "0.7rem", background: "#f1f5f9", padding: "2px 6px", borderRadius: 99, color: "#64748b" }}>{b.source}</span>
                  </td>
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <select value={b.status} onChange={e => changeStatus(b.id, e.target.value)}
                      style={{ fontSize: "0.75rem", padding: "2px 6px", borderRadius: 6, border: "1px solid #e2e8f0",
                        color: STATUS_COLOR[b.status], fontWeight: 600, background: "#fff", cursor: "pointer" }}>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "0.7rem 1rem", color: "#94a3b8", fontSize: "0.8rem", whiteSpace: "nowrap" }}>{b.created_at.slice(0, 10)}</td>
                </tr>
              ))}
              {buyers.length === 0 && (
                <tr><td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>바이어 없음 — 직접 추가하거나 CSV 업로드</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
