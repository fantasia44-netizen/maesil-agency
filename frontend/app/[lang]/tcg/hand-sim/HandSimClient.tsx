"use client";
// 첫패/콤보 확률 계산기 — 몬테카를로. 공용 대회 덱리스트를 재료로 TCG Note가 계산하는 "확률"(독창 가치).
// 규칙: 덱 20장 · 첫 손 5장 · 기본 포켓몬(st="B") 1장 이상 보장(몰리건) · 턴당 1장 드로우.
// 결과는 "관측 승률"이 아니라 TCG Note의 확률 계산(시뮬)임을 명시 — 실측/시뮬 구분.
import { useEffect, useMemo, useState } from "react";
import CARDS from "../data/cards.json";
import DECKS from "../data/decks.json";
import { type Locale } from "../../../../lib/i18n";
import { track } from "../../../../lib/track";

type Card = { s: string; n: number; name: string; nm?: Record<string, string>; e?: string; st?: string };
type DeckEntry = { count: number; set: string; number: string | number; name: string; nm?: Record<string, string> };
type MetaDeck = { id: string; name: string; nm?: Record<string, string>; tier?: string; winrate?: number; decklist?: { pokemon?: DeckEntry[]; trainer?: DeckEntry[] } | null };

const DATA = CARDS as Card[];
const META = (DECKS as MetaDeck[]).filter((d) => d.decklist && ((d.decklist.pokemon || []).length + (d.decklist.trainer || []).length) > 0);
const BY_KEY = new Map<string, Card>();
for (const c of DATA) BY_KEY.set(`${c.s.toLowerCase()}-${c.n}`, c);
const cardOf = (set: string, number: string | number) => BY_KEY.get(`${set.toLowerCase()}-${Number(number)}`);

const HAND = 5, DECK_SIZE = 20, ITERS = 20000;
const ELEMENT_COLOR: Record<string, string> = {
  grass: "#3fa129", fire: "#e62829", water: "#2980ef", lightning: "#d9a900", psychic: "#ef4179",
  fighting: "#ff8000", darkness: "#4b4243", metal: "#5a8a9c", dragon: "#5060e1", colorless: "#9fa19f",
};

// 덱 → 고유 카드 목록(개수·기본여부·포켓몬여부) + 총매수
type Uniq = { name: string; nm?: Record<string, string>; count: number; basic: boolean; pokemon: boolean; e?: string; stage?: string };
function buildDeck(d: MetaDeck): { uniq: Uniq[]; size: number } {
  const map = new Map<string, Uniq>();
  for (const arr of [d.decklist?.pokemon, d.decklist?.trainer]) for (const e of arr || []) {
    const c = cardOf(e.set, e.number);
    const st = c?.st;
    const key = e.name;
    const cur = map.get(key);
    if (cur) cur.count += e.count || 1;
    else map.set(key, { name: e.name, nm: e.nm || c?.nm, count: e.count || 1, basic: st === "B", pokemon: !!st, e: c?.e, stage: st });
  }
  const uniq = [...map.values()];
  return { uniq, size: uniq.reduce((a, b) => a + b.count, 0) };
}

// 시드 고정 PRNG(mulberry32) — 같은 덱=항상 같은 결과(재현성) + SSR/클라 일치(결정적).
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashDeck(uniq: Uniq[]) {
  let h = 2166136261;
  for (const u of uniq) { const s = `${u.name}:${u.count}`; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } }
  return h >>> 0;
}

