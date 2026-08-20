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

const PERIODS: { key: string; label: string; days?: number; start?: string; end?: string }[] = [
  { key: "7", label: "최근 7일", days: 7 },
  { key: "30", label: "최근 30일", days: 30 },
  { key: "s27", label: "시즌27 (새로운 발걸음)", start: "2026-06-02", end: "2026-09-09" },
  { key: "all", label: "전체", days: 0 },
];

type MetaMon = { speciesId: string; count: number };
type MetaDeck = { deck: string[]; count: number; wins: number; losses: number };
type Meta = { total: number; wins: number; losses: number; top_mons: MetaMon[]; top_decks: MetaDeck[] };

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

const PAGE_SIZE = 20;

function Sprite({ id, size = 30 }: { id: string; size?: number }) {
  const m = MON[id];
  return <img src={spriteUrl(m)} alt={m?.ko || id} width={size} height={size}
    style={{ imageRendering: "pixelated" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />;
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  const btn = (disabled: boolean): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 8, border: "1px solid #e3e8f2",
    background: disabled ? "#f1f5f9" : "#fff", color: disabled ? "#cbd5e1" : "#3b5bdb",
    fontWeight: 700, fontSize: "0.8rem", cursor: disabled ? "default" : "pointer",
  });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 12 }}>
      <button style={btn(page === 0)} disabled={page === 0} onClick={() => onPage(page - 1)}>← 이전</button>
      <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>{page + 1} / {pages}</span>
      <button style={btn(page >= pages - 1)} disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>다음 →</button>
    </div>
  );
}

