"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import DATA from "../gbl_data.json";
import AdSlot from "../AdSlot";
import CoupangAd from "../CoupangAd";
import { currentFormats, todayISO, type Format } from "../formats";

type Mon = { id: string; dex: number; ko: string; en: string; types: string[]; shadow: boolean; sprite?: string };
type League = "great" | "ultra" | "master";
const DS = DATA as unknown as { leagues: Record<League, { pokemon: Mon[] }> };
const MON: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON[m.id] = m;
const spriteUrl = (m?: Mon) => m ? (m.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.dex}.png`) : "";

// 기간/시즌 — 시즌은 날짜구간. 공식(새로운 발걸음 2026.6.2~9.8) 기준.
const PERIODS: { key: string; label: string; days?: number; start?: string; end?: string }[] = [
  { key: "7", label: "최근 7일", days: 7 },
  { key: "30", label: "최근 30일", days: 30 },
  { key: "s27", label: "시즌27 (새로운 발걸음)", start: "2026-06-02", end: "2026-09-09" },
  { key: "all", label: "전체", days: 0 },
];

type MetaMon = { speciesId: string; count: number };
type MetaDeck = { deck: string[]; count: number; wins: number; losses: number };
type Meta = { total: number; wins: number; losses: number; top_mons: MetaMon[]; top_decks: MetaDeck[] };

function Sprite({ id, size = 30 }: { id: string; size?: number }) {
  const m = MON[id];
  return <img src={spriteUrl(m)} alt={m?.ko || id} width={size} height={size}
    style={{ imageRendering: "pixelated" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />;
}

export default function GblMeta() {
  const [league, setLeague] = useState<string>("master");
  const [formats, setFormats] = useState<Format[]>(() => currentFormats("2000-01-01"));  // SSR: 코어만
  const [periodKey, setPeriodKey] = useState("30");
  const [view, setView] = useState<"mon" | "deck">("mon");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setFormats(currentFormats(todayISO())); }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const p = PERIODS.find((x) => x.key === periodKey) || PERIODS[1];
    const qs = new URLSearchParams({ league });
    if (p.start && p.end) { qs.set("start", p.start); qs.set("end", p.end); }
    else qs.set("days", String(p.days ?? 30));
    apiFetch<Meta>(`/api/gbl/meta?${qs.toString()}`, {}, 20000)
      .then((d) => { if (alive) setMeta(d); })
      .catch(() => { if (alive) setMeta(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [league, periodKey]);

  const maxMon = useMemo(() => meta?.top_mons?.[0]?.count || 1, [meta]);
  const maxDeck = useMemo(() => meta?.top_decks?.[0]?.count || 1, [meta]);

  const pill = (on: boolean, cup = false): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 18, cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
    border: on ? `1.5px solid ${cup ? "#7c3aed" : "#3b5bdb"}` : "1px solid #e2e8f0",
    background: on ? (cup ? "#faf5ff" : "#eef2ff") : "#fff", color: on ? (cup ? "#7c3aed" : "#3b5bdb") : "#64748b",
  });

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ marginBottom: 6, display: "flex", alignItems: "center" }}>
        <Link href="/gbl" style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
        <Link href="/gbl/app" style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>📝 내 기록 →</Link>
      </div>
      <h1 style={{ margin: "0.2rem 0 0.2rem", fontSize: "1.4rem", fontWeight: 900 }}>실측 GBL 메타</h1>
      <p style={{ margin: "0 0 1rem", fontSize: "0.84rem", color: "#64748b", lineHeight: 1.6 }}>
        시뮬레이션이 아닌, 유저들이 <b>실제로 만난 상대</b> 데이터 집계. 지금 리그에서 뭘 제일 많이 만나는지.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        {formats.map((f) => <button key={f.key} style={pill(league === f.key, f.cup)} title={f.note || ""} onClick={() => setLeague(f.key)}>{f.label}</button>)}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {PERIODS.map((p) => <button key={p.key} style={pill(periodKey === p.key)} onClick={() => setPeriodKey(p.key)}>{p.label}</button>)}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem" }}>불러오는 중…</div>
      ) : !meta || meta.total === 0 ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "2.5rem", fontSize: "0.9rem" }}>
          이 조건의 집계 데이터가 아직 부족합니다. 기록이 쌓이면 채워집니다.
        </div>
      ) : (
        <>
          {/* 포켓몬 / 덱 탭 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {([["mon", "🔥 포켓몬 픽업률"], ["deck", "🏆 덱 픽업률"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setView(k)}
                style={{ flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.86rem",
                  border: view === k ? "1.5px solid #0f172a" : "1px solid #e2e8f0",
                  background: view === k ? "#0f172a" : "#fff", color: view === k ? "#fff" : "#334155" }}>{label}</button>
            ))}
          </div>

          {view === "mon" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {meta.top_mons.slice(0, 25).map((mm, i) => {
                const m = MON[mm.speciesId];
                const pct = Math.round((mm.count / meta.total) * 100);
                return (
                  <div key={mm.speciesId} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #eef2f0", borderRadius: 10, padding: "5px 10px" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: 800, color: i < 3 ? "#7c3aed" : "#94a3b8", minWidth: 22 }}>#{i + 1}</span>
                    <Sprite id={mm.speciesId} size={30} />
                    <span style={{ fontSize: "0.86rem", fontWeight: 600, minWidth: 90 }}>
                      {m?.shadow && <span style={{ color: "#7c3aed" }}>그림자 </span>}{m?.ko || mm.speciesId}
                    </span>
                    <div style={{ flex: 1, height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${Math.round((mm.count / maxMon) * 100)}%`, height: "100%", background: "#3b5bdb" }} />
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#3b5bdb", minWidth: 38, textAlign: "right" }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 2 }}>전체 대전 중 이 덱(파티)을 만난 비율</div>
              {meta.top_decks.slice(0, 25).map((d, i) => {
                const pct = Math.round((d.count / meta.total) * 100);
                const names = d.deck.map((id) => MON[id]?.ko || id).join(" · ");
                return (
                  <div key={i} style={{ background: "#fff", border: "1px solid #eef2f0", borderRadius: 10, padding: "7px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: i < 3 ? "#7c3aed" : "#94a3b8", minWidth: 22 }}>#{i + 1}</span>
                      <div style={{ display: "flex", gap: 2 }}>{d.deck.map((id) => <Sprite key={id} id={id} size={32} />)}</div>
                      <span style={{ marginLeft: "auto", fontSize: "1rem", fontWeight: 800, color: "#7c3aed" }}>{pct}%</span>
                    </div>
                    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, margin: "6px 0 4px", overflow: "hidden" }}>
                      <div style={{ width: `${Math.round((d.count / maxDeck) * 100)}%`, height: "100%", background: "#7c3aed" }} />
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#475569", lineHeight: 1.4 }}>{names}</div>
                  </div>
                );
              })}
            </div>
          )}

          <AdSlot />
          <CoupangAd />
        </>
      )}
    </div>
  );
}
