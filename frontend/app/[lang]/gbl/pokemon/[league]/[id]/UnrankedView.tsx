// 랭킹 밖 포켓몬 기본 정보 페이지 — 어느 리그 랭킹에도 없는 종(대부분 미진화: 레벨 50으로도 CP 1,500 미달).
// 배틀 데이터(티어·카운터)가 없으므로 사실 정보만: 왜 랭킹에 없는지 · 진화 계열 링크 · 종족값/최대 CP · 배우는 기술과 타수.
// 데이터: gbl_unranked.json(build_moves.mjs). 항상 noindex. 경로는 /gbl/pokemon/great/<id> 한 곳.
import Link from "next/link";
import type { Metadata } from "next";
import type { FastOpt, ChargedOpt } from "./MovesetPanel";
import UnrankedMoves from "./UnrankedMoves";
import { getPoke } from "./dict";
import { formDexById } from "../../../sprite";
import { typeLabel, TYPE_COLOR } from "../../../typeLabels";
import { localizePath, hreflangLanguages, type Locale } from "../../../../../../lib/i18n";
import { moveById, moveName, learnerLink, speciesName } from "../../../moves/movesData";
import { getMoves } from "../../../moves/dict";

export type Unranked = {
  dex: number; types: string[]; n: Record<string, string>; stats: { atk: number; def: number; hp: number }; maxCp: number; reason: "cp" | "unlisted";
  fast: { id: string; gain: number; turns: number }[]; charged: { id: string; energy: number }[]; elite?: string[]; parent?: string; evo?: string[];
};

const T: Record<Locale, {
  badge: string; title: (n: string) => string; desc: (n: string, cp: number) => string;
  whyCp: (n: string, cp: number) => string; whyUnlisted: (n: string) => string;
  familyH: string; parent: string; evolves: string; statsH: string; atk: string; def: string; hp: string; maxCp: string; maxCpSub: string;
  movesH: (n: string) => string; legacy: string; dexLink: string; back: string;
}> = {
  ko: {
    badge: "랭킹 대상 아님", title: (n) => `${n} — 종족값·배우는 기술·진화 | GBL Note`,
    desc: (n, cp) => `${n}의 종족값과 최대 CP ${cp.toLocaleString()}, 배울 수 있는 기술과 타수, 진화형 링크. 배틀리그 랭킹에는 포함되지 않는 포켓몬입니다.`,
    whyCp: (n, cp) => `${n}의 최대 CP는 ${cp.toLocaleString()}(레벨 50 · 개체값 15/15/15)로, 슈퍼리그 상한 1,500에 못 미칩니다. 그래서 어느 리그의 배틀 랭킹에도 포함되지 않습니다. 진화형이 있다면 아래에서 진화형의 티어와 기술배치를 확인하세요.`,
    whyUnlisted: (n) => `${n} — 현재 배틀 시뮬레이션 랭킹 데이터에 포함되지 않은 포켓몬이라 티어·카운터 정보가 없습니다. 종족값과 배울 수 있는 기술만 표시합니다.`,
    familyH: "진화 계열", parent: "진화 전", evolves: "진화형", statsH: "종족값", atk: "공격", def: "방어", hp: "체력", maxCp: "최대 CP", maxCpSub: "레벨 50 · 15/15/15",
    movesH: (n) => `${n} 배우는 기술 · 타수`, legacy: "★ = 레거시(엘리트 기술머신·이벤트 한정)", dexLink: "기술 도감에서 전체 기술 보기 →", back: "← 티어표",
  },
  en: {
    badge: "Not ranked", title: (n) => `${n} — Base Stats, Moves & Evolutions | GBL Note`,
    desc: (n, cp) => `${n}: base stats, max CP ${cp.toLocaleString()}, learnable moves with fast-move counts, and links to its evolutions. Not included in GO Battle League rankings.`,
    whyCp: (n, cp) => `${n} tops out at ${cp.toLocaleString()} CP (level 50, 15/15/15), below the Great League cap of 1,500, so it is not included in any league's battle rankings. If it evolves, check the evolved form's tier and moveset below.`,
    whyUnlisted: (n) => `${n} is not included in the current battle-simulation ranking data, so tier and counter information is unavailable. Only base stats and learnable moves are shown.`,
    familyH: "Evolution line", parent: "Evolves from", evolves: "Evolves into", statsH: "Base stats", atk: "Atk", def: "Def", hp: "HP", maxCp: "Max CP", maxCpSub: "Level 50 · 15/15/15",
    movesH: (n) => `${n} moves · fast-move counts`, legacy: "★ = legacy (Elite TM / event-exclusive)", dexLink: "See all moves in the Move Dex →", back: "← Tier List",
  },
  ja: {
    badge: "ランキング対象外", title: (n) => `${n} — 種族値・覚える技・進化 | GBL Note`,
    desc: (n, cp) => `${n}の種族値と最大CP${cp.toLocaleString()}、覚える技と発動回数、進化先へのリンク。GOバトルリーグのランキングには含まれないポケモンです。`,
    whyCp: (n, cp) => `${n}の最大CPは${cp.toLocaleString()}(レベル50・個体値15/15/15)で、スーパーリーグの上限1,500に届きません。そのためどのリーグのバトルランキングにも含まれません。進化先がある場合は、下のリンクから進化先のティアと技構成を確認してください。`,
    whyUnlisted: (n) => `${n}は現在のバトルシミュレーションのランキングデータに含まれていないため、ティア・対策情報はありません。種族値と覚える技のみ表示します。`,
    familyH: "進化系統", parent: "進化前", evolves: "進化先", statsH: "種族値", atk: "こうげき", def: "ぼうぎょ", hp: "HP", maxCp: "最大CP", maxCpSub: "レベル50・15/15/15",
    movesH: (n) => `${n}の覚える技 · 発動回数`, legacy: "★=レガシー(すごいわざマシン・イベント限定)", dexLink: "技図鑑ですべての技を見る →", back: "← ティア表",
  },
  "zh-TW": {
    badge: "非排名對象", title: (n) => `${n} — 種族值·可學招式·進化 | GBL Note`,
    desc: (n, cp) => `${n}的種族值與最大CP ${cp.toLocaleString()}、可學招式與所需次數、進化型連結。此寶可夢不在GO對戰聯盟排名中。`,
    whyCp: (n, cp) => `${n}的最大CP為${cp.toLocaleString()}(等級50·個體值15/15/15)，達不到超級聯盟上限1,500，因此不在任何聯盟的對戰排名中。若有進化型，請從下方查看進化型的強度與招式配置。`,
    whyUnlisted: (n) => `${n}目前不在對戰模擬排名資料中，因此沒有強度·剋星資訊，僅顯示種族值與可學招式。`,
    familyH: "進化系列", parent: "進化前", evolves: "進化型", statsH: "種族值", atk: "攻擊", def: "防禦", hp: "HP", maxCp: "最大CP", maxCpSub: "等級50·15/15/15",
    movesH: (n) => `${n}可學招式 · 所需次數`, legacy: "★=絕版(厲害招式學習器·活動限定)", dexLink: "在招式圖鑑查看全部招式 →", back: "← 強度表",
  },
};

