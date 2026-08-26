"use client";
// PvP 배틀 시뮬레이터 UI — 리그별, 두 포켓몬 IV·기술·레벨·그림자·베파·실드 지정 → 실시간 배틀.
import { useMemo, useState } from "react";
import NAMES from "../pokedex_names.json";
import TYPES from "../pvp_types.json";
import POOLS from "../mon_movepools.json";
import MOVENAMES from "../pvp_move_names.json";
import { pokeSprite } from "../sprite";
import { build, simulate, maxLevelForCap, LEAGUES, type PokeInput } from "./engine";
import type { SimDict } from "./dict";
import type { Locale } from "../../../../lib/i18n";

const PKN = NAMES as unknown as Record<string, { ko: string; en: string; ja: string }>;
const TY = TYPES as unknown as Record<string, string[]>;
const MP = POOLS as unknown as Record<string, { fast: string[]; charged: string[] }>;
const MN = MOVENAMES as unknown as Record<string, { ko: string; ja: string; en: string }>;

const TYPE_COLOR: Record<string, string> = {
  normal: "#9099a1", fire: "#ff9d55", water: "#4d90d5", electric: "#f4d23c", grass: "#63bc5a", ice: "#73cec0",
  fighting: "#ce4069", poison: "#ab6ac8", ground: "#d97746", flying: "#8fa8dd", psychic: "#f97176", bug: "#90c12c",
  rock: "#c7b78b", ghost: "#5269ad", dragon: "#0b6dc3", dark: "#5a5366", steel: "#5a8ea1", fairy: "#ec8fe6",
};
const nameOf = (lang: Locale, dex: number) => { const n = PKN[String(dex)]; return n ? (lang === "en" ? n.en : lang === "ja" ? n.ja : n.ko) : String(dex); };
const moveName = (lang: Locale, id: string) => { const m = MN[id] || MN[id + "_FAST"]; return m ? (lang === "en" ? m.en : lang === "ja" ? m.ja : m.ko) : id; };

type Side = { dex: number | null; fast: string; charged: string[]; ivs: [number, number, number]; shadow: boolean; bestBuddy: boolean; shields: number };
const emptySide = (): Side => ({ dex: null, fast: "", charged: ["", ""], ivs: [0, 15, 15], shadow: false, bestBuddy: false, shields: 1 });

// 검색용 몬 리스트(기술풀+타입+스탯 보유분)
const MONS = Object.keys(MP).filter((d) => TY[d]).map((d) => Number(d)).sort((a, b) => a - b);

