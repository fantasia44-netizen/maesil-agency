"use client";
import { useMemo, useState } from "react";
import STATSJSON from "../pokedex_stats.json";
import NAMESJSON from "../pokedex_names.json";
import { pokeSprite } from "../sprite";
import { leagueName } from "../contentI18n";
import { rankIVs, LEAGUE_CAP, type Base, type IVRow } from "./ivRank";
import type { IvDict } from "./dict";
import type { Locale } from "../../../../lib/i18n";

const STATS = STATSJSON as unknown as Record<string, Base>;
const NAMES = NAMESJSON as unknown as Record<string, { ko: string; en: string; ja: string }>;
// 검색 대상: 종족값+이름 둘 다 있는 전 도감
type Poke = { dex: string; ko: string; en: string; ja: string };
const POKELIST: Poke[] = Object.keys(STATS)
  .filter((d) => NAMES[d])
  .map((d) => ({ dex: d, ...NAMES[d] }))
  .sort((a, b) => Number(a.dex) - Number(b.dex));

const LEAGUES: { key: string; c: string }[] = [
  { key: "great", c: "#2563eb" }, { key: "ultra", c: "#d97706" }, { key: "master", c: "#7c3aed" },
];
const localName = (lang: Locale, p: { ko: string; en: string; ja: string }) => (lang === "en" ? p.en : lang === "ja" ? p.ja : p.ko);

