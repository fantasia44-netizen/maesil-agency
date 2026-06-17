"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

// ── 타입 ──────────────────────────────────────────────────────────
type Alert = { level: "warning" | "critical"; message: string };
type Section = { title: string; body: string };

type Briefing = {
  id: string;
  agency_type: "sales" | "warehouse";
  status: "ok" | "error" | "no_data";
  headline: string | null;
  sections: Section[] | null;
  alerts: Alert[] | null;
  period_from: string | null;
  period_to: string | null;
  created_at: string;
  error_msg: string | null;
};

type LatestBriefings = {
  sales: Briefing | null;
  warehouse: Briefing | null;
};

// ── 헬퍼 ──────────────────────────────────────────────────────────
function fmtDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleString("ko-KR", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDateShort(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────
function AlertBadge({ alert }: { alert: Alert }) {
  const isCritical = alert.level === "critical";
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "0.5rem",
      padding: "8px 12px", borderRadius: 8,
      background: isCritical ? "#fef2f2" : "#fffbeb",
      border: `1px solid ${isCritical ? "#fecaca" : "#fde68a"}`,
      marginBottom: "0.4rem",
    }}>
      <span style={{ flexShrink: 0, fontSize: "0.85rem" }}>{isCritical ? "🚨" : "⚠️"}</span>
      <span style={{ fontSize: "0.8rem", color: isCritical ? "#b91c1c" : "#92400e", lineHeight: 1.5 }}>
        {alert.message}
      </span>
    </div>
  );
}