export default function SimView({ lang, t }: { lang: Locale; t: SimDict }) {
  const [league, setLeague] = useState<"great" | "ultra" | "master">("great");
  const [A, setA] = useState<Side>(emptySide());
  const [B, setB] = useState<Side>(emptySide());
  const cap = LEAGUES[league];

  // 슬롯 빌드(레벨 자동: 캡 이하 최대)
  const buildSide = (s: Side) => {
    if (!s.dex) return null;
    const level = league === "master" ? (s.bestBuddy ? 51 : 50) : maxLevelForCap(s.dex, s.ivs, cap, s.bestBuddy);
    const inp: PokeInput = { dex: s.dex, types: TY[String(s.dex)] || [], fast: s.fast, charged: s.charged.filter(Boolean), ivs: s.ivs, level, shadow: s.shadow, bestBuddy: s.bestBuddy };
    return { built: build(inp), level };
  };
  const bA = useMemo(() => buildSide(A), [A, league]); // eslint-disable-line react-hooks/exhaustive-deps
  const bB = useMemo(() => buildSide(B), [B, league]); // eslint-disable-line react-hooks/exhaustive-deps
  const result = useMemo(() => (bA?.built && bB?.built ? simulate(bA.built, bB.built, A.shields, B.shields) : null), [bA, bB, A.shields, B.shields]);

  const pickMon = (setSide: typeof setA, dex: number) => {
    const pool = MP[String(dex)]; if (!pool) return;
    setSide((s) => ({ ...s, dex, fast: pool.fast[0] || "", charged: [pool.charged[0] || "", pool.charged[1] || ""] }));
  };

  return (
    <div style={{ maxWidth: 940, margin: "0 auto" }}>
      {/* 리그 탭 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, justifyContent: "center" }}>
        {(["great", "ultra", "master"] as const).map((lg) => (
          <button key={lg} onClick={() => setLeague(lg)}
            style={{ padding: "8px 16px", borderRadius: 999, border: league === lg ? "none" : "1px solid #dbe2ee", cursor: "pointer",
              background: league === lg ? "#3b5bdb" : "#fff", color: league === lg ? "#fff" : "#475569", fontSize: "0.88rem", fontWeight: 800 }}>
            {t.leagues[lg]}
          </button>
        ))}
      </div>

      {/* 두 슬롯 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        <Slot lang={lang} t={t} side={A} setSide={setA} pickMon={(d) => pickMon(setA, d)} built={bA} accent="#3b5bdb" />
        <Slot lang={lang} t={t} side={B} setSide={setB} pickMon={(d) => pickMon(setB, d)} built={bB} accent="#db2777" />
      </div>

      {/* 결과 */}
      <div style={{ marginTop: 16, background: "#fff", border: "1px solid #e3e8f2", borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ fontSize: "1rem", fontWeight: 900, color: "#0f172a", marginBottom: 10, textAlign: "center" }}>⚔️ {t.resultH}</div>
        {!result || !bA?.built || !bB?.built ? (
          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.85rem", padding: "1rem" }}>{t.empty}</div>
        ) : (() => {
          const win = result.winner === "a" ? t.winA : result.winner === "b" ? t.winB : t.tie;
          const winColor = result.winner === "a" ? "#3b5bdb" : result.winner === "b" ? "#db2777" : "#64748b";
          const bar = (hp: number, hp0: number, color: string) => (
            <div style={{ height: 12, background: "#eef2f7", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${Math.round((hp / hp0) * 100)}%`, height: "100%", background: color, transition: "width .2s" }} />
            </div>
          );
          return (
            <div>
              <div style={{ textAlign: "center", fontSize: "1.15rem", fontWeight: 900, color: winColor, marginBottom: 12 }}>🏆 {win}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center", fontSize: "0.82rem" }}>
                <div>
                  <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{A.dex ? nameOf(lang, A.dex) : ""}</div>
                  {bar(result.a.hp, result.a.hp0, "#3b5bdb")}
                  <div style={{ color: "#64748b", marginTop: 4 }}>{t.hpLeft} {result.a.hp}/{result.a.hp0} · {t.dealt} {result.a.dealt}</div>
                  <div style={{ color: "#94a3b8", fontSize: "0.72rem", marginTop: 2 }}>⚔️{t.fastHits} {result.a.fastCount} · 💥{t.chThrown} {result.a.chargedUsed} · 🛡️{t.shUsed} {result.a.shieldsUsed}</div>
                </div>
                <div style={{ fontWeight: 900, color: "#94a3b8" }}>{t.vs}</div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{B.dex ? nameOf(lang, B.dex) : ""}</div>
                  {bar(result.b.hp, result.b.hp0, "#db2777")}
                  <div style={{ color: "#64748b", marginTop: 4 }}>{t.hpLeft} {result.b.hp}/{result.b.hp0} · {t.dealt} {result.b.dealt}</div>
                  <div style={{ color: "#94a3b8", fontSize: "0.72rem", marginTop: 2 }}>⚔️{t.fastHits} {result.b.fastCount} · 💥{t.chThrown} {result.b.chargedUsed} · 🛡️{t.shUsed} {result.b.shieldsUsed}</div>
                </div>
              </div>

              {/* 배틀 타임라인 — 차지 시점(막힘/데미지) 순서 */}
              {result.timeline.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#334155", marginBottom: 6 }}>📜 {t.timelineH}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
                    {result.timeline.map((ev, i) => {
                      const isA = ev.side === "a";
                      const nm = isA ? (A.dex ? nameOf(lang, A.dex) : "A") : (B.dex ? nameOf(lang, B.dex) : "B");
                      const col = isA ? "#3b5bdb" : "#db2777";
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem", padding: "3px 8px", background: "#f8fafc", borderRadius: 6, borderLeft: `3px solid ${col}` }}>
                          <span style={{ color: "#94a3b8", minWidth: 34 }}>{(ev.turn * 0.5).toFixed(1)}s</span>
                          <span style={{ fontWeight: 800, color: col }}>{nm}</span>
                          <span style={{ color: "#334155" }}>💥 {moveName(lang, ev.move)}</span>
                          <span style={{ marginLeft: "auto", fontWeight: 800, color: ev.shielded ? "#64748b" : "#dc2626" }}>
                            {ev.shielded ? `🛡️ ${t.blocked}` : `-${ev.dmg}`}
                          </span>
                          <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>❤️{ev.hpA}/{ev.hpB}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── 슬롯(포켓몬 하나) ──
function Slot({ lang, t, side, setSide, pickMon, built, accent }: {
  lang: Locale; t: SimDict; side: Side; setSide: React.Dispatch<React.SetStateAction<Side>>;
  pickMon: (dex: number) => void; built: { built: ReturnType<typeof build>; level: number } | null; accent: string;
}) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase(); if (!s) return [];
    return MONS.filter((d) => { const n = PKN[String(d)]; return n && (n.ko.toLowerCase().includes(s) || n.en.toLowerCase().includes(s) || (n.ja || "").includes(s) || String(d) === s); }).slice(0, 8);
  }, [q]);
  const pool = side.dex ? MP[String(side.dex)] : null;
  const b = built?.built;

  const moveSelect = (value: string, opts: string[], onCh: (v: string) => void, label: string) => (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <select value={value} onChange={(e) => onCh(e.target.value)}
        style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #dbe2ee", fontSize: "0.82rem", background: "#fff" }}>
        <option value="">—</option>
        {opts.map((id) => <option key={id} value={id}>{moveName(lang, id)}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ background: "#fff", border: `1px solid ${accent}33`, borderTop: `3px solid ${accent}`, borderRadius: 12, padding: "12px" }}>
      {/* 검색 */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPh}
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #dbe2ee", borderRadius: 8, fontSize: "0.85rem" }} />
        {results.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, marginTop: 3, background: "#fff", border: "1px solid #dbe2ee", borderRadius: 8, boxShadow: "0 8px 20px rgba(0,0,0,.12)", maxHeight: 240, overflowY: "auto" }}>
            {results.map((d) => (
              <button key={d} onClick={() => { pickMon(d); setQ(""); }}
                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 8px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pokeSprite(d)} alt="" width={28} height={28} style={{ objectFit: "contain" }} />
                <span style={{ fontSize: "0.82rem", color: "#0f172a" }}>{nameOf(lang, d)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!side.dex ? (
        <div style={{ textAlign: "center", color: "#cbd5e1", fontSize: "0.82rem", padding: "1.4rem 0" }}>{t.pickMon}</div>
      ) : (
        <>
          {/* 스프라이트 + 이름 + CP + 타입 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pokeSprite(side.dex)} alt="" width={52} height={52} style={{ objectFit: "contain" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "0.98rem", fontWeight: 900, color: "#0f172a" }}>{nameOf(lang, side.dex)}{side.shadow ? " 🌑" : ""}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                {(TY[String(side.dex)] || []).map((ty) => (
                  <span key={ty} style={{ fontSize: "0.6rem", fontWeight: 800, color: "#fff", background: TYPE_COLOR[ty] || "#888", borderRadius: 4, padding: "1px 6px" }}>{ty}</span>
                ))}
              </div>
              <div style={{ fontSize: "0.78rem", fontWeight: 800, color: accent, marginTop: 2 }}>{t.cp} {b?.cp ?? "-"} · Lv {built?.level ?? "-"}</div>
            </div>
          </div>

          {/* 공/방/체 */}
          {b && (
            <div style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: "0.72rem", color: "#475569" }}>
              <span>⚔️{t.atk} <b>{b.atk.toFixed(1)}</b></span>
              <span>🛡️{t.def} <b>{b.def.toFixed(1)}</b></span>
              <span>❤️{t.hp} <b>{b.hp}</b></span>
            </div>
          )}

          {/* 기술 */}
          {pool && (
            <>
              {moveSelect(side.fast, pool.fast, (v) => setSide((s) => ({ ...s, fast: v })), t.fast)}
              {moveSelect(side.charged[0], pool.charged, (v) => setSide((s) => ({ ...s, charged: [v, s.charged[1]] })), t.charged + " 1")}
              {moveSelect(side.charged[1], pool.charged, (v) => setSide((s) => ({ ...s, charged: [s.charged[0], v] })), t.charged + " 2")}
            </>
          )}

          {/* IV */}
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, marginBottom: 2 }}>{t.ivLabel} ({t.atk}/{t.def}/{t.sta})</div>
            <div style={{ display: "flex", gap: 4 }}>
              {([0, 1, 2] as const).map((i) => (
                <input key={i} type="number" min={0} max={15} value={side.ivs[i]}
                  onChange={(e) => { const v = Math.max(0, Math.min(15, Number(e.target.value) || 0)); setSide((s) => { const iv = [...s.ivs] as [number, number, number]; iv[i] = v; return { ...s, ivs: iv }; }); }}
                  style={{ width: "100%", padding: "5px 4px", borderRadius: 6, border: "1px solid #dbe2ee", fontSize: "0.8rem", textAlign: "center" }} />
              ))}
            </div>
          </div>

          {/* 토글 + 실드 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
            <label style={{ fontSize: "0.74rem", display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
              <input type="checkbox" checked={side.shadow} onChange={(e) => setSide((s) => ({ ...s, shadow: e.target.checked }))} /> {t.shadow}
            </label>
            <label style={{ fontSize: "0.74rem", display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
              <input type="checkbox" checked={side.bestBuddy} onChange={(e) => setSide((s) => ({ ...s, bestBuddy: e.target.checked }))} /> {t.bestBuddy}
            </label>
            <span style={{ fontSize: "0.74rem", color: "#64748b", marginLeft: "auto" }}>{t.shields}
              <select value={side.shields} onChange={(e) => setSide((s) => ({ ...s, shields: Number(e.target.value) }))}
                style={{ marginLeft: 4, padding: "3px 6px", borderRadius: 6, border: "1px solid #dbe2ee" }}>
                {[0, 1, 2].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
