"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, logout, getUser } from "../../../lib/api";
import DATA from "../gbl_data.json";
import AdSlot from "../AdSlot";
import CoupangAd from "../CoupangAd";
import { currentFormats, FORMAT_BY_KEY, filterPool, todayISO, type Format } from "../formats";

// ── 데이터셋 타입 ──────────────────────────────────────────────────────
type Move = { ko: string; en: string; type: string; kind: string };
type Mon = { id: string; dex: number; ko: string; en: string; types: string[]; shadow: boolean; fast: string[]; charged: string[]; sprite?: string };
type League = "great" | "ultra" | "master";
type Dataset = { top_n: number; moves: Record<string, Move>; leagues: Record<League, { count: number; pokemon: Mon[] }> };
const DS = DATA as unknown as Dataset;
const MOVES = DS.moves;
const LEAGUE_KEY = "gbl_league";
// 모든 리그 union → 렌더용 조회맵 (기록은 어느 리그든 speciesId로 조회)
const MON_BY_ID: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON_BY_ID[m.id] = m;

const sprite = (dex: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900",
  grass: "#3fa129", ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb",
  ground: "#915121", flying: "#6c93e0", psychic: "#ef4179", bug: "#91a119",
  rock: "#96843d", ghost: "#704170", dragon: "#5060e1", dark: "#4b4243",
  steel: "#5a8a9c", fairy: "#d76ad7",
};

// ── 기록 타입 ──────────────────────────────────────────────────────────
type TeamMon = { speciesId: string | null; manual?: string | null; fast?: string | null; charged: string[]; note?: string | null };
type Match = {
  id: string; league: string; opponent_name: string;
  team_json: TeamMon[]; memo: string | null; result: string | null;
  played_at: string; created_at: string;
  user_email?: string | null; user_display_name?: string | null;  // 전체검색(admin) 시 작성자
};

const emptyTeam = (): TeamMon[] => [
  { speciesId: null, charged: [] },
  { speciesId: null, charged: [] },
  { speciesId: null, charged: [] },
];

// ── 공용 소품 ──────────────────────────────────────────────────────────
function MoveChip({ id }: { id: string }) {
  const mv = MOVES[id];
  if (!mv) return <span style={{ fontSize: "0.68rem", color: "#7c8bb5" }}>{id}</span>;
  const c = TYPE_COLOR[mv.type] || "#8ea0c4";
  return (
    <span style={{
      fontSize: "0.68rem", fontWeight: 600, padding: "1px 7px", borderRadius: 10,
      background: c + "22", color: c, border: `1px solid ${c}55`, whiteSpace: "nowrap",
    }}>{mv.ko}</span>
  );
}

function MonSprite({ mon, size = 44 }: { mon: Mon; size?: number }) {
  return (
    <img src={mon.sprite || sprite(mon.dex)} alt="" width={size} height={size}
      loading="lazy"
      style={{ imageRendering: "pixelated", flexShrink: 0 }}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
  );
}

