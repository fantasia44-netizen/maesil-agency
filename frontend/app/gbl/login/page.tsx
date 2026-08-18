"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, gblSignup, gblPasswordRequest } from "../../../lib/api";
import GoogleButton from "../GoogleButton";

type Mode = "login" | "signup" | "forgot";

export default function GblLogin() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    if (mode === "forgot") {
      if (!email.trim()) { setErr("가입한 이메일을 입력하세요."); return; }
      setBusy(true);
      try { await gblPasswordRequest(email.trim()); setSent(true); }
      catch { setErr("요청 중 오류가 발생했습니다. 잠시 후 다시 시도하세요."); }
      finally { setBusy(false); }
      return;
    }
    if (!email.trim() || !pw) { setErr("이메일과 비밀번호를 입력하세요."); return; }
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), pw);
      else await gblSignup(email.trim(), pw, name.trim() || undefined);
      router.push("/gbl/app");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "실패했습니다.");
    } finally { setBusy(false); }
  };

  const switchMode = (m: Mode) => { setMode(m); setErr(""); setSent(false); };

  const input: React.CSSProperties = {
    width: "100%", padding: "13px 15px", border: "1px solid #dbe2ee", borderRadius: 10,
    fontSize: "1rem", boxSizing: "border-box", background: "#ffffff", color: "#0f172a", outline: "none",
  };
  const linkBtn: React.CSSProperties = {
    background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.8rem", padding: 0,
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg,#f7f9fd,#eef2fb)", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ fontSize: "2.4rem" }}>📓</div>
          <h1 style={{ margin: "6px 0 4px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.5px" }}>
            GBL Note
          </h1>
          <p style={{ margin: 0, fontSize: "0.83rem", color: "#64748b" }}>
            포켓몬GO 배틀리그를 기억하는 노트 — 다시 만난 상대, 5초 안에 저격.
          </p>
        </div>

        {mode !== "forgot" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#ffffff", borderRadius: 10, padding: 4 }}>
            {(["login", "signup"] as const).map((m) => (
              <button key={m} onClick={() => switchMode(m)}
                style={{ flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.88rem", border: "none",
                  background: mode === m ? "#3b5bdb" : "transparent", color: mode === m ? "#fff" : "#64748b" }}>
                {m === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>
        )}

        {mode === "forgot" ? (
          sent ? (
            <div style={{ textAlign: "center", color: "#16a34a", fontSize: "0.9rem", lineHeight: 1.7 }}>
              ✅ 재설정 링크를 이메일로 보냈습니다.<br />
              <span style={{ color: "#64748b", fontSize: "0.82rem" }}>메일함(스팸함 포함)을 확인하세요. 링크는 30분간 유효합니다.</span>
              <div style={{ marginTop: 16 }}>
                <button style={linkBtn} onClick={() => switchMode("login")}>← 로그인으로</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ margin: "0 0 2px", fontSize: "0.85rem", color: "#64748b" }}>가입한 이메일로 재설정 링크를 보냅니다.</p>
              <input style={input} placeholder="이메일" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                autoComplete="email" autoCapitalize="off" />
              {err && <div style={{ color: "#dc2626", fontSize: "0.82rem" }}>{err}</div>}
              <button onClick={submit} disabled={busy}
                style={{ padding: "13px", borderRadius: 10, border: "none", background: "#3b5bdb", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: "0.98rem" }}>
                {busy ? "전송 중…" : "재설정 링크 받기"}
              </button>
              <button style={{ ...linkBtn, textAlign: "center", marginTop: 4 }} onClick={() => switchMode("login")}>← 로그인으로</button>
            </div>
          )
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <GoogleButton onError={setErr} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
              <div style={{ flex: 1, height: 1, background: "#dbe2ee" }} />
              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>또는 이메일로</span>
              <div style={{ flex: 1, height: 1, background: "#dbe2ee" }} />
            </div>
            {mode === "signup" && (
              <input style={input} placeholder="닉네임 (선택)" value={name}
                onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
            )}
            <input style={input} placeholder="이메일 (로그인 아이디)" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="off" />
            <input style={input} placeholder={mode === "signup" ? "비밀번호 (8자 이상)" : "비밀번호"} type="password" value={pw}
              onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              autoComplete={mode === "signup" ? "new-password" : "current-password"} />

            {err && <div style={{ color: "#dc2626", fontSize: "0.82rem" }}>{err}</div>}

            <button onClick={submit} disabled={busy}
              style={{ padding: "13px", borderRadius: 10, border: "none", background: "#3b5bdb", color: "#fff",
                cursor: "pointer", fontWeight: 800, fontSize: "0.98rem", marginTop: 4 }}>
              {busy ? "처리 중…" : mode === "login" ? "로그인" : "가입하고 시작하기"}
            </button>

            {mode === "login" && (
              <div style={{ textAlign: "center", marginTop: 2 }}>
                <button style={linkBtn} onClick={() => switchMode("forgot")}>비밀번호를 잊으셨나요?</button>
              </div>
            )}
            <p style={{ textAlign: "center", margin: "2px 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>
              로그인 아이디는 가입한 이메일입니다.
            </p>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          내 기록은 내 계정에만 저장됩니다 · <Link href="/gbl/privacy" style={{ color: "#64748b" }}>개인정보처리방침</Link>
        </p>
      </div>
    </div>
  );
}
