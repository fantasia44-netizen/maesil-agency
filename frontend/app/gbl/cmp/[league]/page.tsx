// 리그별 CMP(공격력) 우선권 순위 — 서버렌더(ISR) SEO.
// 공격 종족값 내림차순 = 같은 턴 차지 시 먼저 발동하는 순서(CMP). 수작업 배포 인포그래픽 자동화.
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DATA from "../../gbl_data.json";
import DETAIL from "../../gbl_detail.json";
import AdSlot from "../../AdSlot";
import CoupangAd from "../../CoupangAd";

export const revalidate = 3600;

const LEAGUES: Record<string, { ko: string; short: string }> = {
  master: { ko: "마스터리그", short: "마스터" },
  great: { ko: "슈퍼리그", short: "슈퍼" },
  ultra: { ko: "하이퍼리그", short: "하이퍼" },
};
const LEAGUE_KEYS = Object.keys(LEAGUES);

type Mon = { id: string; dex: number; ko: string; types: string[]; shadow: boolean; sprite?: string };
const DS = DATA as unknown as { leagues: Record<string, { pokemon: Mon[] }> };
const MON: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON[m.id] = m;
const spriteUrl = (m?: Mon) =>
  m ? (m.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m.dex}.png`) : "";
const nameOf = (id: string) => MON[id]?.ko || id;

type Detail = { id: string; tier: string; stats: Record<string, number>; ko?: string; dex?: number; types?: string[] };
const DET = DETAIL as unknown as Record<string, Detail[]>;

const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};
const TYPE_KO: Record<string, string> = {
  normal: "노말", fire: "불꽃", water: "물", electric: "전기", grass: "풀", ice: "얼음",
  fighting: "격투", poison: "독", ground: "땅", flying: "비행", psychic: "에스퍼", bug: "벌레",
  rock: "바위", ghost: "고스트", dragon: "드래곤", dark: "악", steel: "강철", fairy: "페어리",
};

export function generateStaticParams() {
  return LEAGUE_KEYS.map((league) => ({ league }));
}

export function generateMetadata({ params }: { params: { league: string } }): Metadata {
  const lg = LEAGUES[params.league];
  if (!lg) return { title: "GBL Note" };
  const title = `포켓몬고 ${lg.ko} 공격력(CMP) 우선권 순위 | GBL Note`;
  const description = `포켓몬 GO ${lg.ko} 공격 종족값 순위표. 같은 턴에 차지 기술을 쏠 때 누가 먼저 발동하는지(CMP 우선권)를 공격력 순으로 정리했습니다.`;
  return {
    title,
    description,
    keywords: [`${lg.ko} 공격력 순위`, `${lg.ko} CMP`, `포켓몬고 우선권`, `${lg.ko} 공격 종족값`, "포켓몬고 CMP 티어"],
    alternates: { canonical: `/gbl/cmp/${params.league}` },
    openGraph: {
      title: `포켓몬고 ${lg.ko} CMP 우선권 순위`,
      description: `${lg.ko} 공격력 순위 = 차지 우선권 순서`,
      url: `/gbl/cmp/${params.league}`,
      images: ["/gbl-og.png"],
      type: "website",
    },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a", D: "#64748b" };

function Sprite({ id, size = 32 }: { id: string; size?: number }) {
  const m = MON[id];
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={spriteUrl(m)} alt={m?.ko || id} width={size} height={size} style={{ imageRendering: "pixelated" }} />;
}

export default function CmpPage({ params }: { params: { league: string } }) {
  const lg = LEAGUES[params.league];
  if (!lg) notFound();

  const list = (DET[params.league] || []).filter((d) => d.stats && d.stats.atk)
    .sort((a, b) => (b.stats.atk || 0) - (a.stats.atk || 0));
  const maxAtk = list[0]?.stats.atk || 1;
  const minAtk = list[list.length - 1]?.stats.atk || 0;

  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
    padding: "1.4rem 1rem 4rem",
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Link href="/gbl" style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href={`/gbl/tier/${params.league}`} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>🏆 티어표</Link>
          <Link href={`/gbl/meta/${params.league}`} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>📊 실측 메타</Link>
          <Link href="/gbl/raid" style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>🔥 레이드 딜러</Link>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {LEAGUE_KEYS.map((k) => {
            const on = k === params.league;
            return (
              <Link key={k} href={`/gbl/cmp/${k}`}
                style={{ padding: "6px 13px", borderRadius: 16, fontSize: "0.8rem", fontWeight: 700, textDecoration: "none",
                  border: `1px solid ${on ? "#4f8cff" : BORDER}`, background: on ? "rgba(79,140,255,.16)" : CARD, color: on ? "#3b5bdb" : "#64748b" }}>
                {LEAGUES[k].short}리그
              </Link>
            );
          })}
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
          포켓몬고 {lg.ko} 공격력(CMP) 우선권 순위
        </h1>
        <p style={{ margin: "0.4rem 0 0.2rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          두 포켓몬이 <b style={{ color: "#334155" }}>같은 턴에 차지 기술</b>을 쏘면, <b style={{ color: "#334155" }}>공격 종족값이 높은 쪽이 먼저 발동</b>합니다(CMP 우선권).
          아래는 {lg.ko} 주요 포켓몬을 공격력 순으로 정렬한 우선권 순위표입니다. 위에 있을수록 CMP 싸움에서 유리합니다.
        </p>
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
          숫자 = 유효 공격력(소수점 1자리까지가 실제 CMP 판정 기준 — 0.1만 높아도 먼저 발동). 같은 값은 실제로도 동점(랜덤). 각 포켓몬을 누르면 상세로 이동.
        </p>

        {list.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>데이터 준비 중입니다.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 14 }}>
            {list.map((d, i) => {
              const types = (d.types && d.types.length) ? d.types : (MON[d.id]?.types || []);
              const dex = d.dex || MON[d.id]?.dex;
              const dispName = d.ko || ((MON[d.id]?.shadow ? "그림자 " : "") + nameOf(d.id));
              const c1 = TYPE_COLOR[types[0]] || "#cbd5e1";
              const atk = d.stats.atk || 0;
              const w = maxAtk > minAtk ? Math.round(((atk - minAtk) / (maxAtk - minAtk)) * 100) : 100;
              return (
                <Link key={d.id} href={`/gbl/pokemon/${params.league}/${d.id}`}
                  style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 8,
                    background: `linear-gradient(100deg, ${c1}1f, #ffffff 82%)`, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${c1}`, borderRadius: 10, padding: "6px 10px" }}>
                  <span style={{ fontSize: "0.76rem", fontWeight: 800, color: i < 3 ? "#dc2626" : "#94a3b8", minWidth: 24 }}>#{i + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={dex ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png` : ""} alt={dispName} width={32} height={32} style={{ imageRendering: "pixelated" }} />
                  <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a", minWidth: 84 }}>{dispName}</span>
                  <span style={{ display: "flex", gap: 3 }}>
                    {types.map((t) => (
                      <span key={t} style={{ fontSize: "0.6rem", fontWeight: 700, color: "#fff", background: TYPE_COLOR[t] || "#94a3b8", padding: "1px 6px", borderRadius: 6 }}>{TYPE_KO[t] || t}</span>
                    ))}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 6, background: TIER_COLOR[d.tier], color: "#fff", fontWeight: 800, fontSize: "0.66rem", marginLeft: 4 }}>{d.tier}</span>
                  <div style={{ flex: 1, height: 7, background: "#e5eaf3", borderRadius: 4, overflow: "hidden", marginLeft: 4, minWidth: 40 }}>
                    <div style={{ width: `${w}%`, height: "100%", background: "linear-gradient(90deg,#ef4444,#f59e0b)" }} />
                  </div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a", minWidth: 46, textAlign: "right" }}>{atk.toFixed(1)}</span>
                </Link>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 22 }}><AdSlot /></div>

        <div style={{ marginTop: 8, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>CMP 우선권이란?</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>
            CMP(Charge Move Priority)는 두 포켓몬이 같은 턴에 차지 기술을 발동할 때, <b>공격 종족값이 높은 쪽이 먼저 터지는</b> 규칙입니다.
            먼저 발동하면 상대를 쓰러뜨리거나 실드를 강요할 수 있어, 공격력이 비슷한 대결에서 승패를 가릅니다. 공격 종족값은 시즌 밸런스에 따라 바뀔 수 있습니다.{" "}
            <Link href="/gbl/login" style={{ color: "#3b5bdb", fontWeight: 600 }}>내 전적 기록하기 →</Link>
          </p>
        </div>

        <CoupangAd />

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href="/gbl/guide" style={{ color: "#64748b", textDecoration: "none" }}>가이드</Link> ·{" "}
          <Link href="/gbl/privacy" style={{ color: "#64748b", textDecoration: "none" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
