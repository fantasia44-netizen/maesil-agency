"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser, logout, apiFetch } from "../../lib/api";
import DATA from "./gbl_data.json";

type Mon = { id: string; dex: number; ko: string; sprite?: string };
const DS = DATA as unknown as { leagues: Record<string, { pokemon: Mon[] }> };
const MON: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON[m.id] = m;
const spriteUrl = (m?: Mon) => m ? (m.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.dex}.png`) : "";

type Teaser = { total: number; top_mons: { speciesId: string; count: number }[] };

export default function GblLanding() {
  const [authed, setAuthed] = useState(false);
  const [teaser, setTeaser] = useState<Teaser | null>(null);

  useEffect(() => { setAuthed(!!getUser()); }, []);
  useEffect(() => {
    apiFetch<Teaser>("/api/gbl/meta?league=master&days=30", {}, 15000)
      .then(setTeaser).catch(() => setTeaser(null));
  }, []);

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
    <div style={{ minHeight: "100dvh", background: "linear-gradient(160deg,#0b1020,#131c33)", padding: "2rem 1.4rem 3rem" }}>
      <div style={{ width: "100%", maxWidth: 440, margin: "0 auto" }}>
        {/* 히어로 (원본 CSS — 공식 이미지 없음) */}
        <div style={{ textAlign: "center", marginBottom: 24, paddingTop: "1.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: "1.4rem", opacity: 0.9 }}>🔵</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#6c7a99", letterSpacing: 2 }}>VS</span>
            <span style={{ fontSize: "1.4rem", opacity: 0.9 }}>🔴</span>
          </div>
          <div style={{ fontSize: "3rem", lineHeight: 1 }}>📓</div>
          <h1 style={{ margin: "10px 0 8px", fontSize: "2.1rem", fontWeight: 900, color: "#fff", letterSpacing: "-1px" }}>GBL Note</h1>
          <p style={{ margin: 0, fontSize: "0.95rem", color: "#8ea0c4", lineHeight: 1.65 }}>
            포켓몬GO 배틀리그 상대를 기록하고,<br />다시 만나면 <b style={{ color: "#fff" }}>5초 안에 저격</b>.
          </p>
        </div>

        {/* CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          <Link href={authed ? "/gbl/app" : "/gbl/login"} style={primaryBtn}>📝 내 기록 시작하기</Link>
          <Link href="/gbl/meta" style={ghostBtn}>🌐 전체 실측 메타 보기 (무료)</Link>
        </div>

        {/* 라이브 메타 미리보기 */}
        {teaser && teaser.total > 0 && (
          <div style={{ background: "#0f1628", border: "1px solid #22304f", borderRadius: 14, padding: "1rem 1.1rem", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#e2e8f0" }}>🔥 지금 마스터리그에서 제일 많이 만나는</span>
              <Link href="/gbl/meta" style={{ fontSize: "0.72rem", color: "#8ea0c4", textDecoration: "none" }}>더보기 →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {teaser.top_mons.slice(0, 3).map((mm, i) => {
                const m = MON[mm.speciesId];
                const pct = Math.round((mm.count / teaser.total) * 100);
                return (
                  <div key={mm.speciesId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#7c8bb5", minWidth: 16 }}>{i + 1}</span>
                    <img src={spriteUrl(m)} alt="" width={26} height={26} style={{ imageRendering: "pixelated" }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e2e8f0", flex: 1 }}>{m?.ko || mm.speciesId}</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#6c8cff" }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 특징 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
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
