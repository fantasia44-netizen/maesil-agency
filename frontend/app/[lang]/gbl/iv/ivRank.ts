// PvP IV 랭크 계산 (IV4U/PvPoke식). 리그 CP캡 하에서 각 IV조합의 최적 레벨·스탯곱(Product) 순위.
// 검증: 케르디오(#647, 260/192/209) 15/15/15 @L40 → Att 217.33·Def 163.59·HP 177·Product 6,293,036 (IV4U 일치).

// 포켓몬 GO 공식 CPM (레벨 1 ~ 51, 0.5 단위). index i → 레벨 1 + i*0.5.
export const CPM: number[] = [
  0.094, 0.135137432, 0.16639787, 0.192650919, 0.21573247, 0.236572661, 0.25572005, 0.273530381,
  0.29024988, 0.306057377, 0.3210876, 0.335445036, 0.34921268, 0.362457751, 0.37523559, 0.387592406,
  0.39956728, 0.411193551, 0.42250001, 0.432926419, 0.44310755, 0.453059958, 0.46279839, 0.472336083,
  0.48168495, 0.490855897, 0.49985844, 0.508701765, 0.51739395, 0.525942511, 0.53435433, 0.542635767,
  0.55079269, 0.558830576, 0.56675452, 0.574569153, 0.58227891, 0.589887917, 0.59740001, 0.604818814,
  0.61215729, 0.619399365, 0.62656713, 0.633644533, 0.64065295, 0.647576426, 0.65443563, 0.661214806,
  0.667934, 0.674577537, 0.68116492, 0.687680648, 0.69414365, 0.700538673, 0.70688421, 0.713164996,
  0.71939909, 0.725571552, 0.7317, 0.734741009, 0.73776948, 0.740785574, 0.74378943, 0.746781211,
  0.74976104, 0.752729087, 0.75568551, 0.758630378, 0.76156384, 0.764486065, 0.76739717, 0.770297266,
  0.7731865, 0.776064962, 0.77893275, 0.781790055, 0.78463697, 0.787473578, 0.79030001, 0.792803968,
  0.79530001, 0.797800015, 0.80030001, 0.802800015, 0.80530001, 0.807800015, 0.81030001, 0.812800008,
  0.81530001, 0.817800004, 0.82030001, 0.822800002, 0.82530001, 0.827799996, 0.83030001, 0.832799995,
  0.83530001, 0.837799984, 0.84029999, 0.842794346, 0.84529999,
]; // index 98 = 레벨 50, 100 = 레벨 51(베프)

export type Base = { a: number; d: number; s: number };
export type IVRow = { ia: number; id: number; is: number; cp: number; level: number; att: number; def: number; hp: number; product: number; rank: number; pct: number };

const idxOfLevel = (lv: number) => Math.round((lv - 1) * 2);
export function cpOf(A: number, D: number, S: number, cpm: number): number {
  return Math.max(10, Math.floor((A * Math.sqrt(D) * Math.sqrt(S) * cpm * cpm) / 10));
}

// 리그별 IV 랭킹. cap=null(마스터·무제한)이면 maxLevel 고정. maxLevel: 50(기본) / 51(베스트버디).
export function rankIVs(base: Base, cap: number | null, maxLevel = 50): IVRow[] {
  const maxIdx = idxOfLevel(maxLevel);
  const rows: IVRow[] = [];
  for (let ia = 0; ia <= 15; ia++) {
    for (let id = 0; id <= 15; id++) {
      for (let is = 0; is <= 15; is++) {
        const A = base.a + ia, D = base.d + id, S = base.s + is;
        let li = maxIdx;
        if (cap != null) {
          li = -1;
          for (let i = maxIdx; i >= 0; i--) { if (cpOf(A, D, S, CPM[i]) <= cap) { li = i; break; } }
          if (li < 0) continue; // 레벨1에서도 캡 초과(초저CP 리그 제외 사실상 없음)
        }
        const cpm = CPM[li];
        const att = A * cpm, def = D * cpm, hp = Math.floor(S * cpm);
        rows.push({ ia, id, is, cp: cpOf(A, D, S, cpm), level: 1 + li * 0.5, att, def, hp, product: att * def * hp, rank: 0, pct: 0 });
      }
    }
  }
  rows.sort((x, y) => y.product - x.product);
  const max = rows[0]?.product || 1;
  rows.forEach((r, i) => { r.rank = i + 1; r.pct = (r.product / max) * 100; });
  return rows;
}

export const LEAGUE_CAP: Record<string, number | null> = { great: 1500, ultra: 2500, master: null };
