"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type StockItem = { sku: string; product_name: string; qty_in: number; qty_out: number; stock: number };
type ProductionRow = { id: string; production_date: string; product_name: string; sku: string; actual_qty: number; planned_qty: number; factory: string; status: string };
type ShipmentRow = { id: string; shipment_date: string; product_name: string; sku: string; qty: number; channel: string; status: string; order_ref: string };

export default function WarehousePage() {
  const [tab, setTab] = useState<"stock" | "production" | "shipments">("stock");
  const [stock, setStock] = useState<StockItem[]>([]);
  const [production, setProduction] = useState<ProductionRow[]>([]);
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const ep = tab === "stock" ? "/api/warehouse/summary"
             : tab === "production" ? "/api/warehouse/production"
             : "/api/warehouse/shipments";
    apiFetch(ep).then(d => {
      if (d.error) { setError(d.error); return; }
      if (tab === "stock") setStock(d.items || []);
      else if (tab === "production") setProduction(d.rows || []);
      else setShipments(d.rows || []);
    }).catch(() => setError("데이터 로드 실패")).finally(() => setLoading(false));
  }, [tab]);

  const STATUS_COLOR: Record<string, string> = {
    completed: "#16a34a", shipped: "#2563eb", delivered: "#16a34a",
    pending: "#d97706", returned: "#dc2626", cancelled: "#6b7280",
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 1200 }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>창고·물류</h1>
      <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        maesil-insight 생산·출고 데이터 연동
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
        {(["stock", "production", "shipments"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "6px 16px", borderRadius: 8, border: "1px solid",
            borderColor: tab === t ? "#0f172a" : "#e2e8f0",
            background: tab === t ? "#0f172a" : "#fff",
            color: tab === t ? "#fff" : "#64748b",
            fontWeight: tab === t ? 600 : 400, cursor: "pointer", fontSize: "0.875rem",
          }}>
            {t === "stock" ? "재고 현황" : t === "production" ? "입고(생산)" : "출고"}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8,
          padding: "0.75rem 1rem", color: "#dc2626", fontSize: "0.875rem", marginBottom: "1rem" }}>
          ⚠️ {error} — Settings에서 maesil_insight_supabase_url / m_insight_service_role / maesil-insight_operator_id 확인
        </div>
      )}

      {loading && <div style={{ color: "#64748b", fontSize: "0.875rem" }}>로딩 중…</div>}

      {/* 재고 현황 */}
      {!loading && tab === "stock" && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                {["SKU", "제품명", "누적 입고", "누적 출고", "현재 재고"].map(h => (
                  <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stock.map((s, i) => (
                <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.7rem 1rem", fontFamily: "monospace", fontSize: "0.8rem" }}>{s.sku}</td>
                  <td style={{ padding: "0.7rem 1rem", fontWeight: 500 }}>{s.product_name}</td>
                  <td style={{ padding: "0.7rem 1rem", textAlign: "right", color: "#16a34a" }}>{s.qty_in.toLocaleString()}</td>
                  <td style={{ padding: "0.7rem 1rem", textAlign: "right", color: "#dc2626" }}>{s.qty_out.toLocaleString()}</td>
                  <td style={{ padding: "0.7rem 1rem", textAlign: "right", fontWeight: 700,
                    color: s.stock < 0 ? "#dc2626" : s.stock < 50 ? "#d97706" : "#0f172a" }}>
                    {s.stock.toLocaleString()}
                  </td>
                </tr>
              ))}
              {stock.length === 0 && !error && (
                <tr><td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 입고 */}
      {!loading && tab === "production" && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                {["날짜", "제품명", "SKU", "계획", "실적", "공장", "상태"].map(h => (
                  <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {production.map(r => (
                <tr key={r.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap" }}>{r.production_date}</td>
                  <td style={{ padding: "0.7rem 1rem", fontWeight: 500 }}>{r.product_name}</td>
                  <td style={{ padding: "0.7rem 1rem", fontFamily: "monospace", fontSize: "0.8rem" }}>{r.sku || "—"}</td>
                  <td style={{ padding: "0.7rem 1rem", textAlign: "right" }}>{r.planned_qty?.toLocaleString()}</td>
                  <td style={{ padding: "0.7rem 1rem", textAlign: "right", fontWeight: 600 }}>{r.actual_qty?.toLocaleString()}</td>
                  <td style={{ padding: "0.7rem 1rem", color: "#64748b" }}>{r.factory || "—"}</td>
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <span style={{ color: STATUS_COLOR[r.status] || "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>
                      ● {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {production.length === 0 && !error && (
                <tr><td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 출고 */}
      {!loading && tab === "shipments" && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                {["날짜", "제품명", "SKU", "채널", "수량", "주문번호", "상태"].map(h => (
                  <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shipments.map(r => (
                <tr key={r.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.7rem 1rem", whiteSpace: "nowrap" }}>{r.shipment_date}</td>
                  <td style={{ padding: "0.7rem 1rem", fontWeight: 500 }}>{r.product_name}</td>
                  <td style={{ padding: "0.7rem 1rem", fontFamily: "monospace", fontSize: "0.8rem" }}>{r.sku || "—"}</td>
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <span style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "2px 8px", borderRadius: 99 }}>{r.channel}</span>
                  </td>
                  <td style={{ padding: "0.7rem 1rem", textAlign: "right", fontWeight: 600 }}>{r.qty?.toLocaleString()}</td>
                  <td style={{ padding: "0.7rem 1rem", color: "#64748b", fontSize: "0.8rem" }}>{r.order_ref || "—"}</td>
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <span style={{ color: STATUS_COLOR[r.status] || "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>
                      ● {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {shipments.length === 0 && !error && (
                <tr><td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
