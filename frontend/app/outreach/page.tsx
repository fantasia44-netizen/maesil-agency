"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/api";

// ── 타입 ──────────────────────────────────────────────────────────────
type LeadStatus =
  | "discovered" | "analyzing" | "draft_ready" | "approved"
  | "emailed" | "replied" | "no_reply" | "negotiating"
  | "deal" | "rejected" | "archived" | "unsubscribe";

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
  campaign?: string | null;
  interview_candidate?: boolean;
  interview_verdict?: string | null;
  touch_count: number;
  last_touch_at: string | null;
  emailed_at: string | null;
  opened_at: string | null;
  open_count: number;
  click_count: number;
  clicked_at: string | null;
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

// ── 발송이력 타입 ──────────────────────────────────────────────────────
type TouchLog = {
  id: string;
  touch_sequence: number;
  channel: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  replied_at: string | null;
  lead_handle_name: string | null;
  lead_contact_email: string | null;
  lead_platform: string | null;
  lead_grade: string | null;
  lead_status: string | null;
};

const TOUCH_STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "예약됨",   color: "#92400e", bg: "#fffbeb" },
  sent:     { label: "발송완료", color: "#166534", bg: "#f0fdf4" },
  failed:   { label: "실패",     color: "#b91c1c", bg: "#fef2f2" },
  replied:  { label: "회신옴",   color: "#7c3aed", bg: "#faf5ff" },
  bounced:  { label: "반송",     color: "#64748b", bg: "#f8fafc" },
  skipped:  { label: "건너뜀",   color: "#94a3b8", bg: "#f1f5f9" },
};

