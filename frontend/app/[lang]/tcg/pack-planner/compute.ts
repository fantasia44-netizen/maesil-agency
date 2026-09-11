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

export const deckName = (d: Deck, lang: string) => (d.nm && d.nm[lang]) || d.name;
