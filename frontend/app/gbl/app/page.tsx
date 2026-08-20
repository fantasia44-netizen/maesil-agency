"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch, logout, getUser, updateNickname } from "../../../lib/api";
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
// 현재 시즌(전적 카드/시즌 필터용). 새 시즌 시작 시 갱신.
const SEASON = { num: 27, start: "2026-06-02", end: "2026-09-09" };
const PERIOD_LABEL: Record<string, string> = { today: "오늘", "7": "최근 7일", "30": "최근 30일", season: `시즌${SEASON.num}`, all: "전체" };
// 모든 리그 union → 렌더용 조회맵 (기록은 어느 리그든 speciesId로 조회)
const MON_BY_ID: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON_BY_ID[m.id] = m;

const sprite = (dex: number) =>
  `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${dex}.png`;

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
  if (!mv) return <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{id}</span>;
  const c = TYPE_COLOR[mv.type] || "#64748b";
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
          style={{ flex: 1, padding: "8px 10px", border: "1px solid #dbe2ee", borderRadius: 8, fontSize: "0.9rem" }} />
        <button onClick={() => { setManualMode(false); onManual(""); }}
          style={{ fontSize: "0.75rem", color: "#64748b", background: "none", border: "1px solid #dbe2ee", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>목록</button>
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
        style={{ width: "100%", padding: "8px 10px", border: "1px solid #dbe2ee", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }} />
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, marginTop: 4,
          maxHeight: 260, overflowY: "auto", background: "#ffffff", border: "1px solid #dbe2ee",
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)",
        }}>
          {results.map((m) => (
            <button key={m.id} onClick={() => { onPick(m.id); setOpen(false); setQ(""); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 10px",
                background: "none", border: "none", borderBottom: "1px solid #e5eaf3", cursor: "pointer", textAlign: "left" }}>
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
            style={{ width: "100%", padding: "8px 10px", background: "#ffffff", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "#64748b" }}>
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
    <div style={{ border: "1px solid #e3e8f2", borderRadius: 12, padding: "0.8rem", background: "#ffffff" }}>
      <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700, marginBottom: 6 }}>{idx + 1}번</div>
      <PokemonPicker value={mon.speciesId} manual={mon.manual} pool={pool}
        onPick={(id) => onChange({ speciesId: id, manual: null, fast: null, charged: [], note: mon.note })}
        onManual={(name) => onChange({ ...mon, speciesId: null, manual: name })} />

      {species && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 3 }}>빠른 기술</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {species.fast.map((id) => {
                const on = mon.fast === id;
                const mv = MOVES[id]; const c = TYPE_COLOR[mv?.type] || "#64748b";
                return (
                  <button key={id} onClick={() => onChange({ ...mon, fast: on ? null : id })}
                    style={{ fontSize: "0.75rem", fontWeight: 600, padding: "4px 9px", borderRadius: 8, cursor: "pointer",
                      background: on ? c : "#e5eaf3", color: on ? "#fff" : "#64748b", border: `1px solid ${on ? c : "#dbe2ee"}` }}>
                    {mv?.ko || id}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 3 }}>차지 기술 (최대 2)</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {species.charged.map((id) => {
                const on = mon.charged.includes(id);
                const mv = MOVES[id]; const c = TYPE_COLOR[mv?.type] || "#64748b";
                return (
                  <button key={id} onClick={() => toggleCharged(id)}
                    style={{ fontSize: "0.75rem", fontWeight: 600, padding: "4px 9px", borderRadius: 8, cursor: "pointer",
                      background: on ? c : "#e5eaf3", color: on ? "#fff" : "#64748b", border: `1px solid ${on ? c : "#dbe2ee"}` }}>
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
          style={{ marginTop: 8, width: "100%", padding: "7px 10px", border: "1px solid #dbe2ee", borderRadius: 8, fontSize: "0.85rem", boxSizing: "border-box" }} />
      )}
    </div>
  );
}

// ── 레이팅 추이 그래프 ──────────────────────────────────────────────────
type RatingEntry = { id: string; league: string; profile: string | null; rating: number; recorded_at: string };
function RatingGraph({ data }: { data: RatingEntry[] }) {
  const W = 600, H = 170, pad = 26;
  const vals = data.map((d) => d.rating);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const n = data.length;
  const x = (i: number) => pad + (n === 1 ? (W - 2 * pad) / 2 : (i / (n - 1)) * (W - 2 * pad));
  const y = (v: number) => pad + (1 - (v - min) / range) * (H - 2 * pad);
  const pts = data.map((d, i) => `${x(i)},${y(d.rating)}`).join(" ");
  const last = data[data.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: "#fff", border: "1px solid #e3e8f2", borderRadius: 10, display: "block" }}>
      <text x={4} y={y(max) + 4} fontSize="13" fill="#94a3b8">{max}</text>
      <text x={4} y={y(min) + 4} fontSize="13" fill="#94a3b8">{min}</text>
      <polyline points={pts} fill="none" stroke="#3b5bdb" strokeWidth="2.5" strokeLinejoin="round" />
      {data.map((d, i) => <circle key={d.id} cx={x(i)} cy={y(d.rating)} r={i === n - 1 ? 5 : 3} fill={i === n - 1 ? "#7c3aed" : "#3b5bdb"} />)}
      <text x={x(n - 1)} y={y(last.rating) - 10} fontSize="15" fontWeight="800" fill="#7c3aed" textAnchor="middle">{last.rating}</text>
    </svg>
  );
}

