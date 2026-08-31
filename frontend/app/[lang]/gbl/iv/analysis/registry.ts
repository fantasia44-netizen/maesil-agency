// 개체값 타협 분석 — 시뮬 데이터 + 블로그식 해설(포켓몬별 가변 구조).
// ※ 반(反)패턴: 포켓몬마다 "발견"이 다르므로 sections 구조도 다르게(고정 템플릿 금지).
import GROUDON from "../data/groudon.json";
import { type Locale } from "../../../../../lib/i18n";

export type SimSpread = {
  iv: number[]; cp: number; level: number; stats: { atk: number; def: number; hp: number };
  effHundo: boolean; verdict: string;
  byShield: { shields: number; wins: number; losses: number }[];
  flips: { shields: number; oppId: string; dex: number | null; opp: string; types: string[]; from: boolean; to: boolean; delta: number }[];
  nearFlips: { shields: number; oppId: string; dex: number | null; opp: string; types: string[]; delta: number }[];
};
export type Analysis = {
  hundo: { cp: number; level: number; stats: { atk: number; def: number; hp: number }; byShield: { shields: number; wins: number; losses: number }[] };
  spreads: SimSpread[];
};
export type CmpDuel = { shields: number; mine: number; opp: number; result: string }[];
export type Sim = {
  speciesId: string; league: string; metaLimit: number; rival: string | null; rivalDex: number | null;
  normal: Analysis; bestBuddy: Analysis; cmp: { mirror: CmpDuel; rival: CmpDuel | null };
};

export type Article = {
  title: string;
  lead: string;
  compromise: string;
  compromiseNote: string;
  sections: { h?: string; body: string }[];
  closing?: string;
};

export type IvEntry = {
  sim: Sim; dex: number; rivalName: Record<Locale, string> | null;
  name: Record<Locale, string>; updated: string;
  article: Record<Locale, Article>;
};

// ── 그란돈 — "공격 15는 절대조건, 나머지는 관대" ──────────────────────────────
const groudon_ko: Article = {
  title: "그란돈 개체값 타협점 — 마스터리그, 어디까지 괜찮을까",
  lead: "그란돈은 공격 15만 지키면 방어·체력은 꽤 풀어줘도 됩니다. 다만 이 '공격 15'는 타협 대상이 아니라 절대조건입니다. 마스터리그 상위 100종을 배틀 시뮬레이터로 전수 대입하고, 미러전·라이벌 대면·베스트버디까지 계산한 결과를 아래에 정리했습니다.",
  compromise: "15 / 13 / 14",
  compromiseNote: "일반(L50) 기준 이 이상이면 100% 개체와 승패 매치업이 사실상 동일합니다. 베스트버디를 하면 여기서 더 좋아집니다.",
  sections: [
    {
      h: "공격 14는 타협이 아니라 탈락입니다",
      body: "그란돈은 가이오가와 종족값·CP가 완전히 같습니다. 그래서 두 마리가 같은 턴에 차지를 쏘면 공격 종족값이 높은 쪽이 먼저 터지는데(동시차징·CMP), 내 그란돈이 공격 14면 공격 15 상대에게 이 우선권 싸움에서 무조건 밀립니다. 실제로 공14 그란돈을 공15 가이오가와 붙이면 실드 0·1·2 전부 대패(레이팅 154·233·176)했고, 그란돈 미러전도 실드 2개에서 339로 완패했습니다. 반면 공15 미러는 500으로 완전 대등합니다. 방어·체력은 하나쯤 흠집 나도 실전에서 티가 잘 안 나지만, 공격만은 15가 아니면 미러·라이벌전을 통째로 내줍니다.",
    },
    {
      h: "체력 -1은 100%, -2부터는 갈립니다",
      body: "체력만 1 낮은 15/15/14는 상위 100종 전부와 붙여도 승패가 하나도 바뀌지 않았습니다(실질 HP 184로 동일). 그런데 체력을 2 낮춘 15/15/13은 HP가 183으로 떨어지면서 게노세크트(칠 드라이브)를 실드 0개 대결에서 놓칩니다. 딱 1의 HP 차이가 브레이크포인트를 넘겨버리는 셈입니다. 포획 화면에서 CP만으로는 체력 -1인지 방어 -1인지 구별이 안 되니, 일단 잡고 열어보는 게 정답입니다.",
    },
    {
      h: "방어를 풀면 어디서부터 티가 날까",
      body: "15/14/15나 15/14/14처럼 방어를 1 낮춰도 승패 자체는 백과 같습니다. 다만 섀도우 랜드로스(화신폼) 상대의 배틀 점수가 눈에 띄게 밀리기 시작합니다 — 이기긴 하지만 여유가 줄어드는 구간입니다. 방어·체력을 더 깎아 15/14/13, 15/13/14로 내려가면 게노세크트를 실드 0개에서 놓치고, 15/10/14까지 가면 우르시프(일격의 태세)까지 추가로 내줍니다. 그래서 방어는 13 언저리를 지키는 편이 안전합니다.",
    },
    {
      h: "베스트버디를 하면 — 전부 좋아지고, 라이벌까지 잡습니다",
      body: "타협 개체 15/13/14를 베스트버디(레벨 +1)로 키우면 어떻게 될까. 상위 100종 대비 레이팅이 오른 매치업이 77개, 내려간 매치업은 0개였습니다. 하나도 나빠지지 않고 전부 좋아진 겁니다. 특히 그란돈 미러와 가이오가·섀도우 가이오가, 루나아라를 베스트버디 전에는 놓쳤다가 베스트버디 후에는 이겼습니다. 레벨 1이 높아지면 같은 종족값 라이벌과의 우선권·스탯 싸움에서 앞서기 때문입니다. 즉 개체값이 조금 아쉬워도 베스트버디로 상당 부분 만회됩니다 — 단, 공격 15라는 전제가 있을 때의 이야기입니다.",
    },
    {
      body: "한 가지 덧붙이면, 이 브레이크포인트는 메타가 바뀌면 함께 움직입니다. 게노세크트나 랜드로스의 비중이 달라지거나 신규 포켓몬이 들어오면 지금 '괜찮던' 개체가 아슬아슬해질 수 있습니다. 지금 당장 쓸 게 아니라면 이왕이면 고개체를 잡아두는 편이 마음 편합니다.",
    },
  ],
  closing: "정리 — 공격 15는 타협 불가(미러·가이오가 우선권), 방어는 13 이상 권장, 체력은 -1까지 자유(-2부터 주의). 15/13/14면 지금 마스터리그에서 100% 개체와 같은 급이고, 베스트버디를 얹으면 그 이상입니다.",
};

