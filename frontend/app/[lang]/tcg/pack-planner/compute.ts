// 팩 추천 계산 — 목표 덱들 → 필요 카드 → 팩별 확보 확률(팩심 확률 모델 재사용).
// "지금 까야 할 팩 순위 + 팩당 적중률"을 대회 덱 데이터 × 공개 확률로 산출(카드 DB엔 없는 계산).
import CARDS from "../data/cards.json";
import RATES from "../data/packrates.json";
import DECKS from "../data/decks.json";

type Card = { s: string; n: number; name: string; r: string; packs: string[]; nm?: Record<string, string> };
type SlotDist = Record<string, number>;
type DLCard = { count: number; set: string; number: string; name: string; nm?: Record<string, string> };
type Deck = { id: string; name: string; nm?: Record<string, string>; tier: string; share: number;
  decklist: { pokemon: DLCard[]; trainer: DLCard[]; energy: string[] } | null };

const DATA = CARDS as Card[];
const RT = RATES as unknown as Record<string, { regular: SlotDist[]; rareRate: number; rare: SlotDist[] | null }>;
const DECK_LIST = (DECKS as Deck[]);
export const PLANNABLE: Deck[] = DECK_LIST.filter((d) => d.decklist && (["S", "A", "B", "C"].includes(d.tier)));

const CARD_IDX = new Map<string, Card>();
for (const c of DATA) CARD_IDX.set(`${c.s}-${c.n}`, c);
const DECK_BY_ID = new Map<string, Deck>();
for (const d of DECK_LIST) DECK_BY_ID.set(d.id, d);

// (set,pack)별 레어도 카드 풀 수
const poolCache = new Map<string, Record<string, number>>();
function poolCounts(set: string, pack: string): Record<string, number> {
  const key = `${set}::${pack}`;
  let m = poolCache.get(key);
  if (!m) { m = {}; for (const c of DATA) if (c.s === set && (c.packs || []).includes(pack)) m[c.r] = (m[c.r] || 0) + 1; poolCache.set(key, m); }
  return m;
}

// 카드 c를 (c.s, pack) 팩 1개 열 때 ≥1장 얻을 확률(팩심 모델: 슬롯 레어도 분포 × 풀 균등).
function cardPullProb(c: Card, pack: string): number {
  const rt = RT[c.s]; if (!rt) return 0;
  const nR = poolCounts(c.s, pack)[c.r]; if (!nR) return 0;
  const miss = (slots: SlotDist[]) => slots.reduce((acc, d) => acc * (1 - ((d[c.r] || 0) / 100) / nR), 1);
  const pReg = 1 - miss(rt.regular);
  const pRare = rt.rare ? 1 - miss(rt.rare) : 0;
  const rr = (rt.rareRate || 0) / 100;
  return (1 - rr) * pReg + rr * pRare;
}

export type NeededCard = { key: string; name: string; nm?: Record<string, string>; r: string; set: string; count: number; p: number };
export type PackRec = { set: string; pack: string; cards: NeededCard[]; coverage: number; hitRate: number; expPerPack: number };
export type Plan = { packs: PackRec[]; unobtainable: NeededCard[]; totalNeeded: number; noRate: boolean };

// ── 메타덱 완성하기 — 보유 카드를 빼고 "부족한 카드"만으로 팩 추천 ───────────────
// 체크(보유)는 카드 단위로 공유되므로 한 번 체크하면 모든 덱에 반영된다(owned = "SET-번호" 집합).
export type DeckCard = { key: string; name: string; nm?: Record<string, string>; r: string; set: string; num: number; count: number; packs: string[] };
export type DeckNeed = { id: string; name: string; nm?: Record<string, string>; tier: string; share: number;
  cards: DeckCard[]; have: number; total: number; missing: DeckCard[] };

/** 덱의 카드 목록(카드DB와 매칭된 것만). 체크박스·완성도 계산 공용. */
export function deckCards(deckId: string): DeckCard[] {
  const d = DECK_BY_ID.get(deckId);
  if (!d || !d.decklist) return [];
  const out = new Map<string, DeckCard>();
  for (const grp of [d.decklist.pokemon || [], d.decklist.trainer || []]) for (const cc of grp) {
    const c = CARD_IDX.get(`${cc.set}-${cc.number}`);
    if (!c) continue;
    const k = `${c.s}-${c.n}`;
    const prev = out.get(k);
    out.set(k, { key: k, name: c.name, nm: c.nm, r: c.r, set: c.s, num: c.n,
      count: Math.max(prev?.count || 0, cc.count || 1), packs: c.packs || [] });
  }
  return [...out.values()];
}

