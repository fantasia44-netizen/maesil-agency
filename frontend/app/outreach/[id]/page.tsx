"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";

// ── 타입 ──────────────────────────────────────────────────────────────
type Touchpoint = {
  id: string;
  touch_sequence: number;
  channel: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  replied_at: string | null;
};

type Lead = {
  id: string;
  platform: string;
  platform_url: string | null;
  handle_name: string | null;
  subscriber_count: number | null;
  contact_email: string | null;
  contact_kakao: string | null;
  contact_naver_cafe: string | null;
  contact_instagram: string | null;
  best_content_title: string | null;
  content_summary: string | null;
  channel_type: string | null;
  approach_strategy: string | null;
  partnership_fit_reason: string | null;
  conversion_power_score: number;
  competitive_risk_score: number;
  score: number;
  grade: string;
  status: string;
  email_subject: string | null;
  email_draft: string | null;
  email_final: string | null;
  emailed_at: string | null;
  reply_type: string | null;
  reply_summary: string | null;
  reply_received_at: string | null;
  touch_count: number;
  last_touch_at: string | null;
  touchpoints: Touchpoint[];
  created_at: string;
  updated_at: string;
};

// ── 상수 ──────────────────────────────────────────────────────────────
const CHANNEL_LABEL: Record<string, string> = {
  email: "이메일",
  instagram_dm: "인스타 DM",
  naver_cafe_message: "카페 쪽지",
  youtube_comment: "유튜브 댓글",
  kakao_message: "카카오 메시지",
};

const TOUCH_STATUS_COLOR: Record<string, { color: string; label: string }> = {
  pending:  { color: "#94a3b8", label: "대기중" },
  sent:     { color: "#15803d", label: "발송됨" },
  failed:   { color: "#dc2626", label: "실패" },
  replied:  { color: "#d97706", label: "회신됨" },
  bounced:  { color: "#7c3aed", label: "반송" },
  skipped:  { color: "#e2e8f0", label: "건너뜀" },
};

const REPLY_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  interested: { label: "🎉 관심 표명", color: "#065f46" },
  question:   { label: "❓ 질문 회신", color: "#92400e" },
  declined:   { label: "❌ 거절", color: "#b91c1c" },
  auto_reply: { label: "🤖 자동응답", color: "#64748b" },
  other:      { label: "📩 기타", color: "#475569" },
};

const GRADE_BG: Record<string, string> = {
  S: "#7c3aed", A: "#1d4ed8", B: "#0369a1", C: "#64748b", D: "#cbd5e1",
};

function fmtDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params?.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  // 초안 편집 상태
  const [editSubject, setEditSubject] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const [editFinal, setEditFinal] = useState("");
  const [draftDirty, setDraftDirty] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await apiFetch<Lead>(`/api/outreach/leads/${leadId}`, {}, 15000);
      setLead(data);
      setEditSubject(data.email_subject || "");
      setEditDraft(data.email_draft || "");
      setEditFinal(data.email_final || data.email_draft || "");
      setDraftDirty(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "로드 실패");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { loadLead(); }, [loadLead]);

  const saveDraft = async () => {
    if (!lead) return;
    setActionId("save");
    try {
      await apiFetch(`/api/outreach/leads/${lead.id}/email-draft`, {
        method: "PATCH",
        body: JSON.stringify({
          email_subject: editSubject || null,
          email_draft: editDraft || null,
          email_final: editFinal || null,
        }),
        headers: { "Content-Type": "application/json" },
      }, 10000);
      showToast("초안 저장 완료");
      setDraftDirty(false);
      loadLead();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "저장 실패", false);
    } finally {
      setActionId(null);
    }
  };

  const triggerAnalyze = async () => {
    if (!lead) return;
    setActionId("analyze");
    try {
      await apiFetch(`/api/outreach/leads/${lead.id}/analyze`, { method: "POST" }, 10000);
      showToast("분석 시작됨 — 잠시 후 새로고침하세요");
      setTimeout(loadLead, 4000);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "분석 실패", false);
    } finally {
      setActionId(null);
    }
  };

  const sendEmail = async () => {
    if (!lead) return;
    setActionId("send");
    try {
      if (lead.status !== "approved") {
        await apiFetch(`/api/outreach/leads/${lead.id}/approve`, { method: "POST" }, 10000);
      }
      await apiFetch(`/api/outreach/leads/${lead.id}/send`, { method: "POST" }, 30000);
      showToast("✅ 이메일 발송 완료");
      loadLead();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "발송 실패", false);
    } finally {
      setActionId(null);
    }
  };

  const updateTouchStatus = async (touchId: string, status: string) => {
    setActionId("touch:" + touchId);
    try {
      await apiFetch(`/api/outreach/touchpoints/${touchId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
        headers: { "Content-Type": "application/json" },
      }, 10000);
      showToast(`터치포인트 → ${TOUCH_STATUS_COLOR[status]?.label ?? status}`);
      loadLead();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "업데이트 실패", false);
    } finally {
      setActionId(null);
    }
  };

  const updateLeadStatus = async (status: string) => {
    if (!lead) return;
    setActionId("status");
    try {
      await apiFetch(`/api/outreach/leads/${lead.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
        headers: { "Content-Type": "application/json" },
      }, 10000);
      showToast("상태 업데이트 완료");
      loadLead();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "업데이트 실패", false);
    } finally {
      setActionId(null);
    }
  };

  // ── 렌더 ────────────────────────────────────────────────────────────

  if (loading) return <div className="muted" style={{ textAlign: "center", padding: "4rem" }}>로딩 중…</div>;
  if (err || !lead) return (
    <div className="card" style={{ color: "#b91c1c" }}>
      {err || "리드를 찾을 수 없습니다."}
      <button className="btn" style={{ marginLeft: 12 }} onClick={() => router.push("/outreach")}>← 목록으로</button>
    </div>
  );

  const gradeBg = GRADE_BG[lead.grade] || "#e2e8f0";
  const replyInfo = lead.reply_type ? REPLY_TYPE_LABEL[lead.reply_type] : null;
  const touchpoints = lead.touchpoints || [];

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      {/* 토스트 */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, right: 16, zIndex: 9999,
          background: toast.ok ? "#0f172a" : "#991b1b",
          color: "#fff", padding: "10px 18px", borderRadius: 8,
          fontSize: "0.85rem", boxShadow: "0 4px 16px rgba(0,0,0,.25)",
        }}>
          {toast.msg}
        </div>
      )}

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <button className="btn" onClick={() => router.push("/outreach")} style={{ fontSize: "0.8rem", padding: "4px 10px" }}>
          ← 목록
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {lead.platform_url ? (
              <a href={lead.platform_url} target="_blank" rel="noopener noreferrer"
                style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                {lead.handle_name}
              </a>
            ) : (
              <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>{lead.handle_name}</span>
            )}
            <span style={{ background: gradeBg, color: "#fff", fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>
              {lead.grade}급
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: gradeBg }}>{lead.score}점</span>
          </div>
          <div className="muted" style={{ fontSize: "0.78rem", marginTop: 2 }}>
            {lead.platform} · {lead.contact_email || "이메일 없음"}
            {lead.contact_kakao && " · 카카오"}
            {lead.channel_type && ` · ${lead.channel_type}`}
          </div>
        </div>

        {/* 상태 변경 */}
        <select
          value={lead.status}
          onChange={(e) => updateLeadStatus(e.target.value)}
          disabled={!!actionId}
          style={{ fontSize: "0.8rem", padding: "5px 8px", border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff" }}>
          {["discovered","analyzing","draft_ready","approved","emailed","replied","no_reply","negotiating","deal","rejected","archived"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

        {/* 왼쪽: 채널 정보 + 회신 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

          {/* 채널 정보 */}
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.6rem", color: "#0f172a" }}>채널 정보</div>
            {lead.content_summary && (
              <p style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.6, margin: "0 0 0.6rem" }}>{lead.content_summary}</p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", fontSize: "0.78rem", color: "#64748b" }}>
              <div>전환력: <strong style={{ color: "#065f46" }}>+{lead.conversion_power_score}</strong></div>
              <div>리스크: <strong style={{ color: "#b91c1c" }}>-{lead.competitive_risk_score}</strong></div>
              <div>터치 횟수: <strong>{lead.touch_count}</strong></div>
              {lead.emailed_at && <div>발송일: <strong>{fmtDate(lead.emailed_at)}</strong></div>}
            </div>
            {lead.approach_strategy && (
              <div style={{ marginTop: "0.6rem", padding: "8px 10px", background: "#f8fafc", borderRadius: 6, fontSize: "0.78rem", color: "#374151", lineHeight: 1.6 }}>
                <strong>접근 전략:</strong> {lead.approach_strategy}
              </div>
            )}
            {lead.partnership_fit_reason && (
              <div style={{ marginTop: "0.5rem", padding: "8px 10px", background: "#f0fdf4", borderRadius: 6, fontSize: "0.78rem", color: "#374151", lineHeight: 1.6 }}>
                <strong>파트너십 적합성:</strong> {lead.partnership_fit_reason}
              </div>
            )}
          </div>

          {/* 회신 분석 */}
          {replyInfo && (
            <div className="card" style={{ borderColor: "#fde68a" }}>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.5rem", color: replyInfo.color }}>
                {replyInfo.label}
              </div>
              {lead.reply_summary && (
                <p style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.6, margin: 0 }}>{lead.reply_summary}</p>
              )}
            </div>
          )}

          {/* 액션 버튼 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {!["emailed","replied","no_reply","negotiating","deal","rejected"].includes(lead.status) && (
              <button className="btn primary" onClick={triggerAnalyze} disabled={!!actionId || lead.status === "analyzing"} style={{ fontSize: "0.82rem" }}>
                {actionId === "analyze" ? "시작 중…" : lead.status === "analyzing" ? "분석 중…" : lead.status === "discovered" ? "🔬 Haiku 심층분석" : "🔄 재분석"}
              </button>
            )}
            {["draft_ready", "approved"].includes(lead.status) && lead.contact_email && (
              <button className="btn primary" onClick={sendEmail} disabled={!!actionId} style={{ fontSize: "0.82rem" }}>
                {actionId === "send" ? "발송 중…" : "📧 이메일 발송"}
              </button>
            )}
          </div>

          {/* 터치포인트 타임라인 */}
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: "0.75rem", color: "#0f172a" }}>
              멀티터치 타임라인
            </div>
            {touchpoints.length === 0 ? (
              <div className="muted" style={{ fontSize: "0.78rem" }}>예약된 터치포인트 없음</div>
            ) : (
              <div style={{ position: "relative" }}>
                {/* 세로 선 */}
                <div style={{ position: "absolute", left: 11, top: 8, bottom: 8, width: 2, background: "#e2e8f0", zIndex: 0 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", position: "relative" }}>
                  {touchpoints.map((tp) => {
                    const tsc = TOUCH_STATUS_COLOR[tp.status] ?? { color: "#94a3b8", label: tp.status };
                    const isBusy = actionId === "touch:" + tp.id;
                    return (
                      <div key={tp.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                        {/* 점 */}
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%", background: tsc.color,
                          flexShrink: 0, marginTop: 3, position: "relative", zIndex: 1,
                          border: "2px solid #fff", boxShadow: "0 0 0 2px " + tsc.color,
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f172a" }}>
                            {tp.touch_sequence}. {CHANNEL_LABEL[tp.channel] ?? tp.channel}
                            <span style={{ marginLeft: 6, fontSize: "0.68rem", color: tsc.color, fontWeight: 400 }}>
                              {tsc.label}
                            </span>
                          </div>
                          <div className="muted" style={{ fontSize: "0.7rem" }}>
                            {tp.scheduled_for && `예약: ${fmtDate(tp.scheduled_for)}`}
                            {tp.sent_at && ` · 발송: ${fmtDate(tp.sent_at)}`}
                            {tp.replied_at && ` · 회신: ${fmtDate(tp.replied_at)}`}
                          </div>
                          {/* 수동 상태 변경 (DM 등 자동화 불가 채널) */}
                          {tp.channel !== "email" && tp.status === "sent" && (
                            <button
                              style={{ marginTop: 3, fontSize: "0.68rem", padding: "2px 8px", borderRadius: 4, border: "1px solid #fde68a", background: "#fef9c3", color: "#92400e", cursor: "pointer" }}
                              disabled={isBusy}
                              onClick={() => updateTouchStatus(tp.id, "replied")}>
                              {isBusy ? "처리 중…" : "✓ 회신 받음"}
                            </button>
                          )}
                          {tp.channel !== "email" && tp.status === "pending" && (
                            <button
                              style={{ marginTop: 3, fontSize: "0.68rem", padding: "2px 8px", borderRadius: 4, border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#15803d", cursor: "pointer" }}
                              disabled={isBusy}
                              onClick={() => updateTouchStatus(tp.id, "sent")}>
                              {isBusy ? "처리 중…" : "✓ 직접 발송 완료"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 이메일 초안 편집 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#0f172a" }}>이메일 초안 편집</div>
              {draftDirty && (
                <span style={{ fontSize: "0.7rem", color: "#d97706" }}>● 미저장</span>
              )}
            </div>

            <div style={{ marginBottom: "0.6rem" }}>
              <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: 3 }}>제목</label>
              <input
                type="text"
                value={editSubject}
                onChange={(e) => { setEditSubject(e.target.value); setDraftDirty(true); }}
                placeholder="이메일 제목 (비워두면 기본 제목 사용)"
                style={{
                  width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0",
                  borderRadius: 6, fontSize: "0.82rem", boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "0.6rem" }}>
              <label style={{ fontSize: "0.75rem", color: "#64748b", display: "block", marginBottom: 3 }}>
                AI 초안 <span style={{ color: "#94a3b8" }}>(자동 생성, 참고용)</span>
              </label>
              <textarea
                value={editDraft}
                onChange={(e) => { setEditDraft(e.target.value); setDraftDirty(true); }}
                rows={8}
                placeholder="AI 분석 후 자동 생성됩니다"
                style={{
                  width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0",
                  borderRadius: 6, fontSize: "0.8rem", resize: "vertical", boxSizing: "border-box",
                  fontFamily: "inherit", lineHeight: 1.6, color: "#374151",
                }}
              />
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "0.75rem", color: "#0369a1", fontWeight: 600, display: "block", marginBottom: 3 }}>
                최종 발송본 <span style={{ color: "#94a3b8" }}>(이 내용이 발송됨)</span>
              </label>
              <textarea
                value={editFinal}
                onChange={(e) => { setEditFinal(e.target.value); setDraftDirty(true); }}
                rows={12}
                placeholder="여기에 직접 이메일 본문을 편집하세요. AI 초안을 복사해서 수정하거나 새로 작성하세요."
                style={{
                  width: "100%", padding: "8px 10px",
                  border: "2px solid #bfdbfe",
                  borderRadius: 6, fontSize: "0.8rem", resize: "vertical", boxSizing: "border-box",
                  fontFamily: "inherit", lineHeight: 1.7, color: "#0f172a",
                  background: "#f8faff",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                className="btn primary"
                onClick={saveDraft}
                disabled={!draftDirty || actionId === "save"}
                style={{ fontSize: "0.82rem", flex: 1 }}>
                {actionId === "save" ? "저장 중…" : "💾 초안 저장"}
              </button>
              {editDraft && (
                <button
                  className="btn"
                  onClick={() => { setEditFinal(editDraft); setDraftDirty(true); }}
                  style={{ fontSize: "0.78rem", padding: "5px 10px" }}>
                  AI 초안 → 최종본 복사
                </button>
              )}
            </div>

            {lead.emailed_at && (
              <div style={{ marginTop: "0.75rem", padding: "8px 10px", background: "#f0fdf4", borderRadius: 6, fontSize: "0.75rem", color: "#15803d" }}>
                ✅ 이미 발송됨 ({fmtDate(lead.emailed_at)}) — 추가 발송 시 중복에 주의하세요
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
