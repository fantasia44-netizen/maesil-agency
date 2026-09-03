// 공유 페이지 공통 OG 썸네일 생성기(1200×630). 각 라우트의 opengraph-image.tsx가 호출.
// CJK 폰트 이슈 회피 — 라틴/숫자 텍스트 + 색상 비주얼(외부 fetch 없음), Noto Sans(라틴) vendor 폰트.
import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

function ogFont() {
  try { return readFileSync(join(process.cwd(), "public/fonts/noto-sans-latin.ttf")); }
  catch { return null; }
}

// dots: 하단 비주얼용 색상 배열(타입 색 등). 없으면 미표시.
export function ogCard(opts: { badge: string; title: string; sub?: string; accent: string; dots?: string[] }): ImageResponse {
  const { badge, title, sub, accent, dots } = opts;
  const fd = ogFont();
  const fonts = fd ? [{ name: "NotoSans", data: fd, weight: 400 as const, style: "normal" as const }] : undefined;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "56px 64px", background: `linear-gradient(135deg,#0f172a 0%,#1e293b 55%,${accent} 165%)`, fontFamily: "NotoSans" }}>
        {/* 상단 브랜드 */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: accent, display: "flex" }} />
          <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>GBL Note</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#cbd5e1", marginLeft: 8 }}>· Pokémon GO</div>
        </div>

        {/* 배지 + 타이틀 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex" }}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: "#fff", background: accent, borderRadius: 12, padding: "6px 22px", letterSpacing: 2 }}>{badge}</div>
          </div>
          <div style={{ fontSize: 82, fontWeight: 900, color: "#fff", lineHeight: 1.02 }}>{title}</div>
          {sub ? <div style={{ fontSize: 32, fontWeight: 700, color: "#cbd5e1" }}>{sub}</div> : null}
          {dots && dots.length ? (
            <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
              {dots.map((c, i) => <div key={i} style={{ width: 44, height: 44, borderRadius: "50%", background: c, display: "flex", boxShadow: `0 4px 12px ${c}66` }} />)}
            </div>
          ) : null}
        </div>

        {/* 하단 주소 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#818cf8" }}>gblnote.com</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
