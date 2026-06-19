"use client";

import { useEffect, useState } from "react";
import { apiFetch, getUser } from "../../lib/api";

const GREEN = "#1A6F3C";

type Plan = { name: string; price: number; daily_cap_max: number; lead_cap: number };
type Status = {
  plan: string | null; tenant_status: string | null; trial_ends_at: string | null;
  portone_configured: boolean;
  subscription: { status: string; plan: string | null; card_info: { number?: string; issuer?: string } | null;
    billing_key_set: boolean; current_period_end: string | null; amount: number | null };
};
type PoCfg = { store_id: string; channel_card: string; channel_kakao: string; configured: boolean };

declare global { interface Window { PortOne?: { requestIssueBillingKey: (p: Record<string, unknown>) => Promise<{ code?: string; message?: string; billingKey?: string }> } } }

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function BillingPage() {
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [status, setStatus] = useState<Status | null>(null);
  const [poCfg, setPoCfg] = useState<PoCfg | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  async function load() {
    try {
      const [p, s, c] = await Promise.all([
        apiFetch<{ plans: Record<string, Plan> }>("/api/billing/plans", {}, 15000),
        apiFetch<Status>("/api/billing/status", {}, 15000),
        apiFetch<PoCfg>("/api/billing/portone-config", {}, 15000),
      ]);
      setPlans(p.plans); setStatus(s); setPoCfg(c);
    } catch (e) { flash(e instanceof Error ? e.message : "불러오기 실패"); }
  }

  useEffect(() => {
    if (!document.getElementById("portone-sdk")) {
      const s = document.createElement("script");
      s.id = "portone-sdk"; s.src = "https://cdn.portone.io/v2/browser-sdk.js"; s.async = true;
      document.body.appendChild(s);
    }
    load();
  }, []);

  async function registerCard() {
    if (!window.PortOne) { flash("결제 SDK 로딩 중… 잠시 후 다시 시도하세요."); return; }
    if (!poCfg?.store_id || !poCfg?.channel_card) { flash("결제 설정 미완료 (관리자 문의)"); return; }
    setBusy(true);
    try {
      const u = getUser();
      const res = await window.PortOne.requestIssueBillingKey({
        storeId: poCfg.store_id, channelKey: poCfg.channel_card,
        issueId: "issue_" + Date.now(),
        issueName: "maesil-agency 구독 카드 등록",
        customer: { customerId: u?.tenant_id || u?.email || "", fullName: u?.display_name || "" },
        billingKeyMethod: "CARD",
        redirectUrl: window.location.href,
      });
      if (res.code) { if (res.code !== "USER_CANCEL") flash("카드 등록 실패: " + (res.message || res.code)); return; }
      await apiFetch("/api/billing/billing-key/save", {
        method: "POST", body: JSON.stringify({ billing_key: res.billingKey, pg: "card" }),
      }, 20000);
      flash("카드 등록 완료!"); load();
    } catch (e) { flash(e instanceof Error ? e.message : "오류"); }
    finally { setBusy(false); }
  }

  async function subscribe(plan: string) {
    if (!status?.subscription.billing_key_set) { flash("먼저 결제수단(카드)을 등록하세요."); return; }
    if (!confirm(`${plans[plan].name} 플랜 ${won(plans[plan].price)}/월로 구독하시겠습니까?`)) return;
    setBusy(true);
    try {
      await apiFetch("/api/billing/subscribe", { method: "POST", body: JSON.stringify({ plan }) }, 30000);
      flash("구독이 시작됐습니다!"); load();
    } catch (e) { flash(e instanceof Error ? e.message : "결제 실패"); }
    finally { setBusy(false); }
  }

  async function cancelSub() {
    if (!confirm("구독을 해지하시겠습니까? 현재 기간 종료까지는 사용 가능합니다.")) return;
    try {
      await apiFetch("/api/billing/cancel", { method: "POST" }, 15000);
      flash("구독 해지 예약됨"); load();
    } catch (e) { flash(e instanceof Error ? e.message : "해지 실패"); }
  }

  const sub = status?.subscription;
  const card: React.CSSProperties = { background: "#fff", border: "1px solid #eef2f0", borderRadius: 14, padding: "1.4rem 1.5rem", marginBottom: "1.2rem" };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 4 }}>요금제 · 결제</h1>
      <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1.5rem" }}>
        카드를 등록하고 플랜을 선택하면 매월 자동 결제됩니다.
      </p>

      {msg && <div style={{ position: "fixed", top: 16, right: 16, background: "#0f172a", color: "#fff", padding: "0.6rem 1rem", borderRadius: 8, fontSize: "0.83rem", zIndex: 50 }}>{msg}</div>}

      {/* 현재 상태 */}
      <div style={card}>
        <strong>현재 상태</strong>
        <div style={{ marginTop: 10, fontSize: "0.9rem", color: "#334155", lineHeight: 1.9 }}>
          <div>플랜: <b>{status?.plan === "internal" ? "내부" : status?.plan === "trial" ? "무료체험" : (status?.plan && plans[status.plan]?.name) || status?.plan || "-"}</b>
            {status?.plan === "trial" && status?.trial_ends_at && <span style={{ color: "#b45309", marginLeft: 6, fontSize: "0.82rem" }}>~{status.trial_ends_at.slice(0, 10)}</span>}
          </div>
          <div>구독: <b>{({ none: "없음", active: "🟢 이용중", canceled: "해지예약", past_due: "🔴 결제실패", ended: "종료" } as Record<string, string>)[sub?.status || "none"] || sub?.status}</b></div>
          {sub?.card_info?.number && <div>카드: {sub.card_info.issuer || ""} {sub.card_info.number}</div>}
          {sub?.current_period_end && sub.status === "active" && <div>다음 결제: {sub.current_period_end.slice(0, 10)}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button disabled={busy} onClick={registerCard} style={{ padding: "0.55rem 1.1rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, background: "#fff", border: "1px solid #e2e8f0", cursor: "pointer" }}>
            {sub?.billing_key_set ? "💳 카드 변경" : "💳 카드 등록"}
          </button>
          {sub?.status === "active" && (
            <button onClick={cancelSub} style={{ padding: "0.55rem 1.1rem", borderRadius: 8, fontSize: "0.85rem", color: "#dc2626", background: "#fff", border: "1px solid #fecaca", cursor: "pointer" }}>구독 해지</button>
          )}
        </div>
        {!poCfg?.configured && <div style={{ marginTop: 10, fontSize: "0.78rem", color: "#b45309" }}>⚠️ 결제 시스템(PortOne) 미설정 — 관리자가 설정해야 결제됩니다.</div>}
      </div>

      {/* 플랜 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        {Object.entries(plans).map(([key, p]) => {
          const current = status?.plan === key && sub?.status === "active";
          return (
            <div key={key} style={{ ...card, marginBottom: 0, borderColor: current ? GREEN : "#eef2f0", borderWidth: current ? 2 : 1 }}>
              <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{p.name}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: GREEN, margin: "0.4rem 0" }}>{won(p.price)}<span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: 500 }}>/월</span></div>
              <ul style={{ margin: "0.6rem 0 1rem", paddingLeft: 18, fontSize: "0.85rem", color: "#475569", lineHeight: 1.9 }}>
                <li>하루 발송 최대 {p.daily_cap_max}건</li>
                <li>리드 {p.lead_cap.toLocaleString()}개</li>
                <li>자동 발굴·발송·팔로업</li>
              </ul>
              <button disabled={busy || current} onClick={() => subscribe(key)} style={{
                width: "100%", padding: "0.65rem", borderRadius: 8, fontSize: "0.9rem", fontWeight: 700,
                border: "none", cursor: current ? "default" : "pointer",
                background: current ? "#e2e8f0" : GREEN, color: current ? "#64748b" : "#fff",
              }}>{current ? "이용 중" : "이 플랜 구독"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