function MonList({ meta, maxMon }: { meta: Meta; maxMon: number }) {
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [meta]);
  const pages = Math.ceil(meta.top_mons.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {meta.top_mons.slice(start, start + PAGE_SIZE).map((mm, idx) => {
        const i = start + idx;
        const m = MON[mm.speciesId];
        const pct = Math.round((mm.count / meta.total) * 100);
        return (
          <div key={mm.speciesId} style={{ display: "flex", alignItems: "center", gap: 8, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "5px 10px" }}>
            <span style={{ fontSize: "0.74rem", fontWeight: 800, color: i < 3 ? "#a855f7" : "#94a3b8", minWidth: 22 }}>#{i + 1}</span>
            <Sprite id={mm.speciesId} size={30} />
            <span style={{ fontSize: "0.86rem", fontWeight: 600, minWidth: 88, color: "#0f172a" }}>
              {m?.shadow && <span style={{ color: "#7c3aed" }}>그림자 </span>}{m?.ko || mm.speciesId}
            </span>
            <div style={{ flex: 1, height: 8, background: "#e5eaf3", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${Math.round((mm.count / maxMon) * 100)}%`, height: "100%", background: "linear-gradient(90deg,#3b5bdb,#7c3aed)" }} />
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#3b5bdb", minWidth: 38, textAlign: "right" }}>{pct}%</span>
          </div>
        );
      })}
    </div>
    <Pager page={page} pages={pages} onPage={setPage} />
    </>
  );
}

function DeckList({ meta, maxDeck }: { meta: Meta; maxDeck: number }) {
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [meta]);
  const pages = Math.ceil(meta.top_decks.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 2 }}>전체 대전 중 이 덱(파티)을 만난 비율</div>
      {meta.top_decks.slice(start, start + PAGE_SIZE).map((d, idx) => {
        const i = start + idx;
        const pct = Math.round((d.count / meta.total) * 100);
        const names = d.deck.map((id) => MON[id]?.ko || id).join(" · ");
        return (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "7px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.74rem", fontWeight: 800, color: i < 3 ? "#a855f7" : "#94a3b8", minWidth: 22 }}>#{i + 1}</span>
              <div style={{ display: "flex", gap: 2 }}>{d.deck.map((id) => <Sprite key={id} id={id} size={32} />)}</div>
              <span style={{ marginLeft: "auto", fontSize: "1rem", fontWeight: 800, color: "#a855f7" }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: "#e5eaf3", borderRadius: 3, margin: "6px 0 4px", overflow: "hidden" }}>
              <div style={{ width: `${Math.round((d.count / maxDeck) * 100)}%`, height: "100%", background: "linear-gradient(90deg,#7c3aed,#a855f7)" }} />
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1.4 }}>{names}</div>
          </div>
        );
      })}
    </div>
    <Pager page={page} pages={pages} onPage={setPage} />
    </>
  );
}

export default function GblMeta() {
  const [league, setLeague] = useState<string>("master");
  const [formats, setFormats] = useState<Format[]>(() => currentFormats("2000-01-01"));
  const [periodKey, setPeriodKey] = useState("30");
  const [view, setView] = useState<"mon" | "deck">("mon");
  const [wide, setWide] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setFormats(currentFormats(todayISO())); }, []);
  useEffect(() => {
    const check = () => setWide(window.innerWidth >= 880);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
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
    border: `1px solid ${on ? (cup ? "#7c3aed" : "#4f8cff") : BORDER}`,
    background: on ? (cup ? "rgba(124,58,237,.18)" : "rgba(79,140,255,.16)") : CARD,
    color: on ? (cup ? "#7c3aed" : "#3b5bdb") : "#64748b",
  });
  const h2: React.CSSProperties = { fontSize: "1rem", fontWeight: 800, margin: "0 0 10px", color: "#0f172a" };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
      padding: "1.4rem 1rem 4rem",
    }}>
      <div style={{ maxWidth: wide ? 1040 : 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center" }}>
          <Link href="/gbl" style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href="/gbl/raid" style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>🔥 레이드 딜러</Link>
          <Link href="/gbl/app" style={{ marginLeft: 12, fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>📝 내 기록 →</Link>
        </div>
        <h1 style={{ margin: "0.2rem 0 0.2rem", fontSize: "1.4rem", fontWeight: 900, color: "#0f172a" }}>실측 GBL 메타</h1>
        <p style={{ margin: "0 0 1rem", fontSize: "0.84rem", color: "#64748b", lineHeight: 1.6 }}>
          시뮬레이션이 아닌, 유저들이 <b style={{ color: "#334155" }}>실제로 만난 상대</b> 데이터 집계. 지금 리그에서 뭘 제일 많이 만나는지.
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
        ) : wide ? (
          /* 데스크톱: 나란히 대시보드 */
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "start" }}>
            <div>
              <h2 style={h2}>🔥 포켓몬 픽업률 TOP</h2>
              <MonList meta={meta} maxMon={maxMon} />
            </div>
            <div>
              <h2 style={h2}>🏆 덱 픽업률 TOP</h2>
              <DeckList meta={meta} maxDeck={maxDeck} />
            </div>
          </div>
        ) : (
          /* 모바일: 탭 */
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {([["mon", "🔥 포켓몬 픽업률"], ["deck", "🏆 덱 픽업률"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => setView(k)}
                  style={{ flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.86rem",
                    border: `1px solid ${view === k ? "#4f8cff" : BORDER}`,
                    background: view === k ? "rgba(79,140,255,.16)" : CARD, color: view === k ? "#3b5bdb" : "#64748b" }}>{label}</button>
              ))}
            </div>
            {view === "mon" ? <MonList meta={meta} maxMon={maxMon} /> : <DeckList meta={meta} maxDeck={maxDeck} />}
          </>
        )}

        {meta && meta.total > 0 && <><AdSlot /><CoupangAd /></>}

        {/* 크롤 가능한 리그별 상세 링크(서버렌더 SEO 페이지로 연결) */}
        <div style={{ marginTop: 26, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.9rem 1rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>리그별 상세 페이지</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[["master", "마스터"], ["great", "슈퍼"], ["ultra", "하이퍼"]].map(([k, lb]) => (
              <span key={k} style={{ display: "flex", gap: 6 }}>
                <Link href={`/gbl/meta/${k}`} style={{ fontSize: "0.78rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 600 }}>{lb}리그 실측</Link>
                <span style={{ color: "#cbd5e1" }}>·</span>
                <Link href={`/gbl/tier/${k}`} style={{ fontSize: "0.78rem", color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>티어표</Link>
              </span>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: "0.76rem" }}>
            <Link href="/gbl/guide" style={{ color: "#64748b", textDecoration: "none" }}>📖 GBL 가이드</Link>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href="/gbl/about" style={{ color: "#64748b", textDecoration: "none" }}>소개</Link> ·{" "}
          <Link href="/gbl/contact" style={{ color: "#64748b", textDecoration: "none" }}>문의</Link> ·{" "}
          <Link href="/gbl/privacy" style={{ color: "#64748b", textDecoration: "none" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
