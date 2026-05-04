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
  status?: "done" | "pending" | "error";
  run_id?: string;
  error?: string;
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

type ProposalSections = {
  greeting?: string;
  insight?: string;
  value_proposition?: string;
  social_proof?: string;
  cta?: string;
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
    sections?: ProposalSections;
    created_at?: string;
  };
  created_at: string;
};

/* ── 제안서 HTML 생성 (새 탭 열기 → 브라우저 인쇄 → PDF 저장) ── */
function openProposalHTML(s: OutreachSnapshot) {
  const p = s.payload;
  const mallName   = p.mall_name    || "스토어";
  const storeUrl   = p.store_url    || "";
  const productArea= p.product_area || "";
  const proposal   = p.proposal     || "";
  const sections: ProposalSections  = p.sections  ?? {};

  /* 날짜 */
  const dateStr = (() => {
    try {
      const d = new Date(p.created_at || s.created_at);
      return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
    } catch { return ""; }
  })();

  /* 본문 */
  const sectionKeys: [keyof ProposalSections, string][] = [
    ["greeting","인사말"],["insight","현황 파악"],["value_proposition","제안 내용"],
    ["social_proof","도입 효과"],["cta","다음 단계"],
  ];
  let bodyHtml = "";
  const hasSections = sectionKeys.some(([k]) => !!sections[k]);
  if (hasSections) {
    bodyHtml = sectionKeys.map(([k, label]) => {
      const content = sections[k];
      if (!content) return "";
      return `<div style="margin-bottom:1.5rem">
        <div style="font-size:.7rem;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.4rem">${label}</div>
        <div style="font-size:.95rem;color:#1e293b;line-height:1.75">${content.replace(/\n/g, "<br>")}</div>
      </div>`;
    }).join("");
  } else {
    bodyHtml = proposal.split("\n\n").filter(Boolean)
      .map(p2 => `<p style="margin-bottom:1.1rem;font-size:.95rem">${p2.replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  const html = `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>매실 제안서 — ${mallName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Noto Sans KR',-apple-system,sans-serif;background:#f1f5f9;color:#0f172a;line-height:1.75}
  .page{max-width:760px;margin:2rem auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
  .ctrl{position:fixed;top:1rem;right:1rem;display:flex;gap:.5rem;z-index:200}
  .btn-p{background:#0f172a;color:#fff;border:none;border-radius:7px;padding:8px 18px;font-size:.82rem;font-weight:600;cursor:pointer;font-family:inherit}
  .btn-p:hover{background:#1e293b}
  .btn-c{background:#e2e8f0;color:#475569;border:none;border-radius:7px;padding:8px 12px;font-size:.82rem;cursor:pointer;font-family:inherit}
  @media print{body{background:#fff}.ctrl{display:none!important}.page{margin:0;border-radius:0;box-shadow:none;max-width:100%}}
  @page{margin:1.5cm 1.8cm}
</style></head><body>
<div class="ctrl"><button class="btn-p" onclick="window.print()">🖨️ PDF 저장 / 인쇄</button><button class="btn-c" onclick="window.close()">✕</button></div>
<div class="page">
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:#fff;padding:2.2rem 2.8rem;position:relative">
    <div style="font-size:.78rem;font-weight:700;color:#4ade80;letter-spacing:.15em;text-transform:uppercase;margin-bottom:1.1rem">🌿 Maesil · 영업 제안서</div>
    <h1 style="font-size:1.8rem;font-weight:700;margin-bottom:.3rem">${mallName} 귀중</h1>
    ${productArea ? `<div style="font-size:.88rem;color:#94a3b8">${productArea}</div>` : ""}
    ${dateStr ? `<div style="position:absolute;top:2.2rem;right:2.8rem;font-size:.76rem;color:#64748b">${dateStr}</div>` : ""}
  </div>
  ${storeUrl ? `<div style="padding:.9rem 2.8rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:.82rem;color:#475569">스토어 · <a href="${storeUrl}" target="_blank" style="color:#2563eb;text-decoration:none">${storeUrl}</a></div>` : ""}
  <div style="padding:2.2rem 2.8rem">
    ${bodyHtml}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:1.1rem 2.8rem;display:flex;justify-content:space-between;align-items:center">
    <div style="font-weight:700;color:#22c55e;font-size:.88rem">매실 (Maesil)</div>
    <div style="font-size:.73rem;color:#94a3b8">본 제안서는 영업 참고용입니다.</div>
  </div>
</div></body></html>`;

  const win = window.open("about:blank", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    // 팝업 차단된 경우 — Blob URL fallback
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.target   = "_blank";
    a.rel      = "noopener noreferrer";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

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

/* ── 제안서 모달 컴포넌트 ───────────────────────────────── */
const SECTION_LABELS: [keyof ProposalSections, string][] = [
  ["greeting",          "인사말"],
  ["insight",           "현황 파악"],
  ["value_proposition", "제안 내용"],
  ["social_proof",      "도입 효과"],
  ["cta",               "다음 단계"],
];

function ProposalModal({ snapshot, onClose }: { snapshot: OutreachSnapshot; onClose: () => void }) {
  const p                            = snapshot.payload;
  const sections: ProposalSections   = p.sections  ?? {};
  const hasSections= SECTION_LABELS.some(([k]) => !!sections[k]);

  const [studioStatus, setStudioStatus] = useState<null | "loading" | "ok" | "pending" | "error">(null);
  const [studioMsg,    setStudioMsg]    = useState("");

  async function sendToStudio() {
    setStudioStatus("loading");
    try {
      const r = await apiFetch<{ status: string; message?: string }>(
        `/api/outreach/snapshots/${snapshot.id}/send-to-studio`,
        { method: "POST" }
      );
      if (r.status === "sent") {
        setStudioStatus("ok");
        setStudioMsg("스튜디오로 전송되었습니다.");
      } else {
        setStudioStatus("pending");
        setStudioMsg(r.message || "스튜디오 연동 준비 중입니다.");
      }
    } catch (e) {
      setStudioStatus("error");
      setStudioMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
               display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 14, width: "min(740px, 94vw)",
                 maxHeight: "88vh", display: "flex", flexDirection: "column",
                 boxShadow: "0 24px 80px rgba(0,0,0,0.22)", overflow: "hidden" }}
      >
        {/* 모달 헤더 */}
        <div style={{ background: "linear-gradient(135deg,#0f172a,#1e3a5f)", color: "#fff",
                      padding: "1.2rem 1.5rem", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4ade80",
                          textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.35rem" }}>
              🌿 Maesil 제안서
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{p.mall_name}</div>
            {p.store_url && (
              <a href={p.store_url} target="_blank" rel="noopener noreferrer"
                 style={{ fontSize: "0.76rem", color: "#93c5fd", textDecoration: "none" }}>
                {p.store_url}
              </a>
            )}
            {p.product_area && (
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.15rem" }}>{p.product_area}</div>
            )}
          </div>
          {/* 액션 버튼 */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
            <button
              className="btn"
              style={{ fontSize: "0.73rem", padding: "5px 10px", background: "#1e293b",
                       color: "#fff", borderColor: "#334155" }}
              onClick={() => openProposalHTML(snapshot)}
            >
              🖨️ PDF 저장
            </button>
            <button
              className="btn"
              style={{ fontSize: "0.73rem", padding: "5px 10px", background: "#1e293b",
                       color: "#fff", borderColor: "#334155" }}
              onClick={() => {
                const full = hasSections
                  ? SECTION_LABELS.map(([k, l]) => sections[k] ? `[${l}]\n${sections[k]}` : "").filter(Boolean).join("\n\n")
                  : (p.proposal || "");
                navigator.clipboard.writeText(full);
              }}
            >
              📋 복사
            </button>
            <button
              className="btn"
              style={{ fontSize: "0.73rem", padding: "5px 10px",
                       background: studioStatus === "ok" ? "#166534" : "#7c3aed",
                       color: "#fff", borderColor: studioStatus === "ok" ? "#166534" : "#7c3aed",
                       opacity: studioStatus === "loading" ? 0.6 : 1 }}
              disabled={studioStatus === "loading"}
              onClick={sendToStudio}
            >
              {studioStatus === "loading" ? "전송 중…"
               : studioStatus === "ok"     ? "✓ 전송됨"
               : "🎨 스튜디오"}
            </button>
            <button onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer",
                       fontSize: "1.5rem", color: "#64748b", lineHeight: 1 }}>
              ×
            </button>
          </div>
        </div>

        {/* 스튜디오 상태 메시지 */}
        {studioStatus && studioStatus !== "loading" && (
          <div style={{
            padding: "0.55rem 1.5rem", fontSize: "0.78rem",
            background: studioStatus === "ok" ? "#f0fdf4" : studioStatus === "error" ? "#fef2f2" : "#fffbeb",
            borderBottom: "1px solid #e2e8f0",
            color: studioStatus === "ok" ? "#166534" : studioStatus === "error" ? "#b91c1c" : "#92400e",
          }}>
            {studioStatus === "ok" ? "✅" : studioStatus === "error" ? "❌" : "ℹ️"} {studioMsg}
          </div>
        )}

        {/* 스크롤 본문 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>

          {/* 제안서 본문 — 섹션 구조 or 평문 */}
          {hasSections ? (
            SECTION_LABELS.map(([key, label]) => {
              const content = sections[key];
              if (!content) return null;
              return (
                <div key={key} style={{ marginBottom: "1.2rem" }}>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#22c55e",
                                textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.35rem" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: "0.92rem", lineHeight: 1.75, color: "#1e293b",
                                whiteSpace: "pre-wrap" }}>
                    {content}
                  </div>
                </div>
              );
            })
          ) : (
            <pre style={{
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              fontSize: "0.88rem", lineHeight: 1.7,
              background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: 8, padding: "1rem", margin: 0,
            }}>
              {p.proposal || "(내용 없음)"}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 메인 컴포넌트 ─────────────────────────────────────── */
function ChatPageInner() {
  const searchParams = useSearchParams();
  // ?agent= 파라미터가 허용 목록에 없으면 null로 처리 (URL 직접 입력 방어)
  const rawAgent    = searchParams.get("agent");
  const forcedAgent = (rawAgent && VALID_FORCE_AGENTS.has(rawAgent)) ? rawAgent : null;

  const [messages,       setMessages]       = useState<Message[]>([]);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [loadingLabel,   setLoadingLabel]   = useState("처리 중…");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [totalCost,      setTotalCost]      = useState(0);
  const [alertBanner,    setAlertBanner]    = useState<string | null>(null);
  const pollTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef  = useRef(true);

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
  const [snapshotTab,     setSnapshotTab]     = useState<"targets" | "proposals">("targets");
  const [snapshotSearch,  setSnapshotSearch]  = useState("");

  const bottomRef    = useRef<HTMLDivElement>(null);
  const alertSentRef = useRef(false);

  /* 자동 스크롤 */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* 언마운트 시 폴링 정리 + 이후 setState 차단 */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

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

  /* 백그라운드 잡 폴링 */
  function startPolling(runId: string, convId: string, routedTo: string[]) {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    let polls = 0;
    const MAX_POLLS = 90; // 최대 3분 (2초 × 90)

    pollTimerRef.current = setInterval(async () => {
      if (!isMountedRef.current) { clearInterval(pollTimerRef.current!); return; }
      polls++;
      if (polls > MAX_POLLS) {
        clearInterval(pollTimerRef.current!);
        pollTimerRef.current = null;
        if (!isMountedRef.current) return;
        setLoading(false);
        setMessages((p) => [...p, {
          id: crypto.randomUUID(), role: "agents",
          agents: [{ run_id: runId, agent_type: "orchestrator", agent_display: "시스템",
            message: "처리 시간이 초과되었습니다. 잠시 후 결과를 확인해주세요.", status: "failed", cost_usd: 0 }],
          ts: new Date(),
        }]);
        return;
      }

      try {
        const result = await apiFetch<ChatResp>(`/api/chat/runs/${runId}`);
        if (result.status === "pending") return; // 계속 폴링

        clearInterval(pollTimerRef.current!);
        pollTimerRef.current = null;
        if (!isMountedRef.current) return; // 언마운트 후 setState 차단

        if (result.status === "error") {
          setMessages((p) => [...p, {
            id: crypto.randomUUID(), role: "agents",
            agents: [{ run_id: runId, agent_type: "orchestrator", agent_display: "시스템",
              message: `오류: ${result.error || "알 수 없는 오류"}`, status: "failed", cost_usd: 0 }],
            ts: new Date(),
          }]);
        } else {
          // stale closure 방지: convId를 함수형 업데이트로 설정
          setConversationId((prev) => prev ?? convId);
          const agents = result.agents ?? [];
          setTotalCost((p) => p + agents.reduce((s, a) => s + (a.cost_usd ?? 0), 0));
          setMessages((p) => [...p, {
            id: convId + Date.now(), role: "agents", agents, ts: new Date(),
          }]);
          refreshConvList();
          if (routedTo.includes("outreach") || forcedAgent === "outreach") loadSnapshots();
        }
        setLoading(false);
      } catch {
        // 네트워크 오류는 무시하고 계속 폴링
      }
    }, 2000);
  }

  /* 메시지 전송 */
  async function sendMsg(overrideMessage?: string) {
    const text = (overrideMessage ?? input).trim();
    if (!text || loading) return;
    if (!hasToken()) { window.location.href = "/login"; return; }

    // 이전 폴링 정리
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text, ts: new Date() };
    setMessages((p) => [...p, userMsg]);
    if (!overrideMessage) setInput("");
    setLoading(true);
    setLoadingLabel("처리 중…");

    const isBriefing = text.includes("브리핑") || text.includes("현황 보고") || text === "__briefing__";
    const endpoint   = isBriefing ? "/api/chat/briefing" : "/api/chat";

    const body: Record<string, unknown> = { message: text, conversation_id: conversationId };
    if (forcedAgent && !isBriefing) body.force_agent = forcedAgent;

    try {
      const resp = await apiFetch<ChatResp>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      // 백그라운드 처리 중 → 폴링 시작
      if (resp.status === "pending" && resp.run_id) {
        setLoadingLabel("백그라운드 처리 중… (자동 갱신)");
        if (!conversationId) setConversationId(resp.conversation_id);
        startPolling(resp.run_id, resp.conversation_id, resp.routed_to ?? []);
        return; // loading은 폴링 완료 시 해제
      }

      // 동기 처리 완료
      if (!conversationId) setConversationId(resp.conversation_id);
      setTotalCost((p) => p + (resp.agents ?? []).reduce((s, a) => s + (a.cost_usd ?? 0), 0));
      setMessages((p) => [
        ...p,
        { id: resp.conversation_id + Date.now(), role: "agents", agents: resp.agents ?? [], ts: new Date() },
      ]);
      refreshConvList();
      if (forcedAgent === "outreach" || resp.routed_to?.includes("outreach")) loadSnapshots();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((p) => [...p, {
        id: crypto.randomUUID(), role: "agents",
        agents: [{ run_id: "err", agent_type: "orchestrator", agent_display: "시스템",
          message: `오류: ${msg}`, status: "failed", cost_usd: 0 }],
        ts: new Date(),
      }]);
    } finally {
      // pending이 아니면 여기서 해제, pending이면 폴링에서 해제
      if (!pollTimerRef.current) setLoading(false);
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

        {/* ── 영업 에이전트 저장 자료 패널 ── */}
        {(forcedAgent === "outreach" || snapshots.length > 0) && (() => {
          const targets   = snapshots.filter(s => s.kind === "outreach_targets");
          const proposals = snapshots.filter(s => s.kind === "proposal_draft");
          const q         = snapshotSearch.toLowerCase();

          // 타겟: 키워드별 그룹핑 (최신순)
          const targetGroups = Object.values(
            targets.reduce<Record<string, OutreachSnapshot[]>>((acc, s) => {
              const kw = s.payload.keyword || "기타";
              (acc[kw] = acc[kw] || []).push(s);
              return acc;
            }, {})
          ).map(g => ({ keyword: g[0].payload.keyword || "기타", items: g, latest: g[0] }))
           .filter(g => !q || g.keyword.includes(q))
           .sort((a, b) => b.latest.created_at.localeCompare(a.latest.created_at));

          // 제안서: 검색 필터 + 최신순
          const filteredProposals = proposals
            .filter(s => !q || (s.payload.mall_name || "").toLowerCase().includes(q)
                              || (s.payload.product_area || "").toLowerCase().includes(q))
            .sort((a, b) => b.created_at.localeCompare(a.created_at));

          return (
            <div style={{ marginBottom: "0.75rem" }}>
              {/* 헤더 토글 버튼 */}
              <button
                onClick={() => { setSnapshotOpen(v => !v); if (!snapshotOpen) loadSnapshots(); }}
                style={{
                  width: "100%", textAlign: "left", padding: "6px 12px",
                  fontSize: "0.82rem", background: "#fef9ec",
                  border: "1px solid #fed7aa",
                  borderRadius: snapshotOpen ? "8px 8px 0 0" : "8px",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <span>📥</span>
                <span style={{ flex: 1, fontWeight: 600, color: "#92400e" }}>저장된 영업 자료</span>
                <span className="muted" style={{ fontSize: "0.75rem" }}>
                  {snapshotLoading ? "로딩…" : `타겟 ${targets.length}건 · 제안서 ${proposals.length}건`}
                </span>
                <span style={{ color: "#94a3b8" }}>{snapshotOpen ? "▲" : "▼"}</span>
              </button>

              {snapshotOpen && (
                <div style={{
                  border: "1px solid #fed7aa", borderTop: "none",
                  borderRadius: "0 0 8px 8px", background: "#fffbf5",
                }}>
                  {/* 탭 + 검색 */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 0,
                    borderBottom: "1px solid #fde68a", padding: "0 8px",
                  }}>
                    {(["targets", "proposals"] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setSnapshotTab(tab)}
                        style={{
                          padding: "6px 12px", fontSize: "0.75rem", fontWeight: 600,
                          background: "none", border: "none", cursor: "pointer",
                          borderBottom: snapshotTab === tab ? "2px solid #ea580c" : "2px solid transparent",
                          color: snapshotTab === tab ? "#ea580c" : "#94a3b8",
                          marginBottom: -1,
                        }}
                      >
                        {tab === "targets" ? `📋 타겟 (${targetGroups.length}그룹)` : `📝 제안서 (${proposals.length}건)`}
                      </button>
                    ))}
                    <input
                      value={snapshotSearch}
                      onChange={e => setSnapshotSearch(e.target.value)}
                      placeholder="검색…"
                      style={{
                        marginLeft: "auto", width: 110, fontSize: "0.73rem",
                        padding: "3px 8px", border: "1px solid #fde68a",
                        borderRadius: 5, outline: "none", background: "#fff",
                      }}
                    />
                  </div>

                  {/* 콘텐츠 */}
                  <div style={{ maxHeight: 240, overflowY: "auto" }}>
                    {snapshots.length === 0 && !snapshotLoading && (
                      <div className="muted" style={{ padding: "0.75rem 1rem", fontSize: "0.8rem" }}>
                        저장된 자료가 없습니다. 영업 에이전트에게 타겟을 찾아달라고 요청하세요.
                      </div>
                    )}

                    {/* 타겟 탭 — 키워드별 그룹 */}
                    {snapshotTab === "targets" && targetGroups.map(g => (
                      <div key={g.keyword} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 12px", borderBottom: "1px solid #fef3c7",
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#78350f",
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {g.keyword}
                          </div>
                          <div className="muted" style={{ fontSize: "0.7rem" }}>
                            {g.items.length > 1 ? `${g.items.length}회 검색 · ` : ""}
                            최신 {g.latest.payload.targets?.length ?? 0}개 셀러 ·{" "}
                            {new Date(g.latest.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                          </div>
                        </div>
                        <button
                          className="btn"
                          style={{ fontSize: "0.7rem", padding: "2px 8px", flexShrink: 0,
                                   background: "#ea580c", color: "#fff", borderColor: "#ea580c" }}
                          onClick={() => {
                            const t = g.latest.payload.targets;
                            const kw = g.latest.payload.keyword;
                            if (t && kw) downloadTargetCSV(kw, t);
                          }}
                        >
                          CSV ↓
                        </button>
                      </div>
                    ))}
                    {snapshotTab === "targets" && targetGroups.length === 0 && !snapshotLoading && (
                      <div className="muted" style={{ padding: "0.65rem 1rem", fontSize: "0.78rem" }}>
                        {q ? "검색 결과 없음" : "저장된 타겟 리스트가 없습니다."}
                      </div>
                    )}

                    {/* 제안서 탭 */}
                    {snapshotTab === "proposals" && filteredProposals.map(s => (
                      <div key={s.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 12px", borderBottom: "1px solid #fef3c7",
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#78350f",
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {s.payload.mall_name || "셀러 없음"}
                          </div>
                          <div className="muted" style={{ fontSize: "0.7rem" }}>
                            {s.payload.product_area && `${s.payload.product_area} · `}
                            {new Date(s.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                          </div>
                        </div>
                        <button
                          className="btn"
                          style={{ fontSize: "0.7rem", padding: "2px 8px", flexShrink: 0 }}
                          onClick={() => setProposalModal(s)}
                        >
                          보기
                        </button>
                      </div>
                    ))}
                    {snapshotTab === "proposals" && filteredProposals.length === 0 && !snapshotLoading && (
                      <div className="muted" style={{ padding: "0.65rem 1rem", fontSize: "0.78rem" }}>
                        {q ? "검색 결과 없음" : "저장된 제안서가 없습니다."}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── 제안서 모달 ── */}
        {proposalModal && (
          <ProposalModal
            snapshot={proposalModal}
            onClose={() => setProposalModal(null)}
          />
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
                {loadingLabel !== "처리 중…"
                  ? loadingLabel
                  : forcedAgent
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
