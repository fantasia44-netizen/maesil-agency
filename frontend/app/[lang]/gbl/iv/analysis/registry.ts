// 개체값 타협 분석 — 시뮬 데이터 + 블로그식 해설(포켓몬별 가변 구조).
// ※ 반(反)패턴: 포켓몬마다 "발견"이 다르므로 sections 구조도 다르게(고정 템플릿 금지).
import GROUDON from "../data/groudon.json";
import { type Locale } from "../../../../../lib/i18n";
import PKNAMES from "../../pokedex_names.json";
import { genArticle } from "./articleGen";
// 자동 초안 20종(마스터 실측 상위) — 데이터 파일
import LUNALA from "../data/lunala.json";
import RESHIRAM from "../data/reshiram.json";
import ZACIAN_CS from "../data/zacian_crowned_sword.json";
import XERNEAS from "../data/xerneas.json";
import KYUREM_W from "../data/kyurem_white.json";
import PALKIA_O from "../data/palkia_origin.json";
import KYOGRE from "../data/kyogre.json";
import ZEKROM from "../data/zekrom.json";
import ZYGARDE_C from "../data/zygarde_complete.json";
import HO_OH from "../data/ho_oh.json";
import ETERNATUS from "../data/eternatus.json";
import DIALGA_O from "../data/dialga_origin.json";
import RHYPERIOR_S from "../data/rhyperior_shadow.json";
import YVELTAL from "../data/yveltal.json";
import KELDEO_R from "../data/keldeo_resolute.json";
import RHYPERIOR from "../data/rhyperior.json";
import METAGROSS from "../data/metagross.json";
import GHOLDENGO from "../data/gholdengo.json";
import GARCHOMP from "../data/garchomp.json";

export type SimSpread = {
  iv: number[]; cp: number; level: number; stats: { atk: number; def: number; hp: number };
  effHundo: boolean; verdict: string;
  byShield: { shields: number; wins: number; losses: number }[];
  flips: { shields: number; oppId: string; dex: number | null; opp: string; types: string[]; from: boolean; to: boolean; delta: number }[];
  nearFlips: { shields: number; oppId: string; dex: number | null; opp: string; types: string[]; delta: number }[];
};
export type CoverageOpp = { id: string; name: string; dex: number | null; types: string[]; rating: number; win: boolean; score: number };
export type Coverage = { shields: number; opps: CoverageOpp[] }[];
export type Analysis = {
  hundo: { cp: number; level: number; stats: { atk: number; def: number; hp: number }; byShield: { shields: number; wins: number; losses: number }[] };
  coverage?: Coverage;   // 전 메타 100종 전수 매치업(팀빌더식 커버리지 그리드용). bestBuddy면 상대 노베파(L50) 기준.
  oppBB?: { byShield: { shields: number; wins: number; losses: number }[]; coverage: Coverage };  // 상대도 베스트파트너(L51) 시나리오
  spreads: SimSpread[];
};
export type CmpDuel = { shields: number; mine: number; opp: number; result: string }[];
export type Sim = {
  speciesId: string; dex?: number; league: string; metaLimit: number; rival: string | null; rivalDex: number | null;
  normal: Analysis; bestBuddy: Analysis; cmp: { mirror: CmpDuel; rival: CmpDuel | null };
};

// 강화 의사결정 판정(3단): grow=그냥 강화 / conditional=조건부 / wait=강화 말고 대기
export type Verdict = { tier: "grow" | "conditional" | "wait"; iv: string; note: string };
export type Faq = { q: string; a: string };

export type Article = {
  title: string;
  hook: string;              // 공감 후킹 리드
  lead: string;
  compromise: string;
  compromiseNote: string;
  verdict: Verdict[];        // 강화/조건부/대기 판정 박스(TL;DR)
  sections: { h?: string; body: string }[];
  faq: Faq[];                // 자주 묻는 질문(실제 플레이어 질문)
  closing?: string;
};

