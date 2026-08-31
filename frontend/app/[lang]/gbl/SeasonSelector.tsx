"use client";
// 공용 시즌 선택기 — 티어·메타·시뮬 등 모든 PvP 화면이 공유. 시즌 레지스트리(seasons.ts) 구동.
// 각 화면은 데이터가 있는 시즌만 `seasons`로 넘긴다(selectableSeasons(availableSlugs)).
import { statusOf, seasonShort, type Season } from "./seasons";
import { type Locale } from "../../../lib/i18n";

export default function SeasonSelector({
  seasons, value, onChange, lang, nextBadge,
}: {
  seasons: Season[];
  value: string;                       // 선택된 시즌 slug
  onChange: (slug: string) => void;
  lang: Locale;
  nextBadge?: string;                  // 다음(예정) 시즌 배지 텍스트(예: "신규")
}) {
  if (seasons.length <= 1) return null;  // 단일 시즌이면 선택기 숨김
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
      {seasons.map((s) => {
        const on = s.slug === value;
        const isNext = statusOf(s) === "next";
        return (
          <button key={s.slug} onClick={() => onChange(s.slug)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "0.38rem 0.9rem", borderRadius: 999,
              border: on ? (isNext ? "1px solid #6d28d9" : "1px solid #0f172a") : "1px solid #e2e8f0",
              fontSize: "0.8rem", fontWeight: 800, cursor: "pointer",
              background: on ? (isNext ? "linear-gradient(135deg,#4c1d95,#6d28d9)" : "#0f172a") : "#fff",
              color: on ? "#fff" : "#64748b",
            }}>
            {isNext && "🌙"} {seasonShort(s, lang)}
            {isNext && nextBadge && (
              <span style={{ fontSize: "0.6rem", fontWeight: 900, background: on ? "rgba(255,255,255,.22)" : "#ede9fe", color: on ? "#fff" : "#6d28d9", borderRadius: 999, padding: "1px 6px" }}>{nextBadge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