const TOUCH_CHANNEL_ICON: Record<string, string> = {
  email:               "📧",
  instagram_dm:        "📸",
  naver_cafe_message:  "💬",
  youtube_comment:     "▶",
  kakao_message:       "💛",
};

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
  const [mainTab, setMainTab] = useState<"leads" | "history" | "report">("leads");
  const [campaign, setCampaign] = useState<"partner" | "interview">("partner");
  const [campCounts, setCampCounts] = useState<{ partner: number; interview: number; interview_candidate: number }>({ partner: 0, interview: 0, interview_candidate: 0 });
  const [findingCand, setFindingCand] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deepVerifying, setDeepVerifying] = useState(false);
  const [touchLogs, setTouchLogs] = useState<TouchLog[]>([]);

  // UTC ISO → KST 날짜 문자열 (YYYY-MM-DD)
  const toKSTDate = (iso: string | null | undefined): string => {
    if (!iso) return "";
    const d = new Date(iso);
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().slice(0, 10);
  };
  const todayKSTStr = toKSTDate(new Date().toISOString());
  const [touchLoading, setTouchLoading] = useState(false);
  const [touchStatusFilter, setTouchStatusFilter] = useState<string>("all");
  const [touchDateFilter, setTouchDateFilter] = useState<"today" | "all">("today");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  };

  const loadTouchLogs = async () => {
    setTouchLoading(true);
    try {
      const data = await apiFetch<TouchLog[]>("/api/outreach/touchpoints?limit=5000", {}, 30000);
      setTouchLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[touchLogs] error:", e);
      showToast("발송 이력 로드 실패", false);
    } finally {
      setTouchLoading(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [leadsData, statsData] = await Promise.all([
        apiFetch<Lead[]>(`/api/outreach/leads?limit=10000&min_score=0&campaign=${campaign}`, {}, 60000),
        apiFetch<ScanStats>("/api/outreach/scan/stats", {}, 15000),
      ]);
      setLeads(leadsData);
      setStats(statsData);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "데이터 로드 실패");
    } finally {
      setLoading(false);
    }
    apiFetch<{ partner: number; interview: number; interview_candidate: number }>("/api/outreach/campaign-counts", {}, 15000)
      .then(setCampCounts).catch(() => {});
  };

  const findInterviewCandidates = async () => {
    setFindingCand(true);
    try {
      const r = await apiFetch<{ candidates: number; cleared: number }>(
        "/api/outreach/leads/find-interview-candidates?min_subscribers=3000",
        { method: "POST" }, 30000);
      setToast({ msg: `인터뷰 후보 ${r.candidates}건 (강사형 제외${r.cleared ? ` · 잘못된 표시 ${r.cleared}건 해제` : ""})`, ok: true });
      loadAll();
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : "후보 발굴 실패", ok: false });
    } finally { setFindingCand(false); }
  };

  const verifyChannels = async () => {
    setVerifying(true);
    try {
      const r = await apiFetch<{ checked: number; alive: number; dead: number }>(
        "/api/outreach/leads/verify-channels?only_candidates=true",
        { method: "POST" }, 120000);
      setToast({ msg: `채널 검증: ${r.checked}개 중 날아간 채널 ${r.dead}개 제외 (생존 ${r.alive})`, ok: true });
      loadAll();
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : "채널 검증 실패", ok: false });
    } finally { setVerifying(false); }
  };

  const deepVerify = async () => {
    setDeepVerifying(true);
    try {
      const r = await apiFetch<{ checked: number; kept: number; dropped: number; swept?: number; invited?: number; remaining?: number }>(
        "/api/outreach/leads/deep-verify-interview?limit=25",
        { method: "POST" }, 300000);
      setToast({ msg: `출연모집 ${r.invited ?? 0}건 인정 · 스팸 ${r.swept ?? 0}건 제외 · 영상분석 ${r.checked}건(제외 ${r.dropped}/유지 ${r.kept})${r.remaining ? ` · 잔여 ${r.remaining}건은 반복 실행` : ""}`, ok: true });
      loadAll();
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : "심층 검증 실패", ok: false });
    } finally { setDeepVerifying(false); }
  };

  const toggleInterviewCand = async (lead: Lead, value: boolean) => {
    // 낙관적 업데이트 (목록에서 즉시 반영)
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, interview_candidate: value } : l)
                         .filter(l => campaign !== "interview" || l.campaign === "interview" || l.interview_candidate));
    try {
      await apiFetch(`/api/outreach/leads/${lead.id}/interview-candidate`,
        { method: "PATCH", body: JSON.stringify({ value }) }, 10000);
      setCampCounts(c => ({ ...c, interview_candidate: Math.max(0, c.interview_candidate + (value ? 1 : -1)) }));
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : "변경 실패", ok: false });
      loadAll();
    }
  };

  useEffect(() => { loadAll(); }, [campaign]);
  useEffect(() => { if (mainTab === "history") loadTouchLogs(); }, [mainTab]);

  const triggerRescore = async () => {
    setBatchAnalyzing(true);
    try {
      const res = await apiFetch<{ queued: number; message: string }>(
        "/api/outreach/leads/rescore",
        { method: "POST" },
        15000,
      );
      showToast(`📊 ${res.message}`);
      setTimeout(loadAll, 35000);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "등급 재채점 실패", false);
    } finally {
      setBatchAnalyzing(false);
    }
  };

  const triggerBatchAnalyze = async (grades = "S,A,B,C,D", force = false) => {
    setBatchAnalyzing(true);
    try {
      const params = new URLSearchParams({ grades, limit: "20000" });
      if (force) params.set("force", "true");
      const res = await apiFetch<{ queued: number; message: string }>(
        `/api/outreach/leads/analyze-batch?${params.toString()}`,
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

  const runDiagnostics = async () => {
    try {
      type Diag = {
        gates: { enabled: boolean; gmail_configured: boolean; now_kst: string; weekend: boolean;
                 business_hours: boolean; daily_cap: number; drip_grades: string; platforms: string[] };
        today: { scheduled_seq1: number; sent_seq1: number; room: number };
        supply: { eligible_now: number; d_eligible: number; approved_total: number; approved_unsent: number;
                  approved_no_email: number; approved_off_platform: number;
                  discovered_backlog: number; analyzing_backlog: number };
        hint: string;
      };
      const d = await apiFetch<Diag>("/api/outreach/cold-drip/diagnostics", {}, 20000);
      const g = d.gates, t = d.today, s = d.supply;
      const blockedGate = !g.enabled ? "❌ cold_drip 꺼짐"
        : !g.gmail_configured ? "❌ Gmail 미설정"
        : g.weekend ? "⏸ 주말(발송안함)"
        : !g.business_hours ? `⏸ 업무시간 외 (현재 ${g.now_kst.slice(11,16)} KST)`
        : "✅ 게이트 통과";
      const msg = [
        `[cold_drip 진단]  ${blockedGate}`,
        ``,
        `■ 오늘: 예약 ${t.scheduled_seq1} · 발송 ${t.sent_seq1} / cap ${g.daily_cap} (여유 ${t.room})`,
        ``,
        `■ 공급 펀넬`,
        `  S/A/B/C eligible: ${s.eligible_now}  D급 eligible: ${s.d_eligible}  ← 둘 다 0이면 리드 고갈`,
        `  approved 전체: ${s.approved_total} (미발송 ${s.approved_unsent})`,
        `  approved인데 이메일 없음: ${s.approved_no_email}`,
        `  approved인데 youtube/naver 아님: ${s.approved_off_platform}`,
        `  분석 대기(discovered): ${s.discovered_backlog}`,
        `  분석 중/고착(analyzing): ${s.analyzing_backlog}`,
        ``,
        `대상등급 ${g.drip_grades} · 플랫폼 ${g.platforms.join("+")}`,
        ``,
        `💡 ${d.hint}`,
      ].join("\n");
      const doSchedule = (s.eligible_now === 0 && s.d_eligible === 0)
        ? false
        : confirm(`${msg}\n\n지금 즉시 예약 실행할까요? (스케줄러 대기 없이 바로 적용)`);
      if (doSchedule) {
        const r = await apiFetch<{ scheduled?: number; skipped?: string }>("/api/outreach/cold-drip/schedule-now", { method: "POST" }, 30000);
        showToast(r.scheduled ? `예약 완료: ${r.scheduled}건` : `스킵: ${r.skipped ?? "알 수 없음"}`, !!r.scheduled);
        await loadTouchLogs();
      } else {
        alert(msg);
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "진단 실패", false);
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
  // 플랫폼 탭 기준 1차 필터 (상태 카운트 계산에 사용)
  const platformLeads = platformFilter === "all"
    ? leads
    : leads.filter((l) => l.platform === platformFilter);

  const GRADE_ORDER: Record<string, number> = { S: 0, A: 1, B: 2, C: 3, D: 4 };

  const filtered = platformLeads
    .filter((l) => {
      if (gradeFilter !== "all" && l.grade !== gradeFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const ga = GRADE_ORDER[a.grade] ?? 5;
      const gb = GRADE_ORDER[b.grade] ?? 5;
      if (ga !== gb) return ga - gb;       // 등급 우선
      return b.score - a.score;            // 같은 등급 내 점수 내림차순
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
          <button
            className="btn"
            onClick={() => triggerBatchAnalyze("S,A,B,C,D", true)}
            disabled={batchAnalyzing}
            style={{ fontSize: "0.82rem", padding: "6px 14px", borderColor: "#c2410c", color: "#c2410c" }}
            title="이미 분석된 draft_ready 리드도 새 프롬프트로 재분석"
          >
            {batchAnalyzing ? "분석 중…" : "♻️ 재분석"}
          </button>
          <button
            className="btn"
            onClick={triggerRescore}
            disabled={batchAnalyzing}
            style={{ fontSize: "0.82rem", padding: "6px 14px", borderColor: "#0369a1", color: "#0369a1" }}
            title="AI 재실행 없이 새 등급 기준으로 전체 재채점 (빠름)"
          >
            {batchAnalyzing ? "채점 중…" : "📊 등급 재채점"}
          </button>
          <button
            className="btn"
            onClick={runDiagnostics}
            style={{ fontSize: "0.82rem", padding: "6px 14px", borderColor: "#15803d", color: "#15803d" }}
            title="cold_drip 자동발송이 왜 적은지 — 게이트·공급 펀넬 진단"
          >
            🔍 발송 진단
          </button>
          <button
            className="btn"
            onClick={async () => {
              try {
                const r = await apiFetch<{ queued: number; message: string }>("/api/outreach/leads/reextract-emails", { method: "POST" }, 30000);
                showToast(`📧 ${r.message}`, true);
              } catch (e: unknown) {
                showToast(e instanceof Error ? e.message : "이메일 재추출 실패", false);
              }
            }}
            style={{ fontSize: "0.82rem", padding: "6px 14px", borderColor: "#7c3aed", color: "#7c3aed" }}
            title="이메일 없는 리드의 저장된 텍스트에서 이메일 재파싱 (오브퍼스케이트 포함)"
          >
            📧 이메일 재추출
          </button>
          <button
            className="btn"
            onClick={async () => {
              if (!confirm("이메일 없는 유튜브 리드 최대 200건의 외부 링크(블로그·카페·링크트리 등)를 크롤링합니다.\n수 분 소요됩니다. 시작할까요?")) return;
              try {
                const r = await apiFetch<{ ok: boolean; message: string }>("/api/outreach/leads/crawl-emails", { method: "POST" }, 30000);
                showToast(`🔗 ${r.message}`, true);
              } catch (e: unknown) {
                showToast(e instanceof Error ? e.message : "링크 크롤링 실패", false);
              }
            }}
            style={{ fontSize: "0.82rem", padding: "6px 14px", borderColor: "#0369a1", color: "#0369a1" }}
            title="유튜버 채널 외부 링크(블로그·카페·링크트리) 크롤링해 이메일 수집"
          >
            🔗 링크 크롤링
          </button>
        </div>
      </div>

      {err && (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c", marginBottom: "1.25rem" }}>
          {err}
        </div>
      )}

      {/* 캠페인 스위처 — 파트너 모집 vs 인터뷰/출연 (타겟 분리) */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {([
          { key: "partner", label: "파트너 모집", icon: "🤝", desc: "강사·셀러 (기존)" },
          { key: "interview", label: "인터뷰 · 출연", icon: "🎙️", desc: "매실K가 출연할 채널" },
        ] as const).map(({ key, label, icon, desc }) => {
          const active = campaign === key;
          return (
            <button key={key} onClick={() => setCampaign(key)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
                borderRadius: 10, cursor: "pointer", textAlign: "left",
                border: active ? "1.5px solid #0f172a" : "1px solid #e2e8f0",
                background: active ? "#0f172a" : "#fff",
                color: active ? "#fff" : "#334155",
              }}>
              <span style={{ fontSize: "1.15rem" }}>{icon}</span>
              <span>
                <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>{label}</span>
                <span style={{ fontSize: "0.72rem", opacity: 0.8, marginLeft: 6 }}>
                  {campCounts[key] ?? 0}건
                </span>
                <div style={{ fontSize: "0.68rem", opacity: 0.65 }}>{desc}</div>
              </span>
            </button>
          );
        })}
        {campaign === "interview" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button onClick={findInterviewCandidates} disabled={findingCand}
              style={{
                padding: "8px 14px", borderRadius: 8, border: "1px solid #0f172a",
                background: "#fff", color: "#0f172a", cursor: "pointer",
                fontSize: "0.82rem", fontWeight: 600,
              }}>
              {findingCand ? "찾는 중…" : "🔍 기존 발굴에서 인터뷰 후보 찾기"}
            </button>
            <button onClick={verifyChannels} disabled={verifying}
              style={{
                padding: "8px 14px", borderRadius: 8, border: "1px solid #b91c1c",
                background: "#fff", color: "#b91c1c", cursor: "pointer",
                fontSize: "0.82rem", fontWeight: 600,
              }}>
              {verifying ? "검증 중…" : "🩺 채널 생존 검증"}
            </button>
            <button onClick={deepVerify} disabled={deepVerifying}
              style={{
                padding: "8px 14px", borderRadius: 8, border: "1px solid #7c3aed",
                background: "#fff", color: "#7c3aed", cursor: "pointer",
                fontSize: "0.82rem", fontWeight: 600,
              }}>
              {deepVerifying ? "영상 분석 중…" : "🎯 심층 검증 (영상 스크립트)"}
            </button>
            <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
              셀러 시청자·구독 3천+ 채널을 겸용 후보로 표시 · <b>자동발송 대상 아님</b>(수동 제안)
              {campCounts.interview_candidate > 0 && ` · 겸용 ${campCounts.interview_candidate}건`}
            </span>
          </div>
        )}
      </div>

      {/* KPI 카드 */}
      {kpi && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.6rem", marginBottom: "1.5rem" }}>
          {[
            { label: "전체 발굴", value: kpi.discovered, color: "#0f172a", sub: null },
            { label: "발송 리드", value: kpi.emailed, color: "#15803d", sub: `총 ${kpi.touches_sent}회 발송` },
            { label: "회신 수신", value: kpi.replied, color: "#d97706", sub: "이메일+카톡" },
            { label: "협의 중", value: kpi.negotiating, color: "#7c3aed", sub: null },
            { label: "제휴 완료", value: kpi.deal, color: "#065f46", sub: null },
            { label: "팔로업 발송", value: Math.max(0, kpi.touches_sent - kpi.emailed), color: "#0369a1", sub: `(초기 ${kpi.emailed} + 팔로업 ${Math.max(0, kpi.touches_sent - kpi.emailed)})` },
          ].map((k) => (
            <div key={k.label} className="card" style={{ textAlign: "center", padding: "0.75rem" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: k.color }}>{k.value}</div>
              <div className="muted" style={{ fontSize: "0.72rem" }}>{k.label}</div>
              {k.sub && <div style={{ fontSize: "0.64rem", color: "#94a3b8", marginTop: 2 }}>{k.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* 등급별 요약 */}
      {stats && Object.keys(byGrade).length > 0 && (
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: "0.78rem", marginRight: 2 }}>등급:</span>
          {["S", "A", "B", "C", "D"].map((g) => {
            const cnt = platformLeads.filter((l) => l.grade === g).length;
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

      {/* 메인 탭: 리드목록 / 발송이력 / 영업보고서 */}
      <div style={{ display: "flex", gap: 0, marginBottom: "1.25rem", borderBottom: "2px solid #e2e8f0" }}>
        {([
          { key: "leads",   label: "리드 목록",  icon: "📋" },
          { key: "history", label: "발송 이력",  icon: "📨" },
          { key: "report",  label: "영업 보고서", icon: "📊" },
        ] as const).map(({ key, label, icon }) => {
          const active = mainTab === key;
          return (
            <button key={key} onClick={() => {
              setMainTab(key);
            }}
              style={{
                padding: "8px 20px", border: "none", background: "none", cursor: "pointer",
                fontSize: "0.88rem", fontWeight: active ? 700 : 400,
                color: active ? "#0f172a" : "#94a3b8",
                borderBottom: active ? "2px solid #0f172a" : "2px solid transparent",
                marginBottom: -2,
              }}>
              {icon} {label}
            </button>
          );
        })}
      </div>

      {/* ── 발송 이력 탭 ── */}
      {mainTab === "history" && (
        <div>
          {/* 날짜 필터 */}
          <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.6rem", alignItems: "center" }}>
            {(["today", "all"] as const).map((d) => {
              const active = touchDateFilter === d;
              const label = d === "today" ? "📅 오늘" : "전체";
              return (
                <button key={d} onClick={() => setTouchDateFilter(d)}
                  style={{
                    padding: "4px 14px", borderRadius: 18, border: "1px solid",
                    borderColor: active ? "#7c3aed" : "#e2e8f0",
                    background: active ? "#7c3aed" : "#fff",
                    color: active ? "#fff" : "#64748b",
                    fontSize: "0.76rem", cursor: "pointer", fontWeight: active ? 600 : 400,
                  }}>{label}</button>
              );
            })}
            {touchDateFilter === "today" && (() => {
              const todaySent = touchLogs.filter(t => t.status === "sent" && toKSTDate(t.sent_at) === todayKSTStr).length;
              const todayPending = touchLogs.filter(t => t.status === "pending" && toKSTDate(t.scheduled_for) === todayKSTStr).length;
              return (
                <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: 4 }}>
                  발송됨 <strong style={{ color: "#166534" }}>{todaySent}</strong>건 · 예약됨 <strong style={{ color: "#92400e" }}>{todayPending}</strong>건
                </span>
              );
            })()}
          </div>

          {/* 상태 필터 */}
          <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {["all", "sent", "pending", "failed", "replied", "bounced", "skipped"].map((s) => {
              const dateFiltered = touchDateFilter === "today"
                ? touchLogs.filter(t => toKSTDate(t.sent_at ?? t.scheduled_for) === todayKSTStr)
                : touchLogs;
              const active = touchStatusFilter === s;
              const cnt = s === "all" ? dateFiltered.length : dateFiltered.filter(t => t.status === s).length;
              if (s !== "all" && cnt === 0) return null;
              const ts = TOUCH_STATUS_LABEL[s];
              return (
                <button key={s} onClick={() => setTouchStatusFilter(s)}
                  style={{
                    padding: "4px 12px", borderRadius: 18, border: "1px solid",
                    borderColor: active ? "#0f172a" : "#e2e8f0",
                    background: active ? "#0f172a" : "#fff",
                    color: active ? "#fff" : "#64748b",
                    fontSize: "0.76rem", cursor: "pointer", fontWeight: active ? 600 : 400,
                  }}>
                  {s === "all" ? `전체 ${cnt}` : `${ts?.label ?? s} ${cnt}`}
                </button>
              );
            })}
            <button onClick={loadTouchLogs} disabled={touchLoading}
              style={{ marginLeft: "auto", fontSize: "0.76rem", padding: "4px 12px", borderRadius: 18,
                border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer" }}>
              {touchLoading ? "새로고침…" : "🔄 새로고침"}
            </button>
          </div>

          {touchLoading ? (
            <div className="muted" style={{ textAlign: "center", padding: "3rem" }}>로딩 중…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {(() => {
                return touchLogs
                  .filter(t => touchDateFilter === "all" || toKSTDate(t.sent_at ?? t.scheduled_for) === todayKSTStr)
                  .filter(t => touchStatusFilter === "all" || t.status === touchStatusFilter);
              })()
                .map((t) => {
                  const ts = TOUCH_STATUS_LABEL[t.status] ?? { label: t.status, color: "#64748b", bg: "#f1f5f9" };
                  const gc = GRADE_COLOR[t.lead_grade ?? ""] ?? { bg: "#e2e8f0", color: "#64748b" };
                  const isAuto = t.touch_sequence > 1;
                  const timeStr = t.sent_at
                    ? new Date(t.sent_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                    : t.scheduled_for
                    ? `예약: ${new Date(t.scheduled_for).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                    : "-";
                  return (
                    <div key={t.id} className="card" style={{ padding: "0.7rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      {/* 차수 + 채널 */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 40 }}>
                        <div style={{ fontSize: "1.1rem" }}>{TOUCH_CHANNEL_ICON[t.channel] ?? "📌"}</div>
                        <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{t.touch_sequence}차</div>
                      </div>

                      {/* 리드 정보 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{t.lead_handle_name ?? "-"}</span>
                          {t.lead_grade && (
                            <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: gc.bg, color: gc.color }}>
                              {t.lead_grade}급
                            </span>
                          )}
                          <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 10, background: ts.bg, color: ts.color, fontWeight: 600 }}>
                            {ts.label}
                          </span>
                          <span style={{ fontSize: "0.68rem", padding: "1px 7px", borderRadius: 8,
                            background: isAuto ? "#eff6ff" : "#f0fdf4",
                            color: isAuto ? "#1d4ed8" : "#15803d",
                            border: `1px solid ${isAuto ? "#bfdbfe" : "#bbf7d0"}` }}>
                            {isAuto ? "자동" : "수동"}
                          </span>
                        </div>
                        <div className="muted" style={{ fontSize: "0.75rem", marginTop: 2 }}>
                          {t.lead_contact_email ?? "-"} · {PLATFORM_LABEL[t.lead_platform ?? ""] ?? t.lead_platform}
                          {t.replied_at && <span style={{ color: "#7c3aed", marginLeft: 6 }}>회신: {new Date(t.replied_at).toLocaleDateString("ko-KR")}</span>}
                        </div>
                      </div>

                      {/* 시간 */}
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "right", whiteSpace: "nowrap" }}>
                        {timeStr}
                      </div>
                    </div>
                  );
                })}
              {(() => {
                const filtered = touchLogs
                  .filter(t => touchDateFilter === "all" || toKSTDate(t.sent_at ?? t.scheduled_for) === todayKSTStr)
                  .filter(t => touchStatusFilter === "all" || t.status === touchStatusFilter);
                return filtered.length === 0 ? (
                  <div className="card" style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>
                    {touchDateFilter === "today" ? "오늘 발송 내역이 없습니다." : "발송 이력이 없습니다."}
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── 리드 목록 탭 ── */}
      {mainTab === "leads" && <>

      {/* 채널 탭 (플랫폼 구분) */}
      <div style={{ display: "flex", gap: 0, marginBottom: "1rem", borderBottom: "2px solid #e2e8f0" }}>
        {[
          { key: "all",        label: "전체",        icon: "📋", color: "#0f172a" },
          { key: "youtube",    label: "YouTube",     icon: "▶",  color: "#dc2626" },
          { key: "naver_blog", label: "네이버 블로그", icon: "N",  color: "#03c75a" },
        ].map(({ key, label, icon, color }) => {
          const active = platformFilter === key;
          const cnt = key === "all"
            ? leads.length
            : (stats?.by_platform?.[key] ?? 0);
          return (
            <button key={key} onClick={() => setPlatformFilter(key)}
              style={{
                padding: "8px 18px", border: "none", background: "none", cursor: "pointer",
                fontSize: "0.85rem", fontWeight: active ? 700 : 400,
                color: active ? color : "#94a3b8",
                borderBottom: active ? `2px solid ${color}` : "2px solid transparent",
                marginBottom: -2, whiteSpace: "nowrap",
              }}>
              {icon} {label} <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* 상태 필터 */}
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {["all", "discovered", "draft_ready", "approved", "emailed", "replied", "no_reply", "negotiating", "deal", "archived"].map((s) => {
          const active = statusFilter === s;
          const cnt = s === "all"
            ? filtered.length
            : filtered.filter((l) => l.status === s).length;
          if (s !== "all" && cnt === 0) return null;
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
          {filtered.map((lead: Lead) => {
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

                    {/* 카톡/기타 채널 회신 빠른 처리 */}
                    {["emailed", "no_reply"].includes(lead.status) && (
                      <button className="btn"
                        style={{
                          fontSize: "0.72rem", padding: "4px 9px", whiteSpace: "nowrap",
                          background: "#fef9c3", border: "1px solid #fde68a", color: "#92400e",
                        }}
                        disabled={!!busy}
                        onClick={() => updateStatus(lead, "replied")}>
                        📱 카톡 회신
                      </button>
                    )}
                    {lead.status === "replied" && (
                      <button className="btn"
                        style={{
                          fontSize: "0.72rem", padding: "4px 9px", whiteSpace: "nowrap",
                          background: "#f0fdf4", border: "1px solid #86efac", color: "#166534",
                        }}
                        disabled={!!busy}
                        onClick={() => updateStatus(lead, "negotiating")}>
                        🤝 협의 중으로
                      </button>
                    )}

                    {/* 인터뷰 탭: 겸용 후보 수동 제외 (AI제품판매 등 오분류 큐레이션) */}
                    {campaign === "interview" && lead.interview_candidate && (
                      <button className="btn"
                        style={{ fontSize: "0.7rem", padding: "3px 8px", color: "#b91c1c", whiteSpace: "nowrap" }}
                        title="이 채널을 인터뷰 후보에서 제외 (파트너 목록엔 그대로 남음)"
                        onClick={() => toggleInterviewCand(lead, false)}>
                        ✕ 인터뷰 제외
                      </button>
                    )}
                    {campaign === "interview" && lead.interview_verdict && (
                      <span title="심층 검증 판정 근거"
                        style={{
                          fontSize: "0.68rem", color: "#6d28d9", background: "#f5f3ff",
                          border: "1px solid #ddd6fe", borderRadius: 6, padding: "3px 7px",
                          maxWidth: 260, lineHeight: 1.3,
                        }}>
                        🎯 {lead.interview_verdict}
                      </span>
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
      </> }

      {/* ── 영업 보고서 탭 ── */}
      {mainTab === "report" && stats && (() => {
        const bs = stats.by_status;
        const k = stats.kpi;

        // 퍼널 스텝
        const funnel = [
          { label: "발굴",   value: k.discovered,  color: "#1d4ed8", icon: "🔍" },
          { label: "발송",   value: k.emailed,      color: "#0369a1", icon: "📧" },
          { label: "회신",   value: k.replied,      color: "#d97706", icon: "💬" },
          { label: "협의중", value: k.negotiating,  color: "#7c3aed", icon: "🤝" },
          { label: "제휴완료", value: k.deal,        color: "#065f46", icon: "✅" },
        ];

        // 이메일 반응 지표
        const emailedLeads = leads.filter(l => ["emailed","replied","no_reply","negotiating","deal","unsubscribe"].includes(l.status));
        const openedLeads = leads.filter(l => l.open_count > 0);
        const clickedLeads = leads.filter(l => l.click_count > 0);
        const unsubLeads = leads.filter(l => l.status === "unsubscribe");

        // 즉시 조치 필요
        const actionNeeded = [
          { label: "초안 완료 (승인 대기)", leads: leads.filter(l => l.status === "draft_ready"), color: "#c2410c" },
          { label: "승인됨 (발송 대기)",   leads: leads.filter(l => l.status === "approved"),   color: "#0369a1" },
          { label: "회신 옴 (후속 필요)",  leads: leads.filter(l => l.status === "replied"),    color: "#d97706" },
          { label: "협의 중 (클로징 필요)", leads: leads.filter(l => l.status === "negotiating"), color: "#7c3aed" },
        ].filter(g => g.leads.length > 0);

        // 등급별 전환 분석
        const gradeReport = ["S", "A", "B", "C", "D"].map(g => {
          const gl = leads.filter(l => l.grade === g);
          const emailed = gl.filter(l => ["emailed","replied","no_reply","negotiating","deal"].includes(l.status)).length;
          const replied = gl.filter(l => ["replied","negotiating","deal"].includes(l.status)).length;
          const deal = gl.filter(l => l.status === "deal").length;
          return { grade: g, total: gl.length, emailed, replied, deal };
        }).filter(r => r.total > 0);

        // 플랫폼별 집계
        const platformReport = Object.entries(stats.by_platform || {})
          .map(([platform, total]) => {
            const pl = leads.filter(l => l.platform === platform);
            const emailed = pl.filter(l => ["emailed","replied","no_reply","negotiating","deal"].includes(l.status)).length;
            const deal = pl.filter(l => l.status === "deal").length;
            return { platform, total, emailed, deal };
          })
          .sort((a, b) => b.total - a.total);

        const pct = (a: number, b: number) => b === 0 ? "-" : `${Math.round(a / b * 100)}%`;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* 퍼널 */}
            <div>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>영업 퍼널</h3>
              <div style={{ display: "flex", gap: "0.25rem", alignItems: "stretch", flexWrap: "wrap" }}>
                {funnel.map((step, i) => {
                  const prev = i > 0 ? funnel[i - 1].value : null;
                  const convRate = prev != null ? pct(step.value, prev) : null;
                  return (
                    <div key={step.label} style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap" }}>
                      <div className="card" style={{
                        padding: "1rem 1.25rem", textAlign: "center", minWidth: 90,
                        borderTop: `3px solid ${step.color}`,
                      }}>
                        <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>{step.icon}</div>
                        <div style={{ fontSize: "1.75rem", fontWeight: 800, color: step.color }}>{step.value}</div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{step.label}</div>
                        {convRate && (
                          <div style={{ fontSize: "0.68rem", marginTop: 4, padding: "2px 6px", borderRadius: 8,
                            background: "#f0fdf4", color: "#15803d", fontWeight: 600 }}>
                            ↑{convRate}
                          </div>
                        )}
                      </div>
                      {i < funnel.length - 1 && (
                        <div style={{ color: "#cbd5e1", fontSize: "1.2rem", flexShrink: 0 }}>›</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="muted" style={{ fontSize: "0.72rem", marginTop: 6 }}>
                전체 발송률 {pct(k.emailed, k.discovered)} · 회신률 {pct(k.replied, k.emailed)} · 제휴전환률 {pct(k.deal, k.emailed)}
              </div>
            </div>

            {/* 이메일 반응 지표 */}
            <div>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>이메일 반응 지표</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.6rem" }}>
                {[
                  {
                    label: "오픈율",
                    value: pct(openedLeads.length, emailedLeads.length),
                    sub: `${openedLeads.length}/${emailedLeads.length}명`,
                    color: "#0369a1",
                    icon: "👁",
                    note: "이미지 로드 기반 — Gmail 등은 집계 제외될 수 있음",
                  },
                  {
                    label: "카톡 클릭율",
                    value: pct(clickedLeads.length, emailedLeads.length),
                    sub: `${clickedLeads.length}/${emailedLeads.length}명`,
                    color: "#d97706",
                    icon: "💬",
                    note: "카카오 오픈톡 링크 클릭",
                  },
                  {
                    label: "수신거부율",
                    value: pct(unsubLeads.length, emailedLeads.length),
                    sub: `${unsubLeads.length}명`,
                    color: "#dc2626",
                    icon: "🚫",
                    note: "링크 클릭 수신거부",
                  },
                ].map(m => (
                  <div key={m.label} className="card" style={{ padding: "0.9rem 1rem" }}>
                    <div style={{ fontSize: "1.3rem", marginBottom: 4 }}>{m.icon}</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: m.color }}>{m.value}</div>
                    <div style={{ fontWeight: 600, fontSize: "0.82rem", marginTop: 2 }}>{m.label}</div>
                    <div className="muted" style={{ fontSize: "0.71rem", marginTop: 2 }}>{m.sub}</div>
                    <div className="muted" style={{ fontSize: "0.68rem", marginTop: 4, lineHeight: 1.4 }}>{m.note}</div>
                  </div>
                ))}
              </div>

              {/* 오픈한 리드 목록 */}
              {openedLeads.length > 0 && (
                <div style={{ marginTop: "0.75rem" }}>
                  <div className="muted" style={{ fontSize: "0.75rem", marginBottom: "0.4rem" }}>메일 열어본 리드</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {openedLeads.map(l => {
                      const gc = GRADE_COLOR[l.grade] ?? { bg: "#e2e8f0", color: "#64748b" };
                      const sc = STATUS_COLOR[l.status] ?? STATUS_COLOR.discovered;
                      return (
                        <div key={l.id} className="card" style={{ padding: "0.55rem 0.9rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span style={{ padding: "1px 6px", borderRadius: 8, fontSize: "0.68rem",
                            fontWeight: 700, background: gc.bg, color: gc.color, flexShrink: 0 }}>
                            {l.grade}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: "0.83rem" }}>{l.handle_name ?? "-"}</span>
                          <span style={{ fontSize: "0.71rem", padding: "1px 7px", borderRadius: 8,
                            background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                            {STATUS_LABEL[l.status] ?? l.status}
                          </span>
                          <span className="muted" style={{ fontSize: "0.71rem" }}>
                            {l.open_count}회 오픈 · 최초 {fmtDate(l.opened_at)}
                          </span>
                          {l.click_count > 0 && (
                            <span style={{ fontSize: "0.71rem", color: "#d97706", marginLeft: 4 }}>
                              💬 카톡 {l.click_count}회 클릭
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 즉시 조치 필요 */}
            {actionNeeded.length > 0 && (
              <div>
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>즉시 조치 필요</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {actionNeeded.map(group => (
                    <div key={group.label} className="card" style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem", color: group.color }}>
                          {group.label}
                        </span>
                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: group.color }}>
                          {group.leads.length}건
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                        {group.leads.slice(0, 5).map(l => {
                          const gc = GRADE_COLOR[l.grade] ?? { bg: "#e2e8f0", color: "#64748b" };
                          return (
                            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" }}>
                              <span style={{ padding: "1px 6px", borderRadius: 8, fontSize: "0.68rem",
                                fontWeight: 700, background: gc.bg, color: gc.color, flexShrink: 0 }}>
                                {l.grade}
                              </span>
                              <span style={{ fontWeight: 500 }}>{l.handle_name ?? "-"}</span>
                              <span className="muted" style={{ fontSize: "0.72rem" }}>
                                {PLATFORM_LABEL[l.platform] ?? l.platform}
                                {l.last_touch_at && ` · 마지막 ${fmtDate(l.last_touch_at)}`}
                              </span>
                              <button
                                onClick={() => { setMainTab("leads"); setStatusFilter(group.leads[0]?.status ?? "all"); }}
                                style={{ marginLeft: "auto", fontSize: "0.68rem", padding: "2px 8px",
                                  border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff",
                                  color: "#64748b", cursor: "pointer" }}>
                                목록 보기
                              </button>
                            </div>
                          );
                        })}
                        {group.leads.length > 5 && (
                          <div className="muted" style={{ fontSize: "0.72rem" }}>외 {group.leads.length - 5}건 더</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 등급별 전환 분석 */}
            <div>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>등급별 전환 분석</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                      {["등급", "발굴", "발송", "발송률", "회신", "회신률", "제휴", "전환률"].map(h => (
                        <th key={h} style={{ padding: "6px 12px", textAlign: "right", fontWeight: 600,
                          color: "#64748b", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gradeReport.map(r => {
                      const gc = GRADE_COLOR[r.grade] ?? { bg: "#e2e8f0", color: "#64748b" };
                      return (
                        <tr key={r.grade} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 8, fontWeight: 700,
                              fontSize: "0.75rem", background: gc.bg, color: gc.color }}>
                              {r.grade}급
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{r.total}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>{r.emailed}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "#0369a1" }}>{pct(r.emailed, r.total)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>{r.replied}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "#d97706" }}>{pct(r.replied, r.emailed)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{r.deal}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "#065f46", fontWeight: 700 }}>{pct(r.deal, r.emailed)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 플랫폼별 성과 */}
            <div>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>플랫폼별 성과</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {platformReport.map(p => {
                  const bar = p.total > 0 ? Math.round(p.emailed / p.total * 100) : 0;
                  return (
                    <div key={p.platform} className="card" style={{ padding: "0.7rem 1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{PLATFORM_LABEL[p.platform] ?? p.platform}</span>
                        <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.78rem" }}>
                          <span>발굴 <strong>{p.total}</strong></span>
                          <span style={{ color: "#0369a1" }}>발송 <strong>{p.emailed}</strong></span>
                          <span style={{ color: "#065f46" }}>제휴 <strong>{p.deal}</strong></span>
                        </div>
                      </div>
                      <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${bar}%`, background: "#0369a1", borderRadius: 3, transition: "width 0.3s" }} />
                      </div>
                      <div className="muted" style={{ fontSize: "0.7rem", marginTop: 3 }}>발송률 {pct(p.emailed, p.total)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 상태별 전체 현황 */}
            <div>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>상태별 전체 현황</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {Object.entries(bs)
                  .sort(([,a],[,b]) => (b as number) - (a as number))
                  .map(([status, cnt]) => {
                    const sc = STATUS_COLOR[status] ?? { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };
                    return (
                      <div key={status} style={{
                        padding: "0.5rem 0.9rem", borderRadius: 10,
                        background: sc.bg, border: `1px solid ${sc.border}`,
                        display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80,
                      }}>
                        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: sc.color }}>{cnt as number}</div>
                        <div style={{ fontSize: "0.7rem", color: sc.color, opacity: 0.8 }}>{STATUS_LABEL[status] ?? status}</div>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>
        );
      })()}
    </div>
  );
}
