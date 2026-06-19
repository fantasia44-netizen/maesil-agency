"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "../../lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8fafc",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 380,
        padding: "2.5rem 2rem",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            maesil-agency
          </div>
          <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 4 }}>
            AI 비서팀 오케스트레이션
          </div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: 6, color: "#374151" }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="이메일 주소"
              required
              autoFocus
              style={{
                width: "100%", padding: "0.6rem 0.75rem",
                border: "1px solid #e2e8f0", borderRadius: 8,
                fontSize: "0.9rem", outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: 6, color: "#374151" }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
              style={{
                width: "100%", padding: "0.6rem 0.75rem",
                border: "1px solid #e2e8f0", borderRadius: 8,
                fontSize: "0.9rem", outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              color: "#b91c1c", padding: "0.6rem 0.75rem",
              borderRadius: 8, fontSize: "0.83rem", marginBottom: "1rem",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              width: "100%", padding: "0.7rem",
              background: loading ? "#94a3b8" : "#0f172a",
              color: "#fff", border: "none",
              borderRadius: 8, fontSize: "0.95rem",
              fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.82rem", marginTop: "1.5rem" }}>
          계정이 없으신가요?{" "}
          <Link href="/signup" style={{ color: "#1A6F3C", fontWeight: 600, textDecoration: "none" }}>
            무료로 시작하기
          </Link>
        </p>
      </div>
    </div>
  );
}
