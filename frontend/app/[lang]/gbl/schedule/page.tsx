// GBL 시즌 스케줄표 — 서버렌더 SEO. 공식 리그 로테이션 일정(formats.ts, 시즌마다 갱신).
import Link from "next/link";
import type { Metadata } from "next";
import { LEAGUE_SCHEDULE, type SchedulePeriod } from "../formats";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { leagueName } from "../contentI18n";
import { getSchedule, type ScheduleDict } from "./dict";

export const revalidate = 600;

const SEASON = { num: 27, name: "새로운 발걸음", start: "2026-06-02", end: "2026-09-09" };

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getSchedule(lang);
  const sub = (s: string) => s.replace(/\{num\}/g, String(SEASON.num)).replace(/\{name\}/g, t.seasonName);
  const path = "/gbl/schedule";
  return {
    title: sub(t.metaTitle),
    description: sub(t.metaDesc),
    keywords: t.metaKeywords.map(sub),
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    openGraph: { title: sub(t.ogTitle), description: sub(t.ogDesc), url: localizePath(lang, path), images: ["/gbl-og.png"], type: "website" },
  };
}

// ── 리그 비주얼 시스템 ──
const LEAGUE: Record<string, { c: string; soft: string; cap: string }> = {
  great: { c: "#2563eb", soft: "#dbeafe", cap: "1500" },
  ultra: { c: "#d97706", soft: "#fef3c7", cap: "2500" },
  master: { c: "#7c3aed", soft: "#ede9fe", cap: "∞" },
  cup: { c: "#db2777", soft: "#fce7f3", cap: "" },
};
const CARD = "#ffffff";
const BORDER = "#e6ebf5";
const fmtD = (iso: string) => { const [, m, d] = iso.split("-"); return `${Number(m)}.${Number(d)}`; };
const statusOf = (today: string, p: SchedulePeriod): "live" | "past" | "soon" =>
  today < p.start ? "soon" : today >= p.end ? "past" : "live";

// 칩 라벨 로케일화: 코어 리그는 leagueName(+메가 접미), 컵은 사전(없으면 원문).
function chipLabel(lang: Locale, t: ScheduleDict, it: { label: string; base: string }): string {
  if (it.base === "cup") return t.cupLabels[it.label] || it.label;
  const name = leagueName(lang, it.base);
  return it.label.includes("메가") ? `${name}${t.megaSuffix}` : name;
}

// 리그 배지 — 색 그라데이션 pill + CP 제한 칩
function LeagueBadge({ it, lang, t }: { it: { label: string; base: string }; lang: Locale; t: ScheduleDict }) {
  const lg = LEAGUE[it.base] || { c: "#64748b", soft: "#f1f5f9", cap: "" };
  const isMega = it.base !== "cup" && it.label.includes("메가");
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: lg.soft, border: `1px solid ${lg.c}33`,
      borderRadius: 999, padding: "5px 6px 5px 13px", fontSize: "0.84rem", fontWeight: 800, color: lg.c }}>
      {it.base === "cup" ? "🏆 " : ""}{chipLabel(lang, t, it)}
      {lg.cap && (
        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#fff", background: lg.c, borderRadius: 999, padding: "2px 9px", letterSpacing: "0.02em" }}>
          {isMega ? "⚡" : ""}{t.capWord} {lg.cap}
        </span>
      )}
    </span>
  );
}