export type IvEntry = {
  sim: Sim; dex: number; rivalName: Record<Locale, string> | null;
  name: Record<Locale, string>; updated: string;
  season: string;            // 예: "시즌 27 (2026.06.02~09.09)" — 타협은 메타 의존이라 명시
  article: Record<Locale, Article>;
  published?: boolean;       // true=색인 허용+FAQ 리치결과. 미검수 몬은 생략(noindex).
};

// ── 그란돈 — "공격 15는 절대조건, 나머지는 관대" ──────────────────────────────
const groudon_ko: Article = {
  title: "그란돈 개체값 타협점 — 마스터리그, 어디까지 괜찮을까",
  hook: "박스에 그란돈, 아직 안 보내셨죠? XL 겨우 모아서 강화하려는데 100%가 안 떴다면 — 강화 버튼 누르기 전에 딱 30초. 이 개체 그냥 키워도 되는지, 시뮬 돌려서 정리해뒀습니다.",
  lead: "그란돈은 공격 15만 지키면 방어·체력은 꽤 풀어줘도 됩니다. 다만 이 '공격 15'는 타협 대상이 아니라 절대조건입니다. 마스터리그 상위 100종을 배틀 시뮬레이터로 전수 대입하고, 미러전·라이벌 대면·베스트파트너까지 계산한 결과를 아래에 정리했습니다.",
  compromise: "15 / 13 / 14",
  compromiseNote: "일반(L50) 기준 이 이상이면 100% 개체와 승패 매치업이 사실상 동일합니다. 베스트파트너는 손해 없는 소폭 보강이며, 효과는 상대도 베파인지에 따라 갈립니다(아래 참고).",
  verdict: [
    { tier: "grow", iv: "15 / 13 / 14 이상", note: "100% 개체와 승패 매치업이 사실상 동일합니다. 고민 말고 그냥 강화하세요." },
    { tier: "conditional", iv: "방어 10~12", note: "게노세크트·우라오스 등 한두 매치업을 놓칩니다. 베스트파트너로 일부 회복되지만 상대도 베파면 제한적이니, 당장 쓸 거면 OK 정도입니다." },
    { tier: "wait", iv: "공격 14 이하", note: "그란돈·가이오가·오리진 디아루가는 공격 실수치가 같아, 미러·이 셋에게 동시차징(CMP) 우선권을 무조건 내줍니다. 강화하지 말고 더 좋은 개체를 기다리세요." },
  ],
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
      body: "15/14/15나 15/14/14처럼 방어를 1 낮춰도 승패 자체는 백과 같습니다. 다만 섀도우 랜드로스(화신폼) 상대의 배틀 점수가 눈에 띄게 밀리기 시작합니다 — 이기긴 하지만 여유가 줄어드는 구간입니다. 방어·체력을 더 깎아 15/14/13, 15/13/14로 내려가면 게노세크트를 실드 0개에서 놓치고, 15/10/14까지 가면 우라오스(일격의 태세)까지 추가로 내줍니다. 그래서 방어는 13 언저리를 지키는 편이 안전합니다.",
    },
    {
      h: "베스트파트너 효과 — 상대가 노베파냐, 베파냐로 갈립니다",
      body: "베스트파트너(레벨 +1)의 효과는 상대가 베스트파트너인지에 따라 완전히 달라집니다. 여기서 흔히 하는 착각이 '내 것만 베파로 계산'하는 것인데, 그러면 효과가 부풀려집니다. 두 경우를 모두 돌렸습니다. ① 상대가 베스트파트너가 아니면(L50) — 실드 1개 기준 새로 이기는 상대가 8종이나 됩니다: 그란돈 미러, 가이오가·섀도우 가이오가, 제크로무, 섀도우 메타그로스·섀도우 망나뇽, 루나아라, 섀도우 그란돈. 레벨이 1 높아 우선권·스탯 싸움에서 앞서기 때문입니다. ② 그런데 마스터 상위권 전설은 상대도 대부분 베스트파트너입니다(L51). 양쪽 다 L51이면 미러·가이오가는 다시 무승부로 돌아가고, 새로 잡는 건 루나아라·섀도우 메타그로스·섀도우 망나뇽 3종뿐입니다(전체적으론 개선 34·악화 35로 거의 중립). 정리하면 베스트파트너는 손해가 전혀 없고 노베파 상대에겐 확실한 우위지만, 상대도 베파인 미러를 이기게 해주는 마법은 아닙니다.",
    },
    {
      body: "한 가지 덧붙이면, 이 브레이크포인트는 메타가 바뀌면 함께 움직입니다. 게노세크트나 랜드로스의 비중이 달라지거나 신규 포켓몬이 들어오면 지금 '괜찮던' 개체가 아슬아슬해질 수 있습니다. 지금 당장 쓸 게 아니라면 이왕이면 고개체를 잡아두는 편이 마음 편합니다.",
    },
  ],
  faq: [
    { q: "공격 14인데 그냥 강화해도 되나요?", a: "비추천입니다. 그란돈은 가이오가·오리진 디아루가와 공격 실수치가 같아서, 공14면 이 셋과 미러전에서 동시차징 우선권을 무조건 내줍니다. 실드 싸움을 50:50으로 갈 걸 0:100으로 지는 셈이라, 미러가 잦은 마스터리그에선 치명적입니다." },
    { q: "15/13/14랑 15/15/13 중 뭘 키우죠?", a: "15/13/14 쪽입니다. 체력을 2 낮춘 15/15/13은 실HP가 183으로 떨어지면서 게노세크트를 실드 0개에서 놓칩니다. 방어를 1~2 낮추는 건 승패에 티가 잘 안 나니, HP를 지키는 15/13/14가 더 안전합니다." },
    { q: "베스트파트너는 꼭 해야 하나요?", a: "손해는 없지만 '미러를 이긴다'는 과장입니다. 상대가 베스트파트너가 아니면 실드 1개 기준 8종을 새로 잡습니다(미러·가이오가·루나아라 등). 하지만 상대도 베스트파트너면(마스터 상위권 전설은 대부분 그렇습니다) 미러·가이오가는 무승부로 돌아가고 새로 잡는 건 3종뿐(루나아라·섀도우 메타그로스·섀도우 망나뇽)입니다. 여유 되면 하되, 개체값을 구제하거나 미러를 뒤집는 용도로 기대하진 마세요." },
    { q: "이 기준은 언제까지 유효한가요?", a: "시즌 27 메타 기준입니다. 게노세크트·랜드로스의 비중이 달라지거나 신규 포켓몬이 들어오면 브레이크포인트가 움직여 타협선도 바뀝니다. 시즌이 바뀌면 상위 100종을 다시 전수 시뮬해서 갱신합니다." },
  ],
  closing: "정리 — 공격 15는 타협 불가(미러·가이오가 우선권), 방어는 13 이상 권장, 체력은 -1까지 자유(-2부터 주의). 15/13/14면 지금 마스터리그에서 100% 개체와 같은 급입니다. 베스트파트너는 손해 없는 소폭 보강이지만(상대가 노베파일 때 이득이 큼), 미러를 이기게 해주진 않습니다.",
};

