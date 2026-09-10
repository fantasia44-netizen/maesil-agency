"use client";
// TCG Note(tcgnote.net) 관리 콘솔 — 에이전시 관리자 전용.
// 환경설정 상태 + 콘텐츠 구축 로드맵 + 라이브 사이트 바로가기. (트래픽 대시보드는 GA 연동 후 확장)
import Link from "next/link";
import { useEffect, useState } from "react";
import { isSuperAdmin, apiFetch, apiDownload } from "../../lib/api";

const ADS = process.env.NEXT_PUBLIC_TCG_ADSENSE_CLIENT || "";
const GA = process.env.NEXT_PUBLIC_TCG_GA_ID || "";
const NAVER = process.env.NEXT_PUBLIC_TCG_NAVER_VERIFY || "";

const CARD: React.CSSProperties = { background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "1rem 1.2rem" };
const H2: React.CSSProperties = { margin: "0 0 10px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" };

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", padding: "5px 0", borderTop: "1px solid #f9e8e8" }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: ok ? "#16a34a" : "#cbd5e1", flexShrink: 0 }} />
      <span style={{ minWidth: 150, color: "#475569", fontWeight: 600 }}>{label}</span>
      <span style={{ color: ok ? "#0f172a" : "#94a3b8" }}>{value}</span>
    </div>
  );
}

// 콘텐츠 로드맵 — AdSense 통과용 "작지만 완성된 사이트" 20페이지 계획. status로 진척 관리.
const ROADMAP: { section: string; items: { t: string; status: "done" | "wip" | "todo" }[] }[] = [
  { section: "기초 (셸)", items: [
    { t: "랜딩(4개국어)", status: "done" },
    { t: "레이아웃·내비·i18n", status: "done" },
    { t: "미들웨어 도메인 라우팅", status: "done" },
    { t: "정책 페이지(개인정보·약관·소개)", status: "done" },
    { t: "sitemap.xml · robots.txt(호스트별)", status: "done" },
  ] },
  { section: "깊이 백본 (원본 분석)", items: [
    { t: "덱 티어표(대회 승률 기반)", status: "done" },
    { t: "메타 환경 분석", status: "done" },
    { t: "대표 덱 심층 공략 ×10", status: "done" },
  ] },
  { section: "도구·가이드", items: [
    { t: "카드 검색 도구", status: "done" },
    { t: "카운터 검색(상대 덱→이기는 덱)", status: "done" },
    { t: "팩 오픈 시뮬레이터(pullRates)", status: "done" },
    { t: "덱 빌더(20장·2카피·메타덱 시작·공유)", status: "done" },
    { t: "초보/전략 가이드(시작·덱선택·타입상성)", status: "done" },
  ] },
  { section: "데이터 파이프라인", items: [
    { t: "Limitless 대회 통계 인제스트(티어·매치업)", status: "done" },
    { t: "카드 데이터셋 인제스트(전 세트)", status: "done" },
    { t: "카드명 현지화(영→ko/ja/zh) 91%", status: "done" },
    { t: "롱테일 카드 페이지(승인 후 공개·noindex)", status: "todo" },
  ] },
];

const STATUS_LABEL = { done: "✅ 완료", wip: "🚧 진행", todo: "⬜ 예정" } as const;

const LOCALE_LINKS = [
  { label: "한국어", href: "/tcg" },
  { label: "English", href: "/en/tcg" },
  { label: "日本語", href: "/ja/tcg" },
  { label: "繁體中文", href: "/zh-TW/tcg" },
];

// ── 라이브 트래픽·도구사용 대시보드 (1st-party 자체 계측) ──────────────────
type Traffic = {
  days: number;
  summary: { pageviews: number; uniques: number; sessions: number; shares: number; downloads: number; tool_events: number };
  active: { active_30m: number };
  daily: { day: string; pageviews: number; uniques: number; sessions: number }[];
  langs: { lang: string; pageviews: number; uniques: number; sessions: number }[];
  pages: { type: string; pageviews: number; uniques: number }[];
  tools: { event: string; count: number }[];
  paths: { path: string; views: number }[];
  refs: { ref: string; views: number }[];
  shares: { label: string; shares: number; downloads: number; total: number }[];
};

const TOOL_LABEL: Record<string, string> = {
  sim_run: "🎲 핸드심 실행", pack_open: "🎰 팩 오픈", deck_build: "🧱 덱 빌드·공유", counter_search: "🛡️ 카운터 검색",
};
const PAGE_LABEL: Record<string, string> = {
  home: "홈", tier: "티어표", meta: "메타 분석", decks: "덱 목록", "deck-detail": "덱 상세",
  "hand-sim": "핸드심", "pack-sim": "팩심", "deck-builder": "덱 빌더", counters: "카운터",
  guides: "가이드 목록", guide: "가이드", cards: "카드", other: "기타",
};
const LANG_LABEL: Record<string, string> = { ko: "🇰🇷 한국어", en: "🇬🇧 English", ja: "🇯🇵 日本語", "zh-TW": "🇹🇼 繁體" };

