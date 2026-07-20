"use client";

// 재무센터 — (주)매실패밀리 부가세 신고자료 (법인 일반과세, 분기)
// 1단계: 홈택스 전자(세금)계산서 업로드 → 분기 부가세 집계
// 2단계 예정: 카드매출·현금영수증·은행내역, 인사이트/스튜디오 매출 자동 집계

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, getToken } from "../../lib/api";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type Bucket = { count: number; supply: number; tax: number };
type VatSummary = {
  year: number; quarter: number; label: string;
  sales: { 과세: Bucket; 영세: Bucket; 면세: Bucket };
  purchase: { 공제: Bucket; 불공제: Bucket; 면세: Bucket };
  taxable_base: number; sales_tax: number; input_tax: number;
  payable_tax: number; invoice_count: number;
};
type Invoice = {
  id: string; direction: "sales" | "purchase"; invoice_number: string;
  write_date: string; tax_type: string;
  supplier_corp_name: string; buyer_corp_name: string;
  supply_cost_total: number; tax_total: number; total_amount: number;
  deductible: boolean; nondeduct_reason: string | null;
};
type Upload = {
  id: string; kind: string; direction: string | null; filename: string;
  row_count: number; inserted_count: number; skipped_count: number; created_at: string;
};

const won = (n: number) => (n ?? 0).toLocaleString("ko-KR");