export default function IvChecker({ lang, t }: { lang: Locale; t: IvDict }) {
  const [q, setQ] = useState("");
  const [dex, setDex] = useState<string | null>(null);
  const [league, setLeague] = useState("great");
  const [bb, setBb] = useState(false);
  const [iv, setIv] = useState({ a: "", d: "", s: "" });
  const [myRow, setMyRow] = useState<IVRow | null>(null);
  const [ivErr, setIvErr] = useState("");

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return POKELIST.filter((p) => p.ko.toLowerCase().includes(s) || p.en.toLowerCase().includes(s) || p.ja.includes(q.trim()) || p.dex === s).slice(0, 24);
  }, [q]);

  const rows = useMemo(() => {
    if (!dex || !STATS[dex]) return [];
    return rankIVs(STATS[dex], LEAGUE_CAP[league], bb ? 51 : 50);
  }, [dex, league, bb]);

  const picked = dex ? { dex, ...NAMES[dex] } : null;
  const findMyIv = () => {
    const a = Number(iv.a), d = Number(iv.d), s = Number(iv.s);
    if (![a, d, s].every((n) => Number.isInteger(n) && n >= 0 && n <= 15)) { setIvErr(t.invalidIv); setMyRow(null); return; }
    setIvErr("");
    setMyRow(rows.find((r) => r.ia === a && r.id === d && r.is === s) || null);
  };

  const CARD = "#fff", BORDER = "#e3e8f2";
  const lgC = LEAGUES.find((l) => l.key === league)!.c;
  const top = rows.slice(0, 100);

  return (
    <div>
      {/* 검색 */}
      <div style={{ position: "relative" }}>
        <input value={q} onChange={(e) => { setQ(e.target.value); setMyRow(null); }} placeholder={t.searchPlaceholder}
          style={{ width: "100%", padding: "11px 14px", fontSize: "0.95rem", borderRadius: 12, border: `1.5px solid ${BORDER}`, background: "#fff", color: "#0f172a", outline: "none" }} />
        {matches.length > 0 && (
          <div style={{ position: "absolute", zIndex: 20, top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: "0 12px 30px -10px rgba(15,23,42,.2)", maxHeight: 320, overflowY: "auto" }}>
            {matches.map((p) => (
              <button key={p.dex} onClick={() => { setDex(p.dex); setQ(""); setMyRow(null); setIv({ a: "", d: "", s: "" }); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "7px 12px", background: "none", border: "none", cursor: "pointer", borderBottom: `1px solid #f1f5f9` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pokeSprite(p.dex)} alt="" width={32} height={32} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{localName(lang, p)}</span>
                <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#94a3b8" }}>#{p.dex}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "6px 2px 0" }}>{t.searchHint}</div>

      {!picked ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem", fontSize: "0.92rem" }}>{t.selectPrompt}</div>
      ) : (
        <>
          {/* 선택 헤더 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, background: `linear-gradient(110deg, ${lgC}18, #fff 75%)`, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${lgC}`, borderRadius: 14, padding: "10px 14px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pokeSprite(picked.dex)} alt={localName(lang, picked)} width={54} height={54} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#0f172a" }}>{localName(lang, picked)}</div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>#{picked.dex} · {STATS[picked.dex].a}/{STATS[picked.dex].d}/{STATS[picked.dex].s}</div>
            </div>
          </div>

          {/* 리그 탭 + 베프 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {LEAGUES.map((l) => {
              const on = l.key === league;
              return (
                <button key={l.key} onClick={() => { setLeague(l.key); setMyRow(null); }}
                  style={{ padding: "7px 15px", borderRadius: 999, fontSize: "0.84rem", fontWeight: 800, cursor: "pointer",
                    border: `1px solid ${on ? l.c : BORDER}`, background: on ? l.c : "#fff", color: on ? "#fff" : "#64748b" }}>
                  {leagueName(lang, l.key)}
                </button>
              );
            })}
            <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "#475569", cursor: "pointer" }}>
              <input type="checkbox" checked={bb} onChange={(e) => { setBb(e.target.checked); setMyRow(null); }} /> {t.bestBuddy}
            </label>
          </div>

          {/* 내 IV 찾기 */}
          <div style={{ marginTop: 12, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a", marginBottom: 7 }}>🔎 {t.findH}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {([["a", t.ivAtk], ["d", t.ivDef], ["s", t.ivHp]] as const).map(([k, lb]) => (
                <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: "0.74rem", color: "#64748b" }}>{lb}</span>
                  <input type="number" min={0} max={15} value={iv[k]} onChange={(e) => setIv((v) => ({ ...v, [k]: e.target.value }))}
                    style={{ width: 52, padding: "6px 8px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", color: "#0f172a", fontSize: "0.85rem", textAlign: "center" }} />
                </span>
              ))}
              <button onClick={findMyIv} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: lgC, color: "#fff", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>{t.findBtn}</button>
              {ivErr && <span style={{ fontSize: "0.74rem", color: "#dc2626" }}>{ivErr}</span>}
            </div>
            {myRow && (
              <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 10, background: `${lgC}14`, border: `1px solid ${lgC}44`, borderRadius: 10, padding: "8px 12px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.78rem", color: "#475569" }}>{t.yourRank}</span>
                <span style={{ fontSize: "1.15rem", fontWeight: 900, color: lgC }}>#{myRow.rank}{t.rankUnit}</span>
                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>· {myRow.pct.toFixed(2)}% · CP {myRow.cp} · L{myRow.level}</span>
              </div>
            )}
          </div>

          {/* 순위표 */}
          <div style={{ marginTop: 12, overflowX: "auto", border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", minWidth: 560 }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                  {[t.thRank, t.thIv, t.thCp, t.thLv, t.thAtk, t.thDef, t.thHp, t.thProduct].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 0 ? "center" : i === 1 ? "left" : "right", padding: "8px 9px", fontWeight: 800, whiteSpace: "nowrap", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top.map((r) => {
                  const mine = myRow && r.rank === myRow.rank;
                  return (
                    <tr key={r.rank} style={{ background: mine ? `${lgC}18` : r.rank % 2 === 0 ? "#fbfcfe" : "#fff" }}>
                      <td style={{ textAlign: "center", padding: "6px 9px", fontWeight: 900, color: r.rank <= 3 ? lgC : "#94a3b8" }}>{r.rank}</td>
                      <td style={{ padding: "6px 9px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{r.ia}/{r.id}/{r.is}</td>
                      <td style={{ textAlign: "right", padding: "6px 9px", color: "#334155" }}>{r.cp}</td>
                      <td style={{ textAlign: "right", padding: "6px 9px", color: "#64748b" }}>{r.level}</td>
                      <td style={{ textAlign: "right", padding: "6px 9px", color: "#475569" }}>{r.att.toFixed(1)}</td>
                      <td style={{ textAlign: "right", padding: "6px 9px", color: "#475569" }}>{r.def.toFixed(1)}</td>
                      <td style={{ textAlign: "right", padding: "6px 9px", color: "#475569" }}>{r.hp}</td>
                      <td style={{ textAlign: "right", padding: "6px 9px", fontWeight: 700, color: lgC }}>{r.pct.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "7px 2px 0" }}>{t.topNote}</div>
        </>
      )}
    </div>
  );
}
