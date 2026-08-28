// 리그 단위 데이터 파생 분석문 — tier/cmp 페이지용.
// 실제 데이터(티어 분포·실측 픽률·공격 종족값)에서 계산한 리그별 고유 해석.
// 데이터가 갱신되면 문장도 자연히 바뀜(고정 템플릿 아님).
import { type Locale } from "../../../lib/i18n";

type TierItem = { id: string; tier: string; score: number };
type CmpItem = { id: string; atk: number };

// ── 티어표 분석 ──────────────────────────────────────────────────────────────
export function tierAnalysis(
  lang: Locale, lgName: string, list: TierItem[],
  pick: Record<string, number>, name: (id: string) => string,
): string {
  if (!list.length) return "";
  const sCount = list.filter((d) => d.tier === "S").length;
  const aCount = list.filter((d) => d.tier === "A").length;

  // 실측 1위(리스트 내 픽률 최대)
  let topId = "", topPct = -1;
  for (const d of list) { const p = pick[d.id]; if (p != null && p > topPct) { topPct = p; topId = d.id; } }

  // 이론 vs 실측 괴리 케이스
  const highTierLowPick = list.find((d) => (d.tier === "S" || d.tier === "A") && (pick[d.id] == null || pick[d.id] < 2));
  const lowTierHighPick = list.find((d) => (d.tier === "C" || d.tier === "D") && (pick[d.id] ?? 0) >= 3);

  const L = {
    ko: {
      dist: `이번 ${lgName} 티어표는 S티어 ${sCount}종, A티어 ${aCount}종으로 구성됩니다.`,
      top: topId ? ` 실측 픽률 1위는 ${name(topId)}(${topPct}%)로, 티어 평가가 실전에서도 통하는지 바로 대조할 수 있습니다.` : "",
      hi: highTierLowPick ? ` 이론 평가가 높은 ${name(highTierLowPick.id)}는 실측 등장이 드물어, 상위 티어라도 실전 채택은 갈립니다.` : "",
      lo: lowTierHighPick ? ` 반대로 ${name(lowTierHighPick.id)}는 티어는 낮게 평가되지만 실측에선 꾸준히 보여, 이론과 실전의 간극을 드러냅니다.` : "",
    },
    en: {
      dist: `This ${lgName} tier list has ${sCount} S-tier and ${aCount} A-tier Pokémon.`,
      top: topId ? ` The top real pick rate belongs to ${name(topId)} (${topPct}%), letting you check right away whether the tier rating holds up in practice.` : "",
      hi: highTierLowPick ? ` ${name(highTierLowPick.id)}, rated highly on paper, rarely shows up in real play — a high tier doesn't guarantee real-world adoption.` : "",
      lo: lowTierHighPick ? ` Conversely, ${name(lowTierHighPick.id)} is rated low yet keeps appearing in real matches, exposing the gap between theory and the field.` : "",
    },
    ja: {
      dist: `今回の${lgName}ティア表はSティア${sCount}種・Aティア${aCount}種で構成されます。`,
      top: topId ? ` 実測ピック率1位は${name(topId)}(${topPct}%)で、ティア評価が実戦でも通用するかをすぐ照合できます。` : "",
      hi: highTierLowPick ? ` 理論評価が高い${name(highTierLowPick.id)}は実測登場が少なく、上位ティアでも実戦採用は分かれます。` : "",
      lo: lowTierHighPick ? ` 逆に${name(lowTierHighPick.id)}はティア評価が低くても実測では着実に見られ、理論と実戦の差を示します。` : "",
    },
    "zh-TW": {
      dist: `本次${lgName}階級表由S級${sCount}隻、A級${aCount}隻構成。`,
      top: topId ? ` 實測使用率第一是${name(topId)}(${topPct}%)，可立即對照階級評價是否在實戰中成立。` : "",
      hi: highTierLowPick ? ` 理論評價高的${name(highTierLowPick.id)}實測登場稀少，即使高階級實戰採用也各有取捨。` : "",
      lo: lowTierHighPick ? ` 相反地，${name(lowTierHighPick.id)}階級評價偏低卻在實測中穩定出現，顯示理論與實戰的落差。` : "",
    },
  }[lang] || undefined;
  const c = L || {
    dist: `${lgName}: ${sCount} S-tier, ${aCount} A-tier.`, top: "", hi: "", lo: "",
  };
  return (c.dist + c.top + c.hi + c.lo).trim();
}

// ── CMP(공격 우선권) 분석 ────────────────────────────────────────────────────
export function cmpAnalysis(
  lang: Locale, lgName: string, list: CmpItem[], name: (id: string) => string,
): string {
  if (list.length < 3) return "";
  const [a, b, c] = list;
  const L = {
    ko: `${lgName}의 CMP(공격 우선권)는 같은 턴에 차지 기술이 겹칠 때 공격 종족값이 높은 쪽이 먼저 발동하는 규칙입니다. 현재 CMP가 가장 높은 포켓몬은 ${name(a.id)}(공격 ${a.atk.toFixed(1)})이며 ${name(b.id)}·${name(c.id)}가 뒤를 잇습니다. 이 상위권은 미러전이나 라스트 대결에서 차지를 먼저 터뜨려 실드 유도와 마무리에서 유리해집니다.`,
    en: `CMP (Charge Move Priority) in ${lgName} means that when two Pokémon fire a charged move on the same turn, the one with higher attack goes first. The highest-CMP Pokémon right now is ${name(a.id)} (attack ${a.atk.toFixed(1)}), followed by ${name(b.id)} and ${name(c.id)}. These top picks fire first in mirrors and last-Pokémon standoffs, gaining an edge in baiting shields and closing games.`,
    ja: `${lgName}のCMP(ゲージ優先度)は、同じターンにゲージ技が重なった時に攻撃種族値が高い方が先に発動する仕様です。現在CMPが最も高いのは${name(a.id)}(攻撃${a.atk.toFixed(1)})で、${name(b.id)}・${name(c.id)}が続きます。この上位陣はミラーやラスト対面で先にゲージを撃ててシールド誘導と締めで有利になります。`,
    "zh-TW": `${lgName}的CMP(放招優先權)是指同一回合特殊招式重疊時，攻擊種族值較高的一方先發動。目前CMP最高的是${name(a.id)}(攻擊${a.atk.toFixed(1)})，其後為${name(b.id)}·${name(c.id)}。這些上位在鏡像對戰或最後對面能先放招，於誘導護盾與收尾上取得優勢。`,
  }[lang];
  return L || `${lgName} CMP: ${name(a.id)}, ${name(b.id)}, ${name(c.id)}.`;
}