// ── 조회 카드 ──────────────────────────────────────────────────────────
function MatchCard({ m, onEdit, onDelete, readOnly }: {
  m: Match; onEdit?: (m: Match) => void; onDelete: (id: string) => void; readOnly?: boolean;
}) {
  const d = new Date(m.played_at);
  const dstr = d.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const resBadge = m.result === "win"
    ? { t: "승", c: "#16a34a", bg: "rgba(34,197,94,.14)" }
    : m.result === "loss" ? { t: "패", c: "#dc2626", bg: "rgba(239,68,68,.14)" } : null;
  return (
    <div style={{ border: "1px solid #e3e8f2", borderRadius: 12, padding: "0.75rem 0.9rem", background: "#ffffff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{dstr}</span>
        {resBadge && <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "1px 8px", borderRadius: 8, color: resBadge.c, background: resBadge.bg }}>{resBadge.t}</span>}
        {m.user_display_name && (
          <span style={{ fontSize: "0.66rem", color: "#7c3aed", background: "rgba(124,58,237,.15)", padding: "1px 7px", borderRadius: 8 }}>🧑 {m.user_display_name}</span>
        )}
        {!readOnly && (
          <span style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            {onEdit && <button onClick={() => onEdit(m)} style={{ fontSize: "0.72rem", color: "#3b5bdb", background: "none", border: "none", cursor: "pointer" }}>수정</button>}
            <button onClick={() => onDelete(m.id)} style={{ fontSize: "0.72rem", color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>삭제</button>
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
        {m.team_json.map((tm, i) => {
          const sp = tm.speciesId ? MON_BY_ID[tm.speciesId] : null;
          return (
            <div key={i} style={{ background: "#ffffff", borderRadius: 10, padding: "6px 8px" }}>
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
              {tm.note && <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4 }}>{tm.note}</div>}
            </div>
          );
        })}
      </div>
      {m.memo && <div style={{ marginTop: 8, fontSize: "0.8rem", color: "#0f172a", background: "#fff7e0", borderRadius: 8, padding: "6px 10px", lineHeight: 1.5 }}>📝 {m.memo}</div>}
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
  const [statsPeriod, setStatsPeriod] = useState<"today" | "7" | "30" | "season" | "all">("all");  // 전적 기간
  const [selectedDay, setSelectedDay] = useState<string | null>(null);        // 달력 선택 날짜
  const [calYM, setCalYM] = useState<{ y: number; m: number } | null>(null);  // 달력 표시 연·월(m:1-12)
  const [ratings, setRatings] = useState<RatingEntry[]>([]);                   // 레이팅 기록
  const [ratingProfile, setRatingProfile] = useState("기본");                  // 선택 계정(본계/부계)
  const [ratingInput, setRatingInput] = useState("");
  const [extraProfiles, setExtraProfiles] = useState<string[]>([]);            // 추가했지만 아직 기록 전 계정
  const [cardImage, setCardImage] = useState<string | null>(null);            // 전적 카드 미리보기(dataURL)
  const [cardFile, setCardFile] = useState<File | null>(null);                // 공유용 파일(미리 준비 → iOS 공유창 유지)
  const [nickname, setNickname] = useState<string>("");                        // 내 닉네임(display_name)
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsOwner(getUser()?.role === "super_admin");
    setNickname((getUser()?.display_name || "").trim());
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

  // 닉네임 수정(전적 카드·자랑에 표시됨)
  const editNickname = async () => {
    const next = window.prompt("닉네임 (전적 카드·자랑하기에 표시됩니다)", nickname);
    if (next == null) return;
    const v = next.trim();
    if (!v) { flash("닉네임을 입력하세요"); return; }
    if (v.length > 20) { flash("닉네임은 20자 이내여야 합니다"); return; }
    if (v === nickname) return;
    try {
      const saved = await updateNickname(v);
      setNickname(saved);
      flash("닉네임이 변경되었습니다");
    } catch (e) {
      flash("변경 실패: " + (e instanceof Error ? e.message : "오류"));
    }
  };

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

  // ── 레이팅 기록(계정별) ──
  const loadRatings = async () => {
    try {
      const data = await apiFetch<RatingEntry[]>(`/api/gbl/ratings?league=${league}`, {}, 15000);
      setRatings(Array.isArray(data) ? data : []);
    } catch { /* 테이블 미생성 등 → 무시 */ }
  };
  const recordRating = async () => {
    const v = parseInt(ratingInput, 10);
    if (!v || v < 100 || v > 6000) { flash("점수를 정확히 입력하세요"); return; }
    try {
      await apiFetch("/api/gbl/ratings", { method: "POST",
        body: JSON.stringify({ rating: v, league, profile: ratingProfile === "기본" ? null : ratingProfile }) }, 15000);
      setRatingInput(""); flash("📈 레이팅 기록됨"); loadRatings();
    } catch (e) { flash(e instanceof Error ? e.message : "저장 실패"); }
  };
  const deleteRating = async (id: string) => {
    try { await apiFetch(`/api/gbl/ratings/${id}`, { method: "DELETE" }, 10000); loadRatings(); } catch { /* noop */ }
  };
  const addRatingProfile = () => {
    const t = (window.prompt("계정 이름 (예: 부계1)") || "").trim();
    if (!t || t === "기본") return;
    setExtraProfiles((p) => p.includes(t) ? p : [...p, t]);
    setRatingProfile(t);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadRatings(); }, [league]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === "lookup") searchRef.current?.focus(); }, [tab]);

  // 레이팅: 선택 계정 필터 + 계정 목록
  const ratingProfileList = useMemo(() => {
    const set = new Set<string>(["기본", ...extraProfiles]);
    for (const r of ratings) set.add(r.profile || "기본");
    return [...set];
  }, [ratings, extraProfiles]);
  const profileRatings = useMemo(
    () => ratings.filter((r) => (r.profile || "기본") === ratingProfile),
    [ratings, ratingProfile]);

  // 조회: 이름으로 그룹핑 (최근순 유지). scope=all이면 전체 유저 기록.
  const groups = useMemo(() => {
    const src = scope === "all" ? allMatches : matches;
    const q = query.trim().toLowerCase();
    const filtered = src.filter((m) =>
      (m.league || "master") === league &&
      (!q || m.opponent_name.toLowerCase().includes(q)));
    // 대소문자·앞뒤공백 무시로 그룹핑("Any"="any"="ANY " 동일 상대). 표시는 처음 본 원본 표기.
    const map = new Map<string, { name: string; ms: Match[] }>();
    for (const m of filtered) {
      const k = m.opponent_name.trim().toLowerCase();
      if (!map.has(k)) map.set(k, { name: m.opponent_name.trim(), ms: [] });
      map.get(k)!.ms.push(m);
    }
    const entries = [...map.values()].map((v) => [v.name, v.ms] as [string, Match[]]);
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
  type DayStat = { date: string; wins: number; losses: number; draws: number; total: number };
  const stats = useMemo(() => {
    let src = matches.filter((m) => (m.league || "master") === league);
    if (statsPeriod === "today") {
      const n = new Date();
      const tk = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
      src = src.filter((m) => {
        const d = new Date(m.played_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === tk;
      });
    } else if (statsPeriod === "season") {
      const s = new Date(SEASON.start + "T00:00:00").getTime();
      const e = new Date(SEASON.end + "T23:59:59").getTime();
      src = src.filter((m) => { const t = new Date(m.played_at).getTime(); return t >= s && t <= e; });
    } else if (statsPeriod !== "all") {
      const since = Date.now() - Number(statsPeriod) * 86400000;
      src = src.filter((m) => new Date(m.played_at).getTime() >= since);
    }
    let wins = 0, losses = 0, draws = 0;
    const deckMap = new Map<string, Deck>();
    const dayMap = new Map<string, DayStat>();
    for (const m of src) {
      if (m.result === "win") wins++; else if (m.result === "loss") losses++; else draws++;
      // 일자별 집계 (로컬 KST 날짜 기준)
      const dt = new Date(m.played_at);
      const dkey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      if (!dayMap.has(dkey)) dayMap.set(dkey, { date: dkey, wins: 0, losses: 0, draws: 0, total: 0 });
      const dd = dayMap.get(dkey)!;
      if (m.result === "win") dd.wins++; else if (m.result === "loss") dd.losses++; else dd.draws++;
      dd.total++;
      // 덱별 집계
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
    const days = [...dayMap.values()].sort((a, b) => b.date.localeCompare(a.date));
    return { total: src.length, wins, losses, draws, decks, days };
  }, [matches, league, statsPeriod]);

  // 달력용: 날짜(YYYY-MM-DD) → 그날의 대전들 (리그 기준, 전체 기간)
  const dayMatches = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      if ((m.league || "master") !== league) continue;
      const dt = new Date(m.played_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [matches, league]);

  // 최신 기록 달을 기본 표시 (리그·데이터 바뀌면 갱신)
  useEffect(() => {
    const keys = [...dayMatches.keys()].sort();
    if (keys.length === 0) { setCalYM(null); setSelectedDay(null); return; }
    const [y, m] = keys[keys.length - 1].split("-").map(Number);
    setCalYM({ y, m });
    setSelectedDay(null);
  }, [dayMatches]);

  const winRate = (w: number, l: number) => (w + l > 0 ? Math.round((w / (w + l)) * 100) : null);
  const rateColor = (r: number | null) => r == null ? "#94a3b8" : r >= 60 ? "#16a34a" : r >= 45 ? "#c2410c" : "#dc2626";

  // 전적 카드 이미지 생성(캔버스) → 화면에 미리보기(모달). 브랜딩 포함(공유 시 홍보).
  const openStatsCard = () => {
    const S = 1080;
    const c = document.createElement("canvas");
    c.width = S; c.height = S;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const cx = S / 2;
    // 배경 그라데이션 + 상단 글로우
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, "#0a1024"); g.addColorStop(0.55, "#14183a"); g.addColorStop(1, "#3a2467");
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    const rg = ctx.createRadialGradient(cx, 140, 40, cx, 140, 640);
    rg.addColorStop(0, "rgba(96,112,255,0.30)"); rg.addColorStop(1, "rgba(96,112,255,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, S, S);
    ctx.textAlign = "center";
    const lgLabel = FORMAT_BY_KEY[league]?.label || league;
    const perLabel = PERIOD_LABEL[statsPeriod];
    const nick = nickname.trim();
    const curRating = profileRatings.length ? profileRatings[profileRatings.length - 1].rating : null;
    // 상단: 닉네임(있으면 주인공) + 브랜드/리그/기간
    if (nick) {
      ctx.fillStyle = "#ffffff"; ctx.font = "800 62px system-ui, sans-serif";
      ctx.fillText(nick.length > 14 ? nick.slice(0, 14) + "…" : nick, cx, 110);
      ctx.fillStyle = "#8ea6ff"; ctx.font = "700 34px system-ui, sans-serif";
      ctx.fillText(`📓 GBL NOTE · ${lgLabel} · ${perLabel}`, cx, 164);
    } else {
      ctx.fillStyle = "#a9c1ff"; ctx.font = "800 50px system-ui, sans-serif";
      ctx.fillText("📓 GBL NOTE", cx, 120);
      ctx.fillStyle = "#c7d2fe"; ctx.font = "500 40px system-ui, sans-serif";
      ctx.fillText(`${lgLabel} · ${perLabel}`, cx, 182);
    }
    // 원형 승률 게이지
    const wr = winRate(stats.wins, stats.losses);
    const frac = (wr ?? 0) / 100;
    const cy = 500, R = 200;
    ctx.lineCap = "round"; ctx.lineWidth = 42;
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    const arcCol = wr == null ? "#94a3b8" : wr >= 60 ? "#4ade80" : wr >= 45 ? "#fbbf24" : "#f87171";
    ctx.strokeStyle = arcCol;
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.font = "800 158px system-ui, sans-serif";
    ctx.fillText(wr == null ? "-%" : `${wr}%`, cx, cy + 46);
    ctx.fillStyle = "#94a3b8"; ctx.font = "600 42px system-ui, sans-serif";
    ctx.fillText("승률", cx, cy + 118);
    // 승/패 바
    const bw = 700, bh = 30, bx = cx - bw / 2, by = 800;
    const rr = (x0: number, y0: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x0, y0, w, h, r); };
    rr(bx, by, bw, bh, 15); ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fill();
    ctx.save(); rr(bx, by, bw, bh, 15); ctx.clip();
    const ww = bw * frac;
    ctx.fillStyle = "#22c55e"; ctx.fillRect(bx, by, ww, bh);
    ctx.fillStyle = "#ef4444"; ctx.fillRect(bx + ww, by, bw - ww, bh);
    ctx.restore();
    // 판수 · 승 · 패
    ctx.font = "700 56px system-ui, sans-serif";
    const parts = [
      { t: `${stats.total}판`, c: "#e2e8f0" },
      { t: `${stats.wins}승`, c: "#4ade80" },
      { t: `${stats.losses}패`, c: "#f87171" },
    ];
    const gap = 50;
    const widths = parts.map((p) => ctx.measureText(p.t).width);
    const totalW = widths.reduce((a, b) => a + b, 0) + gap * (parts.length - 1);
    let x = cx - totalW / 2;
    ctx.textAlign = "left";
    parts.forEach((p, i) => { ctx.fillStyle = p.c; ctx.fillText(p.t, x, 900); x += widths[i] + gap; });
    ctx.textAlign = "center";
    // 현재 레이팅(계정별, 있으면)
    if (curRating != null) {
      const rLabel = ratingProfile !== "기본" ? `${ratingProfile} 레이팅 ` : "레이팅 ";
      const rVal = String(curRating);
      ctx.font = "700 46px system-ui, sans-serif";
      const lw = ctx.measureText(rLabel).width;
      ctx.font = "800 54px system-ui, sans-serif";
      const vw = ctx.measureText(rVal).width;
      let rx = cx - (lw + vw) / 2;
      ctx.textAlign = "left";
      ctx.fillStyle = "#94a3b8"; ctx.font = "700 46px system-ui, sans-serif"; ctx.fillText(rLabel, rx, 968); rx += lw;
      ctx.fillStyle = "#fde047"; ctx.font = "800 54px system-ui, sans-serif"; ctx.fillText(rVal, rx, 968);
      ctx.textAlign = "center";
    }
    // 푸터
    ctx.fillStyle = "#7c9dff"; ctx.font = "800 40px system-ui, sans-serif";
    ctx.fillText("gblnote.com", cx, 1018);
    ctx.fillStyle = "#5f6f92"; ctx.font = "400 28px system-ui, sans-serif";
    ctx.fillText(new Date().toLocaleDateString("ko-KR"), cx, 1054);

    setCardImage(c.toDataURL("image/png"));   // 미리보기 모달에 표시
    // 공유용 파일을 미리 만들어 둠 → 공유 클릭 시 async 없이 즉시 호출(iOS 공유창 유지)
    setCardFile(null);
    c.toBlob((blob) => { if (blob) setCardFile(new File([blob], "gbl-record.png", { type: "image/png" })); }, "image/png");
  };

  // 카드 저장(다운로드)
  const saveCard = () => {
    if (!cardImage) return;
    const a = document.createElement("a");
    a.href = cardImage; a.download = "gbl-record.png"; a.click();
    flash("💾 저장됨");
  };
  // 카드 공유(모바일 네이티브 공유창: 카톡·메일·SNS / 미지원 시 저장 안내)
  const shareCard = async () => {
    if (!cardImage) return;
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    // 미리 만들어 둔 파일 사용(없으면 즉석 생성) — iOS는 async 지연 시 공유창이 막히므로 파일이 준비된 경우 곧바로 호출
    let file = cardFile;
    try {
      if (!file) {
        const blob = await (await fetch(cardImage)).blob();
        file = new File([blob], "gbl-record.png", { type: "image/png" });
      }
      if (file && typeof navigator.share === "function" && nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "내 GBL 전적", text: "내 포켓몬GO 배틀 전적 · gblnote.com" });
        return;
      }
      // PC·일부 인앱브라우저는 이미지 공유 미지원 → 저장 후 직접 첨부 안내
      saveCard();
      flash("이 브라우저는 바로 공유가 안 돼요. 저장된 이미지를 카톡·메일에 첨부하세요");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;  // 사용자가 공유창 닫음
      saveCard();
      flash("공유 대신 저장했어요 — 이미지를 첨부해 공유하세요");
    }
  };

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
    <div className="gbl-app" style={{ minHeight: "100dvh", padding: "1rem 0.9rem 4rem", color: "#0f172a",
      background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)" }}>
      <style>{`.gbl-app input,.gbl-app textarea{background:#ffffff;color:#0f172a}.gbl-app ::placeholder{color:#94a3b8}`}</style>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
      {toast && (
        <div style={{ position: "fixed", top: 14, right: 14, zIndex: 9999, background: "#0f172a", color: "#fff",
          padding: "9px 16px", borderRadius: 8, fontSize: "0.83rem" }}>{toast}</div>
      )}

      {/* 전적 카드 미리보기 모달 */}
      {cardImage && (
        <div onClick={() => setCardImage(null)}
          style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.72)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.2rem", gap: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cardImage} alt="전적 카드" onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "min(90vw, 440px)", width: "100%", borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,.5)" }} />
          <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8 }}>
            <button onClick={shareCard} style={{ padding: "11px 22px", borderRadius: 10, border: "none", background: "linear-gradient(90deg,#3b5bdb,#7c3aed)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>📤 공유</button>
            <button onClick={saveCard} style={{ padding: "11px 22px", borderRadius: 10, border: "1px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.12)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>💾 저장</button>
            <button onClick={() => setCardImage(null)} style={{ padding: "11px 16px", borderRadius: 10, border: "none", background: "rgba(255,255,255,.12)", color: "#cbd5e1", cursor: "pointer", fontSize: "0.9rem" }}>닫기</button>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>이미지를 길게 눌러 저장하거나 캡처해도 됩니다</div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Link href="/gbl" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gbl-icon.png" alt="" width={26} height={26} />
          <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>GBL Note</h1>
        </Link>
        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{leagueCount}판</span>
        <button onClick={editNickname} title="닉네임 수정 (전적 카드에 표시)"
          style={{ fontSize: "0.72rem", fontWeight: 700, color: nickname ? "#3b5bdb" : "#94a3b8",
            background: nickname ? "rgba(59,91,219,.09)" : "none", border: "1px solid #dbe2ee",
            borderRadius: 6, padding: "4px 9px", cursor: "pointer", maxWidth: 130, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          👤 {nickname || "닉네임 설정"} ✎
        </button>
        <Link href="/gbl/raid"
          style={{ marginLeft: "auto", fontSize: "0.74rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>
          🔥 레이드
        </Link>
        <Link href="/gbl/meta"
          style={{ fontSize: "0.74rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>
          🌐 메타
        </Link>
        <button onClick={logout}
          style={{ fontSize: "0.72rem", color: "#94a3b8", background: "none",
            border: "1px solid #dbe2ee", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
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
                border: on ? `1.5px solid ${f.cup ? "#7c3aed" : "#3b5bdb"}` : "1px solid #dbe2ee",
                background: on ? (f.cup ? "rgba(124,58,237,.15)" : "rgba(79,140,255,.16)") : "#eef2f8", color: on ? (f.cup ? "#7c3aed" : "#3b5bdb") : "#64748b" }}>
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
              border: tab === k ? "1.5px solid #4f8cff" : "1px solid #dbe2ee",
              background: tab === k ? "#3b5bdb" : "#eef2f8", color: tab === k ? "#fff" : "#334155" }}>
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
                      border: on ? "1.5px solid #7c3aed" : "1px solid #dbe2ee",
                      background: on ? "rgba(124,58,237,.22)" : "#eef2f8", color: on ? "#7c3aed" : "#64748b" }}>
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
                    border: on ? "1px solid #4f8cff" : "1px solid #dbe2ee",
                    background: on ? "#3b5bdb" : "#eef2f8", color: on ? "#fff" : "#64748b" }}>{label}</button>
              );
            })}
          </div>
          {loading ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem" }}>불러오는 중…</div>
          ) : groups.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "2.5rem", fontSize: "0.9rem" }}>
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
                      <span style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>{name}</span>
                      <span style={{ fontSize: "0.74rem", color: "#64748b" }}>{ms.length}판</span>
                      {(w > 0 || l > 0) && (
                        <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                          <b style={{ color: "#16a34a" }}>{w}승</b> <b style={{ color: "#dc2626" }}>{l}패</b>
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
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>상대 트레이너 이름</label>
            <input value={oppName} onChange={(e) => setOppName(e.target.value)} placeholder="예: PikaMaster99"
              autoComplete="off" autoCapitalize="off" spellCheck={false}
              style={{ width: "100%", marginTop: 5, padding: "11px 14px", border: "1px solid #dbe2ee", borderRadius: 10, fontSize: "1rem", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {([["win", "승"], ["loss", "패"], [null, "미정"]] as const).map(([v, label]) => (
              <button key={String(v)} onClick={() => setResult(v)}
                style={{ flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: "0.88rem",
                  border: result === v ? "1.5px solid #4f8cff" : "1px solid #dbe2ee",
                  background: result === v ? "#3b5bdb" : "#eef2f8", color: result === v ? "#fff" : "#64748b" }}>{label}</button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {team.map((tm, i) => (
              <TeamSlot key={i} idx={i} mon={tm} pool={pickerMons}
                onChange={(nm) => setTeam((prev) => prev.map((x, j) => (j === i ? nm : x)))} />
            ))}
          </div>

          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>전체 메모 (턴/실드 등)</label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 리드 메타그로스, 2실드 쓰고 지진 유도. 백에 김렉이/토게키스."
              style={{ width: "100%", marginTop: 5, minHeight: 70, padding: "10px 14px", border: "1px solid #dbe2ee", borderRadius: 10, fontSize: "0.9rem", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5 }} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { resetForm(); if (editingId) setTab("lookup"); }}
              style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #dbe2ee", background: "#ffffff", color: "#64748b", cursor: "pointer", fontWeight: 600 }}>
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
          {/* 기간 필터 */}
          <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
            {([["today", "오늘"], ["7", "7일"], ["30", "30일"], ["season", "시즌"], ["all", "전체"]] as const).map(([k, label]) => {
              const on = statsPeriod === k;
              return (
                <button key={k} onClick={() => setStatsPeriod(k)}
                  style={{ flex: 1, padding: "7px 2px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.76rem",
                    border: on ? "1.5px solid #4f8cff" : "1px solid #dbe2ee",
                    background: on ? "#3b5bdb" : "#eef2f8", color: on ? "#fff" : "#64748b" }}>{label}</button>
              );
            })}
          </div>

          {/* 승률 카드 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, textAlign: "center", background: "#ffffff", border: "1px solid #e3e8f2", borderRadius: 12, padding: "0.9rem 0.4rem" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>{stats.total}</div>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>총 판수</div>
            </div>
            <div style={{ flex: 1.3, textAlign: "center", background: "#ffffff", border: "1px solid #e3e8f2", borderRadius: 12, padding: "0.9rem 0.4rem" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
                <span style={{ color: "#16a34a" }}>{stats.wins}승</span>{" "}
                <span style={{ color: "#dc2626" }}>{stats.losses}패</span>
                {stats.draws > 0 && <span style={{ color: "#94a3b8" }}> {stats.draws}무</span>}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>전적</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", background: "#ffffff", border: "1px solid #e3e8f2", borderRadius: 12, padding: "0.9rem 0.4rem" }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: rateColor(winRate(stats.wins, stats.losses)) }}>
                {winRate(stats.wins, stats.losses) ?? "-"}%
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>승률</div>
            </div>
          </div>

          {/* 전적 카드 자랑/공유 */}
          {stats.total > 0 && (
            <button onClick={openStatsCard}
              style={{ width: "100%", marginBottom: 16, padding: "11px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", background: "linear-gradient(90deg,#3b5bdb,#7c3aed)", color: "#fff" }}>📸 전적 카드 만들기 · 자랑하기</button>
          )}

          {/* 📈 레이팅 추이 (계정별) */}
          <div style={{ marginBottom: 16, background: "#ffffff", border: "1px solid #e3e8f2", borderRadius: 12, padding: "0.9rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a" }}>📈 레이팅 추이</span>
              <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{FORMAT_BY_KEY[league]?.label || league}</span>
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
              {ratingProfileList.map((pf) => (
                <button key={pf} onClick={() => setRatingProfile(pf)}
                  style={{ fontSize: "0.74rem", fontWeight: 600, padding: "4px 11px", borderRadius: 14, cursor: "pointer",
                    border: `1px solid ${pf === ratingProfile ? "#4f8cff" : "#dbe2ee"}`,
                    background: pf === ratingProfile ? "#3b5bdb" : "#eef2f8", color: pf === ratingProfile ? "#fff" : "#64748b" }}>{pf}</button>
              ))}
              <button onClick={addRatingProfile} style={{ fontSize: "0.74rem", fontWeight: 600, padding: "4px 11px", borderRadius: 14, cursor: "pointer", border: "1px dashed #cbd5e1", background: "#fff", color: "#94a3b8" }}>+ 계정</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input type="number" inputMode="numeric" value={ratingInput} onChange={(e) => setRatingInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") recordRating(); }}
                placeholder={`${ratingProfile} 현재 점수`}
                style={{ flex: 1, padding: "9px 12px", border: "1px solid #dbe2ee", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }} />
              <button onClick={recordRating} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#3b5bdb", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}>기록</button>
            </div>
            {profileRatings.length > 0 && (() => {
              const lastR = profileRatings[profileRatings.length - 1].rating;
              const delta = lastR - profileRatings[0].rating;
              return (
                <div style={{ fontSize: "0.82rem", color: "#475569", marginBottom: 8 }}>
                  현재 <b style={{ color: "#0f172a", fontSize: "1.05rem" }}>{lastR}</b>
                  {profileRatings.length > 1 && <span style={{ marginLeft: 8, fontWeight: 700, color: delta >= 0 ? "#16a34a" : "#dc2626" }}>{delta >= 0 ? `▲ +${delta}` : `▼ ${delta}`}</span>}
                  <span style={{ color: "#94a3b8", marginLeft: 8 }}>· {profileRatings.length}회</span>
                </div>
              );
            })()}
            {profileRatings.length >= 2 ? (
              <RatingGraph data={profileRatings} />
            ) : (
              <div style={{ fontSize: "0.76rem", color: "#94a3b8", textAlign: "center", padding: "0.8rem 0" }}>2번 이상 기록하면 추이 그래프가 나옵니다.</div>
            )}
            {profileRatings.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                {profileRatings.slice().reverse().slice(0, 10).map((r) => (
                  <span key={r.id} style={{ fontSize: "0.7rem", color: "#64748b", background: "#f1f5f9", borderRadius: 8, padding: "2px 8px" }}>
                    {r.rating}<button onClick={() => deleteRating(r.id)} style={{ marginLeft: 4, background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", padding: 0 }}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 📅 달력 (일자별) */}
          {calYM && (
            <div style={{ marginBottom: 16, background: "#ffffff", border: "1px solid #e3e8f2", borderRadius: 12, padding: "0.9rem" }}>
              {(() => {
                const { y, m } = calYM;
                const firstWd = new Date(y, m - 1, 1).getDay();
                const dim = new Date(y, m, 0).getDate();
                const dkey = (d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const prev = () => { setSelectedDay(null); setCalYM(m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 }); };
                const next = () => { setSelectedDay(null); setCalYM(m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 }); };
                const cells: (number | null)[] = [];
                for (let i = 0; i < firstWd; i++) cells.push(null);
                for (let d = 1; d <= dim; d++) cells.push(d);
                const navBtn: React.CSSProperties = { background: "#eef2f8", border: "1px solid #dbe2ee", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#3b5bdb", fontWeight: 800, fontSize: "1rem" };
                return (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 10 }}>
                      <button onClick={prev} style={navBtn}>‹</button>
                      <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", minWidth: 96, textAlign: "center" }}>{y}년 {m}월</span>
                      <button onClick={next} style={navBtn}>›</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                      {["일", "월", "화", "수", "목", "금", "토"].map((w, i) => (
                        <div key={w} style={{ textAlign: "center", fontSize: "0.68rem", fontWeight: 700, color: i === 0 ? "#dc2626" : i === 6 ? "#3b5bdb" : "#94a3b8", padding: "2px 0" }}>{w}</div>
                      ))}
                      {cells.map((d, i) => {
                        if (d == null) return <div key={"e" + i} />;
                        const k = dkey(d);
                        const ms = dayMatches.get(k);
                        if (!ms) return <div key={k} style={{ textAlign: "center", fontSize: "0.78rem", color: "#cbd5e1", padding: "7px 0" }}>{d}</div>;
                        const w = ms.filter((x) => x.result === "win").length;
                        const l = ms.filter((x) => x.result === "loss").length;
                        const r = winRate(w, l);
                        const bg = r == null ? "#e8eeff" : r >= 60 ? "#dcfce7" : r >= 45 ? "#fef3c7" : "#fee2e2";
                        const col = r == null ? "#3b5bdb" : r >= 60 ? "#16a34a" : r >= 45 ? "#ca8a04" : "#dc2626";
                        const sel = selectedDay === k;
                        return (
                          <button key={k} onClick={() => setSelectedDay(sel ? null : k)}
                            style={{ background: bg, border: sel ? "2px solid #3b5bdb" : "2px solid transparent", borderRadius: 8, padding: "4px 0 3px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1 }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>{d}</span>
                            <span style={{ fontSize: "0.6rem", fontWeight: 800, color: col }}>{w}-{l}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: "0.66rem", color: "#94a3b8", marginTop: 8, textAlign: "center", lineHeight: 1.5 }}>
                      색 = 그날 승률(초록 좋음·노랑 보통·빨강 나쁨) · 숫자 = 승-패 · <b style={{ color: "#64748b" }}>날짜 클릭 → 그날 상대</b>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* 선택한 날 상대 목록 */}
          {selectedDay && dayMatches.get(selectedDay) && (() => {
            const ms = dayMatches.get(selectedDay)!;
            const w = ms.filter((x) => x.result === "win").length;
            const l = ms.filter((x) => x.result === "loss").length;
            const [, mm, dd] = selectedDay.split("-");
            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a" }}>{Number(mm)}.{Number(dd)} 전적</span>
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{ms.length}판 · <b style={{ color: "#16a34a" }}>{w}승</b> <b style={{ color: "#dc2626" }}>{l}패</b></span>
                  <button onClick={() => setSelectedDay(null)} style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>닫기 ✕</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ms.slice().sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
                    .map((m) => <MatchCard key={m.id} m={m} onDelete={del} onEdit={startEdit} />)}
                </div>
              </div>
            );
          })()}

          {/* 일자별 승률표 */}
          {stats.days.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 8 }}>
                📊 일자별 승률{statsPeriod === "all" ? "" : ` (${PERIOD_LABEL[statsPeriod]})`}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {stats.days.map((d) => {
                  const r = winRate(d.wins, d.losses);
                  const [yy, mo, da] = d.date.split("-");
                  const sel = selectedDay === d.date;
                  return (
                    <button key={d.date} onClick={() => { setCalYM({ y: Number(yy), m: Number(mo) }); setSelectedDay(sel ? null : d.date); }}
                      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", cursor: "pointer",
                        background: sel ? "#eef3ff" : "#ffffff", border: sel ? "1.5px solid #3b5bdb" : "1px solid #e3e8f2", borderRadius: 10, padding: "7px 12px" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", minWidth: 46 }}>{mo}.{da}</span>
                      <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{d.total}판</span>
                      <span style={{ fontSize: "0.78rem", fontWeight: 600, marginLeft: "auto" }}>
                        <span style={{ color: "#16a34a" }}>{d.wins}승</span> <span style={{ color: "#dc2626" }}>{d.losses}패</span>
                        {d.draws > 0 && <span style={{ color: "#94a3b8" }}> {d.draws}무</span>}
                      </span>
                      <span style={{ fontSize: "0.84rem", fontWeight: 800, color: rateColor(r), minWidth: 42, textAlign: "right" }}>{r ?? "-"}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 덱 필터 */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {([["all", "전체 덱"], ["won", "🟢 이긴 덱"], ["lost", "🔴 진 덱"]] as const).map(([k, label]) => {
              const on = deckFilter === k;
              return (
                <button key={k} onClick={() => setDeckFilter(k)}
                  style={{ flex: 1, padding: "7px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.78rem",
                    border: on ? "1.5px solid #4f8cff" : "1px solid #dbe2ee",
                    background: on ? "#3b5bdb" : "#eef2f8", color: on ? "#fff" : "#64748b" }}>{label}</button>
              );
            })}
          </div>

          {(() => {
            const decks = stats.decks.filter((d) =>
              deckFilter === "all" ? true : deckFilter === "won" ? d.wins > d.losses : d.losses > d.wins);
            if (decks.length === 0) {
              return <div style={{ textAlign: "center", color: "#94a3b8", padding: "2.5rem", fontSize: "0.9rem" }}>
                {stats.total === 0 ? "아직 기록이 없습니다." : "해당하는 덱이 없습니다."}
              </div>;
            }
            return (
              <div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 8 }}>
                  많이 만난 순 · {decks.length}종 덱
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {decks.map((d, idx) => {
                  const r = winRate(d.wins, d.losses);
                  const open = expandedDeck === d.key;
                  return (
                    <div key={d.key} style={{ border: "1px solid #e3e8f2", borderRadius: 12, background: "#ffffff", overflow: "hidden" }}>
                      <button onClick={() => setExpandedDeck(open ? null : d.key)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "0.6rem 0.8rem", background: "none", border: "none", cursor: "pointer" }}>
                        <span style={{ fontSize: "0.74rem", fontWeight: 800, color: idx < 3 ? "#7c3aed" : "#94a3b8", minWidth: 22, textAlign: "center" }}>#{idx + 1}</span>
                        <div style={{ display: "flex", gap: 2 }}>
                          {d.mons.map((mm, i) => mm.sp
                            ? <MonSprite key={i} mon={mm.sp} size={34} />
                            : <span key={i} style={{ fontSize: "0.7rem", color: "#94a3b8", alignSelf: "center", padding: "0 4px" }}>{mm.manual}</span>)}
                        </div>
                        <div style={{ marginLeft: "auto", textAlign: "right" }}>
                          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>{d.matches.length}회</div>
                          <div style={{ fontSize: "0.72rem", fontWeight: 600 }}>
                            <span style={{ color: "#16a34a" }}>{d.wins}승</span> <span style={{ color: "#dc2626" }}>{d.losses}패</span>
                            {d.draws > 0 && <span style={{ color: "#94a3b8" }}> {d.draws}무</span>}
                            <span style={{ color: "#94a3b8" }}> · </span>
                            <span style={{ color: rateColor(r) }}>{r ?? "-"}%</span>
                          </div>
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
                      </button>
                      <div style={{ fontSize: "0.7rem", color: "#64748b", padding: "0 0.8rem 0.55rem 2.4rem", lineHeight: 1.4 }}>
                        {d.mons.map((mm) => mm.sp?.ko || mm.manual || "?").join(" · ")}
                      </div>
                      {open && (
                        <div style={{ padding: "0 0.7rem 0.7rem", display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>복기 — {d.matches.length}판</div>
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
