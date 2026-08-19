// GBL 시즌 스케줄표 — 서버렌더 SEO. 시즌·컵 로테이션 일정(formats.ts 기반, 시즌마다 갱신).
import Link from "next/link";
import type { Metadata } from "next";
import { CORE_FORMATS, CUP_FORMATS, todayISO, type Format } from "../formats";

export const revalidate = 3600;

// 현재 시즌 정보(공식 기준, 새 시즌 시작 시 갱신)
const SEASON = { num: 27, name: "새로운 발걸음", start: "2026-06-02", end: "2026-09-09" };

export const metadata: Metadata = {
  title: "포켓몬고 GBL 시즌 일정 · 컵 로테이션 | GBL Note",
  description: `포켓몬 GO 배틀리그(GBL) 시즌${SEASON.num} '${SEASON.name}' 일정. 슈퍼·하이퍼·마스터리그와 주간 컵(스크롤컵·진화컵 등) 로테이션 스케줄을 한눈에.`,
  keywords: ["포켓몬고 GBL 일정", "배틀리그 시즌 일정", "GBL 컵 일정", "포켓몬고 리그 로테이션", `시즌${SEASON.num}`],
  alternates: { canonical: "/gbl/schedule" },
  openGraph: {
    title: `포켓몬고 GBL 시즌${SEASON.num} 일정 · 컵 로테이션`,
    description: "슈퍼·하이퍼·마스터 + 주간 컵 스케줄",
    url: "/gbl/schedule",
    images: ["/gbl-og.png"],
    type: "website",
  },
};

const CARD = "#ffffff";
const BORDER = "#e3e8f2";
const fmtD = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(m)}.${Number(d)}`;
};
const statusOf = (today: string, f: Format): "live" | "past" | "soon" => {
  if (!f.start || !f.end) return "live";
  if (today < f.start) return "soon";
  if (today >= f.end) return "past";
  return "live";
};
const ST = {
  live: { t: "진행 중", c: "#16a34a", bg: "#dcfce7" },
  soon: { t: "예정", c: "#3b5bdb", bg: "#e8eeff" },
  past: { t: "종료", c: "#94a3b8", bg: "#f1f5f9" },
};

export default function SchedulePage() {
  const today = todayISO();
  // 컵: 진행중 → 예정 → 종료 순, 각 그룹 내 날짜순
  const order = { live: 0, soon: 1, past: 2 };
  const cups = [...CUP_FORMATS].sort((a, b) => {
    const sa = statusOf(today, a), sb = statusOf(today, b);
    if (order[sa] !== order[sb]) return order[sa] - order[sb];
    return (b.start || "").localeCompare(a.start || "");
  });
  const liveCups = cups.filter((c) => statusOf(today, c) === "live");

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/gbl" style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href="/gbl/meta/master" style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>📊 실측 메타</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          포켓몬고 GBL 시즌 일정
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          <b style={{ color: "#334155" }}>시즌{SEASON.num} · {SEASON.name}</b> ({fmtD(SEASON.start)}~{fmtD(SEASON.end)}) 배틀리그 일정입니다.
          슈퍼·하이퍼·마스터 세 리그는 상시 열리고, 그 위에 <b style={{ color: "#334155" }}>주간 컵</b>이 로테이션됩니다.
        </p>

        {/* 현재 진행 중 */}
        <div style={{ marginTop: 14, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.9rem 1rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#16a34a", marginBottom: 8 }}>🟢 지금 열리는 포맷</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CORE_FORMATS.map((f) => (
              <span key={f.key} style={{ fontSize: "0.8rem", fontWeight: 700, color: "#3b5bdb", background: "#eef2ff", borderRadius: 14, padding: "5px 12px" }}>{f.label}</span>
            ))}
            {liveCups.map((f) => (
              <span key={f.key} style={{ fontSize: "0.8rem", fontWeight: 700, color: "#7c3aed", background: "#f3ecff", borderRadius: 14, padding: "5px 12px" }}>
                {f.label} <span style={{ fontSize: "0.7rem", color: "#a78bda" }}>~{f.end && fmtD(f.end)}</span>
              </span>
            ))}
          </div>
        </div>

        {/* 컵 로테이션 타임라인 */}
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "1.6rem 0 10px" }}>주간 컵 로테이션</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {cups.map((f) => {
            const s = statusOf(today, f);
            const st = ST[s];
            return (
              <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", opacity: s === "past" ? 0.7 : 1 }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: st.c, background: st.bg, borderRadius: 8, padding: "2px 8px", minWidth: 46, textAlign: "center" }}>{st.t}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0f172a" }}>{f.label}</div>
                  {f.note && <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 1 }}>{f.note}</div>}
                </div>
                {f.start && f.end && (
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>{fmtD(f.start)}~{fmtD(f.end)}</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 22, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>
            컵은 매주 바뀌며 특정 타입만 참가할 수 있는 경우가 많습니다(예: 스크롤컵 = 물·격투·악). 컵 진행 중에도 슈퍼·하이퍼·마스터리그는 그대로 열립니다.
            지금 리그에서 뭘 많이 만나는지는 <Link href="/gbl/meta/master" style={{ color: "#3b5bdb", fontWeight: 600 }}>실측 메타</Link>,
            강한 포켓몬은 <Link href="/gbl/tier/master" style={{ color: "#3b5bdb", fontWeight: 600 }}>티어표</Link>에서 확인하세요.
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href="/gbl/guide" style={{ color: "#64748b", textDecoration: "none" }}>가이드</Link> ·{" "}
          <Link href="/gbl/privacy" style={{ color: "#64748b", textDecoration: "none" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