// ── 포켓몬 선택기 (배틀 후 기록용) ──────────────────────────────────────
function PokemonPicker({ value, manual, pool, onPick, onManual }: {
  value: string | null; manual?: string | null; pool: Mon[];
  onPick: (id: string | null) => void; onManual: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return pool.slice(0, 40);
    return pool.filter((m) => m.ko.toLowerCase().includes(s) || m.en.toLowerCase().includes(s)).slice(0, 40);
  }, [q, pool]);

  const selected = value ? MON_BY_ID[value] : null;

  if (manualMode || (manual && !value)) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input autoFocus value={manual || ""} placeholder="직접 입력 (목록에 없는 개체)"
          onChange={(e) => onManual(e.target.value)}
          style={{ flex: 1, padding: "8px 10px", border: "1px solid #2a3550", borderRadius: 8, fontSize: "0.9rem" }} />
        <button onClick={() => { setManualMode(false); onManual(""); }}
          style={{ fontSize: "0.75rem", color: "#8ea0c4", background: "none", border: "1px solid #2a3550", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>목록</button>
      </div>
    );
  }

  if (selected) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <MonSprite mon={selected} size={40} />
        <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
          {selected.shadow && <span style={{ color: "#7c3aed" }}>그림자 </span>}{selected.ko}
        </span>
        <div style={{ display: "flex", gap: 3 }}>
          {selected.types.map((t) => (
            <span key={t} style={{ width: 10, height: 10, borderRadius: 3, background: TYPE_COLOR[t] || "#ccc" }} />
          ))}
        </div>
        <button onClick={() => onPick(null)}
          style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>변경</button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input value={q} placeholder="포켓몬 검색 (한글)"
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #2a3550", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }} />
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, marginTop: 4,
          maxHeight: 260, overflowY: "auto", background: "rgba(255,255,255,.03)", border: "1px solid #2a3550",
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
        }}>
          {results.map((m) => (
            <button key={m.id} onClick={() => { onPick(m.id); setOpen(false); setQ(""); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px",
                background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,.07)", cursor: "pointer", textAlign: "left" }}>
              <MonSprite mon={m} size={32} />
              <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                {m.shadow && <span style={{ color: "#7c3aed" }}>그림자 </span>}{m.ko}
              </span>
              <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
                {m.types.map((t) => (<span key={t} style={{ width: 9, height: 9, borderRadius: 2, background: TYPE_COLOR[t] || "#ccc" }} />))}
              </div>
            </button>
          ))}
          <button onClick={() => { setManualMode(true); setOpen(false); }}
            style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,.03)", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "#8ea0c4" }}>
            + 목록에 없어요 (직접 입력)
          </button>
        </div>
      )}
    </div>
  );
}

