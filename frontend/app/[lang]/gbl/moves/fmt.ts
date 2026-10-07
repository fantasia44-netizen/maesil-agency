// 기술 도감 표시용 포매터(서버·클라 공용, 데이터 import 없음).
import type { MovesDict } from "./dict";

type Buff = { self: number[] | null; opp: number[] | null; chance: number };

// 버프 → "상대 방어 -2단계 · 자신 공격 +1단계 (확률 12.5%)". 확률 100%는 생략.
export function buffText(t: MovesDict, b?: Buff): string {
  if (!b) return "";
  const part = (who: string, v: number[] | null) => {
    if (!v) return [];
    const out: string[] = [];
    if (v[0]) out.push(`${who} ${t.buffAtk} ${t.buffStage(v[0])}`);
    if (v[1]) out.push(`${who} ${t.buffDef} ${t.buffStage(v[1])}`);
    return out;
  };
  const parts = [...part(t.buffSelf, b.self), ...part(t.buffOpp, b.opp)];
  if (!parts.length) return "";
  const pct = b.chance < 1 ? ` (${t.buffChance(String(Math.round(b.chance * 1000) / 10))})` : "";
  return parts.join(" · ") + pct;
}

// 턴 → 초(1턴 = 0.5초). 정수면 소수 생략.
export const turnsToSec = (turns: number): string => { const s = turns * 0.5; return Number.isInteger(s) ? String(s) : s.toFixed(1); };
