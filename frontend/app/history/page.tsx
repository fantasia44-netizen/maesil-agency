"use client";

import { useEffect, useState } from "react";
import { apiFetch, hasToken } from "../../lib/api";

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "agent";
  agent_type?: string;
  agent_display?: string;
  content: string;
  cost_usd?: number;
  run_id?: string;
  created_at: string;
};

const AGENT_COLOR: Record<string, string> = {
  sales:        "#16a34a",
  finance:      "#2563eb",
  warehouse:    "#b45309",
  cs:           "#7c3aed",
  developer:    "#0891b2",
  orchestrator: "#475569",
};

const AGENT_EMOJI: Record<string, string> = {
  sales:        "📈",
  finance:      "💰",
  warehouse:    "📦",
  cs:           "💬",
  developer:    "👨‍💻",
  orchestrator: "🤖",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasToken()) return;
    setLoadingList(true);
    apiFetch<Conversation[]>("/api/chat/conversations")
      .then(setConversations)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingList(false));
  }, []);

  function selectConversation(id: string) {
    setSelected(id);
    setLoadingMsgs(true);
    apiFetch<{ conversation_id: string; messages: ChatMessage[] }>(`/api/chat/conversations/${id}`)
      .then((r) => setMessages(r.messages))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingMsgs(false));
  }

  const selectedConv = conversations.find((c) => c.id === selected);

  return (
    <div style={{ display: "flex", gap: "1.25rem", height: "calc(100vh - 120px)" }}>
      {/* 왼쪽: 대화 목록 */}
      <div style={{
        width: 280, flexShrink: 0,
        border: "1px solid #e2e8f0", borderRadius: 10,
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: "#fff",
      }}>
        <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid #e2e8f0", fontWeight: 600, fontSize: "0.9rem" }}>
          이전 대화 목록
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {!hasToken() && (
            <div className="muted" style={{ padding: "1rem", fontSize: "0.82rem" }}>
              로그인이 필요합니다.
            </div>
          )}
          {loadingList && (
            <div className="muted" style={{ padding: "1rem", fontSize: "0.82rem" }}>불러오는 중…</div>
          )}
          {!loadingList && conversations.length === 0 && hasToken() && (
            <div className="muted" style={{ padding: "1rem", fontSize: "0.82rem" }}>저장된 대화가 없습니다.</div>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => selectConversation(c.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "0.7rem 1rem",
                background: selected === c.id ? "#f1f5f9" : "transparent",
                border: "none", borderBottom: "1px solid #f1f5f9",
                cursor: "pointer", transition: "background 0.15s",
              }}
            >
              <div style={{
                fontSize: "0.83rem", fontWeight: 500, color: "#0f172a",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {c.title || "제목 없음"}
              </div>
              <div className="muted" style={{ fontSize: "0.72rem", marginTop: "0.15rem" }}>
                {fmt(c.updated_at)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 오른쪽: 메시지 뷰 */}
      <div style={{
        flex: 1, border: "1px solid #e2e8f0", borderRadius: 10,
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: "#fff",
      }}>
        <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
          {selectedConv ? (
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{selectedConv.title || "제목 없음"}</div>
              <div className="muted" style={{ fontSize: "0.72rem", marginTop: "0.1rem" }}>
                마지막 업데이트: {fmt(selectedConv.updated_at)}
              </div>
            </div>
          ) : (
            <span className="muted" style={{ fontSize: "0.85rem" }}>왼쪽에서 대화를 선택하세요</span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {!selected && (
            <div style={{ textAlign: "center", color: "#94a3b8", marginTop: "4rem", fontSize: "0.88rem" }}>
              저장된 대화를 선택하면 메시지 이력을 볼 수 있습니다.
            </div>
          )}
          {loadingMsgs && (
            <div className="muted" style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.85rem" }}>불러오는 중…</div>
          )}

          {!loadingMsgs && messages.map((m) => (
            <div key={m.id}>
              {m.role === "user" ? (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ maxWidth: "70%" }}>
                    <div style={{
                      padding: "0.6rem 0.9rem",
                      borderRadius: "14px 14px 4px 14px",
                      background: "#0f172a", color: "#fff",
                      fontSize: "0.87rem", lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                    }}>
                      {m.content}
                    </div>
                    <div className="muted" style={{ textAlign: "right", marginTop: "0.2rem", fontSize: "0.7rem" }}>
                      {fmt(m.created_at)}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: AGENT_COLOR[m.agent_type ?? ""] ?? "#475569",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.95rem", marginTop: 2,
                  }}>
                    {AGENT_EMOJI[m.agent_type ?? ""] ?? "🤖"}
                  </div>
                  <div style={{ maxWidth: "80%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                      <span style={{
                        fontSize: "0.71rem",
                        color: AGENT_COLOR[m.agent_type ?? ""] ?? "#475569",
                        fontWeight: 700,
                      }}>
                        {m.agent_display ?? m.agent_type}
                      </span>
                      {(m.cost_usd ?? 0) > 0 && (
                        <span className="muted" style={{ fontSize: "0.65rem" }}>${(m.cost_usd ?? 0).toFixed(4)}</span>
                      )}
                    </div>
                    <div style={{
                      padding: "0.65rem 0.9rem",
                      borderRadius: "14px 14px 14px 4px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      fontSize: "0.87rem", lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      color: "#0f172a",
                    }}>
                      {m.content}
                    </div>
                    <div className="muted" style={{ fontSize: "0.7rem", marginTop: "0.2rem" }}>
                      {fmt(m.created_at)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          position: "fixed", bottom: 20, right: 20,
          background: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 8, padding: "0.6rem 1rem",
          color: "#b91c1c", fontSize: "0.82rem",
        }}>
          오류: {error}
        </div>
      )}
    </div>
  );
}
