"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser, logout, apiFetch } from "../../lib/api";
import DATA from "./gbl_data.json";
import CoupangAd from "./CoupangAd";

type Mon = { id: string; dex: number; ko: string; sprite?: string };
const DS = DATA as unknown as { leagues: Record<string, { pokemon: Mon[] }> };
const MON: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON[m.id] = m;
const spriteUrl = (m?: Mon) => m ? (m.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.dex}.png`) : "";

type Teaser = { total: number; top_mons: { speciesId: string; count: number }[] };

const FEATURES: { ic: string; t: string; d: string; c: string }[] = [
  { ic: "🔍", t: "상대 기록", d: "다음 만남을 5초 안에 확인", c: "#4f8cff" },
  { ic: "⚔️", t: "내 전적", d: "리그별 승패와 상세 통계", c: "#a855f7" },
  { ic: "🏆", t: "배틀 순위", d: "포켓몬 순위·티어 확인", c: "#ca8a04" },
  { ic: "📊", t: "실전 픽업률", d: "실제 만난 기반 포켓몬 통계", c: "#059669" },
  { ic: "👥", t: "실전 덱 통계", d: "조합별 덱 픽업 TOP", c: "#db2777" },
];

export default function GblLanding() {
  const [authed, setAuthed] = useState(false);
  const [teaser, setTeaser] = useState<Teaser | null>(null);

  useEffect(() => { setAuthed(!!getUser()); }, []);
  useEffect(() => {
    apiFetch<Teaser>("/api/gbl/meta?league=master&days=30", {}, 15000).then(setTeaser).catch(() => setTeaser(null));
  }, []);

  const primaryBtn: React.CSSProperties = {
    flex: 1, textAlign: "center", padding: "15px", borderRadius: 12, fontWeight: 800, fontSize: "1rem",
    textDecoration: "none", background: "linear-gradient(90deg,#3b5bdb,#7c3aed)", color: "#fff",
    boxShadow: "0 6px 20px rgba(80,90,220,.35)",
  };
  const ghostBtn: React.CSSProperties = {
    flex: 1, textAlign: "center", padding: "15px", borderRadius: 12, fontWeight: 800, fontSize: "1rem",
    textDecoration: "none", background: "#f1f5f9", color: "#334155", border: "1px solid #dbe2ee",
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
      padding: "2rem 1.2rem 3rem",
    }}>
      <div style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
        {/* 헤더 */}
        <div style={{ textAlign: "center", paddingTop: "1.2rem", marginBottom: 28 }}>
          <span style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, color: "#3b5bdb",
            border: "1px solid #c3d2f5", borderRadius: 20, padding: "4px 12px", marginBottom: 16 }}>
            🇰🇷 한국어판 · 실제 유저 데이터 기반
          </span>
          <h1 style={{
            margin: "0 0 10px", fontSize: "clamp(2.6rem, 12vw, 4.5rem)", fontWeight: 900, letterSpacing: "-2px", lineHeight: 1,
            background: "linear-gradient(92deg,#1e3a8a 0%,#3b5bdb 55%,#7c3aed 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>GBL NOTE</h1>
          <p style={{ margin: "0 0 6px", fontSize: "clamp(1.1rem,4.5vw,1.5rem)", fontWeight: 800, color: "#0f172a" }}>
            기록하면, <span style={{ color: "#3b5bdb" }}>다음 배틀</span>이 보인다.
          </p>
          <p style={{ margin: 0, fontSize: "0.86rem", color: "#64748b" }}>
            상대 기록 · 내 전적 · 배틀 순위 · 실전 픽업률 · 실전 덱 통계
          </p>
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 10, maxWidth: 480, margin: "0 auto 14px", flexWrap: "wrap" }}>
          <Link href={authed ? "/gbl/app" : "/gbl/login"} style={primaryBtn}>📝 내 기록 시작하기</Link>
          <Link href="/gbl/meta" style={ghostBtn}>🌐 실측 메타 (무료)</Link>
        </div>

        {/* 리그별 실측/티어 바로가기 (SEO 내부링크) */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
          {([["master", "마스터리그"], ["great", "슈퍼리그"], ["ultra", "하이퍼리그"]] as const).map(([k, label]) => (
            <Link key={k} href={`/gbl/meta/${k}`}
              style={{ fontSize: "0.8rem", fontWeight: 700, color: "#3b5bdb", textDecoration: "none",
                padding: "6px 13px", border: "1px solid #d3ddf5", borderRadius: 16, background: "#fff" }}>
              📊 {label} 실측
            </Link>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 10 }}>
          {([["master", "마스터"], ["great", "슈퍼"], ["ultra", "하이퍼"]] as const).map(([k, label]) => (
            <Link key={k} href={`/gbl/tier/${k}`}
              style={{ fontSize: "0.8rem", fontWeight: 700, color: "#7c3aed", textDecoration: "none",
                padding: "6px 13px", border: "1px solid #e0d3f5", borderRadius: 16, background: "#fff" }}>
              🏆 {label} 티어표
            </Link>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
          {([["master", "마스터"], ["great", "슈퍼"], ["ultra", "하이퍼"]] as const).map(([k, label]) => (
            <Link key={k} href={`/gbl/cmp/${k}`}
              style={{ fontSize: "0.8rem", fontWeight: 700, color: "#ea580c", textDecoration: "none",
                padding: "6px 13px", border: "1px solid #f5ddc3", borderRadius: 16, background: "#fff" }}>
              ⚡ {label} CMP 우선권
            </Link>
          ))}
        </div>

        {/* 레이드 파밍 유저용 진입 배너 */}
        <Link href="/gbl/raid" style={{
          display: "flex", alignItems: "center", gap: 12, maxWidth: 640, margin: "0 auto 28px",
          textDecoration: "none", padding: "14px 16px", borderRadius: 14,
          background: "linear-gradient(100deg,#fff4e6,#ffe8f0)", border: "1px solid #ffd8a8",
          boxShadow: "0 4px 16px rgba(234,88,12,.12)",
        }}>
          <span style={{ fontSize: "1.8rem" }}>🔥</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#c2410c" }}>레이드 하러 오셨나요?</div>
            <div style={{ fontSize: "0.78rem", color: "#9a3412", lineHeight: 1.5 }}>속성별 최강 딜러 티어표 · 추천 기술배치 (메가·섀도우 포함)</div>
          </div>
          <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ea580c", whiteSpace: "nowrap" }}>보러가기 →</span>
        </Link>

        {/* 기능 카드 (이미지 스타일) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
          {FEATURES.map((f) => (
            <div key={f.t} style={{ background: "#ffffff", border: "1px solid #e3e8f2",
              borderRadius: 14, padding: "1.1rem 1rem", textAlign: "center" }}>
              <div style={{ width: 46, height: 46, margin: "0 auto 10px", borderRadius: 12,
                background: f.c + "22", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.4rem", boxShadow: `0 0 18px ${f.c}33` }}>{f.ic}</div>
              <div style={{ fontWeight: 800, fontSize: "0.92rem", color: f.c, marginBottom: 4 }}>{f.t}</div>
              <div style={{ fontSize: "0.74rem", color: "#64748b", lineHeight: 1.5 }}>{f.d}</div>
            </div>
          ))}
        </div>

        {/* 라이브 메타 미리보기 (실측 데이터) */}
        {teaser && teaser.total > 0 && (
          <div style={{ maxWidth: 480, margin: "0 auto 28px", background: "#ffffff", border: "1px solid #e3e8f2", borderRadius: 14, padding: "1rem 1.1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>🔥 지금 마스터리그 픽업률 TOP</span>
              <Link href="/gbl/meta" style={{ fontSize: "0.72rem", color: "#64748b", textDecoration: "none" }}>더보기 →</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {teaser.top_mons.slice(0, 3).map((mm, i) => {
                const m = MON[mm.speciesId];
                const pct = Math.round((mm.count / teaser.total) * 100);
                return (
                  <div key={mm.speciesId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#94a3b8", minWidth: 16 }}>{i + 1}</span>
                    <img src={spriteUrl(m)} alt="" width={26} height={26} style={{ imageRendering: "pixelated" }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", flex: 1 }}>{m?.ko || mm.speciesId}</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#3b5bdb" }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <CoupangAd />

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#94a3b8", lineHeight: 2 }}>
          <Link href="/gbl/raid" style={{ color: "#64748b" }}>레이드 딜러</Link> ·{" "}
          <Link href="/gbl/schedule" style={{ color: "#64748b" }}>시즌 일정</Link> ·{" "}
          <Link href="/gbl/guide" style={{ color: "#64748b" }}>가이드</Link> ·{" "}
          <Link href="/gbl/about" style={{ color: "#64748b" }}>소개</Link> ·{" "}
          <Link href="/gbl/contact" style={{ color: "#64748b" }}>문의</Link> ·{" "}
          <Link href="/gbl/privacy" style={{ color: "#64748b" }}>개인정보처리방침</Link> ·{" "}
          <Link href="/gbl/terms" style={{ color: "#64748b" }}>이용약관</Link>
          {authed && <> · <button onClick={logout} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.75rem", padding: 0 }}>로그아웃</button></>}
        </p>
      </div>
    </div>
  );
}
