"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { login, gblSignup, gblPasswordRequest } from "../../../../lib/api";
import { localizePath, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { getDict } from "../dictionaries";
import GoogleButton from "../GoogleButton";

type Mode = "login" | "signup" | "forgot";

export default function GblLogin() {
  const router = useRouter();
  const raw = String(useParams()?.lang || defaultLocale);
  const lang: Locale = isLocale(raw) ? raw : defaultLocale;
  const a = getDict(lang).auth;
  const L = (p: string) => localizePath(lang, p);
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
      if (!email.trim()) { setErr(a.errEmail); return; }
      setBusy(true);
      try { await gblPasswordRequest(email.trim()); setSent(true); }
      catch { setErr(a.errRequest); }
      finally { setBusy(false); }
      return;
    }
    if (!email.trim() || !pw) { setErr(a.errCreds); return; }
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), pw);
      else await gblSignup(email.trim(), pw, name.trim() || undefined);
      router.push(L("/gbl/app"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : a.errFail);
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
            {a.tagline}
          </p>
        </div>

        {mode !== "forgot" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#ffffff", borderRadius: 10, padding: 4 }}>
            {(["login", "signup"] as const).map((m) => (
              <button key={m} onClick={() => switchMode(m)}
                style={{ flex: 1, padding: "9px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.88rem", border: "none",
                  background: mode === m ? "#3b5bdb" : "transparent", color: mode === m ? "#fff" : "#64748b" }}>
                {m === "login" ? a.login : a.signup}
              </button>
            ))}
          </div>
        )}

        {mode === "forgot" ? (
          sent ? (
            <div style={{ textAlign: "center", color: "#16a34a", fontSize: "0.9rem", lineHeight: 1.7 }}>
              {a.resetSent}<br />
              <span style={{ color: "#64748b", fontSize: "0.82rem" }}>{a.resetSentNote}</span>
              <div style={{ marginTop: 16 }}>
                <button style={linkBtn} onClick={() => switchMode("login")}>{a.backToLogin}</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ margin: "0 0 2px", fontSize: "0.85rem", color: "#64748b" }}>{a.forgotIntro}</p>
              <input style={input} placeholder={a.email} type="email" value={email}
                onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                autoComplete="email" autoCapitalize="off" />
              {err && <div style={{ color: "#dc2626", fontSize: "0.82rem" }}>{err}</div>}
              <button onClick={submit} disabled={busy}
                style={{ padding: "13px", borderRadius: 10, border: "none", background: "#3b5bdb", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: "0.98rem" }}>
                {busy ? a.sending : a.sendReset}
              </button>
              <button style={{ ...linkBtn, textAlign: "center", marginTop: 4 }} onClick={() => switchMode("login")}>{a.backToLogin}</button>
            </div>
          )
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <GoogleButton onError={setErr} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
              <div style={{ flex: 1, height: 1, background: "#dbe2ee" }} />
              <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{a.orEmail}</span>
              <div style={{ flex: 1, height: 1, background: "#dbe2ee" }} />
            </div>
            {mode === "signup" && (
              <input style={input} placeholder={a.nickname} value={name}
                onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
            )}
            <input style={input} placeholder={a.emailId} type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoCapitalize="off" />
            <input style={input} placeholder={mode === "signup" ? a.pwSignup : a.pw} type="password" value={pw}
              onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              autoComplete={mode === "signup" ? "new-password" : "current-password"} />

            {err && <div style={{ color: "#dc2626", fontSize: "0.82rem" }}>{err}</div>}

            <button onClick={submit} disabled={busy}
              style={{ padding: "13px", borderRadius: 10, border: "none", background: "#3b5bdb", color: "#fff",
                cursor: "pointer", fontWeight: 800, fontSize: "0.98rem", marginTop: 4 }}>
              {busy ? a.processing : mode === "login" ? a.login : a.signupBtn}
            </button>

            {mode === "login" && (
              <div style={{ textAlign: "center", marginTop: 2 }}>
                <button style={linkBtn} onClick={() => switchMode("forgot")}>{a.forgotQ}</button>
              </div>
            )}
            <p style={{ textAlign: "center", margin: "2px 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>
              {a.idNote}
            </p>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          {a.privacyNote} <Link href={L("/gbl/privacy")} style={{ color: "#64748b" }}>{getDict(lang).footer.privacy}</Link>
        </p>
      </div>
    </div>
  );
}
