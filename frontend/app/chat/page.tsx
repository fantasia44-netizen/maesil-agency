"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch, hasToken } from "../../lib/api";

/* ── 타입 ──────────────────────────────────────────────── */
type AgentResult = {
  run_id: string;
  agent_type: string;
  agent_display: string;
  message: string;
  status: string;
  cost_usd: number;
};

type ChatResp = {
  conversation_id: string;
  agents: AgentResult[];
  routed_to: string[];
};

type Message = {
  id: string;
  role: "user" | "agents";
  text?: string;
  agents?: AgentResult[];
  ts: Date;
};

type AlertEvent = {
  id: string;
  program_name: string | null;
  severity: string;
  source: string;
  title: string;
  message: string;
  created_at: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type DbMessage = {
  id: string;
  role: "user" | "agent";
  agent_type?: string;
  agent_display?: string;
  content: string;
  cost_usd?: number;
  run_id?: string;
  created_at: string;
};

/* ── 영업 에이전트 스냅샷 타입 ──────────────────────────── */
type OutreachTarget = {
  mall_name: string;
  store_url: string;
  best_rank?: number;
  product_count?: number;
  price_range?: string;
  priority_score: number;
  proposal_point: string;
};

type OutreachSnapshot = {
  id: string;
  kind: "outreach_targets" | "proposal_draft";
  payload: {
    keyword?: string;
    targets?: OutreachTarget[];
    mall_name?: string;
    store_url?: string;
    product_area?: string;
    proposal?: string;
    created_at?: string;
  };
  created_at: string;
};

/* ── CSV 다운로드 헬퍼 ───────────────────────────────────── */
function downloadTargetCSV(keyword: string, targets: OutreachTarget[]) {
  const BOM = "﻿";
  const header = ["셀러명", "스토어URL", "최고순위", "상품수", "우선도(1-10)", "제안포인트"].join(",");
  const rows = targets.map((t) =>
    [
      `"${t.mall_name}"`,
      `"${t.store_url}"`,
      t.best_rank ?? "",
      t.product_count ?? "",
      t.priority_score,
      `"${t.proposal_point.replace(/"/g, '""')}"`,
    ].join(",")
  );
  const csv = BOM + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toLocaleDateString("ko-KR").replace(/\./g, "").replace(/ /g, "");
  a.download = `영업타겟_${keyword}_${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── 상수 ──────────────────────────────────────────────── */
const AGENT_COLOR: Record<string, string> = {
  sales:        "#16a34a",
  finance:      "#2563eb",
  warehouse:    "#b45309",
  cs:           "#7c3aed",
  outreach:     "#ea580c",
  developer:    "#0891b2",
  orchestrator: "#475569",
};

const AGENT_EMOJI: Record<string, string> = {
  sales:        "📈",
  finance:      "💰",
  warehouse:    "📦",
  cs:           "💬",
  outreach:     "🎯",
  developer:    "👨‍💻",
  orchestrator: "🤖",
};

const AGENT_DISPLAY_NAME: Record<string, string> = {
  sales:     "세일즈 에이전트",
  finance:   "파이낸스 에이전트",
  warehouse: "웨어하우스 에이전트",
  cs:        "CS 에이전트",
  outreach:  "영업 에이전트",
  developer: "개발 에이전트",
};

/* ── 헬퍼: DB 메시지 → 화면 메시지 변환 ─────────────────── */
function dbToMessages(dbMsgs: DbMessage[]): Message[] {
  const result: Message[] = [];
  let i = 0;
  while (i < dbMsgs.length) {
    const m = dbMsgs[i];
    if (m.role === "user") {
      result.push({ id: m.id, role: "user", text: m.content, ts: new Date(m.created_at) });
      i++;
    } else {
      // 연속 agent 메시지를 하나의 그룹으로 묶기
      const agentGroup: AgentResult[] = [];
      const groupTs = new Date(m.created_at);
      while (i < dbMsgs.length && dbMsgs[i].role === "agent") {
        const am = dbMsgs[i];
        agentGroup.push({
          run_id:        am.run_id || am.id,
          agent_type:    am.agent_type    || "orchestrator",
          agent_display: am.agent_display || am.agent_type || "에이전트",
          message:       am.content,
          status:        "success",
          cost_usd:      am.cost_usd ?? 0,
        });
        i++;
      }
      result.push({ id: m.id + "-grp", role: "agents", agents: agentGroup, ts: groupTs });
    }
  }
  return result;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ── 에이전트별 플레이스홀더 ────────────────────────────── */
const AGENT_PLACEHOLDER: Record<string, string> = {
  sales:     "매출, 판매 현황, 베스트셀러, 채널별 실적 등을 물어보세요…",
  finance:   "정산, 수익률, 비용, 재무 현황 등을 물어보세요…",
  warehouse: "재고 현황, 입출고, 품절 위험 상품 등을 물어보세요…",
  cs:        "고객 문의, 리뷰, CS 현황 등을 물어보세요…",
  outreach:  "신규 파트너, 영업 기회, 광고 성과 등을 물어보세요…",
  developer: "에러, 버그, 코드 수정, 배포, 로그 분석 등을 질문하세요…",
};

// force_agent 허용 목록 (백엔드 DIRECT_AGENTS와 동일하게 유지)
const VALID_FORCE_AGENTS = new Set(["sales", "finance", "warehouse", "cs", "outreach", "developer"]);

/* ── 메인 컴포넌트 ─────────────────────────────────────── */
function ChatPageInner() {
  const searchParams = useSearchParams();
  // ?agent= 파라미터가 허용 목록에 없으면 null로 처리 (URL 직접 입력 방어)
  const rawAgent    = searchParams.get("agent");
  const forcedAgent = (rawAgent && VALID_FORCE_AGENTS.has(rawAgent)) ? rawAgent : null;

  const [messages,       setMessages]       = useState<Message[]>([]);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [totalCost,      setTotalCost]      = useState(0);
  const [alertBanner,    setAlertBanner]    = useState<string | null>(null);

  /* 사이드바 */
  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [convList,      setConvList]      = useState<Conversation[]>([]);
  const [convLoading,   setConvLoading]   = useState(false);
  const [histLoading,   setHistLoading]   = useState(false); // 이전 대화 로드 중

  /* 영업 에이전트 스냅샷 패널 */
  const [snapshots,       setSnapshots]       = useState<OutreachSnapshot[]>([]);
  const [snapshotOpen,    setSnapshotOpen]    = useState(false);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [proposalModal,   setProposalModal]   = useState<OutreachSnapshot | null>(null);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const alertSentRef = useRef(false);

  /* 자동 스크롤 */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* 대화 목록 불러오기 */
  function refreshConvList() {
    if (!hasToken()) return;
    setConvLoading(true);
    apiFetch<Conversation[]>("/api/chat/conversations")
      .then(setConvList)
      .catch(() => {})
      .finally(() => setConvLoading(false));
  }
  useEffect(() => { refreshConvList(); }, []);

  /* 영업 에이전트 스냅샷 로드 — forcedAgent 무관하게 항상 시도 */
  function loadSnapshots() {
    if (!hasToken()) return;
    setSnapshotLoading(true);
    apiFetch<OutreachSnapshot[]>("/api/outreach/snapshots")
      .then((data) => {
        setSnapshots(data);
        // #snapshots anchor로 왔거나 outreach 모드면 패널 자동 열기
        if (data.length > 0 && (forcedAgent === "outreach" || window.location.hash === "#snapshots")) {
          setSnapshotOpen(true);
        }
      })
      .catch(() => {})
      .finally(() => setSnapshotLoading(false));
  }
  useEffect(() => {
    loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* alert_id URL 파라미터 — 알림 자동 연결 */
  useEffect(() => {
    const alertId = searchParams.get("alert_id");
    if (!alertId || alertSentRef.current) return;
    alertSentRef.current = true;

    async function loadAlert() {
      if (!hasToken()) return;
      try {
        const event = await apiFetch<AlertEvent>(`/api/alerts/${alertId}`);
        const sev  = (event.severity || "error").toUpperCase();
        const prog = event.program_name || "(프로그램 미특정)";
        setAlertBanner(`📨 알림에서 연결됨 · ${sev} · ${prog} — ${event.title}`);

        const fixedConvId = `alert-${alertId}`;
        setConversationId(fixedConvId);
        setLoading(true);
        setMessages([{
          id: crypto.randomUUID(), role: "user",
          text: `[에러 알림 자동 연결] ${prog} · ${sev}`,
          ts: new Date(),
        }]);

        const resp = await apiFetch<ChatResp>(`/api/chat/from-alert/${alertId}`, {
          method: "POST",
          body: JSON.stringify({ conversation_id: fixedConvId, message: "" }),
        });
        setConversationId(resp.conversation_id);
        setTotalCost((p) => p + resp.agents.reduce((s, a) => s + (a.cost_usd ?? 0), 0));
        setMessages((p) => [
          ...p,
          { id: resp.conversation_id + Date.now(), role: "agents", agents: resp.agents, ts: new Date() },
        ]);
        refreshConvList(); // 목록 갱신
      } catch {
        // 무시
      } finally {
        setLoading(false);
      }
    }
    loadAlert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 이전 대화 불러와서 이어서 대화 */
  async function loadConversation(conv: Conversation) {
    if (histLoading) return;
    setHistLoading(true);
    try {
      const data = await apiFetch<{ conversation_id: string; messages: DbMessage[] }>(
        `/api/chat/conversations/${conv.id}`
      );
      const converted = dbToMessages(data.messages);
      setMessages(converted);
      setConversationId(conv.id);
      setAlertBanner(null);
      // 비용 합산
      const cost = converted.reduce(
        (s, m) => s + (m.agents?.reduce((ss, a) => ss + (a.cost_usd ?? 0), 0) ?? 0), 0
      );
      setTotalCost(cost);
    } catch {
      // 무시
    } finally {
      setHistLoading(false);
    }
  }

  /* 메시지 전송 */
  async function sendMsg(overrideMessage?: string) {
    const text = (overrideMessage ?? input).trim();
    if (!text || loading) return;
    if (!hasToken()) { window.location.href = "/login"; return; }

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text, ts: new Date() };
    setMessages((p) => [...p, userMsg]);
    if (!overrideMessage) setInput("");
    setLoading(true);

    const isBriefing = text.includes("브리핑") || text.includes("현황 보고") || text === "__briefing__";
    const endpoint   = isBriefing ? "/api/chat/briefing" : "/api/chat";

    // force_agent: 1:1 에이전트 채팅 모드일 때 오케스트레이터 bypass
    const body: Record<string, unknown> = { message: text, conversation_id: conversationId };
    if (forcedAgent && !isBriefing) body.force_agent = forcedAgent;

    try {
      const resp = await apiFetch<ChatResp>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!conversationId) setConversationId(resp.conversation_id);
      setTotalCost((p) => p + resp.agents.reduce((s, a) => s + (a.cost_usd ?? 0), 0));
      setMessages((p) => [
        ...p,
        { id: resp.conversation_id + Date.now(), role: "agents", agents: resp.agents, ts: new Date() },
      ]);
      refreshConvList(); // 대화 목록 갱신
      // 영업 에이전트 응답이 왔거나 outreach 모드면 스냅샷 갱신
      if (forcedAgent === "outreach" || resp.routed_to?.includes("outreach")) {
        loadSnapshots();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((p) => [
        ...p,
        {
          id: crypto.randomUUID(), role: "agents",
          agents: [{ run_id: "err", agent_type: "orchestrator", agent_display: "시스템",
            message: `오류: ${msg}`, status: "failed", cost_usd: 0 }],
          ts: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  }

  function reset() {
    setMessages([]);
    setConversationId(null);
    setTotalCost(0);
    setAlertBanner(null);
  }

  /* ── 렌더 ────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", gap: "0.75rem", height: "calc(100vh - 120px)" }}>

      {/* ── 사이드바: 이전 대화 목록 ── */}
      {sidebarOpen && (
        <div style={{
          width: 230, flexShrink: 0,
          border: "1px solid #e2e8f0", borderRadius: 10,
          display: "flex", flexDirection: "column", overflow: "hidden",
          background: "#fff",
        }}>
          {/* 사이드바 헤더 */}
          <div style={{
            padding: "0.7rem 0.85rem",
            borderBottom: "1px solid #e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontWeight: 600, fontSize: "0.83rem", color: "#0f172a" }}>이전 대화</span>
            <button
              onClick={reset}
              style={{
                fontSize: "0.72rem", padding: "3px 8px",
                background: "#0f172a", color: "#fff",
                border: "none", borderRadius: 5, cursor: "pointer",
              }}
            >
              + 새 대화
            </button>
          </div>

          {/* 목록 */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {convLoading && (
              <div className="muted" style={{ padding: "0.75rem 1rem", fontSize: "0.78rem" }}>불러오는 중…</div>
            )}
            {!convLoading && convList.length === 0 && (
              <div className="muted" style={{ padding: "0.75rem 1rem", fontSize: "0.78rem" }}>저장된 대화가 없습니다.</div>
            )}
            {convList.map((c) => (
              <button
                key={c.id}
                onClick={() => loadConversation(c)}
                disabled={histLoading}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "0.6rem 0.85rem",
                  background: conversationId === c.id ? "#f1f5f9" : "transparent",
                  border: "none",
                  borderLeft: conversationId === c.id ? "3px solid #0f172a" : "3px solid transparent",
                  borderBottom: "1px solid #f8fafc",
                  cursor: histLoading ? "default" : "pointer",
                  transition: "background 0.12s",
                }}
              >
                <div style={{
                  fontSize: "0.79rem", fontWeight: conversationId === c.id ? 600 : 400,
                  color: "#0f172a",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {c.title || "제목 없음"}
                </div>
                <div className="muted" style={{ fontSize: "0.68rem", marginTop: "0.1rem" }}>
                  {fmtTime(c.updated_at)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 메인 채팅 영역 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* 1:1 에이전트 모드 배너 */}
        {forcedAgent && (
          <div style={{
            background: `${AGENT_COLOR[forcedAgent] ?? "#475569"}18`,
            border: `1px solid ${AGENT_COLOR[forcedAgent] ?? "#475569"}44`,
            borderRadius: 8,
            padding: "8px 14px", marginBottom: "0.75rem",
            display: "flex", alignItems: "center", gap: 10,
            fontSize: "0.82rem",
          }}>
            <span style={{ fontSize: "1.1rem" }}>{AGENT_EMOJI[forcedAgent] ?? "🤖"}</span>
            <span style={{ flex: 1, color: AGENT_COLOR[forcedAgent] ?? "#475569", fontWeight: 600 }}>
              {AGENT_DISPLAY_NAME[forcedAgent] ?? forcedAgent}와 1:1 채팅 중
            </span>
            <button
              onClick={() => { window.location.href = "/"; }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "0.78rem" }}
            >
              ← 대시보드
            </button>
          </div>
        )}

        {/* ── 영업 에이전트 저장 자료 패널 — outreach 모드이거나 저장된 자료가 있을 때 ── */}
        {(forcedAgent === "outreach" || snapshots.length > 0) && (
          <div style={{ marginBottom: "0.75rem" }}>
            <button
              onClick={() => { setSnapshotOpen((v) => !v); if (!snapshotOpen) loadSnapshots(); }}
              style={{
                width: "100%", textAlign: "left",
                padding: "6px 12px", fontSize: "0.82rem",
                background: "#fef9ec", border: "1px solid #fed7aa",
                borderRadius: snapshotOpen ? "8px 8px 0 0" : "8px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span>📥</span>
              <span style={{ flex: 1, fontWeight: 600, color: "#92400e" }}>저장된 영업 자료</span>
              <span className="muted" style={{ fontSize: "0.75rem" }}>
                {snapshotLoading ? "로딩…" : `타겟 ${snapshots.filter(s => s.kind === "outreach_targets").length}개 · 제안서 ${snapshots.filter(s => s.kind === "proposal_draft").length}개`}
              </span>
              <span style={{ color: "#94a3b8" }}>{snapshotOpen ? "▲" : "▼"}</span>
            </button>

            {snapshotOpen && (
              <div style={{
                border: "1px solid #fed7aa", borderTop: "none",
                borderRadius: "0 0 8px 8px", background: "#fffbf5",
                maxHeight: 260, overflowY: "auto", padding: "0.5rem 0",
              }}>
                {snapshots.length === 0 && !snapshotLoading && (
                  <div className="muted" style={{ padding: "0.75rem 1rem", fontSize: "0.8rem" }}>
                    저장된 자료가 없습니다. 영업 에이전트에게 타겟을 찾아달라고 요청하세요.
                  </div>
                )}

                {/* 타겟 리스트 */}
                {snapshots.filter(s => s.kind === "outreach_targets").map((s) => (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 12px", borderBottom: "1px solid #fde68a",
                  }}>
                    <span style={{ fontSize: "0.8rem", flex: 1, color: "#78350f" }}>
                      📋 <strong>{s.payload.keyword || "키워드 없음"}</strong> 타겟 리스트
                      <span className="muted"> ({s.payload.targets?.length ?? 0}개)</span>
                      <span className="muted" style={{ fontSize: "0.72rem", marginLeft: 6 }}>
                        {new Date(s.created_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </span>
                    <button
                      className="btn"
                      style={{ fontSize: "0.72rem", padding: "2px 8px", background: "#ea580c", color: "#fff", borderColor: "#ea580c" }}
                      onClick={() => {
                        if (s.payload.targets && s.payload.keyword) {
                          downloadTargetCSV(s.payload.keyword, s.payload.targets);
                        }
                      }}
                    >
                      CSV ↓
                    </button>
                  </div>
                ))}

                {/* 제안서 */}
                {snapshots.filter(s => s.kind === "proposal_draft").map((s) => (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 12px", borderBottom: "1px solid #fde68a",
                  }}>
                    <span style={{ fontSize: "0.8rem", flex: 1, color: "#78350f" }}>
                      📝 <strong>{s.payload.mall_name || "셀러 없음"}</strong> 제안서
                      {s.payload.product_area && <span className="muted"> · {s.payload.product_area}</span>}
                      <span className="muted" style={{ fontSize: "0.72rem", marginLeft: 6 }}>
                        {new Date(s.created_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </span>
                    <button
                      className="btn"
                      style={{ fontSize: "0.72rem", padding: "2px 8px" }}
                      onClick={() => setProposalModal(s)}
                    >
                      보기
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 제안서 모달 ── */}
        {proposalModal && (
          <div
            onClick={() => setProposalModal(null)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff", borderRadius: 12, padding: "1.5rem",
                width: "min(680px, 90vw)", maxHeight: "80vh",
                display: "flex", flexDirection: "column", gap: "0.75rem",
                boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                    📝 {proposalModal.payload.mall_name} 제안서
                  </div>
                  {proposalModal.payload.store_url && (
                    <a href={proposalModal.payload.store_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: "0.78rem", color: "#2563eb" }}>
                      {proposalModal.payload.store_url}
                    </a>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    className="btn"
                    style={{ fontSize: "0.75rem" }}
                    onClick={() => {
                      navigator.clipboard.writeText(proposalModal.payload.proposal || "");
                    }}
                  >
                    📋 복사
                  </button>
                  <button onClick={() => setProposalModal(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", color: "#94a3b8" }}>
                    ×
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                <pre style={{
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                  fontSize: "0.88rem", lineHeight: 1.7,
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 8, padding: "1rem", margin: 0,
                }}>
                  {proposalModal.payload.proposal || "(내용 없음)"}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* 알림 배너 */}
        {alertBanner && (
          <div style={{
            background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8,
            padding: "8px 14px", marginBottom: "0.75rem",
            display: "flex", alignItems: "center", gap: 10,
            fontSize: "0.82rem", color: "#1e40af",
          }}>
            <span style={{ flex: 1 }}>{alertBanner}</span>
            <button onClick={() => setAlertBanner(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", fontSize: "1rem" }}>
              ×
            </button>
          </div>
        )}

        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {/* 사이드바 토글 */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? "사이드바 닫기" : "이전 대화 보기"}
              style={{
                background: "none", border: "1px solid #e2e8f0", borderRadius: 6,
                padding: "4px 8px", cursor: "pointer", fontSize: "0.85rem", color: "#64748b",
              }}
            >
              {sidebarOpen ? "◀" : "▶"}
            </button>
            <div>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
                {forcedAgent
                  ? `${AGENT_EMOJI[forcedAgent] ?? "🤖"} ${AGENT_DISPLAY_NAME[forcedAgent] ?? forcedAgent}`
                  : "대화"}
              </h2>
              <p className="muted" style={{ margin: "0.1rem 0 0 0", fontSize: "0.78rem" }}>
                {conversationId
                  ? `대화 진행 중 · ${histLoading ? "불러오는 중…" : "이어서 입력하세요"}`
                  : forcedAgent
                    ? `${AGENT_DISPLAY_NAME[forcedAgent] ?? forcedAgent}에게 직접 질문하세요.`
                    : "오케스트레이터가 질문을 분석해 적절한 에이전트로 라우팅합니다."}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {totalCost > 0 && (
              <span className="muted" style={{ fontSize: "0.75rem" }}>
                누적 비용: ${totalCost.toFixed(4)}
              </span>
            )}
            {!forcedAgent && (
              <button
                className="btn"
                style={{ fontSize: "0.78rem" }}
                onClick={() => sendMsg("__briefing__")}
                disabled={loading}
              >
                ☀️ 아침 브리핑
              </button>
            )}
            <button className="btn" onClick={reset} style={{ fontSize: "0.78rem" }}>새 대화</button>
          </div>
        </div>

        {/* 이전 대화 로드 중 인디케이터 */}
        {histLoading && (
          <div style={{
            textAlign: "center", padding: "0.5rem",
            fontSize: "0.82rem", color: "#64748b", marginBottom: "0.5rem",
          }}>
            이전 대화 불러오는 중…
          </div>
        )}

        {/* 메시지 영역 */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
          {messages.length === 0 && !loading && !histLoading && (
            <div style={{ textAlign: "center", color: "#94a3b8", marginTop: "4rem", fontSize: "0.9rem", lineHeight: 2 }}>
              {forcedAgent ? (
                <>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
                    {AGENT_EMOJI[forcedAgent] ?? "🤖"}
                  </div>
                  <strong style={{ color: AGENT_COLOR[forcedAgent] ?? "#475569" }}>
                    {AGENT_DISPLAY_NAME[forcedAgent] ?? forcedAgent}
                  </strong>와 1:1 채팅을 시작하세요.<br />
                  <span style={{ fontSize: "0.8rem" }}>
                    {AGENT_PLACEHOLDER[forcedAgent] ?? "질문을 입력하세요…"}
                  </span>
                </>
              ) : (
                <>
                  매출·재무·재고·CS 관련 질문을 입력하거나<br />
                  <strong>☀️ 아침 브리핑</strong> 버튼으로 전체 현황 보고를 받으세요.<br />
                  <span style={{ fontSize: "0.8rem" }}>← 왼쪽에서 이전 대화를 이어서 할 수 있습니다.</span>
                </>
              )}
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id}>
              {m.role === "user" ? (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ maxWidth: "70%" }}>
                    <div style={{
                      padding: "0.6rem 0.9rem",
                      borderRadius: "14px 14px 4px 14px",
                      background: "#0f172a", color: "#fff",
                      fontSize: "0.88rem", lineHeight: 1.55, whiteSpace: "pre-wrap",
                    }}>
                      {m.text}
                    </div>
                    <div className="muted" style={{ textAlign: "right", marginTop: "0.2rem" }}>
                      {m.ts.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {m.agents?.map((a) => (
                    <div key={a.run_id} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                        background: AGENT_COLOR[a.agent_type] ?? "#475569",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1rem", marginTop: 2,
                      }}>
                        {AGENT_EMOJI[a.agent_type] ?? "🤖"}
                      </div>
                      <div style={{ maxWidth: "80%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                          <span style={{ fontSize: "0.72rem", color: AGENT_COLOR[a.agent_type] ?? "#475569", fontWeight: 700 }}>
                            {a.agent_display}
                          </span>
                          {a.status === "failed" && (
                            <span className="status-badge down" style={{ fontSize: "0.65rem" }}>오류</span>
                          )}
                          {a.cost_usd > 0 && (
                            <span className="muted" style={{ fontSize: "0.65rem" }}>${a.cost_usd.toFixed(4)}</span>
                          )}
                        </div>
                        <div style={{
                          padding: "0.65rem 0.9rem",
                          borderRadius: "14px 14px 14px 4px",
                          background: a.status === "failed" ? "#fef2f2" : "#fff",
                          border: `1px solid ${a.status === "failed" ? "#fecaca" : "#e2e8f0"}`,
                          fontSize: "0.88rem", lineHeight: 1.6, whiteSpace: "pre-wrap",
                          color: a.status === "failed" ? "#b91c1c" : "#0f172a",
                        }}>
                          {a.message}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="muted" style={{ marginLeft: "42px", fontSize: "0.68rem" }}>
                    {m.ts.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: forcedAgent ? (AGENT_COLOR[forcedAgent] ?? "#e2e8f0") : "#e2e8f0",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
              }}>
                {forcedAgent ? (AGENT_EMOJI[forcedAgent] ?? "🤖") : "🤖"}
              </div>
              <div style={{ padding: "0.6rem 0.9rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px 14px 14px 4px", color: "#94a3b8", fontSize: "0.85rem" }}>
                {forcedAgent
                  ? `${AGENT_DISPLAY_NAME[forcedAgent] ?? forcedAgent} 응답 중…`
                  : "에이전트 실행 중…"}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", padding: "0.75rem 0 0 0", borderTop: "1px solid #e2e8f0", marginTop: "0.5rem" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={forcedAgent
              ? (AGENT_PLACEHOLDER[forcedAgent] ?? "질문 입력… (Enter 전송, Shift+Enter 줄바꿈)")
              : "질문 입력… (Enter 전송, Shift+Enter 줄바꿈)"}
            rows={2}
            style={{
              flex: 1, padding: "0.55rem 0.75rem", fontSize: "0.88rem",
              border: "1px solid #e2e8f0", borderRadius: 8, outline: "none",
              resize: "none", fontFamily: "inherit", lineHeight: 1.5,
            }}
          />
          <button
            className="btn primary"
            onClick={() => sendMsg()}
            disabled={loading || !input.trim()}
            style={{ height: 56, minWidth: 56, fontSize: "1.1rem" }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#94a3b8" }}>
        로딩 중…
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  );
}