function Tile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: "1 1 90px", background: "#fff", border: "1px solid #f1d5d5", borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontSize: "1.3rem", fontWeight: 900, color }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function TrafficSection() {
  const [t, setT] = useState<Traffic | null>(null);
  const [days, setDays] = useState(30);
  const [err, setErr] = useState("");
  const [dlErr, setDlErr] = useState("");

  useEffect(() => {
    setErr("");
    apiFetch<Traffic>(`/api/tcg/admin/traffic?days=${days}`, {}, 25000)
      .then(setT)
      .catch((e) => setErr(String((e as Error)?.message || e)));
  }, [days]);

  const maxDaily = Math.max(1, ...(t?.daily || []).map((d) => d.pageviews));

  return (
    <section style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <h2 style={{ ...H2, margin: 0 }}>📊 실시간 트래픽 · 도구사용 (자체 계측)</h2>
        {t && (
          <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "#16a34a", background: "#dcfce7", borderRadius: 12, padding: "3px 12px" }}>
            🟢 실시간 활성 {t.active?.active_30m ?? 0}명 <span style={{ fontWeight: 500, color: "#4d7c53" }}>(30분)</span>
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} style={{
              fontSize: "0.74rem", fontWeight: 700, padding: "4px 10px", borderRadius: 8, cursor: "pointer",
              border: "1px solid #fbd8d8", background: days === d ? "#dc2626" : "#fff", color: days === d ? "#fff" : "#b91c1c",
            }}>{d}일</button>
          ))}
        </div>
      </div>

      {err && (
        <div style={{ fontSize: "0.78rem", color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 10px" }}>
          트래픽 조회 실패: {err}<br />
          <span style={{ color: "#92400e" }}>→ Supabase에서 <code>backend/sql/077_tcg_visits.sql</code>를 실행했는지 확인하세요. 백엔드 배포 후 방문이 쌓이면 데이터가 나타납니다.</span>
        </div>
      )}

      {t && !err && (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <Tile label="페이지뷰" value={t.summary.pageviews} color="#dc2626" />
            <Tile label="순방문자" value={t.summary.uniques} color="#0f172a" />
            <Tile label="세션" value={t.summary.sessions} color="#0f172a" />
            <Tile label="도구 사용" value={t.summary.tool_events} color="#7c3aed" />
            <Tile label="공유" value={t.summary.shares} color="#0891b2" />
          </div>

          {/* 도구 사용 — tcg 특화 지표 */}
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#334155", margin: "6px 0 6px" }}>🧰 도구 사용 (계산기 참여도)</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {t.tools.map((x) => (
              <div key={x.event} style={{ flex: "1 1 120px", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#7c3aed" }}>{x.count.toLocaleString()}</div>
                <div style={{ fontSize: "0.72rem", color: "#6b21a8" }}>{TOOL_LABEL[x.event] || x.event}</div>
              </div>
            ))}
          </div>

          {/* 일별 추이(막대) */}
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#334155", margin: "6px 0 6px" }}>📅 일별 페이지뷰</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 90, marginBottom: 14, overflowX: "auto" }}>
            {(t.daily || []).map((d) => (
              <div key={d.day} title={`${d.day} · ${d.pageviews}pv · ${d.uniques}명`} style={{ flex: "1 0 8px", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
                <div style={{ width: "100%", maxWidth: 18, height: `${Math.round((d.pageviews / maxDaily) * 76)}px`, minHeight: d.pageviews ? 2 : 0, background: "#dc2626", borderRadius: "3px 3px 0 0" }} />
              </div>
            ))}
            {(!t.daily || t.daily.length === 0) && <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>아직 방문 데이터가 없습니다.</span>}
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {/* 페이지 유형별 */}
            <div style={{ flex: "1 1 240px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#334155", marginBottom: 6 }}>📄 페이지 유형별</div>
              {t.pages.slice(0, 10).map((p) => (
                <div key={p.type} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", padding: "3px 0", borderTop: "1px solid #f9e8e8" }}>
                  <span style={{ color: "#475569" }}>{PAGE_LABEL[p.type] || p.type}</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{p.pageviews.toLocaleString()} <span style={{ fontWeight: 400, color: "#94a3b8" }}>({p.uniques})</span></span>
                </div>
              ))}
            </div>
            {/* 언어별 */}
            <div style={{ flex: "1 1 240px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#334155", marginBottom: 6 }}>🌐 언어별</div>
              {t.langs.map((l) => (
                <div key={l.lang} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", padding: "3px 0", borderTop: "1px solid #f9e8e8" }}>
                  <span style={{ color: "#475569" }}>{LANG_LABEL[l.lang] || l.lang}</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{l.pageviews.toLocaleString()} <span style={{ fontWeight: 400, color: "#94a3b8" }}>({l.uniques})</span></span>
                </div>
              ))}
            </div>
            {/* 유입경로 */}
            <div style={{ flex: "1 1 240px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#334155", marginBottom: 6 }}>🔗 유입 경로 (referrer)</div>
              {t.refs.slice(0, 8).map((r) => (
                <div key={r.ref} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", padding: "3px 0", borderTop: "1px solid #f9e8e8" }}>
                  <span style={{ color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{r.ref}</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{r.views.toLocaleString()}</span>
                </div>
              ))}
              {t.refs.length === 0 && <div style={{ fontSize: "0.76rem", color: "#94a3b8", padding: "3px 0" }}>직접 유입뿐</div>}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
            <button onClick={() => { setDlErr(""); apiDownload(`/api/tcg/admin/traffic/export?days=${days}`, `tcg-traffic-${days}d.xlsx`).catch((e) => setDlErr(String((e as Error)?.message || e))); }}
              style={{ fontSize: "0.78rem", fontWeight: 700, color: "#dc2626", background: "#fee6e6", border: "1px solid #fbd8d8", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
              ⬇️ XLSX 내보내기 ({days}일)
            </button>
            {dlErr && <span style={{ fontSize: "0.74rem", color: "#dc2626" }}>{dlErr}</span>}
          </div>
        </>
      )}
    </section>
  );
}

export default function TcgAdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => { setAllowed(isSuperAdmin()); }, []);

  if (allowed === null) return null;
  if (!allowed) return <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>권한이 없습니다.</div>;

  const total = ROADMAP.flatMap((s) => s.items).length;
  const done = ROADMAP.flatMap((s) => s.items).filter((i) => i.status === "done").length;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1rem 4rem", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ margin: "0 0 4px", fontSize: "1.4rem", fontWeight: 900, color: "#b91c1c" }}>🎴 TCG Note 관리</h1>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
          tcgnote.net · 포켓몬 카드 게임 Pocket · 진척 {done}/{total} 페이지
        </p>
      </div>

      <TrafficSection />

      <section style={CARD}>
        <h2 style={H2}>⚙️ 환경설정 (도메인 배포 시 Render env 설정)</h2>
        <StatusRow label="AdSense (TCG)" value={ADS ? ADS : "NEXT_PUBLIC_TCG_ADSENSE_CLIENT 미설정"} ok={!!ADS} />
        <StatusRow label="Google Analytics" value={GA ? GA : "NEXT_PUBLIC_TCG_GA_ID 미설정"} ok={!!GA} />
        <StatusRow label="네이버 소유확인" value={NAVER ? "설정됨" : "NEXT_PUBLIC_TCG_NAVER_VERIFY 미설정"} ok={!!NAVER} />
        <p style={{ margin: "10px 0 0", fontSize: "0.74rem", color: "#94a3b8", lineHeight: 1.5 }}>
          gbl과 분리된 별도 키 — gblnote AdSense/GA가 tcgnote로 새지 않음. 미설정 시 해당 코드는 아예 노출되지 않아 안전.
        </p>
      </section>

      <section style={CARD}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2 style={{ ...H2, margin: 0 }}>🗺️ 콘텐츠 로드맵 (AdSense용 "작지만 완성된 20페이지")</h2>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#dc2626" }}>{done}/{total}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ROADMAP.map((s) => (
            <div key={s.section}>
              <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#334155", marginBottom: 4 }}>{s.section}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {s.items.map((it) => (
                  <div key={it.t} style={{ fontSize: "0.83rem", color: "#475569", display: "flex", gap: 8 }}>
                    <span style={{ minWidth: 52 }}>{STATUS_LABEL[it.status]}</span>
                    <span>{it.t}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: "12px 0 0", fontSize: "0.74rem", color: "#94a3b8", lineHeight: 1.5 }}>
          원칙: 공개 페이지는 100% 깊이 페이지만. 카드별 롱테일 수백 개는 승인 후 공개(그 전엔 noindex). 도감 함정 재현 금지.
        </p>
      </section>

      <section style={CARD}>
        <h2 style={H2}>🔗 라이브 사이트 (로케일별)</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {LOCALE_LINKS.map((l) => (
            <Link key={l.href} href={l.href} target="_blank" style={{
              fontSize: "0.82rem", fontWeight: 700, color: "#dc2626", textDecoration: "none",
              background: "#fee6e6", borderRadius: 8, padding: "6px 12px",
            }}>{l.label} ↗</Link>
          ))}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: "0.74rem", color: "#94a3b8" }}>
          로컬: /tcg 로 접속. 배포 후: tcgnote.net (미들웨어가 호스트→/tcg 라우팅).
        </p>
      </section>
    </div>
  );
}
