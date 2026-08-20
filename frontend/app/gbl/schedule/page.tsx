// GBL 시즌 스케줄표 — 서버렌더 SEO. 공식 리그 로테이션 일정(formats.ts, 시즌마다 갱신).
import Link from "next/link";
import type { Metadata } from "next";
import { LEAGUE_SCHEDULE, todayISO, type SchedulePeriod } from "../formats";

export const revalidate = 600;

const SEASON = { num: 27, name: "새로운 발걸음", start: "2026-06-02", end: "2026-09-09" };

export const metadata: Metadata = {
  title: "포켓몬고 GBL 시즌 일정 · 리그 로테이션 | GBL Note",
  description: `포켓몬 GO 배틀리그(GBL) 시즌${SEASON.num} '${SEASON.name}' 리그 로테이션 일정. 이번 주 열리는 슈퍼·하이퍼·마스터리그와 컵(스크롤컵 등) 스케줄을 한눈에.`,
  keywords: ["포켓몬고 GBL 일정", "배틀리그 로테이션", "이번주 GBL 리그", "GBL 컵 일정", `시즌${SEASON.num}`],
  alternates: { canonical: "/gbl/schedule" },
  openGraph: {
    title: `포켓몬고 GBL 시즌${SEASON.num} 리그 로테이션 일정`,
    description: "이번 주 열리는 리그·컵 스케줄",
    url: "/gbl/schedule",
    images: ["/gbl-og.png"],
    type: "website",
  },
};

const CARD = "#ffffff";
const BORDER = "#e3e8f2";
const BASE_COLOR: Record<string, string> = { great: "#3b5bdb", ultra: "#d97706", master: "#7c3aed", cup: "#db2777" };
const fmtD = (iso: string) => { const [, m, d] = iso.split("-"); return `${Number(m)}.${Number(d)}`; };
const statusOf = (today: string, p: SchedulePeriod): "live" | "past" | "soon" =>
  today < p.start ? "soon" : today >= p.end ? "past" : "live";
const ST = {
  live: { t: "이번 주", c: "#16a34a", bg: "#dcfce7" },
  soon: { t: "예정", c: "#3b5bdb", bg: "#e8eeff" },
  past: { t: "종료", c: "#94a3b8", bg: "#f1f5f9" },
};

function Chips({ p }: { p: SchedulePeriod }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {p.items.map((it) => {
        const c = BASE_COLOR[it.base] || "#64748b";
        return (
          <span key={it.label} style={{ fontSize: "0.82rem", fontWeight: 700, color: c, background: c + "18", border: `1px solid ${c}44`, borderRadius: 14, padding: "5px 12px" }}>{it.label}</span>
        );
      })}
    </div>
  );
}

export default function SchedulePage() {
  const today = todayISO();
  const current = LEAGUE_SCHEDULE.find((p) => statusOf(today, p) === "live");

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
          <b style={{ color: "#334155" }}>시즌{SEASON.num} · {SEASON.name}</b> 배틀리그 로테이션 일정입니다.
          GBL은 슈퍼·하이퍼·마스터리그와 주간 컵이 <b style={{ color: "#334155" }}>주차별로 로테이션</b>됩니다.
        </p>

        {/* 이번 주 */}
        {current && (
          <div style={{ marginTop: 14, background: CARD, border: `2px solid #86efac`, borderRadius: 12, padding: "0.9rem 1rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#16a34a", marginBottom: 8 }}>
              🟢 이번 주 열리는 리그 · {fmtD(current.start)}~{fmtD(current.end)}
            </div>
            <Chips p={current} />
            {current.note && <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 8 }}>※ {current.note}</div>}
          </div>
        )}

        {/* 전체 로테이션 타임라인 */}
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "1.6rem 0 10px" }}>리그 로테이션 일정</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {LEAGUE_SCHEDULE.map((p) => {
            const s = statusOf(today, p);
            const st = ST[s];
            return (
              <div key={p.start} style={{ background: CARD, border: `1px solid ${s === "live" ? "#86efac" : BORDER}`, borderRadius: 10, padding: "10px 12px", opacity: s === "past" ? 0.7 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: st.c, background: st.bg, borderRadius: 8, padding: "2px 8px" }}>{st.t}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>{fmtD(p.start)} ~ {fmtD(p.end)}</span>
                </div>
                <Chips p={p} />
                {p.note && <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 6 }}>※ {p.note}</div>}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 22, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>
            리그마다 CP 제한이 다릅니다(슈퍼 1500 · 하이퍼 2500 · 마스터 제한없음). 컵은 특정 타입만 참가할 수 있는 경우가 많습니다.
            지금 리그에서 뭘 많이 만나는지는 <Link href="/gbl/meta/master" style={{ color: "#3b5bdb", fontWeight: 600 }}>실측 메타</Link>,
            강한 포켓몬은 <Link href="/gbl/tier/master" style={{ color: "#3b5bdb", fontWeight: 600 }}>티어표</Link>에서 확인하세요.{" "}
            <Link href="/gbl/guide/league-cp" style={{ color: "#3b5bdb", fontWeight: 600 }}>리그별 CP 제한 가이드 →</Link>
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
