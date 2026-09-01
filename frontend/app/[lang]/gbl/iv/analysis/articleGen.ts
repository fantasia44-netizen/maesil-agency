// 타협개체 아티팩트 자동 초안 생성기 — 시뮬 데이터가 문장을 결정(몬별로 발견이 달라짐).
// ko/en 생성. 검수 후 손질 전제(자동 초안). 상대명은 oppNames로 현지화.
import type { Locale } from "../../../../../lib/i18n";
import type { Sim, Article, Verdict, SimSpread } from "./registry";
import { localizeOpp } from "../[id]/oppNames";

type L = "ko" | "en";

// 한글 조사 선택(마지막 한글 음절의 받침 유무). 이름이 "(검왕)"처럼 비한글로 끝나도 마지막 한글 기준.
function josa(w: string, withB: string, without: string): string {
  const m = w.match(/[가-힣](?![^가-힣]*[가-힣])/);
  if (!m) return without;
  const code = m[0].charCodeAt(0) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0 ? withB : without;
}

// 스프레드 → 사람이 읽는 IV
const ivStr = (iv: number[]) => iv.join("/");

// 첫 타협(flip 발생) 스프레드 + 잃는 상대. 공격14(CMP탈락)는 별도 섹션이 다루므로 제외 —
// "정상 감소(방어/체력)에서 어디부터 갈리나"를 보여줌.
function firstLoss(sim: Sim, lang: Locale): { iv: string; opp: string | null } | null {
  for (const s of sim.normal.spreads) {
    if (s.iv[0] < 15 || s.verdict === "CMP탈락") continue; // 공격 15 스프레드만
    if (s.flips.length > 0) {
      const f = s.flips[0];
      return { iv: ivStr(s.iv), opp: localizeOpp({ name: f.opp, dex: f.dex }, lang) };
    }
  }
  return null;
}

// 타협선 = 마지막 안전(유사백/실질백) 스프레드
function safeLine(sim: Sim): SimSpread | null {
  const safe = sim.normal.spreads.filter((s) => s.verdict === "유사백" || s.verdict === "실질백");
  return safe.length ? safe[safe.length - 1] : null;
}

// 베스트파트너 실드1 새로승 수(상대 노베파 / 상대 베파)
function bpGains(sim: Sim): { noBB: number; oppBB: number } {
  const n = sim.normal.coverage?.find((c) => c.shields === 1);
  const gain = (cov?: { shields: number; opps: { id: string; win: boolean }[] }[]) => {
    if (!n || !cov) return 0;
    const g = cov.find((c) => c.shields === 1);
    if (!g) return 0;
    return g.opps.filter((o) => { const b = n.opps.find((x) => x.id === o.id); return b && !b.win && o.win; }).length;
  };
  return { noBB: gain(sim.bestBuddy.coverage), oppBB: gain(sim.bestBuddy.oppBB?.coverage) };
}

