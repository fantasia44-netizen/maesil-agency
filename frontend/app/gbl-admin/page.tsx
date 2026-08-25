"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type GblUser = {
  id: string; email: string; display_name: string | null; matches: number;
  last_login_at: string | null; created_at: string; is_active: boolean;
};
type Stats = {
  users_total: number; new_7d: number; active_7d: number; matches_total: number;
  by_league: Record<string, number>; users: GblUser[];
};

const LEAGUE_LABEL: Record<string, string> = { great: "슈퍼리그", ultra: "하이퍼리그", master: "마스터리그" };
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : "-";
const fmtDwell = (s: number) => { const t = Math.round(s || 0); return t >= 60 ? `${Math.floor(t / 60)}분 ${t % 60}초` : `${t}초`; };

type Traffic = {
  days: number;
  daily: { day: string; pageviews: number; uniques: number; new_visitors: number; sessions: number }[];
  summary: { pageviews: number; uniques: number; new_visitors: number; sessions: number; avg_dwell: number; bounce_rate: number; shares: number; downloads: number };
  active: { active_30m: number; pv_30m: number };
  paths: { path: string; views: number }[];
  refs: { ref: string; views: number }[];
  shares?: { label: string; shares: number; downloads: number; total: number }[];
  langs?: { lang: string; pageviews: number; uniques: number; sessions: number }[];
};

type DbStatus = { hub_configured: boolean; maesil_total: number | null; maesil_hub: number | null };

type BoardPost = { id: number; board: string; author: string; title: string; answered: boolean; is_private: boolean; reply_count: number; created_at: string };

type DailyRow = { day: string; pageviews: number; uniques: number; new_visitors: number; sessions: number };
const CHART_SERIES: { key: keyof DailyRow; label: string; color: string }[] = [
  { key: "pageviews", label: "페이지뷰", color: "#3b5bdb" },
  { key: "uniques", label: "전체방문자", color: "#0f172a" },
  { key: "new_visitors", label: "신규방문자", color: "#16a34a" },
  { key: "sessions", label: "세션", color: "#7c3aed" },
];

