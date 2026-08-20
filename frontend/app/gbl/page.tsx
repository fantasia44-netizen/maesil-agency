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
type Card = { ic: string; t: string; d: string; href: string; c: string; tag?: string };

function HubCard({ h }: { h: Card }) {
  return (
    <Link href={h.href}
      style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12,
        background: `linear-gradient(120deg, ${h.c}14, #ffffff 72%)`, border: "1px solid #e3e8f2", borderLeft: `4px solid ${h.c}`,
        borderRadius: 14, padding: "14px 15px" }}>
      <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 12, background: h.c + "1f",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>{h.ic}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>{h.t}</span>
          {h.tag && <span style={{ fontSize: "0.58rem", fontWeight: 800, color: "#fff", background: h.c, borderRadius: 5, padding: "1px 6px" }}>{h.tag}</span>}
        </div>
        <div style={{ fontSize: "0.76rem", color: "#64748b", lineHeight: 1.45, marginTop: 2 }}>{h.d}</div>
      </div>
      <span style={{ color: h.c, fontWeight: 800, fontSize: "0.9rem" }}>→</span>
    </Link>
  );
}

export default function GblLanding() {
  const [authed, setAuthed] = useState(false);
  const [teaser, setTeaser] = useState<Teaser | null>(null);

  useEffect(() => { setAuthed(!!getUser()); }, []);
  useEffect(() => {
    apiFetch<Teaser>("/api/gbl/meta?league=master&days=30", {}, 15000).then(setTeaser).catch(() => setTeaser(null));
  }, []);

  const RAID: Card[] = [
    { ic: "🔥", t: "레이드 딜러 티어", d: "속성별 최강 공격수 · 종합점수(딜+총딜)", href: "/gbl/raid", c: "#ea580c", tag: "인기" },
    { ic: "🗓️", t: "레이드 일정", d: "월별 달력 · 5성·메가 로테이션 · 레이드아워/데이", href: "/gbl/raid/schedule", c: "#db2777" },
    { ic: "💯", t: "보스 100% CP", d: "이달 보스 · 개체값별 포획 CP표(꿀박 확인)", href: "/gbl/raid/bosses", c: "#c2410c" },
  ];
  const PVP: Card[] = [
    { ic: "🏆", t: "배틀리그 티어표", d: "슈퍼·하이퍼·마스터 티어 + 추천 기술배치", href: "/gbl/tier/master", c: "#7c3aed" },
    { ic: "📊", t: "실측 메타", d: "한국 유저가 실제로 만난 포켓몬 픽률 TOP", href: "/gbl/meta", c: "#059669" },
    { ic: "⚡", t: "CMP 우선권", d: "같은 턴 차지 우선순위(공격력) 순위", href: "/gbl/cmp/master", c: "#0891b2" },
    { ic: "📝", t: "내 전적 기록", d: "상대 기록 · 승패 통계 · 전적 자랑 카드", href: authed ? "/gbl/app" : "/gbl/login", c: "#3b5bdb" },
  ];

  return (
    <div style={{
      minHeight: "100dvh",
      background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
      padding: "1.6rem 1.2rem 3rem",
    }}>
      <div style={{ width: "100%", maxWidth: 860, margin: "0 auto" }}>
        {/* 헤더 로고 */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gbl-icon.png" alt="GBL Note" width={78} height={78} style={{ marginBottom: 6 }} />
          <h1 style={{
            margin: "0 0 8px", fontSize: "clamp(2rem, 9vw, 3.2rem)", fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1,
            background: "linear-gradient(92deg,#1e3a8a 0%,#3b5bdb 55%,#7c3aed 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>GBL NOTE</h1>
          <p style={{ margin: "0 0 4px", fontSize: "clamp(0.95rem,4.5vw,1.25rem)", fontWeight: 800, color: "#0f172a" }}>
            포켓몬GO <span style={{ color: "#3b5bdb" }}>올인원</span> 한국어판
          </p>
          <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748b" }}>레이드 · 배틀리그 · 티어 · CP · 내 전적까지 한 곳에서</p>
        </div>

        {/* 레이드 파밍러 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#ea580c" }}>🔥 레이드러</span>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>속성별 딜러 티어·보스·일정·CP</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, marginBottom: 24 }}>
          {RAID.map((h) => <HubCard key={h.t} h={h} />)}
        </div>

        {/* PvP 배틀러 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#7c3aed" }}>⚔️ 배틀리그(PvP)</span>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>티어·메타·CMP·기록</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, marginBottom: 24 }}>
          {PVP.map((h) => <HubCard key={h.t} h={h} />)}
        </div>

        {/* 라이브 실측 미리보기 */}
        {teaser && teaser.total > 0 && (
          <div style={{ maxWidth: 480, margin: "0 auto 24px", background: "#ffffff", border: "1px solid #e3e8f2", borderRadius: 14, padding: "1rem 1.1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>🔥 지금 마스터리그 실측 픽률 TOP</span>
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
          <Link href="/gbl/raid/schedule" style={{ color: "#64748b" }}>레이드 일정</Link> ·{" "}
          <Link href="/gbl/schedule" style={{ color: "#64748b" }}>시즌 일정</Link> ·{" "}
          <Link href="/gbl/guide" style={{ color: "#64748b" }}>가이드</Link> ·{" "}
          <Link href="/gbl/about" style={{ color: "#64748b" }}>소개</Link> ·{" "}
          <Link href="/gbl/privacy" style={{ color: "#64748b" }}>개인정보처리방침</Link> ·{" "}
          <Link href="/gbl/terms" style={{ color: "#64748b" }}>이용약관</Link>
          {authed && <> · <button onClick={logout} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.75rem", padding: 0 }}>로그아웃</button></>}
        </p>
      </div>
    </div>
  );
}
