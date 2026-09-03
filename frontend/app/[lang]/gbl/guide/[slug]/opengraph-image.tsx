// 가이드 전용 OG 썸네일(1200×630) — 슬러그별 분기(type-chart / cct). SNS·카톡 링크 미리보기용.
// CJK 폰트 이슈 회피 — 텍스트는 라틴/숫자만, 비주얼은 도형(외부 fetch 없음).
// ※ generateMetadata의 OG_SLUGS에 등록된 슬러그만 이 파일을 참조(나머지는 gbl-og.png).
import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const alt = "GBL Note — PvP Guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TYPES: [string, string][] = [
  ["normal", "#9fa19f"], ["fire", "#e62829"], ["water", "#2980ef"], ["electric", "#d9a900"],
  ["grass", "#3fa129"], ["ice", "#37b6c9"], ["fighting", "#ff8000"], ["poison", "#9141cb"],
  ["ground", "#915121"], ["flying", "#6c93e0"], ["psychic", "#ef4179"], ["bug", "#91a119"],
  ["rock", "#96843d"], ["ghost", "#704170"], ["dragon", "#5060e1"], ["dark", "#4b4243"],
  ["steel", "#5a8a9c"], ["fairy", "#d76ad7"],
];

function ogFont() {
  try { return readFileSync(join(process.cwd(), "public/fonts/noto-sans-latin.ttf")); }
  catch { return null; }
}

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#6366f1", display: "flex" }} />
      <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>GBL Note</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#818cf8", marginLeft: 8 }}>· Pokémon GO</div>
    </div>
  );
}

// 타입 상성표 OG
function typeChartImage() {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: "56px 64px", background: "linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#312e81 100%)", fontFamily: "NotoSans" }}>
      <Brand />
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#a5b4fc", letterSpacing: 4 }}>TYPE CHART</div>
          <div style={{ fontSize: 76, fontWeight: 900, color: "#fff", lineHeight: 1.02 }}>18 Types · GO ratios</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, maxWidth: 900 }}>
          {TYPES.map(([t, c]) => (
            <div key={t} style={{ width: 52, height: 52, borderRadius: "50%", background: c, display: "flex", boxShadow: `0 4px 12px ${c}66` }} />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 26, height: 18, borderRadius: 5, background: "#dc2626", display: "flex" }} /><span style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0" }}>×1.6</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 26, height: 18, borderRadius: 5, background: "#16a34a", display: "flex" }} /><span style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0" }}>×0.625</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 26, height: 18, borderRadius: 5, background: "#334155", display: "flex" }} /><span style={{ fontSize: 24, fontWeight: 700, color: "#e2e8f0" }}>×0.39</span></div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#818cf8" }}>gblnote.com</div>
      </div>
    </div>
  );
}

// CCT 타이밍 OG — 라틴/숫자만. 턴 셀 8칸 중 1·4·7 하이라이트(차지 타이밍).
function cctImage() {
  const cells = [1, 2, 3, 4, 5, 6, 7, 8];
  const hot = new Set([1, 4, 7]);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: "56px 64px", background: "linear-gradient(135deg,#0f172a 0%,#1e293b 55%,#4c1d95 100%)", fontFamily: "NotoSans" }}>
      <Brand />
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#c4b5fd", letterSpacing: 4 }}>CIRCLE CONTROL TACTIC</div>
          <div style={{ fontSize: 82, fontWeight: 900, color: "#fff", lineHeight: 1.02 }}>CCT Timing</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#a5b4fc", marginTop: 6 }}>Deny the free fast move</div>
        </div>
        {/* 턴 셀 타임라인 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {cells.map((n) => (
            <div key={n} style={{ width: 84, height: 84, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
              background: hot.has(n) ? "#fbbf24" : "#1e293b", color: hot.has(n) ? "#0f172a" : "#64748b",
              fontSize: 40, fontWeight: 900, border: hot.has(n) ? "none" : "2px solid #334155",
              boxShadow: hot.has(n) ? "0 6px 16px #fbbf2466" : "none" }}>{n}</div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 26, height: 18, borderRadius: 5, background: "#fbbf24", display: "flex" }} />
          <span style={{ fontSize: 26, fontWeight: 700, color: "#e2e8f0" }}>charge after 1 · 4 · 7</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#a78bfa" }}>gblnote.com</div>
      </div>
    </div>
  );
}

export default function Image({ params }: { params: { lang: string; slug: string } }) {
  const fd = ogFont();
  const opts = { ...size, fonts: fd ? [{ name: "NotoSans", data: fd, weight: 400 as const, style: "normal" as const }] : undefined };
  const body = params.slug === "cct" ? cctImage() : typeChartImage();
  return new ImageResponse(body, opts);
}