export default function FinancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [summary, setSummary] = useState<VatSummary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dirFilter, setDirFilter] = useState<"sales" | "purchase">("sales");
  const [toast, setToast] = useState("");

  // 업로드 폼
  const [upDir, setUpDir] = useState<"sales" | "purchase">("sales");
  const [upExempt, setUpExempt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const load = useCallback(async () => {
    try {
      const [s, inv, ups] = await Promise.all([
        apiFetch<VatSummary>(`/api/finance/vat-summary?year=${year}&quarter=${quarter}`, {}, 20000),
        apiFetch<Invoice[]>(`/api/finance/tax-invoices?year=${year}&quarter=${quarter}&direction=${dirFilter}`, {}, 20000),
        apiFetch<Upload[]>(`/api/finance/uploads`, {}, 15000),
      ]);
      setSummary(s); setInvoices(inv); setUploads(ups);
    } catch (e) { flash(e instanceof Error ? e.message : "불러오기 실패"); }
  }, [year, quarter, dirFilter]);

  useEffect(() => { load(); }, [load]);

  async function doUpload() {
    const f = fileRef.current?.files?.[0];
    if (!f) { flash("파일을 선택하세요"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("direction", upDir);
      fd.append("is_tax_exempt", String(upExempt));
      const res = await fetch(`${API}/api/finance/uploads/tax-invoice`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.detail || `업로드 실패 (${res.status})`);
      flash(`✅ 파싱 ${body.parsed}건 · 신규 ${body.inserted}건 · 중복 ${body.skipped}건`);
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e) { flash("❌ " + (e instanceof Error ? e.message : "업로드 실패")); }
    finally { setUploading(false); }
  }

  async function rollbackUpload(id: string, filename: string) {
    if (!confirm(`"${filename}" 업로드를 롤백할까요? 이 배치로 저장된 계산서가 삭제됩니다.`)) return;
    try {
      await apiFetch(`/api/finance/uploads/${id}`, { method: "DELETE" }, 20000);
      flash("업로드 롤백 완료"); load();
    } catch (e) { flash(e instanceof Error ? e.message : "롤백 실패"); }
  }

  async function toggleDeductible(inv: Invoice) {
    const next = !inv.deductible;
    let reason: string | null = null;
    if (!next) {
      reason = prompt("불공제 사유 (예: 접대비, 비영업용 차량, 사업 무관)") || null;
      if (reason === null) return;
    }
    try {
      await apiFetch(`/api/finance/tax-invoices/${inv.id}`, {
        method: "PATCH",
        body: JSON.stringify({ deductible: next, nondeduct_reason: reason }),
      }, 15000);
      load();
    } catch (e) { flash(e instanceof Error ? e.message : "변경 실패"); }
  }

  const payable = summary?.payable_tax ?? 0;

  return (
    <div>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.3rem" }}>재무센터</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        (주)매실패밀리 부가세 신고자료 — 홈택스 전자(세금)계산서 업로드 → 분기 집계.
        해서물산(maesil-total) 회계와 데이터 분리.
      </p>

      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, background: "#0f172a", color: "#fff",
          padding: "0.6rem 1rem", borderRadius: 8, fontSize: "0.85rem", zIndex: 50 }}>{toast}</div>
      )}

      {/* 기간 선택 */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "1rem 0" }}>
        <select value={year} onChange={e => setYear(Number(e.target.value))}>
          {[0, 1, 2].map(d => { const y = now.getFullYear() - d; return <option key={y} value={y}>{y}년</option>; })}
        </select>
        <select value={quarter} onChange={e => setQuarter(Number(e.target.value))}>
          <option value={1}>1분기 (1기 예정 · 1~3월)</option>
          <option value={2}>2분기 (1기 확정 · 4~6월)</option>
          <option value={3}>3분기 (2기 예정 · 7~9월)</option>
          <option value={4}>4분기 (2기 확정 · 10~12월)</option>
        </select>
        {summary && <span className="muted" style={{ fontSize: "0.82rem" }}>{summary.label} · 계산서 {summary.invoice_count}건</span>}
      </div>

      {/* 부가세 요약 */}
      {summary && (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", marginBottom: "1.25rem" }}>
          <div className="card">
            <div className="muted" style={{ fontSize: "0.78rem" }}>과세표준 (과세+영세)</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{won(summary.taxable_base)}원</div>
            <div className="muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>
              면세 매출 {won(summary.sales.면세.supply)}원 (참고)
            </div>
          </div>
          <div className="card">
            <div className="muted" style={{ fontSize: "0.78rem" }}>매출세액</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{won(summary.sales_tax)}원</div>
            <div className="muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>
              과세 {summary.sales.과세.count}건 · 영세 {summary.sales.영세.count}건
            </div>
          </div>
          <div className="card">
            <div className="muted" style={{ fontSize: "0.78rem" }}>공제 매입세액</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{won(summary.input_tax)}원</div>
            <div className="muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>
              불공제 {summary.purchase.불공제.count}건 ({won(summary.purchase.불공제.tax)}원 제외)
            </div>
          </div>
          <div className="card" style={{ borderColor: payable >= 0 ? "#fca5a5" : "#86efac" }}>
            <div className="muted" style={{ fontSize: "0.78rem" }}>{payable >= 0 ? "납부세액" : "환급세액"}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: payable >= 0 ? "#b91c1c" : "#15803d" }}>
              {won(Math.abs(payable))}원
            </div>
            <div className="muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>매출세액 − 공제매입세액</div>
          </div>
        </div>
      )}
      <p className="muted" style={{ fontSize: "0.78rem", marginTop: "-0.75rem" }}>
        ※ 세금계산서 기준 집계입니다. 카드매출·현금영수증(인사이트/스튜디오 PG 매출 포함)은 2단계에서 합산 예정 —
        그 전까지 신고 시 해당 분은 별도 확인하세요.
      </p>

      {/* 업로드 */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header"><div className="card-title">홈택스 전자(세금)계산서 업로드</div></div>
        <p className="muted" style={{ fontSize: "0.8rem", margin: "0 0 10px" }}>
          홈택스 → 전자(세금)계산서 → 목록조회 → 엑셀 다운로드(.xlsx/.xls) 파일을 그대로 올리세요.
          승인번호 기준으로 중복은 자동 제외됩니다.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select value={upDir} onChange={e => setUpDir(e.target.value as "sales" | "purchase")}>
            <option value="sales">매출 (발급 목록)</option>
            <option value="purchase">매입 (수취 목록)</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.85rem" }}>
            <input type="checkbox" checked={upExempt} onChange={e => setUpExempt(e.target.checked)} />
            면세 계산서
          </label>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ fontSize: "0.85rem" }} />
          <button className="btn primary" onClick={doUpload} disabled={uploading}>
            {uploading ? "업로드 중…" : "업로드"}
          </button>
        </div>
      </div>

      {/* 업로드 이력 */}
      {uploads.length > 0 && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-header"><div className="card-title">업로드 이력</div></div>
          <table style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left", color: "#64748b" }}>
              <th style={{ padding: "4px 8px" }}>파일</th><th>방향</th><th>파싱/신규/중복</th><th>일시</th><th></th>
            </tr></thead>
            <tbody>
              {uploads.map(u => (
                <tr key={u.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "5px 8px" }}>{u.filename}</td>
                  <td>{u.direction === "sales" ? "매출" : "매입"}</td>
                  <td>{u.row_count} / {u.inserted_count} / {u.skipped_count}</td>
                  <td className="muted">{new Date(u.created_at).toLocaleString("ko-KR")}</td>
                  <td><button className="btn" style={{ color: "#b91c1c", padding: "2px 8px", fontSize: "0.75rem" }}
                        onClick={() => rollbackUpload(u.id, u.filename)}>롤백</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 계산서 목록 */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">계산서 목록</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className={`btn ${dirFilter === "sales" ? "primary" : ""}`} onClick={() => setDirFilter("sales")}>매출</button>
            <button className={`btn ${dirFilter === "purchase" ? "primary" : ""}`} onClick={() => setDirFilter("purchase")}>매입</button>
          </div>
        </div>
        {invoices.length === 0 ? (
          <p className="muted">이 분기에 {dirFilter === "sales" ? "매출" : "매입"} 계산서가 없습니다.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
              <thead><tr style={{ textAlign: "left", color: "#64748b" }}>
                <th style={{ padding: "4px 8px" }}>작성일</th>
                <th>{dirFilter === "sales" ? "공급받는자" : "공급자"}</th>
                <th>유형</th>
                <th style={{ textAlign: "right" }}>공급가액</th>
                <th style={{ textAlign: "right" }}>세액</th>
                <th style={{ textAlign: "right" }}>합계</th>
                {dirFilter === "purchase" && <th>공제</th>}
              </tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "5px 8px" }}>{inv.write_date}</td>
                    <td>{dirFilter === "sales" ? inv.buyer_corp_name : inv.supplier_corp_name}</td>
                    <td>{inv.tax_type}</td>
                    <td style={{ textAlign: "right" }}>{won(inv.supply_cost_total)}</td>
                    <td style={{ textAlign: "right" }}>{won(inv.tax_total)}</td>
                    <td style={{ textAlign: "right" }}>{won(inv.total_amount)}</td>
                    {dirFilter === "purchase" && (
                      <td>
                        <button className="btn" style={{ padding: "1px 8px", fontSize: "0.72rem",
                            color: inv.deductible ? "#15803d" : "#b91c1c" }}
                          title={inv.nondeduct_reason || "클릭해서 공제/불공제 전환"}
                          onClick={() => toggleDeductible(inv)}>
                          {inv.deductible ? "공제" : `불공제${inv.nondeduct_reason ? `·${inv.nondeduct_reason}` : ""}`}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
