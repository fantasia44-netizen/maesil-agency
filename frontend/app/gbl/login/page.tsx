"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, gblSignup } from "../../../lib/api";

export default function GblLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    if (!email.trim() || !pw) { setErr("이메일과 비밀번호를 입력하세요."); return; }
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), pw);
      else await gblSignup(email.trim(), pw, name.trim() || undefined);
      router.push("/gbl");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "실패했습니다.");
    } finally { setBusy(false); }
  };

  const input: React.CSSProperties = {
    width: "100%", padding: "13px 15px", border: "1px solid #2a3550", borderRadius: 10,
    fontSize: "1rem", boxSizing: "border-box", background: "#0f1628", color: "#e2e8f0", outline: "none",
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg,#0b1020,#131c33)", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ fontSize: "2.4rem" }}>📓</div>
          <h1 style={{ margin: "6px 0 4px", fontSize: "1.5rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
            GBL 데스노트
          </h1>
          <p style={{ margin: 0, fontSize: "0.83rem", color: "#8ea0c4" }}>
            마스터리그 상대를 기록하고, 다시 만나면 5초 안에 저격.
          </p>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#0f1628", borderRadius: 10, padding: 4 }}>
          {(["login", "signup"] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }}
              style={{ flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.88rem", border: "none",
                background: mode === m ? "#3b5bdb" : "transparent", color: mode === m ? "#fff" : "#8ea0c4" }}>
              {m === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "signup" && (
            <input style={input} placeholder="닉네임 (선택)" value={name}
              onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
          )}
          <input style={input} placeholder="이메일" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="off" />
          <input style={input} placeholder={mode === "signup" ? "비밀번호 (8자 이상)" : "비밀번호"} type="password" value={pw}
            onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            autoComplete={mode === "signup" ? "new-password" : "current-password"} />

          {err && <div style={{ color: "#fca5a5", fontSize: "0.82rem" }}>{err}</div>}

          <button onClick={submit} disabled={busy}
            style={{ padding: "13px", borderRadius: 10, border: "none", background: "#3b5bdb", color: "#fff",
              cursor: "pointer", fontWeight: 800, fontSize: "0.98rem", marginTop: 4 }}>
            {busy ? "처리 중…" : mode === "login" ? "로그인" : "가입하고 시작하기"}
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: 18, fontSize: "0.72rem", color: "#5f6f92" }}>
          내 기록은 내 계정에만 저장됩니다 · 보조폰에서 같은 계정으로 로그인하면 그대로 조회
        </p>
      </div>
    </div>
  );
}
