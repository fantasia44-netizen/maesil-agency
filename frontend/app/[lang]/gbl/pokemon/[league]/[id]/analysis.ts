// 데이터 파생 분석문 생성 — 템플릿 1개가 아니라 데이터 조건에 따라 "분석 논리 자체"가 분기.
// (티어 vs 실측 괴리 / 역할 성향 / 스탯 성향 / 메타 카운터 가치 / 주의 상대)
// → 포켓몬마다 서로 다른 문장 조합이 나와 thin/template 콘텐츠를 벗어남.
import { type Locale } from "../../../../../../lib/i18n";
import { typeLabel } from "../../../typeLabels";
import { defensiveProfile, stabCoverage } from "./typeChart";

export type AnalysisCtx = {
  lang: Locale;
  leagueName: string;
  tier: string;              // S/A/B/C/D
  scores: number[];          // [선봉,마무리,교체,차지,공격,일관성] 0~100
  atk: number; def: number; hp: number;
  types: string[];           // 타입(방어 프로필·자속 커버리지 계산)
  pickRate?: number;         // 실측 픽률 %
  pickRank?: number;         // 실측 순위(1-base) — 상위권 판정
  theoryRank?: number;       // 이론(PvPoke score) 순위 — 실측과 괴리 수치화
  topCounterName?: string;   // 가장 위협적인 카운터
  topCounterRank?: number;   // 그 카운터의 실측 사용률 순위(있으면 결합)
  beatsMetaName?: string;    // 이 포켓몬이 잡는 "현재 실측 상위" 상대(폴백용 단일)
  beatsMetaPct?: number;
  beatsNames?: string;       // 이 몬이 유리한 실측 상위 상대(로케일명+순위 조인). 있으면 우선.
};

// 결과 = 강점/약점/평가 3구조(양 AI 권고: 분석 문서로 인식 + 단점 필수).
export type AnalysisOut = { strengths: string[]; weaknesses: string[]; verdict: string | null; thinNote?: string };
export const HEADINGS: Record<Locale, { strengths: string; weaknesses: string; verdict: string }> = {
  ko: { strengths: "강점 · 활용법", weaknesses: "약점 · 주의 상대", verdict: "GBL Note 평가" },
  en: { strengths: "Strengths & how to use", weaknesses: "Weaknesses & threats", verdict: "GBL Note verdict" },
  ja: { strengths: "強み・活用法", weaknesses: "弱点・注意する相手", verdict: "GBL Note 評価" },
  "zh-TW": { strengths: "優勢·活用法", weaknesses: "弱點·注意對手", verdict: "GBL Note 評價" },
};

// 역할 인덱스 → 의미 키
const ROLE_KEYS = ["lead", "closer", "switch", "charger", "attacker", "consistency"] as const;
type RoleKey = (typeof ROLE_KEYS)[number];

type Phr = {
  // 티어×실측 괴리 (택1)
  provenTop: (lg: string, pr: number) => string;
  hiddenPick: (tier: string) => string;
  underrated: (tier: string, pr: number) => string;
  common: (lg: string, pr: number) => string;
  neutral: (lg: string, tier: string) => string;
  // 역할 성향
  role: Record<RoleKey, string>;
  roleShort: string[];                         // 역할 짧은 이름(ROLE_KEYS 순서)
  roleVersatile: (roles: string) => string;    // 동점/근소차 → 다양한 포지션
  // 스탯 성향
  glass: string;
  bulky: string;
  // 이론 순위 vs 실측 순위 괴리(수치)
  rankTheoryHigh: (tr: number, ur: number) => string;
  rankUsageHigh: (tr: number, ur: number) => string;
  // 메타 카운터 / 주의
  metaCounter: (name: string, pct: number) => string;
  caution: (name: string) => string;
  cautionRanked: (name: string, rank: number) => string;   // 카운터 + 실측 순위 결합
  // 타입 기반(모든 몬 항상 계산 가능 — 폴백 핵심) + 실측 승패 결합
  sMetaBeats: (names: string) => string;
  sTypeDef: (desc: string) => string;          // desc = "이중반감·무효 A · 반감 B"(빌드됨)
  sStab: (stab: string, tg: string) => string;
  wTypeWeak: (desc: string) => string;         // desc = "4배 약점 A · 약점 B"(빌드됨)
  wStrongWord: string; wResistWord: string; wWeakWord: string; wDoubleWord: string; // 상성 단어
  etc: string;
};

