"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser, logout } from "../../lib/api";

export default function GblLanding() {
  const [authed, setAuthed] = useState(false);
  useEffect(() => { setAuthed(!!getUser()); }, []);

  const primaryBtn: React.CSSProperties = {
    display: "block", textAlign: "center", padding: "15px", borderRadius: 12,
    fontWeight: 800, fontSize: "1rem", textDecoration: "none", background: "#3b5bdb", color: "#fff",
  };
  const ghostBtn: React.CSSProperties = {
    display: "block", textAlign: "center", padding: "15px", borderRadius: 12,
    fontWeight: 800, fontSize: "1rem", textDecoration: "none",
    background: "transparent", color: "#c7d2fe", border: "1px solid #2a3550",
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg,#0b1020,#131c33)", padding: "2rem 1.4rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontSize: "2.8rem" }}>📓</div>
          <h1 style={{ margin: "8px 0 6px", fontSize: "1.9rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>GBL Note</h1>
          <p style={{ margin: 0, fontSize: "0.92rem", color: "#8ea0c4", lineHeight: 1.6 }}>
            포켓몬GO 배틀리그 상대를 기록하고,<br />다시 만나면 <b style={{ color: "#c7d2fe" }}>5초 안에 저격</b>.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
          <Link href={authed ? "/gbl/app" : "/gbl/login"} style={primaryBtn}>📝 내 기록 시작하기</Link>
          <Link href="/gbl/meta" style={ghostBtn}>🌐 전체 실측 메타 보기</Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 26 }}>
          {[
            ["🎯", "상대 덱 기록·즉시 조회", "만났던 상대를 이름으로 5초 안에 다시 확인"],
            ["📊", "내 승률·약점 덱 분석", "덱별 전적으로 어떤 상대에 지는지 복기"],
            ["🌐", "실측 메타 (시뮬 아님)", "수천 명이 실제로 만난 덱·픽업률을 집계"],
            ["🔒", "내 덱은 비밀", "기록은 '상대' 데이터만 — 내 전략은 공개 안 됨"],
          ].map(([ic, t, d]) => (
            <div key={t} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.3rem" }}>{ic}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#e2e8f0" }}>{t}</div>
                <div style={{ fontSize: "0.78rem", color: "#8ea0c4", lineHeight: 1.5 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#5f6f92" }}>
          무료 · <Link href="/gbl/privacy" style={{ color: "#8ea0c4" }}>개인정보처리방침</Link>
          {authed && (
            <> · <button onClick={logout} style={{ background: "none", border: "none", color: "#8ea0c4", cursor: "pointer", fontSize: "0.72rem", padding: 0 }}>로그아웃</button></>
          )}
        </p>
      </div>
    </div>
  );
}