// ── 기록 슬롯 (개체 + 기술 + 메모) ──────────────────────────────────────
function TeamSlot({ idx, mon, pool, onChange }: { idx: number; mon: TeamMon; pool: Mon[]; onChange: (m: TeamMon) => void }) {
  const species = mon.speciesId ? MON_BY_ID[mon.speciesId] : null;
  const toggleCharged = (id: string) => {
    const has = mon.charged.includes(id);
    let next = has ? mon.charged.filter((x) => x !== id) : [...mon.charged, id];
    if (next.length > 2) next = next.slice(-2); // 최대 2개
    onChange({ ...mon, charged: next });
  };
  return (
    <div style={{ border: "1px solid #1e2b4a", borderRadius: 12, padding: "0.8rem", background: "rgba(255,255,255,.03)" }}>
      <div style={{ fontSize: "0.72rem", color: "#7c8bb5", fontWeight: 700, marginBottom: 6 }}>{idx + 1}번</div>
      <PokemonPicker value={mon.speciesId} manual={mon.manual} pool={pool}
        onPick={(id) => onChange({ speciesId: id, manual: null, fast: null, charged: [], note: mon.note })}
        onManual={(name) => onChange({ ...mon, speciesId: null, manual: name })} />

      {species && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#8ea0c4", marginBottom: 3 }}>빠른 기술</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {species.fast.map((id) => {
                const on = mon.fast === id;
                const mv = MOVES[id]; const c = TYPE_COLOR[mv?.type] || "#8ea0c4";
                return (
                  <button key={id} onClick={() => onChange({ ...mon, fast: on ? null : id })}
                    style={{ fontSize: "0.75rem", fontWeight: 600, padding: "4px 9px", borderRadius: 8, cursor: "pointer",
                      background: on ? c : "rgba(255,255,255,.07)", color: on ? "#fff" : "#8ea0c4", border: `1px solid ${on ? c : "#2a3550"}` }}>
                    {mv?.ko || id}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#8ea0c4", marginBottom: 3 }}>차지 기술 (최대 2)</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {species.charged.map((id) => {
                const on = mon.charged.includes(id);
                const mv = MOVES[id]; const c = TYPE_COLOR[mv?.type] || "#8ea0c4";
                return (
                  <button key={id} onClick={() => toggleCharged(id)}
                    style={{ fontSize: "0.75rem", fontWeight: 600, padding: "4px 9px", borderRadius: 8, cursor: "pointer",
                      background: on ? c : "rgba(255,255,255,.07)", color: on ? "#fff" : "#8ea0c4", border: `1px solid ${on ? c : "#2a3550"}` }}>
                    {mv?.ko || id}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {(species || mon.manual) && (
        <input value={mon.note || ""} placeholder="개체 메모 (예: 3타에 지진, 실드 씀)"
          onChange={(e) => onChange({ ...mon, note: e.target.value })}
          style={{ marginTop: 8, width: "100%", padding: "7px 10px", border: "1px solid #2a3550", borderRadius: 8, fontSize: "0.85rem", boxSizing: "border-box" }} />
      )}
    </div>
  );
}

// ── 조회 카드 ──────────────────────────────────────────────────────────
function MatchCard({ m, onEdit, onDelete, readOnly }: {
  m: Match; onEdit?: (m: Match) => void; onDelete: (id: string) => void; readOnly?: boolean;
}) {
  const d = new Date(m.played_at);
  const dstr = d.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const resBadge = m.result === "win"
    ? { t: "승", c: "#4ade80", bg: "rgba(34,197,94,.14)" }
    : m.result === "loss" ? { t: "패", c: "#f87171", bg: "rgba(239,68,68,.14)" } : null;
  return (
    <div style={{ border: "1px solid #1e2b4a", borderRadius: 12, padding: "0.75rem 0.9rem", background: "rgba(255,255,255,.03)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: "0.72rem", color: "#7c8bb5" }}>{dstr}</span>
        {resBadge && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "1px 8px", borderRadius: 8, color: resBadge.c, background: resBadge.bg }}>{resBadge.t}</span>}
        {m.user_display_name && (
          <span style={{ fontSize: "0.66rem", color: "#7c3aed", background: "rgba(124,58,237,.15)", padding: "1px 7px", borderRadius: 8 }}>🧑 {m.user_display_name}</span>
        )}
        {!readOnly && (
          <span style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            {onEdit && <button onClick={() => onEdit(m)} style={{ fontSize: "0.72rem", color: "#3b5bdb", background: "none", border: "none", cursor: "pointer" }}>수정</button>}
            <button onClick={() => onDelete(m.id)} style={{ fontSize: "0.72rem", color: "#5f6f92", background: "none", border: "none", cursor: "pointer" }}>삭제</button>
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
        {m.team_json.map((tm, i) => {
          const sp = tm.speciesId ? MON_BY_ID[tm.speciesId] : null;
          return (
            <div key={i} style={{ background: "rgba(255,255,255,.03)", borderRadius: 10, padding: "6px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {sp ? <MonSprite mon={sp} size={34} /> : <span style={{ width: 34, textAlign: "center" }}>❔</span>}
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                  {sp ? (<>{sp.shadow && <span style={{ color: "#7c3aed" }}>그림자 </span>}{sp.ko}</>) : (tm.manual || "?")}
                </span>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                {tm.fast && <MoveChip id={tm.fast} />}
                {tm.charged.map((cid) => <MoveChip key={cid} id={cid} />)}
              </div>
              {tm.note && <div style={{ fontSize: "0.72rem", color: "#8ea0c4", marginTop: 4 }}>{tm.note}</div>}
            </div>
          );
        })}
      </div>
      {m.memo && <div style={{ marginTop: 8, fontSize: "0.8rem", color: "#e2e8f0", background: "rgba(255,214,120,.09)", borderRadius: 8, padding: "6px 10px", lineHeight: 1.5 }}>📝 {m.memo}</div>}
    </div>
  );
}

// ── 페이지 ──────────────────────────────────────────────────────────────
export default function GblPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"lookup" | "log" | "stats">("lookup");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [league, setLeague] = useState<string>("master");
  const [formats, setFormats] = useState<Format[]>(currentFormats("2000-01-01"));  // SSR: 코어만
  const [scope, setScope] = useState<"mine" | "all">("mine");   // super_admin 전체검색
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sort, setSort] = useState<"recent" | "name">("recent");  // 조회 정렬
  const [deckFilter, setDeckFilter] = useState<"all" | "won" | "lost">("all");
  const [expandedDeck, setExpandedDeck] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsOwner(getUser()?.role === "super_admin");
    setFormats(currentFormats(todayISO()));
    const v = typeof window !== "undefined" ? localStorage.getItem(LEAGUE_KEY) : null;
    if (v && FORMAT_BY_KEY[v]) setLeague(v);
    const s = typeof window !== "undefined" ? localStorage.getItem("gbl_sort") : null;
    if (s === "name" || s === "recent") setSort(s);
  }, []);
  const changeSort = (s: "recent" | "name") => { setSort(s); try { localStorage.setItem("gbl_sort", s); } catch { /* noop */ } };
  const changeLeague = (l: string) => { setLeague(l); try { localStorage.setItem(LEAGUE_KEY, l); } catch { /* noop */ } };
  const fmt = FORMAT_BY_KEY[league];
  const pickerMons = filterPool(DS.leagues[(fmt?.base ?? "master") as League].pokemon, fmt);

  // 기록 폼
  const [oppName, setOppName] = useState("");
  const [team, setTeam] = useState<TeamMon[]>(emptyTeam());
  const [memo, setMemo] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Match[]>("/api/gbl/matches", {}, 15000);
      setMatches(Array.isArray(data) ? data : []);
    } catch (e) {
      flash(e instanceof Error ? e.message : "불러오기 실패");
    } finally { setLoading(false); }
  };
  const loadAll = async () => {
    try {
      const data = await apiFetch<Match[]>("/api/gbl/admin/matches", {}, 20000);
      setAllMatches(Array.isArray(data) ? data : []);
    } catch (e) { flash(e instanceof Error ? e.message : "전체 기록 로드 실패"); }
  };
  const changeScope = (s: "mine" | "all") => {
    setScope(s);
    if (s === "all" && allMatches.length === 0) loadAll();
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === "lookup") searchRef.current?.focus(); }, [tab]);

  // 조회: 이름으로 그룹핑 (최근순 유지). scope=all이면 전체 유저 기록.
  const groups = useMemo(() => {
    const src = scope === "all" ? allMatches : matches;
    const q = query.trim().toLowerCase();
    const filtered = src.filter((m) =>
      (m.league || "master") === league &&
      (!q || m.opponent_name.toLowerCase().includes(q)));
    const map = new Map<string, Match[]>();
    for (const m of filtered) {
      const k = m.opponent_name;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    const entries = [...map.entries()];
    if (sort === "name") {
      entries.sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));
    } else {
      // 배틀순: 그룹 내 최신 대전 시각 내림차순
      const latest = (ms: Match[]) => Math.max(...ms.map((m) => new Date(m.played_at).getTime()));
      entries.sort((a, b) => latest(b[1]) - latest(a[1]));
    }
    return entries;
  }, [matches, allMatches, scope, query, league, sort]);

  const leagueCount = useMemo(
    () => (scope === "all" ? allMatches : matches).filter((m) => (m.league || "master") === league).length,
    [matches, allMatches, scope, league]);

  // 전적: 내 기록(선택 리그) 기준 승률 + 상대 덱별 전적
  type DeckMon = { sp?: Mon; manual?: string };
  type Deck = { key: string; mons: DeckMon[]; wins: number; losses: number; draws: number; matches: Match[] };
  const stats = useMemo(() => {
    const src = matches.filter((m) => (m.league || "master") === league);
    let wins = 0, losses = 0, draws = 0;
    const deckMap = new Map<string, Deck>();
    for (const m of src) {
      if (m.result === "win") wins++; else if (m.result === "loss") losses++; else draws++;
      const parts = (m.team_json || [])
        .map((t) => t.speciesId ? t.speciesId : (t.manual ? "m:" + t.manual : ""))
        .filter(Boolean);
      const key = parts.slice().sort().join("|") || "(미입력)";
      if (!deckMap.has(key)) {
        const mons: DeckMon[] = (m.team_json || []).map((t) =>
          t.speciesId ? { sp: MON_BY_ID[t.speciesId] } : { manual: t.manual || "?" });
        deckMap.set(key, { key, mons, wins: 0, losses: 0, draws: 0, matches: [] });
      }
      const d = deckMap.get(key)!;
      if (m.result === "win") d.wins++; else if (m.result === "loss") d.losses++; else d.draws++;
      d.matches.push(m);
    }
    const decks = [...deckMap.values()].sort((a, b) => b.matches.length - a.matches.length);
    return { total: src.length, wins, losses, draws, decks };
  }, [matches, league]);

  const winRate = (w: number, l: number) => (w + l > 0 ? Math.round((w / (w + l)) * 100) : null);
  const rateColor = (r: number | null) => r == null ? "#7c8bb5" : r >= 60 ? "#4ade80" : r >= 45 ? "#c2410c" : "#f87171";

  const resetForm = () => { setOppName(""); setTeam(emptyTeam()); setMemo(""); setResult(null); setEditingId(null); };

  const startEdit = (m: Match) => {
    setEditingId(m.id);
    setOppName(m.opponent_name);
    const t: TeamMon[] = (m.team_json || []).map((x) => ({
      speciesId: x.speciesId ?? null, manual: x.manual ?? null,
      fast: x.fast ?? null, charged: x.charged || [], note: x.note ?? null,
    }));
    while (t.length < 3) t.push({ speciesId: null, charged: [] });
    setTeam(t.slice(0, 3));
    setMemo(m.memo || "");
    setResult(m.result);
    if (m.league && DS.leagues[m.league as League]) changeLeague(m.league as League);
    setTab("log");
  };

  const save = async () => {
    if (!oppName.trim()) { flash("상대 이름을 입력하세요."); return; }
    setSaving(true);
    try {
      const body = {
        opponent_name: oppName.trim(), memo: memo || null, result,
        team: team.filter((t) => t.speciesId || t.manual),
      };
      if (editingId) {
        const updated = await apiFetch<Match>(`/api/gbl/matches/${editingId}`, { method: "PATCH", body: JSON.stringify(body) }, 15000);
        setMatches((prev) => prev.map((m) => m.id === editingId ? updated : m));
        flash("✅ 수정됨");
      } else {
        const created = await apiFetch<Match>("/api/gbl/matches", { method: "POST", body: JSON.stringify({ ...body, league }) }, 15000);
        setMatches((prev) => [created, ...prev]);
        flash("✅ 기록 저장됨");
      }
      setQuery(oppName.trim());
      resetForm();
      setScope("mine");
      setTab("lookup");
    } catch (e) {
      flash(e instanceof Error ? e.message : "저장 실패");
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== id));
    try { await apiFetch(`/api/gbl/matches/${id}`, { method: "DELETE" }, 10000); } catch { load(); }
  };

  return (
    <div className="gbl-app" style={{ minHeight: "100dvh", padding: "1rem 0.9rem 4rem",
      background: "radial-gradient(1000px 500px at 50% -10%, #1a2a5c 0%, transparent 60%), linear-gradient(180deg,#070b18,#0b1226)" }}>
      <style>{`.gbl-app input,.gbl-app textarea{background:#0f1628;color:#e2e8f0}.gbl-app ::placeholder{color:#5f6f92}`}</style>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {toast && (
        <div style={{ position: "fixed", top: 14, right: 14, zIndex: 9999, background: "#0f172a", color: "#fff",
          padding: "9px 16px", borderRadius: 8, fontSize: "0.83rem" }}>{toast}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Link href="/gbl" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <span style={{ fontSize: "1.3rem" }}>📓</span>
          <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#fff" }}>GBL Note</h1>
        </Link>
        <span style={{ fontSize: "0.72rem", color: "#7c8bb5" }}>{leagueCount}판</span>
        <Link href="/gbl/meta"
          style={{ marginLeft: "auto", fontSize: "0.74rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>
          🌐 전체 메타
        </Link>
        <button onClick={logout}
          style={{ fontSize: "0.72rem", color: "#7c8bb5", background: "none",
            border: "1px solid #2a3550", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
          로그아웃
        </button>
      </div>

      {/* 리그/컵 스위처 (코어 3리그 + 오늘 진행 중인 컵) */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {formats.map((f) => {
          const on = league === f.key;
          return (
            <button key={f.key} onClick={() => changeLeague(f.key)} title={f.note || ""}
              style={{ flex: "1 1 70px", minWidth: 70, padding: "8px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem",
                border: on ? `1.5px solid ${f.cup ? "#7c3aed" : "#3b5bdb"}` : "1px solid #2a3550",
                background: on ? (f.cup ? "rgba(124,58,237,.15)" : "rgba(79,140,255,.16)") : "rgba(255,255,255,.05)", color: on ? (f.cup ? "#7c3aed" : "#3b5bdb") : "#8ea0c4" }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {([["lookup", "🔍 조회"], ["log", "✏️ 기록"], ["stats", "📊 전적"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: "0.88rem",
              border: tab === k ? "1.5px solid #4f8cff" : "1px solid #2a3550",
              background: tab === k ? "#3b5bdb" : "rgba(255,255,255,.05)", color: tab === k ? "#fff" : "#334155" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── 조회 ── */}
      {tab === "lookup" && (
        <div>
          {isOwner && (
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {([["mine", "내 기록"], ["all", "🌐 전체 유저"]] as const).map(([k, label]) => {
                const on = scope === k;
                return (
                  <button key={k} onClick={() => changeScope(k)}
                    style={{ flex: 1, padding: "7px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: "0.8rem",
                      border: on ? "1.5px solid #7c3aed" : "1px solid #2a3550",
                      background: on ? "rgba(124,58,237,.22)" : "rgba(255,255,255,.05)", color: on ? "#7c3aed" : "#8ea0c4" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="상대 트레이너 이름 몇 글자…"
            autoComplete="off" autoCapitalize="off" spellCheck={false}
            style={{ width: "100%", padding: "13px 16px", border: "2px solid #4f8cff", borderRadius: 12,
              fontSize: "1.05rem", fontWeight: 600, boxSizing: "border-box", marginBottom: 10, outline: "none" }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 12 }}>
            {([["recent", "🕒 배틀순"], ["name", "🔤 이름순"]] as const).map(([k, label]) => {
              const on = sort === k;
              return (
                <button key={k} onClick={() => changeSort(k)}
                  style={{ padding: "4px 12px", borderRadius: 14, cursor: "pointer", fontSize: "0.74rem", fontWeight: 600,
                    border: on ? "1px solid #4f8cff" : "1px solid #2a3550",
                    background: on ? "#3b5bdb" : "rgba(255,255,255,.05)", color: on ? "#fff" : "#8ea0c4" }}>{label}</button>
              );
            })}
          </div>
          {loading ? (
            <div style={{ textAlign: "center", color: "#7c8bb5", padding: "3rem" }}>불러오는 중…</div>
          ) : groups.length === 0 ? (
            <div style={{ textAlign: "center", color: "#7c8bb5", padding: "2.5rem", fontSize: "0.9rem" }}>
              {query ? "일치하는 상대 기록이 없습니다." : "아직 기록이 없습니다. '배틀 후 기록'으로 첫 상대를 남겨보세요."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {groups.map(([name, ms]) => {
                const w = ms.filter((x) => x.result === "win").length;
                const l = ms.filter((x) => x.result === "loss").length;
                return (
                  <div key={name}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                      <span style={{ fontWeight: 800, fontSize: "1rem" }}>{name}</span>
                      <span style={{ fontSize: "0.74rem", color: "#8ea0c4" }}>{ms.length}판</span>
                      {(w > 0 || l > 0) && (
                        <span style={{ fontSize: "0.74rem", color: "#8ea0c4" }}>
                          <b style={{ color: "#4ade80" }}>{w}승</b> <b style={{ color: "#f87171" }}>{l}패</b>
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {ms.map((m) => (
                        <MatchCard key={m.id} m={m} onDelete={del}
                          onEdit={scope === "all" ? undefined : startEdit}
                          readOnly={scope === "all"} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 배틀 후 기록 / 수정 ── */}
      {tab === "log" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {editingId && (
            <div style={{ fontSize: "0.8rem", color: "#3b5bdb", background: "rgba(79,140,255,.16)", borderRadius: 8, padding: "8px 12px", fontWeight: 600 }}>
              ✏️ 기록 수정 중 — 잘못 입력한 내용을 고치고 &quot;수정 저장&quot;을 누르세요.
            </div>
          )}
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#e2e8f0" }}>상대 트레이너 이름</label>
            <input value={oppName} onChange={(e) => setOppName(e.target.value)} placeholder="예: PikaMaster99"
              autoComplete="off" autoCapitalize="off" spellCheck={false}
              style={{ width: "100%", marginTop: 5, padding: "11px 14px", border: "1px solid #2a3550", borderRadius: 10, fontSize: "1rem", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {([["win", "승"], ["loss", "패"], [null, "미정"]] as const).map(([v, label]) => (
              <button key={String(v)} onClick={() => setResult(v)}
                style={{ flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: "0.88rem",
                  border: result === v ? "1.5px solid #4f8cff" : "1px solid #2a3550",
                  background: result === v ? "#3b5bdb" : "rgba(255,255,255,.05)", color: result === v ? "#fff" : "#8ea0c4" }}>{label}</button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {team.map((tm, i) => (
              <TeamSlot key={i} idx={i} mon={tm} pool={pickerMons}
                onChange={(nm) => setTeam((prev) => prev.map((x, j) => (j === i ? nm : x)))} />
            ))}
          </div>

          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#e2e8f0" }}>전체 메모 (턴/실드 등)</label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 리드 메타그로스, 2실드 쓰고 지진 유도. 백에 김렉이/토게키스."
              style={{ width: "100%", marginTop: 5, minHeight: 70, padding: "10px 14px", border: "1px solid #2a3550", borderRadius: 10, fontSize: "0.9rem", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5 }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { resetForm(); if (editingId) setTab("lookup"); }}
              style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #2a3550", background: "rgba(255,255,255,.03)", color: "#8ea0c4", cursor: "pointer", fontWeight: 600 }}>
              {editingId ? "취소" : "초기화"}
            </button>
            <button onClick={save} disabled={saving}
              style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: editingId ? "#3b5bdb" : "#1A6F3C", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: "0.95rem" }}>
              {saving ? "저장 중…" : editingId ? "수정 저장" : "기록 저장"}
            </button>
          </div>
        </div>
      )}

      {/* ── 전적 ── */}
      {tab === "stats" && (
        <div>
          {/* 승률 카드 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,.03)", border: "1px solid #1e2b4a", borderRadius: 12, padding: "0.9rem 0.4rem" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#e2e8f0" }}>{stats.total}</div>
              <div style={{ fontSize: "0.72rem", color: "#8ea0c4" }}>총 판수</div>
            </div>
            <div style={{ flex: 1.3, textAlign: "center", background: "rgba(255,255,255,.03)", border: "1px solid #1e2b4a", borderRadius: 12, padding: "0.9rem 0.4rem" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                <span style={{ color: "#4ade80" }}>{stats.wins}승</span>{" "}
                <span style={{ color: "#f87171" }}>{stats.losses}패</span>
                {stats.draws > 0 && <span style={{ color: "#7c8bb5" }}> {stats.draws}무</span>}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#8ea0c4" }}>전적</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,.03)", border: "1px solid #1e2b4a", borderRadius: 12, padding: "0.9rem 0.4rem" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: rateColor(winRate(stats.wins, stats.losses)) }}>
                {winRate(stats.wins, stats.losses) ?? "-"}%
              </div>
              <div style={{ fontSize: "0.72rem", color: "#8ea0c4" }}>승률</div>
            </div>
          </div>

          {/* 덱 필터 */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {([["all", "전체 덱"], ["won", "🟢 이긴 덱"], ["lost", "🔴 진 덱"]] as const).map(([k, label]) => {
              const on = deckFilter === k;
              return (
                <button key={k} onClick={() => setDeckFilter(k)}
                  style={{ flex: 1, padding: "7px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.78rem",
                    border: on ? "1.5px solid #4f8cff" : "1px solid #2a3550",
                    background: on ? "#3b5bdb" : "rgba(255,255,255,.05)", color: on ? "#fff" : "#8ea0c4" }}>{label}</button>
              );
            })}
          </div>

          {(() => {
            const decks = stats.decks.filter((d) =>
              deckFilter === "all" ? true : deckFilter === "won" ? d.wins > d.losses : d.losses > d.wins);
            if (decks.length === 0) {
              return <div style={{ textAlign: "center", color: "#7c8bb5", padding: "2.5rem", fontSize: "0.9rem" }}>
                {stats.total === 0 ? "아직 기록이 없습니다." : "해당하는 덱이 없습니다."}
              </div>;
            }
            return (
              <div>
                <div style={{ fontSize: "0.72rem", color: "#7c8bb5", marginBottom: 8 }}>
                  많이 만난 순 · {decks.length}종 덱
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {decks.map((d, idx) => {
                  const r = winRate(d.wins, d.losses);
                  const open = expandedDeck === d.key;
                  return (
                    <div key={d.key} style={{ border: "1px solid #1e2b4a", borderRadius: 12, background: "rgba(255,255,255,.03)", overflow: "hidden" }}>
                      <button onClick={() => setExpandedDeck(open ? null : d.key)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "0.6rem 0.8rem", background: "none", border: "none", cursor: "pointer" }}>
                        <span style={{ fontSize: "0.74rem", fontWeight: 800, color: idx < 3 ? "#7c3aed" : "#7c8bb5", minWidth: 22, textAlign: "center" }}>#{idx + 1}</span>
                        <div style={{ display: "flex", gap: 2 }}>
                          {d.mons.map((mm, i) => mm.sp
                            ? <MonSprite key={i} mon={mm.sp} size={34} />
                            : <span key={i} style={{ fontSize: "0.7rem", color: "#7c8bb5", alignSelf: "center", padding: "0 4px" }}>{mm.manual}</span>)}
                        </div>
                        <div style={{ marginLeft: "auto", textAlign: "right" }}>
                          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#e2e8f0" }}>{d.matches.length}회</div>
                          <div style={{ fontSize: "0.72rem", fontWeight: 600 }}>
                            <span style={{ color: "#4ade80" }}>{d.wins}승</span> <span style={{ color: "#f87171" }}>{d.losses}패</span>
                            {d.draws > 0 && <span style={{ color: "#7c8bb5" }}> {d.draws}무</span>}
                            <span style={{ color: "#5f6f92" }}> · </span>
                            <span style={{ color: rateColor(r) }}>{r ?? "-"}%</span>
                          </div>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "#5f6f92" }}>{open ? "▲" : "▼"}</span>
                      </button>
                      <div style={{ fontSize: "0.7rem", color: "#8ea0c4", padding: "0 0.8rem 0.55rem 2.4rem", lineHeight: 1.4 }}>
                        {d.mons.map((mm) => mm.sp?.ko || mm.manual || "?").join(" · ")}
                      </div>
                      {open && (
                        <div style={{ padding: "0 0.7rem 0.7rem", display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontSize: "0.72rem", color: "#7c8bb5" }}>복기 — {d.matches.length}판</div>
                          {d.matches.map((m) => <MatchCard key={m.id} m={m} onEdit={startEdit} onDelete={del} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 하단 광고 (AdSense·쿠팡 — env 설정 시에만 노출) */}
      <AdSlot />
      <CoupangAd />
      </div>
    </div>
  );
}
