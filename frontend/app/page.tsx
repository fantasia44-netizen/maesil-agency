"use client";

import { useEffect, useState } from "react";
import { apiFetch, hasToken } from "../lib/api";

type HealthSnapshot = {
  server_status: string | null;
  db_status: string | null;
  response_time_ms: number | null;
  error_count_1h: number | null;
  traffic_1h: number | null;
  checked_at: string | null;
} | null;

type ProgramCard = {
  name: string;
  display_name: string;
  host_provider: string | null;
  health: HealthSnapshot;
};

type SystemStatusResp = { programs: ProgramCard[] };

function statusClass(status: string | null | undefined): string {
  if (!status) return "unknown";
  const s = status.toLowerCase();
  if (s === "up" || s === "ok") return "up";
  if (s === "down" || s === "error") return "down";
  if (s === "degraded" || s === "slow") return "degraded";
  return "unknown";
}

export default function Dashboard() {
  const [data, setData] = useState<SystemStatusResp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!hasToken()) {
      setErr("인증 토큰이 필요합니다. 설정 페이지로 이동해서 토큰을 입력하세요.");
      return;
    }
    apiFetch<SystemStatusResp>("/api/widgets/system-status")
      .then(setData)
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <div>
      <h1 style={{ margin: "0 0 1rem 0", fontSize: "1.3rem" }}>대시보드</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        프로그램 구동 상태 (Phase 1 Day 1 스텁 — 수집 전에는 "아직 수집 전" 표시)
      </p>

      {err && (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c" }}>
          {err}
        </div>
      )}

      {data && (
        <div className="grid">
          {data.programs.map((p) => {
            const h = p.health;
            return (
              <div key={p.name} className="card">
                <div className="card-header">
                  <div className="card-title">{p.display_name}</div>
                  <span className={`status-badge ${statusClass(h?.server_status)}`}>
                    {h?.server_status || "아직 수집 전"}
                  </span>
                </div>
                <div className="muted">
                  호스팅: {p.host_provider || "-"}<br />
                  DB: <span className={`status-badge ${statusClass(h?.db_status)}`}>{h?.db_status || "-"}</span><br />
                  응답시간: {h?.response_time_ms ?? "-"} ms<br />
                  1시간 에러: {h?.error_count_1h ?? "-"} · 트래픽: {h?.traffic_1h ?? "-"}<br />
                  체크: {h?.checked_at ? new Date(h.checked_at).toLocaleString("ko-KR") : "-"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
