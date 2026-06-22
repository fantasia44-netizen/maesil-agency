"use client";

import { useEffect, useState } from "react";
import { apiFetch, isSuperAdmin } from "../../lib/api";
import { useRouter } from "next/navigation";

type Stats = {
  tenants: { total: number; active: number; trial: number; suspended: number };
  outreach: { total_leads: number; total_sent: number };
  revenue: { monthly_krw: number };
};

type Subscription = { status?: string; amount?: number; current_period_end?: string };

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
  subscription: Subscription;
};

type TenantDetail = Tenant & {
  subscriptions: any[];
  outreach_config: any;
  users: { id: string; email: string; display_name: string; role: string; created_at: string }[];
};

const PLAN_LABEL: Record<string, string> = {
  trial: "트라이얼", starter: "스타터", growth: "그로스", pro: "프로", internal: "내부",
};
const PLAN_COLOR: Record<string, string> = {
  trial: "#d97706", starter: "#2563eb", growth: "#7c3aed", pro: "#dc2626", internal: "#0f172a",
};
const STATUS_COLOR: Record<string, string> = {
  active: "#16a34a", suspended: "#dc2626", canceled: "#6b7280",
};

// ── 테넌트 상세 모달 ─────────────────────────────────────────────────────────

function DetailModal({ tenant, onClose, onRefresh }: {
  tenant: TenantDetail;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState(tenant.plan);
  const [status, setStatus] = useState(tenant.status);
  const [trialDays, setTrialDays] = useState("");
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    setMsg("");
    const body: any = {};
    if (plan !== tenant.plan) body.plan = plan;
    if (status !== tenant.status) body.status = status;
    if (trialDays) body.trial_days = Number(trialDays);
    if (!Object.keys(body).length) { setSaving(false); return; }
    await apiFetch(`/api/admin/tenants/${tenant.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setMsg("저장됨");
    setSaving(false);
    onRefresh();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 600,
        maxHeight: "85vh", overflowY: "auto", padding: "1.5rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
            {tenant.name || tenant.id.slice(0, 8)}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#64748b" }}>✕</button>
        </div>

        {/* 수동 관리 */}
        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "1rem", marginBottom: "1.25rem" }}>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.75rem" }}>관리</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: 4 }}>플랜</label>
              <select value={plan} onChange={e => setPlan(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.875rem" }}>
                {["trial","starter","growth","pro","internal"].map(p => (
                  <option key={p} value={p}>{PLAN_LABEL[p] || p}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: 4 }}>상태</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.875rem" }}>
                <option value="active">active</option>
                <option value="suspended">suspended</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: 4 }}>트라이얼 연장 (일)</label>
              <input type="number" value={trialDays} onChange={e => setTrialDays(e.target.value)}
                placeholder="예: 7"
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.875rem", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button onClick={save} disabled={saving} style={{
              padding: "6px 16px", borderRadius: 6, border: "none",
              background: "#0f172a", color: "#fff", cursor: "pointer", fontSize: "0.875rem",
            }}>{saving ? "저장 중…" : "적용"}</button>
            {msg && <span style={{ fontSize: "0.8rem", color: "#16a34a" }}>✓ {msg}</span>}
          </div>
        </div>

        {/* 현재 구독 */}
        <Section title="구독 이력">
          {tenant.subscriptions.length === 0
            ? <Empty>구독 없음</Empty>
            : tenant.subscriptions.map((s, i) => (
              <Row key={i}>
                <Cell>{s.status}</Cell>
                <Cell>{s.amount ? `₩${s.amount.toLocaleString()}` : "—"}</Cell>
                <Cell>{s.plan || "—"}</Cell>
                <Cell muted>{s.created_at?.slice(0, 10)}</Cell>
              </Row>
            ))}
        </Section>

        {/* 유저 목록 */}
        <Section title={`유저 (${tenant.users.length})`}>
          {tenant.users.length === 0
            ? <Empty>유저 없음</Empty>
            : tenant.users.map(u => (
              <Row key={u.id}>
                <Cell>{u.email}</Cell>
                <Cell muted>{u.role}</Cell>
                <Cell muted>{u.created_at?.slice(0, 10)}</Cell>
              </Row>
            ))}
        </Section>

        {/* 기본 정보 */}
        <Section title="정보">
          <InfoLine label="테넌트 ID" value={tenant.id} mono />
          <InfoLine label="가입일" value={tenant.created_at?.slice(0, 10) || "—"} />
          <InfoLine label="트라이얼 만료" value={tenant.trial_ends_at?.slice(0, 10) || "—"} />
          <InfoLine label="리드 수" value={String(tenant.lead_count)} />
          <InfoLine label="발송" value={`${tenant.touchpoint_sent} / ${tenant.touchpoint_total}`} />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#0f172a", marginBottom: "0.5rem" }}>{title}</div>
      <div style={{ border: "1px solid #f1f5f9", borderRadius: 8, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: "1rem", padding: "0.5rem 0.75rem", borderTop: "1px solid #f8fafc", fontSize: "0.8rem" }}>{children}</div>;
}
function Cell({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <span style={{ flex: 1, color: muted ? "#64748b" : "#0f172a" }}>{children}</span>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "0.75rem", fontSize: "0.8rem", color: "#94a3b8", textAlign: "center" }}>{children}</div>;
}
function InfoLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", padding: "0.45rem 0.75rem", borderTop: "1px solid #f8fafc", fontSize: "0.8rem" }}>
      <span style={{ width: 120, color: "#64748b", flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: mono ? "monospace" : undefined, fontSize: mono ? "0.75rem" : undefined }}>{value}</span>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detail, setDetail] = useState<TenantDetail | null>(null);

  // 필터
  const [q, setQ] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  function load() {
    Promise.all([
      apiFetch("/api/admin/stats"),
      apiFetch("/api/admin/tenants"),
    ]).then(([s, t]) => {
      setStats(s as Stats);
      setTenants(t as Tenant[]);
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isSuperAdmin()) { router.replace("/"); return; }
    load();
  }, []);

  async function toggleStatus(tenant: Tenant, e: React.MouseEvent) {
    e.stopPropagation();
    const next = tenant.status === "active" ? "suspended" : "active";
    if (!confirm(`${tenant.name}을 ${next === "suspended" ? "정지" : "활성화"}하시겠습니까?`)) return;
    setActionLoading(tenant.id);
    await apiFetch(`/api/admin/tenants/${tenant.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status: next } : t));
    setActionLoading(null);
  }

  async function openDetail(tenant: Tenant) {
    const d: any = await apiFetch(`/api/admin/tenants/${tenant.id}`);
    setDetail({ ...tenant, ...d });
  }

  const filtered = tenants.filter(t => {
    if (q && !((t.name || "").toLowerCase().includes(q.toLowerCase()))) return false;
    if (filterPlan && t.plan !== filterPlan) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  if (loading) return <div style={{ padding: "2rem", color: "#64748b" }}>로딩 중…</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: 1300 }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.5rem" }}>슈퍼어드민</h1>

      {/* 집계 카드 */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.875rem", marginBottom: "2rem" }}>
          {[
            { label: "전체 테넌트", value: stats.tenants.total, color: "#0f172a" },
            { label: "활성", value: stats.tenants.active, color: "#16a34a" },
            { label: "트라이얼", value: stats.tenants.trial, color: "#d97706" },
            { label: "정지", value: stats.tenants.suspended, color: "#dc2626" },
            { label: "전체 리드", value: stats.outreach.total_leads.toLocaleString(), color: "#2563eb" },
            { label: "총 발송", value: stats.outreach.total_sent.toLocaleString(), color: "#7c3aed" },
            { label: "이달 MRR", value: `₩${stats.revenue.monthly_krw.toLocaleString()}`, color: "#0f172a" },
          ].map(c => (
            <div key={c.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "1rem 1.1rem" }}>
              <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* 검색·필터 */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="워크스페이스 검색…"
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.875rem", width: 220 }}
        />
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.875rem" }}>
          <option value="">전체 플랜</option>
          {["trial","starter","growth","pro","internal"].map(p => (
            <option key={p} value={p}>{PLAN_LABEL[p]}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.875rem" }}>
          <option value="">전체 상태</option>
          <option value="active">활성</option>
          <option value="suspended">정지</option>
        </select>
        <span style={{ fontSize: "0.8rem", color: "#64748b", alignSelf: "center" }}>
          {filtered.length} / {tenants.length}개
        </span>
      </div>

      {/* 테넌트 테이블 */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.835rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                {["워크스페이스", "플랜", "상태", "구독", "리드", "발송", "가입일", "트라이얼 만료", "관리"].map(h => (
                  <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "left", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}
                  onClick={() => openDetail(t)}
                  style={{ borderTop: "1px solid #f1f5f9", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <td style={{ padding: "0.7rem 1rem", fontWeight: 600 }}>
                    {t.name || t.id.slice(0, 8)}
                    {t.trial_expired && (
                      <span style={{ marginLeft: 5, fontSize: "0.68rem", background: "#fef2f2", color: "#dc2626", padding: "1px 5px", borderRadius: 4 }}>만료</span>
                    )}
                  </td>
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <span style={{
                      fontSize: "0.72rem", fontWeight: 700,
                      color: PLAN_COLOR[t.plan] || "#64748b",
                      background: "#f8fafc", padding: "2px 8px", borderRadius: 99,
                    }}>{PLAN_LABEL[t.plan] || t.plan}</span>
                  </td>
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <span style={{ color: STATUS_COLOR[t.status] || "#64748b", fontWeight: 600, fontSize: "0.8rem" }}>
                      ● {t.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.7rem 1rem", color: "#64748b", fontSize: "0.8rem" }}>
                    {t.subscription?.status || "—"}
                    {t.subscription?.amount ? ` ₩${t.subscription.amount.toLocaleString()}` : ""}
                  </td>
                  <td style={{ padding: "0.7rem 1rem", textAlign: "right" }}>{t.lead_count.toLocaleString()}</td>
                  <td style={{ padding: "0.7rem 1rem", textAlign: "right", color: "#64748b" }}>
                    {t.touchpoint_sent.toLocaleString()}<span style={{ color: "#cbd5e1" }}>/{t.touchpoint_total.toLocaleString()}</span>
                  </td>
                  <td style={{ padding: "0.7rem 1rem", color: "#64748b", whiteSpace: "nowrap" }}>
                    {t.created_at?.slice(0, 10) || "—"}
                  </td>
                  <td style={{ padding: "0.7rem 1rem", color: t.trial_expired ? "#dc2626" : "#64748b", whiteSpace: "nowrap" }}>
                    {t.trial_ends_at?.slice(0, 10) || "—"}
                  </td>
                  <td style={{ padding: "0.7rem 1rem" }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => toggleStatus(t, e)}
                      disabled={actionLoading === t.id}
                      style={{
                        fontSize: "0.72rem", padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                        border: "1px solid",
                        borderColor: t.status === "active" ? "#dc2626" : "#16a34a",
                        color: t.status === "active" ? "#dc2626" : "#16a34a",
                        background: "transparent", whiteSpace: "nowrap",
                      }}
                    >
                      {actionLoading === t.id ? "…" : t.status === "active" ? "정지" : "활성화"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>테넌트 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상세 모달 */}
      {detail && (
        <DetailModal
          tenant={detail}
          onClose={() => setDetail(null)}
          onRefresh={() => { load(); setDetail(null); }}
        />
      )}
    </div>
  );
}