const groudon_en: Article = {
  title: "Groudon IV Compromise — How Far Can You Go in Master League?",
  hook: "Still got a Groudon sitting in your box? Finally scraped the XL together but it didn't come out 100%? Before you hit power-up — 30 seconds. Here's whether that spread is fine to build, straight from the sim.",
  lead: "For Groudon, as long as attack is 15 you can be relaxed about defense and HP. But that attack 15 isn't a compromise — it's a hard requirement. Below is the result of running the top 100 of the Master League meta through a battle simulator, plus the mirror, the same-stat rival, and best buddy.",
  compromise: "15 / 13 / 14",
  compromiseNote: "At L50, at or above this the win/loss matchups match a hundo. Best buddy is a small, risk-free bump whose size depends on whether the opponent is best-buddied too (see below).",
  verdict: [
    { tier: "grow", iv: "15 / 13 / 14 or better", note: "Win/loss matchups are effectively identical to a hundo. Don't overthink it — just power it up." },
    { tier: "conditional", iv: "Defense 10–12", note: "You drop one or two matchups (Genesect, Urshifu). Best buddy recovers some — but only partially if the opponent is best-buddied too. Fine if you need it now." },
    { tier: "wait", iv: "Attack 14 or below", note: "Groudon, Kyogre and Origin Dialga share the same effective attack, so attack-14 always loses CMP priority in the mirror and to those two. Don't build it — wait for a better one." },
  ],
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
      h: "Best buddy — it depends on whether the opponent is best-buddied too",
      body: "Best buddy (level +1) helps, but the size of the gain depends entirely on whether the opponent is best-buddied. The common mistake is to compute only your side as best-buddied, which inflates the effect. We ran both. (1) If the opponent is NOT best-buddied (L50), you newly win 8 matchups at 1 shield: the Groudon mirror, Kyogre and Shadow Kyogre, Zekrom, Shadow Metagross and Shadow Dragonite, Lunala, Shadow Groudon — the extra level wins the priority and stat race. (2) But top-tier Master legendaries are usually best-buddied too (L51). With both at L51, the mirror and Kyogre go back to a tie, and you only newly win three (Lunala, Shadow Metagross, Shadow Dragonite) — overall roughly neutral (34 up / 35 down). So best buddy never hurts and is a clear edge against non-best-buddied opponents, but it is not a magic button that wins the best-buddied mirror.",
    },
    {
      body: "One caveat: these breakpoints move with the meta. If Genesect or Landorus usage shifts, or a new Pokémon arrives, a spread that's fine today can get shaky. If you're not using it right now, banking a higher-IV catch is the easier peace of mind.",
    },
  ],
  faq: [
    { q: "Attack is 14 — can I just build it?", a: "Not recommended. Groudon shares its effective attack with Kyogre and Origin Dialga, so at attack 14 you always lose CMP priority to all three in the mirror. A shield fight that should be 50:50 becomes 0:100 — brutal in a mirror-heavy Master League." },
    { q: "15/13/14 or 15/15/13 — which do I build?", a: "15/13/14. Dropping HP by two (15/15/13) falls to 183 effective HP and loses Genesect at 0 shields. Shaving defense barely shows on win/loss, so keeping the HP with 15/13/14 is safer." },
    { q: "Is best buddy required?", a: "It never hurts, but 'it wins the mirror' is overselling it. Against a non-best-buddied opponent you newly win 8 matchups at 1 shield (mirror, Kyogre, Lunala…). But against a best-buddied opponent — which most top Master legendaries are — the mirror and Kyogre return to a tie and you newly win only three (Lunala, Shadow Metagross, Shadow Dragonite). Do it if you have the resources, but don't count on it to rescue a spread or flip the mirror." },
    { q: "How long does this hold?", a: "It's Season 27 meta. If Genesect or Landorus usage shifts, or a new Pokémon arrives, the breakpoints move and so does the compromise line. When the season changes we re-run the full top-100 sim and update this." },
  ],
  closing: "Bottom line — attack 15 is non-negotiable (mirror & Kyogre CMP), defense 13+ recommended, HP free to -1 (watch from -2). 15/13/14 plays at hundo level in today's Master League. Best buddy is a small, risk-free bump (bigger against non-best-buddied opponents), but it doesn't win a best-buddied mirror.",
};

