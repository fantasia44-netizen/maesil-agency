// GBL 시즌 스케줄표 — 서버렌더 SEO. 공식 리그 로테이션 일정(formats.ts, 시즌마다 갱신).
import Link from "next/link";
import type { Metadata } from "next";
import { LEAGUE_SCHEDULE, todayISO, type SchedulePeriod } from "../formats";
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
    openGraph: {
      title: sub(t.ogTitle),
      description: sub(t.ogDesc),
      url: localizePath(lang, path),
      images: ["/gbl-og.png"],
      type: "website",
    },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";
const BASE_COLOR: Record<string, string> = { great: "#3b5bdb", ultra: "#d97706", master: "#7c3aed", cup: "#db2777" };
const fmtD = (iso: string) => { const [, m, d] = iso.split("-"); return `${Number(m)}.${Number(d)}`; };
const statusOf = (today: string, p: SchedulePeriod): "live" | "past" | "soon" =>
  today < p.start ? "soon" : today >= p.end ? "past" : "live";

// 칩 라벨 로케일화: 코어 리그는 leagueName(+메가 접미), 컵은 사전(없으면 원문).
function chipLabel(lang: Locale, t: ScheduleDict, it: { label: string; base: string }): string {
  if (it.base === "cup") return t.cupLabels[it.label] || it.label;
  const name = leagueName(lang, it.base);
  return it.label.includes("메가") ? `${name}${t.megaSuffix}` : name;
}

function Chips({ p, lang, t }: { p: SchedulePeriod; lang: Locale; t: ScheduleDict }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {p.items.map((it) => {
        const c = BASE_COLOR[it.base] || "#64748b";
        return (
          <span key={it.label} style={{ fontSize: "0.82rem", fontWeight: 700, color: c, background: c + "18", border: `1px solid ${c}44`, borderRadius: 14, padding: "5px 12px" }}>{chipLabel(lang, t, it)}</span>
        );
      })}
    </div>
  );
}

export default function SchedulePage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getSchedule(lang);
  const L = (p: string) => localizePath(lang, p);
  const noteText = (n?: string) => (n ? t.notes[n] || n : "");

  const ST = {
    live: { t: t.statusLive, c: "#16a34a", bg: "#dcfce7" },
    soon: { t: t.statusSoon, c: "#3b5bdb", bg: "#e8eeff" },
    past: { t: t.statusPast, c: "#94a3b8", bg: "#f1f5f9" },
  };

  const today = todayISO();
  const current = LEAGUE_SCHEDULE.find((p) => statusOf(today, p) === "live");

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href={L("/gbl/meta/master")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{t.navMeta}</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          {t.h1}
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          <b style={{ color: "#334155" }}>{t.seasonWord}{SEASON.num} · {t.seasonName}</b>{t.introA}<b style={{ color: "#334155" }}>{t.introB}</b>{t.introC}
        </p>

        {/* 이번 주 */}
        {current && (
          <div style={{ marginTop: 14, background: CARD, border: `2px solid #86efac`, borderRadius: 12, padding: "0.9rem 1rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#16a34a", marginBottom: 8 }}>
              🟢 {t.thisWeekHeading}{fmtD(current.start)}~{fmtD(current.end)}
            </div>
            <Chips p={current} lang={lang} t={t} />
            {current.note && <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 8 }}>※ {noteText(current.note)}</div>}
          </div>
        )}

        {/* 전체 로테이션 타임라인 */}
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "1.6rem 0 10px" }}>{t.rotationH2}</h2>
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
                <Chips p={p} lang={lang} t={t} />
                {p.note && <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 6 }}>※ {noteText(p.note)}</div>}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 22, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
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