/** 전 메타덱의 완성도 — 보유 집합 기준. 완성·거의 완성 순으로 정렬해 "지금 만들 수 있는 덱"을 보여준다. */
export function deckNeeds(owned: Set<string>): DeckNeed[] {
  return PLANNABLE.map((d) => {
    const cards = deckCards(d.id);
    const missing = cards.filter((c) => !owned.has(c.key));
    return { id: d.id, name: d.name, nm: d.nm, tier: d.tier, share: d.share,
      cards, have: cards.length - missing.length, total: cards.length, missing };
  }).sort((a, b) => (a.missing.length - b.missing.length) || (b.share - a.share));
}

/** 부족한 카드만으로 팩 추천 — planPacks와 같은 모델, 입력만 카드 목록. */
export function planForCards(cards: DeckCard[]): Plan {
  const packMap = new Map<string, NeededCard[]>();
  const unobtainable: NeededCard[] = [];
  let noRate = false;
  for (const c of cards) {
    const base = { key: c.key, name: c.name, nm: c.nm, r: c.r, set: c.set, count: c.count };
    if (!c.packs.length) { unobtainable.push({ ...base, p: 0 }); continue; }
    if (!RT[c.set]) noRate = true;
    const card = CARD_IDX.get(c.key);
    if (!card) continue;
    for (const pk of c.packs) {
      const arr = packMap.get(`${c.set}::${pk}`) || [];
      arr.push({ ...base, p: cardPullProb(card, pk) });
      packMap.set(`${c.set}::${pk}`, arr);
    }
  }
  const packs: PackRec[] = [];
  for (const [pkKey, cs] of packMap) {
    const [set, pack] = pkKey.split("::");
    cs.sort((a, b) => b.p - a.p || b.count - a.count);
    packs.push({ set, pack, cards: cs, coverage: cs.length, hitRate: 1 - cs.reduce((a, c) => a * (1 - c.p), 1), expPerPack: cs.reduce((a, c) => a + c.p, 0) });
  }
  packs.sort((a, b) => b.coverage - a.coverage || b.hitRate - a.hitRate);
  return { packs, unobtainable, totalNeeded: cards.length, noRate };
}

export function planPacks(deckIds: string[]): Plan {
  const need = new Map<string, { card: Card; count: number }>();
  let noRate = false;
  for (const id of deckIds) {
    const d = DECK_BY_ID.get(id); if (!d || !d.decklist) continue;
    for (const grp of [d.decklist.pokemon || [], d.decklist.trainer || []]) for (const cc of grp) {
      const c = CARD_IDX.get(`${cc.set}-${cc.number}`); if (!c) continue;
      const k = `${c.s}-${c.n}`;
      const prev = need.get(k);
      need.set(k, { card: c, count: Math.max(prev?.count || 0, cc.count || 1) });
    }
  }
  const packMap = new Map<string, NeededCard[]>();
  const unobtainable: NeededCard[] = [];
  for (const { card, count } of need.values()) {
    const base = { key: `${card.s}-${card.n}`, name: card.name, nm: card.nm, r: card.r, set: card.s, count };
    const packs = card.packs || [];
    if (!packs.length) { unobtainable.push({ ...base, p: 0 }); continue; }
    if (!RT[card.s]) noRate = true;
    for (const pk of packs) {
      const p = cardPullProb(card, pk);
      const arr = packMap.get(`${card.s}::${pk}`) || [];
      arr.push({ ...base, p });
      packMap.set(`${card.s}::${pk}`, arr);
    }
  }
  const packs: PackRec[] = [];
  for (const [pkKey, cards] of packMap) {
    const [set, pack] = pkKey.split("::");
    cards.sort((a, b) => b.p - a.p || b.count - a.count);
    packs.push({ set, pack, cards, coverage: cards.length, hitRate: 1 - cards.reduce((a, c) => a * (1 - c.p), 1), expPerPack: cards.reduce((a, c) => a + c.p, 0) });
  }
  packs.sort((a, b) => b.coverage - a.coverage || b.hitRate - a.hitRate);
  return { packs, unobtainable, totalNeeded: need.size, noRate };
}

// 이름만 쓰므로 Deck·DeckNeed 등 {name,nm}를 가진 무엇이든 받는다.
export const deckName = (d: { name: string; nm?: Record<string, string> }, lang: string) => (d.nm && d.nm[lang]) || d.name;
