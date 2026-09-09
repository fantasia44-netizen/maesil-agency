"use client";
// 덱 빌더 — 카드풀(검색·세트·타입 필터)에서 20장 덱 구성(같은 이름 2장 규칙).
// 메타 덱 37개에서 시작 · 속성 분포 · 필요 팩 분석(팩시뮬 연계) · URL/로컬 저장·공유.
// 데이터: cards.json(전 카드), decks.json(대회 메타 덱 decklist). 카드 식별 = set-number.
import { useEffect, useMemo, useState } from "react";
import CARDS from "../data/cards.json";
import DECKS from "../data/decks.json";
import { type Locale } from "../../../../lib/i18n";
import { elementName, packName } from "../loc";

type Card = { s: string; n: number; name: string; r?: string; packs?: string[]; nm?: Record<string, string>; e?: string; w?: string };
type DeckEntry = { count: number; set: string; number: string | number; name: string; nm?: Record<string, string> };
type MetaDeck = { id: string; name: string; nm?: Record<string, string>; tier?: string; winrate?: number; decklist?: { pokemon?: DeckEntry[]; trainer?: DeckEntry[] } };

const DATA = CARDS as Card[];
const META = DECKS as MetaDeck[];
const SETS = [...new Set(DATA.map((c) => c.s))];
const ELEMENTS = ["grass", "fire", "water", "lightning", "psychic", "fighting", "darkness", "metal", "dragon", "colorless"];
const ELEMENT_COLOR: Record<string, string> = {
  grass: "#3fa129", fire: "#e62829", water: "#2980ef", lightning: "#d9a900", psychic: "#ef4179",
  fighting: "#ff8000", darkness: "#4b4243", metal: "#5a8a9c", dragon: "#5060e1", colorless: "#9fa19f",
};
const DECK_MAX = 20;      // 포켓포켓 덱 = 정확히 20장
const COPY_MAX = 2;       // 같은 이름 최대 2장

const keyOf = (s: string, n: number | string) => `${s}-${Number(n)}`;
const BY_KEY = new Map<string, Card>();
for (const c of DATA) BY_KEY.set(keyOf(c.s, c.n), c);

type DbT = {
  title: string; start: string; clear: string; share: string; copied: string; empty: string; full: string; copyMax: string;
  valid: string; invalidN: string; pool: string; search: string; allSets: string; allTypes: string; types: string; packs: string;
  packNote: string; none: string; tierWin: string; note: string; weak: string; inDeck: string; removeAll: string; showN: (shown: number, total: number) => string;
  elem: Record<string, string>;
};
const L: Record<Locale, DbT> = {
  ko: { title: "내 덱", start: "메타 덱에서 시작…", clear: "비우기", share: "🔗 공유 링크", copied: "복사됨!", empty: "카드를 눌러 덱에 추가하세요 (20장)", full: "덱이 가득 찼습니다 (20장)", copyMax: "같은 이름 2장까지", valid: "✅ 완성된 덱 (20장)", invalidN: "장 더 필요", pool: "카드 풀", search: "카드 이름 검색…", allSets: "전체 세트", allTypes: "전체 타입", types: "타입 분포", packs: "필요한 팩", packNote: "이 카드들은 아래 팩에서 나옵니다", none: "-", tierWin: "티어·승률", note: "포켓포켓 규칙: 20장 / 같은 이름 2장. 에너지는 덱과 별도로 선택합니다.", weak: "약점", inDeck: "덱에", removeAll: "전체 삭제", showN: (m,t)=>`총 ${t.toLocaleString()}장 중 상위 ${m}장 · 검색·필터로 좁히기`,
    elem: { grass: "풀", fire: "불꽃", water: "물", lightning: "번개", psychic: "에스퍼", fighting: "격투", darkness: "악", metal: "강철", dragon: "드래곤", colorless: "노말" } },
  en: { title: "Your Deck", start: "Start from a meta deck…", clear: "Clear", share: "🔗 Share link", copied: "Copied!", empty: "Tap a card to add it (20)", full: "Deck is full (20)", copyMax: "Max 2 of a name", valid: "✅ Complete deck (20)", invalidN: "more needed", pool: "Card pool", search: "Search card name…", allSets: "All sets", allTypes: "All types", types: "Type spread", packs: "Packs you need", packNote: "These cards come from the packs below", none: "-", tierWin: "Tier·WR", note: "Pocket rules: 20 cards / max 2 of a name. Energy is chosen separately.", weak: "Weak", inDeck: "in deck", removeAll: "Remove all", showN: (m,t)=>`Top ${m} of ${t.toLocaleString()} · search/filter to narrow`,
    elem: { grass: "Grass", fire: "Fire", water: "Water", lightning: "Lightning", psychic: "Psychic", fighting: "Fighting", darkness: "Darkness", metal: "Metal", dragon: "Dragon", colorless: "Colorless" } },
  ja: { title: "マイデッキ", start: "メタデッキから開始…", clear: "クリア", share: "🔗 共有リンク", copied: "コピー!", empty: "カードを押して追加(20枚)", full: "デッキが満杯(20枚)", copyMax: "同名は2枚まで", valid: "✅ 完成(20枚)", invalidN: "枚不足", pool: "カードプール", search: "カード名を検索…", allSets: "全セット", allTypes: "全タイプ", types: "タイプ分布", packs: "必要なパック", packNote: "これらのカードは下記パックから出ます", none: "-", tierWin: "ティア·勝率", note: "ポケポケ: 20枚 / 同名2枚まで。エネルギーは別で選択。", weak: "弱点", inDeck: "採用", removeAll: "全削除", showN: (m,t)=>`全${t.toLocaleString()}枚中 上位${m}枚 · 検索·フィルターで絞り込み`,
    elem: { grass: "草", fire: "炎", water: "水", lightning: "雷", psychic: "超", fighting: "闘", darkness: "悪", metal: "鋼", dragon: "竜", colorless: "無" } },
  "zh-TW": { title: "我的牌組", start: "從主流牌組開始…", clear: "清空", share: "🔗 分享連結", copied: "已複製!", empty: "點卡片加入牌組(20張)", full: "牌組已滿(20張)", copyMax: "同名最多2張", valid: "✅ 完成(20張)", invalidN: "張不足", pool: "卡片池", search: "搜尋卡名…", allSets: "全部卡包", allTypes: "全部屬性", types: "屬性分布", packs: "需要的卡包", packNote: "這些卡片來自下列卡包", none: "-", tierWin: "強度·勝率", note: "Pocket規則：20張 / 同名最多2張。能量另外選擇。", weak: "弱點", inDeck: "採用", removeAll: "全部移除", showN: (m,t)=>`共${t.toLocaleString()}張中 前${m}張 · 用搜尋·篩選縮小`,
    elem: { grass: "草", fire: "火", water: "水", lightning: "雷", psychic: "超", fighting: "鬥", darkness: "惡", metal: "鋼", dragon: "龍", colorless: "無" } },
};

