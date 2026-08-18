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

export default function GblAdmin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      setStats(await apiFetch<Stats>("/api/gbl/admin/stats", {}, 20000));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오기 실패");
    }
  };
  useEffect(() => { load(); }, []);

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

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "1rem", textAlign: "center" };
  const th: React.CSSProperties = { textAlign: "left", fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, padding: "8px 10px", borderBottom: "1px solid #eef2f0" };
  const td: React.CSSProperties = { fontSize: "0.82rem", padding: "9px 10px", borderBottom: "1px solid #f5f7f6" };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: "1.2rem" }}>📓</span>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>GBL 데스노트 — 관리</h1>
      </div>
      <p style={{ margin: "0 0 1.2rem", fontSize: "0.82rem", color: "#64748b" }}>gbl.maesil.net 가입 유저·기록 현황 (super_admin 전용)</p>

      {err && <div style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 10, padding: "0.7rem 1rem", marginBottom: "1rem", fontSize: "0.85rem" }}>{err}</div>}

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
                      <td style={{ ...td, textAlign: "right" }}>
                        <button onClick={() => toggleActive(u)} disabled={busy === u.id}
                          style={{ fontSize: "0.74rem", padding: "4px 10px", borderRadius: 7, cursor: "pointer",
                            border: `1px solid ${u.is_active ? "#fecaca" : "#bbf7d0"}`,
                            background: "#fff", color: u.is_active ? "#b91c1c" : "#15803d" }}>
                          {busy === u.id ? "…" : u.is_active ? "정지" : "복구"}
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
