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

type Program = {
  name: string;
  display_name: string | null;
  host_provider: string | null;
  host_service_id: string | null;
  health_url: string | null;
  is_active: boolean;
  notes: string | null;
};

type AlertChannel = {
  id: string;
  kind: "email" | "widget";
  target: string | null;
  label: string | null;
  severity_min: "info" | "warning" | "error" | "critical";
  is_active: boolean;
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

  // ── 연결 프로그램 상태 ──
  const [programs, setPrograms] = useState<Program[]>([]);
  const [editingProgram, setEditingProgram] = useState<Record<string, Partial<Program>>>({});
  const [newProgram, setNewProgram] = useState({ name: "", display_name: "", host_provider: "render", host_service_id: "", health_url: "" });
  const [programTestResults, setProgramTestResults] = useState<Record<string, { ok: boolean; checks: {kind: string; ok: boolean; status_code?: number; response_ms?: number; state?: string; service_name?: string; error?: string}[]; note?: string }>>({});

  // ── 감시 채널 상태 ──
  const [channels, setChannels] = useState<AlertChannel[]>([]);
  const [newChannel, setNewChannel] = useState<{ kind: "email" | "widget"; target: string; label: string; severity_min: "info" | "warning" | "error" | "critical" }>({
    kind: "email",
    target: "",
    label: "",
    severity_min: "error",
  });
  const [channelTest, setChannelTest] = useState<Record<string, { ok: boolean; msg: string }>>({});

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

  const loadPrograms = async () => {
    try {
      const rows = await apiFetch<Program[]>("/api/programs");
      setPrograms(rows);
    } catch (e) { console.warn(e); }
  };

  const loadChannels = async () => {
    try {
      const rows = await apiFetch<AlertChannel[]>("/api/alert-channels");
      setChannels(rows);
    } catch (e) { console.warn(e); }
  };

  useEffect(() => {
    if (hasToken()) {
      loadSecrets();
      loadPrograms();
      loadChannels();
    }
  }, []);

  const saveToken = () => {
    if (token.trim()) {
      setToken(token.trim());
      loadSecrets();
      loadPrograms();
      loadChannels();
    } else {
      clearToken();
      setSecrets([]);
      setPrograms([]);
      setChannels([]);
    }
  };

  // ── 연결 프로그램 CRUD ──
  const testProgram = async (name: string) => {
    try {
      const r = await apiFetch<{ ok: boolean; checks: {kind: string; ok: boolean; status_code?: number; response_ms?: number; state?: string; service_name?: string; error?: string}[]; note?: string }>(
        `/api/programs/${name}/test`, { method: "POST" });
      setProgramTestResults({ ...programTestResults, [name]: r });
    } catch (e) {
      setProgramTestResults({ ...programTestResults, [name]: { ok: false, checks: [], note: (e as Error).message } });
    }
  };

  const saveProgram = async (name: string) => {
    const patch = editingProgram[name] || {};
    try {
      await apiFetch(`/api/programs/${name}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setEditingProgram({ ...editingProgram, [name]: {} });
      loadPrograms();
    } catch (e) { setErr((e as Error).message); }
  };

  const addProgram = async () => {
    if (!newProgram.name.trim()) { setErr("프로그램 이름 필수"); return; }
    try {
      await apiFetch("/api/programs", {
        method: "POST",
        body: JSON.stringify({
          name: newProgram.name.trim(),
          display_name: newProgram.display_name.trim() || null,
          host_provider: newProgram.host_provider || null,
          host_service_id: newProgram.host_service_id.trim() || null,
          health_url: newProgram.health_url.trim() || null,
        }),
      });
      setNewProgram({ name: "", display_name: "", host_provider: "render", host_service_id: "", health_url: "" });
      loadPrograms();
      setErr(null);
    } catch (e) { setErr((e as Error).message); }
  };

  // ── 감시 채널 CRUD ──
  const createChannel = async () => {
    if (newChannel.kind === "email" && !newChannel.target.trim()) {
      setErr("이메일 주소를 입력하세요");
      return;
    }
    try {
      await apiFetch("/api/alert-channels", {
        method: "POST",
        body: JSON.stringify({
          kind: newChannel.kind,
          target: newChannel.target.trim() || null,
          label: newChannel.label.trim() || null,
          severity_min: newChannel.severity_min,
          is_active: true,
        }),
      });
      setNewChannel({ kind: "email", target: "", label: "", severity_min: "error" });
      loadChannels();
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const toggleChannel = async (ch: AlertChannel) => {
    try {
      await apiFetch(`/api/alert-channels/${ch.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !ch.is_active }),
      });
      loadChannels();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const deleteChannel = async (id: string) => {
    if (!confirm("이 채널을 삭제할까요?")) return;
    try {
      await apiFetch(`/api/alert-channels/${id}`, { method: "DELETE" });
      loadChannels();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const testChannel = async (id: string) => {
    try {
      const r = await apiFetch<{ ok: boolean; detail?: { error?: string } }>(
        `/api/alert-channels/${id}/test`, { method: "POST" });
      setChannelTest({ ...channelTest, [id]: { ok: !!r.ok, msg: r.ok ? "발송 성공" : (r.detail?.error || "발송 실패") } });
    } catch (e) {
      setChannelTest({ ...channelTest, [id]: { ok: false, msg: (e as Error).message } });
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

      {/* ── 연결 프로그램 ── */}
      <h2 style={{ margin: "2rem 0 0.5rem 0", fontSize: "1.05rem" }}>연결 프로그램</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        감시할 서비스를 등록합니다. Render 서비스 ID는 Render 대시보드 → 서비스 클릭 → URL의 <code>srv-xxxxxxxx</code> 부분입니다.
      </p>

      {/* 기존 프로그램 카드 */}
      <div className="grid" style={{ marginBottom: "1rem" }}>
        {programs.map((p) => {
          const edit = editingProgram[p.name] || {};
          const isDirty = Object.keys(edit).length > 0;
          return (
            <div key={p.name} className="card">
              <div className="card-header">
                <div className="card-title">{p.display_name || p.name}</div>
                <span className={`status-badge ${p.is_active ? "up" : "unknown"}`}>
                  {p.is_active ? "활성" : "비활성"}
                </span>
              </div>
              <div className="muted" style={{ marginBottom: "0.75rem" }}>
                이름: <code>{p.name}</code> · 호스팅: {p.host_provider || "-"}
              </div>
              <div className="config-field">
                <label>Render 서비스 ID</label>
                <input
                  type="text"
                  value={edit.host_service_id ?? p.host_service_id ?? ""}
                  onChange={(e) => setEditingProgram({ ...editingProgram, [p.name]: { ...edit, host_service_id: e.target.value } })}
                  placeholder="srv-xxxxxxxxxxxxxxxxxx"
                />
              </div>
              <div className="config-field">
                <label>헬스 URL (선택)</label>
                <input
                  type="text"
                  value={edit.health_url ?? p.health_url ?? ""}
                  onChange={(e) => setEditingProgram({ ...editingProgram, [p.name]: { ...edit, health_url: e.target.value } })}
                  placeholder="https://example.onrender.com/health"
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn primary" disabled={!isDirty} onClick={() => saveProgram(p.name)}>저장</button>
                <button className="btn" onClick={() => testProgram(p.name)}>연결 테스트</button>
              </div>
              {programTestResults[p.name] && (() => {
                const tr = programTestResults[p.name];
                return (
                  <div style={{ marginTop: "0.5rem" }}>
                    <div className={`test-result show ${tr.ok ? "success" : "error"}`}>
                      {tr.ok ? "✓ 연결 정상" : "✗ 연결 실패"}{tr.note ? ` — ${tr.note}` : ""}
                    </div>
                    {tr.checks.map((c, i) => (
                      <div key={i} className="muted" style={{ fontSize: "0.8rem", marginTop: "0.25rem" }}>
                        [{c.kind}] {c.ok ? "OK" : "FAIL"}
                        {c.status_code != null && ` · HTTP ${c.status_code}`}
                        {c.response_ms != null && ` · ${c.response_ms}ms`}
                        {c.service_name && ` · ${c.service_name}`}
                        {c.state && ` · ${c.state}`}
                        {c.error && ` · ${c.error}`}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* 새 프로그램 추가 */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header"><div className="card-title">새 프로그램 추가</div></div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <div className="config-field">
            <label>이름 (고유 key)</label>
            <input type="text" value={newProgram.name}
              onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
              placeholder="예: maesil-net" />
          </div>
          <div className="config-field">
            <label>표시명</label>
            <input type="text" value={newProgram.display_name}
              onChange={(e) => setNewProgram({ ...newProgram, display_name: e.target.value })}
              placeholder="예: 매실 본체" />
          </div>
          <div className="config-field">
            <label>호스팅</label>
            <select value={newProgram.host_provider}
              onChange={(e) => setNewProgram({ ...newProgram, host_provider: e.target.value })}>
              <option value="render">Render</option>
              <option value="vercel">Vercel</option>
              <option value="self">자체 서버</option>
              <option value="other">기타</option>
            </select>
          </div>
          <div className="config-field">
            <label>서비스 ID</label>
            <input type="text" value={newProgram.host_service_id}
              onChange={(e) => setNewProgram({ ...newProgram, host_service_id: e.target.value })}
              placeholder="srv-xxxxxxxxxxxxxxxxxx" />
          </div>
          <div className="config-field">
            <label>헬스 URL (선택)</label>
            <input type="text" value={newProgram.health_url}
              onChange={(e) => setNewProgram({ ...newProgram, health_url: e.target.value })}
              placeholder="https://.../health" />
          </div>
        </div>
        <button className="btn primary" onClick={addProgram}>프로그램 추가</button>
      </div>

      {/* ── 감시 채널 ── */}
      <h2 style={{ margin: "2rem 0 0.5rem 0", fontSize: "1.05rem" }}>감시 채널</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Render 로그/사용자 에러 등 시스템 알림을 받을 채널을 등록하세요. 이메일은 maesil-insight 게이트웨이를 통해 발송됩니다.
        위젯 채널은 대시보드에 알림이 떠요.
      </p>

      {/* 새 채널 추가 폼 */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header">
          <div className="card-title">새 채널 추가</div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
          <div className="config-field">
            <label>종류</label>
            <select
              value={newChannel.kind}
              onChange={(e) => setNewChannel({ ...newChannel, kind: e.target.value as "email" | "widget" })}
            >
              <option value="email">이메일</option>
              <option value="widget">위젯 (대시보드)</option>
            </select>
          </div>
          <div className="config-field">
            <label>{newChannel.kind === "email" ? "수신 이메일" : "대상 (선택)"}</label>
            <input
              type="text"
              value={newChannel.target}
              onChange={(e) => setNewChannel({ ...newChannel, target: e.target.value })}
              placeholder={newChannel.kind === "email" ? "you@example.com" : "(빈칸 가능)"}
            />
          </div>
          <div className="config-field">
            <label>최소 심각도</label>
            <select
              value={newChannel.severity_min}
              onChange={(e) => setNewChannel({ ...newChannel, severity_min: e.target.value as typeof newChannel.severity_min })}
            >
              <option value="info">info (모든 알림)</option>
              <option value="warning">warning 이상</option>
              <option value="error">error 이상 (권장)</option>
              <option value="critical">critical 만</option>
            </select>
          </div>
          <div className="config-field">
            <label>라벨 (선택)</label>
            <input
              type="text"
              value={newChannel.label}
              onChange={(e) => setNewChannel({ ...newChannel, label: e.target.value })}
              placeholder="예: 운영자 메일"
            />
          </div>
        </div>
        <button className="btn primary" onClick={createChannel}>채널 추가</button>
      </div>

      {/* 등록된 채널 목록 */}
      <div className="grid">
        {channels.length === 0 && (
          <div className="card muted">아직 등록된 감시 채널이 없습니다. 위에서 추가하세요.</div>
        )}
        {channels.map((ch) => {
          const tr = channelTest[ch.id];
          return (
            <div key={ch.id} className="card">
              <div className="card-header">
                <div className="card-title">
                  {ch.label || (ch.kind === "email" ? "이메일 채널" : "위젯 채널")}
                </div>
                <span className={`status-badge ${ch.is_active ? "up" : "unknown"}`}>
                  {ch.is_active ? "활성" : "비활성"}
                </span>
              </div>
              <div className="muted" style={{ marginBottom: "0.5rem" }}>
                종류: <strong>{ch.kind}</strong>
                {ch.target && <> · 대상: <code>{ch.target}</code></>}
                <br />
                최소 심각도: <strong>{ch.severity_min}</strong>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button className="btn" onClick={() => testChannel(ch.id)}>테스트 발송</button>
                <button className="btn" onClick={() => toggleChannel(ch)}>
                  {ch.is_active ? "비활성화" : "활성화"}
                </button>
                <button
                  className="btn"
                  style={{ color: "#b91c1c" }}
                  onClick={() => deleteChannel(ch.id)}
                >
                  삭제
                </button>
              </div>
              {tr && (
                <div className={`test-result show ${tr.ok ? "success" : "error"}`}>
                  {tr.ok ? "성공" : "실패"} — {tr.msg}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