export function genArticle(
  sim: Sim,
  names: Record<Locale, string>,
  rivalName: Record<Locale, string> | null,
  season: string,
  lang: Locale,
): Article {
  const ko = lang === "ko";
  const nm = names[lang] || names.en;
  const rv = rivalName ? (rivalName[lang] || rivalName.en) : null;
  const hundo = sim.normal.hundo;
  const a14 = sim.normal.spreads.find((s) => s.iv.join("") === "141515");
  const cmpFail = a14?.verdict === "CMP탈락";
  const mirrorLost = sim.cmp.mirror.some((d) => d.result === "패" || d.result === "負");
  const line = safeLine(sim);
  const compromise = line ? ivStr(line.iv) : "15/15/15";
  const onlyHundo = !line || line.iv.join("") === "151515";
  const fl = firstLoss(sim, lang);
  const lossName = fl?.opp ?? "일부 상대";
  const lossObj = lossName + josa(lossName, "을", "를"); // "그란돈을" / "일부 상대를" (KO 목적격)
  const bp = bpGains(sim);
  const bs = hundo.byShield.find((b) => b.shields === 1);

  // ── 판정 3단 ──
  const verdict: Verdict[] = [];
  if (ko) {
    verdict.push({ tier: "grow", iv: onlyHundo ? "15/15/15 (실질 100%)" : `${compromise} 이상`,
      note: onlyHundo ? "이 포켓몬은 개체값이 빡빡합니다. 실질 100%(또는 아주 근접)를 목표로 하세요." : "100% 개체와 승패 매치업이 사실상 동일합니다. 고민 말고 강화하세요." });
    if (fl) verdict.push({ tier: "conditional", iv: `${fl.iv} 부근`,
      note: `${fl.opp ? fl.opp + " 등을" : "일부 상대를"} 놓치기 시작합니다. 그 상대를 자주 안 만난다면(실측 픽률 낮음) 감수하고 써도 됩니다.` });
    verdict.push({ tier: "wait", iv: cmpFail ? "공격 14 이하" : "저개체(다수 감소)",
      note: cmpFail ? `${nm}${josa(nm, "은", "는")} 같은 종족값 라이벌${rv ? "(" + rv + ")" : ""}·미러에게 동시차징(CMP) 우선권을 무조건 내줍니다. 강화하지 말고 더 좋은 개체를 기다리세요.` : "핵심 매치업을 여러 개 놓칩니다. 급하지 않다면 더 좋은 개체를 기다리는 편이 낫습니다." });
  } else {
    verdict.push({ tier: "grow", iv: onlyHundo ? "15/15/15 (effective hundo)" : `${compromise} or better`,
      note: onlyHundo ? "This Pokémon is IV-tight — aim for an effective hundo (or very close)." : "Win/loss matchups are effectively identical to a hundo. Just power it up." });
    if (fl) verdict.push({ tier: "conditional", iv: `around ${fl.iv}`,
      note: `You start dropping ${fl.opp ? fl.opp + " and similar" : "some matchups"}. If you rarely face them (low real pick rate), it's fine to run.` });
    verdict.push({ tier: "wait", iv: cmpFail ? "Attack 14 or below" : "Low IVs (multiple cuts)",
      note: cmpFail ? `${nm} always loses CMP priority to the mirror${rv ? " and " + rv : ""} at attack 14. Don't build it — wait for a better one.` : "You lose several key matchups. Unless you need it now, wait for a better spread." });
  }

  // ── 섹션(데이터 기반) ──
  const sections: { h?: string; body: string }[] = [];
  if (cmpFail || mirrorLost) {
    sections.push(ko ? {
      h: "공격 15가 왜 중요한가 — 동시차징(CMP)",
      body: `마스터리그는 CP 제한이 없어 모두 최대 레벨입니다. 그래서 같은 포켓몬끼리(미러) 또는 종족값이 같은 상대와 같은 턴에 차지무브를 쏘면, 공격 실수치가 높은 쪽이 먼저 터집니다(동시차징·CMP). ${nm}${josa(nm, "을", "를")} 공격 14로 키우면 이 우선권 싸움에서 공격 15 상대에게 밀립니다. 실제 시뮬에서 공14 미러는 ${sim.cmp.mirror.map((d) => `실드${d.shields}=${d.result}`).join(", ")}로 나왔습니다. 미러가 잦은 상위 메타에서는 공격 15가 사실상 필수입니다.`,
    } : {
      h: "Why attack 15 matters — CMP",
      body: `Master League has no CP cap, so everyone is max level. When same-species (mirror) or same-stat Pokémon fire a charged move on the same turn, the higher effective attack goes first (CMP). An attack-14 ${nm} loses that priority to an attack-15 opponent. In the sim, the attack-14 mirror came out ${sim.cmp.mirror.map((d) => `${d.shields}-shield=${d.result === "패" || d.result === "負" ? "loss" : d.result === "승" || d.result === "勝" ? "win" : "tie"}`).join(", ")}. In a mirror-heavy meta, attack 15 is effectively mandatory.`,
    });
  }
  if (fl) {
    sections.push(ko ? {
      h: "어디서부터 승패가 갈리나",
      body: onlyHundo
        ? `${nm}${josa(nm, "은", "는")} 개체값이 빡빡한 편입니다. ${fl.iv}까지만 내려가도 ${lossObj} 놓치기 시작합니다. 상위 100종을 전수 시뮬한 결과, 스탯이 조금만 낮아져도 브레이크포인트를 넘겨 승패가 바뀌는 매치업이 생깁니다. 그래서 이 포켓몬은 가급적 고개체를 쓰는 게 안전합니다.`
        : `${compromise}까지는 100% 개체와 승패가 같습니다. 그 아래 ${fl.iv}부터 ${lossObj} 놓치기 시작합니다. 딱 그 지점이 브레이크포인트를 넘는 구간입니다.`,
    } : {
      h: "Where win/loss starts to split",
      body: onlyHundo
        ? `${nm} is IV-tight. Even dropping to ${fl.iv} starts losing ${fl.opp ?? "some matchups"}. Across the full top-100 sim, small stat cuts cross breakpoints and flip matchups, so a high-IV catch is the safer play here.`
        : `Down to ${compromise}, win/loss matches a hundo. Below that, at ${fl.iv}, you begin losing ${fl.opp ?? "some matchups"} — that's the breakpoint line.`,
    });
  }
  // 베스트파트너 — 두 시나리오
  sections.push(ko ? {
    h: "베스트파트너 효과 — 상대가 노베파냐 베파냐",
    body: `베스트파트너(레벨 +1)의 효과는 상대도 베스트파트너인지에 따라 달라집니다. 상대가 노베파(L50)면 실드 1개 기준 새로 이기는 상대가 ${bp.noBB}종, 상대도 베파(L51)면 ${bp.oppBB}종입니다. 마스터 상위권 전설은 상대도 대부분 베파라, 미러·같은 종족값 라이벌은 양쪽 L51이면 무승부로 돌아갑니다. 손해는 없으니 여유 되면 하되, 미러를 이기게 해주는 마법은 아닙니다.`,
  } : {
    h: "Best Buddy — depends on whether the opponent is too",
    body: `Best Buddy (level +1) depends on whether the opponent is best-buddied. Against a non-best-buddied opponent (L50) you newly win ${bp.noBB} matchups at 1 shield; against a best-buddied one (L51), ${bp.oppBB}. Top Master legendaries are usually best-buddied, so the mirror and same-stat rivals go back to a tie when both are L51. It never hurts, but it doesn't magically win the mirror.`,
  });
  sections.push({
    body: ko
      ? `참고로 이 타협선은 메타가 바뀌면 함께 움직입니다. 자주 만나는 상대의 비중이 달라지거나 신규 포켓몬이 들어오면 브레이크포인트가 이동해 지금 '괜찮던' 개체가 아슬아슬해질 수 있습니다. 그래서 이 분석은 ${season} 기준이며, 시즌이 바뀌면 상위 100종을 다시 전수 시뮬해 갱신합니다.`
      : `Note that this line moves with the meta. If usage shifts or a new Pokémon arrives, the breakpoints move and a spread that's fine today can get shaky. This analysis is for ${season}; when the season changes we re-run the full top-100 sim and update it.`,
  });

  // ── FAQ ──
  const faq = ko ? [
    { q: `${nm}, 100% 아니면 못 쓰나요?`, a: onlyHundo
        ? `${nm}${josa(nm, "은", "는")} 개체값이 빡빡한 편이라 실질 100%에 가까운 게 안전합니다. ${fl ? fl.iv + "부터 " + lossObj + " 놓칩니다." : ""} 다만 놓치는 상대의 실측 픽률이 낮다면 실전 손실은 생각보다 작을 수 있습니다.`
        : `아니요. ${compromise}까지는 100% 개체와 승패 매치업이 사실상 같습니다. 그 이상이면 고민 말고 강화하세요.` },
    { q: cmpFail ? "공격 14인데 그냥 강화해도 되나요?" : "어떤 스탯을 우선해야 하나요?",
      a: cmpFail
        ? `비추천입니다. 공격 14는 미러·같은 종족값 라이벌에게 동시차징 우선권을 내줘, 50:50으로 갈 싸움을 0:100으로 지는 셈입니다.`
        : `상위 100종 전수 시뮬 기준, ${line ? "타협선 " + compromise + "까지는 안전하고" : "개체값이 빡빡해 고개체가 안전하며"}, 그 아래로는 ${fl ? (fl.opp ?? "일부 상대") + "부터" : "핵심 매치업부터"} 놓치기 시작합니다.` },
    { q: "이 기준은 언제까지 유효한가요?", a: `${season} 메타 기준입니다. 메타가 바뀌면 브레이크포인트와 타협선도 달라져, 시즌마다 상위 100종을 다시 전수 시뮬해서 갱신합니다.` },
  ] : [
    { q: `Do I need a hundo ${nm}?`, a: onlyHundo
        ? `${nm} is IV-tight, so an effective hundo (or very close) is safest. ${fl ? "From " + fl.iv + " you start losing " + (fl.opp ?? "some matchups") + "." : ""} That said, if those losses are low-pick-rate, the real impact may be small.`
        : `No. Down to ${compromise}, win/loss matchups are effectively identical to a hundo. At or above that, just power it up.` },
    { q: cmpFail ? "Attack is 14 — can I just build it?" : "Which stat should I prioritize?",
      a: cmpFail
        ? `Not recommended. At attack 14 you lose CMP priority to the mirror and same-stat rivals — a fight that should be 50:50 becomes 0:100.`
        : `From the full top-100 sim, ${line ? "the line " + compromise + " is safe" : "this Pokémon is IV-tight so a high IV is safest"}; below it you begin losing ${fl ? (fl.opp ?? "some matchups") : "key matchups"}.` },
    { q: "How long does this hold?", a: `It's the ${season} meta. When the meta shifts, the breakpoints and the compromise line move, so we re-run the full top-100 sim each season and update it.` },
  ];

  // ── 후킹/리드/마무리 ──
  const title = ko ? `${nm} 개체값 타협점 — 마스터리그, 어디까지 괜찮을까` : `${nm} IV Compromise — How Far Can You Go in Master League?`;
  const hook = ko
    ? `박스에 ${nm}, XL 겨우 모아 강화하려는데 100%가 안 떴다면 — 강화 버튼 누르기 전에 30초. 마스터 상위 100종을 전수 시뮬해서, 이 개체 그냥 키워도 되는지 정리해뒀습니다.`
    : `Got a ${nm} you've been scraping XL for, and it didn't come out 100%? Before you power up — 30 seconds. We simulated the entire Master top 100 to see whether that spread is fine to build.`;
  const lead = ko
    ? `${cmpFail ? `${nm}${josa(nm, "은", "는")} 공격 15가 사실상 필수입니다. ` : ""}${onlyHundo ? `${nm}${josa(nm, "은", "는")} 개체값이 빡빡한 편이라 고개체가 안전합니다. ` : `${nm}의 타협선은 ${compromise} 정도입니다. `}마스터리그 상위 100종을 배틀 시뮬레이터로 전수 대입하고, 미러전·${rv ? "라이벌 대면·" : ""}베스트파트너까지 계산했습니다.${bs ? ` (100% 실드1 성적 ${bs.wins}승 ${bs.losses}패)` : ""}`
    : `For ${nm}, ${cmpFail ? "attack 15 is effectively mandatory, and " : ""}${onlyHundo ? "the IVs are tight, so a high catch is safest." : `the compromise line is about ${compromise}.`} Below is the result of running the Master top 100 through a battle simulator, plus the mirror${rv ? ", the same-stat rival," : ""} and best buddy. (Hundo 1-shield record: ${bs ? bs.wins + "W " + bs.losses + "L" : ""}.)`;
  const compromiseNote = ko
    ? (onlyHundo ? "개체값이 빡빡해 실질 100%에 가까운 게 안전합니다. 아래 판정을 참고하세요." : "일반(L50) 기준 이 이상이면 100% 개체와 승패 매치업이 사실상 동일합니다.")
    : (onlyHundo ? "IV-tight — an effective hundo is safest. See the verdict below." : "At L50, at or above this the win/loss matchups match a hundo.");
  const closing = ko
    ? `정리 — ${cmpFail ? "공격 15는 타협 불가(미러 CMP), " : ""}${onlyHundo ? "개체값이 빡빡해 고개체 권장" : "타협선 " + compromise}. ${season} 메타 기준이며 시즌이 바뀌면 갱신합니다.`
    : `Bottom line — ${cmpFail ? "attack 15 is non-negotiable (mirror CMP), " : ""}${onlyHundo ? "IV-tight, aim high" : "compromise line " + compromise}. Based on the ${season} meta; updated when the season changes.`;

  return { title, hook, lead, compromise, compromiseNote, verdict, sections, faq, closing };
}
