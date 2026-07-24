"use client";

import { useEffect, useState } from "react";
import { apiFetch, hasToken, getUser } from "../../lib/api";

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
  github_repo: string | null;
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

type UserRow = {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
  insight_operator_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};

const KEY_CARDS: KeyCard[] = [
  // ── 에이전트 핵심 ──
  { name: "anthropic_api_key", kind: "anthropic", label: "Anthropic API Key",
    hint: "Phase 2+ 에이전트 실행에 필수 — Anthropic Console에서 발급" },
  // ── DB 연결 ──
  { name: "m_insight_service_role", kind: "supabase", label: "maesil-insight Service Role Key",
    hint: "Supabase 프로젝트 → Settings → API → service_role (CS 에이전트 / 매요AI 분석)" },
  // ── Operator ID ──
  { name: "maesil_total_operator_id", kind: "config", label: "maesil-total Operator ID",
    hint: "maesil-total DB의 내 operator_id (UUID) — Sales/Finance/Warehouse 에이전트에 필수" },
  { name: "maesil-insight_operator_id", kind: "config", label: "maesil-insight Operator ID",
    hint: "maesil-insight DB의 내 operator_id (UUID) — CS 에이전트에 필수" },
  // ── maesil-insight URL ──
  { name: "maesil_insight_supabase_url", kind: "config", label: "maesil-insight Supabase URL",
    hint: "Supabase 프로젝트 → Settings → API → Project URL (CS 에이전트 DB 접속용)" },
  { name: "maesil_insight_url", kind: "config", label: "maesil-insight 서비스 URL",
    hint: "예: https://maesil-insight.onrender.com (Tester 에이전트 하네스 API 호출용)" },
  // ── 재무센터: 스튜디오 매출 자동 집계 ──
  { name: "maesil_studio_supabase_url", kind: "config", label: "maesil-studio Supabase URL",
    hint: "스튜디오 Supabase → Settings → API → Project URL (재무센터 매출 자동 집계용)" },
  { name: "maesil_studio_service_role", kind: "supabase", label: "maesil-studio Service Role Key",
    hint: "스튜디오 Supabase → Settings → API → service_role (재무센터 매출 자동 집계용)" },
  { name: "harness_api_token", kind: "other", label: "Harness API Token",
    hint: "maesil-insight의 HARNESS_API_TOKEN 환경변수 값 (Tester 에이전트용)" },
  { name: "maesil_agency_url", kind: "config", label: "maesil-agency 서비스 URL",
    hint: "예: https://maesil-agency.onrender.com (인사이트→에이전시 GrowthAgent 호출용)" },
  { name: "agency_growth_token", kind: "other", label: "Growth API Token",
    hint: "인사이트 → 에이전시 GrowthAgent 연동 토큰. 에이전시 Render 환경변수 GROWTH_INTERNAL_TOKEN과 동일한 값" },
  // ── 영업 스캐너 ──
  { name: "youtube_api_key", kind: "other", label: "YouTube Data API v3 Key (1번)",
    hint: "Google Cloud Console → YouTube Data API v3 → 사용자 인증 정보 (키 1 / 하루 10,000 유닛)" },
  { name: "youtube_api_key_2", kind: "other", label: "YouTube Data API v3 Key (2번)",
    hint: "두 번째 Google Cloud 프로젝트 YouTube API 키 — 1번 할당량 소진 시 자동 전환" },
  { name: "youtube_api_key_3", kind: "other", label: "YouTube Data API v3 Key (3번)",
    hint: "세 번째 Google Cloud 프로젝트 YouTube API 키 — 2번 소진 시 자동 전환" },
  { name: "naver_client_id", kind: "other", label: "Naver Search API Client ID",
    hint: "developers.naver.com → 애플리케이션 등록 → 검색 API (네이버 블로그 스캐너)" },
  { name: "naver_client_secret", kind: "other", label: "Naver Search API Client Secret",
    hint: "Naver 개발자 센터 → 내 애플리케이션 → Client Secret (naver_client_id와 함께 사용)" },
  { name: "admin_email", kind: "config", label: "관리자 알림 이메일",
    hint: "영업 팔로업 알림 수신 이메일 (인스타DM·카페쪽지 수동 접촉 알림 + Gmail 회신 감지 알림)" },
  // ── Gmail 회신 추적 (선택) ──
  { name: "gmail_client_id", kind: "other", label: "Gmail OAuth Client ID (선택)",
    hint: "Google Cloud Console → OAuth 2.0 클라이언트 → Desktop 앱 (영업 이메일 회신 자동 감지)" },
  { name: "gmail_client_secret", kind: "other", label: "Gmail OAuth Client Secret (선택)",
    hint: "gmail_client_id와 쌍을 이루는 시크릿" },
  { name: "gmail_refresh_token", kind: "other", label: "Gmail Refresh Token (선택)",
    hint: "OAuth 인증 후 발급되는 refresh_token — 만료 없이 액세스 토큰 갱신에 사용" },
  { name: "gmail_from_email", kind: "config", label: "Gmail 발신 이메일 주소 (선택)",
    hint: "outreach 이메일 발송에 사용한 Gmail 주소 — 회신 추적의 기준점" },
  // ── 영업 발송용 Gmail (outreach_gmail_sender) ──
  { name: "outreach_gmail_client_id", kind: "other", label: "영업발송 Gmail Client ID",
    hint: "Google Cloud Console → OAuth 2.0 클라이언트 (데스크톱 앱) — 콜드메일 발송 전용" },
  { name: "outreach_gmail_client_secret", kind: "other", label: "영업발송 Gmail Client Secret",
    hint: "outreach_gmail_client_id와 쌍을 이루는 시크릿" },
  { name: "outreach_gmail_refresh_token", kind: "other", label: "영업발송 Gmail Refresh Token",
    hint: "OAuth 인증 후 발급되는 refresh_token — 영업 콜드메일 발송에 사용" },
  { name: "outreach_gmail_from", kind: "config", label: "영업발송 Gmail 발신자 주소",
    hint: "예: 매실 파트너십 <partner@maesil.net> — 콜드메일 발신자로 표시됨" },
  // ── 인프라 ──
  { name: "render_api", kind: "render", label: "Render API Token",
    hint: "Render Account Settings → API Keys (프로그램 상태 수집용)" },
  { name: "github_token", kind: "other", label: "GitHub Personal Access Token",
    hint: "github.com/settings/tokens → repo 권한 (코드 읽기/PR 생성/커밋용)" },
];

