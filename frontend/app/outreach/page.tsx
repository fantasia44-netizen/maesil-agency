"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

// ── 타입 ──────────────────────────────────────────────────────────────
type LeadStatus =
  | "discovered" | "analyzing" | "draft_ready" | "approved"
  | "emailed" | "replied" | "no_reply" | "negotiating"
  | "deal" | "rejected" | "archived";

type Lead = {
  id: string;
  platform: string;
  platform_url: string | null;
  handle_name: string | null;
  subscriber_count: number | null;
  community_size: number | null;
  contact_email: string | null;
  contact_kakao: string | null;
  contact_naver_cafe: string | null;
  contact_instagram: string | null;
  best_content_id: string | null;
  best_content_title: string | null;
  best_content_views: number | null;
  content_summary: string | null;
  channel_type: string | null;
  approach_strategy: string | null;
  conversion_power_score: number;
  competitive_risk_score: number;
  has_paid_course: boolean;
  has_tool_recommendation: boolean;
  sells_own_program: boolean;
  sells_competing_tool: boolean;
  score: number;
  grade: string;
  status: LeadStatus;
  touch_count: number;
  last_touch_at: string | null;
  emailed_at: string | null;
  reply_type: string | null;
  reply_summary: string | null;
  created_at: string;
};

type KpiData = {
  discovered: number;
  emailed: number;
  replied: number;
  negotiating: number;
  deal: number;
  touches_sent: number;
  touches_replied: number;
};

type ScanStats = {
  total_leads: number;
  total_scanned_content: number;
  by_platform: Record<string, number>;
  by_status: Record<string, number>;
  by_grade: Record<string, number>;
  kpi: KpiData;
};

// ── 상수 ──────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  discovered:  "신규발굴",
  analyzing:   "분석중",
  draft_ready: "초안완료",
  approved:    "승인됨",
  emailed:     "발송됨",
  replied:     "회신옴",
  no_reply:    "무응답",
  negotiating: "협의중",
  deal:        "제휴완료",
  rejected:    "제외",
  archived:    "보관",
};

const STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  discovered:  { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  analyzing:   { bg: "#faf5ff", color: "#7c3aed", border: "#ddd6fe" },
  draft_ready: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  approved:    { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  emailed:     { bg: "#f0fdf4", color: "#166534", border: "#86efac" },
  replied:     { bg: "#fef9c3", color: "#92400e", border: "#fde68a" },
  no_reply:    { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" },
  negotiating: { bg: "#fff1f2", color: "#be123c", border: "#fecdd3" },
  deal:        { bg: "#d1fae5", color: "#064e3b", border: "#6ee7b7" },
  rejected:    { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" },
  archived:    { bg: "#f8fafc", color: "#cbd5e1", border: "#e2e8f0" },
};

const GRADE_COLOR: Record<string, { bg: string; color: string }> = {
  S: { bg: "#7c3aed", color: "#fff" },
  A: { bg: "#1d4ed8", color: "#fff" },
  B: { bg: "#0369a1", color: "#fff" },
  C: { bg: "#64748b", color: "#fff" },
  D: { bg: "#e2e8f0", color: "#94a3b8" },
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube:    "YouTube",
  naver_blog: "네이버블로그",
  tistory:    "티스토리",
  instagram:  "인스타그램",
  naver_cafe: "네이버카페",
};

const CHANNEL_TYPE_LABEL: Record<string, string> = {
  educator:        "강사형",
  reviewer:        "리뷰어",
  case_sharer:     "사례공유",
  tool_expert:     "툴전문",
  community_admin: "커뮤니티",
  influencer:      "인플루언서",
};

// ── 헬퍼 ──────────────────────────────────────────────────────────────
function fmtNum(n: number | null | undefined): string {
  if (n == null) return "-";
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

function fmtDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function scoreColor(score: number): string {
  if (score >= 85) return "#7c3aed";
  if (score >= 70) return "#1d4ed8";
  if (score >= 50) return "#0369a1";
  if (score >= 30) return "#64748b";
  return "#cbd5e1";
}

function contentLink(lead: Lead): string | null {
  if (!lead.best_content_id) return null;
  if (lead.platform === "youtube") {
    return `https://www.youtube.com/watch?v=${lead.best_content_id}`;
  }
  return lead.best_content_id; // 블로그 URL 자체
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────
export default function OutreachPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  const loadAll = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [leadsData, statsData] = await Promise.all([
        apiFetch<Lead[]>("/api/outreach/leads?limit=500&min_score=0", {}, 30000),
        apiFetch<ScanStats>("/api/outreach/scan/stats", {}, 15000),
      ]);
      setLeads(leadsData);
      setStats(statsData);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const triggerBatchAnalyze = async (grades = "S,A,B,C,D") => {
    setBatchAnalyzing(true);
    try {
      const res = await apiFetch<{ queued: number; message: string }>(
        `/api/outreach/leads/analyze-batch?grades=${encodeURIComponent(grades)}&limit=100`,
        { method: "POST" },
        15000,
      );
      showToast(`🔬 ${res.message}`);
      setTimeout(loadAll, 3000);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "일괄 분석 실패", false);
    } finally {
      setBatchAnalyzing(false);
    }
  };

  const triggerScan = async (platform?: string) => {
    setScanLoading(true);
    try {
      const url = platform ? `/api/outreach/scan?platform=${platform}` : "/api/outreach/scan";
      await apiFetch(url, { method: "POST" }, 15000);
      showToast(`스캔 시작됨${platform ? ` (${PLATFORM_LABEL[platform] ?? platform})` : ""} — 백그라운드 실행 중`);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "스캔 시작 실패", false);
    } finally {
      setScanLoading(false);
    }
  };

  const triggerAnalyze = async (lead: Lead) => {
    setActionId(lead.id + ":analyze");
    try {
      await apiFetch(`/api/outreach/leads/${lead.id}/analyze`, { method: "POST" }, 10000);
      showToast(`${lead.handle_name} — 심층 분석 시작 (백그라운드)`);
      setTimeout(loadAll, 2000);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "분석 실패", false);
    } finally {
      setActionId(null);
    }
  };

  const approveAndSend = async (lead: Lead) => {
    setActionId(lead.id + ":send");
    try {
      if (lead.status !== "approved") {
        await apiFetch(`/api/outreach/leads/${lead.id}/approve`, { method: "POST" }, 10000);
      }
      await apiFetch(`/api/outreach/leads/${lead.id}/send`, { method: "POST" }, 30000);
      showToast(`✅ ${lead.handle_name}에게 이메일 발송 완료`);
      loadAll();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "발송 실패", false);
    } finally {
      setActionId(null);
    }
  };

  const updateStatus = async (lead: Lead, status: string) => {
    setActionId(lead.id + ":status");
    try {
      await apiFetch(
        `/api/outreach/leads/${lead.id}/status`,
        { method: "PATCH", body: JSON.stringify({ status }), headers: { "Content-Type": "application/json" } },
        10000,
      );
      showToast("상태 업데이트 완료");
      loadAll();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "업데이트 실패", false);
    } finally {
      setActionId(null);
    }
  };

  // ── 필터링 ──────────────────────────────────────────────────────────
  const filtered = leads.filter((l) => {
    if (gradeFilter !== "all" && l.grade !== gradeFilter) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (platformFilter !== "all" && l.platform !== platformFilter) return false;
    return true;
  });

  const kpi = stats?.kpi;
  const byGrade = stats?.by_grade || {};

  return (
    <div>
      {/* 토스트 */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, right: 16, zIndex: 9999,
          background: toast.ok ? "#0f172a" : "#991b1b",
          color: "#fff", padding: "10px 18px",
          borderRadius: 8, fontSize: "0.85rem", boxShadow: "0 4px 16px rgba(0,0,0,.25)",
          maxWidth: 320,
        }}>
          {toast.msg}
        </div>
      )}

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem", gap: "0.75rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>파트너 영업 CRM</h1>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
            쿠팡·스마트스토어 셀러 인플루언서 발굴 · 멀티터치 관리
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn primary" onClick={() => triggerScan()} disabled={scanLoading} style={{ fontSize: "0.82rem", padding: "6px 14px" }}>
            {scanLoading ? "스캔 중…" : "🔍 전체 스캔"}
          </button>
          <button className="btn" onClick={() => triggerScan("youtube")} disabled={scanLoading} style={{ fontSize: "0.82rem", padding: "6px 12px" }}>
            ▶ YouTube
          </button>
          <button className="btn" onClick={() => triggerScan("naver_blog")} disabled={scanLoading} style={{ fontSize: "0.82rem", padding: "6px 12px" }}>
            N 블로그
          </button>
          <button
            className="btn"
            onClick={() => triggerBatchAnalyze()}
            disabled={batchAnalyzing}
            style={{ fontSize: "0.82rem", padding: "6px 14px", borderColor: "#7c3aed", color: "#7c3aed" }}
          >
            {batchAnalyzing ? "분석 중…" : "🔬 전체 분석"}
          </button>
        </div>
      </div>

      {err && (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c", marginBottom: "1.25rem" }}>
          {err}
        </div>
      )}

      {/* KPI 카드 */}
      {kpi && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.6rem", marginBottom: "1.5rem" }}>
          {[
            { label: "전체 발굴", value: kpi.discovered, color: "#0f172a" },
            { label: "이메일 발송", value: kpi.emailed, color: "#15803d" },
            { label: "회신 수신", value: kpi.replied, color: "#d97706" },
            { label: "협의 중", value: kpi.negotiating, color: "#7c3aed" },
            { label: "제휴 완료", value: kpi.deal, color: "#065f46" },
            { label: "터치 발송", value: kpi.touches_sent, color: "#0369a1" },
          ].map((k) => (
            <div key={k.label} className="card" style={{ textAlign: "center", padding: "0.75rem" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: k.color }}>{k.value}</div>
              <div className="muted" style={{ fontSize: "0.72rem" }}>{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 등급별 요약 */}
      {stats && Object.keys(byGrade).length > 0 && (
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: "0.78rem", marginRight: 2 }}>등급:</span>
          {["S", "A", "B", "C", "D"].map((g) => {
            const cnt = byGrade[g] || 0;
            if (!cnt) return null;
            const gc = GRADE_COLOR[g] || { bg: "#e2e8f0", color: "#64748b" };
            return (
              <button key={g} onClick={() => setGradeFilter(gradeFilter === g ? "all" : g)}
                style={{
                  padding: "3px 10px", borderRadius: 12, border: `2px solid ${gradeFilter === g ? gc.bg : "transparent"}`,
                  background: gradeFilter === g ? gc.bg : "#f1f5f9",
                  color: gradeFilter === g ? gc.color : "#64748b",
                  fontSize: "0.78rem", cursor: "pointer", fontWeight: 600,
                }}>
                {g}급 {cnt}
              </button>
            );
          })}
          {gradeFilter !== "all" && (
            <button onClick={() => setGradeFilter("all")} style={{ fontSize: "0.75rem", color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>
              초기화
            </button>
          )}
        </div>
      )}

      {/* 상태·플랫폼 필터 */}
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
        {["all", "discovered", "draft_ready", "approved", "emailed", "replied", "no_reply", "negotiating", "deal", "archived"].map((s) => {
          const active = statusFilter === s;
          const cnt = s === "all" ? leads.length : (stats?.by_status?.[s] ?? 0);
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                padding: "4px 12px", borderRadius: 18, border: "1px solid",
                borderColor: active ? "#0f172a" : "#e2e8f0",
                background: active ? "#0f172a" : "#fff",
                color: active ? "#fff" : "#64748b",
                fontSize: "0.76rem", cursor: "pointer", fontWeight: active ? 600 : 400,
              }}>
              {s === "all" ? "전체" : STATUS_LABEL[s] ?? s}{cnt > 0 ? ` ${cnt}` : ""}
            </button>
          );
        })}
      </div>

      {stats && Object.keys(stats.by_platform || {}).length > 1 && (
        <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <button onClick={() => setPlatformFilter("all")}
            style={{ padding: "3px 10px", borderRadius: 14, border: "1px solid", fontSize: "0.74rem", cursor: "pointer",
              borderColor: platformFilter === "all" ? "#0f172a" : "#e2e8f0",
              background: platformFilter === "all" ? "#0f172a" : "#fff",
              color: platformFilter === "all" ? "#fff" : "#64748b" }}>
            전체 플랫폼
          </button>
          {Object.entries(stats.by_platform).map(([p, cnt]) => (
            <button key={p} onClick={() => setPlatformFilter(platformFilter === p ? "all" : p)}
              style={{ padding: "3px 10px", borderRadius: 14, border: "1px solid", fontSize: "0.74rem", cursor: "pointer",
                borderColor: platformFilter === p ? "#0369a1" : "#e2e8f0",
                background: platformFilter === p ? "#eff6ff" : "#fff",
                color: platformFilter === p ? "#0369a1" : "#64748b" }}>
              {PLATFORM_LABEL[p] ?? p} {cnt}
            </button>
          ))}
        </div>
      )}

      {/* 리드 목록 */}
      {loading ? (
        <div className="muted" style={{ textAlign: "center", padding: "3rem" }}>로딩 중…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", color: "#64748b", padding: "2.5rem" }}>
          조건에 맞는 리드가 없습니다.<br />
          <span style={{ fontSize: "0.82rem" }}>상단 "전체 스캔" 버튼으로 첫 스캔을 시작하세요.</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {filtered.map((lead) => {
            const sc = STATUS_COLOR[lead.status] ?? STATUS_COLOR.discovered;
            const gc = GRADE_COLOR[lead.grade] ?? { bg: "#e2e8f0", color: "#64748b" };
            const isExpanded = expandedId === lead.id;
            const cLink = contentLink(lead);
            const busy = actionId?.startsWith(lead.id);

            return (
              <div key={lead.id} className="card" style={{ padding: "0.9rem 1.1rem", opacity: lead.grade === "D" ? 0.6 : 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>

                  {/* 점수 + 등급 */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 44, flexShrink: 0 }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: scoreColor(lead.score) }}>{lead.score}</div>
                    <div style={{
                      background: gc.bg, color: gc.color,
                      fontSize: "0.7rem", fontWeight: 700, padding: "1px 6px", borderRadius: 8, marginTop: 2,
                    }}>
                      {lead.grade}급
                    </div>
                  </div>

                  {/* 채널 정보 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", marginBottom: 3 }}>
                      {lead.platform_url ? (
                        <a href={lead.platform_url} target="_blank" rel="noopener noreferrer"
                          style={{ fontWeight: 600, fontSize: "0.92rem", color: "#0f172a", textDecoration: "none" }}
                          onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                          onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                          {lead.handle_name || lead.platform_url}
                        </a>
                      ) : (
                        <span style={{ fontWeight: 600, fontSize: "0.92rem" }}>{lead.handle_name}</span>
                      )}
                      <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: "0.68rem", fontWeight: 600,
                        background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                        {STATUS_LABEL[lead.status] ?? lead.status}
                      </span>
                      <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: "0.68rem",
                        background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0" }}>
                        {PLATFORM_LABEL[lead.platform] ?? lead.platform}
                      </span>
                      {lead.channel_type && (
                        <span style={{ padding: "2px 7px", borderRadius: 10, fontSize: "0.68rem",
                          background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" }}>
                          {CHANNEL_TYPE_LABEL[lead.channel_type] ?? lead.channel_type}
                        </span>
                      )}
                    </div>

                    <div className="muted" style={{ fontSize: "0.78rem", lineHeight: 1.8 }}>
                      {lead.subscriber_count != null && <>구독자 {fmtNum(lead.subscriber_count)}</>}
                      {lead.community_size != null && <> · 커뮤니티 {fmtNum(lead.community_size)}</>}
                      {lead.contact_email && <> · 📧 {lead.contact_email}</>}
                      {lead.contact_kakao && <> · 카카오</>}
                      {lead.contact_naver_cafe && <> · <a href={lead.contact_naver_cafe} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>카페</a></>}
                      {lead.contact_instagram && <> · <a href={lead.contact_instagram} target="_blank" rel="noopener noreferrer" style={{ color: "#7c3aed" }}>인스타</a></>}
                    </div>

                    {/* 전환력 / 위험 지표 */}
                    <div style={{ display: "flex", gap: "0.35rem", marginTop: 4, flexWrap: "wrap" }}>
                      {lead.conversion_power_score > 0 && (
                        <span style={{ fontSize: "0.68rem", background: "#d1fae5", color: "#065f46", padding: "1px 6px", borderRadius: 8 }}>
                          전환 +{lead.conversion_power_score}
                        </span>
                      )}
                      {lead.competitive_risk_score > 0 && (
                        <span style={{ fontSize: "0.68rem", background: "#fef2f2", color: "#b91c1c", padding: "1px 6px", borderRadius: 8 }}>
                          리스크 -{lead.competitive_risk_score}
                        </span>
                      )}
                      {lead.has_paid_course && (
                        <span style={{ fontSize: "0.68rem", background: "#fffbeb", color: "#92400e", padding: "1px 6px", borderRadius: 8 }}>유료강의</span>
                      )}
                      {lead.has_tool_recommendation && (
                        <span style={{ fontSize: "0.68rem", background: "#eff6ff", color: "#1d4ed8", padding: "1px 6px", borderRadius: 8 }}>툴추천</span>
                      )}
                      {lead.sells_own_program && (
                        <span style={{ fontSize: "0.68rem", background: "#fff1f2", color: "#be123c", padding: "1px 6px", borderRadius: 8 }}>자체프로그램</span>
                      )}
                      {lead.sells_competing_tool && (
                        <span style={{ fontSize: "0.68rem", background: "#f1f5f9", color: "#64748b", padding: "1px 6px", borderRadius: 8 }}>경쟁툴</span>
                      )}
                      {lead.touch_count > 0 && (
                        <span style={{ fontSize: "0.68rem", background: "#faf5ff", color: "#7c3aed", padding: "1px 6px", borderRadius: 8 }}>
                          터치 {lead.touch_count}회 {lead.last_touch_at ? fmtDate(lead.last_touch_at) : ""}
                        </span>
                      )}
                    </div>

                    {lead.content_summary && (
                      <div style={{ marginTop: 4, fontSize: "0.78rem", color: "#475569", lineHeight: 1.5 }}>
                        {lead.content_summary}
                      </div>
                    )}

                    {cLink && lead.best_content_title && (
                      <div style={{ marginTop: 3, fontSize: "0.75rem", color: "#64748b" }}>
                        {lead.platform === "youtube" ? "🎬" : "📝"}{" "}
                        <a href={cLink} target="_blank" rel="noopener noreferrer" style={{ color: "#64748b" }}>
                          {lead.best_content_title}
                        </a>
                        {lead.best_content_views != null && <> ({fmtNum(lead.best_content_views)}회)</>}
                      </div>
                    )}

                    {/* 전략 (펼침) */}
                    {isExpanded && lead.approach_strategy && (
                      <div style={{ marginTop: 8, padding: "8px 12px", background: "#f8fafc", borderRadius: 6, fontSize: "0.78rem", color: "#374151", lineHeight: 1.6 }}>
                        <strong>접근 전략:</strong> {lead.approach_strategy}
                      </div>
                    )}

                    {lead.emailed_at && (
                      <div style={{ marginTop: 3, fontSize: "0.72rem", color: "#15803d" }}>
                        ✅ 발송: {fmtDate(lead.emailed_at)}
                        {lead.reply_type && <> · 회신: {lead.reply_type}</>}
                      </div>
                    )}
                  </div>

                  {/* 액션 버튼 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flexShrink: 0, alignItems: "flex-end" }}>
                    {/* 분석 / 재분석 */}
                    {lead.status !== "emailed" && lead.status !== "replied" && lead.status !== "no_reply" && lead.status !== "negotiating" && lead.status !== "deal" && lead.status !== "rejected" && (
                      <button className="btn primary"
                        style={{ fontSize: "0.74rem", padding: "4px 10px", whiteSpace: "nowrap", opacity: lead.status === "analyzing" ? 0.6 : 1 }}
                        disabled={!!busy || lead.status === "analyzing"}
                        onClick={() => triggerAnalyze(lead)}>
                        {lead.status === "analyzing" ? "분석중…" : actionId === lead.id + ":analyze" ? "시작중…" : lead.status === "discovered" ? "🔬 분석" : "🔄 재분석"}
                      </button>
                    )}

                    {/* 이메일 발송 (draft_ready / approved) */}
                    {["draft_ready", "approved"].includes(lead.status) && lead.contact_email && (
                      <button className="btn primary"
                        style={{ fontSize: "0.74rem", padding: "4px 10px", whiteSpace: "nowrap" }}
                        disabled={!!busy}
                        onClick={() => approveAndSend(lead)}>
                        {actionId === lead.id + ":send" ? "발송 중…" : "📧 발송"}
                      </button>
                    )}

                    {/* 상세 페이지 */}
                    <button className="btn"
                      style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                      onClick={() => router.push(`/outreach/${lead.id}`)}>
                      상세
                    </button>

                    {/* 전략 토글 */}
                    {lead.approach_strategy && (
                      <button className="btn"
                        style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                        onClick={() => setExpandedId(isExpanded ? null : lead.id)}>
                        {isExpanded ? "접기" : "전략"}
                      </button>
                    )}

                    {/* 상태 드롭다운 */}
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead, e.target.value)}
                      disabled={!!busy}
                      style={{
                        fontSize: "0.72rem", padding: "3px 6px", border: "1px solid #e2e8f0",
                        borderRadius: 6, background: "#fff", color: "#475569", cursor: "pointer",
                      }}>
                      {Object.keys(STATUS_LABEL).map((s) => (
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
