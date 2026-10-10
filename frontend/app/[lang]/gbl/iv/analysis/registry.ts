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
// 시즌28 상위권 신규 8종
import URSALUNA from "../data/ursaluna.json";
import KYUREM_B from "../data/kyurem_black.json";
import RESHIRAM_S from "../data/reshiram_shadow.json";
import LUGIA from "../data/lugia.json";
import ZAMAZENTA_CS from "../data/zamazenta_crowned_shield.json";
import URSALUNA_S from "../data/ursaluna_shadow.json";
import NECROZMA_DW from "../data/necrozma_dawn_wings.json";
import MARSHADOW from "../data/marshadow.json";
// 10월 신규(2026-10-02~05 GO로켓단 이벤트 — 비주기 보상으로 데뷔. 레이드 보스가 아님)
import ZEKROM_S from "../data/zekrom_shadow.json";

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
  title: "그란돈 개체값 — 공격 15 필수 · 타협선 15/15/14 (마스터리그)",
  hook: "박스에 그란돈, 아직 안 보내셨죠? XL 겨우 모아서 강화하려는데 100%가 안 떴다면 — 강화 버튼 누르기 전에 딱 30초. 시즌28 메타로 다시 돌려봤더니 기준이 올라갔습니다.",
  lead: "시즌27까지는 \"공격 15만 지키면 방어·체력은 꽤 풀어줘도 된다\"가 맞았습니다. 시즌28은 다릅니다. 10월에 들어온 그림자 제크로무가 아슬아슬한 대면을 하나 만들면서, 방어를 1만 깎아도 티가 나기 시작했습니다. 마스터리그 상위 100종을 배틀 시뮬레이터로 전수 대입하고, 미러전·가이오가전·베스트파트너까지 다시 계산한 결과입니다. (100% 개체 실드1 성적 60승 40패)",
  compromise: "15 / 15 / 14",
  compromiseNote: "일반(L50) 기준 이 이상이면 100% 개체와 승패 매치업이 완전히 같습니다. 시즌27의 타협선(15/13/14)은 이제 타협 구간입니다.",
  verdict: [
    { tier: "grow", iv: "15 / 15 / 14 이상", note: "상위 100종 전수 대입에서 승패가 단 하나도 바뀌지 않습니다. 고민 말고 강화하세요." },
    { tier: "conditional", iv: "방어 13~14 (15/14/x · 15/13/15)", note: "그림자 제크로무를 실드 0개에서 놓칩니다. 그 하나뿐이라 당장 쓸 거면 OK인데, 시즌27처럼 \"방어는 풀어도 된다\"는 아닙니다." },
    { tier: "wait", iv: "공격 14 이하", note: "그란돈·가이오가·오리진 디아루가는 공격 실수치가 같아, 미러와 이 둘에게 동시차징(CMP) 우선권을 무조건 내줍니다. 강화하지 말고 더 좋은 개체를 기다리세요." },
  ],
  sections: [
    {
      h: "시즌28에서 바뀐 것 — 기준점이 그림자 제크로무로 옮겨갔습니다",
      body: "시즌27에서 그란돈의 타협선은 15/13/14였고, 가장 먼저 갈리는 상대는 게노세크트였습니다. 시즌28에선 10월에 들어온 그림자 제크로무가 그 자리를 가져갔습니다. 실드 0개 대결에서 방어 실수치 204.2(방어 15)와 203.4(방어 14)가 승패를 가릅니다 — 0.8 차이로 이기던 싸움을 집니다. 그래서 타협선이 15/13/14에서 15/15/14로 올라갔습니다. 지난 시즌 기준으로 키운 15/13/14 그란돈을 버릴 필요는 없지만(아래 참고), 지금 새로 고른다면 방어 15를 노리는 게 맞습니다.",
    },
    {
      h: "공격 14는 타협이 아니라 탈락입니다",
      body: "그란돈은 가이오가와 종족값·CP가 완전히 같습니다. 두 마리가 같은 턴에 차지를 쏘면 공격 종족값이 높은 쪽이 먼저 터지는데(동시차징·CMP), 공격 14면 공격 15 상대에게 이 우선권을 무조건 내줍니다. 공14 그란돈을 공15 가이오가와 붙이면 실드 0·1·2 전부 대패했고(레이팅 154·233·176), 그란돈 미러도 실드 0에서 494 대 505, 실드 2에서 339 대 660으로 집니다. 실드 1에서만 500 대 500 무승부입니다. 방어·체력은 하나쯤 흠집 나도 실전에서 티가 잘 안 나지만, 공격만은 15가 아니면 미러·라이벌전을 통째로 내줍니다.",
    },
    {
      h: "이번 시즌엔 체력보다 방어가 민감합니다 — 순서가 뒤집혔습니다",
      body: "체력만 1 낮춘 15/15/14는 상위 100종 전부와 붙여도 승패가 하나도 바뀌지 않습니다(실질 HP 184로 동일). 반면 방어를 1 낮춘 15/14/15는 HP가 그대로인데도 그림자 제크로무를 실드 0개에서 놓칩니다. 시즌27 분석에서 \"방어를 1~2 낮추는 건 승패에 티가 잘 안 난다\"고 적었는데, 시즌28에선 반대가 됐습니다. 체력은 -1까지 무해하고 -2(15/15/13, 실질 HP 183)부터 게노세크트(프리즈카세트)와 그림자 갑주무사까지 추가로 놓칩니다.",
    },
    {
      h: "더 내리면 어디서부터 쌓이나",
      body: "15/13/14까지 가면 그림자 제크로무·게노세크트에 더해 그림자 다투곰까지, 15/10/14면 그림자 잠만보(실드 0)와 우라오스(일격의 태세, 실드 1)가 추가됩니다. 다만 이건 \"못 쓴다\"가 아니라 \"특정 대면을 포기한다\"는 뜻입니다. 놓치는 상대의 실측 픽률이 낮다면 실전 손실은 생각보다 작습니다. 이미 키운 15/13/14가 있다면 계속 쓰셔도 되고, 새로 강화할 개체를 고르는 중이라면 방어를 챙기세요.",
    },
    {
      h: "베스트파트너 효과 — 상대가 노베파냐, 베파냐로 갈립니다",
      body: "베스트파트너(레벨 +1)의 효과는 상대도 베스트파트너인지에 따라 완전히 달라집니다. 흔한 착각이 \"내 것만 베파로 계산\"하는 것인데, 그러면 효과가 부풀려집니다. 두 경우를 모두 돌렸습니다. ① 상대가 베스트파트너가 아니면(L50) — 실드 1개 기준 새로 이기는 상대가 8종입니다: 가이오가·그림자 가이오가, 제크로무, 그림자 메타그로스·그림자 망나뇽, 잠만보, 그란돈 미러, 그림자 그란돈. 레벨이 1 높아 우선권·스탯 싸움에서 앞서기 때문입니다. ② 그런데 마스터 상위권 전설은 상대도 대부분 베스트파트너입니다(L51). 양쪽 다 L51이면 미러·가이오가는 다시 무승부로 돌아가고, 새로 잡는 건 그림자 메타그로스·그림자 망나뇽 2종뿐입니다. 정리하면 베스트파트너는 손해가 전혀 없고 노베파 상대에겐 확실한 우위지만, 상대도 베파인 미러를 이기게 해주는 마법은 아닙니다.",
    },
    {
      body: "한 가지 덧붙이면, 이 브레이크포인트는 메타가 바뀌면 함께 움직입니다. 이번 시즌에 그림자 제크로무 하나가 들어오면서 타협선이 두 칸 올라간 게 그 증거입니다. 지금 당장 쓸 게 아니라면 이왕이면 고개체를 잡아두는 편이 마음 편합니다.",
    },
  ],
  faq: [
    { q: "공격 14인데 그냥 강화해도 되나요?", a: "비추천입니다. 그란돈은 가이오가·오리진 디아루가와 공격 실수치가 같아서, 공14면 이 셋과 미러전에서 동시차징 우선권을 무조건 내줍니다. 실드 싸움을 50:50으로 갈 걸 0:100으로 지는 셈이라, 미러가 잦은 마스터리그에선 치명적입니다." },
    { q: "시즌27에 키운 15/13/14, 다시 키워야 하나요?", a: "아니요. 15/13/14는 시즌28 기준으로 그림자 제크로무·게노세크트·그림자 다투곰을 놓치지만, 나머지 90여 종에선 백과 같습니다. 이미 XL까지 부은 개체를 갈아엎을 이유는 없습니다. 다만 새로 고를 때는 방어 15를 노리세요 — 같은 비용으로 대면 3개를 더 잡습니다." },
    { q: "15/15/14랑 15/14/15 중 뭘 키우죠?", a: "15/15/14입니다. 이번 시즌엔 방어가 더 민감합니다. 체력 -1(15/15/14)은 실질 HP가 184로 그대로라 승패가 하나도 안 바뀌는데, 방어 -1(15/14/15)은 그림자 제크로무를 실드 0개에서 놓칩니다." },
    { q: "이 기준은 언제까지 유효한가요?", a: "시즌 28(황혼의 여정) 메타 기준입니다. 그림자 제크로무가 들어오면서 타협선이 바뀐 것처럼, 신규 포켓몬이나 픽률 변화가 생기면 브레이크포인트도 움직입니다. 시즌이 바뀌면 상위 100종을 다시 전수 시뮬해서 갱신합니다." },
  ],
  closing: "정리 — 공격 15는 타협 불가(미러·가이오가 CMP), 이번 시즌 타협선은 15/15/14. 체력은 -1까지 무해하지만 방어는 -1부터 그림자 제크로무를 놓칩니다. 지난 시즌의 15/13/14는 이제 타협 구간이지만, 이미 키웠다면 바꿀 필요는 없습니다. 시즌 28 메타 기준이며 시즌이 바뀌면 갱신합니다.",
};