function BriefingPanel({
  briefing,
  title,
  icon,
  accentColor,
  running,
  onRun,
}: {
  briefing: Briefing | null;
  title: string;
  icon: string;
  accentColor: string;
  running: boolean;
  onRun: () => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const criticals = briefing?.alerts?.filter(a => a.level === "critical") || [];
  const warnings  = briefing?.alerts?.filter(a => a.level === "warning")  || [];

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {/* 패널 헤더 */}
      <div style={{
        padding: "1rem 1.25rem",
        borderBottom: `3px solid ${accentColor}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#fafafa",
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
            {icon} {title}
          </div>
          {briefing && (
            <div className="muted" style={{ fontSize: "0.72rem", marginTop: 2 }}>
              {fmtDate(briefing.created_at)} 생성
              {briefing.period_from && ` · ${fmtDateShort(briefing.period_from)}~${fmtDateShort(briefing.period_to)} 기준`}
            </div>
          )}
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className="btn primary"
          style={{ fontSize: "0.78rem", padding: "6px 14px", background: accentColor, border: "none" }}>
          {running ? "실행 중…" : "▶ 브리핑 실행"}
        </button>
      </div>

      <div style={{ padding: "1rem 1.25rem" }}>
        {!briefing ? (
          <div className="muted" style={{ textAlign: "center", padding: "2rem 0", fontSize: "0.85rem" }}>
            브리핑이 없습니다. "브리핑 실행" 버튼을 눌러주세요.
          </div>
        ) : briefing.status === "error" ? (
          <div style={{ color: "#b91c1c", fontSize: "0.85rem", padding: "0.75rem 0" }}>
            오류: {briefing.error_msg || "알 수 없는 오류"}
          </div>
        ) : briefing.status === "no_data" ? (
          <div className="muted" style={{ fontSize: "0.85rem", padding: "0.75rem 0" }}>
            데이터 없음 — maesil-insight 연동 후 다시 실행하세요.
          </div>
        ) : (
          <>
            {/* 헤드라인 */}
            {briefing.headline && (
              <div style={{
                padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem",
                background: `${accentColor}12`, border: `1px solid ${accentColor}40`,
                fontWeight: 700, fontSize: "0.92rem", color: "#0f172a", lineHeight: 1.5,
              }}>
                {briefing.headline}
              </div>
            )}

            {/* 알림 */}
            {(criticals.length > 0 || warnings.length > 0) && (
              <div style={{ marginBottom: "1rem" }}>
                {criticals.map((a, i) => <AlertBadge key={i} alert={a} />)}
                {warnings.map((a, i) => <AlertBadge key={i} alert={a} />)}
              </div>
            )}

            {/* 섹션 아코디언 */}
            {(briefing.sections || []).map((sec, i) => (
              <div key={i} style={{
                borderBottom: i < (briefing.sections?.length ?? 0) - 1 ? "1px solid #f1f5f9" : "none",
                marginBottom: "0.25rem",
              }}>
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  style={{
                    width: "100%", textAlign: "left", padding: "0.7rem 0",
                    background: "none", border: "none", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                  <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#374151" }}>{sec.title}</span>
                  <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{expanded === i ? "▲" : "▼"}</span>
                </button>
                {expanded === i && (
                  <div style={{
                    fontSize: "0.82rem", color: "#475569", lineHeight: 1.7,
                    padding: "0 0 0.75rem", whiteSpace: "pre-wrap",
                  }}>
                    {sec.body}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────
export default function BriefingPage() {
  const [briefings, setBriefings] = useState<LatestBriefings>({ sales: null, warehouse: null });
  const [loading, setLoading] = useState(true);
  const [runningSales, setRunningSales] = useState(false);
  const [runningWarehouse, setRunningWarehouse] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const loadLatest = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<LatestBriefings>("/api/briefing/latest", {}, 15000);
      setBriefings(data);
    } catch {
      showToast("브리핑 로드 실패", false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLatest(); }, []);

  const runBriefing = async (agency: "sales" | "warehouse") => {
    const setSetter = agency === "sales" ? setRunningSales : setRunningWarehouse;
    setSetter(true);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>(
        `/api/briefing/run?agency=${agency}`, { method: "POST" }, 10000
      );
      showToast(res.message || "실행됨");
      // 60초 후 자동 새로고침
      setTimeout(loadLatest, 60000);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "실행 실패", false);
      setSetter(false);
    }
  };

  const runAll = async () => {
    setRunningSales(true);
    setRunningWarehouse(true);
    try {
      const res = await apiFetch<{ ok: boolean; message: string }>(
        "/api/briefing/run?agency=all", { method: "POST" }, 10000
      );
      showToast(res.message || "전체 브리핑 실행 중");
      setTimeout(loadLatest, 65000);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "실행 실패", false);
      setRunningSales(false);
      setRunningWarehouse(false);
    }
  };

  const anyRunning = runningSales || runningWarehouse;

  // 크리티컬 알림 합산
  const totalCriticals = [
    ...(briefings.sales?.alerts?.filter(a => a.level === "critical") || []),
    ...(briefings.warehouse?.alerts?.filter(a => a.level === "critical") || []),
  ];

  return (
    <div>
      {/* 토스트 */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, right: 16, zIndex: 9999,
          background: toast.ok ? "#0f172a" : "#991b1b",
          color: "#fff", padding: "10px 18px", borderRadius: 8,
          fontSize: "0.85rem", boxShadow: "0 4px 16px rgba(0,0,0,.25)", maxWidth: 360,
        }}>
          {toast.msg}
        </div>
      )}

      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>에이전시 브리핑</h1>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
            maesil-insight 매출 · maesil-total 재고/생산 실시간 AI 진단
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="btn primary"
            onClick={runAll}
            disabled={anyRunning}
            style={{ fontSize: "0.82rem", padding: "7px 16px" }}>
            {anyRunning ? "실행 중…" : "⚡ 전체 브리핑 실행"}
          </button>
          <button
            className="btn"
            onClick={loadLatest}
            disabled={loading}
            style={{ fontSize: "0.82rem", padding: "7px 12px" }}>
            {loading ? "로딩…" : "🔄 새로고침"}
          </button>
        </div>
      </div>

      {/* 크리티컬 알림 요약 */}
      {totalCriticals.length > 0 && (
        <div style={{
          padding: "0.75rem 1.1rem", borderRadius: 8, marginBottom: "1.25rem",
          background: "#fef2f2", border: "2px solid #fca5a5",
          display: "flex", alignItems: "center", gap: "0.6rem",
        }}>
          <span style={{ fontSize: "1.1rem" }}>🚨</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#b91c1c" }}>
              즉시 조치 필요 {totalCriticals.length}건
            </div>
            <div style={{ fontSize: "0.78rem", color: "#dc2626", marginTop: 2 }}>
              {totalCriticals[0].message}
              {totalCriticals.length > 1 && ` 외 ${totalCriticals.length - 1}건`}
            </div>
          </div>
        </div>
      )}

      {/* 브리핑 패널 2열 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1rem" }}>
        <BriefingPanel
          briefing={briefings.sales}
          title="영업 에이전시"
          icon="📈"
          accentColor="#0369a1"
          running={runningSales}
          onRun={() => runBriefing("sales")}
        />
        <BriefingPanel
          briefing={briefings.warehouse}
          title="창고 에이전시"
          icon="📦"
          accentColor="#7c3aed"
          running={runningWarehouse}
          onRun={() => runBriefing("warehouse")}
        />
      </div>

      {/* 실행 중 안내 */}
      {anyRunning && (
        <div className="muted" style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.82rem" }}>
          maesil-insight에 접속해 데이터를 수집하고 AI 분석 중입니다…  약 30~60초 후 자동 갱신됩니다.
        </div>
      )}
    </div>
  );
}