// 몬테카를로 — 고유카드 인덱스 bag, 첫손/누적7/누적9 등장 + 기본 포켓몬 첫손 분포.
function simulate(uniq: Uniq[]) {
  const rng = mulberry32(hashDeck(uniq)); // 시드=덱 구성 → 재현성
  const U = uniq.length;
  const bag: number[] = [];
  uniq.forEach((u, i) => { for (let k = 0; k < u.count; k++) bag.push(i); });
  const N = bag.length;
  const basicIdx = new Uint8Array(U); uniq.forEach((u, i) => (basicIdx[i] = u.basic ? 1 : 0));
  const open = new Float64Array(U), t7 = new Float64Array(U), t9 = new Float64Array(U);
  const m5 = new Int32Array(ITERS), m7 = new Int32Array(ITERS), m9 = new Int32Array(ITERS);
  const basicDist = [0, 0, 0, 0]; // 0,1,2,3+ (0은 몰리건으로 사실상 없음)
  const seenGen = new Int32Array(U).fill(-1); const seenPos = new Int32Array(U);
  for (let it = 0; it < ITERS; it++) {
    // Fisher-Yates + 몰리건(첫 5장에 기본 없으면 재셔플)
    let tries = 0;
    do {
      for (let i = N - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = bag[i]; bag[i] = bag[j]; bag[j] = t; }
      tries++;
    } while (!hasBasic(bag, basicIdx) && tries < 60);
    // 기본 포켓몬 첫손 매수
    let bc = 0; for (let p = 0; p < HAND; p++) if (basicIdx[bag[p]]) bc++;
    basicDist[Math.min(bc, 3)]++;
    // 카드별 최초 등장 위치(첫 9장) + 마스크
    let mask5 = 0, mask7 = 0, mask9 = 0;
    const scan = Math.min(9, N);
    for (let p = 0; p < scan; p++) { const idx = bag[p]; if (seenGen[idx] !== it) { seenGen[idx] = it; seenPos[idx] = p; } }
    for (let i = 0; i < U; i++) {
      if (seenGen[i] !== it) continue;
      const p = seenPos[i];
      if (p < 5) { open[i]++; mask5 |= 1 << i; }
      if (p < 7) { t7[i]++; mask7 |= 1 << i; }
      if (p < 9) { t9[i]++; mask9 |= 1 << i; }
    }
    m5[it] = mask5; m7[it] = mask7; m9[it] = mask9;
  }
  return { open, t7, t9, basicDist, m5, m7, m9, iters: ITERS };
}
function hasBasic(bag: number[], basicIdx: Uint8Array) { for (let p = 0; p < HAND; p++) if (basicIdx[bag[p]]) return true; return false; }

