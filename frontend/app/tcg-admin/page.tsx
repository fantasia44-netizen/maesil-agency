"use client";
// TCG Note(tcgnote.net) 관리 콘솔 — 에이전시 관리자 전용.
// 환경설정 상태 + 콘텐츠 구축 로드맵 + 라이브 사이트 바로가기. (트래픽 대시보드는 GA 연동 후 확장)
import Link from "next/link";
import { useEffect, useState } from "react";
import { isSuperAdmin, apiFetch, apiDownload } from "../../lib/api";
import TrafficChart, { DailyTable } from "../gbl-admin/TrafficChart";

// layout.tsx와 동일한 유효값(env 우선, 없으면 하드코딩 기본값 — 실제 배포 상태를 반영).
const ADS = process.env.NEXT_PUBLIC_TCG_ADSENSE_CLIENT || "";
const GA = process.env.NEXT_PUBLIC_TCG_GA_ID || "G-C069X6WZYT";
const NAVER = process.env.NEXT_PUBLIC_TCG_NAVER_VERIFY || "c691d37014d804696ee408a4d16333a3805bdd3f";
const BING = "CA02CE9D3CEFEBFDA1C1F4CAC49F2F2A"; // 하드코딩(layout)

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

// ── 라이브 트래픽·도구사용 대시보드 (1st-party 자체 계측) — gbl-admin과 같은 구성(지표 타일·라인차트·일별 표·상위 페이지/유입·언어별·공유) + tcg 전용 도구사용·페이지유형 ──
type Traffic = {
  days: number;
  summary: { pageviews: number; uniques: number; new_visitors: number; returning_visitors: number; sessions: number; avg_dwell: number; bounce_rate: number; shares: number; downloads: number; tool_events: number };
  active: { active_30m: number };
  daily: { day: string; pageviews: number; uniques: number; new_visitors: number; sessions: number }[];
  langs: { lang: string; pageviews: number; uniques: number; sessions: number }[];
  pages: { type: string; pageviews: number; uniques: number }[];
  tools: { event: string; count: number }[];
  paths: { path: string; views: number }[];
  refs: { ref: string; visitors?: number; views: number }[];
  shares: { label: string; shares: number; downloads: number; total: number }[];
  app?: { installs: number; installable: number; app_pageviews: number; direct_pageviews: number };
};

const TOOL_LABEL: Record<string, string> = {
  sim_run: "🎲 핸드심 실행", pack_open: "🎰 팩 오픈", deck_build: "🧱 덱 빌드·공유", counter_search: "🛡️ 카운터 검색",
};
const PAGE_LABEL: Record<string, string> = {
  home: "홈", tier: "티어표", meta: "메타 분석", decks: "덱 목록", "deck-detail": "덱 상세",
  "hand-sim": "핸드심", "pack-sim": "팩심", "deck-builder": "덱 빌더", counters: "카운터",
  guides: "가이드 목록", guide: "가이드", cards: "카드", other: "기타",
};
const LANG_LABEL: Record<string, string> = { ko: "🇰🇷 한국어", en: "🇺🇸 English", ja: "🇯🇵 日本語", "zh-TW": "🇹🇼 繁體中文" };
const LANG_COLOR: Record<string, string> = { ko: "#3b5bdb", en: "#0891b2", ja: "#db2777", "zh-TW": "#16a34a" };
// 공유·다운로드 카드 라벨(ShareCard trackLabel = "deck:<id>" · "counter:<id>" · "matchup:<id>" · "pack:<set>:<pack>" · "weekly-briefing") — 접두어로 유형 표시
const SHARE_PREFIX: Record<string, string> = { deck: "덱 상세 카드", counter: "카운터 결과", matchup: "매치업 카드", pack: "팩 추천 카드", "weekly-briefing": "주간 브리핑", "(기타)": "(기타·라벨없음)" };
const shareLabel = (raw: string) => { const [p, ...rest] = raw.split(":"); const base = SHARE_PREFIX[p] || p; return rest.length ? `${base} · ${rest.join(":")}` : base; };
const fmtDwell = (s: number) => { const t = Math.round(s || 0); return t >= 60 ? `${Math.floor(t / 60)}분 ${t % 60}초` : `${t}초`; };
const periodLabel = (d: number) => (d === 0 ? "오늘" : `${d}일`);

