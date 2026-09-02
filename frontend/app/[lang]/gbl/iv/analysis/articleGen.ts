// 타협개체 아티팩트 자동 초안 생성기 — 시뮬 데이터가 문장을 결정(몬별로 발견이 달라짐).
// ko/en/ja/zh-TW 생성. 상대명은 oppNames로 현지화. (검수 후 손질 전제)
import type { Locale } from "../../../../../lib/i18n";
import type { Sim, Article, Verdict, SimSpread } from "./registry";
import { localizeOpp } from "../[id]/oppNames";

// 한글 조사 선택(마지막 한글 음절의 받침 유무). 이름이 "(검왕)"처럼 비한글로 끝나도 마지막 한글 기준.
function josa(w: string, withB: string, without: string): string {
  const m = w.match(/[가-힣](?![^가-힣]*[가-힣])/);
  if (!m) return without;
  const code = m[0].charCodeAt(0) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0 ? withB : without;
}

const ivStr = (iv: number[]) => iv.join("/");

// 첫 타협(flip 발생) 스프레드 + 잃는 상대. 공격14(CMP탈락)는 별도 섹션이 다루므로 제외.
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
  // 언어 선택 헬퍼(ko/en/ja/zh 4개국어)
  const pk = <T,>(o: { ko: T; en: T; ja: T; zh: T }): T =>
    lang === "ja" ? o.ja : lang === "zh-TW" ? o.zh : lang === "en" ? o.en : o.ko;
  const seasonLoc = pk({ ko: season, en: season.replace("시즌", "Season"), ja: season.replace("시즌", "シーズン"), zh: season.replace("시즌", "賽季") });
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
  const flOpp = fl?.opp ?? null;
  const lossKo = (flOpp ?? "일부 상대") + josa(flOpp ?? "일부 상대", "을", "를");
  const bp = bpGains(sim);
  const bs = hundo.byShield.find((b) => b.shields === 1);
  // CMP 미러 결과 문자열(데이터는 "승/패/무" 또는 "勝/負/分") — 언어별 표기
  const resW = (r: string) => {
    const win = r === "승" || r === "勝", loss = r === "패" || r === "負";
    return pk({ ko: r, en: win ? "win" : loss ? "loss" : "tie", ja: win ? "勝" : loss ? "負" : "分", zh: win ? "勝" : loss ? "負" : "平" });
  };
  const mirrorSeq = sim.cmp.mirror.map((d) => pk({
    ko: `실드${d.shields}=${resW(d.result)}`, en: `${d.shields}-shield=${resW(d.result)}`,
    ja: `シールド${d.shields}=${resW(d.result)}`, zh: `護盾${d.shields}=${resW(d.result)}`,
  })).join(pk({ ko: ", ", en: ", ", ja: "、", zh: "、" }));

  // ── 판정 3단 ──
  const verdict: Verdict[] = [];
  verdict.push({
    tier: "grow",
    iv: onlyHundo ? pk({ ko: "15/15/15 (실질 100%)", en: "15/15/15 (effective hundo)", ja: "15/15/15（実質100%）", zh: "15/15/15（實質100%）" }) : pk({ ko: `${compromise} 이상`, en: `${compromise} or better`, ja: `${compromise} 以上`, zh: `${compromise} 以上` }),
    note: onlyHundo
      ? pk({ ko: "이 포켓몬은 개체값이 빡빡합니다. 실질 100%(또는 아주 근접)를 목표로 하세요.", en: "This Pokémon is IV-tight — aim for an effective hundo (or very close).", ja: "このポケモンは個体値がシビアです。実質100%（かごく近い個体）を目標に。", zh: "這隻寶可夢個體值很嚴格，請以實質100%（或非常接近）為目標。" })
      : pk({ ko: "100% 개체와 승패 매치업이 사실상 동일합니다. 고민 말고 강화하세요.", en: "Win/loss matchups are effectively identical to a hundo. Just power it up.", ja: "100%個体と勝敗が実質同じです。迷わず強化を。", zh: "與100%個體的勝負對戰實質相同，別猶豫直接強化。" }),
  });
  if (fl) verdict.push({
    tier: "conditional",
    iv: pk({ ko: `${fl.iv} 부근`, en: `around ${fl.iv}`, ja: `${fl.iv} 付近`, zh: `${fl.iv} 附近` }),
    note: pk({
      ko: `${flOpp ? flOpp + " 등을" : "일부 상대를"} 놓치기 시작합니다. 그 상대를 자주 안 만난다면(실측 픽률 낮음) 감수하고 써도 됩니다.`,
      en: `You start dropping ${flOpp ? flOpp + " and similar" : "some matchups"}. If you rarely face them (low real pick rate), it's fine to run.`,
      ja: `${flOpp ? flOpp + "など" : "一部の相手"}を落とし始めます。その相手をあまり見ないなら（実測ピック率が低い）割り切って使えます。`,
      zh: `開始輸給${flOpp ? flOpp + "等" : "部分對手"}。若不常遇到（實測使用率低），可接受並使用。`,
    }),
  });
  verdict.push({
    tier: "wait",
    iv: cmpFail ? pk({ ko: "공격 14 이하", en: "Attack 14 or below", ja: "攻撃14以下", zh: "攻擊14以下" }) : pk({ ko: "저개체(다수 감소)", en: "Low IVs (multiple cuts)", ja: "低個体（多数低下）", zh: "低個體（多處下降）" }),
    note: cmpFail
      ? pk({
          ko: `${nm}${josa(nm, "은", "는")} 같은 종족값 라이벌${rv ? "(" + rv + ")" : ""}·미러에게 동시차징(CMP) 우선권을 무조건 내줍니다. 강화하지 말고 더 좋은 개체를 기다리세요.`,
          en: `${nm} always loses CMP priority to the mirror${rv ? " and " + rv : ""} at attack 14. Don't build it — wait for a better one.`,
          ja: `${nm}は同種族値ライバル${rv ? "（" + rv + "）" : ""}・ミラーに同時ゲージ（CMP）優先権を必ず譲ります。強化せず、より良い個体を待ちましょう。`,
          zh: `${nm}會把同時充能（CMP）優先權讓給同種族值對手${rv ? "（" + rv + "）" : ""}·鏡像。別強化，等更好的個體。`,
        })
      : pk({ ko: "핵심 매치업을 여러 개 놓칩니다. 급하지 않다면 더 좋은 개체를 기다리는 편이 낫습니다.", en: "You lose several key matchups. Unless you need it now, wait for a better spread.", ja: "重要な対面を複数落とします。急がないなら、より良い個体を待つのが得策です。", zh: "會輸掉多個關鍵對面。若不急，等更好的個體較好。" }),
  });

  // ── 섹션(데이터 기반) ──
  const sections: { h?: string; body: string }[] = [];
  if (cmpFail || mirrorLost) {
    sections.push({
      h: pk({ ko: "공격 15가 왜 중요한가 — 동시차징(CMP)", en: "Why attack 15 matters — CMP", ja: "攻撃15がなぜ重要か — 同時ゲージ（CMP）", zh: "為何攻擊15重要 — 同時充能（CMP）" }),
      body: pk({
        ko: `마스터리그는 CP 제한이 없어 모두 최대 레벨입니다. 그래서 같은 포켓몬끼리(미러) 또는 종족값이 같은 상대와 같은 턴에 차지무브를 쏘면, 공격 실수치가 높은 쪽이 먼저 터집니다(동시차징·CMP). ${nm}${josa(nm, "을", "를")} 공격 14로 키우면 이 우선권 싸움에서 공격 15 상대에게 밀립니다. 실제 시뮬에서 공14 미러는 ${mirrorSeq}로 나왔습니다. 미러가 잦은 상위 메타에서는 공격 15가 사실상 필수입니다.`,
        en: `Master League has no CP cap, so everyone is max level. When same-species (mirror) or same-stat Pokémon fire a charged move on the same turn, the higher effective attack goes first (CMP). An attack-14 ${nm} loses that priority to an attack-15 opponent. In the sim, the attack-14 mirror came out ${mirrorSeq}. In a mirror-heavy meta, attack 15 is effectively mandatory.`,
        ja: `マスターリーグはCP制限がなく全員最大レベルです。同種（ミラー）や同種族値の相手と同じターンにゲージ技を撃つと、実効攻撃が高い方が先に発動します（同時ゲージ・CMP）。${nm}を攻撃14で育てると、この優先権争いで攻撃15の相手に負けます。実際のシミュでは攻撃14ミラーが ${mirrorSeq} でした。ミラーの多い上位メタでは攻撃15が事実上必須です。`,
        zh: `大師聯盟無CP上限，全員滿等。與同種（鏡像）或同種族值對手在同回合放特殊招式時，實際攻擊較高者先發動（同時充能·CMP）。將${nm}養成攻擊14，會在此優先權之爭輸給攻擊15對手。實際模擬中攻擊14鏡像為 ${mirrorSeq}。在鏡像多的上位環境，攻擊15實質必須。`,
      }),
    });
  }
  if (fl) {
    sections.push({
      h: pk({ ko: "어디서부터 승패가 갈리나", en: "Where win/loss starts to split", ja: "どこから勝敗が分かれるか", zh: "從哪裡開始勝負分歧" }),
      body: onlyHundo
        ? pk({
            ko: `${nm}${josa(nm, "은", "는")} 개체값이 빡빡한 편입니다. ${fl.iv}까지만 내려가도 ${lossKo} 놓치기 시작합니다. 상위 100종을 전수 시뮬한 결과, 스탯이 조금만 낮아져도 브레이크포인트를 넘겨 승패가 바뀌는 매치업이 생깁니다. 그래서 이 포켓몬은 가급적 고개체를 쓰는 게 안전합니다.`,
            en: `${nm} is IV-tight. Even dropping to ${fl.iv} starts losing ${flOpp ?? "some matchups"}. Across the full top-100 sim, small stat cuts cross breakpoints and flip matchups, so a high-IV catch is the safer play here.`,
            ja: `${nm}は個体値がシビアです。${fl.iv}まで下がるだけで${flOpp ?? "一部の相手"}を落とし始めます。上位100種を全数シミュした結果、ステータスが少し下がるだけでブレイクポイントを超え勝敗が変わる対面が出ます。よって高個体を使うのが安全です。`,
            zh: `${nm}個體值很嚴格。即使降到${fl.iv}，也開始輸給${flOpp ?? "部分對手"}。全數模擬前100名後，數值稍降就會跨越臨界點翻轉勝負，因此使用高個體較安全。`,
          })
        : pk({
            ko: `${compromise}까지는 100% 개체와 승패가 같습니다. 그 아래 ${fl.iv}부터 ${lossKo} 놓치기 시작합니다. 딱 그 지점이 브레이크포인트를 넘는 구간입니다.`,
            en: `Down to ${compromise}, win/loss matches a hundo. Below that, at ${fl.iv}, you begin losing ${flOpp ?? "some matchups"} — that's the breakpoint line.`,
            ja: `${compromise}までは100%個体と勝敗が同じです。その下の${fl.iv}から${flOpp ?? "一部の相手"}を落とし始めます。ちょうどそこがブレイクポイントを超える区間です。`,
            zh: `到${compromise}為止與100%個體勝負相同。其下的${fl.iv}開始輸給${flOpp ?? "部分對手"}，正是跨越臨界點的區間。`,
          }),
    });
  }
  // 베스트파트너 — 두 시나리오
  sections.push({
    h: pk({ ko: "베스트파트너 효과 — 상대가 노베파냐 베파냐", en: "Best Buddy — depends on whether the opponent is too", ja: "ベストパートナー効果 — 相手がBPかどうか", zh: "最佳夥伴效果 — 對手是否也升" }),
    body: pk({
      ko: `베스트파트너(레벨 +1)의 효과는 상대도 베스트파트너인지에 따라 달라집니다. 상대가 노베파(L50)면 실드 1개 기준 새로 이기는 상대가 ${bp.noBB}종, 상대도 베파(L51)면 ${bp.oppBB}종입니다. 마스터 상위권 전설은 상대도 대부분 베파라, 미러·같은 종족값 라이벌은 양쪽 L51이면 무승부로 돌아갑니다. 손해는 없으니 여유 되면 하되, 미러를 이기게 해주는 마법은 아닙니다.`,
      en: `Best Buddy (level +1) depends on whether the opponent is best-buddied. Against a non-best-buddied opponent (L50) you newly win ${bp.noBB} matchups at 1 shield; against a best-buddied one (L51), ${bp.oppBB}. Top Master legendaries are usually best-buddied, so the mirror and same-stat rivals go back to a tie when both are L51. It never hurts, but it doesn't magically win the mirror.`,
      ja: `ベストパートナー（レベル+1）の効果は、相手もBPかどうかで変わります。相手がノーBP（L50）ならシールド1で新たに勝てる相手が${bp.noBB}体、相手もBP（L51）なら${bp.oppBB}体です。マスター上位の伝説は相手もBPが多く、ミラー・同種族値ライバルは両者L51で引き分けに戻ります。損はないので余裕があれば、ただしミラーを勝たせる魔法ではありません。`,
      zh: `最佳夥伴（等級+1）的效果取決於對手是否也升。對手未升（L50）時護盾1新增戰勝${bp.noBB}種，對手也升（L51）則${bp.oppBB}種。大師上位傳說多半也升最佳夥伴，鏡像·同種族值對手在雙方L51時回到平手。沒有壞處，有餘力就升，但無法讓你贏鏡像。`,
    }),
  });
  sections.push({
    body: pk({
      ko: `참고로 이 타협선은 메타가 바뀌면 함께 움직입니다. 자주 만나는 상대의 비중이 달라지거나 신규 포켓몬이 들어오면 브레이크포인트가 이동해 지금 '괜찮던' 개체가 아슬아슬해질 수 있습니다. 그래서 이 분석은 ${seasonLoc} 기준이며, 시즌이 바뀌면 상위 100종을 다시 전수 시뮬해 갱신합니다.`,
      en: `Note that this line moves with the meta. If usage shifts or a new Pokémon arrives, the breakpoints move and a spread that's fine today can get shaky. This analysis is for ${seasonLoc}; when the season changes we re-run the full top-100 sim and update it.`,
      ja: `なお、この妥協ラインはメタで動きます。よく会う相手の比重が変わったり新ポケモンが入ると、ブレイクポイントが移動し、今「大丈夫」な個体が際どくなることがあります。よって本分析は${seasonLoc}基準で、シーズンが変わると上位100種を再度全数シミュして更新します。`,
      zh: `此妥協線會隨環境變動。常遇對手比重改變或新寶可夢加入時，臨界點會移動，現在「還行」的個體可能變得吃緊。故本分析以${seasonLoc}為準，賽季更替時重新全數模擬前100名並更新。`,
    }),
  });

  // ── FAQ ──
  const faq = [
    {
      q: pk({ ko: `${nm}, 100% 아니면 못 쓰나요?`, en: `Do I need a hundo ${nm}?`, ja: `${nm}、100%じゃないと使えない？`, zh: `${nm}，不是100%就不能用？` }),
      a: onlyHundo
        ? pk({
            ko: `${nm}${josa(nm, "은", "는")} 개체값이 빡빡한 편이라 실질 100%에 가까운 게 안전합니다. ${fl ? fl.iv + "부터 " + lossKo + " 놓칩니다." : ""} 다만 놓치는 상대의 실측 픽률이 낮다면 실전 손실은 생각보다 작을 수 있습니다.`,
            en: `${nm} is IV-tight, so an effective hundo (or very close) is safest. ${fl ? "From " + fl.iv + " you start losing " + (flOpp ?? "some matchups") + "." : ""} That said, if those losses are low-pick-rate, the real impact may be small.`,
            ja: `${nm}は個体値がシビアなので、実質100%に近いほど安全です。${fl ? fl.iv + "から" + (flOpp ?? "一部の相手") + "を落とします。" : ""} ただ落とす相手の実測ピック率が低ければ、実戦の損失は思ったより小さいこともあります。`,
            zh: `${nm}個體值嚴格，越接近實質100%越安全。${fl ? "從" + fl.iv + "開始輸給" + (flOpp ?? "部分對手") + "。" : ""} 但若那些對手實測使用率低，實戰損失可能比想像小。`,
          })
        : pk({ ko: `아니요. ${compromise}까지는 100% 개체와 승패 매치업이 사실상 같습니다. 그 이상이면 고민 말고 강화하세요.`, en: `No. Down to ${compromise}, win/loss matchups are effectively identical to a hundo. At or above that, just power it up.`, ja: `いいえ。${compromise}までは100%個体と勝敗が実質同じです。それ以上なら迷わず強化を。`, zh: `不用。到${compromise}為止與100%個體勝負實質相同。以上就別猶豫直接強化。` }),
    },
    {
      q: cmpFail ? pk({ ko: "공격 14인데 그냥 강화해도 되나요?", en: "Attack is 14 — can I just build it?", ja: "攻撃14だけどそのまま強化していい？", zh: "攻擊14可以直接強化嗎？" }) : pk({ ko: "어떤 스탯을 우선해야 하나요?", en: "Which stat should I prioritize?", ja: "どのステータスを優先すべき？", zh: "該優先哪個數值？" }),
      a: cmpFail
        ? pk({ ko: "비추천입니다. 공격 14는 미러·같은 종족값 라이벌에게 동시차징 우선권을 내줘, 50:50으로 갈 싸움을 0:100으로 지는 셈입니다.", en: "Not recommended. At attack 14 you lose CMP priority to the mirror and same-stat rivals — a fight that should be 50:50 becomes 0:100.", ja: "非推奨です。攻撃14はミラー・同種族値ライバルに同時ゲージ優先権を譲り、50:50のはずが0:100で負けます。", zh: "不建議。攻擊14會把同時充能優先權讓給鏡像·同種族值對手，本該50:50的對戰變成0:100落敗。" })
        : pk({
            ko: `상위 100종 전수 시뮬 기준, ${line ? "타협선 " + compromise + "까지는 안전하고" : "개체값이 빡빡해 고개체가 안전하며"}, 그 아래로는 ${fl ? (flOpp ?? "일부 상대") + "부터" : "핵심 매치업부터"} 놓치기 시작합니다.`,
            en: `From the full top-100 sim, ${line ? "the line " + compromise + " is safe" : "this Pokémon is IV-tight so a high IV is safest"}; below it you begin losing ${fl ? (flOpp ?? "some matchups") : "key matchups"}.`,
            ja: `上位100種の全数シミュ基準で、${line ? "妥協ライン" + compromise + "までは安全で" : "個体値がシビアなので高個体が安全で"}、その下からは${fl ? (flOpp ?? "一部の相手") + "から" : "重要な対面から"}落とし始めます。`,
            zh: `以全數模擬前100名為準，${line ? "妥協線" + compromise + "以內安全" : "個體值嚴格故高個體較安全"}，其下就開始輸給${fl ? (flOpp ?? "部分對手") : "關鍵對面"}。`,
          }),
    },
    {
      q: pk({ ko: "이 기준은 언제까지 유효한가요?", en: "How long does this hold?", ja: "この基準はいつまで有効？", zh: "此標準有效到何時？" }),
      a: pk({ ko: `${seasonLoc} 메타 기준입니다. 메타가 바뀌면 브레이크포인트와 타협선도 달라져, 시즌마다 상위 100종을 다시 전수 시뮬해서 갱신합니다.`, en: `It's the ${seasonLoc} meta. When the meta shifts, the breakpoints and the compromise line move, so we re-run the full top-100 sim each season and update it.`, ja: `${seasonLoc}のメタ基準です。メタが変わればブレイクポイントと妥協ラインも変わるため、シーズンごとに上位100種を再度全数シミュして更新します。`, zh: `以${seasonLoc}環境為準。環境改變時臨界點與妥協線也會變，故每賽季重新全數模擬前100名並更新。` }),
    },
  ];

  // ── 후킹/리드/마무리 ──
  const title = pk({ ko: `${nm} 개체값 타협점 — 마스터리그, 어디까지 괜찮을까`, en: `${nm} IV Compromise — How Far Can You Go in Master League?`, ja: `${nm} 個体値の妥協点 — マスターリーグ、どこまでOK？`, zh: `${nm} 個體值妥協點 — 大師聯盟能養到哪？` });
  const hook = pk({
    ko: `박스에 ${nm}, XL 겨우 모아 강화하려는데 100%가 안 떴다면 — 강화 버튼 누르기 전에 30초. 마스터 상위 100종을 전수 시뮬해서, 이 개체 그냥 키워도 되는지 정리해뒀습니다.`,
    en: `Got a ${nm} you've been scraping XL for, and it didn't come out 100%? Before you power up — 30 seconds. We simulated the entire Master top 100 to see whether that spread is fine to build.`,
    ja: `ボックスの${nm}、XLをやっと集めて強化したいのに100%じゃない — 強化ボタンを押す前に30秒。マスター上位100種を全数シミュして、この個体を育てていいか整理しました。`,
    zh: `盒子裡的${nm}，好不容易湊到XL想強化卻不是100%？按下強化前先花30秒。我們全數模擬大師前100名，看這個個體值到底能不能養。`,
  });
  const lead = pk({
    ko: `${cmpFail ? `${nm}${josa(nm, "은", "는")} 공격 15가 사실상 필수입니다. ` : ""}${onlyHundo ? `${nm}${josa(nm, "은", "는")} 개체값이 빡빡한 편이라 고개체가 안전합니다. ` : `${nm}의 타협선은 ${compromise} 정도입니다. `}마스터리그 상위 100종을 배틀 시뮬레이터로 전수 대입하고, 미러전·${rv ? "라이벌 대면·" : ""}베스트파트너까지 계산했습니다.${bs ? ` (100% 실드1 성적 ${bs.wins}승 ${bs.losses}패)` : ""}`,
    en: `For ${nm}, ${cmpFail ? "attack 15 is effectively mandatory, and " : ""}${onlyHundo ? "the IVs are tight, so a high catch is safest." : `the compromise line is about ${compromise}.`} Below is the result of running the Master top 100 through a battle simulator, plus the mirror${rv ? ", the same-stat rival," : ""} and best buddy. (Hundo 1-shield record: ${bs ? bs.wins + "W " + bs.losses + "L" : ""}.)`,
    ja: `${nm}は${cmpFail ? "攻撃15が事実上必須で、" : ""}${onlyHundo ? "個体値がシビアなので高個体が安全です。" : `妥協ラインは${compromise}ほどです。`}マスターリーグ上位100種をバトルシミュレーターで全数当てはめ、ミラー戦・${rv ? "ライバル対面・" : ""}ベストパートナーまで計算しました。${bs ? `（100%シールド1成績 ${bs.wins}勝${bs.losses}敗）` : ""}`,
    zh: `${nm}${cmpFail ? "攻擊15實質必須，" : ""}${onlyHundo ? "個體值嚴格，高個體較安全。" : `妥協線約${compromise}。`}我們以對戰模擬器全數代入大師聯盟前100名，並計算鏡像戰·${rv ? "對手對面·" : ""}最佳夥伴。${bs ? `（100%護盾1戰績 ${bs.wins}勝${bs.losses}敗）` : ""}`,
  });
  const compromiseNote = onlyHundo
    ? pk({ ko: "개체값이 빡빡해 실질 100%에 가까운 게 안전합니다. 아래 판정을 참고하세요.", en: "IV-tight — an effective hundo is safest. See the verdict below.", ja: "個体値がシビアなので実質100%に近いほど安全です。下の判定を参考に。", zh: "個體值嚴格，越接近實質100%越安全。請參考下方判定。" })
    : pk({ ko: "일반(L50) 기준 이 이상이면 100% 개체와 승패 매치업이 사실상 동일합니다.", en: "At L50, at or above this the win/loss matchups match a hundo.", ja: "通常（L50）でこれ以上なら、100%個体と勝敗が実質同じです。", zh: "一般（L50）達到以上，與100%個體的勝負對戰實質相同。" });
  const closing = pk({
    ko: `정리 — ${cmpFail ? "공격 15는 타협 불가(미러 CMP), " : ""}${onlyHundo ? "개체값이 빡빡해 고개체 권장" : "타협선 " + compromise}. ${seasonLoc} 메타 기준이며 시즌이 바뀌면 갱신합니다.`,
    en: `Bottom line — ${cmpFail ? "attack 15 is non-negotiable (mirror CMP), " : ""}${onlyHundo ? "IV-tight, aim high" : "compromise line " + compromise}. Based on the ${seasonLoc} meta; updated when the season changes.`,
    ja: `まとめ — ${cmpFail ? "攻撃15は妥協不可（ミラーCMP）、" : ""}${onlyHundo ? "個体値がシビアで高個体推奨" : "妥協ライン" + compromise}。${seasonLoc}のメタ基準で、シーズンが変われば更新します。`,
    zh: `總結 — ${cmpFail ? "攻擊15不可妥協（鏡像CMP），" : ""}${onlyHundo ? "個體值嚴格，建議高個體" : "妥協線" + compromise}。以${seasonLoc}環境為準，賽季更替時更新。`,
  });

  return { title, hook, lead, compromise, compromiseNote, verdict, sections, faq, closing };
}
