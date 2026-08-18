"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { gblPasswordConfirm } from "../../../lib/api";

export default function GblReset() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(new URLSearchParams(window.location.search).get("token") || "");
    }
  }, []);

  const submit = async () => {
    setErr("");
    if (pw.length < 8) { setErr("비밀번호는 8자 이상이어야 합니다."); return; }
    if (pw !== pw2) { setErr("비밀번호가 일치하지 않습니다."); return; }
    if (!token) { setErr("유효하지 않은 링크입니다."); return; }
    setBusy(true);
    try {
      await gblPasswordConfirm(token, pw);
      setDone(true);
      setTimeout(() => router.push("/gbl/login"), 1800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "재설정 실패");
    } finally { setBusy(false); }
  };

  const input: React.CSSProperties = {
    width: "100%", padding: "13px 15px", border: "1px solid #dbe2ee", borderRadius: 10,
    fontSize: "1rem", boxSizing: "border-box", background: "#ffffff", color: "#0f172a", outline: "none",
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg,#f7f9fd,#eef2fb)", padding: "1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: "2.2rem" }}>🔑</div>
          <h1 style={{ margin: "6px 0 4px", fontSize: "1.35rem", fontWeight: 900, color: "#0f172a" }}>비밀번호 재설정</h1>
        </div>

        {done ? (
          <p style={{ textAlign: "center", color: "#16a34a", fontSize: "0.95rem" }}>
            ✅ 변경됐습니다. 로그인 화면으로 이동합니다…
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input style={input} type="password" placeholder="새 비밀번호 (8자 이상)" value={pw}
              onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
            <input style={input} type="password" placeholder="새 비밀번호 확인" value={pw2}
              onChange={(e) => setPw2(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              autoComplete="new-password" />
            {err && <div style={{ color: "#dc2626", fontSize: "0.82rem" }}>{err}</div>}
            <button onClick={submit} disabled={busy}
              style={{ padding: "13px", borderRadius: 10, border: "none", background: "#3b5bdb", color: "#fff",
                cursor: "pointer", fontWeight: 800, fontSize: "0.98rem", marginTop: 4 }}>
              {busy ? "변경 중…" : "비밀번호 변경"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
