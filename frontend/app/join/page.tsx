"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, storeAuth } from "../../lib/api";

function JoinForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") || "";

  const [checking, setChecking]   = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [role, setRole]            = useState("super_admin");

  const [email, setEmail]         = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");

  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState<string | null>(null);

  // 토큰 유효성 체크
  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    apiFetch<{ valid: boolean; role: string }>(`/api/auth/invites/check/${token}`)
      .then((r) => {
        setTokenValid(r.valid);
        setRole(r.role);
      })
      .catch(() => setTokenValid(false))
      .finally(() => setChecking(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) { setErr("이메일을 입력하세요."); return; }
    if (password.length < 8) { setErr("비밀번호는 8자 이상이어야 합니다."); return; }
    if (password !== confirm) { setErr("비밀번호가 일치하지 않습니다."); return; }

    setLoading(true);
    try {
      const res = await apiFetch<{
        ok: boolean; token: string; email: string; role: string; display_name: string | null;
      }>("/api/auth/join", {
        method: "POST",
        body: JSON.stringify({
          token,
          email: email.trim(),
          password,
          display_name: displayName.trim() || null,
        }),
      });
      storeAuth(res.token, { email: res.email, role: res.role as "super_admin" | "customer", display_name: res.display_name });
      router.replace("/chat");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ── 렌더 ──

  if (checking) {
    return (
      <div style={pageStyle}>
        <div style={boxStyle}>
          <p style={{ color: "#64748b", textAlign: "center" }}>초대 링크 확인 중…</p>
        </div>
      </div>
    );
  }

  if (!token || !tokenValid) {
    return (
      <div style={pageStyle}>
        <div style={boxStyle}>
          <h1 style={titleStyle}>유효하지 않은 초대 링크</h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: 0 }}>
            링크가 만료됐거나 이미 사용된 초대입니다.<br />
            관리자에게 새 초대 링크를 요청하세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={boxStyle}>
        <h1 style={titleStyle}>maesil-agency 팀 합류</h1>
        <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 0, marginBottom: "1.5rem" }}>
          초대 수락 · 역할: <strong>{role === "super_admin" ? "관리자 (Admin)" : "고객 (Customer)"}</strong>
        </p>

        {err && (
          <div style={errStyle}>{err}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div className="config-field">
            <label>이메일 *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div className="config-field">
            <label>이름 (선택)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="예: 홍길동"
            />
          </div>
          <div className="config-field">
            <label>비밀번호 * (8자 이상)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
            />
          </div>
          <div className="config-field">
            <label>비밀번호 확인 *</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="비밀번호 재입력"
              required
            />
          </div>
          <button
            type="submit"
            className="btn primary"
            disabled={loading}
            style={{ marginTop: "0.25rem", padding: "0.6rem 1rem", fontSize: "0.95rem" }}
          >
            {loading ? "계정 생성 중…" : "팀 합류하기"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── 스타일 ──

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8fafc",
};

const boxStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "2rem 2.25rem",
  width: "100%",
  maxWidth: 420,
  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "1.25rem",
  fontWeight: 700,
  margin: "0 0 0.25rem 0",
};

const errStyle: React.CSSProperties = {
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#b91c1c",
  borderRadius: 8,
  padding: "0.6rem 0.9rem",
  fontSize: "0.85rem",
  marginBottom: "0.5rem",
};

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={pageStyle}>
        <div style={boxStyle}>
          <p style={{ color: "#64748b", textAlign: "center" }}>로딩 중…</p>
        </div>
      </div>
    }>
      <JoinForm />
    </Suspense>
  );
}