const groudon_en: Article = {
  title: "Groudon IVs — Attack 15 Required · Line 15/15/14 (Master League)",
  hook: "Still got a Groudon sitting in your box? Finally scraped the XL together but it didn't come out 100%? Before you hit power-up — 30 seconds. We re-ran it on the Season 28 meta and the bar moved up.",
  lead: "Through Season 27 the rule was \"keep attack at 15 and you can be relaxed about defense and HP.\" Season 28 is different. Shadow Zekrom arrived in October and created one knife-edge matchup, so shaving even a single point of defense now shows. Below is the top 100 of the Master meta run through a battle simulator, plus the mirror, Kyogre and best buddy, all recalculated. (Hundo 1-shield record: 60W 40L.)",
  compromise: "15 / 15 / 14",
  compromiseNote: "At L50, at or above this the win/loss matchups are identical to a hundo. Season 27's line (15/13/14) is now inside the compromise zone.",
  verdict: [
    { tier: "grow", iv: "15 / 15 / 14 or better", note: "Not a single matchup flips across the full top 100. Don't overthink it — power it up." },
    { tier: "conditional", iv: "Defense 13–14 (15/14/x, 15/13/15)", note: "You lose Shadow Zekrom at 0 shields. That's the only one, so it's fine if you need it now — but 'defense is free' no longer holds." },
    { tier: "wait", iv: "Attack 14 or below", note: "Groudon, Kyogre and Origin Dialga share the same effective attack, so attack-14 always loses CMP priority in the mirror and to those two. Don't build it — wait for a better one." },
  ],
  sections: [
    {
      h: "What changed in Season 28 — the reference matchup moved to Shadow Zekrom",
      body: "In Season 27 Groudon's line was 15/13/14 and the first matchup to go was Genesect. In Season 28 that role belongs to Shadow Zekrom, which arrived in October. At 0 shields, the difference between 204.2 defense (def 15) and 203.4 (def 14) decides the fight — 0.8 of a stat turns a win into a loss. That's why the line moved from 15/13/14 up to 15/15/14. You don't need to scrap a Groudon built to last season's line (see below), but if you're picking a new one, aim for defense 15.",
    },
    {
      h: "Attack 14 isn't a compromise — it's a fail",
      body: "Groudon shares identical base stats and CP with Kyogre. When both fire a charged move on the same turn, the higher attack goes first (CMP) — and attack 14 always loses that priority to an attack-15 opponent. In the sim, attack-14 Groudon lost to attack-15 Kyogre across 0/1/2 shields (ratings 154/233/176), and lost the mirror at 0 shields (494 vs 505) and at 2 shields (339 vs 660); only 1 shield is a 500-500 tie. A nick in defense or HP barely shows in practice, but anything below attack 15 hands over the mirror and the rival outright.",
    },
    {
      h: "This season defense matters more than HP — the order flipped",
      body: "Dropping HP by one (15/15/14) doesn't flip a single matchup across all 100 — effective HP stays 184. But dropping defense by one (15/14/15) keeps HP intact and still loses Shadow Zekrom at 0 shields. Our Season 27 write-up said shaving one or two points of defense barely shows; in Season 28 it's the reverse. HP is free down to -1, and from -2 (15/15/13, 183 effective HP) you also drop Genesect (Chill Drive) and Shadow Golisopod.",
    },
    {
      h: "Going lower — what stacks up",
      body: "At 15/13/14 you add Shadow Ursaluna on top of Shadow Zekrom and Genesect; at 15/10/14 you also give up Shadow Snorlax (0 shields) and Urshifu Single Strike (1 shield). That doesn't mean 'unusable' — it means 'you concede specific matchups.' If those opponents have low real-world pick rates the practical cost is smaller than it looks. Keep using a 15/13/14 you already built; just weight defense when choosing the next one.",
    },
    {
      h: "Best buddy — it depends on whether the opponent is best-buddied too",
      body: "Best buddy (level +1) helps, but the size of the gain depends entirely on whether the opponent is best-buddied. The common mistake is to compute only your side as best-buddied, which inflates the effect. We ran both. (1) If the opponent is NOT best-buddied (L50), you newly win 8 matchups at 1 shield: Kyogre and Shadow Kyogre, Zekrom, Shadow Metagross and Shadow Dragonite, Snorlax, the Groudon mirror and Shadow Groudon — the extra level wins the priority and stat race. (2) But top-tier Master legendaries are usually best-buddied too (L51). With both at L51 the mirror and Kyogre go back to a tie, and you newly win only two: Shadow Metagross and Shadow Dragonite. So best buddy never hurts and is a clear edge against non-best-buddied opponents, but it is not a magic button that wins the best-buddied mirror.",
    },
    {
      body: "One caveat: these breakpoints move with the meta — a single new arrival (Shadow Zekrom) pushed the line up two steps this season. If you're not using it right now, banking a higher-IV catch is the easier peace of mind.",
    },
  ],
  faq: [
    { q: "Attack is 14 — can I just build it?", a: "Not recommended. Groudon shares its effective attack with Kyogre and Origin Dialga, so at attack 14 you always lose CMP priority to all three in the mirror. A shield fight that should be 50:50 becomes 0:100 — brutal in a mirror-heavy Master League." },
    { q: "I built a 15/13/14 last season. Do I need a new one?", a: "No. On the Season 28 meta a 15/13/14 drops Shadow Zekrom, Genesect and Shadow Ursaluna, but matches a hundo against the other ~90. There's no reason to throw away a Pokémon you already poured XL into. Just aim for defense 15 on the next one — same cost, three more matchups." },
    { q: "15/15/14 or 15/14/15 — which do I build?", a: "15/15/14. Defense is the sensitive stat this season. HP -1 (15/15/14) keeps effective HP at 184 and flips nothing, while defense -1 (15/14/15) loses Shadow Zekrom at 0 shields." },
    { q: "How long does this hold?", a: "It's the Season 28 (Twilight Trails) meta. Just as Shadow Zekrom's arrival moved the line, new Pokémon or usage shifts will move the breakpoints again. When the season changes we re-run the full top-100 sim and update this." },
  ],
  closing: "Bottom line — attack 15 is non-negotiable (mirror & Kyogre CMP), and this season's line is 15/15/14. HP is free down to -1, but defense -1 already costs you Shadow Zekrom. Last season's 15/13/14 now sits in the compromise zone, though there's no need to replace one you've already built. Based on the Season 28 meta; updated when the season changes.",
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
  dawn_wings: [" (새벽의 날개)", " (Dawn Wings)", "（あかつきのつばさ）", "（拂曉之翼）", "s"],
  dusk_mane: [" (황혼의 갈기)", " (Dusk Mane)", "（たそがれのたてがみ）", "（黃昏之鬃）", "s"],
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

const SEASON = "시즌 28 (2026.09.08~12.01)";
const UPDATED = "2026-10-09";
// 자동 초안 IvEntry 빌더 — 시뮬 데이터 → genArticle(검수 후 손질 전제)
function mk(data: unknown, updated: string = UPDATED): IvEntry {
  const sim = data as Sim;
  const dex = sim.dex ?? 0;
  const names = monNames(sim.speciesId, dex);
  const rivalNames = sim.rival && sim.rivalDex != null ? monNames(sim.rival, sim.rivalDex) : null;
  const en = genArticle(sim, names, rivalNames, SEASON, "en");
  return {
    sim, dex, rivalName: rivalNames, name: names, updated, season: SEASON,
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
  // 시즌28 상위권 신규(기존 20종은 순위가 내려가도 유지 — 이미 색인된 페이지를 버리지 않는다)
  ursaluna: mk(URSALUNA), kyurem_black: mk(KYUREM_B), reshiram_shadow: mk(RESHIRAM_S),
  lugia: mk(LUGIA), zamazenta_crowned_shield: mk(ZAMAZENTA_CS), ursaluna_shadow: mk(URSALUNA_S),
  necrozma_dawn_wings: mk(NECROZMA_DW), marshadow: mk(MARSHADOW),
  // 10월 신규(비주기 보상) — 그림자 레시라무와 공격 실수치가 같아 서로 CMP 라이벌
  zekrom_shadow: mk(ZEKROM_S, "2026-10-10"),
};

export function ivEntry(id: string): IvEntry | null {
  return IV_ANALYSIS[id] || null;
}
