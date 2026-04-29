"use client";

import { useEffect, useState } from "react";
import { apiFetch, hasToken } from "../lib/api";

// --- 프로그램 타입 ---
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

// --- 에이전트 타입 ---
type AgentCard = {
  agent_type: string;
  display_name: string;
  phase: number;
  status: "idle" | "running" | "success" | "failed" | "timeout" | "cancelled";
  last_run_at: string | null;
  last_ended_at: string | null;
  error_reason: string | null;
  cost_usd: number | null;
};

type AgentStatusResp = { agents: AgentCard[] };

// --- 알림 타입 ---
type AlertEvent = {
  id: string;
  program_name: string | null;
  severity: "info" | "warning" | "error" | "critical";
  source: string | null;
  title: string;
  message: string | null;
  created_at: string;
  acknowledged_at: string | null;
};

type AlertsResp = { events: AlertEvent[] };

function severityClass(sev: string): string {
  if (sev === "critical" || sev === "error") return "down";
  if (sev === "warning") return "degraded";
  return "unknown";
}

// --- 상태 뱃지 헬퍼 ---
function statusClass(status: string | null | undefined): string {
  if (!status) return "unknown";
  const s = status.toLowerCase();
  if (s === "up" || s === "ok" || s === "success") return "up";
  if (s === "down" || s === "error" || s === "failed") return "down";
  if (s === "degraded" || s === "slow" || s === "timeout" || s === "running") return "degraded";
  return "unknown";
}

function agentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    idle: "대기 중",
    running: "실행 중",
    success: "성공",
    failed: "실패",
    timeout: "타임아웃",
    cancelled: "취소됨",
  };
  return map[status] ?? status;
}

export default function Dashboard() {
  const [programs, setPrograms] = useState<SystemStatusResp | null>(null);
  const [agents, setAgents] = useState<AgentStatusResp | null>(null);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const loadAlerts = () => {
    apiFetch<AlertsResp>("/api/alerts/recent?limit=10&only_unack=true")
      .then((r) => setAlerts(r.events || []))
      .catch(() => {/* alerts는 비치명적 */});
  };

  const ackAlert = async (id: string) => {
    try {
      await apiFetch(`/api/alerts/${id}/ack`, { method: "POST", body: JSON.stringify({}) });
      loadAlerts();
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    if (!hasToken()) {
      setErr("인증 토큰이 필요합니다. 설정 페이지로 이동해서 토큰을 입력하세요.");
      return;
    }
    apiFetch<SystemStatusResp>("/api/widgets/system-status")
      .then(setPrograms)
      .catch((e: Error) => setErr(e.message));

    apiFetch<AgentStatusResp>("/api/widgets/agent-status")
      .then(setAgents)
      .catch((e: Error) => setErr(e.message));

    loadAlerts();
    // 30초마다 알림 갱신
    const t = setInterval(loadAlerts, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      {err && (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c", marginBottom: "1.5rem" }}>
          {err}
        </div>
      )}

      {/* 알림 위젯 (미확인 알림이 있을 때만) */}
      {alerts.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
              미확인 알림 <span className="muted">({alerts.length})</span>
            </h2>
            <button
              className="btn"
              style={{ fontSize: "0.75rem", padding: "3px 10px" }}
              onClick={async () => {
                try {
                  await apiFetch("/api/alerts/ack-all", { method: "POST", body: JSON.stringify({}) });
                  loadAlerts();
                } catch (e) { console.warn(e); }
              }}
            >전체 확인</button>
          </div>
          <div className="grid" style={{ marginBottom: "2rem" }}>
            {alerts.map((a) => (
              <div key={a.id} className="card" style={{ borderLeft: `4px solid ${a.severity === "critical" || a.severity === "error" ? "#dc2626" : a.severity === "warning" ? "#d97706" : "#2563eb"}` }}>
                <div className="card-header">
                  <div className="card-title" style={{ fontSize: "0.95rem" }}>{a.title}</div>
                  <span className={`status-badge ${severityClass(a.severity)}`}>{a.severity}</span>
                </div>
                <div className="muted" style={{ marginBottom: "0.5rem" }}>
                  {a.program_name || "(프로그램 없음)"} · {a.source || "-"}<br />
                  {new Date(a.created_at).toLocaleString("ko-KR")}
                </div>
                {a.message && (
                  <pre style={{
                    background: "#0f172a", color: "#e2e8f0", padding: "0.5rem",
                    fontSize: "0.75rem", borderRadius: "4px", overflow: "auto",
                    maxHeight: "120px", whiteSpace: "pre-wrap", wordBreak: "break-all",
                    marginBottom: "0.5rem"
                  }}>{a.message}</pre>
                )}
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <button
                    className="btn"
                    style={{ background: "#0891b2", color: "white", borderColor: "#0891b2" }}
                    onClick={() => {
                      // 채팅 페이지로 이동 — alert_id 파라미터로 자동 분석 시작
                      window.location.href = `/chat?alert_id=${encodeURIComponent(a.id)}`;
                    }}
                  >
                    🔧 분석 요청
                  </button>
                  <button className="btn" onClick={() => ackAlert(a.id)}>확인 처리</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 에이전트 섹션 */}
      <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: 600 }}>에이전트</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: "1rem" }}>
        각 에이전트의 마지막 실행 상태
      </p>
      {agents && (
        <div className="grid" style={{ marginBottom: "2rem" }}>
          {agents.agents.map((a) => (
            <div key={a.agent_type} className="card">
              <div className="card-header">
                <div className="card-title">{a.display_name}</div>
                <span className={`status-badge ${statusClass(a.status)}`}>
                  {agentStatusLabel(a.status)}
                </span>
              </div>
              <div className="muted">
                Phase {a.phase}<br />
                마지막 실행: {a.last_run_at ? new Date(a.last_run_at).toLocaleString("ko-KR") : "-"}<br />
                비용: {a.cost_usd != null ? `$${Number(a.cost_usd).toFixed(4)}` : "-"}<br />
                {a.error_reason && <span style={{ color: "#b91c1c" }}>오류: {a.error_reason}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 프로그램 섹션 */}
      <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: 600 }}>프로그램 상태</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: "1rem" }}>
        연결된 서비스 구동 상태
      </p>
      {programs && (
        <div className="grid">
          {programs.programs.map((p) => {
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
