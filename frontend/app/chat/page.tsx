"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, hasToken } from "../../lib/api";

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

const AGENT_COLOR: Record<string, string> = {
  sales:        "#16a34a",
  finance:      "#2563eb",
  warehouse:    "#b45309",
  cs:           "#7c3aed",
  orchestrator: "#475569",
};

const AGENT_EMOJI: Record<string, string> = {
  sales:    "📈",
  finance:  "💰",
  warehouse:"📦",
  cs:       "💬",
  orchestrator: "🤖",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(overrideMessage?: string) {
    const text = (overrideMessage ?? input).trim();
    if (!text || loading) return;
    if (!hasToken()) {
      alert("설정 페이지에서 인증 토큰을 입력하세요.");
      return;
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text, ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    if (!overrideMessage) setInput("");
    setLoading(true);

    const isBriefing = text.includes("브리핑") || text.includes("현황 보고") || text === "__briefing__";
    const endpoint = isBriefing ? "/api/chat/briefing" : "/api/chat";

    try {
      const resp = await apiFetch<ChatResp>(endpoint, {
        method: "POST",
        body: JSON.stringify({ message: text, conversation_id: conversationId }),
      });
      if (!conversationId) setConversationId(resp.conversation_id);

      const sessionCost = resp.agents.reduce((s, a) => s + (a.cost_usd ?? 0), 0);
      setTotalCost((prev) => prev + sessionCost);

      setMessages((prev) => [
        ...prev,
        { id: resp.conversation_id + Date.now(), role: "agents", agents: resp.agents, ts: new Date() },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(), role: "agents",
          agents: [{
            run_id: "err", agent_type: "orchestrator", agent_display: "시스템",
            message: `오류: ${msg}`, status: "failed", cost_usd: 0,
          }],
          ts: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function reset() { setMessages([]); setConversationId(null); setTotalCost(0); }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>대화</h2>
          <p className="muted" style={{ margin: "0.2rem 0 0 0" }}>
            오케스트레이터가 질문을 분석해 적절한 에이전트로 자동 라우팅합니다.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {totalCost > 0 && (
            <span className="muted" style={{ fontSize: "0.75rem" }}>
              누적 비용: ${totalCost.toFixed(4)}
            </span>
          )}
          <button
            className="btn"
            style={{ fontSize: "0.78rem" }}
            onClick={() => send("__briefing__")}
            disabled={loading}
          >
            ☀️ 아침 브리핑
          </button>
          <button className="btn" onClick={reset} style={{ fontSize: "0.78rem" }}>새 대화</button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", marginTop: "4rem", fontSize: "0.9rem", lineHeight: 2 }}>
            매출·재무·재고·CS 관련 질문을 입력하거나<br />
            <strong>☀️ 아침 브리핑</strong> 버튼으로 전체 현황 보고를 받으세요.
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id}>
            {m.role === "user" ? (
              /* 사용자 메시지 */
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ maxWidth: "70%" }}>
                  <div style={{
                    padding: "0.6rem 0.9rem",
                    borderRadius: "14px 14px 4px 14px",
                    background: "#0f172a", color: "#fff",
                    fontSize: "0.88rem", lineHeight: 1.55,
                  }}>
                    {m.text}
                  </div>
                  <div className="muted" style={{ textAlign: "right", marginTop: "0.2rem" }}>
                    {m.ts.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ) : (
              /* 에이전트 응답 (여러 에이전트) */
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {m.agents?.map((a) => (
                  <div key={a.run_id} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                    {/* 아바타 */}
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
                        <span style={{ fontSize: "0.72rem", color: AGENT_COLOR[a.agent_type], fontWeight: 700 }}>
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
                        fontSize: "0.88rem", lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
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
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#e2e8f0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>🤖</div>
            <div style={{ padding: "0.6rem 0.9rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px 14px 14px 4px", color: "#94a3b8", fontSize: "0.85rem" }}>
              에이전트 실행 중…
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
          placeholder="질문 입력… (Enter 전송, Shift+Enter 줄바꿈)"
          rows={2}
          style={{
            flex: 1, padding: "0.55rem 0.75rem", fontSize: "0.88rem",
            border: "1px solid #e2e8f0", borderRadius: 8, outline: "none",
            resize: "none", fontFamily: "inherit", lineHeight: 1.5,
          }}
        />
        <button
          className="btn primary"
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{ height: 56, minWidth: 56, fontSize: "1.1rem" }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
