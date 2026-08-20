// 레이드(PvE) 속성별 어택커 티어표 — 서버렌더(ISR) SEO 페이지.
// 게임마스터(오픈데이터)로 계산한 DPS·내구 랭킹. PvP(배틀리그)와 별개, 일반 레이드 파밍용.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RAIDS from "../../gbl_raids.json";
import AdSlot from "../../AdSlot";
import CoupangAd from "../../CoupangAd";

export const revalidate = 3600;

type Row = {
  name: string; dex: number; shadow: boolean; variant: string; mega: string;
  fast: string; charged: string; fastKo: string; chargedKo: string;
  dps: number; bulk: number; rel: number; atk: number; def: number; hp: number;
};
type RaidData = {
  meta: { level: number; cpm: number; targetDef: number; generated: string; typeKo: Record<string, string> };
  types: Record<string, Row[]>;
};
const RD = RAIDS as unknown as RaidData;
const TYPES = Object.keys(RD.types);

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};
const TYPE_KO = RD.meta.typeKo;
const spriteUrl = (dex: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;

// rel%(속성 1위 대비)로 레이드 티어 배지
const RAID_TIER = (rel: number) => (rel >= 95 ? "S" : rel >= 88 ? "A" : rel >= 80 ? "B" : rel >= 72 ? "C" : "D");
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a", D: "#64748b" };

export function generateStaticParams() {
  return TYPES.map((type) => ({ type }));
}

export function generateMetadata({ params }: { params: { type: string } }): Metadata {
  const ko = TYPE_KO[params.type];
  if (!ko) return { title: "GBL Note" };
  const top = RD.types[params.type]?.slice(0, 3).map((r) => r.name).join(", ") || "";
  const title = `포켓몬고 ${ko}타입 레이드 딜러 티어표 · DPS 순위 | GBL Note`;
  const description = `포켓몬 GO ${ko}타입 레이드 공격수(어택커) DPS·내구 순위. 메가·섀도우 포함 추천 기술배치까지. 상위: ${top}. ${ko} 레이드 파밍 최적 조합.`;
  return {
    title,
    description,
    keywords: [`포켓몬고 ${ko} 어택커`, `${ko}타입 딜러`, `${ko} 레이드 추천`, `포켓몬고 ${ko} DPS`, `${ko} 레이드 티어표`, "포켓몬고 레이드 딜러"],
    alternates: { canonical: `/gbl/raid/${params.type}` },
    openGraph: {
      title: `포켓몬고 ${ko}타입 레이드 딜러 순위 (DPS·메가·섀도우)`,
      description: `${ko} 레이드 최적 어택커 TOP30 + 추천 기술`,
      url: `/gbl/raid/${params.type}`,
      images: ["/gbl-og.png"],
      type: "website",
    },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

function VariantBadge({ r }: { r: Row }) {
  if (r.mega) {
    const label = r.mega === "X" || r.mega === "Y" ? `메가 ${r.mega}` : "메가";
    return <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#fff", background: "linear-gradient(90deg,#7c3aed,#db2777)", padding: "1px 6px", borderRadius: 6 }}>{label}</span>;
  }
  if (r.shadow) return <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#fff", background: "#4b0082", padding: "1px 6px", borderRadius: 6 }}>섀도우</span>;
  return null;
}

export default function RaidTypePage({ params }: { params: { type: string } }) {
  const type = params.type;
  const ko = TYPE_KO[type];
  if (!ko) notFound();
  const rows = RD.types[type] || [];
  const c = TYPE_COLOR[type] || "#64748b";

  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
    padding: "1.4rem 1rem 4rem",
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/gbl/raid" style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← 레이드 딜러 티어</Link>
          <Link href="/gbl" style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>⚔️ PvP 배틀 →</Link>
        </div>

        {/* 속성 스위처 */}
        <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
          {TYPES.map((t) => {
            const on = t === type;
            const tc = TYPE_COLOR[t] || "#64748b";
            return (
              <Link key={t} href={`/gbl/raid/${t}`}
                style={{ padding: "5px 11px", borderRadius: 14, fontSize: "0.76rem", fontWeight: 700, textDecoration: "none",
                  border: `1px solid ${on ? tc : BORDER}`, background: on ? tc : CARD, color: on ? "#fff" : "#64748b" }}>
                {TYPE_KO[t]}
              </Link>
            );
          })}
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          <span style={{ color: c }}>{ko}타입</span> 레이드 딜러 티어표
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          {ko}타입 레이드(레전드·5성 등)에 넣을 <b style={{ color: "#334155" }}>공격수 DPS 순위</b>입니다.
          <b style={{ color: "#334155" }}> 메가진화·섀도우 포함</b>, 각 포켓몬의 추천 기술배치와 내구(생존)까지 함께 확인하세요.
        </p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.76rem", color: "#94a3b8" }}>
          DPS = 중립 대상 기준 초당 데미지(레벨40·STAB 반영). 내구 = 유효체력×방어 지수. 상성이 잘 맞는 상대에겐 실제 딜이 1.6배가 됩니다.
        </p>

        {rows.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>데이터 준비 중입니다.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>
            {rows.map((r, i) => {
              const tier = RAID_TIER(r.rel);
              return (
                <div key={`${r.name}-${i}`} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${c}`, borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#94a3b8", width: 22, textAlign: "center" }}>{i + 1}</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 900, color: "#fff", background: TIER_COLOR[tier], minWidth: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>{tier}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={spriteUrl(r.dex)} alt={r.name} width={38} height={38} style={{ imageRendering: "pixelated" }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>{r.name}</span>
                        <VariantBadge r={r} />
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
                        <span style={{ fontSize: "0.66rem", fontWeight: 600, padding: "1px 6px", borderRadius: 9, background: "#eef2f8", color: "#64748b", whiteSpace: "nowrap" }}>{r.fastKo}</span>
                        <span style={{ fontSize: "0.66rem", fontWeight: 600, padding: "1px 6px", borderRadius: 9, background: c + "22", color: c, border: `1px solid ${c}55`, whiteSpace: "nowrap" }}>{r.chargedKo}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 74 }}>
                      <div style={{ fontSize: "1rem", fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{r.dps.toFixed(2)}</div>
                      <div style={{ fontSize: "0.6rem", color: "#94a3b8", marginTop: 1 }}>DPS · 내구 {r.bulk}</div>
                    </div>
                  </div>
                  {/* rel% 바 */}
                  <div style={{ marginTop: 6, height: 5, background: "#eef2f8", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${r.rel}%`, height: "100%", background: c, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AdSlot />

        <div style={{ marginTop: 24, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>DPS·내구는 어떻게 계산했나요?</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.7 }}>
            공개 게임 데이터(종족값·기술 위력/시전시간/에너지)로 표준 PvE 공식을 적용해 산출했습니다. 레벨40·중립 대상 기준의 초당 데미지(DPS)와,
            체력×방어 기반 내구 지수입니다. 포켓배틀러 등과 세부 수치는 다를 수 있으나 순위 경향은 일치합니다.
            같은 속성끼리의 비교용이며, 상성이 맞는 레이드에서는 실제 딜이 더 높습니다.{" "}
            <Link href="/gbl/raid" style={{ color: "#3b5bdb", fontWeight: 600 }}>다른 속성 티어표 →</Link>
          </p>
        </div>

        <CoupangAd />

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href="/gbl/privacy" style={{ color: "#64748b", textDecoration: "none" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
