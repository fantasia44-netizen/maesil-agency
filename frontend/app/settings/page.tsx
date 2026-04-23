"use client";

import { useEffect, useState } from "react";
import { apiFetch, setToken, clearToken, hasToken } from "../../lib/api";

type SecretRow = {
  id: string;
  name: string;
  kind: string;
  key_version: number;
  last_used_at: string | null;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type KeyCard = {
  name: string;
  kind: string;
  label: string;
  hint: string;
};

const KEY_CARDS: KeyCard[] = [
  // ── 에이전트 핵심 ──
  { name: "anthropic_api_key", kind: "anthropic", label: "Anthropic API Key",
    hint: "Phase 2+ 에이전트 실행에 필수 — Anthropic Console에서 발급" },
  // ── DB 연결 ──
  { name: "m_insight_service_role", kind: "supabase", label: "maesil-insight Service Role Key",
    hint: "Supabase 프로젝트 → Settings → API → service_role (CS 에이전트 / 매요AI 분석)" },
  // ── Operator ID ──
  { name: "autotool_operator_id", kind: "config", label: "autotool Operator ID",
    hint: "autotool DB의 내 operator_id (UUID) — Sales/Finance/Warehouse 에이전트에 필수" },
  { name: "maesil-insight_operator_id", kind: "config", label: "maesil-insight Operator ID",
    hint: "maesil-insight DB의 내 operator_id (UUID) — CS 에이전트에 필수" },
  // ── maesil-insight URL ──
  { name: "maesil_insight_supabase_url", kind: "config", label: "maesil-insight Supabase URL",
    hint: "Supabase 프로젝트 → Settings → API → Project URL (CS 에이전트 DB 접속용)" },
  { name: "maesil_insight_url", kind: "config", label: "maesil-insight 서비스 URL",
    hint: "예: https://maesil-insight.onrender.com (Tester 에이전트 하네스 API 호출용)" },
  { name: "harness_api_token", kind: "other", label: "Harness API Token",
    hint: "maesil-insight의 HARNESS_API_TOKEN 환경변수 값 (Tester 에이전트용)" },
  // ── 인프라 ──
  { name: "render_api", kind: "render", label: "Render API Token",
    hint: "Render Account Settings → API Keys (프로그램 상태 수집용)" },
];

export default function SettingsPage() {
  const [token, setTokenLocal] = useState<string>("");
  const [secrets, setSecrets] = useState<SecretRow[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTokenLocal(window.localStorage.getItem("maesil_agency_token") || "");
    }
  }, []);

  const loadSecrets = async () => {
    try {
      const rows = await apiFetch<SecretRow[]>("/api/secrets");
      setSecrets(rows);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  useEffect(() => {
    if (hasToken()) loadSecrets();
  }, []);

  const saveToken = () => {
    if (token.trim()) {
      setToken(token.trim());
      loadSecrets();
    } else {
      clearToken();
      setSecrets([]);
    }
  };

  const saveSecret = async (card: KeyCard) => {
    const value = inputs[card.name] || "";
    if (!value) return;
    try {
      await apiFetch("/api/secrets", {
        method: "PUT",
        body: JSON.stringify({ name: card.name, kind: card.kind, value, notes: card.label }),
      });
      setInputs({ ...inputs, [card.name]: "" });
      loadSecrets();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const testSecret = async (card: KeyCard) => {
    try {
      const r = await apiFetch<{ ok: boolean; note?: string }>(
        `/api/secrets/${card.name}/test`, { method: "POST" });
      setTestResults({ ...testResults, [card.name]: { ok: !!r.ok, msg: r.note || "OK" } });
    } catch (e) {
      setTestResults({ ...testResults, [card.name]: { ok: false, msg: (e as Error).message } });
    }
  };

  const existing = (name: string) => secrets.find((s) => s.name === name);

  return (
    <div>
      <h1 style={{ margin: "0 0 1rem 0", fontSize: "1.3rem" }}>설정</h1>

      <div className="card">
        <div className="card-header">
          <div className="card-title">API 인증 토큰</div>
          <span className={`status-badge ${hasToken() ? "up" : "unknown"}`}>
            {hasToken() ? "설정됨" : "미설정"}
          </span>
        </div>
        <div className="muted" style={{ marginBottom: "0.5rem" }}>
          백엔드 <code>API_BEARER_TOKEN</code> 값을 입력하세요. 브라우저에만 저장되고 서버로는 요청 시 Bearer로 전달됩니다.
        </div>
        <div className="config-field">
          <label>Bearer Token</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setTokenLocal(e.target.value)}
            placeholder="지금은 .env의 API_BEARER_TOKEN 값"
          />
        </div>
        <button className="btn primary" onClick={saveToken}>저장</button>
      </div>

      <h2 style={{ margin: "1.5rem 0 0.75rem 0", fontSize: "1.05rem" }}>시스템 키</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        각 외부 시스템(Render, 다른 Supabase 프로젝트, Anthropic 등) 접속 키를 등록합니다.
        여기서 저장한 값은 autotool DB <code>agent_work.secrets</code>에 저장되며, 백엔드만 조회합니다.
      </p>

      {err && (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c" }}>
          {err}
        </div>
      )}

      <div className="grid">
        {KEY_CARDS.map((card) => {
          const ex = existing(card.name);
          const testRes = testResults[card.name];
          return (
            <div key={card.name} className="card">
              <div className="card-header">
                <div className="card-title">{card.label}</div>
                <span className={`status-badge ${ex ? (ex.last_test_ok ? "up" : ex.last_test_ok === false ? "down" : "unknown") : "unknown"}`}>
                  {ex ? (ex.last_test_ok ? "테스트 OK" : ex.last_test_ok === false ? "테스트 실패" : "등록됨") : "미등록"}
                </span>
              </div>
              <div className="muted" style={{ marginBottom: "0.5rem" }}>{card.hint}</div>
              <div className="config-field">
                <label>값</label>
                <input
                  type="password"
                  value={inputs[card.name] || ""}
                  onChange={(e) => setInputs({ ...inputs, [card.name]: e.target.value })}
                  placeholder={ex ? "••••••••  (저장됨 · 덮어쓰려면 입력)" : "키 입력"}
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn primary" onClick={() => saveSecret(card)}>저장</button>
                <button className="btn" onClick={() => testSecret(card)} disabled={!ex}>연결 테스트</button>
              </div>
              {testRes && (
                <div className={`test-result show ${testRes.ok ? "success" : "error"}`}>
                  {testRes.ok ? "성공" : "실패"} — {testRes.msg}
                </div>
              )}
              {ex && (
                <div className="muted" style={{ marginTop: "0.5rem" }}>
                  최근 테스트: {ex.last_tested_at ? new Date(ex.last_tested_at).toLocaleString("ko-KR") : "없음"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