export default function SettingsPage() {
  const [secrets, setSecrets] = useState<SecretRow[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [err, setErr] = useState<string | null>(null);
  const [gmailWatchMsg, setGmailWatchMsg] = useState<string>("");
  const [gmailRun, setGmailRun] = useState<any>(null);
  const [gmailRunBusy, setGmailRunBusy] = useState<boolean>(false);

  // ── 유저 관리 상태 ──
  const [users, setUsers] = useState<UserRow[]>([]);
  const [newUser, setNewUser] = useState({ email: "", password: "", display_name: "", insight_operator_id: "" });
  const [userErr, setUserErr] = useState<string | null>(null);
  const [userOk, setUserOk] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Record<string, Partial<UserRow & { password: string }>>>({});

  // ── 팀원 초대 상태 ──
  const [inviteRole, setInviteRole]   = useState<"super_admin" | "customer">("super_admin");
  const [inviteLink, setInviteLink]   = useState<string | null>(null);
  const [inviteErr, setInviteErr]     = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

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

  const loadUsers = async () => {
    try {
      const rows = await apiFetch<UserRow[]>("/api/auth/users");
      setUsers(rows);
    } catch (e) { console.warn(e); }
  };

  useEffect(() => {
    if (hasToken()) {
      loadSecrets();
      loadPrograms();
      loadChannels();
      loadUsers();
    }
  }, []);

  // ── 팀원 초대 ──
  const createInvite = async () => {
    setInviteErr(null); setInviteLink(null); setInviteCopied(false);
    try {
      const res = await apiFetch<{ token: string; role: string; valid_until: string }>(
        "/api/auth/invites",
        { method: "POST", body: JSON.stringify({ role: inviteRole }) },
      );
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setInviteLink(`${origin}/join?token=${res.token}`);
    } catch (e) { setInviteErr((e as Error).message); }
  };

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  };

  // ── 유저 관리 CRUD ──
  const createUser = async () => {
    setUserErr(null); setUserOk(null);
    if (!newUser.email.trim() || !newUser.password.trim()) { setUserErr("이메일과 비밀번호를 입력하세요."); return; }
    try {
      await apiFetch("/api/auth/users", {
        method: "POST",
        body: JSON.stringify({
          email: newUser.email.trim(),
          password: newUser.password,
          role: "customer",
          display_name: newUser.display_name.trim() || null,
          insight_operator_id: newUser.insight_operator_id.trim() || null,
        }),
      });
      setNewUser({ email: "", password: "", display_name: "", insight_operator_id: "" });
      setUserOk("계정 생성 완료");
      loadUsers();
    } catch (e) { setUserErr((e as Error).message); }
  };

  const patchUser = async (id: string) => {
    const patch = editingUser[id] || {};
    setUserErr(null);
    try {
      await apiFetch(`/api/auth/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          display_name: patch.display_name ?? undefined,
          insight_operator_id: patch.insight_operator_id ?? undefined,
          is_active: patch.is_active ?? undefined,
          password: (patch as any).password || undefined,
        }),
      });
      setEditingUser({ ...editingUser, [id]: {} });
      loadUsers();
    } catch (e) { setUserErr((e as Error).message); }
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
    // 서비스 ID를 새로 입력하면 자동 활성화
    if (patch.host_service_id && patch.host_service_id.trim()) {
      patch.is_active = true;
    }
    try {
      await apiFetch(`/api/programs/${name}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setEditingProgram({ ...editingProgram, [name]: {} });
      loadPrograms();
    } catch (e) { setErr((e as Error).message); }
  };

  const toggleProgramActive = async (p: Program) => {
    try {
      await apiFetch(`/api/programs/${p.name}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !p.is_active }),
      });
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

  // 감시용 Gmail 재연결 — OAuth 흐름 시작 (gmail_refresh_token 재발급)
  const reconnectGmailWatch = async () => {
    setGmailWatchMsg("연결 시작 중…");
    try {
      const r = await apiFetch<{ auth_url: string }>("/api/oauth/gmail-watch/start", {}, 15000);
      if (!r?.auth_url) {
        setGmailWatchMsg("실패: 응답에 auth_url이 없습니다.");
        return;
      }
      setGmailWatchMsg("Google 동의 페이지로 이동합니다…");
      window.location.assign(r.auth_url);
    } catch (e) {
      setGmailWatchMsg("재연결 실패: " + (e as Error).message);
    }
  };

  // 지금 즉시 회신·반송 감시 1회 실행 (진단) — 스케줄러/플래그 무관
  // backfill=true 면 과거 전체 소급(반송 1년 창 + no_reply 리드까지 회신 복구)
  const runWatchNow = async (backfill = false) => {
    setGmailRunBusy(true);
    setGmailRun(null);
    try {
      const r = await apiFetch<any>(
        `/api/oauth/gmail-watch/run${backfill ? "?backfill=true" : ""}`,
        { method: "POST" },
        backfill ? 180000 : 60000,
      );
      setGmailRun(r);
    } catch (e) {
      setGmailRun({ error: (e as Error).message });
    } finally {
      setGmailRunBusy(false);
    }
  };

  const existing = (name: string) => secrets.find((s) => s.name === name);

  const currentUser = getUser();

  return (
    <div>
      <h1 style={{ margin: "0 0 1rem 0", fontSize: "1.3rem" }}>설정</h1>

      {currentUser && (
        <div className="card" style={{ marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1rem", flexShrink: 0 }}>
            {currentUser.display_name ? currentUser.display_name[0].toUpperCase() : "A"}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              {currentUser.display_name || currentUser.email}
              <span style={{ marginLeft: 8, fontSize: "0.7rem", background: "#0f172a", color: "#fff", padding: "1px 7px", borderRadius: 4 }}>
                {currentUser.role === "super_admin" ? "ADMIN" : "CUSTOMER"}
              </span>
            </div>
            <div className="muted" style={{ fontSize: "0.78rem" }}>{currentUser.email}</div>
          </div>
        </div>
      )}

      <h2 style={{ margin: "1.5rem 0 0.75rem 0", fontSize: "1.05rem" }}>시스템 키</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        각 외부 시스템(Render, 다른 Supabase 프로젝트, Anthropic 등) 접속 키를 등록합니다.
        여기서 저장한 값은 maesil-total DB <code>agent_work.secrets</code>에 저장되며, 백엔드만 조회합니다.
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
                  type={card.kind === "config" ? "text" : "password"}
                  value={inputs[card.name] || ""}
                  onChange={(e) => setInputs({ ...inputs, [card.name]: e.target.value })}
                  placeholder={ex ? (card.kind === "config" ? "(저장됨 · 덮어쓰려면 입력)" : "••••••••  (저장됨 · 덮어쓰려면 입력)") : "키 입력"}
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button className="btn primary" onClick={() => saveSecret(card)}>저장</button>
                <button className="btn" onClick={() => testSecret(card)} disabled={!ex}>연결 테스트</button>
                {card.name === "gmail_refresh_token" && (
                  <button className="btn" onClick={reconnectGmailWatch} title="Google 동의로 새 refresh_token 발급 (만료 복구)">
                    🔗 재연결
                  </button>
                )}
                {card.name === "gmail_refresh_token" && (
                  <button className="btn" onClick={() => runWatchNow(false)} disabled={gmailRunBusy}
                          title="스케줄러/ENABLE_GMAIL_WATCHER와 무관하게 지금 즉시 회신·반송 감시 1회 실행 (최근 창)">
                    {gmailRunBusy ? "실행 중…" : "▶ 지금 감시 실행"}
                  </button>
                )}
                {card.name === "gmail_refresh_token" && (
                  <button className="btn" onClick={() => runWatchNow(true)} disabled={gmailRunBusy}
                          title="과거 전체 소급: 반송 1년 창 + no_reply로 넘어간 리드까지 회신 복구 (시간 소요)">
                    {gmailRunBusy ? "실행 중…" : "🔁 전체 백필"}
                  </button>
                )}
              </div>
              {card.name === "gmail_refresh_token" && gmailWatchMsg && (
                <div className={`test-result show ${gmailWatchMsg.startsWith("재연결 실패") || gmailWatchMsg.startsWith("실패") ? "error" : "success"}`}>
                  {gmailWatchMsg}
                </div>
              )}
              {card.name === "gmail_refresh_token" && gmailRun && (
                <div className={`test-result show ${gmailRun.error || gmailRun.account_matches_from === false || gmailRun.watch_account?.ok === false ? "error" : "success"}`}
                     style={{ fontSize: "0.78rem", lineHeight: 1.6 }}>
                  {gmailRun.error ? (
                    <>실행 실패: {gmailRun.error}</>
                  ) : (
                    <>
                      <div>감시 계정: <strong>{gmailRun.watch_account?.ok ? gmailRun.watch_account.account : `조회 실패 — ${gmailRun.watch_account?.error}`}</strong></div>
                      {gmailRun.watch_account?.token_email && !gmailRun.watch_account?.ok && (
                        <div>토큰 소유 계정: <strong>{gmailRun.watch_account.token_email}</strong></div>
                      )}
                      {gmailRun.watch_account?.scopes && (
                        <div style={{ wordBreak: "break-all" }}>부여 스코프: <code style={{ fontSize: "0.72rem" }}>{gmailRun.watch_account.scopes}</code></div>
                      )}
                      {gmailRun.watch_account?.detail && !gmailRun.watch_account?.ok && (
                        <div style={{ wordBreak: "break-all", opacity: 0.85 }}>API 응답: <code style={{ fontSize: "0.72rem" }}>{gmailRun.watch_account.detail}</code></div>
                      )}
                      <div>발신 주소: {gmailRun.from_email || "(gmail_from_email 미설정 → 회신 검색 skip됨)"}</div>
                      {gmailRun.account_matches_from === false && (
                        <div style={{ fontWeight: 600 }}>⚠ 감시 계정 ≠ 발신 주소 — 이 수신함엔 회신이 없어 전부 놓칩니다. 발신 계정으로 재연결하세요.</div>
                      )}
                      {gmailRun.enable_gmail_watcher !== undefined && (
                        <div>스케줄러 자동감시(ENABLE_GMAIL_WATCHER): <strong>{gmailRun.enable_gmail_watcher ? "ON" : "OFF (Render 환경변수 필요)"}</strong></div>
                      )}
                      {gmailRun.note && (
                        <div style={{ marginTop: 4, fontWeight: 600 }}>{gmailRun.backfill ? "🔁 " : ""}{gmailRun.note}</div>
                      )}
                      {gmailRun.results && (
                        <>
                          <div style={{ marginTop: 4 }}>테넌트 {gmailRun.tenants_checked}곳 실행 결과:</div>
                          {gmailRun.results.map((r: any, i: number) => (
                            <div key={i} style={{ marginLeft: 8 }}>
                              · {r.tenant_id}: 회신 검사 {r.replies?.checked ?? "-"}건 / 감지 {r.replies?.found_replies ?? 0}건
                              {r.replies?.skipped ? ` (skip: ${r.replies.reason})` : ""}
                              {r.replies?.error ? ` (에러: ${r.replies.error})` : ""}
                              , 반송 {r.bounces?.bounces ?? 0}건/차단 {r.bounces?.blocked ?? 0}건
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
              {card.name === "gmail_refresh_token" && (
                <div className="muted" style={{ marginTop: "0.4rem", fontSize: "0.78rem", lineHeight: 1.5 }}>
                  ※ "연결 테스트"는 실제 감시 계정을 검증합니다 — 토큰을 갱신해 <strong>어느 Gmail 계정</strong>인지, 발신 주소와 일치하는지 확인합니다(불일치·만료 시 실패로 표시). 401 만료 시 <strong>재연결</strong>로 새 토큰을 받으세요.
                  Google OAuth 클라이언트는 <strong>웹 애플리케이션</strong> 타입 + 리디렉트 URI에
                  <code>{`{maesil_agency_url}/api/oauth/gmail-watch/callback`}</code> 등록 필요.
                </div>
              )}
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
          const isRender = (edit.host_provider ?? p.host_provider) === "render";
          const hasConnection = !!(p.host_service_id || p.health_url);
          const badgeClass = !hasConnection ? "unknown" : p.is_active ? "up" : "unknown";
          const badgeLabel = !hasConnection ? "미설정" : p.is_active ? "활성" : "비활성";
          return (
            <div key={p.name} className="card">
              <div className="card-header">
                <div className="card-title">{p.display_name || p.name}</div>
                <span className={`status-badge ${badgeClass}`}>{badgeLabel}</span>
              </div>
              <div className="muted" style={{ marginBottom: "0.75rem" }}>
                이름: <code>{p.name}</code> · 호스팅:&nbsp;
                <select
                  style={{ fontSize: "0.8rem", padding: "1px 4px" }}
                  value={edit.host_provider ?? p.host_provider ?? "render"}
                  onChange={(e) => setEditingProgram({ ...editingProgram, [p.name]: { ...edit, host_provider: e.target.value } })}
                >
                  <option value="render">Render</option>
                  <option value="github">GitHub</option>
                  <option value="vercel">Vercel</option>
                  <option value="self">자체 서버</option>
                  <option value="other">기타</option>
                </select>
              </div>
              {isRender && (
                <div className="config-field">
                  <label>Render 서비스 ID</label>
                  <input
                    type="text"
                    value={edit.host_service_id ?? p.host_service_id ?? ""}
                    onChange={(e) => setEditingProgram({ ...editingProgram, [p.name]: { ...edit, host_service_id: e.target.value } })}
                    placeholder="srv-xxxxxxxxxxxxxxxxxx"
                  />
                </div>
              )}
              <div className="config-field">
                <label>헬스 URL (선택)</label>
                <input
                  type="text"
                  value={edit.health_url ?? p.health_url ?? ""}
                  onChange={(e) => setEditingProgram({ ...editingProgram, [p.name]: { ...edit, health_url: e.target.value } })}
                  placeholder="https://example.com/health"
                />
              </div>
              <div className="config-field">
                <label>GitHub 레포 (선택)</label>
                <input
                  type="text"
                  value={(edit as any).github_repo ?? p.github_repo ?? ""}
                  onChange={(e) => setEditingProgram({ ...editingProgram, [p.name]: { ...edit, github_repo: e.target.value } })}
                  placeholder="fantasia44-netizen/maesil-total"
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button className="btn primary" disabled={!isDirty} onClick={() => saveProgram(p.name)}>저장</button>
                <button className="btn" onClick={() => testProgram(p.name)}>연결 테스트</button>
                {hasConnection && (
                  <button className="btn" onClick={() => toggleProgramActive(p)}>
                    {p.is_active ? "비활성화" : "활성화"}
                  </button>
                )}
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

      {/* ── 팀원 초대 ── */}
      <h2 style={{ margin: "2rem 0 0.5rem 0", fontSize: "1.05rem" }}>팀원 초대</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        초대 링크를 생성해 팀원에게 공유하세요. 링크는 7일간 유효하며 한 번만 사용 가능합니다.
      </p>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header"><div className="card-title">초대 링크 생성</div></div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          <div className="config-field" style={{ margin: 0, flex: "0 0 auto" }}>
            <label>역할</label>
            <select
              value={inviteRole}
              onChange={(e) => { setInviteRole(e.target.value as "super_admin" | "customer"); setInviteLink(null); }}
            >
              <option value="super_admin">관리자 (Admin) — 동일 권한</option>
              <option value="customer">고객 (Customer)</option>
            </select>
          </div>
          <button className="btn primary" onClick={createInvite} style={{ alignSelf: "flex-end" }}>
            초대 링크 생성
          </button>
        </div>

        {inviteErr && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "0.5rem 0.75rem", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            {inviteErr}
          </div>
        )}

        {inviteLink && (
          <div style={{ marginTop: "0.5rem" }}>
            <div style={{
              background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8,
              padding: "0.6rem 0.9rem", fontFamily: "monospace", fontSize: "0.78rem",
              wordBreak: "break-all", marginBottom: "0.5rem", color: "#0f172a",
            }}>
              {inviteLink}
            </div>
            <button className="btn primary" onClick={copyInviteLink}>
              {inviteCopied ? "✓ 복사됨" : "링크 복사"}
            </button>
          </div>
        )}
      </div>

      {/* ── 유저 관리 (super_admin 전용) ── */}
      <h2 style={{ margin: "2rem 0 0.5rem 0", fontSize: "1.05rem" }}>유저 관리</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        매실인사이트 고객 계정을 생성합니다. <code>insight_operator_id</code>는 해당 기업의 maesil-insight operator UUID입니다.
      </p>

      {userErr && (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c", marginBottom: "0.75rem" }}>{userErr}</div>
      )}
      {userOk && (
        <div className="card" style={{ borderColor: "#bbf7d0", background: "#f0fdf4", color: "#15803d", marginBottom: "0.75rem" }}>{userOk}</div>
      )}

      {/* 새 계정 생성 */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-header"><div className="card-title">새 고객 계정 추가</div></div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
          <div className="config-field">
            <label>이메일</label>
            <input type="email" value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="customer@company.com" />
          </div>
          <div className="config-field">
            <label>비밀번호</label>
            <input type="password" value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="8자 이상" />
          </div>
          <div className="config-field">
            <label>표시명</label>
            <input type="text" value={newUser.display_name}
              onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
              placeholder="예: 홍길동 대표" />
          </div>
          <div className="config-field">
            <label>insight Operator ID (UUID)</label>
            <input type="text" value={newUser.insight_operator_id}
              onChange={(e) => setNewUser({ ...newUser, insight_operator_id: e.target.value })}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </div>
        </div>
        <button className="btn primary" onClick={createUser}>계정 생성</button>
      </div>

      {/* 계정 목록 */}
      <div className="grid">
        {users.map((u) => {
          const edit = editingUser[u.id] || {};
          const isDirty = Object.keys(edit).length > 0;
          return (
            <div key={u.id} className="card">
              <div className="card-header">
                <div className="card-title" style={{ fontSize: "0.88rem" }}>{u.display_name || u.email}</div>
                <span className={`status-badge ${u.is_active ? "up" : "unknown"}`}>
                  {u.is_active ? "활성" : "비활성"}
                </span>
              </div>
              <div className="muted" style={{ marginBottom: "0.5rem", fontSize: "0.8rem" }}>
                {u.email} · <strong>{u.role}</strong>
                {u.last_login_at && (
                  <> · 최근 로그인: {new Date(u.last_login_at).toLocaleString("ko-KR")}</>
                )}
              </div>
              <div className="config-field">
                <label>표시명</label>
                <input type="text"
                  value={(edit as any).display_name ?? u.display_name ?? ""}
                  onChange={(e) => setEditingUser({ ...editingUser, [u.id]: { ...edit, display_name: e.target.value } })}
                />
              </div>
              <div className="config-field">
                <label>insight Operator ID</label>
                <input type="text"
                  value={(edit as any).insight_operator_id ?? u.insight_operator_id ?? ""}
                  onChange={(e) => setEditingUser({ ...editingUser, [u.id]: { ...edit, insight_operator_id: e.target.value } })}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                />
              </div>
              <div className="config-field">
                <label>새 비밀번호 (변경 시만)</label>
                <input type="password"
                  value={(edit as any).password ?? ""}
                  onChange={(e) => setEditingUser({ ...editingUser, [u.id]: { ...edit, password: e.target.value } })}
                  placeholder="변경하려면 입력"
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button className="btn primary" disabled={!isDirty} onClick={() => patchUser(u.id)}>저장</button>
                <button className="btn" onClick={() => {
                  setEditingUser({ ...editingUser, [u.id]: { ...edit, is_active: !u.is_active } });
                  patchUser(u.id);
                }}>
                  {u.is_active ? "비활성화" : "활성화"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