const POOL_LIMIT = 150;
const inputStyle: React.CSSProperties = { fontSize: "0.85rem", padding: "7px 11px", borderRadius: 8, border: "1px solid #fbd8d8", background: "#fff", color: "#0f172a" };
const STORE = "tcgDeck";

function encodeDeck(d: Record<string, number>): string {
  return Object.entries(d).filter(([, n]) => n > 0).map(([k, n]) => `${k}x${n}`).join(".");
}
function decodeDeck(s: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of s.split(".")) {
    const m = part.match(/^([A-Za-z0-9]+-\d+)x(\d+)$/);
    if (m) out[m[1]] = Math.min(COPY_MAX, Number(m[2]));
  }
  return out;
}

export default function DeckBuilderClient({ lang }: { lang: Locale }) {
  const t = L[lang];
  const nameOf = (c: { name: string; nm?: Record<string, string> }) => (c.nm && c.nm[lang]) || c.name;
  const [deck, setDeck] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [set, setSet] = useState("");
  const [elem, setElem] = useState("");
  const [copied, setCopied] = useState(false);

  // 초기 로드: URL ?d= 우선, 없으면 localStorage
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("d");
      if (p) { setDeck(decodeDeck(p)); return; }
      const saved = localStorage.getItem(STORE);
      if (saved) setDeck(decodeDeck(saved));
    } catch { /* noop */ }
  }, []);
  // 변경 시 localStorage 저장
  useEffect(() => { try { localStorage.setItem(STORE, encodeDeck(deck)); } catch { /* noop */ } }, [deck]);

  // 카드 정보 해석(풀에 없으면 메타덱 항목으로 보강)
  const cardOf = (key: string): Card | undefined => BY_KEY.get(key) || tplCards.get(key);
  // 메타덱 decklist의 카드들(풀에 없을 수 있는 트레이너 보강용)
  const tplCards = useMemo(() => {
    const m = new Map<string, Card>();
    for (const d of META) for (const arr of [d.decklist?.pokemon, d.decklist?.trainer]) for (const e of arr || []) {
      const k = keyOf(e.set, e.number);
      if (!BY_KEY.has(k) && !m.has(k)) m.set(k, { s: e.set, n: Number(e.number), name: e.name, nm: e.nm, packs: [] });
    }
    return m;
  }, []);

  const total = useMemo(() => Object.values(deck).reduce((a, b) => a + b, 0), [deck]);
  // 같은 이름 합계(2장 규칙)
  const nameCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const [k, n] of Object.entries(deck)) { const c = cardOf(k); if (c) m[c.name] = (m[c.name] || 0) + n; }
    return m;
  }, [deck]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (c: Card) => {
    const k = keyOf(c.s, c.n);
    if (total >= DECK_MAX) return;
    if ((nameCount[c.name] || 0) >= COPY_MAX) return;
    setDeck((d) => ({ ...d, [k]: (d[k] || 0) + 1 }));
  };
  const dec = (k: string) => setDeck((d) => { const n = (d[k] || 0) - 1; const c = { ...d }; if (n <= 0) delete c[k]; else c[k] = n; return c; });
  const clear = () => setDeck({});
  const loadTemplate = (id: string) => {
    const d = META.find((x) => x.id === id); if (!d) return;
    const nd: Record<string, number> = {};
    for (const arr of [d.decklist?.pokemon, d.decklist?.trainer]) for (const e of arr || []) {
      const k = keyOf(e.set, e.number); nd[k] = Math.min(COPY_MAX, (nd[k] || 0) + (e.count || 1));
    }
    setDeck(nd); setElem(""); setQ("");
  };
  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}?d=${encodeDeck(deck)}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { window.prompt("URL", url); }
  };

  // 덱 카드 목록(정렬: 타입→이름)
  const deckList = useMemo(() => Object.entries(deck).map(([k, n]) => ({ k, n, c: cardOf(k) })).filter((x) => x.c)
    .sort((a, b) => (a.c!.e || "z").localeCompare(b.c!.e || "z") || nameOf(a.c!).localeCompare(nameOf(b.c!))) as { k: string; n: number; c: Card }[],
  [deck]); // eslint-disable-line react-hooks/exhaustive-deps
  // 속성 분포 / 필요 팩
  const elemDist = useMemo(() => {
    const m: Record<string, number> = {};
    for (const { n, c } of deckList) if (c.e) m[c.e] = (m[c.e] || 0) + n;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [deckList]);
  const packNeeds = useMemo(() => {
    const s = new Set<string>();
    for (const { c } of deckList) for (const p of c.packs || []) s.add(p);
    return [...s];
  }, [deckList]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return DATA.filter((c) => (!ql || c.name.toLowerCase().includes(ql) || nameOf(c).toLowerCase().includes(ql)) && (!set || c.s === set) && (!elem || c.e === elem));
  }, [q, set, elem]); // eslint-disable-line react-hooks/exhaustive-deps

  const valid = total === DECK_MAX;

  return (
    <div>
      {/* 상단 컨트롤 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <select defaultValue="" onChange={(e) => { if (e.target.value) loadTemplate(e.target.value); e.target.value = ""; }} style={{ ...inputStyle, flex: "1 1 200px" }}>
          <option value="">{t.start}</option>
          {META.filter((d) => d.decklist).map((d) => <option key={d.id} value={d.id}>{d.tier ? `[${d.tier}] ` : ""}{nameOf(d)}{d.winrate ? ` · ${d.winrate}%` : ""}</option>)}
        </select>
        <button onClick={share} disabled={total === 0} style={{ ...btn(total > 0), background: copied ? "#16a34a" : (total > 0 ? "#dc2626" : "#e2e8f0") }}>{copied ? t.copied : t.share}</button>
        <button onClick={clear} disabled={total === 0} style={btn(total > 0, true)}>{t.clear}</button>
      </div>

      {/* 덱 요약 */}
      <div style={{ background: "#fff", border: `2px solid ${valid ? "#16a34a" : "#fbd8d8"}`, borderRadius: 12, padding: "0.8rem 1rem", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: deckList.length ? 10 : 0, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "#0f172a" }}>🃏 {t.title}</span>
          <span style={{ fontSize: "1.1rem", fontWeight: 900, color: valid ? "#16a34a" : "#dc2626" }}>{total}/{DECK_MAX}</span>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: valid ? "#16a34a" : "#94a3b8" }}>
            {valid ? t.valid : total > 0 ? `${DECK_MAX - total}${t.invalidN}` : t.empty}
          </span>
        </div>
        {deckList.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 6 }}>
              {deckList.map(({ k, n, c }) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fef6f5", border: "1px solid #fbd8d8", borderRadius: 8, padding: "4px 8px" }}>
                  {c.e && <span style={{ width: 8, height: 8, borderRadius: 999, background: ELEMENT_COLOR[c.e], flexShrink: 0 }} />}
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(c)}</span>
                  <button onClick={() => dec(k)} style={countBtn}>−</button>
                  <span style={{ fontSize: "0.82rem", fontWeight: 900, color: "#dc2626", minWidth: 14, textAlign: "center" }}>{n}</span>
                  <button onClick={() => add(c)} disabled={total >= DECK_MAX || (nameCount[c.name] || 0) >= COPY_MAX} style={countBtn}>+</button>
                </div>
              ))}
            </div>
            {/* 속성분포 + 필요팩 */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12, fontSize: "0.76rem" }}>
              {elemDist.length > 0 && (
                <div>
                  <div style={{ fontWeight: 800, color: "#64748b", marginBottom: 4 }}>{t.types}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {elemDist.map(([el, n]) => (
                      <span key={el} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 800, color: "#fff", background: ELEMENT_COLOR[el], borderRadius: 999, padding: "2px 9px" }}>{t.elem[el]} {n}</span>
                    ))}
                  </div>
                </div>
              )}
              {packNeeds.length > 0 && (
                <div>
                  <div style={{ fontWeight: 800, color: "#64748b", marginBottom: 4 }}>📦 {t.packs}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {packNeeds.map((p) => <span key={p} style={{ fontWeight: 800, color: "#b91c1c", background: "#fee6e6", border: "1px solid #fbd8d8", borderRadius: 999, padding: "2px 9px" }}>{packName(lang, p)}</span>)}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 카드 풀 */}
      <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>🔍 {t.pool}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} style={{ ...inputStyle, flex: "1 1 180px" }} />
        <select value={set} onChange={(e) => setSet(e.target.value)} style={inputStyle}>
          <option value="">{t.allSets}</option>
          {SETS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        <button onClick={() => setElem("")} style={chip(elem === "")}>{t.allTypes}</button>
        {ELEMENTS.map((el) => <button key={el} onClick={() => setElem(elem === el ? "" : el)} style={chip(elem === el, ELEMENT_COLOR[el])}>{t.elem[el]}</button>)}
      </div>

      <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginBottom: 8 }}>{t.showN(Math.min(filtered.length, POOL_LIMIT), filtered.length)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 7 }}>
        {filtered.slice(0, POOL_LIMIT).map((c) => {
          const inDeck = deck[keyOf(c.s, c.n)] || 0;
          const maxed = total >= DECK_MAX || (nameCount[c.name] || 0) >= COPY_MAX;
          return (
            <button key={keyOf(c.s, c.n)} onClick={() => add(c)} disabled={maxed && inDeck === 0}
              style={{ textAlign: "left", cursor: maxed ? "default" : "pointer", background: inDeck ? "#fef6f5" : "#fff", border: `1px solid ${inDeck ? "#dc2626" : "#fbd8d8"}`, borderRadius: 10, padding: "0.55rem 0.7rem", opacity: maxed && !inDeck ? 0.5 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                {c.e && <span style={{ width: 9, height: 9, borderRadius: 999, background: ELEMENT_COLOR[c.e], flexShrink: 0 }} />}
                <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#0f172a", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(c)}</span>
                {inDeck > 0 && <span style={{ fontSize: "0.7rem", fontWeight: 900, color: "#fff", background: "#dc2626", borderRadius: 999, padding: "0 7px" }}>{inDeck}</span>}
                <span style={{ fontSize: "0.66rem", fontWeight: 800, color: "#cbd5e1" }}>{c.r}</span>
              </div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", display: "flex", gap: 7, flexWrap: "wrap" }}>
                <span>{c.s}·{c.n}</span>
                {c.e && <span>{t.elem[c.e]}</span>}
                {c.w && <span>{t.weak} {elementName(lang, c.w)}</span>}
              </div>
            </button>
          );
        })}
      </div>
      <p style={{ marginTop: 14, fontSize: "0.72rem", color: "#cbd5e1" }}>{t.note}</p>
    </div>
  );
}

function btn(active: boolean, ghost = false): React.CSSProperties {
  return { fontSize: "0.8rem", fontWeight: 800, cursor: active ? "pointer" : "default", borderRadius: 8, padding: "7px 13px", border: `1px solid ${ghost ? "#fbd8d8" : "transparent"}`, background: ghost ? "#fff" : (active ? "#dc2626" : "#e2e8f0"), color: ghost ? "#b91c1c" : "#fff" };
}
function chip(active: boolean, color?: string): React.CSSProperties {
  return { fontSize: "0.74rem", fontWeight: 700, cursor: "pointer", borderRadius: 999, padding: "4px 10px", border: `1px solid ${active ? (color || "#dc2626") : "#fbd8d8"}`, background: active ? (color || "#dc2626") : "#fff", color: active ? "#fff" : "#64748b" };
}
const countBtn: React.CSSProperties = { width: 20, height: 20, borderRadius: 6, border: "1px solid #fbd8d8", background: "#fff", color: "#dc2626", fontWeight: 900, cursor: "pointer", lineHeight: 1, flexShrink: 0, fontSize: "0.9rem" };