const nameOf = (lang: Locale, u: Unranked) => u.n[lang] || u.n.en;

export function unrankedMetadata(lang: Locale, id: string, u: Unranked): Metadata {
  const t = T[lang]; const name = nameOf(lang, u); const path = `/gbl/pokemon/great/${id}`;
  return {
    title: t.title(name), description: t.desc(name, u.maxCp),
    robots: { index: false, follow: true },
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
  };
}

const CARD = "#ffffff", BORDER = "#e3e8f2";

export default function UnrankedView({ lang, id, u }: { lang: Locale; id: string; u: Unranked }) {
  const t = T[lang]; const pk = getPoke(lang); const mt = getMoves(lang);
  const L = (p: string) => localizePath(lang, p);
  const name = nameOf(lang, u);
  const c1 = TYPE_COLOR[u.types[0]] || "#cbd5e1";
  const elite = new Set(u.elite || []);
  const disp = (mid: string) => { const m = moveById(mid); return { id: mid, label: (m ? moveName(lang, m) : mid) + (elite.has(mid) ? " ★" : ""), color: m ? (TYPE_COLOR[m.type] || "#64748b") : "#94a3b8", href: m ? L(`/gbl/moves/${m.slug}`) : undefined }; };
  const fasts: FastOpt[] = u.fast.map((f) => ({ ...disp(f.id), gain: f.gain, turns: f.turns }));
  const charged: ChargedOpt[] = u.charged.map((c) => ({ ...disp(c.id), energy: c.energy, rec: false }));
  const fam = (ids: string[] | undefined) => (ids || []).map((sid) => ({ sid, lk: learnerLink(sid), nm: speciesName(lang, sid) })).filter((x) => x.nm !== x.sid || x.lk);
  const parents = fam(u.parent ? [u.parent] : []), evos = fam(u.evo);
  const h2: React.CSSProperties = { margin: "1.4rem 0 8px", fontSize: "1.02rem", fontWeight: 800, color: "#0f172a" };
  const wrap: React.CSSProperties = { minHeight: "100dvh", background: `radial-gradient(900px 420px at 50% -10%, ${c1}2a 0%, transparent 62%), linear-gradient(180deg,#f7f9fd,#eef2fb)`, padding: "1.4rem 1rem 4rem" };
  const FamChip = ({ x }: { x: { sid: string; lk: { league: string; id: string } | null; nm: string } }) => {
    const st: React.CSSProperties = { fontSize: "0.84rem", fontWeight: 700, padding: "5px 12px", borderRadius: 12, border: `1px solid ${BORDER}`, background: x.lk ? "#eef2ff" : "#f8fafc", color: x.lk ? "#1d4ed8" : "#475569", textDecoration: "none" };
    return x.lk ? <Link href={L(`/gbl/pokemon/${x.lk.league}/${x.lk.id}`)} style={st}>{x.nm} →</Link> : <span style={st}>{x.nm}</span>;
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href={L("/gbl/tier/great")} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>{t.back}</Link>
          <Link href={L("/gbl/moves")} style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>{mt.navLabel}</Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, background: `linear-gradient(110deg, ${c1}26, #ffffff 72%)`, border: `1px solid ${c1}55`, borderLeft: `5px solid ${c1}`, borderRadius: 14, padding: "0.9rem 1.1rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${formDexById(id, u.dex)}.png`} alt={name} width={64} height={64} style={{ imageRendering: "pixelated", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#0f172a" }}>{name}</h1>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
              {u.types.map((ty) => <span key={ty} style={{ fontSize: "0.68rem", fontWeight: 700, color: "#fff", background: TYPE_COLOR[ty] || "#94a3b8", padding: "2px 8px", borderRadius: 7 }}>{typeLabel(lang, ty)}</span>)}
              <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748b", background: "#f1f5f9", border: `1px solid ${BORDER}`, padding: "2px 8px", borderRadius: 7 }}>{t.badge}</span>
            </div>
          </div>
        </div>

        <p style={{ margin: "10px 0 0", padding: "0.85rem 1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: "0.86rem", color: "#334155", lineHeight: 1.8 }}>
          {u.reason === "cp" ? t.whyCp(name, u.maxCp) : t.whyUnlisted(name)}
        </p>

        {(parents.length > 0 || evos.length > 0) && (
          <>
            <h2 style={h2}>{t.familyH}</h2>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.85rem 1rem", display: "flex", flexDirection: "column", gap: 10 }}>
              {parents.length > 0 && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: "0.74rem", color: "#94a3b8", minWidth: 62 }}>{t.parent}</span>{parents.map((x) => <FamChip key={x.sid} x={x} />)}</div>}
              {evos.length > 0 && <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: "0.74rem", color: "#94a3b8", minWidth: 62 }}>{t.evolves}</span>{evos.map((x) => <FamChip key={x.sid} x={x} />)}</div>}
            </div>
          </>
        )}

        <h2 style={h2}>{t.statsH}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          {[[t.atk, u.stats.atk, ""], [t.def, u.stats.def, ""], [t.hp, u.stats.hp, ""], [t.maxCp, u.maxCp.toLocaleString(), t.maxCpSub]].map(([label, v, sub]) => (
            <div key={String(label)} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.7rem 0.8rem" }}>
              <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0f172a" }}>{v}</div>
              {sub && <div style={{ fontSize: "0.64rem", color: "#94a3b8" }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* 루브도(스케치로 전 기술 습득)는 빠른 96·차지 226개라 패널 대신 기술 도감 링크만 */}
        {fasts.length > 0 && charged.length > 0 && fasts.length <= 12 && (
          <>
            <h2 style={h2}>{t.movesH(name)}</h2>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 12px" }}>
              <UnrankedMoves fasts={fasts} charged={charged}
                labels={{ fastLabel: pk.fastLabel, chargedHint: pk.chargedHint, energyUnit: pk.energyUnit, hitsUnit: pk.hitsUnit, fastTurns: pk.fastTurns, recTag: pk.recTag, altFastHint: pk.altFastHint }} />
            </div>
            {elite.size > 0 && <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>{t.legacy}</p>}
          </>
        )}

        <p style={{ margin: "14px 0 0" }}>
          <Link href={L("/gbl/moves")} style={{ fontSize: "0.82rem", fontWeight: 700, color: "#3b5bdb", textDecoration: "none" }}>{t.dexLink}</Link>
        </p>
      </div>
    </div>
  );
}

