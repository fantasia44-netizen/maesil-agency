"use client";
// 팩 오픈 시뮬레이터 — 실제 pullRates 확률로 팩을 열어봄. 바이럴 핵심 도구.
// 슬롯별 레어도 확률로 굴리고, 그 레어도의 카드풀에서 랜덤. Rare Pack(갓팩) 확률도 반영.
import { useMemo, useState } from "react";
import CARDS from "../data/cards.json";
import RATES from "../data/packrates.json";
import { type Locale } from "../../../../lib/i18n";
import { packName } from "../loc";

type Card = { s: string; n: number; name: string; r: string; packs: string[]; nm?: Record<string, string>; e?: string };
const DATA = CARDS as Card[];
type SlotDist = Record<string, number>;
const RT = RATES as unknown as Record<string, { regular: SlotDist[]; rareRate: number; rare: SlotDist[] | null }>;
const SETS = Object.keys(RT);

// 레어도 메타 — rank(하이라이트 기준), 색, 라벨
const RARITY: Record<string, { rank: number; color: string; label: string }> = {
  C: { rank: 1, color: "#94a3b8", label: "◇" }, U: { rank: 2, color: "#64748b", label: "◇◇" },
  R: { rank: 3, color: "#2980ef", label: "◇◇◇" }, RR: { rank: 4, color: "#7c3aed", label: "◇◇◇◇ ex" },
  AR: { rank: 5, color: "#d9a900", label: "☆ AR" }, SR: { rank: 6, color: "#e0a020", label: "☆☆ SR" },
  SAR: { rank: 6, color: "#e0a020", label: "☆☆ SAR" }, S: { rank: 7, color: "#ec4899", label: "✸ S" },
  SSR: { rank: 7, color: "#ec4899", label: "✸✸ SSR" }, IM: { rank: 8, color: "#f43f5e", label: "☆☆☆ IM" },
  UR: { rank: 9, color: "#dc2626", label: "👑 UR" }, RF: { rank: 3, color: "#2980ef", label: "R" },
  UF: { rank: 2, color: "#64748b", label: "U" }, CF: { rank: 1, color: "#94a3b8", label: "C" },
};
const rank = (c: string) => RARITY[c]?.rank || 0;
const RANK_ORDER = Object.keys(RARITY).sort((a, b) => rank(b) - rank(a));

const L: Record<Locale, { title: string; setL: string; packL: string; open1: string; open10: string; open100: string; god: string; hits: string; none: string; total: string; note: string; nonewSets: string }> = {
  ko: { title: "🎴 팩 오픈 시뮬레이터", setL: "세트", packL: "팩", open1: "1팩 열기", open10: "10팩", open100: "100팩", god: "레어팩(갓팩)", hits: "주요 카드 (◇◇◇◇ 이상)", none: "이번엔 대박 없음 😅", total: "레어도별 합계", note: "실제 공개 확률(pullRates) 기반 시뮬레이션 · 재미용 · 실제 결과와 다를 수 있음 · 최신 세트(B4~)는 확률 데이터 대기 중", nonewSets: "" },
  en: { title: "🎴 Pack Opening Simulator", setL: "Set", packL: "Pack", open1: "Open 1", open10: "×10", open100: "×100", god: "Rare Packs (god packs)", hits: "Notable pulls (◇◇◇◇+)", none: "No big hits this time 😅", total: "By rarity", note: "Simulated on real pull rates · for fun · may differ from actual · newest sets (B4+) pending rate data", nonewSets: "" },
  ja: { title: "🎴 パック開封シミュレーター", setL: "セット", packL: "パック", open1: "1パック", open10: "×10", open100: "×100", god: "レアパック(神パック)", hits: "注目カード(◇◇◇◇以上)", none: "今回は大当たりなし 😅", total: "レアリティ別合計", note: "実際の排出確率(pullRates)基準のシミュ · 娯楽用 · 実際と異なる場合あり · 最新セット(B4~)は確率データ待ち", nonewSets: "" },
  "zh-TW": { title: "🎴 開包模擬器", setL: "系列", packL: "卡包", open1: "開1包", open10: "×10", open100: "×100", god: "稀有包(神包)", hits: "亮眼卡(◇◇◇◇以上)", none: "這次沒中大獎 😅", total: "各稀有度合計", note: "以實際開包機率(pullRates)模擬 · 娛樂用 · 可能與實際不同 · 最新系列(B4~)機率資料待補", nonewSets: "" },
};

function rollRarity(dist: SlotDist): string {
  const r = Math.random() * 100;
  let cum = 0;
  const keys = Object.keys(dist);
  for (const k of keys) { cum += dist[k]; if (r < cum) return k; }
  return keys[keys.length - 1];
}

