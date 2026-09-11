// 이번 주 덱 브리핑 — 대회 집계 데이터에서 6종 자동 산출(사람이 매주 글쓰기 X).
// 원칙: 표본 게이팅 + Wilson 하한 사용(브랜드=계산 정확성). 저평가/거품은 절대값이 아니라
// 사용률순위 vs 승률(Wilson)순위 '격차'로 판정 — 승률이 압축된 메타에서도 유효.
import METAJSON from "../data/meta.json";

export type BDeck = {
  id: string; name: string; nm?: Record<string, string>; icons?: string[];
  count: number; share: number; wins: number; losses: number; ties: number; n: number;
  winrate: number; wilsonLo: number; wr3?: number | null; n3?: number; wr7?: number | null; n7?: number;
  trend?: { d: number; w: number } | null; tier?: string;
  // 파생(랭크)
  shareRank?: number; wrRank?: number; div?: number;
};

export type BriefingMeta = {
  generatedAt: string; windowDays: number;
  tournaments: number; players: number; matches: number;
};

const RAW = METAJSON as unknown as {
  generatedAt: string; windowDays: number; sampleTournaments: number; samplePlayers: number; sampleMatches: number;
  decks: BDeck[];
};

export const BRIEF_META: BriefingMeta = {
  generatedAt: RAW.generatedAt,
  windowDays: RAW.windowDays,
  tournaments: RAW.sampleTournaments,
  players: RAW.samplePlayers,
  matches: RAW.sampleMatches,
};

const DECKS = RAW.decks;

// 표본 게이트
const N_TREND = 40;   // 급상승/급락(최근7일 표본)
const N_WR = 100;     // 승률 TOP
const N_HOT = 150;    // 저평가/거품(도발적이라 더 엄격)
const DIV_MIN = 8;    // 순위 격차 최소(노이즈 컷)

const TOP = 5;

// 사용률·승률(Wilson) 순위 부여 — 랭크 격차 계산용(표본 있는 덱만)
const RANKED = DECKS.filter((d) => (d.n ?? 0) >= N_WR);
[...RANKED].sort((a, b) => b.share - a.share).forEach((d, i) => (d.shareRank = i + 1));
[...RANKED].sort((a, b) => b.wilsonLo - a.wilsonLo).forEach((d, i) => (d.wrRank = i + 1));
RANKED.forEach((d) => (d.div = (d.shareRank ?? 0) - (d.wrRank ?? 0)));

const trendD = (d: BDeck) => (d.trend ? d.trend.d : 0);

export const RISING: BDeck[] = DECKS
  .filter((d) => d.trend && (d.n7 ?? 0) >= N_TREND && trendD(d) >= 3)
  .sort((a, b) => trendD(b) - trendD(a)).slice(0, TOP);

export const FALLING: BDeck[] = DECKS
  .filter((d) => d.trend && (d.n7 ?? 0) >= N_TREND && trendD(d) <= -3)
  .sort((a, b) => trendD(a) - trendD(b)).slice(0, TOP);

export const POPULAR: BDeck[] = [...DECKS]
  .sort((a, b) => b.share - a.share).slice(0, TOP);

export const TOP_WR: BDeck[] = DECKS
  .filter((d) => (d.n ?? 0) >= N_WR)
  .sort((a, b) => b.wilsonLo - a.wilsonLo).slice(0, TOP);

// 💎 저평가: 덜 쓰는데 잘 이김(승률순위 ≪ 사용률순위, div 큼·양수)
export const UNDERRATED: BDeck[] = RANKED
  .filter((d) => (d.n ?? 0) >= N_HOT && (d.div ?? 0) >= DIV_MIN)
  .sort((a, b) => (b.div ?? 0) - (a.div ?? 0) || b.wilsonLo - a.wilsonLo).slice(0, TOP);

// ☠️ 거품: 많이 쓰는데 못 이김(사용률순위 ≪ 승률순위, div 큼·음수)
export const OVERRATED: BDeck[] = RANKED
  .filter((d) => (d.n ?? 0) >= N_HOT && (d.div ?? 0) <= -DIV_MIN)
  .sort((a, b) => (a.div ?? 0) - (b.div ?? 0) || a.wilsonLo - b.wilsonLo).slice(0, TOP);
