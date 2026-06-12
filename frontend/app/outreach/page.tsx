"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

// ── 타입 ──────────────────────────────────────────────────────────────
type LeadStatus = "new" | "emailed" | "replied" | "rejected";

type Lead = {
  id: string;
  channel_id: string;
  channel_title: string | null;
  channel_url: string | null;
  subscriber_count: number | null;
  contact_email: string | null;
  naver_cafe_url: string | null;
  best_video_id: string | null;
  best_video_title: string | null;
  best_video_views: number | null;
  content_summary: string | null;
  score: number;
  status: LeadStatus;
  emailed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ScanStats = {
  total_leads: number;
  total_scanned_videos: number;
  by_status: Record<string, number>;
};

// ── 헬퍼 ──────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "신규",
  emailed: "발송됨",
  replied: "회신옴",
  rejected: "제외",
};

const STATUS_COLOR: Record<LeadStatus, { bg: string; color: string; border: string }> = {
  new:      { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  emailed:  { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  replied:  { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  rejected: { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" },
};

function scoreColor(score: number): string {
  if (score >= 70) return "#15803d";
  if (score >= 50) return "#d97706";
  return "#64748b";
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return "-";
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

function fmtDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("ko-KR");
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────
export default function OutreachPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [leadsResp, statsResp] = await Promise.all([
        apiFetch<Lead[]>("/api/outreach/leads?limit=100&min_score=0", {}, 15000),
        apiFetch<ScanStats>("/api/outreach/scan/stats", {}, 15000),
      ]);
      setLeads(leadsResp);
      setStats(statsResp);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const triggerScan = async () => {
    setScanLoading(true);
    try {
      await apiFetch("/api/outreach/scan", { method: "POST", body: JSON.stringify({}) }, 15000);
      showToast("스캔 시작됨 — 백그라운드에서 실행 중입니다");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "스캔 시작 실패");
    } finally {
      setScanLoading(false);
    }
  };

  const sendEmail = async (lead: Lead) => {
    if (!lead.contact_email) { showToast("이메일 주소가 없습니다"); return; }
    setSendingId(lead.id);
    try {
      await apiFetch(`/api/outreach/leads/${lead.id}/send`, { method: "POST", body: JSON.stringify({}) }, 30000);
      showToast(`✅ ${lead.channel_title}에게 이메일 발송 완료`);
      loadAll();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "발송 실패");
    } finally {
      setSendingId(null);
    }
  };

  const updateStatus = async (lead: Lead, status: LeadStatus) => {
    try {
      await apiFetch(
        `/api/outreach/leads/${lead.id}/status`,
        { method: "PATCH", body: JSON.stringify({ status }), headers: { "Content-Type": "application/json" } },
        10000,
      );
      showToast("상태 업데이트 완료");
      loadAll();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "업데이트 실패");
    }
  };

  const filtered = statusFilter === "all"
    ? leads
    : leads.filter((l) => l.status === statusFilter);

  return (
    <div>
      {/* 토스트 */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, right: 16, zIndex: 9999,
          background: "#0f172a", color: "#fff", padding: "10px 18px",
          borderRadius: 8, fontSize: "0.85rem", boxShadow: "0 4px 16px rgba(0,0,0,.2)",
        }}>
          {toast}
        </div>
      )}

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>유튜브 영업 리드</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            쿠팡·스마트스토어 셀러 유튜버 파트너십 관리
          </p>
        </div>
        <button
          className="btn primary"
          onClick={triggerScan}
          disabled={scanLoading}
          style={{ minWidth: 110 }}
        >
          {scanLoading ? "스캔 중…" : "🔍 지금 스캔"}
        </button>
      </div>

      {err && (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c", marginBottom: "1.25rem" }}>
          {err}
        </div>
      )}

      {/* 통계 카드 */}
      {stats && (
        <div className="grid" style={{ marginBottom: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#0f172a" }}>{stats.total_leads}</div>
            <div className="muted" style={{ fontSize: "0.78rem" }}>전체 리드</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1d4ed8" }}>{stats.by_status?.new ?? 0}</div>
            <div className="muted" style={{ fontSize: "0.78rem" }}>신규 (미발송)</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#15803d" }}>{stats.by_status?.emailed ?? 0}</div>
            <div className="muted" style={{ fontSize: "0.78rem" }}>발송 완료</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#92400e" }}>{stats.by_status?.replied ?? 0}</div>
            <div className="muted" style={{ fontSize: "0.78rem" }}>회신 수신</div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#64748b" }}>{stats.total_scanned_videos}</div>
            <div className="muted" style={{ fontSize: "0.78rem" }}>스캔된 영상</div>
          </div>
        </div>
      )}

      {/* 필터 탭 */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {(["all", "new", "emailed", "replied", "rejected"] as const).map((s) => {
          const active = statusFilter === s;
          const count = s === "all" ? leads.length : (stats?.by_status?.[s] ?? 0);
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "5px 14px", borderRadius: 20, border: "1px solid",
                borderColor: active ? "#0f172a" : "#e2e8f0",
                background: active ? "#0f172a" : "#fff",
                color: active ? "#fff" : "#64748b",
                fontSize: "0.8rem", cursor: "pointer", fontWeight: active ? 600 : 400,
                transition: "all 0.12s",
              }}
            >
              {s === "all" ? "전체" : STATUS_LABEL[s]} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* 리드 목록 */}
      {loading ? (
        <div className="muted" style={{ textAlign: "center", padding: "3rem" }}>로딩 중…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "#64748b", padding: "2.5rem" }}>
          리드가 없습니다.<br />
          <span style={{ fontSize: "0.85rem" }}>오른쪽 상단 "지금 스캔" 버튼으로 첫 스캔을 시작하세요.</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map((lead) => {
            const sc = STATUS_COLOR[lead.status] ?? STATUS_COLOR.new;
            const isSending = sendingId === lead.id;
            return (
              <div key={lead.id} className="card" style={{ padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>

                  {/* 스코어 뱃지 */}
                  <div style={{
                    minWidth: 48, textAlign: "center", flexShrink: 0,
                    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 4px",
                  }}>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: scoreColor(lead.score) }}>{lead.score}</div>
                    <div style={{ fontSize: "0.62rem", color: "#94a3b8" }}>점수</div>
                  </div>

                  {/* 채널 정보 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: 4 }}>
                      {lead.channel_url ? (
                        <a href={lead.channel_url} target="_blank" rel="noopener noreferrer"
                           style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0f172a", textDecoration: "none" }}
                           onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                           onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                        >
                          {lead.channel_title || lead.channel_id}
                        </a>
                      ) : (
                        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{lead.channel_title || lead.channel_id}</span>
                      )}
                      <span style={{
                        padding: "2px 8px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 600,
                        background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                      }}>
                        {STATUS_LABEL[lead.status]}
                      </span>
                    </div>

                    <div className="muted" style={{ fontSize: "0.8rem", lineHeight: 1.7 }}>
                      구독자 {fmtNum(lead.subscriber_count)}
                      {lead.contact_email && <> · 📧 {lead.contact_email}</>}
                      {lead.naver_cafe_url && <> · <a href={lead.naver_cafe_url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>카페</a></>}
                    </div>

                    {lead.content_summary && (
                      <div style={{ marginTop: 4, fontSize: "0.8rem", color: "#475569" }}>
                        {lead.content_summary}
                      </div>
                    )}

                    {lead.best_video_title && (
                      <div style={{ marginTop: 4, fontSize: "0.78rem", color: "#64748b" }}>
                        🎬{" "}
                        {lead.best_video_id ? (
                          <a href={`https://www.youtube.com/watch?v=${lead.best_video_id}`}
                             target="_blank" rel="noopener noreferrer" style={{ color: "#64748b" }}>
                            {lead.best_video_title}
                          </a>
                        ) : lead.best_video_title}
                        {lead.best_video_views != null && <> ({fmtNum(lead.best_video_views)}회)</>}
                      </div>
                    )}

                    {lead.emailed_at && (
                      <div style={{ marginTop: 4, fontSize: "0.75rem", color: "#15803d" }}>
                        ✅ 발송일: {fmtDate(lead.emailed_at)}
                      </div>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
                    {lead.contact_email && lead.status === "new" && (
                      <button
                        className="btn primary"
                        style={{ fontSize: "0.78rem", padding: "5px 12px", whiteSpace: "nowrap" }}
                        disabled={isSending}
                        onClick={() => sendEmail(lead)}
                      >
                        {isSending ? "발송 중…" : "📧 이메일 발송"}
                      </button>
                    )}

                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead, e.target.value as LeadStatus)}
                      style={{
                        fontSize: "0.76rem", padding: "4px 8px", border: "1px solid #e2e8f0",
                        borderRadius: 6, background: "#fff", color: "#475569", cursor: "pointer",
                      }}
                    >
                      {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