const groudon_en: Article = {
  title: "Groudon IV Compromise — How Far Can You Go in Master League?",
  lead: "For Groudon, as long as attack is 15 you can be relaxed about defense and HP. But that attack 15 isn't a compromise — it's a hard requirement. Below is the result of running the top 100 of the Master League meta through a battle simulator, plus the mirror, the same-stat rival, and best buddy.",
  compromise: "15 / 13 / 14",
  compromiseNote: "At L50, at or above this the win/loss matchups match a hundo. Best buddy only improves it further.",
  sections: [
    {
      h: "Attack 14 isn't a compromise — it's a fail",
      body: "Groudon shares identical base stats and CP with Kyogre. So when both fire a charged move on the same turn, the higher attack goes first (CMP) — and an attack-14 Groudon always loses that priority to an attack-15 opponent. In the sim, attack-14 Groudon lost to attack-15 Kyogre across 0/1/2 shields (ratings 154/233/176) and lost the Groudon mirror at 2 shields (339), while the attack-15 mirror is a dead-even 500. A nick in defense or HP barely shows in practice, but anything below attack 15 hands over the mirror and the rival outright.",
    },
    {
      h: "HP -1 is a hundo; -2 is where it splits",
      body: "With only HP one below max, 15/15/14 didn't flip a single matchup across all 100 (effective HP stays 184). But drop two to 15/15/13 and HP falls to 183 — enough to lose Genesect (Chill Drive) in the 0-shield scenario. A single point of HP crossing a breakpoint. CP alone can't tell an HP-1 from a Def-1 on catch, so just catch it and check.",
    },
    {
      h: "Loosening defense — where it shows",
      body: "Dropping defense by one (15/14/15, 15/14/14) still matches the hundo on win/loss, though the battle score against Shadow Landorus (Incarnate) slips noticeably. Go to 15/14/13 or 15/13/14 and you drop Genesect at 0 shields; down at 15/10/14 you also give up Urshifu (Single Strike). Keeping defense around 13 is the safe line.",
    },
    {
      h: "Best buddy — everything improves, and you catch the rivals",
      body: "Best-buddy a compromise 15/13/14 (level +1) and 77 matchups improve in rating while 0 get worse — strictly better across the board. Notably, the Groudon mirror, Kyogre, Shadow Kyogre, and Lunala flip from losses to wins, because the extra level wins the priority and stat race against same-stat rivals. So a slightly off spread is largely recovered by best buddy — provided attack is 15.",
    },
    {
      body: "One caveat: these breakpoints move with the meta. If Genesect or Landorus usage shifts, or a new Pokémon arrives, a spread that's fine today can get shaky. If you're not using it right now, banking a higher-IV catch is the easier peace of mind.",
    },
  ],
  closing: "Bottom line — attack 15 is non-negotiable (mirror & Kyogre CMP), defense 13+ recommended, HP free to -1 (watch from -2). 15/13/14 plays at hundo level in today's Master League, and best buddy pushes it beyond.",
};

export const IV_ANALYSIS: Record<string, IvEntry> = {
  groudon: {
    sim: GROUDON as unknown as Sim,
    dex: 383,
    rivalName: { ko: "가이오가", en: "Kyogre", ja: "カイオーガ", "zh-TW": "蓋歐卡" },
    name: { ko: "그란돈", en: "Groudon", ja: "グラードン", "zh-TW": "固拉多" },
    updated: "2026-08-30",
    article: { ko: groudon_ko, en: groudon_en, ja: groudon_en, "zh-TW": groudon_en },
  },
};

export function ivEntry(id: string): IvEntry | null {
  return IV_ANALYSIS[id] || null;
}
