// 레이드 딜러 티어표 허브 — 18속성 인덱스. 서버렌더 SEO.
import Link from "next/link";
import type { Metadata } from "next";
import RAIDS from "../gbl_raids.json";
import AdSlot from "../AdSlot";
import { monSprite } from "../sprite";

export const revalidate = 600;

type Row = { name: string; dex: number; dps: number; mega: string; shadow: boolean };
type RaidData = { meta: { generated: string; typeKo: Record<string, string> }; types: Record<string, Row[]> };
const RD = RAIDS as unknown as RaidData;
const TYPES = Object.keys(RD.types);

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};
const TYPE_KO = RD.meta.typeKo;

export const metadata: Metadata = {
  title: "포켓몬고 레이드 딜러 티어표 · 속성별 어택커 DPS 순위 | GBL Note",
  description: "포켓몬 GO 레이드 공격수(어택커) 속성별 DPS·내구 순위. 불꽃·물·드래곤 등 18타입 최적 딜러와 추천 기술배치, 메가진화·섀도우 포함. 레이드 파밍 필수 티어표.",
  keywords: ["포켓몬고 레이드 딜러", "레이드 어택커 티어표", "포켓몬고 DPS 순위", "속성별 딜러", "포켓몬고 메가 딜러", "레이드 추천 포켓몬"],
  alternates: { canonical: "/gbl/raid" },
  openGraph: {
    title: "포켓몬고 레이드 딜러 티어표 (속성별 DPS 순위)",
    description: "18타입 최적 어택커 + 추천 기술 · 메가/섀도우 포함",
    url: "/gbl/raid",
    images: ["/gbl-og.png"],
    type: "website",
  },
};

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

export default function RaidHubPage() {
  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
    padding: "1.4rem 1rem 4rem",
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/gbl" style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href="/gbl/tier/master" style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>⚔️ PvP 티어표 →</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.55rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          포켓몬고 레이드 딜러 티어표
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          레이드에 넣을 <b style={{ color: "#334155" }}>속성별 최강 공격수</b>를 DPS 순으로 정리했습니다.
          잡으려는 레이드 보스의 <b style={{ color: "#334155" }}>약점 속성</b>을 고르면, 그 타입 딜러 순위와 추천 기술배치가 나옵니다. 메가진화·섀도우 포함.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          <Link href="/gbl/raid/schedule" style={{
            display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
            padding: "12px 15px", borderRadius: 12, background: "linear-gradient(100deg,#fff1e6,#ffe3ef)", border: "1px solid #ffd0a8",
          }}>
            <span style={{ fontSize: "1.5rem" }}>🗓️</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#c2410c" }}>레이드 스케줄</div>
              <div style={{ fontSize: "0.76rem", color: "#9a3412" }}>5성·메가 로테이션 기간 + 레이드 아워·데이 일정</div>
            </div>
            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ea580c" }}>→</span>
          </Link>
          <Link href="/gbl/raid/bosses" style={{
            display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
            padding: "12px 15px", borderRadius: 12, background: "linear-gradient(100deg,#fdeede,#fbe6ea)", border: "1px solid #ffd8b0",
          }}>
            <span style={{ fontSize: "1.5rem" }}>💯</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#c2410c" }}>지금 보스 · 100% CP</div>
              <div style={{ fontSize: "0.76rem", color: "#9a3412" }}>현재 5성·메가 보스와 100% 개체 CP, 약점 딜러까지</div>
            </div>
            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#ea580c" }}>→</span>
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(158px, 1fr))", gap: 8, marginTop: 16 }}>
          {TYPES.map((t) => {
            const c = TYPE_COLOR[t] || "#64748b";
            const top = RD.types[t]?.[0];
            return (
              <Link key={t} href={`/gbl/raid/${t}`}
                style={{ textDecoration: "none", color: "inherit", background: `linear-gradient(120deg, ${c}1f, ${CARD} 70%)`, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${c}`, borderRadius: 11, padding: "10px 11px", display: "flex", alignItems: "center", gap: 9 }}>
                {top && (
                  <span style={{ width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    ...(top.shadow ? { background: "radial-gradient(circle, #7c3aed55 0%, transparent 68%)", borderRadius: "50%" } : {}) }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={monSprite(top.name, top.dex)} alt={top.name} width={40} height={40} style={{ imageRendering: "pixelated" }} />
                  </span>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: c }}>{TYPE_KO[t]}</div>
                  {top && <div style={{ fontSize: "0.72rem", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>1위 {top.name}</div>}
                </div>
              </Link>
            );
          })}
        </div>

        <AdSlot />

        <div style={{ marginTop: 22, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>레이드 딜러, 이렇게 고르세요</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.7 }}>
            레이드 보스마다 <b style={{ color: "#334155" }}>약점 속성</b>이 있습니다. 예를 들어 물 타입 보스에는 풀·전기 딜러가 강하죠.
            위에서 <b style={{ color: "#334155" }}>보스 약점 속성</b>을 눌러 상위 딜러를 확인하고, 가진 포켓몬 중 순위가 높은 걸 넣으면 됩니다.
            메가진화 1마리를 넣으면 같은 속성 딜러 전체가 강해집니다. 순위는 공개 게임 데이터로 계산한 DPS 기준입니다.
          </p>
        </div>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: "0.72rem", color: "#94a3b8" }}>
          업데이트 {RD.meta.generated} · <Link href="/gbl/privacy" style={{ color: "#64748b", textDecoration: "none" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