export default function PackSimClient({ lang }: { lang: Locale }) {
  const t = L[lang];
  const [set, setSet] = useState(SETS[SETS.length - 1]);
  const packs = useMemo(() => [...new Set(DATA.filter((c) => c.s === set).flatMap((c) => c.packs || []))], [set]);
  const [pack, setPack] = useState<string>(packs[0] || "");
  const curPack = packs.includes(pack) ? pack : packs[0] || "";

  const pool = useMemo(() => {
    const p: Record<string, Card[]> = {};
    for (const c of DATA) if (c.s === set && (c.packs || []).includes(curPack)) (p[c.r] = p[c.r] || []).push(c);
    return p;
  }, [set, curPack]);

  const [opened, setOpened] = useState<Card[]>([]);
  const [stats, setStats] = useState<{ n: number; agg: Record<string, number>; god: number; notable: Card[] } | null>(null);

  const nm = (c: Card) => (c.nm && c.nm[lang]) || c.name;

  function draw(rarity: string): Card | null {
    if (pool[rarity]?.length) return pool[rarity][Math.floor(Math.random() * pool[rarity].length)];
    // 폴백: 존재하는 가장 가까운(낮은) 레어도
    for (const rc of RANK_ORDER) if (rank(rc) <= rank(rarity) && pool[rc]?.length) return pool[rc][Math.floor(Math.random() * pool[rc].length)];
    const any = Object.values(pool).find((a) => a.length);
    return any ? any[Math.floor(Math.random() * any.length)] : null;
  }
  function openOne(): { cards: Card[]; rare: boolean } {
    const rt = RT[set];
    const isRare = !!rt.rare && Math.random() * 100 < rt.rareRate;
    const slots = isRare && rt.rare ? rt.rare : rt.regular;
    return { cards: slots.map((s) => draw(rollRarity(s))).filter((c): c is Card => !!c), rare: isRare };
  }
  function open(n: number) {
    if (n === 1) { setOpened(openOne().cards); setStats(null); return; }
    const agg: Record<string, number> = {}; let god = 0; const notable: Card[] = [];
    for (let i = 0; i < n; i++) { const o = openOne(); if (o.rare) god++; for (const c of o.cards) { agg[c.r] = (agg[c.r] || 0) + 1; if (rank(c.r) >= 4) notable.push(c); } }
    notable.sort((a, b) => rank(b.r) - rank(a.r));
    setStats({ n, agg, god, notable: notable.slice(0, 40) }); setOpened([]);
  }

  const sel: React.CSSProperties = { fontSize: "0.85rem", padding: "7px 11px", borderRadius: 8, border: "1px solid #fbd8d8", background: "#fff", color: "#0f172a" };
  const btn = (primary?: boolean): React.CSSProperties => ({ fontSize: "0.85rem", fontWeight: 800, cursor: "pointer", borderRadius: 8, padding: "8px 16px", border: "none", color: "#fff", background: primary ? "#dc2626" : "#f59e0b" });
  const CardChip = ({ c }: { c: Card }) => {
    const rr = RARITY[c.r] || { color: "#94a3b8", label: c.r, rank: 0 };
    const hit = rank(c.r) >= 4;
    return (
      <div style={{ background: hit ? "#fff7ed" : "#fff", border: `1px solid ${hit ? rr.color : "#eee"}`, borderLeft: `4px solid ${rr.color}`, borderRadius: 8, padding: "0.4rem 0.6rem", minWidth: 0 }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nm(c)}</div>
        <div style={{ fontSize: "0.68rem", fontWeight: 700, color: rr.color }}>{rr.label}</div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <label style={{ fontSize: "0.78rem", color: "#64748b" }}>{t.setL}</label>
        <select value={set} onChange={(e) => { setSet(e.target.value); setOpened([]); setStats(null); }} style={sel}>
          {SETS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label style={{ fontSize: "0.78rem", color: "#64748b" }}>{t.packL}</label>
        <select value={curPack} onChange={(e) => { setPack(e.target.value); setOpened([]); setStats(null); }} style={sel}>
          {packs.map((p) => <option key={p} value={p}>{packName(lang, p)}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={() => open(1)} style={btn(true)}>{t.open1}</button>
        <button onClick={() => open(10)} style={btn()}>{t.open10}</button>
        <button onClick={() => open(100)} style={btn()}>{t.open100}</button>
      </div>

      {opened.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8, marginBottom: 8 }}>
          {opened.map((c, i) => <CardChip key={i} c={c} />)}
        </div>
      )}

      {stats && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: "0.85rem", color: "#475569" }}>
            <span>{stats.n} {t.packL} · {stats.n * 5} cards</span>
            {stats.god > 0 && <span style={{ color: "#dc2626", fontWeight: 800 }}>✨ {t.god}: {stats.god}</span>}
          </div>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#b91c1c", marginBottom: 6 }}>{t.total}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(stats.agg).sort((a, b) => rank(b[0]) - rank(a[0])).map(([r, cnt]) => {
                const rr = RARITY[r] || { color: "#94a3b8", label: r };
                return <span key={r} style={{ fontSize: "0.74rem", fontWeight: 700, color: "#fff", background: rr.color, borderRadius: 999, padding: "3px 10px" }}>{rr.label} × {cnt}</span>;
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#b91c1c", marginBottom: 6 }}>{t.hits}</div>
            {stats.notable.length === 0 ? (
              <div style={{ fontSize: "0.84rem", color: "#94a3b8" }}>{t.none}</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 6 }}>
                {stats.notable.map((c, i) => <CardChip key={i} c={c} />)}
              </div>
            )}
          </div>
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: "0.7rem", color: "#cbd5e1", lineHeight: 1.5 }}>{t.note}</p>
    </div>
  );
}