// ── 이름 리졸버(dex 도감명 + 폼 접사) ──
const PKN = PKNAMES as unknown as Record<string, Record<string, string>>;
const NAME_AFFIX: Record<string, [string, string, string, string, "p" | "s"]> = {
  crowned_sword: [" (검왕)", " (Crowned Sword)", "（けんのおう）", "（劍之王）", "s"],
  crowned_shield: [" (방패왕)", " (Crowned Shield)", "（たてのおう）", "（盾之王）", "s"],
  origin: [" (오리진)", " (Origin)", "（オリジンフォルム）", "（起源）", "s"],
  white: [" (화이트)", " (White)", "（ホワイト）", "（白）", "s"],
  black: [" (블랙)", " (Black)", "（ブラック）", "（黑）", "s"],
  complete: [" (퍼펙트폼)", " (Complete Forme)", "（パーフェクトフォルム）", "（完全體）", "s"],
  resolute: [" (각오의 모습)", " (Resolute)", "（かくごのすがた）", "（覺悟）", "s"],
  shadow: ["그림자 ", "Shadow ", "シャドウ", "暗影", "p"],
};
const LI: Record<Locale, number> = { ko: 0, en: 1, ja: 2, "zh-TW": 3 };
function monNames(id: string, dex: number): Record<Locale, string> {
  const out = {} as Record<Locale, string>;
  for (const l of ["ko", "en", "ja", "zh-TW"] as Locale[]) {
    const base = PKN[String(dex)]?.[l] || PKN[String(dex)]?.en || id;
    let prefix = "", suffix = "";
    for (const [suf, v] of Object.entries(NAME_AFFIX)) {
      if (id.includes("_" + suf)) { const t = v[LI[l]]; if (v[4] === "p") prefix += t; else suffix += t; }
    }
    out[l] = prefix + base + suffix;
  }
  return out;
}

