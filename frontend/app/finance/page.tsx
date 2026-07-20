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
  card_sales: Bucket; cash_receipt: Bucket;
  card_purchase: { 공제: Bucket; 불공제: Bucket };
  bank: { count: number; deposit: number; withdrawal: number };
  taxable_base: number; sales_tax: number; input_tax: number;
  payable_tax: number; invoice_count: number; transaction_count: number;
};
type Tx = {
  id: string; kind: string; tx_date: string; counterparty: string;
  supply_amount: number; vat_amount: number; total_amount: number;
  deposit: number; withdrawal: number; deductible: boolean;
  nondeduct_reason: string | null; vat_estimated: boolean;
};
const TX_KIND_LABEL: Record<string, string> = {
  card_sales: "카드매출", card_purchase: "카드매입(사업용)",
  cash_receipt: "현금영수증", bank: "은행내역",
};
type SysAgg = {
  paid_count: number; amount: number; supply: number; tax: number;
  refund_count: number; refund_amount: number; error?: string;
};
type SystemSales = {
  period: { start: string; end_exclusive: string };
  insight: SysAgg & { breakdown?: unknown };
  studio: SysAgg;
  total: SysAgg;
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

  // 거래내역 (카드/현금영수증/은행)
  const [txs, setTxs] = useState<Tx[]>([]);
  const [txKind, setTxKind] = useState<string>("card_purchase");

  // 업로드 폼 — 세금계산서
  const [upDir, setUpDir] = useState<"sales" | "purchase">("sales");
  const [upExempt, setUpExempt] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 업로드 폼 — 카드/현금영수증/은행
  const [txUpKind, setTxUpKind] = useState<string>("card_purchase");
  const [txUploading, setTxUploading] = useState(false);
  const txFileRef = useRef<HTMLInputElement>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  const [sysSales, setSysSales] = useState<SystemSales | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, inv, ups, tx] = await Promise.all([
        apiFetch<VatSummary>(`/api/finance/vat-summary?year=${year}&quarter=${quarter}`, {}, 20000),
        apiFetch<Invoice[]>(`/api/finance/tax-invoices?year=${year}&quarter=${quarter}&direction=${dirFilter}`, {}, 20000),
        apiFetch<Upload[]>(`/api/finance/uploads`, {}, 15000),
        apiFetch<Tx[]>(`/api/finance/transactions?year=${year}&quarter=${quarter}&kind=${txKind}`, {}, 20000),
      ]);
      setSummary(s); setInvoices(inv); setUploads(ups); setTxs(tx);
    } catch (e) { flash(e instanceof Error ? e.message : "불러오기 실패"); }
    // 시스템 매출은 외부 DB 조회라 별도 로드 (실패해도 본 화면 유지)
    try {
      const ss = await apiFetch<SystemSales>(`/api/finance/system-sales?year=${year}&quarter=${quarter}`, {}, 30000);
      setSysSales(ss);
    } catch { setSysSales(null); }
  }, [year, quarter, dirFilter, txKind]);

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

  async function doTxUpload() {
    const f = txFileRef.current?.files?.[0];
    if (!f) { flash("파일을 선택하세요"); return; }
    setTxUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("kind", txUpKind);
      const res = await fetch(`${API}/api/finance/uploads/transactions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.detail || `업로드 실패 (${res.status})`);
      flash(`✅ 파싱 ${body.parsed}건 · 신규 ${body.inserted}건 · 중복 ${body.skipped}건`);
      if (txFileRef.current) txFileRef.current.value = "";
      setTxKind(txUpKind);
      load();
    } catch (e) { flash("❌ " + (e instanceof Error ? e.message : "업로드 실패")); }
    finally { setTxUploading(false); }
  }

  async function toggleTxDeductible(t: Tx) {
    const next = !t.deductible;
    let reason: string | null = null;
    if (!next) {
      reason = prompt("불공제 사유 (예: 접대비, 사업 무관)") || null;
      if (reason === null) return;
    }
    try {
      await apiFetch(`/api/finance/transactions/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({ deductible: next, nondeduct_reason: reason }),
      }, 15000);
      load();
    } catch (e) { flash(e instanceof Error ? e.message : "변경 실패"); }
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
              계산서 {won(summary.sales.과세.tax)} · 카드 {won(summary.card_sales.tax)} · 현금영수증 {won(summary.cash_receipt.tax)}
            </div>
          </div>
          <div className="card">
            <div className="muted" style={{ fontSize: "0.78rem" }}>공제 매입세액</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{won(summary.input_tax)}원</div>
            <div className="muted" style={{ fontSize: "0.75rem", marginTop: 4 }}>
              계산서 {won(summary.purchase.공제.tax)} + 카드 {won(summary.card_purchase.공제.tax)}
              {(summary.purchase.불공제.count + summary.card_purchase.불공제.count) > 0 &&
                ` · 불공제 ${won(summary.purchase.불공제.tax + summary.card_purchase.불공제.tax)} 제외`}
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
      {summary && (
        <p className="muted" style={{ fontSize: "0.78rem", marginTop: "-0.75rem" }}>
          ※ 매출세액 = 세금계산서(과세) + 카드매출 + 현금영수증 · 매입세액 = 세금계산서(공제) + 사업용카드(공제).
          은행내역은 부가세 미포함 참고자료
          {summary.bank.count > 0 && ` (입금 ${won(summary.bank.deposit)} / 출금 ${won(summary.bank.withdrawal)}원)`}.
        </p>
      )}

      {/* 시스템 매출 대사 — 결제DB 자동 집계 vs 업로드 자료 */}
      {summary && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-header"><div className="card-title">시스템 매출 대사 (인사이트·스튜디오 결제 자동 집계)</div></div>
          {!sysSales ? (
            <p className="muted" style={{ fontSize: "0.82rem" }}>시스템 매출 조회 중이거나 실패했습니다.</p>
          ) : (
            <>
              <table style={{ width: "100%", fontSize: "0.83rem", borderCollapse: "collapse" }}>
                <thead><tr style={{ textAlign: "left", color: "#64748b" }}>
                  <th style={{ padding: "4px 8px" }}>구분</th>
                  <th style={{ textAlign: "right" }}>건수</th>
                  <th style={{ textAlign: "right" }}>결제금액</th>
                  <th style={{ textAlign: "right" }}>공급가액</th>
                  <th style={{ textAlign: "right" }}>부가세</th>
                  <th style={{ textAlign: "right" }}>환불</th>
                </tr></thead>
                <tbody>
                  {(["insight", "studio"] as const).map(k => {
                    const s = sysSales[k];
                    const label = k === "insight" ? "매실인사이트" : "매실스튜디오";
                    return s?.error ? (
                      <tr key={k} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "5px 8px" }}>{label}</td>
                        <td colSpan={5} className="muted" style={{ fontSize: "0.78rem" }}>{s.error}</td>
                      </tr>
                    ) : (
                      <tr key={k} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "5px 8px" }}>{label}</td>
                        <td style={{ textAlign: "right" }}>{s.paid_count}</td>
                        <td style={{ textAlign: "right" }}>{won(s.amount)}</td>
                        <td style={{ textAlign: "right" }}>{won(s.supply)}</td>
                        <td style={{ textAlign: "right" }}>{won(s.tax)}</td>
                        <td style={{ textAlign: "right" }}>{s.refund_amount ? `-${won(s.refund_amount)}` : "-"}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: "2px solid #e2e8f0", fontWeight: 700 }}>
                    <td style={{ padding: "5px 8px" }}>시스템 합계 (A)</td>
                    <td style={{ textAlign: "right" }}>{sysSales.total.paid_count}</td>
                    <td style={{ textAlign: "right" }}>{won(sysSales.total.amount)}</td>
                    <td style={{ textAlign: "right" }}>{won(sysSales.total.supply)}</td>
                    <td style={{ textAlign: "right" }}>{won(sysSales.total.tax)}</td>
                    <td style={{ textAlign: "right" }}>{sysSales.total.refund_amount ? `-${won(sysSales.total.refund_amount)}` : "-"}</td>
                  </tr>
                  {(() => {
                    const uploadedTotal = summary.card_sales.supply + summary.card_sales.tax
                      + summary.cash_receipt.supply + summary.cash_receipt.tax;
                    const diff = sysSales.total.amount - uploadedTotal;
                    return (
                      <>
                        <tr style={{ borderTop: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "5px 8px" }}>업로드 카드매출+현금영수증 (B)</td>
                          <td style={{ textAlign: "right" }}>{summary.card_sales.count + summary.cash_receipt.count}</td>
                          <td style={{ textAlign: "right" }}>{won(uploadedTotal)}</td>
                          <td style={{ textAlign: "right" }}>{won(summary.card_sales.supply + summary.cash_receipt.supply)}</td>
                          <td style={{ textAlign: "right" }}>{won(summary.card_sales.tax + summary.cash_receipt.tax)}</td>
                          <td></td>
                        </tr>
                        <tr style={{ borderTop: "1px solid #f1f5f9", fontWeight: 700,
                                     color: diff === 0 ? "#15803d" : "#b45309" }}>
                          <td style={{ padding: "5px 8px" }}>차이 (A − B)</td>
                          <td></td>
                          <td style={{ textAlign: "right" }}>{diff === 0 ? "일치 ✓" : `${diff > 0 ? "+" : ""}${won(diff)}원`}</td>
                          <td colSpan={3}></td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
              <p className="muted" style={{ fontSize: "0.76rem", marginTop: 8, lineHeight: 1.6 }}>
                A = 결제DB(운영의 진실) · B = 업로드한 PG정산/홈택스 카드매출 자료.
                차이가 나면 정산 시차·환불·미업로드분을 확인하세요.
                <strong> 신고 기준 숫자는 홈택스 '신고도움서비스' 카드매출</strong> — 온라인 PG만 쓰므로 여신금융협회 자료는 불필요.
                세금계산서 매출({won(summary.sales.과세.supply + summary.sales.영세.supply + summary.sales.면세.supply)}원)은 별도 합산됩니다.
              </p>
            </>
          )}
        </div>
      )}

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

      {/* 카드/현금영수증/은행 업로드 */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header"><div className="card-title">카드매출 · 카드매입 · 현금영수증 · 은행내역 업로드</div></div>
        <p className="muted" style={{ fontSize: "0.8rem", margin: "0 0 10px" }}>
          홈택스(사업용카드·현금영수증)·카드사·은행에서 받은 엑셀을 올리세요. 컬럼명(거래일자·가맹점·공급가액·부가세·합계·입금·출금)을
          자동 인식합니다. 공급가액/부가세 컬럼이 없으면 합계에서 10% 역산(표시됨).
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select value={txUpKind} onChange={e => setTxUpKind(e.target.value)}>
            <option value="card_purchase">카드매입 (사업용카드)</option>
            <option value="card_sales">카드매출</option>
            <option value="cash_receipt">현금영수증 (매출)</option>
            <option value="bank">은행내역 (참고용)</option>
          </select>
          <input ref={txFileRef} type="file" accept=".xlsx,.xls" style={{ fontSize: "0.85rem" }} />
          <button className="btn primary" onClick={doTxUpload} disabled={txUploading}>
            {txUploading ? "업로드 중…" : "업로드"}
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
                  <td>{u.kind === "tax_invoice"
                        ? (u.direction === "sales" ? "계산서·매출" : "계산서·매입")
                        : (TX_KIND_LABEL[u.kind] || u.kind)}</td>
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

      {/* 거래내역 (카드/현금영수증/은행) */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="card-header">
          <div className="card-title">거래내역</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(TX_KIND_LABEL).map(([k, label]) => (
              <button key={k} className={`btn ${txKind === k ? "primary" : ""}`}
                onClick={() => setTxKind(k)}>{label}</button>
            ))}
          </div>
        </div>
        {txs.length === 0 ? (
          <p className="muted">이 분기에 {TX_KIND_LABEL[txKind]} 내역이 없습니다.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse", whiteSpace: "nowrap" }}>
              <thead><tr style={{ textAlign: "left", color: "#64748b" }}>
                <th style={{ padding: "4px 8px" }}>일자</th>
                <th>{txKind === "bank" ? "적요/거래처" : "가맹점/거래처"}</th>
                {txKind === "bank" ? (<>
                  <th style={{ textAlign: "right" }}>입금</th>
                  <th style={{ textAlign: "right" }}>출금</th>
                </>) : (<>
                  <th style={{ textAlign: "right" }}>공급가액</th>
                  <th style={{ textAlign: "right" }}>부가세</th>
                  <th style={{ textAlign: "right" }}>합계</th>
                </>)}
                {txKind === "card_purchase" && <th>공제</th>}
              </tr></thead>
              <tbody>
                {txs.map(t => (
                  <tr key={t.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "5px 8px" }}>{t.tx_date}</td>
                    <td>{t.counterparty || "-"}{t.vat_estimated && <span className="muted" title="공급가액/부가세를 합계에서 역산"> *</span>}</td>
                    {txKind === "bank" ? (<>
                      <td style={{ textAlign: "right" }}>{t.deposit ? won(t.deposit) : ""}</td>
                      <td style={{ textAlign: "right" }}>{t.withdrawal ? won(t.withdrawal) : ""}</td>
                    </>) : (<>
                      <td style={{ textAlign: "right" }}>{won(t.supply_amount)}</td>
                      <td style={{ textAlign: "right" }}>{won(t.vat_amount)}</td>
                      <td style={{ textAlign: "right" }}>{won(t.total_amount)}</td>
                    </>)}
                    {txKind === "card_purchase" && (
                      <td>
                        <button className="btn" style={{ padding: "1px 8px", fontSize: "0.72rem",
                            color: t.deductible ? "#15803d" : "#b91c1c" }}
                          title={t.nondeduct_reason || "클릭해서 공제/불공제 전환"}
                          onClick={() => toggleTxDeductible(t)}>
                          {t.deductible ? "공제" : `불공제${t.nondeduct_reason ? `·${t.nondeduct_reason}` : ""}`}
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