const PH: Record<Locale, Phr> = {
  ko: {
    provenTop: (lg, pr) => `실측 픽률 ${pr}%로 현재 ${lg}에서 실제로 자주 만나는 검증된 픽입니다.`,
    hiddenPick: (tier) => `이론상 ${tier}티어 상위 평가지만 실측 등장률은 아직 낮아, 상대가 덜 대비하는 기습 카드로 쓸 여지가 있습니다.`,
    underrated: (tier, pr) => `티어 평가는 ${tier}로 높지 않지만 실전에서 ${pr}% 꾸준히 목격되는, 실측이 이론보다 앞서는 픽입니다.`,
    common: (lg, pr) => `실측 픽률 ${pr}%로 ${lg}에서 무난히 통용되는 선택지입니다.`,
    neutral: (lg, tier) => `${lg} ${tier}티어 평가로, 기술 구성과 파티 시너지에 따라 실전 활용도가 갈립니다.`,
    role: {
      lead: "역할 점수상 선봉(리드)에서 가장 강해 초반 주도권을 잡는 데 적합합니다.",
      closer: "실드를 소진한 후반, 마무리(클로저) 역할에서 진가를 발휘합니다.",
      switch: "선봉보다 세이프스왑(교체) 대응 카드로 배치할 때 성능이 두드러집니다.",
      charger: "차지 기술 압박이 강해 상대 실드를 빠르게 소모시키는 데 강점이 있습니다.",
      attacker: "순수 딜링이 높아 상성만 맞으면 큰 데미지를 밀어 넣습니다.",
      consistency: "상성 안정성이 높아 폭넓은 상대에게 고르게 무난한 성능을 냅니다.",
    },
    roleShort: ["선봉", "마무리", "교체", "차지", "공격", "일관성"],
    roleVersatile: (roles) => `${roles} 등 여러 역할 점수가 고르게 높아 특정 포지션에 국한되지 않고 다양하게 기용할 수 있습니다.`,
    glass: "공격 종족값이 높은 대신 내구가 얇아, 실드 관리가 승패를 크게 가릅니다.",
    bulky: "내구 종족값이 탄탄해 오래 버티며 이득을 쌓는 안정적 운영이 가능합니다.",
    rankTheoryHigh: (tr, ur) => `이론 순위 ${tr}위 대비 실측 사용률은 ${ur}위로, 이론 성능보다 실제 채용이 낮은 편입니다.`,
    rankUsageHigh: (tr, ur) => `이론 순위 ${tr}위지만 실측 사용률은 ${ur}위로, 이론보다 실전에서 더 많이 선택됩니다.`,
    metaCounter: (name, pct) => `특히 현재 실측 상위권인 ${name}(${pct}%)를 상대로 우위를 가져, 메타 카운터로서의 가치가 높습니다.`,
    caution: (name) => `다만 ${name} 같은 상대에게는 불리하므로 맞대면을 피하는 운용이 안전합니다.`,
    cautionRanked: (name, rank) => `특히 실측 사용률 ${rank}위인 ${name}에게 불리해, 현재 메타에서는 이 매치업을 피하는 편이 안전합니다.`,
    sMetaBeats: (names) => `현재 실측에서 자주 나오는 ${names}에게 유리한 결과를 내, 메타 카운터로서의 가치가 있습니다.`,
    sTypeDef: (desc) => `타입 상성상 ${desc} — 해당 타입 공격수 앞에서 잘 버팁니다.`,
    sStab: (stab, tg) => `자속 ${stab} 기술로 ${tg} 타입을 효과적으로 찔러, 상성이 맞으면 확실한 딜을 냅니다.`,
    wTypeWeak: (desc) => `타입 상성상 ${desc} — 해당 타입 상대는 주의해야 합니다.`,
    wStrongWord: "이중반감", wResistWord: "반감", wWeakWord: "약점", wDoubleWord: "이중 약점",
    etc: "등",
  },
  en: {
    provenTop: (lg, pr) => `At a ${pr}% real pick rate, it's a proven pick you'll actually run into often in ${lg} right now.`,
    hiddenPick: (tier) => `It's rated ${tier}-tier on paper but still shows a low real pick rate, leaving room to use it as a surprise pick opponents underprepare for.`,
    underrated: (tier, pr) => `Its ${tier}-tier rating isn't high, yet it's seen ${pr}% in real play — a case where field data runs ahead of theory.`,
    common: (lg, pr) => `With a ${pr}% real pick rate, it's a solid, widely-used option in ${lg}.`,
    neutral: (lg, tier) => `Rated ${tier}-tier in ${lg}; its real value swings on moveset and team synergy.`,
    role: {
      lead: "Its role scores peak on Lead, making it well-suited to seizing early tempo.",
      closer: "It shines as a Closer late-game, once shields are spent.",
      switch: "It performs best as a safe-swap response rather than a dedicated lead.",
      charger: "Strong charge pressure lets it burn through opposing shields quickly.",
      attacker: "High raw damage means it hits hard whenever typing lines up.",
      consistency: "High matchup stability gives it even, reliable performance across a wide field.",
    },
    roleShort: ["Lead", "Closer", "Switch", "Charger", "Attacker", "Consistency"],
    roleVersatile: (roles) => `Its ${roles} role scores are all high, so it isn't tied to one slot and can flex across positions.`,
    glass: "High attack but thin bulk means shield management heavily decides its games.",
    bulky: "Solid bulk lets it stall and grind out advantage in extended fights.",
    rankTheoryHigh: (tr, ur) => `Ranked #${tr} on paper but #${ur} by real usage — picked less than its rating suggests.`,
    rankUsageHigh: (tr, ur) => `Ranked #${tr} on paper yet #${ur} by real usage — chosen more in practice than theory implies.`,
    metaCounter: (name, pct) => `Notably, it holds an edge against ${name} (${pct}%), a current field-meta staple — giving it real value as a meta counter.`,
    caution: (name) => `That said, it's unfavored into threats like ${name}, so avoid that head-to-head.`,
    cautionRanked: (name, rank) => `It's notably unfavored into ${name} (usage rank #${rank}), common right now, so dodging that matchup is safer in the current meta.`,
    sMetaBeats: (names) => `It posts favorable results against current field-meta staples ${names}, giving it real value as a meta counter.`,
    sTypeDef: (desc) => `On defense it ${desc}, holding up well against those attackers.`,
    sStab: (stab, tg) => `Its STAB ${stab} hits ${tg} super-effectively, landing real damage when the matchup lines up.`,
    wTypeWeak: (desc) => `On defense it ${desc}, so watch out for those attackers.`,
    wStrongWord: "double-resists", wResistWord: "resists", wWeakWord: "is weak to", wDoubleWord: "is doubly weak to",
    etc: "etc",
  },
  ja: {
    provenTop: (lg, pr) => `実測ピック率${pr}%で、現在の${lg}で実際によく遭遇する実戦検証済みのピックです。`,
    hiddenPick: (tier) => `理論上は${tier}ティア上位評価ですが実測登場率はまだ低く、相手が対策しにくい奇襲枠として使う余地があります。`,
    underrated: (tier, pr) => `ティア評価は${tier}と高くないものの、実戦では${pr}%と着実に目撃される、実測が理論を上回るピックです。`,
    common: (lg, pr) => `実測ピック率${pr}%で、${lg}で無難に通用する選択肢です。`,
    neutral: (lg, tier) => `${lg}${tier}ティア評価で、技構成とパーティ相性で実戦価値が変わります。`,
    role: {
      lead: "役割スコア上は先発が最も高く、序盤の主導権を握るのに適します。",
      closer: "シールドを使い切った終盤、締め(クローザー)役で真価を発揮します。",
      switch: "先発よりセーフスワップ(交代)対応枠として置くと性能が際立ちます。",
      charger: "ゲージ技の圧が強く、相手のシールドを素早く削るのが強みです。",
      attacker: "純粋な火力が高く、相性さえ合えば大きなダメージを通します。",
      consistency: "相性安定性が高く、幅広い相手に均一で無難な性能を出します。",
    },
    roleShort: ["先発", "締め", "交代", "ゲージ", "攻撃", "一貫性"],
    roleVersatile: (roles) => `${roles}など複数の役割スコアが揃って高く、特定のポジションに縛られず幅広く起用できます。`,
    glass: "攻撃種族値が高い反面、耐久が薄く、シールド管理が勝敗を大きく分けます。",
    bulky: "耐久種族値が厚く、長く粘って有利を積む安定運用が可能です。",
    rankTheoryHigh: (tr, ur) => `理論順位${tr}位に対し実測使用率は${ur}位で、理論性能より実際の採用が低めです。`,
    rankUsageHigh: (tr, ur) => `理論順位${tr}位ですが実測使用率は${ur}位で、理論より実戦で多く選ばれています。`,
    metaCounter: (name, pct) => `特に現在の実測上位である${name}(${pct}%)に対して有利を取れ、メタカウンターとしての価値が高いです。`,
    caution: (name) => `ただし${name}のような相手には不利なため、対面を避ける運用が安全です。`,
    cautionRanked: (name, rank) => `特に実測使用率${rank}位の${name}に不利で、現環境ではこの対面を避けるのが安全です。`,
    sMetaBeats: (names) => `現在実測で多く見られる${names}に有利な結果を出し、メタカウンターとしての価値があります。`,
    sTypeDef: (desc) => `タイプ相性上 ${desc} — これらの攻撃前で粘れます。`,
    sStab: (stab, tg) => `自タイプ${stab}技で${tg}を効果的に突き、噛み合えば確実にダメージを通します。`,
    wTypeWeak: (desc) => `タイプ相性上 ${desc} — 該当タイプの相手には注意が必要です。`,
    wStrongWord: "二重半減", wResistWord: "半減", wWeakWord: "弱点", wDoubleWord: "二重弱点",
    etc: "など",
  },
  "zh-TW": {
    provenTop: (lg, pr) => `以${pr}%的實測使用率，是目前${lg}中實際常遇到、經過實戰驗證的選擇。`,
    hiddenPick: (tier) => `理論上評為${tier}強度上位，但實測登場率仍低，可作為對手較少準備的奇襲選擇。`,
    underrated: (tier, pr) => `強度評價${tier}並不算高，實戰卻穩定出現${pr}%，是實測領先理論的選擇。`,
    common: (lg, pr) => `以${pr}%的實測使用率，是${lg}中通用穩健的選項。`,
    neutral: (lg, tier) => `${lg}${tier}強度評價，實戰價值取決於招式配置與隊伍相性。`,
    role: {
      lead: "角色評分以先鋒最高，適合搶下前期主導權。",
      closer: "在護盾耗盡的後期，以收尾角色發揮真正價值。",
      switch: "作為安全換場（換場）應對而非先鋒時表現更突出。",
      charger: "特殊招式壓迫強，能快速消耗對手護盾。",
      attacker: "純輸出高，相性對上時能打出可觀傷害。",
      consistency: "相性穩定性高，面對廣泛對手都有均衡穩健的表現。",
    },
    roleShort: ["先鋒", "收尾", "換場", "充能", "輸出", "穩定"],
    roleVersatile: (roles) => `${roles}等多個角色評分都高，不受限於特定位置，可靈活運用於各種位置。`,
    glass: "攻擊種族值高但耐久偏薄，護盾管理將大幅左右勝負。",
    bulky: "耐久種族值紮實，可長期消耗、累積優勢的穩定運用。",
    rankTheoryHigh: (tr, ur) => `理論排名第${tr}，實測使用率卻第${ur}——實際採用低於理論評價。`,
    rankUsageHigh: (tr, ur) => `理論排名第${tr}，實測使用率第${ur}——實戰採用高於理論評價。`,
    metaCounter: (name, pct) => `尤其能對目前實測上位的${name}(${pct}%)取得優勢，作為Meta剋星價值很高。`,
    caution: (name) => `不過面對${name}這類對手較為不利，建議避免正面對上。`,
    cautionRanked: (name, rank) => `尤其對實測使用率第${rank}名的${name}不利，當前環境建議避開此對面。`,
    sMetaBeats: (names) => `對目前實測常見的${names}取得有利結果，作為Meta剋星具有價值。`,
    sTypeDef: (desc) => `屬性上 ${desc} — 面對這些屬性的攻擊很耐打。`,
    sStab: (stab, tg) => `本系${stab}招式能有效打擊${tg}，對上時能造成確實傷害。`,
    wTypeWeak: (desc) => `屬性上 ${desc} — 需提防這些屬性的對手。`,
    wStrongWord: "雙重減半", wResistWord: "減半", wWeakWord: "弱點", wDoubleWord: "雙重弱點",
    etc: "等",
  },
};

