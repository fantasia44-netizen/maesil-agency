"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, hasToken } from "../../lib/api";

type ChatResp = {
  conversation_id: string;
  run_id: string;
  agent_type: string;
  agent_display: string;
  message: string;
  status: string;
};

type Message = {
  id: string;
  role: "user" | "agent";
  agent_display?: string;
  agent_type?: string;
  text: string;
  ts: Date;
};

const AGENT_COLOR: Record<string, string> = {
  sales:        "#16a34a",
  finance:      "#2563eb",
  warehouse:    "#b45309",
  cs:           "#7c3aed",
  orchestrator: "#475569",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (!hasToken()) {
      alert("설정 페이지에서 인증 토큰을 입력하세요.");
      return;
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text, ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const resp = await apiFetch<ChatResp>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, conversation_id: conversationId }),
      });
      if (!conversationId) setConversationId(resp.conversation_id);
      setMessages((prev) => [
        ...prev,
        {
          id: resp.run_id,
          role: "agent",
          agent_display: resp.agent_display,
          agent_type: resp.agent_type,
          text: resp.message,
          ts: new Date(),
        },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "agent", agent_display: "시스템", agent_type: "orchestrator", text: `오류: ${msg}`, ts: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function reset() {
    setMessages([]);
    setConversationId(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>대화</h2>
          <p className="muted" style={{ margin: "0.2rem 0 0 0" }}>
            질문하면 오케스트레이터가 적절한 에이전트로 자동 라우팅합니다.
          </p>
        </div>
        <button className="btn" onClick={reset} style={{ fontSize: "0.78rem" }}>새 대화</button>
      </div>

      {/* 메시지 영역 */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "0.5rem 0",
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", marginTop: "4rem", fontSize: "0.9rem" }}>
            매출·재무·재고·CS 관련 질문을 입력하세요.
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: "0.5rem", alignItems: "flex-start" }}>
            {/* 아바타 */}
            {m.role === "agent" && (
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: AGENT_COLOR[m.agent_type ?? "orchestrator"] ?? "#475569",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.65rem", color: "#fff", fontWeight: 700, marginTop: 2,
              }}>
                {(m.agent_display ?? "A").slice(0, 2)}
              </div>
            )}

            {/* 말풍선 */}
            <div style={{ maxWidth: "70%" }}>
              {m.role === "agent" && (
                <div style={{ fontSize: "0.72rem", color: AGENT_COLOR[m.agent_type ?? "orchestrator"], fontWeight: 600, marginBottom: "0.2rem" }}>
                  {m.agent_display}
                </div>
              )}
              <div style={{
                padding: "0.6rem 0.9rem",
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: m.role === "user" ? "#0f172a" : "#fff",
                color: m.role === "user" ? "#fff" : "#0f172a",
                border: m.role === "agent" ? "1px solid #e2e8f0" : "none",
                fontSize: "0.88rem",
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}>
                {m.text}
              </div>
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: "0.2rem", textAlign: m.role === "user" ? "right" : "left" }}>
                {m.ts.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e2e8f0", flexShrink: 0 }} />
            <div style={{ padding: "0.6rem 0.9rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px 14px 14px 4px", color: "#94a3b8", fontSize: "0.85rem" }}>
              라우팅 중…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{
        display: "flex", gap: "0.5rem", alignItems: "flex-end",
        padding: "0.75rem 0 0 0",
        borderTop: "1px solid #e2e8f0",
        marginTop: "0.5rem",
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="질문을 입력하세요… (Enter 전송, Shift+Enter 줄바꿈)"
          rows={2}
          style={{
            flex: 1, padding: "0.55rem 0.75rem", fontSize: "0.88rem",
            border: "1px solid #e2e8f0", borderRadius: 8, outline: "none",
            resize: "none", fontFamily: "inherit", lineHeight: 1.5,
          }}
        />
        <button
          className="btn primary"
          onClick={send}
          disabled={loading || !input.trim()}
          style={{ height: 56, minWidth: 56, fontSize: "1.1rem" }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
