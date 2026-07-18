"use client";

import { useEffect, useState } from "react";
import { apiFetch, getUser } from "../../../lib/api";

const GREEN = "#1A6F3C";

const card: React.CSSProperties = {
  background: "#fff", border: "1px solid #eef2f0", borderRadius: 14,
  padding: "1.4rem 1.5rem", marginBottom: "1.2rem",
};
const label: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: 5, color: "#374151",
};
const input: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.7rem", border: "1px solid #e2e8f0",
  borderRadius: 8, fontSize: "0.88rem", outline: "none", boxSizing: "border-box",
};
const btn = (primary = true): React.CSSProperties => ({
  padding: "0.55rem 1.1rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700,
  border: primary ? "none" : "1px solid #e2e8f0",
  background: primary ? GREEN : "#fff", color: primary ? "#fff" : "#334155", cursor: "pointer",
});

type Config = {
  cold_drip_enabled: boolean; daily_cap: number; drip_grades: string;
  send_start_hour: number; send_end_hour: number; timezone: string;
  keywords_youtube: string[] | null; keywords_naver: string[] | null;
};
type GmailStatus = { client_id: boolean; client_secret: boolean; refresh_token: boolean; from_addr: string | null };

export default function CustomerOutreachSettings() {
  const [toast, setToast] = useState("");
  const [cfg, setCfg] = useState<Config | null>(null);
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [keys, setKeys] = useState<Record<string, boolean>>({});

  // 폼 입력값
  const [gClientId, setGClientId] = useState("");
  const [gClientSecret, setGClientSecret] = useState("");
  const [gFrom, setGFrom] = useState("");
  const [ytKey, setYtKey] = useState("");
  const [nvId, setNvId] = useState("");
  const [nvSecret, setNvSecret] = useState("");
  const [anthKey, setAnthKey] = useState("");
  const [kwYoutube, setKwYoutube] = useState("");
  const [kwNaver, setKwNaver] = useState("");

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  async function load() {
    try {
      const [c, g, k] = await Promise.all([
        apiFetch<Config>("/api/outreach/config", {}, 15000),
        apiFetch<GmailStatus>("/api/outreach/gmail-secrets", {}, 15000),
        apiFetch<Record<string, boolean>>("/api/outreach/platform-keys", {}, 15000),
      ]);
      setCfg(c); setGmail(g); setKeys(k);
      setGFrom(g.from_addr || "");
      setKwYoutube((c.keywords_youtube || []).join(", "));
      setKwNaver((c.keywords_naver || []).join(", "));
    } catch (e) {
      flash(e instanceof Error ? e.message : "불러오기 실패");
    }
  }
  useEffect(() => { load(); }, []);

  async function saveGmailSecrets() {
    try {
      await apiFetch("/api/outreach/gmail-secrets", {
        method: "PUT",
        body: JSON.stringify({ client_id: gClientId || undefined, client_secret: gClientSecret || undefined, from_addr: gFrom || undefined }),
      }, 15000);
      setGClientId(""); setGClientSecret("");
      flash("Gmail 정보 저장됨"); load();
    } catch (e) { flash(e instanceof Error ? e.message : "저장 실패"); }
  }

  async function connectGmail() {
    try {
      const r = await apiFetch<{ auth_url: string }>("/api/oauth/gmail/start", {}, 15000);
      window.location.href = r.auth_url;
    } catch (e) { flash(e instanceof Error ? e.message : "연결 시작 실패 (client_id/secret 먼저 저장)"); }
  }

  // 콜드메일 발송 파이프라인 테스트 — 본인 주소로 샘플 1통 (실제 리드 안 건드림)
  async function testSendMail() {
    const dflt = getUser()?.email || "";
    const to = (window.prompt("테스트 메일을 받을 주소 (본인 이메일 권장)", dflt) || "").trim();
    if (!to) return;
    flash("발송 중…");
    try {
      const r = await apiFetch<{ ok: boolean; to: string }>(
        `/api/outreach/test-send?to=${encodeURIComponent(to)}`, { method: "POST" }, 30000);
      flash(`✅ 발송 성공 → ${r.to} (메일함 확인)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "발송 실패";
      window.alert("❌ 콜드메일 발송 실패\n\n" + msg + "\n\n(invalid_grant/인증 실패면 영업발송 Gmail 재연결 필요)");
    }
  }

  async function savePlatformKeys() {
    try {
      await apiFetch("/api/outreach/platform-keys", {
        method: "PUT",
        body: JSON.stringify({
          youtube_api_key: ytKey || undefined,
          naver_client_id: nvId || undefined,
          naver_client_secret: nvSecret || undefined,
          anthropic_api_key: anthKey || undefined,
        }),
      }, 15000);
      setYtKey(""); setNvId(""); setNvSecret(""); setAnthKey("");
      flash("플랫폼 키 저장됨"); load();
    } catch (e) { flash(e instanceof Error ? e.message : "저장 실패"); }
  }

  async function saveConfig(patch: Partial<Config> & { keywords_youtube?: string[]; keywords_naver?: string[] }) {
    try {
      await apiFetch("/api/outreach/config", { method: "PUT", body: JSON.stringify(patch) }, 15000);
      flash("설정 저장됨"); load();
    } catch (e) { flash(e instanceof Error ? e.message : "저장 실패"); }
  }

  const toArr = (s: string) => s.split(/[,\n]/).map(x => x.trim()).filter(Boolean);
  const dot = (ok: boolean) => (
    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: ok ? GREEN : "#94a3b8" }}>
      {ok ? "● 설정됨" : "○ 미설정"}
    </span>
  );

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 4 }}>영업 설정</h1>
      <p className="muted" style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" }}>
        Gmail 연결 → 키워드·키 설정 → 자동발송 켜기. 3단계만 하면 AI가 알아서 돕니다.
      </p>

      {toast && (
        <div style={{
          position: "fixed", top: 16, right: 16, background: "#0f172a", color: "#fff",
          padding: "0.6rem 1rem", borderRadius: 8, fontSize: "0.83rem", zIndex: 50,
        }}>{toast}</div>
      )}

      {/* 1. Gmail 연결 */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <strong>1. Gmail 연결 (발송 계정)</strong>
          {gmail && dot(gmail.refresh_token)}
        </div>
        <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 12, lineHeight: 1.6 }}>
          Google Cloud Console에서 OAuth 클라이언트를 만들고 client_id/secret을 저장한 뒤
          "Gmail 연결"을 누르면 본인 메일함으로 발송됩니다.
        </p>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>Client ID {gmail && dot(gmail.client_id)}</label>
          <input style={input} value={gClientId} onChange={e => setGClientId(e.target.value)} placeholder={gmail?.client_id ? "(저장됨 · 덮어쓰려면 입력)" : "client_id"} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>Client Secret {gmail && dot(gmail.client_secret)}</label>
          <input style={input} type="password" value={gClientSecret} onChange={e => setGClientSecret(e.target.value)} placeholder={gmail?.client_secret ? "(저장됨)" : "client_secret"} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={label}>발신 주소 (예: 내이름 &lt;me@gmail.com&gt;)</label>
          <input style={input} value={gFrom} onChange={e => setGFrom(e.target.value)} placeholder="발신자 표시" />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={btn(false)} onClick={saveGmailSecrets}>정보 저장</button>
          <button style={btn(true)} onClick={connectGmail}>🔗 Gmail 연결하기</button>
          <button style={btn(false)} onClick={testSendMail} title="본인 주소로 샘플 1통 — 콜드메일 발송 정상 여부 즉시 확인">✉️ 테스트 발송</button>
        </div>
      </div>

      {/* 2. 플랫폼 키 */}
      <div style={card}>
        <strong>2. 발굴 플랫폼 키</strong>
        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "6px 0 12px", lineHeight: 1.6 }}>
          YouTube/Naver 검색 API 키, 분석용 Anthropic 키. 본인 키를 넣으면 할당량·비용이 분리됩니다.
        </p>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>YouTube API Key {dot(!!keys.youtube_api_key)}</label>
          <input style={input} value={ytKey} onChange={e => setYtKey(e.target.value)} placeholder={keys.youtube_api_key ? "(저장됨)" : "AIza..."} />
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Naver Client ID {dot(!!keys.naver_client_id)}</label>
            <input style={input} value={nvId} onChange={e => setNvId(e.target.value)} placeholder={keys.naver_client_id ? "(저장됨)" : "naver_id"} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Naver Secret {dot(!!keys.naver_client_secret)}</label>
            <input style={input} type="password" value={nvSecret} onChange={e => setNvSecret(e.target.value)} placeholder={keys.naver_client_secret ? "(저장됨)" : "naver_secret"} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={label}>Anthropic API Key {dot(!!keys.anthropic_api_key)}</label>
          <input style={input} type="password" value={anthKey} onChange={e => setAnthKey(e.target.value)} placeholder={keys.anthropic_api_key ? "(저장됨)" : "sk-ant-..."} />
        </div>
        <button style={btn(false)} onClick={savePlatformKeys}>키 저장</button>
      </div>

      {/* 3. 타겟 키워드 */}
      <div style={card}>
        <strong>3. 타겟 키워드</strong>
        <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "6px 0 12px" }}>
          찾고 싶은 채널 키워드 (쉼표/줄바꿈 구분). 비우면 기본 키워드 사용.
        </p>
        <div style={{ marginBottom: 10 }}>
          <label style={label}>YouTube 키워드</label>
          <textarea style={{ ...input, minHeight: 60, fontFamily: "inherit" }} value={kwYoutube} onChange={e => setKwYoutube(e.target.value)} placeholder="스마트스토어, 쿠팡 셀러, ..." />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={label}>Naver 블로그 키워드</label>
          <textarea style={{ ...input, minHeight: 60, fontFamily: "inherit" }} value={kwNaver} onChange={e => setKwNaver(e.target.value)} placeholder="이유식, 육아용품, ..." />
        </div>
        <button style={btn(false)} onClick={() => saveConfig({ keywords_youtube: toArr(kwYoutube), keywords_naver: toArr(kwNaver) })}>키워드 저장</button>
      </div>

      {/* 4. 발송 설정 + 켜기 */}
      {cfg && (
        <div style={card}>
          <strong>4. 발송 설정</strong>
          <div style={{ display: "flex", gap: 12, margin: "12px 0", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={label}>하루 발송 한도</label>
              <input style={input} type="number" value={cfg.daily_cap} onChange={e => setCfg({ ...cfg, daily_cap: Number(e.target.value) })} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={label}>대상 등급</label>
              <input style={input} value={cfg.drip_grades} onChange={e => setCfg({ ...cfg, drip_grades: e.target.value })} placeholder="S,A,B,C" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label style={label}>시작 시각</label>
              <input style={input} type="number" value={cfg.send_start_hour} onChange={e => setCfg({ ...cfg, send_start_hour: Number(e.target.value) })} />
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <label style={label}>종료 시각</label>
              <input style={input} type="number" value={cfg.send_end_hour} onChange={e => setCfg({ ...cfg, send_end_hour: Number(e.target.value) })} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={label}>타임존</label>
              <input style={input} value={cfg.timezone} onChange={e => setCfg({ ...cfg, timezone: e.target.value })} placeholder="Asia/Seoul" />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: "0.9rem", fontWeight: 600 }}>
            <input type="checkbox" checked={cfg.cold_drip_enabled} onChange={e => setCfg({ ...cfg, cold_drip_enabled: e.target.checked })} />
            자동 콜드메일 발송 켜기 {cfg.cold_drip_enabled ? "🟢" : "⚪"}
          </label>
          <button style={btn(true)} onClick={() => saveConfig({
            daily_cap: cfg.daily_cap, drip_grades: cfg.drip_grades,
            send_start_hour: cfg.send_start_hour, send_end_hour: cfg.send_end_hour,
            timezone: cfg.timezone, cold_drip_enabled: cfg.cold_drip_enabled,
          })}>발송 설정 저장</button>
        </div>
      )}
    </div>
  );
}
