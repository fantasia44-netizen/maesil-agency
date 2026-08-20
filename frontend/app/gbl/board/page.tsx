"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, hasToken, getUser } from "../../../lib/api";

type Board = "chat" | "inquiry";

type Reply = { id: number; author: string; is_admin: boolean; body: string; created_at: string; mine: boolean };
type Post = {
  id: number; board: Board; author: string; title: string; body: string;
  answered: boolean; is_private: boolean; reply_count: number; created_at: string; mine: boolean; replies?: Reply[];
};

const BOARDS: { key: Board; label: string; hint: string }[] = [
  { key: "chat", label: "잡담방", hint: "자유롭게 이야기 나눠요" },
  { key: "inquiry", label: "운영자 문의", hint: "오류 제보·건의·질문 — 운영자가 답변합니다" },
];

const ACCENT = "#3b5bdb";

function fmt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function GblBoard() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [board, setBoard] = useState<Board>("chat");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<Post | null>(null);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const isAdmin = getUser()?.role === "super_admin";

  useEffect(() => {
    const logged = hasToken();
    setLoggedIn(logged); setReady(true);
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const b = sp.get("board");
      if (b === "chat" || b === "inquiry") setBoard(b);
      const pid = sp.get("post");
      if (pid && logged) openPost(Number(pid));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadList = useCallback(async (b: Board) => {
    setLoading(true); setErr("");
    try { setPosts(await apiFetch<Post[]>(`/api/gbl/board?board=${b}`, {}, 15000)); }
    catch (e) { setErr(e instanceof Error ? e.message : "불러오기 실패"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (loggedIn) loadList(board); }, [loggedIn, board, loadList]);

  const openPost = async (id: number) => {
    setErr("");
    try { setSel(await apiFetch<Post>(`/api/gbl/board/${id}`, {}, 15000)); }
    catch (e) { setErr(e instanceof Error ? e.message : "글 불러오기 실패"); }
  };

  const submitPost = async () => {
    if (!title.trim() || !body.trim()) { setErr("제목과 내용을 입력하세요."); return; }
    setBusy(true); setErr("");
    try {
      await apiFetch(`/api/gbl/board`, { method: "POST", body: JSON.stringify({ board, title, body, is_private: board === "inquiry" ? isPrivate : false }) }, 15000);
      setTitle(""); setBody(""); setIsPrivate(false); setWriting(false);
      await loadList(board);
    } catch (e) { setErr(e instanceof Error ? e.message : "작성 실패"); }
    finally { setBusy(false); }
  };

  const submitReply = async () => {
    if (!sel || !reply.trim()) return;
    setBusy(true); setErr("");
    try {
      await apiFetch(`/api/gbl/board/${sel.id}/reply`, { method: "POST", body: JSON.stringify({ body: reply }) }, 15000);
      setReply("");
      await openPost(sel.id);
    } catch (e) { setErr(e instanceof Error ? e.message : "댓글 실패"); }
    finally { setBusy(false); }
  };

  const del = async (id: number, back: boolean) => {
    if (!confirm("삭제하시겠습니까?")) return;
    try {
      await apiFetch(`/api/gbl/board/${id}`, { method: "DELETE" }, 15000);
      if (back) setSel(null);
      await loadList(board);
    } catch (e) { setErr(e instanceof Error ? e.message : "삭제 실패"); }
  };

  const wrap: React.CSSProperties = { minHeight: "100dvh", background: "linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" };
  const inner: React.CSSProperties = { maxWidth: 640, margin: "0 auto" };
  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e3e8f2", borderRadius: 12, padding: "0.9rem 1rem" };
  const input: React.CSSProperties = { width: "100%", padding: "11px 13px", border: "1px solid #dbe2ee", borderRadius: 10, fontSize: "0.95rem", boxSizing: "border-box", background: "#fff", color: "#0f172a", outline: "none" };
  const btn = (bg: string): React.CSSProperties => ({ padding: "10px 16px", borderRadius: 10, border: "none", background: bg, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" });

  if (!ready) return null;

  // ── 비회원 게이트 ──
  if (!loggedIn) {
    return (
      <div style={wrap}><div style={inner}>
        <Link href="/gbl" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← GBL Note</Link>
        <h1 style={{ margin: "0.4rem 0 1rem", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>게시판</h1>
        <div style={{ ...card, textAlign: "center", padding: "2rem 1.2rem" }}>
          <div style={{ fontSize: "2rem" }}>🔒</div>
          <p style={{ margin: "0.6rem 0 0.2rem", fontWeight: 800, color: "#0f172a" }}>회원 전용 게시판입니다</p>
          <p style={{ margin: "0 0 1.2rem", fontSize: "0.88rem", color: "#64748b", lineHeight: 1.7 }}>
            잡담방과 운영자 문의는 <b>가입한 회원</b>만 이용할 수 있습니다.<br />
            로그인하거나 무료로 가입하고 이용해 주세요.
          </p>
          <Link href="/gbl/login" style={{ ...btn(ACCENT), textDecoration: "none", display: "inline-block" }}>로그인 / 회원가입</Link>
        </div>
      </div></div>
    );
  }

  // ── 글 상세 ──
  if (sel) {
    return (
      <div style={wrap}><div style={inner}>
        <button onClick={() => { setSel(null); setReply(""); }} style={{ background: "none", border: "none", color: ACCENT, cursor: "pointer", fontSize: "0.85rem", padding: 0, marginBottom: 12 }}>← 목록으로</button>
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            {sel.board === "inquiry" && (
              <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: sel.answered ? "#dcfce7" : "#fef3c7", color: sel.answered ? "#16a34a" : "#b45309" }}>
                {sel.answered ? "답변완료" : "답변대기"}
              </span>
            )}
            {sel.is_private && <span title="비공개" style={{ fontSize: "0.95rem" }}>🔒</span>}
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", flex: 1 }}>{sel.title}</h2>
          </div>
          <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginBottom: 10 }}>{sel.author} · {fmt(sel.created_at)}</div>
          <div style={{ fontSize: "0.95rem", color: "#334155", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{sel.body}</div>
          {(sel.mine || isAdmin) && (
            <button onClick={() => del(sel.id, true)} style={{ marginTop: 12, background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "0.78rem", padding: 0 }}>삭제</button>
          )}
        </div>

        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", margin: "0 0 8px 2px" }}>댓글 {sel.replies?.length ?? 0}</div>
        {(sel.replies ?? []).map((r) => (
          <div key={r.id} style={{ ...card, marginBottom: 8, background: r.is_admin ? "#eff6ff" : "#fff", borderColor: r.is_admin ? "#bfdbfe" : "#e3e8f2" }}>
            <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginBottom: 4 }}>
              {r.is_admin ? <b style={{ color: ACCENT }}>🛡️ 운영자</b> : r.author} · {fmt(r.created_at)}
            </div>
            <div style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{r.body}</div>
          </div>
        ))}

        <div style={{ ...card, marginTop: 12 }}>
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={isAdmin ? "운영자 답변 달기…" : "댓글 달기…"} rows={3} style={{ ...input, resize: "vertical" }} />
          {err && <div style={{ color: "#dc2626", fontSize: "0.8rem", marginTop: 6 }}>{err}</div>}
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <button onClick={submitReply} disabled={busy} style={btn(ACCENT)}>{busy ? "등록 중…" : "댓글 등록"}</button>
          </div>
        </div>
      </div></div>
    );
  }

  // ── 목록 ──
  const cur = BOARDS.find((b) => b.key === board)!;
  return (
    <div style={wrap}><div style={inner}>
      <Link href="/gbl" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← GBL Note</Link>
      <h1 style={{ margin: "0.4rem 0 0.8rem", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>게시판</h1>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, background: "#fff", borderRadius: 10, padding: 4 }}>
        {BOARDS.map((b) => (
          <button key={b.key} onClick={() => { setBoard(b.key); setWriting(false); setErr(""); }}
            style={{ flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.88rem", border: "none",
              background: board === b.key ? ACCENT : "transparent", color: board === b.key ? "#fff" : "#64748b" }}>
            {b.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "0 2px 12px" }}>{cur.hint}</div>

      {writing ? (
        <div style={{ ...card, marginBottom: 14 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" style={{ ...input, marginBottom: 8 }} maxLength={200} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={board === "inquiry" ? "문의 내용 (기기·상황·캡처 설명을 적어주시면 빠르게 답변드립니다)" : "내용"} rows={5} style={{ ...input, resize: "vertical" }} maxLength={5000} />
          {board === "inquiry" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: "0.85rem", color: "#475569", cursor: "pointer" }}>
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} style={{ width: 16, height: 16 }} />
              🔒 비공개로 문의 — 나와 운영자만 볼 수 있어요
            </label>
          )}
          {err && <div style={{ color: "#dc2626", fontSize: "0.8rem", marginTop: 6 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={() => { setWriting(false); setErr(""); }} style={{ ...btn("#e2e8f0"), color: "#475569" }}>취소</button>
            <button onClick={submitPost} disabled={busy} style={btn(ACCENT)}>{busy ? "등록 중…" : "등록"}</button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "right", marginBottom: 12 }}>
          <button onClick={() => { setWriting(true); setErr(""); }} style={btn(ACCENT)}>✏️ 글쓰기</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "2rem 0" }}>불러오는 중…</div>
      ) : posts.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: "#94a3b8", padding: "2rem 1rem" }}>아직 글이 없습니다. 첫 글을 남겨보세요!</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {posts.map((p) => (
            <button key={p.id} onClick={() => openPost(p.id)} style={{ ...card, textAlign: "left", cursor: "pointer", display: "block", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {p.board === "inquiry" && (
                  <span style={{ fontSize: "0.64rem", fontWeight: 800, padding: "1px 7px", borderRadius: 20, background: p.answered ? "#dcfce7" : "#fef3c7", color: p.answered ? "#16a34a" : "#b45309" }}>
                    {p.answered ? "답변완료" : "답변대기"}
                  </span>
                )}
                {p.is_private && <span title="비공개" style={{ fontSize: "0.82rem" }}>🔒</span>}
                <span style={{ flex: 1, fontWeight: 700, color: "#0f172a", fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                {p.reply_count > 0 && <span style={{ fontSize: "0.76rem", color: ACCENT, fontWeight: 700 }}>💬 {p.reply_count}</span>}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4 }}>{p.author} · {fmt(p.created_at)}</div>
            </button>
          ))}
        </div>
      )}
      {err && !writing && <div style={{ color: "#dc2626", fontSize: "0.82rem", marginTop: 10 }}>{err}</div>}
    </div></div>
  );
}
