"use client";

import { useEffect, useState } from "react";
import { apiFetch, isSuperAdmin } from "../../lib/api";
import { useRouter } from "next/navigation";

type Stats = {
  tenants: { total: number; active: number; trial: number; suspended: number };
  outreach: { total_leads: number; total_sent: number };
  revenue: { monthly_krw: number };
};

type Tenant = {
  id: string;
  name: string;
  plan: string;
  status: string;
  trial_ends_at: string | null;
  trial_expired: boolean;
  created_at: string;
  lead_count: number;
  touchpoint_total: number;
  touchpoint_sent: number;
  subscription: { status?: string; amount?: number; current_period_end?: string };
};

const PLAN_LABEL: Record<string, string> = {
  trial: "트라이얼",
  starter: "스타터",
  growth: "그로스",
  pro: "프로",
  internal: "내부",
};

const STATUS_COLOR: Record<string, string> = {
  active: "#16a34a",
  suspended: "#dc2626",
  canceled: "#6b7280",
};

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin()) { router.replace("/"); return; }
    Promise.all([
      apiFetch("/api/admin/stats"),
      apiFetch("/api/admin/tenants"),
    ]).then(([s, t]) => {
      setStats(s as Stats);
      setTenants(t as Tenant[]);
    }).finally(() => setLoading(false));
  }, []);

  async function toggleStatus(tenant: Tenant) {
    const next = tenant.status === "active" ? "suspended" : "active";
    if (!confirm(`${tenant.name}을 ${next === "suspended" ? "정지" : "활성화"}하시겠습니까?`)) return;
    setActionLoading(tenant.id);
    await apiFetch(`/api/admin/tenants/${tenant.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: next }),
    });
    setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status: next } : t));
    setActionLoading(null);
  }

  if (loading) return <div style={{ padding: "2rem", color: "#64748b" }}>로딩 중…</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: 1200 }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        슈퍼어드민 — 전체 현황
      </h1>

      {/* 집계 카드 */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "전체 테넌트", value: stats.tenants.total, color: "#0f172a" },
            { label: "활성", value: stats.tenants.active, color: "#16a34a" },
            { label: "트라이얼", value: stats.tenants.trial, color: "#d97706" },
            { label: "정지", value: stats.tenants.suspended, color: "#dc2626" },
            { label: "전체 리드", value: stats.outreach.total_leads.toLocaleString(), color: "#2563eb" },
            { label: "총 발송", value: stats.outreach.total_sent.toLocaleString(), color: "#7c3aed" },
            { label: "이달 구독 매출", value: `₩${stats.revenue.monthly_krw.toLocaleString()}`, color: "#0f172a" },
          ].map(c => (
            <div key={c.label} style={{
              background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
              padding: "1rem 1.25rem",
            }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* 테넌트 테이블 */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f1f5f9", fontWeight: 600, fontSize: "0.9rem" }}>
          테넌트 목록 ({tenants.length})
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                {["워크스페이스", "플랜", "상태", "구독", "리드", "발송", "가입일", "만료일", "관리"].map(h => (
                  <th key={h} style={{ padding: "0.6rem 1rem", textAlign: "left", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                    {t.name || t.id.slice(0, 8)}
                    {t.trial_expired && (
                      <span style={{ marginLeft: 6, fontSize: "0.7rem", background: "#fef2f2", color: "#dc2626", padding: "1px 5px", borderRadius: 4 }}>만료</span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "2px 8px", borderRadius: 99 }}>
                      {PLAN_LABEL[t.plan] || t.plan}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span style={{ color: STATUS_COLOR[t.status] || "#64748b", fontWeight: 600, fontSize: "0.8rem" }}>
                      ● {t.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#64748b" }}>
                    {t.subscription?.status || "—"}
                    {t.subscription?.amount ? ` (₩${t.subscription.amount.toLocaleString()})` : ""}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>{t.lead_count.toLocaleString()}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    {t.touchpoint_sent.toLocaleString()} / {t.touchpoint_total.toLocaleString()}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#64748b", whiteSpace: "nowrap" }}>
                    {t.created_at ? t.created_at.slice(0, 10) : "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#64748b", whiteSpace: "nowrap" }}>
                    {t.trial_ends_at ? t.trial_ends_at.slice(0, 10) : "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <button
                      onClick={() => toggleStatus(t)}
                      disabled={actionLoading === t.id}
                      style={{
                        fontSize: "0.75rem", padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                        border: "1px solid",
                        borderColor: t.status === "active" ? "#dc2626" : "#16a34a",
                        color: t.status === "active" ? "#dc2626" : "#16a34a",
                        background: "transparent",
                      }}
                    >
                      {actionLoading === t.id ? "…" : t.status === "active" ? "정지" : "활성화"}
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr><td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>테넌트 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