export default function SchedulePage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getSchedule(lang);
  const L = (p: string) => localizePath(lang, p);
  const noteText = (n?: string) => (n ? t.notes[n] || n : "");
  const seasonName = t.seasonName;

  // 시즌·로테이션 날짜는 KST 기준이라 today도 KST(UTC+9)로 계산 — 언어 무관 동일(라벨로 명시).
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const startT = Date.parse(SEASON.start), endT = Date.parse(SEASON.end), nowT = Date.parse(today);
  const pct = Math.max(3, Math.min(100, Math.round(((nowT - startT) / (endT - startT)) * 100)));
  const daysLeft = Math.max(0, Math.ceil((endT - nowT) / 86400000));
  const ended = nowT >= endT;

  const ST: Record<string, { t: string; c: string; bg: string }> = {
    live: { t: t.statusLive, c: "#16a34a", bg: "#dcfce7" },
    soon: { t: t.statusSoon, c: "#2563eb", bg: "#dbeafe" },
    past: { t: t.statusPast, c: "#94a3b8", bg: "#f1f5f9" },
  };

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(1100px 520px at 50% -12%, #dbe4ff 0%, transparent 62%), linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" }}>
      <style>{`@keyframes gblLive{0%{box-shadow:0 0 0 0 rgba(22,163,74,.55)}70%{box-shadow:0 0 0 7px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}`}</style>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href={L("/gbl/meta/master")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{t.navMeta}</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.55rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3, letterSpacing: "-0.4px" }}>{t.h1}</h1>
        <p style={{ margin: "0.4rem 0 0", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          <b style={{ color: "#334155" }}>{t.seasonWord}{SEASON.num} · {seasonName}</b>{t.introA}<b style={{ color: "#334155" }}>{t.introB}</b>{t.introC}
        </p>

        {/* ── 시즌 히어로 (진행바 + NOW 마커) ── */}
        <div style={{ position: "relative", overflow: "hidden", marginTop: 16, borderRadius: 18, padding: "1.15rem 1.25rem 1.3rem",
          background: "linear-gradient(135deg,#111827 0%,#3b0764 52%,#4c1d95 100%)", boxShadow: "0 14px 34px -14px rgba(76,29,149,.6)" }}>
          <div style={{ position: "absolute", top: -40, right: -20, fontSize: "7rem", opacity: 0.12 }}>🗓️</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, position: "relative" }}>
            <div>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.16em", color: "#c4b5fd", textTransform: "uppercase" }}>{t.seasonWord}{SEASON.num}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff", lineHeight: 1.15, marginTop: 2 }}>{seasonName}</div>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#a5b4fc", marginTop: 3 }}>{fmtD(SEASON.start)} – {fmtD(SEASON.end)}</div>
              <div style={{ display: "inline-block", marginTop: 8, fontSize: "0.66rem", fontWeight: 700, color: "#c4b5fd", background: "rgba(255,255,255,.1)", borderRadius: 999, padding: "3px 10px" }}>{t.tzNote}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              {!ended ? (
                <>
                  <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "#fff", lineHeight: 1 }}>D-{daysLeft}</div>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#c4b5fd", marginTop: 2 }}>{t.endsInPre}{daysLeft}{t.daysUnit}</div>
                </>
              ) : (
                <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#c4b5fd" }}>{t.endedWord}</div>
              )}
            </div>
          </div>
          {/* 진행바 */}
          <div style={{ marginTop: 16, position: "relative" }}>
            <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.14)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#60a5fa,#a78bfa,#f0abfc)" }} />
            </div>
            {/* NOW 마커 */}
            <div style={{ position: "absolute", top: -3, left: `calc(${pct}% - 8px)`, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 0 0 4px rgba(167,139,250,.6), 0 2px 6px rgba(0,0,0,.4)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 9, fontSize: "0.66rem", fontWeight: 700, color: "#a5b4fc" }}>
              <span>{t.seasonProgressLabel}</span><span>{pct}%</span>
            </div>
          </div>
        </div>

        {/* ── 리그 로테이션 타임라인 ── */}
        <h2 style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0f172a", margin: "1.7rem 0 12px", letterSpacing: "-0.3px" }}>{t.rotationH2}</h2>
        <div style={{ position: "relative", paddingLeft: 30 }}>
          {/* 세로 라인 */}
          <div style={{ position: "absolute", left: 9, top: 12, bottom: 12, width: 3, borderRadius: 3, background: "linear-gradient(180deg,#c7d2fe,#e9d5ff,#eef2fb)" }} />
          {LEAGUE_SCHEDULE.map((p) => {
            const s = statusOf(today, p);
            const st = ST[s];
            const isLive = s === "live";
            const dotC = isLive ? "#16a34a" : s === "soon" ? "#2563eb" : "#cbd5e1";
            return (
              <div key={p.start} style={{ position: "relative", marginBottom: 12 }}>
                {/* 타임라인 점 */}
                <div style={{ position: "absolute", left: -29, top: 16, width: 18, height: 18, borderRadius: "50%", background: dotC,
                  border: "3px solid #fff", ...(isLive ? { animation: "gblLive 1.8s infinite" } : {}) }} />
                <div style={{
                  background: isLive ? "linear-gradient(180deg,#f0fdf4,#ffffff 40%)" : CARD,
                  border: `1px solid ${isLive ? "#86efac" : BORDER}`, borderRadius: 14,
                  padding: "12px 14px", opacity: s === "past" ? 0.66 : 1,
                  boxShadow: isLive ? "0 10px 26px -12px rgba(22,163,74,.4)" : "0 2px 8px -4px rgba(15,23,42,.08)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.68rem", fontWeight: 800, color: st.c, background: st.bg, borderRadius: 999, padding: "3px 10px" }}>
                      {isLive && <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.c, display: "inline-block" }} />}
                      {st.t}
                    </span>
                    <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a" }}>{fmtD(p.start)} ~ {fmtD(p.end)}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {p.items.map((it) => <LeagueBadge key={it.label} it={it} lang={lang} t={t} />)}
                  </div>
                  {p.note && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.74rem", color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "6px 10px", marginTop: 10, lineHeight: 1.5 }}>
                      ✨ {noteText(p.note)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CP 안내 */}
        <div style={{ marginTop: 22, padding: "1rem 1.1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, boxShadow: "0 2px 8px -4px rgba(15,23,42,.06)" }}>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>
            {t.cpNote1}<Link href={L("/gbl/meta/master")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.metaLinkText}</Link>{t.cpNote2}<Link href={L("/gbl/tier/master")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.tierLinkText}</Link>{t.cpNote3}{" "}
            <Link href={L("/gbl/guide/league-cp")} style={{ color: "#3b5bdb", fontWeight: 600 }}>{t.cpGuideLink}</Link>
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href={L("/gbl/guide")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerGuide}</Link> ·{" "}
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerPrivacy}</Link>
        </div>
      </div>
    </div>
  );
}