// 일별 방문 추이 — PV·방문자·신규·세션 통합 라인차트. 범례 클릭=표시/숨김(숨기면 축 자동 재조정).
function TrafficChart({ daily }: { daily: DailyRow[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const visible = CHART_SERIES.filter((s) => !hidden.has(s.key));
  const maxY = Math.max(1, ...daily.flatMap((d) => visible.map((s) => d[s.key] as number)));
  const W = 680, H = 210, PL = 42, PR = 14, PT = 16, PB = 26, ticks = 4;
  const n = daily.length;
  const X = (i: number) => PL + (n <= 1 ? (W - PL - PR) / 2 : (i / (n - 1)) * (W - PL - PR));
  const Y = (v: number) => PT + (1 - v / maxY) * (H - PT - PB);
  const showLabels = n <= 14;
  const xIdx = [...new Set([0, Math.floor((n - 1) / 2), n - 1])].filter((v) => v >= 0);
  return (
    <div style={{ background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "0.9rem", marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a" }}>📈 일별 방문 추이</span>
        {CHART_SERIES.map((s) => { const off = hidden.has(s.key); return (
          <button key={s.key} onClick={() => toggle(s.key)} style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "none", cursor: "pointer", fontSize: "0.72rem", color: off ? "#cbd5e1" : "#475569", fontWeight: 600, textDecoration: off ? "line-through" : "none", padding: 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: off ? "#e2e8f0" : s.color }} />{s.label}
          </button>
        ); })}
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: n > 20 ? 520 : undefined, height: "auto", display: "block" }}>
          {Array.from({ length: ticks + 1 }).map((_, i) => { const v = Math.round(maxY * (1 - i / ticks)); const y = PT + (i / ticks) * (H - PT - PB); return (
            <g key={i}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={PL - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#94a3b8">{v.toLocaleString()}</text>
            </g>
          ); })}
          {xIdx.map((i) => <text key={i} x={X(i)} y={H - 8} textAnchor="middle" fontSize={9} fill="#94a3b8">{daily[i]?.day.slice(5)}</text>)}
          {visible.map((s) => (
            <polyline key={s.key} points={daily.map((d, i) => `${X(i)},${Y(d[s.key] as number)}`).join(" ")} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {visible.map((s) => daily.map((d, i) => { const v = d[s.key] as number; return (
            <g key={s.key + i}>
              <circle cx={X(i)} cy={Y(v)} r={2.6} fill={s.color}><title>{`${d.day} · ${s.label} ${v}`}</title></circle>
              {showLabels && <text x={X(i)} y={Y(v) - 6} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={s.color}>{v}</text>}
            </g>
          ); }))}
          <text x={PL - 6} y={PT - 4} textAnchor="end" fontSize={8} fill="#cbd5e1">(명/회)</text>
        </svg>
      </div>
      <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: 4, textAlign: "right" }}>날짜(KST) · 범례 클릭으로 표시/숨김 · 점에 마우스=값</div>
    </div>
  );
}

export default function GblAdmin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [db, setDb] = useState<DbStatus | null>(null);
  const [traffic, setTraffic] = useState<Traffic | null>(null);
  const [period, setPeriod] = useState(30);
  const [inquiries, setInquiries] = useState<BoardPost[]>([]);
  const [chats, setChats] = useState<BoardPost[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const loadBoard = async () => {
    try {
      const [inq, ch] = await Promise.all([
        apiFetch<BoardPost[]>("/api/gbl/board?board=inquiry&limit=50", {}, 15000),
        apiFetch<BoardPost[]>("/api/gbl/board?board=chat&limit=20", {}, 15000),
      ]);
      setInquiries(inq); setChats(ch);
    } catch { /* SQL 069 미실행 등 */ }
  };

  const loadTraffic = async (days = 30) => {
    try { setTraffic(await apiFetch<Traffic>(`/api/gbl/admin/traffic?days=${days}`, {}, 20000)); }
    catch { /* SQL 068 미실행 등 */ }
  };
  const changePeriod = (days: number) => { setPeriod(days); loadTraffic(days); };

  const load = async () => {
    try {
      setStats(await apiFetch<Stats>("/api/gbl/admin/stats", {}, 20000));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오기 실패");
    }
  };
  const loadDb = async () => {
    try { setDb(await apiFetch<DbStatus>("/api/gbl/admin/db-status", {}, 20000)); }
    catch { /* noop */ }
  };
  useEffect(() => { load(); loadDb(); loadTraffic(); loadBoard(); }, []);

  const migrate = async () => {
    if (!window.confirm("maesil-total의 gbl_matches를 maesil-hub로 복사합니다 (id 유지, 재실행 안전). 계속할까요?")) return;
    setBusy("migrate");
    try {
      const r = await apiFetch<{ copied: number; source: number }>("/api/gbl/admin/migrate-to-hub", { method: "POST" }, 60000);
      window.alert(`이전 완료: ${r.copied}/${r.source}판`);
      await loadDb(); await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "이전 실패");
    } finally { setBusy(null); }
  };

  const toggleActive = async (u: GblUser) => {
    setBusy(u.id);
    try {
      await apiFetch(`/api/gbl/admin/users/${u.id}`, {
        method: "PATCH", body: JSON.stringify({ is_active: !u.is_active }),
      }, 15000);
      setStats((s) => s ? { ...s, users: s.users.map((x) => x.id === u.id ? { ...x, is_active: !u.is_active } : x) } : s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "변경 실패");
    } finally { setBusy(null); }
  };

  const removeUser = async (u: GblUser) => {
    if (!window.confirm(`'${u.display_name || u.email}' 계정과 기록 ${u.matches}판을 영구 삭제합니다. 되돌릴 수 없습니다. 계속할까요?`)) return;
    setBusy(u.id);
    try {
      await apiFetch(`/api/gbl/admin/users/${u.id}`, { method: "DELETE" }, 15000);
      setStats((s) => s ? {
        ...s, users: s.users.filter((x) => x.id !== u.id),
        users_total: Math.max(0, s.users_total - 1),
        matches_total: Math.max(0, s.matches_total - u.matches),
      } : s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "삭제 실패");
    } finally { setBusy(null); }
  };

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "1rem", textAlign: "center" };
  const th: React.CSSProperties = { textAlign: "left", fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, padding: "8px 10px", borderBottom: "1px solid #eef2f0" };
  const td: React.CSSProperties = { fontSize: "0.82rem", padding: "9px 10px", borderBottom: "1px solid #f5f7f6" };
  const pendingCount = inquiries.filter((p) => !p.answered).length;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: "1.2rem" }}>📓</span>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>GBL Note — 관리</h1>
      </div>
      <p style={{ margin: "0 0 1.2rem", fontSize: "0.82rem", color: "#64748b" }}>gbl.maesil.net 가입 유저·기록 현황 (super_admin 전용)</p>

      {err && <div style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 10, padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.85rem" }}>{err}</div>}

      {/* 게시판 · 문의 */}
      <div style={{ background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "1rem", marginBottom: "1.2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>💬 게시판 · 문의</span>
          {pendingCount > 0 && <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#b45309", background: "#fef3c7", borderRadius: 20, padding: "2px 10px" }}>답변대기 {pendingCount}</span>}
          <a href="/gbl/board?board=inquiry" target="_blank" rel="noreferrer" style={{ marginLeft: "auto", fontSize: "0.76rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>게시판 열기 →</a>
        </div>
        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 4 }}>운영자 문의 (최신순 · 클릭하면 게시판에서 답변)</div>
        {inquiries.length === 0 ? (
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", padding: "6px 0" }}>문의 없음 (또는 SQL 069 미실행)</div>
        ) : inquiries.slice(0, 10).map((p) => (
          <a key={p.id} href={`/gbl/board?board=inquiry&post=${p.id}`} target="_blank" rel="noreferrer"
             style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: "1px solid #f5f7f6", textDecoration: "none" }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 800, padding: "1px 7px", borderRadius: 20, background: p.answered ? "#dcfce7" : "#fef3c7", color: p.answered ? "#16a34a" : "#b45309" }}>{p.answered ? "완료" : "대기"}</span>
            {p.is_private && <span title="비공개" style={{ fontSize: "0.78rem" }}>🔒</span>}
            <span style={{ flex: 1, fontSize: "0.84rem", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
            {p.reply_count > 0 && <span style={{ fontSize: "0.72rem", color: "#3b5bdb", fontWeight: 700 }}>💬{p.reply_count}</span>}
            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{p.author} · {fmtDate(p.created_at)}</span>
          </a>
        ))}
        {chats.length > 0 && (
          <div style={{ marginTop: 10, fontSize: "0.76rem", color: "#64748b" }}>
            잡담방 글 {chats.length}개 · <a href="/gbl/board?board=chat" target="_blank" rel="noreferrer" style={{ color: "#3b5bdb", textDecoration: "none" }}>보기 →</a>
          </div>
        )}
      </div>

      {/* 방문 통계(자체 집계) */}
      {!traffic ? (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "0.7rem 1rem", marginBottom: "1.2rem", fontSize: "0.8rem", color: "#92400e" }}>
          📈 방문 통계는 <b>SQL 068</b>(gbl_visits) 실행 후 집계됩니다. maesil-hub에서 실행해 주세요.
        </div>
      ) : (
        <div style={{ marginBottom: "1.4rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>📈 방문 통계 <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>(자체 집계)</span></span>
            {/* 기간 선택기 */}
            <span style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
              {[7, 30, 60].map((d) => (
                <button key={d} onClick={() => changePeriod(d)}
                  style={{ border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, borderRadius: 6, padding: "3px 10px",
                    background: period === d ? "#3b5bdb" : "transparent", color: period === d ? "#fff" : "#64748b" }}>
                  {d}일
                </button>
              ))}
            </span>
            <span style={{ marginLeft: "auto", fontSize: "0.78rem", fontWeight: 800, color: "#16a34a", background: "#dcfce7", borderRadius: 12, padding: "3px 12px" }}>🟢 실시간 활성 {traffic.active?.active_30m ?? 0}명 <span style={{ fontWeight: 500, color: "#4d7c53" }}>(30분)</span></span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(104px,1fr))", gap: 8, marginBottom: 12 }}>
            {[
              { l: "페이지뷰", v: traffic.summary?.pageviews ?? 0, c: "#3b5bdb" },
              { l: "전체방문자", v: traffic.summary?.uniques ?? 0, c: "#0f172a" },
              { l: "신규방문자", v: traffic.summary?.new_visitors ?? 0, c: "#16a34a" },
              { l: "세션", v: traffic.summary?.sessions ?? 0, c: "#7c3aed" },
              { l: "평균 체류", v: fmtDwell(traffic.summary?.avg_dwell ?? 0), c: "#059669" },
              { l: "이탈률", v: `${Math.round((traffic.summary?.bounce_rate ?? 0) * 100)}%`, c: "#c2410c" },
              { l: "공유", v: traffic.summary?.shares ?? 0, c: "#db2777" },
              { l: "다운로드", v: traffic.summary?.downloads ?? 0, c: "#0891b2" },
            ].map((k) => (
              <div key={k.l} style={{ ...card, padding: "0.75rem 0.4rem" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: k.c }}>{k.v}</div>
                <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{k.l}</div>
              </div>
            ))}
          </div>
          {traffic.daily.length > 0 && <TrafficChart daily={traffic.daily} />}
          {traffic.daily.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "0.9rem", marginBottom: 12, overflowX: "auto" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                일별 방문객·조회 <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 500 }}>(자체 집계 · 최신순)</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem" }}>
                <thead>
                  <tr style={{ color: "#94a3b8" }}>
                    <th style={{ textAlign: "left", fontWeight: 600, padding: "4px 6px" }}>날짜</th>
                    <th style={{ textAlign: "right", fontWeight: 600, padding: "4px 6px" }}>방문객</th>
                    <th style={{ textAlign: "right", fontWeight: 600, padding: "4px 6px" }}>조회</th>
                    <th style={{ textAlign: "right", fontWeight: 600, padding: "4px 6px" }}>세션</th>
                    <th style={{ textAlign: "right", fontWeight: 600, padding: "4px 6px" }}>조회/방문</th>
                  </tr>
                </thead>
                <tbody>
                  {[...traffic.daily].reverse().map((d) => (
                    <tr key={d.day} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ textAlign: "left", padding: "4px 6px", color: "#475569" }}>{d.day.slice(5)}</td>
                      <td style={{ textAlign: "right", padding: "4px 6px", fontWeight: 700, color: "#0f172a" }}>{d.uniques}</td>
                      <td style={{ textAlign: "right", padding: "4px 6px", fontWeight: 700, color: "#3b5bdb" }}>{d.pageviews}</td>
                      <td style={{ textAlign: "right", padding: "4px 6px", color: "#7c3aed" }}>{d.sessions}</td>
                      <td style={{ textAlign: "right", padding: "4px 6px", color: "#64748b" }}>{d.uniques ? (d.pageviews / d.uniques).toFixed(1) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            <div style={{ background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "0.8rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>상위 페이지 (7일)</div>
              {traffic.paths.length === 0 ? <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>데이터 없음</div> : traffic.paths.slice(0, 8).map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: "0.76rem", padding: "3px 0" }}>
                  <span style={{ color: "#94a3b8", minWidth: 14 }}>{i + 1}</span>
                  <span style={{ flex: 1, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.path}</span>
                  <span style={{ fontWeight: 700, color: "#3b5bdb" }}>{p.views}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "0.8rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>유입 경로 (7일)</div>
              {traffic.refs.length === 0 ? <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>데이터 없음</div> : traffic.refs.slice(0, 8).map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: "0.76rem", padding: "3px 0" }}>
                  <span style={{ color: "#94a3b8", minWidth: 14 }}>{i + 1}</span>
                  <span style={{ flex: 1, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.ref}</span>
                  <span style={{ fontWeight: 700, color: "#7c3aed" }}>{r.views}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 언어별 유입 (경로 프리픽스 /en·/ja 기준) */}
          <div style={{ background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "0.8rem", marginTop: 10 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              🌐 언어별 유입 ({traffic.days}일) <span style={{ fontWeight: 500, color: "#94a3b8" }}>· 공개 페이지뷰</span>
            </div>
            {!traffic.langs || traffic.langs.length === 0 ? (
              <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>데이터 없음 (SQL 072 실행 여부 확인)</div>
            ) : (() => {
              const LABEL: Record<string, string> = { ko: "🇰🇷 한국어", en: "🇺🇸 English", ja: "🇯🇵 日本語" };
              const COLOR: Record<string, string> = { ko: "#3b5bdb", en: "#0891b2", ja: "#db2777" };
              const totalPv = traffic.langs.reduce((a, l) => a + l.pageviews, 0) || 1;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {traffic.langs.map((l) => {
                    const pct = Math.round((l.pageviews / totalPv) * 100);
                    const c = COLOR[l.lang] || "#64748b";
                    return (
                      <div key={l.lang} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem" }}>
                        <span style={{ minWidth: 92, fontWeight: 700, color: "#0f172a" }}>{LABEL[l.lang] || l.lang}</span>
                        <div style={{ flex: 1, height: 12, background: "#eef2f8", borderRadius: 6, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: 6 }} />
                        </div>
                        <span style={{ fontWeight: 800, color: c, minWidth: 40, textAlign: "right" }}>{pct}%</span>
                        <span style={{ color: "#64748b", minWidth: 128, textAlign: "right", fontSize: "0.72rem" }}>
                          PV {l.pageviews.toLocaleString()} · 방문 {l.uniques.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* 카드 유형별 공유·다운로드 — 어떤 콘텐츠가 바이럴을 주도하는지 */}
          <div style={{ background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "0.8rem", marginTop: 10 }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
              📤 카드 유형별 공유·다운로드 ({traffic.days}일) <span style={{ fontWeight: 500, color: "#94a3b8" }}>· 바이럴 주도 콘텐츠</span>
            </div>
            {!traffic.shares || traffic.shares.length === 0 ? (
              <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>아직 데이터 없음 (SQL 068 재실행 필요)</div>
            ) : (() => {
              const LABEL_KO: Record<string, string> = {
                "cp-table": "개체값 CP표", "boss-list": "레이드 보스 목록", "raid-dealer": "레이드 딜러 TOP",
                "pvp-tier": "배틀리그 티어표", "raid-calendar": "레이드 달력", "stats-card": "내 전적 카드", "list": "목록",
                "trade": "교환 목록 카드", "iv-table": "IV 순위표", "pokemon-card": "포켓몬 상세 카드", "cmp-rank": "CMP 순위", "(기타)": "(기타·라벨없음)",
              };
              const mx = Math.max(...traffic.shares.map((s) => s.total), 1);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {traffic.shares.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem" }}>
                      <span style={{ minWidth: 108, color: "#334155", fontWeight: 600 }}>{LABEL_KO[s.label] || s.label}</span>
                      <div style={{ flex: 1, height: 16, background: "#f1f5f9", borderRadius: 5, overflow: "hidden", display: "flex" }}>
                        <div style={{ width: `${(s.total / mx) * 100}%`, background: "linear-gradient(90deg,#0891b2,#db2777)", height: "100%" }} />
                      </div>
                      <span style={{ minWidth: 92, textAlign: "right", color: "#64748b" }}>
                        <b style={{ color: "#db2777" }}>📤{s.shares}</b> · <b style={{ color: "#0891b2" }}>💾{s.downloads}</b>
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {db && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "0.9rem 1rem", marginBottom: "1.2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>🗄️ DB 상태</span>
            <span style={{ fontSize: "0.74rem", padding: "2px 8px", borderRadius: 10, background: db.hub_configured ? "#dcfce7" : "#fee2e2", color: db.hub_configured ? "#15803d" : "#b91c1c", fontWeight: 600 }}>
              {db.hub_configured ? "hub 연결됨" : "hub 미설정(폴백)"}
            </span>
            <span style={{ fontSize: "0.8rem", color: "#475569", marginLeft: 4 }}>
              maesil-total <b>{db.maesil_total ?? "?"}</b>판 → maesil-hub <b style={{ color: "#7c3aed" }}>{db.maesil_hub ?? "?"}</b>판
            </span>
            <button onClick={migrate} disabled={!!busy || !db.hub_configured || !db.maesil_total}
              style={{ marginLeft: "auto", fontSize: "0.78rem", fontWeight: 700, padding: "7px 14px", borderRadius: 9,
                border: "none", cursor: busy || !db.hub_configured || !db.maesil_total ? "not-allowed" : "pointer",
                background: busy || !db.hub_configured || !db.maesil_total ? "#cbd5e1" : "linear-gradient(90deg,#3b5bdb,#7c3aed)", color: "#fff" }}>
              {busy === "migrate" ? "이전 중…" : "total → hub 데이터 이전"}
            </button>
          </div>
          {db.hub_configured && db.maesil_hub === 0 && (db.maesil_total ?? 0) > 0 &&
            <div style={{ fontSize: "0.74rem", color: "#b45309", marginTop: 6 }}>⚠️ hub가 비어있습니다. 위 버튼으로 {db.maesil_total}판을 옮기면 메타·기록이 채워집니다.</div>}
        </div>
      )}

      {!stats ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem" }}>불러오는 중…</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.7rem", marginBottom: "1rem" }}>
            {[
              { label: "총 유저", value: stats.users_total, color: "#0f172a" },
              { label: "최근 7일 신규", value: stats.new_7d, color: "#15803d" },
              { label: "최근 7일 활성", value: stats.active_7d, color: "#3b5bdb" },
              { label: "총 기록", value: stats.matches_total, color: "#7c3aed" },
            ].map((k) => (
              <div key={k.label} style={card}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: k.color }}>{k.value}</div>
                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: "1.4rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>리그별 기록:</span>
            {Object.entries(stats.by_league).map(([lg, n]) => (
              <span key={lg} style={{ fontSize: "0.78rem", fontWeight: 600, padding: "3px 10px", borderRadius: 12, background: "#eef2ff", color: "#3b5bdb" }}>
                {LEAGUE_LABEL[lg] ?? lg} {n}
              </span>
            ))}
            <button onClick={() => { setErr(""); setStats(null); load(); }}
              style={{ marginLeft: "auto", fontSize: "0.76rem", padding: "5px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer" }}>
              🔄 새로고침
            </button>
          </div>

          <div style={{ background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr>
                    <th style={th}>유저</th>
                    <th style={{ ...th, textAlign: "right" }}>기록</th>
                    <th style={th}>마지막 로그인</th>
                    <th style={th}>가입</th>
                    <th style={th}>상태</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {stats.users.length === 0 ? (
                    <tr><td style={{ ...td, textAlign: "center", color: "#94a3b8" }} colSpan={6}>아직 가입한 유저가 없습니다.</td></tr>
                  ) : stats.users.map((u) => (
                    <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{u.display_name || u.email.split("@")[0]}</div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{u.email}</div>
                      </td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{u.matches}</td>
                      <td style={td}>{fmtDate(u.last_login_at)}</td>
                      <td style={td}>{fmtDate(u.created_at)}</td>
                      <td style={td}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "1px 8px", borderRadius: 8,
                          background: u.is_active ? "#f0fdf4" : "#f1f5f9", color: u.is_active ? "#15803d" : "#94a3b8" }}>
                          {u.is_active ? "활성" : "정지"}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button onClick={() => toggleActive(u)} disabled={busy === u.id}
                          style={{ fontSize: "0.74rem", padding: "4px 10px", borderRadius: 7, cursor: "pointer",
                            border: `1px solid ${u.is_active ? "#fed7aa" : "#bbf7d0"}`,
                            background: "#fff", color: u.is_active ? "#c2410c" : "#15803d" }}>
                          {busy === u.id ? "…" : u.is_active ? "정지" : "복구"}
                        </button>
                        <button onClick={() => removeUser(u)} disabled={busy === u.id}
                          style={{ marginLeft: 6, fontSize: "0.74rem", padding: "4px 10px", borderRadius: 7, cursor: "pointer",
                            border: "1px solid #fecaca", background: "#fff", color: "#b91c1c" }}>
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
