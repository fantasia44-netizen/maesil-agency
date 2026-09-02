// 타협개체 분석 링크 공유용 OG 썸네일(1200×630) — 몬별 자동 생성.
// SNS/카톡/카페 링크 미리보기에 스프라이트·이름·타협 IV·CP가 담긴 대표 카드가 뜬다.
// 텍스트는 라틴/숫자만(satori 기본 폰트) → 별도 CJK 폰트 없이 전 몬·전 언어 안전.
import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { ivEntry } from "../analysis/registry";
import { formDexById, pokeSprite } from "../../sprite";
import DEX_TYPE from "../../dex_type.json";

export const alt = "GBL Note — Compromise IV";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 폰트 직접 로드 — next/og 내장 폰트 로더의 Windows fileURLToPath 버그 회피 + Linux 결정성.
// (satori는 단일 가중치 폰트를 굵은 글자에 faux-bold 처리 — 라틴/숫자만이라 충분.)
function ogFont() {
  try { return readFileSync(join(process.cwd(), "public/fonts/noto-sans-latin.ttf")); }
  catch { return null; }
}

const DT = DEX_TYPE as Record<string, string>;
const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};

export default function Image({ params }: { params: { lang: string; id: string } }) {
  const fd = ogFont();
  const opts = { ...size, fonts: fd ? [{ name: "NotoSans", data: fd, weight: 400 as const, style: "normal" as const }] : undefined };
  const e = ivEntry(params.id);
  if (!e) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#fff", fontSize: 64, fontWeight: 800, fontFamily: "NotoSans" }}>
          GBL Note
        </div>
      ),
      opts,
    );
  }
  const dex = formDexById(params.id, e.dex);
  const tc = TYPE_COLOR[DT[String(dex)] || "normal"] || "#3b5bdb";
  const name = e.name.en;
  const iv = e.article.en.compromise;                 // 예: "15 / 13 / 14"
  const cp = e.sim.normal.hundo.cp;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "56px 64px", background: `linear-gradient(135deg, ${tc}2e 0%, #ffffff 62%)`, fontFamily: "NotoSans" }}>
        {/* 상단 브랜드 */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: tc, display: "flex" }} />
          <div style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", letterSpacing: "-1px" }}>GBL Note</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: tc, marginLeft: 8 }}>· Master League</div>
        </div>

        {/* 메인: 스프라이트 + 텍스트 */}
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pokeSprite(dex)} alt="" width={340} height={340}
            style={{ filter: `drop-shadow(0 12px 26px ${tc}66)` }} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: tc, letterSpacing: "3px" }}>COMPROMISE IV</div>
            <div style={{ fontSize: 88, fontWeight: 900, color: "#0f172a", lineHeight: 1.05, marginTop: 4 }}>{name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 22 }}>
              <div style={{ display: "flex", background: "#0f172a", color: "#fff", fontSize: 42, fontWeight: 900,
                borderRadius: 16, padding: "10px 26px", letterSpacing: "1px" }}>{iv}</div>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#475569" }}>100% CP {cp}</div>
            </div>
          </div>
        </div>

        {/* 하단 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#64748b" }}>How far can you build? — full-meta sim</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: tc }}>gblnote.com</div>
        </div>
      </div>
    ),
    opts,
  );
}