type Dict = {
  deckL: string; myDeck: string; sizeWarn: (n: number) => string;
  firstHand: string; basicExp: string; basicP: (n: string, p: string) => string;
  cardOdds: string; card: string; hand: string; c7: string; c9: string;
  combo: string; comboHint: string; and: string; both: (p1: string, p2: string, p3: string) => string; pick: string;
  note: string; sim: string; iters: (n: number) => string; pokemon: string; trainer: string;
};
const L: Record<Locale, Dict> = {
  ko: {
    deckL: "덱 선택", myDeck: "내 덱(덱 빌더)", sizeWarn: (n) => `이 덱은 ${n}장입니다(정규 20장 아님) — 참고용`,
    firstHand: "🃏 첫 손 분석", basicExp: "첫 손 기본 포켓몬 기대 매수", basicP: (n, p) => `${n}장: ${p}`,
    cardOdds: "📊 카드별 확보 확률", card: "카드", hand: "첫 손", c7: "누적 7장", c9: "누적 9장",
    combo: "🎯 콤보 확률", comboHint: "두 카드를 고르면 함께 확보될 확률", and: "+", both: (a, b, c) => `첫 손 ${a} · 7장 ${b} · 9장 ${c}`, pick: "카드 선택…",
    note: "포켓포켓 규칙: 20장 · 첫 손 5장(기본 포켓몬 1장 이상 보장) · 턴당 1장 드로우. '누적 N장'은 첫 손 + (N−5)번 드로우 시점.",
    sim: "TCG Note 확률 계산(시뮬레이션) — 실제 대회 관측 승률이 아니라 덱 구성으로 계산한 확률입니다.", iters: (n) => `${n.toLocaleString()}회 시뮬`, pokemon: "포켓몬", trainer: "트레이너",
  },
  en: {
    deckL: "Deck", myDeck: "My deck (builder)", sizeWarn: (n) => `This deck has ${n} cards (not a legal 20) — for reference`,
    firstHand: "🃏 Opening hand", basicExp: "Expected Basic Pokémon in opening hand", basicP: (n, p) => `${n}: ${p}`,
    cardOdds: "📊 Draw probability by card", card: "Card", hand: "Opening", c7: "By 7 cards", c9: "By 9 cards",
    combo: "🎯 Combo probability", comboHint: "Pick two cards to see the odds of having both", and: "+", both: (a, b, c) => `Opening ${a} · 7 cards ${b} · 9 cards ${c}`, pick: "Pick a card…",
    note: "Pocket rules: 20 cards · opening hand of 5 (at least 1 Basic guaranteed) · draw 1 per turn. 'By N cards' = opening hand + (N−5) draws.",
    sim: "TCG Note probability calc (simulation) — not observed tournament win rate, but odds computed from deck composition.", iters: (n) => `${n.toLocaleString()} sims`, pokemon: "Pokémon", trainer: "Trainer",
  },
  ja: {
    deckL: "デッキ選択", myDeck: "マイデッキ(ビルダー)", sizeWarn: (n) => `このデッキは${n}枚(正規20枚ではない) — 参考`,
    firstHand: "🃏 初手分析", basicExp: "初手のたねポケモン期待枚数", basicP: (n, p) => `${n}枚: ${p}`,
    cardOdds: "📊 カード別 確保確率", card: "カード", hand: "初手", c7: "7枚まで", c9: "9枚まで",
    combo: "🎯 コンボ確率", comboHint: "2枚を選ぶと両方揃う確率", and: "+", both: (a, b, c) => `初手 ${a} · 7枚 ${b} · 9枚 ${c}`, pick: "カードを選択…",
    note: "ポケポケ: 20枚 · 初手5枚(たねポケモン1枚以上保証) · 毎ターン1枚ドロー。「N枚まで」= 初手 + (N−5)回ドロー時点。",
    sim: "TCG Note の確率計算(シミュレーション) — 実際の大会勝率ではなく、デッキ構成から計算した確率です。", iters: (n) => `${n.toLocaleString()}回`, pokemon: "ポケモン", trainer: "トレーナー",
  },
  "zh-TW": {
    deckL: "選擇牌組", myDeck: "我的牌組(製作)", sizeWarn: (n) => `此牌組為${n}張(非正規20張) — 僅供參考`,
    firstHand: "🃏 起手分析", basicExp: "起手基礎寶可夢期望張數", basicP: (n, p) => `${n}張: ${p}`,
    cardOdds: "📊 各卡抽到機率", card: "卡片", hand: "起手", c7: "至7張", c9: "至9張",
    combo: "🎯 連段機率", comboHint: "選兩張卡查看同時到手機率", and: "+", both: (a, b, c) => `起手 ${a} · 7張 ${b} · 9張 ${c}`, pick: "選擇卡片…",
    note: "Pocket規則: 20張 · 起手5張(保證至少1張基礎寶可夢) · 每回合抽1張。「至N張」= 起手 + (N−5)次抽牌。",
    sim: "TCG Note 機率計算(模擬) — 並非實際賽事勝率，而是依牌組構成計算的機率。", iters: (n) => `${n.toLocaleString()}次模擬`, pokemon: "寶可夢", trainer: "訓練家",
  },
};

const pct = (v: number, iters: number) => `${((v / iters) * 100).toFixed(1)}%`;
const STORE = "tcgDeck"; // 덱 빌더와 공유