const BOX: React.CSSProperties = { background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "0.8rem" };
const BOX_H: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "#0f172a", marginBottom: 8 };

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

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "0.75rem 0.4rem", textAlign: "center" };

  return (
    <div style={{ marginBottom: "0.4rem" }}>
      {/* 헤더 — 제목 · 기간 선택기(오늘/7/30/60) · 실시간 활성 (gbl-admin과 동일 배치) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>📈 방문 통계 <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>(자체 집계)</span></span>
        <span style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
          {[0, 7, 30, 60].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              style={{ border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, borderRadius: 6, padding: "3px 10px",
                background: days === d ? "#dc2626" : "transparent", color: days === d ? "#fff" : "#64748b" }}>
              {periodLabel(d)}
            </button>
          ))}
        </span>
        {t && (
          <span style={{ marginLeft: "auto", fontSize: "0.78rem", fontWeight: 800, color: "#16a34a", background: "#dcfce7", borderRadius: 12, padding: "3px 12px" }}>
            🟢 실시간 활성 {t.active?.active_30m ?? 0}명 <span style={{ fontWeight: 500, color: "#4d7c53" }}>(30분)</span>
          </span>
        )}
      </div>

      {err && (
        <div style={{ fontSize: "0.78rem", color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
          트래픽 조회 실패: {err}<br />
          <span style={{ color: "#92400e" }}>→ Supabase에서 <code>backend/sql/077_tcg_visits.sql</code>를 실행했는지 확인하세요. 백엔드 배포 후 방문이 쌓이면 데이터가 나타납니다.</span>
        </div>
      )}

      {t && !err && (
        <>
          {/* 지표 타일 — gbl 9종 + tcg 전용 '도구 사용' */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(104px,1fr))", gap: 8, marginBottom: 12 }}>
            {[
              { l: "페이지뷰", v: t.summary.pageviews, c: "#3b5bdb" },
              { l: "전체방문자", v: t.summary.uniques, c: "#0f172a" },
              { l: "신규방문자", v: t.summary.new_visitors ?? 0, c: "#16a34a" },
              { l: "재방문자", v: t.summary.returning_visitors ?? 0, c: "#0891b2" },
              { l: "세션", v: t.summary.sessions, c: "#7c3aed" },
              { l: "평균 체류", v: fmtDwell(t.summary.avg_dwell ?? 0), c: "#059669" },
              { l: "이탈률", v: `${Math.round((t.summary.bounce_rate ?? 0) * 100)}%`, c: "#c2410c" },
              { l: "공유", v: t.summary.shares, c: "#db2777" },
              { l: "다운로드", v: t.summary.downloads, c: "#0891b2" },
              { l: "도구 사용", v: t.summary.tool_events, c: "#dc2626" },
              // PWA 설치·앱 실행(gbl과 동일 지표): 설치 완료 / 설치가능 노출 / 설치앱으로 본 뷰
              { l: "앱 설치", v: t.app?.installs ?? 0, c: "#16a34a" },
              { l: "설치가능 노출", v: t.app?.installable ?? 0, c: "#64748b" },
              { l: "앱 실행 뷰", v: t.app?.app_pageviews ?? 0, c: "#16a34a" },
            ].map((k) => (
              <div key={k.l} style={card}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: k.c }}>{k.v}</div>
                <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* 상세 데이터 다운로드 — 멀티시트 XLSX(요약·일별·언어별·페이지유형·도구사용·페이지·유입경로·공유) */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <button onClick={() => { setDlErr(""); apiDownload(`/api/tcg/admin/traffic/export?days=${days}`, `tcg-traffic-${days}d.xlsx`).catch((e) => setDlErr(String((e as Error)?.message || e))); }}
              style={{ fontSize: "0.78rem", fontWeight: 800, color: "#fff", background: "linear-gradient(90deg,#16a34a,#059669)", border: "none", borderRadius: 9, padding: "7px 16px", cursor: "pointer" }}>
              📥 전체 데이터 다운로드 (XLSX · {periodLabel(days)})
            </button>
            <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>시트 8개: 요약·일별·언어별·페이지유형·도구사용·페이지·유입경로·공유</span>
            {dlErr && <span style={{ fontSize: "0.7rem", color: "#dc2626" }}>다운로드 실패: {dlErr}</span>}
          </div>

          {/* 일별 라인차트 + 일별 표 (gbl과 같은 컴포넌트) */}
          {t.daily.length > 0 && <TrafficChart daily={t.daily} />}
          {t.daily.length > 0 && <DailyTable daily={t.daily} />}

          {/* 상위 페이지 · 유입 경로 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            <div style={BOX}>
              <div style={BOX_H}>상위 페이지 ({periodLabel(days)})</div>
              {t.paths.length === 0 ? <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>데이터 없음</div> : t.paths.slice(0, 8).map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: "0.76rem", padding: "3px 0" }}>
                  <span style={{ color: "#94a3b8", minWidth: 14 }}>{i + 1}</span>
                  <span style={{ flex: 1, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.path}</span>
                  <span style={{ fontWeight: 700, color: "#3b5bdb" }}>{p.views}</span>
                </div>
              ))}
            </div>
            <div style={BOX}>
              {/* 방문자 기준 — 세션의 첫 리퍼러로 귀속(gbl SQL 080과 동일 정의). 괄호 = 그 세션들의 페이지뷰 */}
              <div style={BOX_H}>유입 경로 ({periodLabel(days)}) <span style={{ fontWeight: 500, color: "#94a3b8" }}>· 방문자 (조회)</span></div>
              {t.refs.length === 0 ? <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>데이터 없음</div> : t.refs.slice(0, 8).map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: "0.76rem", padding: "3px 0" }}>
                  <span style={{ color: "#94a3b8", minWidth: 14 }}>{i + 1}</span>
                  <span style={{ flex: 1, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.ref}</span>
                  <span style={{ fontWeight: 700, color: "#7c3aed" }}>{r.visitors ?? r.views}</span>
                  {r.visitors != null && <span style={{ color: "#94a3b8", minWidth: 40, textAlign: "right" }}>({r.views})</span>}
                </div>
              ))}
            </div>
          </div>

          {/* 🧰 도구 사용 — tcg 전용(계산기 참여도). gbl의 '앱 설치' 자리 */}
          <div style={{ ...BOX, marginTop: 10 }}>
            <div style={BOX_H}>🧰 도구 사용 ({periodLabel(days)}) <span style={{ fontWeight: 500, color: "#94a3b8" }}>· 계산기 참여도</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
              {t.tools.map((x) => (
                <div key={x.event} style={{ background: "#fff", border: "1px solid #eef2f0", borderRadius: 10, padding: "0.7rem 0.85rem" }}>
                  <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#7c3aed" }}>{x.count.toLocaleString()}</div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{TOOL_LABEL[x.event] || x.event}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 📄 페이지 유형별 — tcg 전용 */}
          <div style={{ ...BOX, marginTop: 10 }}>
            <div style={BOX_H}>📄 페이지 유형별 ({periodLabel(days)}) <span style={{ fontWeight: 500, color: "#94a3b8" }}>· 페이지뷰 (방문자)</span></div>
            {t.pages.length === 0 ? <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>데이터 없음</div> : (() => {
              const mx = Math.max(...t.pages.map((p) => p.pageviews), 1);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {t.pages.slice(0, 12).map((p) => (
                    <div key={p.type} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem" }}>
                      <span style={{ minWidth: 92, color: "#334155", fontWeight: 600 }}>{PAGE_LABEL[p.type] || p.type}</span>
                      <div style={{ flex: 1, height: 12, background: "#eef2f8", borderRadius: 6, overflow: "hidden" }}>
                        <div style={{ width: `${(p.pageviews / mx) * 100}%`, height: "100%", background: "#dc2626", borderRadius: 6 }} />
                      </div>
                      <span style={{ minWidth: 88, textAlign: "right", color: "#64748b" }}><b style={{ color: "#0f172a" }}>{p.pageviews.toLocaleString()}</b> ({p.uniques})</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* 🌐 언어별 유입 (gbl과 동일 막대) */}
          <div style={{ ...BOX, marginTop: 10 }}>
            <div style={BOX_H}>🌐 언어별 유입 ({periodLabel(days)}) <span style={{ fontWeight: 500, color: "#94a3b8" }}>· 공개 페이지뷰</span></div>
            {t.langs.length === 0 ? <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>데이터 없음</div> : (() => {
              const totalPv = t.langs.reduce((a, l) => a + l.pageviews, 0) || 1;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {t.langs.map((l) => {
                    const pct = Math.round((l.pageviews / totalPv) * 100);
                    const c = LANG_COLOR[l.lang] || "#64748b";
                    return (
                      <div key={l.lang} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem" }}>
                        <span style={{ minWidth: 92, fontWeight: 700, color: "#0f172a" }}>{LANG_LABEL[l.lang] || l.lang}</span>
                        <div style={{ flex: 1, height: 12, background: "#eef2f8", borderRadius: 6, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: c, borderRadius: 6 }} />
                        </div>
                        <span style={{ fontWeight: 800, color: c, minWidth: 40, textAlign: "right" }}>{pct}%</span>
                        <span style={{ color: "#64748b", minWidth: 128, textAlign: "right", fontSize: "0.72rem" }}>PV {l.pageviews.toLocaleString()} · 방문 {l.uniques.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* 📤 카드 유형별 공유·다운로드 (gbl과 동일 막대) */}
          <div style={{ ...BOX, marginTop: 10 }}>
            <div style={BOX_H}>📤 카드 유형별 공유·다운로드 ({periodLabel(days)}) <span style={{ fontWeight: 500, color: "#94a3b8" }}>· 바이럴 주도 콘텐츠</span></div>
            {t.shares.length === 0 ? <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>아직 데이터 없음</div> : (() => {
              const mx = Math.max(...t.shares.map((s) => s.total), 1);
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {t.shares.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem" }}>
                      <span style={{ minWidth: 108, color: "#334155", fontWeight: 600 }}>{shareLabel(s.label)}</span>
                      <div style={{ flex: 1, height: 16, background: "#f1f5f9", borderRadius: 5, overflow: "hidden", display: "flex" }}>
                        <div style={{ width: `${(s.total / mx) * 100}%`, background: "linear-gradient(90deg,#0891b2,#db2777)", height: "100%" }} />
                      </div>
                      <span style={{ minWidth: 92, textAlign: "right", color: "#64748b" }}><b style={{ color: "#db2777" }}>📤{s.shares}</b> · <b style={{ color: "#0891b2" }}>💾{s.downloads}</b></span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
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
        <StatusRow label="Google Analytics" value={GA} ok={!!GA} />
        <StatusRow label="네이버 소유확인" value={NAVER ? "설정됨 (라이브 검증 통과)" : "미설정"} ok={!!NAVER} />
        <StatusRow label="Bing 소유확인" value="설정됨 (라이브 검증 통과)" ok={true} />
        <p style={{ margin: "10px 0 0", fontSize: "0.74rem", color: "#94a3b8", lineHeight: 1.5 }}>
          gbl과 분리된 별도 키 — gblnote AdSense/GA가 tcgnote로 새지 않음. GA·네이버·Bing은 layout에 하드코딩(기본값)이라 env 없이도 라이브 · AdSense는 Render env로 주입.
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
