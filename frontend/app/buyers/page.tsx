"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api";

type Buyer = {
  id: string; company_name: string; country: string;
  contact_name: string | null; contact_email: string | null; contact_title: string | null;
  industry: string | null; product_interest: string | null;
  source: string; status: string; created_at: string; notes: string | null;
  emailed_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  discovered: "발굴", contacted: "컨택", replied: "응답", negotiating: "협상", deal: "성사", rejected: "거절",
};
const STATUS_COLOR: Record<string, string> = {
  discovered: "#64748b", contacted: "#2563eb", replied: "#d97706",
  negotiating: "#7c3aed", deal: "#16a34a", rejected: "#dc2626",
};

// ── 이메일 모달 ──────────────────────────────────────────────────────────────

function EmailModal({ buyer, onClose, onSent }: {
  buyer: Buyer; onClose: () => void; onSent: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  async function generate() {
    setGenerating(true); setMsg("");
    try {
      const d: any = await apiFetch(`/api/buyers/${buyer.id}/email-draft`, { method: "POST" });
      setSubject(d.subject || "");
      setBodyHtml(d.body_html || "");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "초안 생성 실패");
    }
    setGenerating(false);
  }

  async function send() {
    if (!subject || !bodyHtml) return;
    if (!confirm(`${buyer.contact_email}로 발송하시겠습니까?`)) return;
    setSending(true); setMsg("");
    try {
      await apiFetch(`/api/buyers/${buyer.id}/send-email`, {
        method: "POST",
        body: JSON.stringify({ subject, body_html: bodyHtml }),
      });
      setMsg("✅ 발송 완료!");
      setTimeout(() => { onSent(); onClose(); }, 1200);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "발송 실패");
    }
    setSending(false);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 640,
        maxHeight: "88vh", overflowY: "auto", padding: "1.5rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>이메일 발송</h2>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>
              {buyer.company_name} · {buyer.contact_name || "담당자"} · <span style={{ color: "#2563eb" }}>{buyer.contact_email}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#64748b" }}>✕</button>
        </div>

        {/* 초안 생성 버튼 */}
        <button onClick={generate} disabled={generating} style={{
          width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #e2e8f0",
          background: "#f8fafc", cursor: generating ? "default" : "pointer",
          fontSize: "0.875rem", fontWeight: 600, color: "#0f172a", marginBottom: "1rem",
        }}>
          {generating ? "✨ Claude가 초안 작성 중…" : "✨ AI 초안 자동 생성"}
        </button>

        {/* 제목 */}
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: 4 }}>제목</label>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Subject line"
            style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.875rem", boxSizing: "border-box" }} />
        </div>

        {/* 본문 */}
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={{ fontSize: "0.75rem", color: "#64748b" }}>본문 (HTML)</label>
            {bodyHtml && (
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>미리보기 ↓</span>
            )}
          </div>
          <textarea value={bodyHtml} onChange={e => setBodyHtml(e.target.value)}
            rows={8}
            placeholder="<p>Dear ...</p>"
            style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.8rem", fontFamily: "monospace", boxSizing: "border-box", resize: "vertical" }} />
        </div>

        {/* 미리보기 */}
        {bodyHtml && (
          <div style={{
            border: "1px solid #e2e8f0", borderRadius: 8, padding: "1rem",
            marginBottom: "1rem", fontSize: "0.875rem", lineHeight: 1.7, background: "#fafafa",
          }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}

        {msg && (
          <div style={{ fontSize: "0.85rem", marginBottom: "0.75rem",
            color: msg.startsWith("✅") ? "#16a34a" : "#dc2626" }}>{msg}</div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={send} disabled={sending || !subject || !bodyHtml} style={{
            flex: 1, padding: "0.65rem", borderRadius: 8, border: "none",
            background: subject && bodyHtml ? "#0f172a" : "#e2e8f0",
            color: subject && bodyHtml ? "#fff" : "#94a3b8",
            cursor: subject && bodyHtml ? "pointer" : "default",
            fontSize: "0.875rem", fontWeight: 700,
          }}>
            {sending ? "발송 중…" : "📧 발송"}
          </button>
          <button onClick={onClose} style={{
            padding: "0.65rem 1.25rem", borderRadius: 8, border: "1px solid #e2e8f0",
            background: "#fff", cursor: "pointer", fontSize: "0.875rem",
          }}>취소</button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────────────────

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company_name: "", country: "", contact_name: "", contact_email: "",
    contact_title: "", industry: "", product_interest: "",
  });
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanKeywords, setScanKeywords] = useState("korean food, k-beauty, kimchi");
  const [scanCountries, setScanCountries] = useState<string[]>([]);
  const [scanResult, setScanResult] = useState("");
  const [showScan, setShowScan] = useState(false);
  const [emailTarget, setEmailTarget] = useState<Buyer | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (filterStatus) params.set("status", filterStatus);
    if (search) params.set("q", search);
    apiFetch(`/api/buyers?${params}`).then((d: any) => {
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
    load(); setSaving(false);
  }

  async function runScan() {
    const keywords = scanKeywords.split(",").map(k => k.trim()).filter(Boolean);
    if (!keywords.length) return;
    setScanning(true); setScanResult("");
    try {
      const d: any = await apiFetch("/api/buyers/scan", {
        method: "POST",
        body: JSON.stringify({ keywords, countries: scanCountries.length ? scanCountries : null, sources: ["ai", "importyeti"], limit_per_source: 20 }),
      });
      setScanResult(`발굴 완료: ${d.inserted || 0}건 저장 (이메일 ${d.with_email || 0}건) / 고유 ${d.unique || 0} / 수집 ${d.total_found || 0}`);
      load();
    } catch { setScanResult("스캔 실패"); }
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

  const COUNTRIES = ["USA","Japan","China","Germany","UK","France","Australia","Canada","UAE","Vietnam","Thailand","Indonesia","Singapore","India","Brazil","Mexico","Italy","Spain","Netherlands","Saudi Arabia","Turkey","Malaysia","Philippines","Poland","South Africa","Egypt","Russia"];

  return (
    <div style={{ padding: "2rem", maxWidth: 1300 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem" }}>바이어 목록</h1>
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
          <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem", color: "#1e40af" }}>
            🔍 AI 바이어 자동 발굴 (Claude 후보생성 + 웹사이트 실검증 + ImportYeti 미국통관)
          </div>
          <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: "0.6rem", lineHeight: 1.5 }}>
            Claude가 키워드·국가별 실제 수입상/유통사를 찾고, 각 회사 웹사이트를 직접 크롤링해
            존재 여부 검증 + 연락처 이메일을 자동 추출합니다. (별도 API 키 불필요)
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>검색 키워드 (쉼표 구분)</div>
            <input value={scanKeywords} onChange={e => setScanKeywords(e.target.value)}
              placeholder="korean food, k-beauty, kimchi, cosmetics"
              style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #bfdbfe", fontSize: "0.875rem", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 6 }}>국가 선택 (미선택 시 전세계)</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {COUNTRIES.map(c => (
                <button key={c} onClick={() => setScanCountries(prev =>
                  prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
                )} style={{
                  padding: "3px 10px", borderRadius: 99, fontSize: "0.75rem", cursor: "pointer", border: "1px solid",
                  borderColor: scanCountries.includes(c) ? "#2563eb" : "#e2e8f0",
                  background: scanCountries.includes(c) ? "#2563eb" : "#fff",
                  color: scanCountries.includes(c) ? "#fff" : "#374151",
                  fontWeight: scanCountries.includes(c) ? 600 : 400,
                }}>{c}</button>
              ))}
            </div>
            {scanCountries.length > 0 && (
              <button onClick={() => setScanCountries([])} style={{ marginTop: 6, fontSize: "0.75rem", color: "#64748b", background: "none", border: "none", cursor: "pointer" }}>전체 초기화</button>
            )}
          </div>
          <button onClick={runScan} disabled={scanning} style={{
            padding: "7px 18px", borderRadius: 8, border: "none",
            background: scanning ? "#93c5fd" : "#2563eb", color: "#fff",
            cursor: scanning ? "default" : "pointer", fontSize: "0.875rem", fontWeight: 600,
          }}>
            {scanning ? `발굴 중… (${scanCountries.length ? scanCountries.length + "개국" : "전세계"})` : "발굴 시작"}
          </button>
          {scanResult && <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", fontWeight: 600, color: "#1e40af" }}>✅ {scanResult}</div>}
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

      {/* 수동 추가 폼 */}
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

      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginBottom: "1rem" }}>
        CSV 컬럼: company_name, country, contact_name, contact_email, contact_title, industry, product_interest
      </div>

      {/* 바이어 테이블 */}
      {loading ? <div style={{ color: "#64748b", fontSize: "0.875rem" }}>로딩 중…</div> : (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.835rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                {["회사명", "국가", "담당자", "이메일", "관심제품", "소스", "상태", "이메일 발송", "등록일"].map(h => (
                  <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buyers.map(b => (
                <tr key={b.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.7rem 1rem", fontWeight: 600 }}>{b.company_name}</td>
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <span style={{ fontSize: "0.72rem", background: "#f1f5f9", padding: "2px 8px", borderRadius: 99 }}>{b.country}</span>
                  </td>
                  <td style={{ padding: "0.7rem 1rem", color: "#64748b" }}>{b.contact_name || "—"}</td>
                  <td style={{ padding: "0.7rem 1rem", color: "#2563eb", fontSize: "0.8rem" }}>{b.contact_email || "—"}</td>
                  <td style={{ padding: "0.7rem 1rem", color: "#64748b", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.product_interest || "—"}
                  </td>
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
                  <td style={{ padding: "0.7rem 1rem" }}>
                    {b.contact_email ? (
                      <button onClick={() => setEmailTarget(b)} style={{
                        fontSize: "0.72rem", padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                        border: "1px solid",
                        borderColor: b.emailed_at ? "#e2e8f0" : "#2563eb",
                        color: b.emailed_at ? "#94a3b8" : "#2563eb",
                        background: "transparent", whiteSpace: "nowrap",
                      }}>
                        {b.emailed_at ? `✓ ${b.emailed_at.slice(0, 10)}` : "📧 발송"}
                      </button>
                    ) : (
                      <span style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>이메일 없음</span>
                    )}
                  </td>
                  <td style={{ padding: "0.7rem 1rem", color: "#94a3b8", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                    {b.created_at.slice(0, 10)}
                  </td>
                </tr>
              ))}
              {buyers.length === 0 && (
                <tr><td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>바이어 없음 — 직접 추가하거나 CSV 업로드</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 이메일 모달 */}
      {emailTarget && (
        <EmailModal
          buyer={emailTarget}
          onClose={() => setEmailTarget(null)}
          onSent={() => { load(); setEmailTarget(null); }}
        />
      )}
    </div>
  );
}