// 강점/약점/평가 3구조로 데이터에서 조합(모든 몬 최소 타입 기반 장·단점 확보 = thin 폴백).
export function buildAnalysis(ctx: AnalysisCtx): AnalysisOut {
  const p = PH[ctx.lang] || PH.ko;
  const T = (t: string) => typeLabel(ctx.lang, t);
  const joinT = (arr: string[], cap = 6) => arr.slice(0, cap).map(T).join(" · ") + (arr.length > cap ? ` ${p.etc}` : "");
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const top = ["S", "A"].includes(ctx.tier);
  const low = ["C", "D"].includes(ctx.tier);
  const prof = defensiveProfile(ctx.types || []);
  const bulk = (ctx.def + ctx.hp) / 2;

  // ── 강점 ──
  // 역할 — 포지션 3역할(선봉0·마무리1·교체2)이 근소차(≤5)로 여럿 높으면 "다양한 포지션",
  //        아니면 단일 최고 역할. (따라큐 100/100/100 동점 오판 방지)
  const s = ctx.scores;
  if (s && s.length === 6) {
    const maxPos = Math.max(s[0], s[1], s[2]);
    const near = [0, 1, 2].filter((i) => s[i] >= maxPos - 5 && s[i] >= 70);
    if (near.length >= 2) {
      strengths.push(p.roleVersatile(near.map((i) => p.roleShort[i]).join(" · ")));
    } else {
      let maxI = 0;
      for (let i = 1; i < 6; i++) if (s[i] > s[maxI]) maxI = i;
      if (s[2] >= s[0] + 12 && maxI === 0) maxI = 2; // 교체 우선
      strengths.push(p.role[ROLE_KEYS[maxI]]);
    }
  }
  // 실측 대응력 — 실측 상위 상대 리스트(순위 포함) 있으면 우선, 없으면 단일 메타카운터
  if (ctx.beatsNames) {
    strengths.push(p.sMetaBeats(ctx.beatsNames));
  } else if (ctx.beatsMetaName && ctx.beatsMetaPct != null) {
    strengths.push(p.metaCounter(ctx.beatsMetaName, ctx.beatsMetaPct));
  }
  // 타입 방어(항상 계산 가능 — 폴백 핵심). 이중반감/반감 분리 조립(중복 표기 방지).
  const sParts: string[] = [];
  if (prof.strongResist.length) sParts.push(`${p.wStrongWord} ${joinT(prof.strongResist, 4)}`);
  if (prof.resist.length) sParts.push(`${p.wResistWord} ${joinT(prof.resist)}`);
  if (prof.strongResist.length + prof.resist.length >= 2) strengths.push(p.sTypeDef(sParts.join(" · ")));
  // 내구형
  if (bulk >= ctx.atk + 35) strengths.push(p.bulky);
  // 자속 커버리지(강점 2개 미만이면 보강)
  if (strengths.length < 2) {
    const stab = stabCoverage(ctx.types || []);
    if (stab.length && (ctx.types || []).length) strengths.push(p.sStab(joinT(ctx.types || [], 2), joinT(stab)));
  }

  // ── 약점 ──
  const wParts: string[] = [];
  if (prof.doubleWeak.length) wParts.push(`${p.wDoubleWord} ${joinT(prof.doubleWeak, 3)}`);
  if (prof.weak.length) wParts.push(`${p.wWeakWord} ${joinT(prof.weak)}`);
  if (wParts.length) weaknesses.push(p.wTypeWeak(wParts.join(" · ")));
  if (ctx.atk >= bulk + 35) weaknesses.push(p.glass); // 유리대포=얇은 내구
  if (ctx.topCounterName) weaknesses.push(ctx.topCounterRank ? p.cautionRanked(ctx.topCounterName, ctx.topCounterRank) : p.caution(ctx.topCounterName));

  // ── 평가(verdict) — 티어×실측 + 이론vs실측 괴리 ──
  const v: string[] = [];
  if (ctx.pickRank != null && ctx.pickRank <= 10) v.push(p.provenTop(ctx.leagueName, ctx.pickRate ?? 0));
  else if (top && (ctx.pickRate == null || ctx.pickRate < 3)) v.push(p.hiddenPick(ctx.tier));
  else if (low && ctx.pickRate != null && ctx.pickRate >= 2) v.push(p.underrated(ctx.tier, ctx.pickRate));
  else if (ctx.pickRate != null) v.push(p.common(ctx.leagueName, ctx.pickRate));
  else v.push(p.neutral(ctx.leagueName, ctx.tier));
  if (ctx.theoryRank && ctx.pickRank) {
    const gap = ctx.pickRank - ctx.theoryRank;
    if (gap >= 12) v.push(p.rankTheoryHigh(ctx.theoryRank, ctx.pickRank));
    else if (gap <= -12) v.push(p.rankUsageHigh(ctx.theoryRank, ctx.pickRank));
  }

  return { strengths, weaknesses, verdict: v.join(" ") };
}