const SEASON = "시즌 27 (2026.06.02~09.09)";
const UPDATED = "2026-09-01";
// 자동 초안 IvEntry 빌더 — 시뮬 데이터 → genArticle(검수 후 손질 전제)
function mk(data: unknown): IvEntry {
  const sim = data as Sim;
  const dex = sim.dex ?? 0;
  const names = monNames(sim.speciesId, dex);
  const rivalNames = sim.rival && sim.rivalDex != null ? monNames(sim.rival, sim.rivalDex) : null;
  const en = genArticle(sim, names, rivalNames, SEASON, "en");
  return {
    sim, dex, rivalName: rivalNames, name: names, updated: UPDATED, season: SEASON,
    article: {
      ko: genArticle(sim, names, rivalNames, SEASON, "ko"), en,
      ja: genArticle(sim, names, rivalNames, SEASON, "ja"),
      "zh-TW": genArticle(sim, names, rivalNames, SEASON, "zh-TW"),
    },
    published: true,
  };
}

export const IV_ANALYSIS: Record<string, IvEntry> = {
  // 손수 작성·검수(고품질 기준)
  groudon: {
    sim: GROUDON as unknown as Sim, dex: 383,
    rivalName: { ko: "가이오가", en: "Kyogre", ja: "カイオーガ", "zh-TW": "蓋歐卡" },
    name: { ko: "그란돈", en: "Groudon", ja: "グラードン", "zh-TW": "固拉多" },
    updated: UPDATED, season: SEASON,
    article: {
      ko: groudon_ko, en: groudon_en,
      ja: genArticle(GROUDON as unknown as Sim, { ko: "그란돈", en: "Groudon", ja: "グラードン", "zh-TW": "固拉多" }, { ko: "가이오가", en: "Kyogre", ja: "カイオーガ", "zh-TW": "蓋歐卡" }, SEASON, "ja"),
      "zh-TW": genArticle(GROUDON as unknown as Sim, { ko: "그란돈", en: "Groudon", ja: "グラードン", "zh-TW": "固拉多" }, { ko: "가이오가", en: "Kyogre", ja: "カイオーガ", "zh-TW": "蓋歐卡" }, SEASON, "zh-TW"),
    },
    published: true,
  },
  // 자동 초안(검수 대기) — 마스터 실측 상위
  lunala: mk(LUNALA), reshiram: mk(RESHIRAM), zacian_crowned_sword: mk(ZACIAN_CS),
  xerneas: mk(XERNEAS), kyurem_white: mk(KYUREM_W), palkia_origin: mk(PALKIA_O),
  kyogre: mk(KYOGRE), zekrom: mk(ZEKROM), zygarde_complete: mk(ZYGARDE_C),
  ho_oh: mk(HO_OH), eternatus: mk(ETERNATUS), dialga_origin: mk(DIALGA_O),
  rhyperior_shadow: mk(RHYPERIOR_S), yveltal: mk(YVELTAL), keldeo_resolute: mk(KELDEO_R),
  rhyperior: mk(RHYPERIOR), metagross: mk(METAGROSS), gholdengo: mk(GHOLDENGO),
  garchomp: mk(GARCHOMP),
};

export function ivEntry(id: string): IvEntry | null {
  return IV_ANALYSIS[id] || null;
}
