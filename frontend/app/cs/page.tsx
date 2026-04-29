"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, hasToken } from "../../lib/api";

/* ── 타입 ───────────────────────────────────────────────────── */
type Conversation = {
  id: string;
  program: string;
  operator_id: string | null;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type CsMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  emotion: string | null;
  action: { label: string; url: string } | null;
  hint: string | null;
  layer: string | null;
  script_id: string | null;
  feedback: "good" | "bad" | null;
  correction: string | null;
  created_at: string;
};

type L2Script = {
  id: string;
  program: string;
  triggers: string[];
  keywords: string[];
  emotion: string;
  message: string;
  action: { label: string; url: string } | null;
  hint: string | null;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};

/* ── 상수 ───────────────────────────────────────────────────── */
const PROGRAM_LABELS: Record<string, string> = {
  "maesil-insight": "매실 인사이트",
  "maesil-studio":  "매실 스튜디오",
  "common":         "공통",
};

const LAYER_BADGE: Record<string, { label: string; color: string }> = {
  l2:       { label: "L2 대본", color: "#16a34a" },
  l3:       { label: "L3 AI",   color: "#2563eb" },
  fallback: { label: "폴백",    color: "#b45309" },
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ── 메인 ───────────────────────────────────────────────────── */
export default function CSPage() {
  const [tab, setTab] = useState<"conversations" | "l2">("conversations");

  /* 대화 목록 */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading,   setConvLoading]   = useState(false);
  const [filterProgram, setFilterProgram] = useState("");
  const [selected,      setSelected]      = useState<Conversation | null>(null);
  const [messages,      setMessages]      = useState<CsMessage[]>([]);
  const [msgLoading,    setMsgLoading]    = useState(false);

  /* L2 대본 */
  const [l2Scripts,    setL2Scripts]    = useState<L2Script[]>([]);
  const [l2Loading,    setL2Loading]    = useState(false);
  const [editScript,   setEditScript]   = useState<L2Script | null>(null);
  const [editOpen,     setEditOpen]     = useState(false);

  /* 답변 수정 모달 */
  const [correcting,    setCorrecting]   = useState<CsMessage | null>(null);
  const [correctionTxt, setCorrectionTxt] = useState("");

  const msgBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    msgBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* 대화 목록 로드 */
  function loadConversations(program?: string) {
    if (!hasToken()) return;
    setConvLoading(true);
    const qs = program ? `?program=${encodeURIComponent(program)}` : "";
    apiFetch<Conversation[]>(`/api/cs/conversations${qs}`)
      .then(setConversations)
      .catch(() => {})
      .finally(() => setConvLoading(false));
  }

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { loadConversations(filterProgram || undefined); }, [filterProgram]);

  /* 특정 대화 로드 */
  function selectConversation(conv: Conversation) {
    setSelected(conv);
    setMsgLoading(true);
    apiFetch<{ conversation: Conversation; messages: CsMessage[] }>(
      `/api/cs/conversations/${conv.id}`
    )
      .then((r) => setMessages(r.messages))
      .catch(() => {})
      .finally(() => setMsgLoading(false));
  }

  /* 피드백 */
  async function sendFeedback(msgId: string, feedback: "good" | "bad") {
    await apiFetch(`/api/cs/messages/${msgId}/feedback`, {
      method: "POST",
      body: JSON.stringify({ feedback }),
    });
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback } : m))
    );
  }

  /* 답변 수정 */
  async function submitCorrection() {
    if (!correcting || !correctionTxt.trim()) return;
    await apiFetch(`/api/cs/messages/${correcting.id}/correction`, {
      method: "PUT",
      body: JSON.stringify({ correction: correctionTxt.trim() }),
    });
    setMessages((prev) =>
      prev.map((m) =>
        m.id === correcting.id
          ? { ...m, feedback: "bad", correction: correctionTxt.trim() }
          : m
      )
    );
    setCorrecting(null);
    setCorrectionTxt("");
  }

  /* L2 대본 로드 */
  function loadL2() {
    setL2Loading(true);
    apiFetch<L2Script[]>("/api/cs/l2-scripts")
      .then(setL2Scripts)
      .catch(() => {})
      .finally(() => setL2Loading(false));
  }

  useEffect(() => { if (tab === "l2") loadL2(); }, [tab]);

  /* L2 저장 */
  async function saveL2Script() {
    if (!editScript) return;
    const method = editScript.id.startsWith("NEW_") ? "POST" : "PUT";
    const url = method === "POST"
      ? "/api/cs/l2-scripts"
      : `/api/cs/l2-scripts/${editScript.id}`;
    await apiFetch(url, { method, body: JSON.stringify(editScript) });
    setEditOpen(false);
    loadL2();
  }

  async function toggleL2Active(script: L2Script) {
    await apiFetch(`/api/cs/l2-scripts/${script.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...script, is_active: !script.is_active }),
    });
    loadL2();
  }

  /* ── 렌더 ────────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", gap: "0.75rem" }}>

      {/* 탭 헤더 */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", borderBottom: "2px solid #e2e8f0", paddingBottom: "0.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, marginRight: "1rem" }}>매요 CS 관리</h2>
        {(["conversations", "l2"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "0.4rem 0.9rem", borderRadius: 6, fontSize: "0.82rem", cursor: "pointer",
            background: tab === t ? "#0f172a" : "transparent",
            color: tab === t ? "#fff" : "#64748b",
            border: tab === t ? "none" : "1px solid #e2e8f0",
            fontWeight: tab === t ? 600 : 400,
          }}>
            {t === "conversations" ? "💬 대화 이력" : "📋 L2 대본"}
          </button>
        ))}
      </div>

      {/* ── 탭: 대화 이력 ── */}
      {tab === "conversations" && (
        <div style={{ flex: 1, display: "flex", gap: "0.75rem", minHeight: 0 }}>

          {/* 왼쪽: 대화 목록 */}
          <div style={{
            width: 260, flexShrink: 0, display: "flex", flexDirection: "column",
            border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff",
          }}>
            <div style={{ padding: "0.75rem", borderBottom: "1px solid #e2e8f0" }}>
              <select
                value={filterProgram}
                onChange={(e) => setFilterProgram(e.target.value)}
                style={{
                  width: "100%", padding: "0.4rem 0.5rem", fontSize: "0.8rem",
                  border: "1px solid #e2e8f0", borderRadius: 6, outline: "none",
                }}
              >
                <option value="">전체 프로그램</option>
                {Object.entries(PROGRAM_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {convLoading && (
                <div className="muted" style={{ padding: "1rem", fontSize: "0.78rem" }}>불러오는 중…</div>
              )}
              {!convLoading && conversations.length === 0 && (
                <div className="muted" style={{ padding: "1rem", fontSize: "0.78rem" }}>대화가 없습니다.</div>
              )}
              {conversations.map((c) => (
                <button key={c.id} onClick={() => selectConversation(c)} style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "0.6rem 0.85rem",
                  background: selected?.id === c.id ? "#f1f5f9" : "transparent",
                  border: "none",
                  borderLeft: selected?.id === c.id ? "3px solid #0f172a" : "3px solid transparent",
                  borderBottom: "1px solid #f8fafc",
                  cursor: "pointer",
                }}>
                  <div style={{
                    fontSize: "0.75rem", marginBottom: "0.15rem",
                    background: "#f1f5f9", borderRadius: 4,
                    padding: "1px 6px", display: "inline-block",
                    color: "#475569",
                  }}>
                    {PROGRAM_LABELS[c.program] || c.program}
                  </div>
                  <div style={{
                    fontSize: "0.8rem", fontWeight: 500, color: "#0f172a",
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

          {/* 오른쪽: 메시지 뷰 */}
          <div style={{
            flex: 1, display: "flex", flexDirection: "column", minWidth: 0,
            border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#fff",
          }}>
            {/* 대화 헤더 */}
            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e2e8f0" }}>
              {selected ? (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{selected.title || "제목 없음"}</div>
                    <div className="muted" style={{ fontSize: "0.72rem", marginTop: "0.1rem" }}>
                      {PROGRAM_LABELS[selected.program] || selected.program}
                      {selected.operator_id && ` · op: ${selected.operator_id.slice(0, 8)}…`}
                      {" · "}{fmtTime(selected.updated_at)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: "0.7rem", padding: "2px 8px", borderRadius: 12,
                    background: selected.status === "open" ? "#dcfce7" : "#f1f5f9",
                    color: selected.status === "open" ? "#16a34a" : "#64748b",
                  }}>
                    {selected.status}
                  </span>
                </div>
              ) : (
                <span className="muted" style={{ fontSize: "0.85rem" }}>왼쪽에서 대화를 선택하세요</span>
              )}
            </div>

            {/* 메시지 목록 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {!selected && (
                <div style={{ textAlign: "center", color: "#94a3b8", marginTop: "4rem", fontSize: "0.88rem" }}>
                  대화를 선택하면 메시지를 볼 수 있습니다.
                </div>
              )}
              {msgLoading && (
                <div className="muted" style={{ textAlign: "center", marginTop: "2rem" }}>불러오는 중…</div>
              )}

              {!msgLoading && messages.map((m) => (
                <div key={m.id}>
                  {m.role === "user" ? (
                    /* 사용자 메시지 */
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{ maxWidth: "70%" }}>
                        <div style={{
                          padding: "0.55rem 0.85rem",
                          borderRadius: "14px 14px 4px 14px",
                          background: "#0f172a", color: "#fff",
                          fontSize: "0.85rem", lineHeight: 1.55, whiteSpace: "pre-wrap",
                        }}>
                          {m.content}
                        </div>
                        <div className="muted" style={{ textAlign: "right", fontSize: "0.68rem", marginTop: "0.15rem" }}>
                          {fmtTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* 매요 답변 */
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: "#7c3aed", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: "1rem", marginTop: 2,
                      }}>💬</div>
                      <div style={{ maxWidth: "78%", flex: 1 }}>
                        {/* 메타 배지 */}
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.7rem", color: "#7c3aed", fontWeight: 700 }}>매요</span>
                          {m.layer && LAYER_BADGE[m.layer] && (
                            <span style={{
                              fontSize: "0.65rem", padding: "1px 6px", borderRadius: 10,
                              background: LAYER_BADGE[m.layer].color + "22",
                              color: LAYER_BADGE[m.layer].color,
                              fontWeight: 600,
                            }}>
                              {LAYER_BADGE[m.layer].label}
                            </span>
                          )}
                          {m.script_id && (
                            <span className="muted" style={{ fontSize: "0.65rem" }}>{m.script_id}</span>
                          )}
                          {m.feedback === "good" && (
                            <span style={{ fontSize: "0.65rem", color: "#16a34a" }}>👍 맞음</span>
                          )}
                          {m.feedback === "bad" && (
                            <span style={{ fontSize: "0.65rem", color: "#dc2626" }}>👎 틀림</span>
                          )}
                        </div>

                        {/* 답변 본문 */}
                        <div style={{
                          padding: "0.6rem 0.85rem",
                          borderRadius: "14px 14px 14px 4px",
                          background: m.correction ? "#fffbeb" : "#fff",
                          border: `1px solid ${m.correction ? "#fde68a" : "#e2e8f0"}`,
                          fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap",
                        }}>
                          {m.content}
                          {m.hint && (
                            <div style={{ marginTop: "0.4rem", fontSize: "0.78rem", color: "#64748b", borderTop: "1px solid #f1f5f9", paddingTop: "0.3rem" }}>
                              💡 {m.hint}
                            </div>
                          )}
                        </div>

                        {/* 수정된 답변 */}
                        {m.correction && (
                          <div style={{
                            marginTop: "0.4rem", padding: "0.5rem 0.85rem",
                            borderRadius: 8, background: "#dcfce7",
                            border: "1px solid #86efac",
                            fontSize: "0.82rem", lineHeight: 1.55,
                          }}>
                            <span style={{ fontSize: "0.7rem", color: "#16a34a", fontWeight: 700 }}>✏️ 수정된 답변</span><br />
                            {m.correction}
                          </div>
                        )}

                        {/* 피드백/수정 버튼 */}
                        <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.35rem" }}>
                          <button
                            onClick={() => sendFeedback(m.id, "good")}
                            style={{
                              fontSize: "0.7rem", padding: "2px 8px", cursor: "pointer",
                              border: "1px solid #e2e8f0", borderRadius: 4,
                              background: m.feedback === "good" ? "#dcfce7" : "#fff",
                              color: m.feedback === "good" ? "#16a34a" : "#64748b",
                            }}
                          >👍 맞음</button>
                          <button
                            onClick={() => sendFeedback(m.id, "bad")}
                            style={{
                              fontSize: "0.7rem", padding: "2px 8px", cursor: "pointer",
                              border: "1px solid #e2e8f0", borderRadius: 4,
                              background: m.feedback === "bad" ? "#fee2e2" : "#fff",
                              color: m.feedback === "bad" ? "#dc2626" : "#64748b",
                            }}
                          >👎 틀림</button>
                          <button
                            onClick={() => { setCorrecting(m); setCorrectionTxt(m.correction || ""); }}
                            style={{
                              fontSize: "0.7rem", padding: "2px 8px", cursor: "pointer",
                              border: "1px solid #e2e8f0", borderRadius: 4,
                              background: "#fff", color: "#64748b",
                            }}
                          >✏️ 수정</button>
                        </div>

                        <div className="muted" style={{ fontSize: "0.68rem", marginTop: "0.25rem" }}>
                          {fmtTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={msgBottomRef} />
            </div>
          </div>
        </div>
      )}

      {/* ── 탭: L2 대본 ── */}
      {tab === "l2" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span className="muted" style={{ fontSize: "0.82rem" }}>
              총 {l2Scripts.length}개 · 활성 {l2Scripts.filter((s) => s.is_active).length}개
            </span>
            <button
              className="btn primary"
              onClick={() => {
                setEditScript({
                  id: `NEW_${Date.now()}`, program: "maesil-insight",
                  triggers: [], keywords: [], emotion: "thinking",
                  message: "", action: null, hint: null,
                  is_active: true, sort_order: l2Scripts.length, updated_at: "",
                });
                setEditOpen(true);
              }}
              style={{ fontSize: "0.8rem" }}
            >+ 새 대본 추가</button>
          </div>

          {l2Loading ? (
            <div className="muted" style={{ textAlign: "center", padding: "2rem" }}>불러오는 중…</div>
          ) : l2Scripts.length === 0 ? (
            <div style={{
              textAlign: "center", color: "#94a3b8", padding: "3rem",
              border: "2px dashed #e2e8f0", borderRadius: 10, fontSize: "0.88rem", lineHeight: 2,
            }}>
              L2 대본이 없습니다.<br />
              maesil-insight의 대본을 가져오려면 <strong>가져오기</strong> 기능을 사용하세요.<br />
              <button
                className="btn"
                style={{ marginTop: "0.75rem", fontSize: "0.8rem" }}
                onClick={() => {
                  const txt = prompt("l2_scripts.py의 L2_SCRIPTS JSON을 붙여넣으세요 (배열 형태):");
                  if (!txt) return;
                  try {
                    const scripts = JSON.parse(txt);
                    apiFetch("/api/cs/l2-scripts/import", {
                      method: "POST",
                      body: JSON.stringify({ scripts, program: "maesil-insight" }),
                    }).then(() => loadL2());
                  } catch { alert("JSON 형식이 잘못되었습니다."); }
                }}
              >📥 대본 가져오기</button>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
                    {["ID", "프로그램", "트리거", "답변 (50자)", "감정", "레이어", "상태", ""].map((h) => (
                      <th key={h} style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {l2Scripts.map((s) => (
                    <tr key={s.id} style={{
                      borderBottom: "1px solid #f1f5f9",
                      opacity: s.is_active ? 1 : 0.45,
                      background: "white",
                    }}>
                      <td style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace", color: "#64748b", fontSize: "0.75rem" }}>{s.id}</td>
                      <td style={{ padding: "0.5rem 0.75rem", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: "0.72rem", background: "#f1f5f9", borderRadius: 4, padding: "1px 6px", color: "#475569" }}>
                          {PROGRAM_LABELS[s.program] || s.program}
                        </span>
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", maxWidth: 160 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#0f172a" }}>
                          {(s.triggers || []).slice(0, 2).join(" / ") || "—"}
                        </div>
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", maxWidth: 240 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.message.slice(0, 50)}{s.message.length > 50 ? "…" : ""}
                        </div>
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{s.emotion}</td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <span style={{
                          fontSize: "0.7rem", padding: "1px 6px", borderRadius: 10,
                          background: "#dcfce7", color: "#16a34a", fontWeight: 600,
                        }}>L2</span>
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <button
                          onClick={() => toggleL2Active(s)}
                          style={{
                            fontSize: "0.7rem", padding: "2px 8px", cursor: "pointer",
                            border: "1px solid #e2e8f0", borderRadius: 4,
                            background: s.is_active ? "#dcfce7" : "#fee2e2",
                            color: s.is_active ? "#16a34a" : "#dc2626",
                          }}
                        >{s.is_active ? "활성" : "비활성"}</button>
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem" }}>
                        <button
                          onClick={() => { setEditScript(s); setEditOpen(true); }}
                          style={{
                            fontSize: "0.72rem", padding: "2px 8px",
                            border: "1px solid #e2e8f0", borderRadius: 4,
                            background: "transparent", cursor: "pointer", color: "#2563eb",
                          }}
                        >편집</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 답변 수정 모달 ── */}
      {correcting && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
        }} onClick={() => setCorrecting(null)}>
          <div style={{
            background: "#fff", borderRadius: 12, padding: "1.5rem",
            width: 480, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 600 }}>✏️ 답변 수정</h3>
            <div style={{
              padding: "0.6rem 0.85rem", background: "#f8fafc",
              border: "1px solid #e2e8f0", borderRadius: 8,
              fontSize: "0.82rem", color: "#64748b", marginBottom: "0.75rem",
              whiteSpace: "pre-wrap", lineHeight: 1.55,
            }}>
              <strong>기존 답변:</strong><br />{correcting.content}
            </div>
            <textarea
              value={correctionTxt}
              onChange={(e) => setCorrectionTxt(e.target.value)}
              placeholder="올바른 답변을 입력하세요…"
              rows={4}
              style={{
                width: "100%", padding: "0.6rem 0.75rem", fontSize: "0.85rem",
                border: "1px solid #e2e8f0", borderRadius: 8, outline: "none",
                resize: "vertical", fontFamily: "inherit", lineHeight: 1.55,
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.75rem" }}>
              <button className="btn" onClick={() => setCorrecting(null)} style={{ fontSize: "0.8rem" }}>취소</button>
              <button
                className="btn primary"
                onClick={submitCorrection}
                disabled={!correctionTxt.trim()}
                style={{ fontSize: "0.8rem" }}
              >저장</button>
            </div>
          </div>
        </div>
      )}

      {/* ── L2 편집 모달 ── */}
      {editOpen && editScript && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
          overflowY: "auto", padding: "1rem",
        }} onClick={() => setEditOpen(false)}>
          <div style={{
            background: "#fff", borderRadius: 12, padding: "1.5rem",
            width: 560, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 600 }}>
              {editScript.id.startsWith("NEW_") ? "새 L2 대본 추가" : `L2 대본 편집 — ${editScript.id}`}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {/* 프로그램 */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>프로그램</label>
                <select
                  value={editScript.program}
                  onChange={(e) => setEditScript({ ...editScript, program: e.target.value })}
                  style={{ width: "100%", padding: "0.4rem", marginTop: "0.25rem", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.82rem" }}
                >
                  {Object.entries(PROGRAM_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {/* 트리거 */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>트리거 (줄바꿈으로 구분)</label>
                <textarea
                  value={(editScript.triggers || []).join("\n")}
                  onChange={(e) => setEditScript({ ...editScript, triggers: e.target.value.split("\n").filter(Boolean) })}
                  rows={3}
                  style={{ width: "100%", padding: "0.4rem", marginTop: "0.25rem", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.82rem", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
              {/* 감정 */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>감정 코드</label>
                <select
                  value={editScript.emotion}
                  onChange={(e) => setEditScript({ ...editScript, emotion: e.target.value })}
                  style={{ width: "100%", padding: "0.4rem", marginTop: "0.25rem", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.82rem" }}
                >
                  {["thinking","love","welcome","doubt","warning","relief","exploration","wink","failure","satisfaction","data_control","success","surprise","pride","tired"].map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              {/* 답변 */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>답변 메시지</label>
                <textarea
                  value={editScript.message}
                  onChange={(e) => setEditScript({ ...editScript, message: e.target.value })}
                  rows={4}
                  style={{ width: "100%", padding: "0.4rem", marginTop: "0.25rem", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.82rem", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
              {/* 힌트 */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>힌트 (선택)</label>
                <input
                  value={editScript.hint || ""}
                  onChange={(e) => setEditScript({ ...editScript, hint: e.target.value || null })}
                  style={{ width: "100%", padding: "0.4rem", marginTop: "0.25rem", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.82rem", boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className="btn" onClick={() => setEditOpen(false)} style={{ fontSize: "0.8rem" }}>취소</button>
              <button className="btn primary" onClick={saveL2Script} disabled={!editScript.message.trim()} style={{ fontSize: "0.8rem" }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