export default function HandSimClient({ lang }: { lang: Locale }) {
  const t = L[lang];
  const nameOf = (c: { name: string; nm?: Record<string, string> }) => (c.nm && c.nm[lang]) || c.name;
  const [sel, setSel] = useState<string>(META[0]?.id || "");
  const [myDeck, setMyDeck] = useState<MetaDeck | null>(null);
  const [a, setA] = useState<string>(""), [b, setB] = useState<string>("");

  // 덱 빌더 저장 덱 로드(있으면 "내 덱" 옵션)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);
      if (!saved) return;
      const pk: DeckEntry[] = [], tr: DeckEntry[] = [];
      for (const part of saved.split(".")) {
        const m = part.match(/^([A-Za-z0-9]+)-(\d+)x(\d+)$/);
        if (!m) continue;
        const c = cardOf(m[1], m[2]);
        const entry: DeckEntry = { count: Number(m[3]), set: m[1], number: Number(m[2]), name: c?.name || `${m[1]}-${m[2]}`, nm: c?.nm };
        (c?.st ? pk : tr).push(entry);
      }
      if (pk.length + tr.length) setMyDeck({ id: "__mine", name: "My deck", decklist: { pokemon: pk, trainer: tr } });
    } catch { /* noop */ }
  }, []);

  const deck = useMemo(() => (sel === "__mine" ? myDeck : META.find((d) => d.id === sel)) || META[0], [sel, myDeck]);
  const built = useMemo(() => (deck ? buildDeck(deck) : { uniq: [], size: 0 }), [deck]);
  // 시드 고정이라 SSR/클라 결과 동일 → SSR로 계산값 노출(색인 가능·원본 가치).
  const sim = useMemo(() => (built.uniq.length ? simulate(built.uniq) : null), [built]);

  // 콤보 인덱스
  const idxByName = useMemo(() => { const m: Record<string, number> = {}; built.uniq.forEach((u, i) => (m[u.name] = i)); return m; }, [built]);
  const combo = useMemo(() => {
    if (!sim || !a || !b || a === b) return null;
    const ia = idxByName[a], ib = idxByName[b];
    if (ia == null || ib == null) return null;
    const both = (m: Int32Array) => { let c = 0; const ma = 1 << ia, mb = 1 << ib; for (let i = 0; i < m.length; i++) if ((m[i] & ma) && (m[i] & mb)) c++; return c; };
    return { h5: both(sim.m5), h7: both(sim.m7), h9: both(sim.m9), iters: sim.iters };
  }, [sim, a, b, idxByName]);

  if (!sim || !deck) return null;
  const rows = built.uniq.map((u, i) => ({ u, i, open: sim.open[i], t7: sim.t7[i], t9: sim.t9[i] }))
    .sort((x, y) => y.open - x.open);
  const basicExp = (sim.basicDist[1] + sim.basicDist[2] * 2 + sim.basicDist[3] * 3) / sim.iters; // 3+는 3으로 근사(하한)

  const box: React.CSSProperties = { background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "0.9rem 1.1rem", marginBottom: 14 };
  const sel2: React.CSSProperties = { fontSize: "0.85rem", padding: "7px 11px", borderRadius: 8, border: "1px solid #fbd8d8", background: "#fff", color: "#0f172a" };

  return (
    <div>
      {/* 덱 선택 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <select value={sel} onChange={(e) => { setSel(e.target.value); track("sim_run", undefined, e.target.value, "tcg"); }} style={{ ...sel2, flex: "1 1 240px" }}>
          {myDeck && <option value="__mine">⭐ {t.myDeck}</option>}
          {META.map((d) => <option key={d.id} value={d.id}>{d.tier ? `[${d.tier}] ` : ""}{nameOf(d)}</option>)}
        </select>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: built.size === DECK_SIZE ? "#16a34a" : "#dc2626" }}>{built.size}/{DECK_SIZE}</span>
      </div>
      {built.size !== DECK_SIZE && <p style={{ margin: "-6px 0 12px", fontSize: "0.76rem", color: "#dc2626" }}>{t.sizeWarn(built.size)}</p>}

      {/* 첫 손 기본 포켓몬 */}
      <div style={box}>
        <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>{t.firstHand}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>{t.basicExp}</span>
          <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "#dc2626" }}>{basicExp.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[1, 2, 3].map((n) => (
            <span key={n} style={{ fontSize: "0.78rem", fontWeight: 700, color: "#b91c1c", background: "#fee6e6", border: "1px solid #fbd8d8", borderRadius: 999, padding: "3px 11px" }}>
              {t.basicP(n === 3 ? "3+" : String(n), pct(sim.basicDist[n], sim.iters))}
            </span>
          ))}
        </div>
      </div>

      {/* 카드별 확보 확률 */}
      <div style={box}>
        <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>{t.cardOdds}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: 380 }}>
            <thead>
              <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                <th style={{ padding: "4px 6px", fontWeight: 700 }}>{t.card}</th>
                <th style={{ padding: "4px 6px", fontWeight: 700, textAlign: "right" }}>{t.hand}</th>
                <th style={{ padding: "4px 6px", fontWeight: 700, textAlign: "right" }}>{t.c7}</th>
                <th style={{ padding: "4px 6px", fontWeight: 700, textAlign: "right" }}>{t.c9}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ u, i, open, t7, t9 }) => (
                <tr key={i} style={{ borderTop: "1px solid #f6e0e0" }}>
                  <td style={{ padding: "5px 6px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {u.e && <span style={{ width: 8, height: 8, borderRadius: 999, background: ELEMENT_COLOR[u.e], flexShrink: 0 }} />}
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>{nameOf(u)}</span>
                      <span style={{ fontSize: "0.7rem", color: "#cbd5e1" }}>×{u.count}{u.basic ? " · B" : u.pokemon ? "" : ""}</span>
                    </span>
                  </td>
                  <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 800, color: "#dc2626" }}>{pct(open, sim.iters)}</td>
                  <td style={{ padding: "5px 6px", textAlign: "right", color: "#64748b" }}>{pct(t7, sim.iters)}</td>
                  <td style={{ padding: "5px 6px", textAlign: "right", color: "#64748b" }}>{pct(t9, sim.iters)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 콤보 확률 */}
      <div style={box}>
        <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#0f172a", marginBottom: 2 }}>{t.combo}</div>
        <p style={{ margin: "0 0 8px", fontSize: "0.78rem", color: "#94a3b8" }}>{t.comboHint}</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={a} onChange={(e) => setA(e.target.value)} style={{ ...sel2, flex: "1 1 140px" }}>
            <option value="">{t.pick}</option>
            {built.uniq.map((u) => <option key={u.name} value={u.name}>{nameOf(u)}</option>)}
          </select>
          <span style={{ fontWeight: 900, color: "#dc2626" }}>{t.and}</span>
          <select value={b} onChange={(e) => setB(e.target.value)} style={{ ...sel2, flex: "1 1 140px" }}>
            <option value="">{t.pick}</option>
            {built.uniq.map((u) => <option key={u.name} value={u.name}>{nameOf(u)}</option>)}
          </select>
        </div>
        {combo && (
          <p style={{ margin: "10px 0 0", fontSize: "0.9rem", fontWeight: 800, color: "#0f172a" }}>
            {t.both(pct(combo.h5, combo.iters), pct(combo.h7, combo.iters), pct(combo.h9, combo.iters))}
          </p>
        )}
      </div>

      <p style={{ margin: "0 0 4px", fontSize: "0.74rem", color: "#94a3b8", lineHeight: 1.6 }}>{t.note}</p>
      <p style={{ margin: 0, fontSize: "0.72rem", color: "#cbd5e1" }}>⚙️ {t.sim} · {t.iters(sim.iters)}</p>
    </div>
  );
}
