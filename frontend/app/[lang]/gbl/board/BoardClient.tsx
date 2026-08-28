"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch, hasToken, getUser } from "../../../../lib/api";
import { isLocale, defaultLocale, localizePath, type Locale } from "../../../../lib/i18n";
import { getBoard } from "./dict";

type Board = "chat" | "inquiry";

type Reply = { id: number; author: string; is_admin: boolean; body: string; created_at: string; mine: boolean };
export type Post = {
  id: number; board: Board; author: string; title: string; body: string;
  answered: boolean; is_private: boolean; reply_count: number; created_at: string; mine: boolean;
  lang?: string; replies?: Reply[];
};

const BOARD_KEYS: Board[] = ["chat", "inquiry"];

const ACCENT = "#3b5bdb";
// 언어 통합 게시판 — 글마다 어느 언어인지 배지로 표시
const LANG_BADGE: Record<string, string> = { ko: "🇰🇷", en: "🇺🇸", ja: "🇯🇵", "zh-TW": "🇹🇼" };
const langBadge = (l?: string) => (l && LANG_BADGE[l]) || "🌐";

function fmt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

export default function BoardClient({ initialPosts = [] }: { initialPosts?: Post[] }) {
  const params = useParams();
  const lang: Locale = isLocale(params?.lang as string) ? (params!.lang as Locale) : defaultLocale;
  const t = getBoard(lang);
  const L = (p: string) => localizePath(lang, p);
  const boardLabel = (b: Board) => (b === "chat" ? t.chatLabel : t.inquiryLabel);
  const boardHint = (b: Board) => (b === "chat" ? t.chatHint : t.inquiryHint);
  const [loggedIn, setLoggedIn] = useState(false);
  const [board, setBoard] = useState<Board>("chat");
  // 서버가 SSR로 넘긴 공개 잡담글로 초기화 → 초기 HTML에 글이 담겨 크롤 가능
  const [posts, setPosts] = useState<Post[]>(initialPosts);
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
    setLoggedIn(logged);
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const b = sp.get("board");
      if (b === "chat" || b === "inquiry") setBoard(b);
      const pid = sp.get("post");
      if (pid) openPost(Number(pid));   // 공개글은 비회원도 열람
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 잡담(chat): 비회원·크롤러는 공개 엔드포인트로 열람. 문의(inquiry): 회원 전용.
  const loadList = useCallback(async (b: Board) => {
    setLoading(true); setErr("");
    const logged = hasToken();
    try {
      if (b === "chat" && !logged) {
        setPosts(await apiFetch<Post[]>(`/api/gbl/board/public?lang=${lang}`, {}, 15000));
      } else if (logged) {
        setPosts(await apiFetch<Post[]>(`/api/gbl/board?board=${b}&lang=${lang}`, {}, 15000));
      } else {
        setPosts([]);  // 비회원 + 문의 게시판 → 목록 없음(로그인 안내)
      }
    }
    catch (e) { setErr(e instanceof Error ? e.message : t.errLoad); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 초기 chat 목록은 서버 SSR(initialPosts)로 이미 채워짐 → 첫 렌더 재요청 생략(board/login 변경 시에만).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!hydrated) { setHydrated(true); if (board === "chat" && initialPosts.length) return; }
    loadList(board);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, loggedIn]);

  const openPost = async (id: number) => {
    setErr("");
    const path = hasToken() ? `/api/gbl/board/${id}` : `/api/gbl/board/public/${id}`;
    try { setSel(await apiFetch<Post>(path, {}, 15000)); }
    catch (e) { setErr(e instanceof Error ? e.message : t.errLoadPost); }
  };

  const submitPost = async () => {
    if (!title.trim() || !body.trim()) { setErr(t.errTitleBody); return; }
    setBusy(true); setErr("");
    try {
      await apiFetch(`/api/gbl/board`, { method: "POST", body: JSON.stringify({ board, lang, title, body, is_private: board === "inquiry" ? isPrivate : false }) }, 15000);
      setTitle(""); setBody(""); setIsPrivate(false); setWriting(false);
      await loadList(board);
    } catch (e) { setErr(e instanceof Error ? e.message : t.errWrite); }
    finally { setBusy(false); }
  };

  const submitReply = async () => {
    if (!sel || !reply.trim()) return;
    setBusy(true); setErr("");
    try {
      await apiFetch(`/api/gbl/board/${sel.id}/reply`, { method: "POST", body: JSON.stringify({ body: reply }) }, 15000);
      setReply("");
      await openPost(sel.id);
    } catch (e) { setErr(e instanceof Error ? e.message : t.errReply); }
    finally { setBusy(false); }
  };

  const del = async (id: number, back: boolean) => {
    if (!confirm(t.confirmDelete)) return;
    try {
      await apiFetch(`/api/gbl/board/${id}`, { method: "DELETE" }, 15000);
      if (back) setSel(null);
      await loadList(board);
    } catch (e) { setErr(e instanceof Error ? e.message : t.errDelete); }
  };

  const wrap: React.CSSProperties = { minHeight: "100dvh", background: "linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" };
  const inner: React.CSSProperties = { maxWidth: 640, margin: "0 auto" };
  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e3e8f2", borderRadius: 12, padding: "0.9rem 1rem" };
  const input: React.CSSProperties = { width: "100%", padding: "11px 13px", border: "1px solid #dbe2ee", borderRadius: 10, fontSize: "0.95rem", boxSizing: "border-box", background: "#fff", color: "#0f172a", outline: "none" };
  const btn = (bg: string): React.CSSProperties => ({ padding: "10px 16px", borderRadius: 10, border: "none", background: bg, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" });

  // SSR(초기 렌더)에서는 ready=false여도 목록을 그려 크롤러가 글을 읽게 함.
  // (로그인 상태 확정 전에도 공개 잡담글은 노출)

  // ── 글 상세 ──
  if (sel) {
    return (
      <div style={wrap}><div style={inner}>
        <button onClick={() => { setSel(null); setReply(""); }} style={{ background: "none", border: "none", color: ACCENT, cursor: "pointer", fontSize: "0.85rem", padding: 0, marginBottom: 12 }}>{t.backToList}</button>
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            {sel.board === "inquiry" && (
              <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: sel.answered ? "#dcfce7" : "#fef3c7", color: sel.answered ? "#16a34a" : "#b45309" }}>
                {sel.answered ? t.answered : t.waiting}
              </span>
            )}
            {sel.is_private && <span title={t.privateTitle} style={{ fontSize: "0.95rem" }}>🔒</span>}
            <span title={sel.lang} style={{ fontSize: "0.95rem" }}>{langBadge(sel.lang)}</span>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", flex: 1 }}>{sel.title}</h2>
          </div>
          <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginBottom: 10 }}>{sel.author} · {fmt(sel.created_at)}</div>
          <div style={{ fontSize: "0.95rem", color: "#334155", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{sel.body}</div>
          {(sel.mine || isAdmin) && (
            <button onClick={() => del(sel.id, true)} style={{ marginTop: 12, background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "0.78rem", padding: 0 }}>{t.del}</button>
          )}
        </div>

        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", margin: "0 0 8px 2px" }}>{t.commentsLabel} {sel.replies?.length ?? 0}</div>
        {(sel.replies ?? []).map((r) => (
          <div key={r.id} style={{ ...card, marginBottom: 8, background: r.is_admin ? "#eff6ff" : "#fff", borderColor: r.is_admin ? "#bfdbfe" : "#e3e8f2" }}>
            <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginBottom: 4 }}>
              {r.is_admin ? <b style={{ color: ACCENT }}>{t.admin}</b> : r.author} · {fmt(r.created_at)}
            </div>
            <div style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{r.body}</div>
          </div>
        ))}

        {loggedIn ? (
          <div style={{ ...card, marginTop: 12 }}>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={isAdmin ? t.replyPlaceholderAdmin : t.replyPlaceholder} rows={3} style={{ ...input, resize: "vertical" }} />
            {err && <div style={{ color: "#dc2626", fontSize: "0.8rem", marginTop: 6 }}>{err}</div>}
            <div style={{ textAlign: "right", marginTop: 8 }}>
              <button onClick={submitReply} disabled={busy} style={btn(ACCENT)}>{busy ? t.submitting : t.submitReply}</button>
            </div>
          </div>
        ) : (
          <div style={{ ...card, marginTop: 12, textAlign: "center" }}>
            <Link href={L("/gbl/login")} style={{ ...btn(ACCENT), textDecoration: "none", display: "inline-block" }}>🔑 {t.gateBtn}</Link>
          </div>
        )}
      </div></div>
    );
  }

  // ── 목록 ──
  return (
    <div style={wrap}><div style={inner}>
      <Link href={L("/gbl")} style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← GBL Note</Link>
      <h1 style={{ margin: "0.4rem 0 0.8rem", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t.h1}</h1>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, background: "#fff", borderRadius: 10, padding: 4 }}>
        {BOARD_KEYS.map((b) => (
          <button key={b} onClick={() => { setBoard(b); setWriting(false); setErr(""); }}
            style={{ flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.88rem", border: "none",
              background: board === b ? ACCENT : "transparent", color: board === b ? "#fff" : "#64748b" }}>
            {boardLabel(b)}
          </button>
        ))}
      </div>
      <div style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "0 2px 12px" }}>{boardHint(board)}</div>

      {writing ? (
        <div style={{ ...card, marginBottom: 14 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePlaceholder} style={{ ...input, marginBottom: 8 }} maxLength={200} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={board === "inquiry" ? t.inquiryBodyPlaceholder : t.chatBodyPlaceholder} rows={5} style={{ ...input, resize: "vertical" }} maxLength={5000} />
          {board === "inquiry" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: "0.85rem", color: "#475569", cursor: "pointer" }}>
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} style={{ width: 16, height: 16 }} />
              {t.privateCheck}
            </label>
          )}
          {err && <div style={{ color: "#dc2626", fontSize: "0.8rem", marginTop: 6 }}>{err}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={() => { setWriting(false); setErr(""); }} style={{ ...btn("#e2e8f0"), color: "#475569" }}>{t.cancel}</button>
            <button onClick={submitPost} disabled={busy} style={btn(ACCENT)}>{busy ? t.submitting : t.submit}</button>
          </div>
        </div>
      ) : loggedIn ? (
        <div style={{ textAlign: "right", marginBottom: 12 }}>
          <button onClick={() => { setWriting(true); setErr(""); }} style={btn(ACCENT)}>{t.write}</button>
        </div>
      ) : (
        <div style={{ textAlign: "right", marginBottom: 12 }}>
          <Link href={L("/gbl/login")} style={{ ...btn(ACCENT), textDecoration: "none", display: "inline-block" }}>🔑 {t.gateBtn}</Link>
        </div>
      )}

      {board === "inquiry" && !loggedIn ? (
        <div style={{ ...card, textAlign: "center", padding: "1.6rem 1.2rem" }}>
          <div style={{ fontSize: "1.5rem" }}>🔒</div>
          <p style={{ margin: "0.5rem 0 1rem", fontSize: "0.86rem", color: "#64748b", lineHeight: 1.7 }}>{t.gateTitle}</p>
          <Link href={L("/gbl/login")} style={{ ...btn(ACCENT), textDecoration: "none", display: "inline-block" }}>{t.gateBtn}</Link>
        </div>
      ) : loading ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "2rem 0" }}>{t.loading}</div>
      ) : posts.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: "#94a3b8", padding: "2rem 1rem" }}>{t.emptyList}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {posts.map((p) => (
            <button key={p.id} onClick={() => openPost(p.id)} style={{ ...card, textAlign: "left", cursor: "pointer", display: "block", width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {p.board === "inquiry" && (
                  <span style={{ fontSize: "0.64rem", fontWeight: 800, padding: "1px 7px", borderRadius: 20, background: p.answered ? "#dcfce7" : "#fef3c7", color: p.answered ? "#16a34a" : "#b45309" }}>
                    {p.answered ? t.answered : t.waiting}
                  </span>
                )}
                {p.is_private && <span title={t.privateTitle} style={{ fontSize: "0.82rem" }}>🔒</span>}
                <span title={p.lang} style={{ fontSize: "0.82rem" }}>{langBadge(p.lang)}</span>
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
