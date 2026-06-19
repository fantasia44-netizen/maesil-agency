"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signup } from "../../lib/api";

const GREEN = "#1A6F3C";
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #e2e8f0",
  borderRadius: 8, fontSize: "0.9rem", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: 6, color: "#374151",
};

export default function SignupPage() {
  const router = useRouter();
  const [company, setCompany]   = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || !company) return;
    if (password.length < 8) { setError("비밀번호는 8자 이상이어야 합니다."); return; }
    setLoading(true);
    setError("");
    try {
      await signup(email, password, company);
      router.replace("/onboarding");   // 가입 후 온보딩 안내로
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "가입 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f7faf8", padding: "1.5rem",
    }}>
      <div style={{
        width: "100%", maxWidth: 400, padding: "2.5rem 2rem",
        background: "#fff", borderRadius: 14, boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "1.8rem" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>maesil-agency</div>
          <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 6 }}>
            14일 무료 — 내 영업 워크스페이스 만들기
          </div>
        </div>

        <form onSubmit={handleSignup}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>워크스페이스/회사명</label>
            <input value={company} onChange={e => setCompany(e.target.value)}
              placeholder="예: 매실마케팅" required autoFocus style={inputStyle} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>이메일</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="이메일 주소" required style={inputStyle} />
          </div>
          <div style={{ marginBottom: "1.4rem" }}>
            <label style={labelStyle}>비밀번호</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="8자 이상" required style={inputStyle} />
          </div>

          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
              padding: "0.6rem 0.75rem", borderRadius: 8, fontSize: "0.83rem", marginBottom: "1rem",
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading || !email || !password || !company}
            style={{
              width: "100%", padding: "0.75rem",
              background: loading ? "#94a3b8" : GREEN, color: "#fff", border: "none",
              borderRadius: 8, fontSize: "0.95rem", fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}>
            {loading ? "워크스페이스 생성 중…" : "무료로 시작하기"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#64748b", fontSize: "0.82rem", marginTop: "1.4rem" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" style={{ color: GREEN, fontWeight: 600, textDecoration: "none" }}>로그인</Link>
        </p>
        <p style={{ textAlign: "center", color: "#cbd5e1", fontSize: "0.72rem", marginTop: "0.5rem" }}>
          가입 시 신용카드가 필요하지 않습니다.
        </p>
      </div>
    </div>
  );
}
