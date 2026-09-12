// 도구 페이지 설명 본문(4개국어) — ToolExplainer가 렌더. 수치는 sim/pvpoke/pvpEngine.js(PvPoke MIT)와
// 게임 내 공개 규칙 기준: 효과굉장 1.6 · 반감 0.625 · 이중반감 0.390625 · 자속 1.2 · 그림자 공격 1.2/방어 0.833 ·
// PvP 보너스 1.3 · 능력치 단계 ±4(4/4 분모) · 베스트버디 +1레벨.
import type { Locale } from "../../../lib/i18n";

export type ToolContent = {
  h2: string;
  lead?: string;
  sections: { h: string; p: string }[];
  faqH: string;
  faq: { q: string; a: string }[];
  relatedH: string;
  related: { path: string; label: string }[];
};

// ───────────────────────── 배틀 시뮬레이터 ─────────────────────────
const SIM: Record<Locale, ToolContent> = {
  ko: {
    h2: "배틀 시뮬레이터, 무엇을 어떻게 계산하나",
    lead: "이 시뮬레이터는 포켓몬 GO 배틀리그의 실제 전투 규칙을 0.5초(1턴) 단위로 재현합니다. 아래는 결과를 올바르게 읽기 위한 원리·수치·한계 설명입니다.",
    sections: [
      { h: "턴 단위로 배틀을 재현합니다", p: "GBL 배틀은 0.5초를 1턴으로 진행됩니다. 빠른 기술은 정해진 턴 수 동안 발동하며 위력과 에너지를 주고, 차지 기술은 필요한 에너지(35·40·45·50·55·60·65·70·75·80 등)가 모이면 사용할 수 있습니다. 시뮬레이터는 두 포켓몬의 빠른 기술 타이밍, 에너지 축적, 차지 기술 발동, 실드 사용, HP 감소를 턴마다 계산해 한쪽의 HP가 0이 될 때까지 진행합니다." },
      { h: "데미지 공식(포켓몬 GO PvP 기준)", p: "데미지 = 내림(0.5 × 기술 위력 × (공격 실능력치 ÷ 상대 방어 실능력치) × 배율) + 1 입니다. 배율에는 자속(STAB) ×1.2, 타입 상성(효과굉장 ×1.6 · 반감 ×0.625 · 이중반감 ×0.390625), PvP 공통 보너스 ×1.3, 그림자 보정(공격 ×1.2 · 피격 시 방어 ×0.833), 그리고 버프·디버프 단계가 들어갑니다. 마지막의 '+1' 때문에 아무리 반감을 받아도 최소 1 데미지는 들어갑니다." },
      { h: "개체값·레벨·CP 캡 처리", p: "슈퍼리그(1500)·하이퍼리그(2500)에서는 입력한 개체값(공/방/체 0~15)으로 CP 상한을 넘지 않는 최대 레벨을 자동으로 찾아 실능력치를 계산합니다. '자동'을 고르면 해당 리그에서 스탯곱(공격×방어×체력)이 가장 큰 개체값 조합, 즉 PvP 순위 1위 개체를 사용합니다. 마스터리그는 캡이 없어 레벨 50(베스트버디 시 51) 기준입니다." },
      { h: "실드 시나리오와 실드 AI", p: "각 트레이너는 배틀당 실드 2장을 씁니다. 결과의 0·1·2 실드 시나리오는 '양쪽이 실드를 몇 장 쓰는가'에 따라 승패가 어떻게 바뀌는지 보여줍니다. 실드를 언제 쓰는지는 PvPoke의 실드 판단 로직(예상 데미지 대비 남은 HP, 저위력 기술로 실드를 빼는 베이팅 등)을 따르므로, 실제 상대가 실드를 다르게 쓰면 결과가 달라질 수 있습니다." },
      { h: "배틀 레이팅 읽는 법", p: "배틀 레이팅은 500이 대등입니다. 500보다 높으면 왼쪽 포켓몬이 유리, 낮으면 불리하며, 남은 HP 비율과 상대에게 준 데미지 비율을 함께 반영합니다. 같은 '승리'라도 레이팅 520과 800은 전혀 다릅니다. 520은 실드 한 장·에너지 한 번 차이로 뒤집힐 수 있는 박빙이고, 800은 상대가 무엇을 해도 뒤집기 어려운 압승입니다." },
      { h: "버프·디버프와 그림자 포켓몬", p: "일부 차지 기술은 사용 시 자신이나 상대의 공격·방어 능력치 단계를 바꿉니다. 단계는 −4~+4이며, +1은 ×1.25(5/4), +2는 ×1.5(6/4), −1은 ×0.8(4/5)처럼 4를 분모로 계산합니다. 확률 발동 기술(예: 12.5%·30%)은 시뮬레이터가 기댓값 성격으로 처리하므로 실전과 다를 수 있습니다. 그림자 포켓몬은 공격이 20% 세지는 대신 받는 데미지도 늘어나 '실드를 잘 받는 어택커'로 쓰는 것이 정석입니다." },
      { h: "메타 분석·매트릭스·팀 빌더", p: "1:1 배틀 외에 '메타 분석'은 한 포켓몬을 리그 상위 100종과 모두 붙여 승률을 계산하고, '매트릭스'는 상위 포켓몬끼리의 전 매치업 표를 만듭니다. '팀 빌더'는 내 3마리가 메타 120종을 상대로 몇 종을 이기는지 스코어카드로 보여줍니다. 파티를 짤 때는 세 마리가 서로 다른 상대를 커버하는지(약점이 겹치지 않는지)를 매트릭스로 확인하세요." },
      { h: "시뮬레이션과 실전이 다른 이유", p: "시뮬은 두 포켓몬의 '정보가 완전한 1:1'을 가정합니다. 실전에는 교체(스위치 타이머), 상대의 실드 판단 실수, 베이팅 성공 여부, 빠른 기술 입력 타이밍, 확률 버프 발동이 끼어듭니다. 그래서 GBL Note는 시뮬 기반 티어와 함께 유저들이 실제 대전에서 만난 상대를 집계한 실측 메타를 같이 보여줍니다. 시뮬은 '이 매치업의 구조'를 알려주고, 실측은 '지금 무엇을 준비할지'를 알려줍니다." },
    ],
    faqH: "자주 묻는 질문",
    faq: [
      { q: "시뮬 결과에서 이기는데 실전에서 지는 이유는?", a: "실드 사용 순서·교체·베이팅 성공 여부가 시뮬 가정과 다르기 때문입니다. 0·1·2 실드 시나리오를 모두 확인하고, 실드 한 장 차이로 승패가 뒤집히는 매치업은 '박빙'으로 보고 실드 관리에 집중하세요." },
      { q: "개체값을 몰라도 쓸 수 있나요?", a: "네. '자동'을 고르면 리그별 PvP 순위 1위 개체(슈퍼·하이퍼는 보통 공격이 낮고 방어·체력이 높은 조합, 마스터는 15/15/15)로 계산합니다. 실제 내 개체와 다르면 '개체값·레벨'에서 직접 입력하세요." },
      { q: "시즌 28 데이터는 무엇이 다른가요?", a: "시즌마다 기술 위력·에너지·습득 기술이 조정됩니다. 시즌 28 버튼은 PvPoke가 사전 반영한 리밸런스 데이터를 쓰며, 시즌 시작 후 확정치로 갱신됩니다." },
      { q: "계산 엔진의 출처는?", a: "오픈소스 프로젝트 PvPoke(MIT 라이선스)의 배틀 엔진을 기반으로 GBL Note가 UI와 실측 메타 결합을 자체 구현했습니다. 데미지·에너지·실드 판단 로직은 원 엔진과 동일합니다." },
    ],
    relatedH: "함께 보기",
    related: [
      { path: "/gbl/guide/pogo-pvp-calc", label: "PvP 계산법 가이드" },
      { path: "/gbl/guide/shields-baiting", label: "실드·베이팅 가이드" },
      { path: "/gbl/tier/great", label: "슈퍼리그 티어표" },
      { path: "/gbl/meta", label: "실측 메타" },
    ],
  },
  en: {
    h2: "How the battle simulator works",
    lead: "This simulator reproduces Pokémon GO Battle League combat in 0.5-second turns. Here is what it calculates, the numbers it uses, and where it differs from a real match.",
    sections: [
      { h: "Battles are simulated turn by turn", p: "A GBL turn is 0.5 seconds. Fast Attacks take a fixed number of turns and grant damage and energy; Charged Attacks become available once enough energy (35, 40, 45, 50, 55, 60, 65, 70, 75, 80 and so on) is stored. The simulator tracks both Pokémon's fast-move timing, energy, Charged Attack throws, shield use and HP every turn until one side reaches 0 HP." },
      { h: "The PvP damage formula", p: "Damage = floor(0.5 × move power × (attacker's Attack ÷ defender's Defense) × multipliers) + 1. Multipliers include STAB ×1.2, type effectiveness (super effective ×1.6, resisted ×0.625, double resisted ×0.390625), the flat PvP bonus ×1.3, Shadow modifiers (Attack ×1.2, Defense ×0.833 when hit) and stat-stage buffs or debuffs. The trailing +1 means every hit deals at least 1 damage no matter how resisted." },
      { h: "IVs, levels and the CP cap", p: "In Great League (1500) and Ultra League (2500) the simulator takes your IVs (Attack/Defense/HP, 0–15) and finds the highest level that stays under the cap, then computes real stats. 'Auto' uses the IV spread with the highest stat product (Attack × Defense × HP) for that league, i.e. the rank-1 PvP IVs. Master League has no cap, so level 50 (51 with Best Buddy) is assumed." },
      { h: "Shield scenarios and shield AI", p: "Each trainer has two shields per battle. The 0/1/2-shield scenarios show how the result changes depending on how many shields each side spends. When to shield follows PvPoke's shield logic (expected damage versus remaining HP, baiting with low-energy moves, and so on), so a real opponent who shields differently can produce a different outcome." },
      { h: "Reading the battle rating", p: "A battle rating of 500 is even. Above 500 the left Pokémon is favored; below, it is not. The rating combines remaining HP with damage dealt. A win at 520 and a win at 800 are very different: 520 can flip with one shield or one extra fast move, while 800 is a blowout the opponent can rarely overturn." },
      { h: "Buffs, debuffs and Shadow Pokémon", p: "Some Charged Attacks change a Pokémon's Attack or Defense stage. Stages run from −4 to +4 and are calculated with a denominator of 4: +1 is ×1.25 (5/4), +2 is ×1.5 (6/4), −1 is ×0.8 (4/5). Chance-based effects (for example 12.5% or 30%) are treated as expected value in the simulation, so real battles can differ. Shadow Pokémon hit 20% harder but also take more damage, which is why they work best as attackers that are backed by shields." },
      { h: "Meta analysis, matrix and team builder", p: "Beyond 1v1, 'Meta analysis' pits one Pokémon against the league's top 100 and reports win rates; 'Matrix' builds the full head-to-head grid among top Pokémon; 'Team builder' scores your three Pokémon against 120 meta threats. When building a team, use the matrix to check that your three cover different threats rather than sharing the same weaknesses." },
      { h: "Why simulations and real matches differ", p: "A simulation assumes a perfect-information 1v1. Real battles add switches (the switch timer), opponent shield mistakes, whether a bait lands, fast-move input timing and random buff procs. That is why GBL Note pairs simulated tiers with a live meta built from opponents our users actually faced. The sim explains the structure of a matchup; the live meta tells you what to prepare for right now." },
    ],
    faqH: "Frequently asked questions",
    faq: [
      { q: "Why do I lose in real battles a matchup the sim says I win?", a: "Shield order, switches and whether baits land differ from the sim's assumptions. Check all three shield scenarios; a matchup that flips on a single shield is close, so focus on shield management." },
      { q: "Can I use it without knowing my IVs?", a: "Yes. 'Auto' uses the rank-1 PvP IVs for the league (usually low Attack and high Defense/HP in Great and Ultra, 15/15/15 in Master). If your Pokémon differs, enter its IVs and level manually." },
      { q: "What is different about the Season 28 data?", a: "Each season adjusts move power, energy and learnable moves. The Season 28 button uses PvPoke's pre-season rebalance data and is updated to final values once the season starts." },
      { q: "Where does the engine come from?", a: "It is built on the open-source PvPoke battle engine (MIT license). GBL Note implements its own interface and the link to live meta data; damage, energy and shield logic match the original engine." },
    ],
    relatedH: "See also",
    related: [
      { path: "/gbl/guide/pogo-pvp-calc", label: "PvP damage math" },
      { path: "/gbl/guide/shields-baiting", label: "Shields & baiting" },
      { path: "/gbl/tier/great", label: "Great League tiers" },
      { path: "/gbl/meta", label: "Live meta" },
    ],
  },
  ja: {
    h2: "バトルシミュレーターの仕組み",
    lead: "このシミュレーターはポケモンGOバトルリーグの対戦ルールを0.5秒（1ターン）単位で再現します。結果を正しく読むための原理・数値・限界をまとめました。",
    sections: [
      { h: "ターン単位でバトルを再現", p: "GBLのバトルは0.5秒を1ターンとして進みます。通常わざは決まったターン数で発動しダメージとエネルギーを与え、ゲージわざは必要エネルギー（35・40・45・50・55・60・65・70・75・80など）が貯まると使えます。シミュレーターは両者の通常わざのタイミング、エネルギー蓄積、ゲージわざ発動、シールド使用、HP減少を毎ターン計算し、どちらかのHPが0になるまで進めます。" },
      { h: "ダメージ計算式（ポケモンGO PvP）", p: "ダメージ = 切り捨て(0.5 × わざ威力 × (攻撃実数値 ÷ 相手の防御実数値) × 倍率) + 1 です。倍率にはタイプ一致 ×1.2、タイプ相性（効果抜群 ×1.6・いまひとつ ×0.625・二重半減 ×0.390625）、PvP共通ボーナス ×1.3、シャドウ補正（攻撃 ×1.2・被弾時防御 ×0.833）、能力ランクの変化が含まれます。末尾の「+1」により、どれだけ半減されても最低1ダメージは入ります。" },
      { h: "個体値・レベル・CP上限の扱い", p: "スーパーリーグ（1500）・ハイパーリーグ（2500）では入力した個体値（攻/防/HP 0〜15）でCP上限を超えない最大レベルを自動で求め、実数値を計算します。「自動」を選ぶとそのリーグでステータス積（攻撃×防御×HP）が最大になる個体値、つまりPvP順位1位の個体を使います。マスターリーグは上限がないためレベル50（相棒ブースト時51）基準です。" },
      { h: "シールドシナリオとシールドAI", p: "各トレーナーは1バトルにつきシールド2枚を使えます。結果の0・1・2シールドシナリオは「双方が何枚使うか」で勝敗がどう変わるかを示します。シールドを切るタイミングはPvPokeのシールド判断ロジック（予想ダメージと残りHP、低威力わざでシールドを剥がすベイトなど）に従うため、実際の相手が違う判断をすれば結果は変わり得ます。" },
      { h: "バトルレーティングの読み方", p: "バトルレーティングは500が互角です。500より高ければ左のポケモンが有利、低ければ不利で、残りHP割合と与えたダメージ割合を合わせて反映します。同じ「勝ち」でも520と800は全く違います。520はシールド1枚・通常わざ1回の差で覆る接戦、800は相手が何をしても覆しにくい圧勝です。" },
      { h: "バフ・デバフとシャドウポケモン", p: "一部のゲージわざは使用時に自分や相手の攻撃・防御ランクを変化させます。ランクは−4〜+4で、+1は×1.25（5/4）、+2は×1.5（6/4）、−1は×0.8（4/5）のように4を分母に計算します。確率発動のわざ（12.5%・30%など）はシミュレーターが期待値的に扱うため実戦と異なることがあります。シャドウポケモンは攻撃が20%上がる代わりに被ダメージも増えるため、「シールドで守るアタッカー」として使うのが定石です。" },
      { h: "メタ分析・マトリクス・チームビルダー", p: "1対1のほか、「メタ分析」は1匹をリーグ上位100種すべてと対戦させ勝率を計算し、「マトリクス」は上位ポケモン同士の全対面表を作ります。「チームビルダー」は自分の3匹がメタ120種のうち何種に勝てるかをスコアカードで示します。パーティを組む際は、3匹が互いに異なる相手をカバーしているか（弱点が重なっていないか）をマトリクスで確認してください。" },
      { h: "シミュレーションと実戦が違う理由", p: "シミュは「情報が完全な1対1」を前提にします。実戦には交代（交代タイマー）、相手のシールド判断ミス、ベイトの成否、通常わざの入力タイミング、確率バフの発動が絡みます。だからGBL Noteはシミュ基準のティアと合わせて、ユーザーが実際の対戦で遭遇した相手を集計した実測メタを併記しています。シミュは「対面の構造」を、実測は「今何を準備すべきか」を教えてくれます。" },
    ],
    faqH: "よくある質問",
    faq: [
      { q: "シミュでは勝つのに実戦で負けるのはなぜ？", a: "シールドの順番・交代・ベイトの成否がシミュの前提と違うためです。0・1・2シールドの全シナリオを確認し、シールド1枚で勝敗が覆る対面は「接戦」と見てシールド管理に集中してください。" },
      { q: "個体値が分からなくても使えますか？", a: "はい。「自動」を選ぶとリーグ別PvP順位1位の個体（スーパー・ハイパーは通常攻撃が低く防御・HPが高い組み合わせ、マスターは15/15/15）で計算します。実際の個体と違う場合は「個体値・レベル」で直接入力してください。" },
      { q: "シーズン28データは何が違いますか？", a: "シーズンごとにわざの威力・エネルギー・習得わざが調整されます。シーズン28ボタンはPvPokeが事前反映したリバランスデータを使い、シーズン開始後に確定値へ更新されます。" },
      { q: "計算エンジンの出典は？", a: "オープンソースプロジェクトPvPoke（MITライセンス）のバトルエンジンを基に、GBL NoteがUIと実測メタとの連携を独自実装しました。ダメージ・エネルギー・シールド判断ロジックは元エンジンと同一です。" },
    ],
    relatedH: "あわせて読む",
    related: [
      { path: "/gbl/guide/pogo-pvp-calc", label: "PvP計算の仕組み" },
      { path: "/gbl/guide/shields-baiting", label: "シールド・ベイト" },
      { path: "/gbl/tier/great", label: "スーパーリーグティア" },
      { path: "/gbl/meta", label: "実測メタ" },
    ],
  },
  "zh-TW": {
    h2: "對戰模擬器的運作原理",
    lead: "本模擬器以 0.5 秒（1 回合）為單位重現寶可夢 GO 對戰聯盟的實際戰鬥規則。以下說明計算原理、使用的數值與限制，幫助你正確解讀結果。",
    sections: [
      { h: "以回合為單位重現對戰", p: "GBL 對戰以 0.5 秒為 1 回合。一般招式需固定回合數發動並提供傷害與能量，特殊招式在累積所需能量（35、40、45、50、55、60、65、70、75、80 等）後即可使用。模擬器每回合計算雙方的一般招式時機、能量累積、特殊招式發動、護盾使用與 HP 減少，直到一方 HP 歸零。" },
      { h: "傷害公式（寶可夢 GO PvP）", p: "傷害 = 向下取整(0.5 × 招式威力 × (攻擊實際值 ÷ 對手防禦實際值) × 倍率) + 1。倍率包含本系加成 ×1.2、屬性相剋（效果絕佳 ×1.6、效果不好 ×0.625、雙重抵抗 ×0.390625）、PvP 通用加成 ×1.3、暗影修正（攻擊 ×1.2、受擊時防禦 ×0.833）以及能力等級的升降。最後的「+1」代表無論如何被抵抗，每次攻擊至少造成 1 點傷害。" },
      { h: "個體值、等級與 CP 上限", p: "在超級聯盟（1500）與高級聯盟（2500）中，模擬器會依你輸入的個體值（攻/防/HP 0〜15）自動找出不超過上限的最高等級並計算實際數值。選「自動」則使用該聯盟能力值乘積（攻擊×防禦×HP）最高的個體值組合，即 PvP 排名第 1 的個體。大師聯盟沒有上限，以等級 50（最佳夥伴時 51）計算。" },
      { h: "護盾情境與護盾 AI", p: "每位訓練家每場可使用 2 面護盾。結果中的 0/1/2 護盾情境顯示「雙方各用幾面護盾」時勝負如何改變。何時開盾依 PvPoke 的護盾判斷邏輯（預期傷害對比剩餘 HP、以低能量招式騙盾等），因此真實對手若採取不同判斷，結果可能不同。" },
      { h: "如何解讀對戰評分", p: "對戰評分 500 代表均勢。高於 500 左側寶可夢有利，低於則不利，並同時反映剩餘 HP 比例與造成的傷害比例。同樣是「勝利」，520 與 800 截然不同：520 可能因一面護盾或一次一般招式而翻盤，800 則是對手幾乎無法逆轉的壓倒性勝利。" },
      { h: "增益、減益與暗影寶可夢", p: "部分特殊招式會改變自身或對手的攻擊・防禦等級。等級範圍為 −4〜+4，以 4 為分母計算：+1 為 ×1.25（5/4）、+2 為 ×1.5（6/4）、−1 為 ×0.8（4/5）。機率發動的效果（如 12.5%、30%）在模擬中以期望值處理，因此實戰可能不同。暗影寶可夢攻擊提高 20%，但受到的傷害也增加，因此最適合作為「有護盾保護的攻擊手」。" },
      { h: "環境分析、矩陣與隊伍建構", p: "除 1 對 1 外，「環境分析」會讓一隻寶可夢對上聯盟前 100 名並計算勝率；「矩陣」建立上位寶可夢之間的完整對戰表；「隊伍建構」則以計分卡顯示你的 3 隻對 120 隻環境寶可夢能贏幾隻。組隊時請用矩陣確認 3 隻是否覆蓋不同對手（弱點不重疊）。" },
      { h: "模擬與實戰為何不同", p: "模擬假設「資訊完全的 1 對 1」。實戰還有換場（換場計時）、對手的護盾判斷失誤、騙盾是否成功、一般招式輸入時機與機率增益。因此 GBL Note 在模擬層級表之外，同時提供由使用者實際對戰遭遇對手統計而成的實測環境。模擬告訴你「這個對面的結構」，實測告訴你「現在該準備什麼」。" },
    ],
    faqH: "常見問題",
    faq: [
      { q: "為什麼模擬贏了實戰卻輸？", a: "護盾順序、換場與騙盾成敗與模擬假設不同。請確認 0/1/2 護盾全部情境；只差一面護盾就翻盤的對面屬於「接近」，應專注於護盾管理。" },
      { q: "不知道個體值也能用嗎？", a: "可以。選「自動」會使用該聯盟 PvP 排名第 1 的個體（超級・高級通常為低攻擊、高防禦/HP，大師為 15/15/15）。若與你的實際個體不同，請在「個體值・等級」手動輸入。" },
      { q: "第 28 賽季資料有何不同？", a: "每個賽季都會調整招式威力、能量與可學習招式。第 28 賽季按鈕使用 PvPoke 預先反映的平衡調整資料，賽季開始後會更新為確定值。" },
      { q: "計算引擎來源？", a: "以開源專案 PvPoke（MIT 授權）的對戰引擎為基礎，GBL Note 自行實作介面與實測環境的整合。傷害、能量與護盾判斷邏輯與原引擎相同。" },
    ],
    relatedH: "延伸閱讀",
    related: [
      { path: "/gbl/guide/pogo-pvp-calc", label: "PvP 傷害計算" },
      { path: "/gbl/guide/shields-baiting", label: "護盾與騙盾" },
      { path: "/gbl/tier/great", label: "超級聯盟強度表" },
      { path: "/gbl/meta", label: "實測環境" },
    ],
  },
};

// ───────────────────────── 교환 목록 메이커 ─────────────────────────
const TRADE: Record<Locale, ToolContent> = {
  ko: {
    h2: "포켓몬 GO 교환, 알아야 할 규칙과 이 도구 사용법",
    lead: "교환 목록 이미지는 카페·오픈채팅·디스코드에서 '무엇을 원하고 무엇을 줄 수 있는지'를 한 장으로 보여주는 관행입니다. 만들기 전에 게임의 교환 규칙을 정리해 두면 헛걸음을 줄일 수 있습니다.",
    sections: [
      { h: "교환의 기본 조건", p: "포켓몬 교환은 서로 친구로 등록된 트레이너끼리, 같은 장소(기본 100m 이내, 이벤트 기간에는 확대되기도 함)에 있을 때 가능합니다. 트레이너 레벨 10 이상이어야 하며, 교환 화면에서 서로 내놓을 포켓몬을 고른 뒤 양쪽이 확인해야 성립합니다. 한 번 교환한 포켓몬은 다시 교환할 수 없고, 환상의 포켓몬(멜탄·멜메탈 제외)은 교환 대상이 아닙니다." },
      { h: "특별 교환과 별의모래 비용", p: "전설 포켓몬, 색이 다른(이로치) 포켓몬, 상대 도감에 없는 포켓몬은 '특별 교환'으로 하루 1회만 가능하며 별의모래가 많이 듭니다. 비용은 친구 레벨이 높을수록 크게 줄어듭니다. 도감에 없는 전설·이로치는 좋은 친구 100만 → 대단한 친구 80만 → 매우 친한 친구 30만 → 절친 4만이고, 이미 도감에 있으면 2만 → 1만6천 → 1,600 → 800입니다. 일반 포켓몬은 도감에 있으면 100, 없으면 2만부터 시작합니다. 절친이 될 때까지 기다렸다가 교환하는 것이 압도적으로 저렴합니다." },
      { h: "교환하면 개체값이 다시 정해집니다", p: "교환된 포켓몬은 개체값(공/방/체)이 다시 추첨됩니다. 최소 보장치는 친구 레벨에 따라 좋은 친구 1/1/1, 대단한 친구 2/2/2, 매우 친한 친구 3/3/3, 절친 5/5/5입니다. 그래서 PvP용 저공격 개체를 노리는 '교환 굴리기'는 절친보다 낮은 친구 레벨이 오히려 유리할 때가 있고, 반대로 레이드·마스터리그용 고IV를 원하면 럭키 교환이 유리합니다. CP는 받는 트레이너의 레벨에 맞춰 조정될 수 있습니다." },
      { h: "럭키 포켓몬과 럭키 프렌드", p: "교환 시 일정 확률로 럭키 포켓몬이 되며, 럭키는 개체값이 최소 12/12/12로 보장되고 파워업 별의모래가 50% 절감됩니다. 오래 보관한(2016~2017년 포획) 포켓몬을 교환하면 럭키 확률이 크게 오릅니다. 절친 상태에서 함께 활동하면 '럭키 프렌드'가 되어 다음 교환이 100% 럭키가 되므로, 전설·마스터리그용 포켓몬은 럭키 프렌드 교환에 아껴 쓰는 것이 정석입니다." },
      { h: "이로치·코스튬·다이맥스 표기", p: "커뮤니티 교환에서 가장 흔히 오가는 것이 이로치(색이 다른 포켓몬), 코스튬(모자·의상 등 이벤트 한정 외형), 지역 한정 포켓몬입니다. 이 도구는 이로치 표기와 코스튬·배경, 다이맥스·거다이맥스 표시를 지원하므로 '무엇을 원하는지'를 글로 설명하지 않아도 이미지 한 장으로 전달됩니다. 코스튬은 이름이 같아도 외형이 다르니 반드시 구분해 표기하세요." },
      { h: "이 도구 사용법", p: "① '원하는 것'과 '줄 수 있는 것' 중 어디에 넣을지 고르고 ② 도감 검색으로 포켓몬을 추가합니다(이로치 토글·배경 선택 가능). ③ 트레이너 코드를 입력하면 이미지에 함께 들어갑니다. ④ '공유하기' 또는 '저장'으로 이미지를 내보내 카페·채팅에 올리면 됩니다. 계정 정보는 서버에 저장되지 않고, 이미지는 내 기기에서 생성됩니다." },
      { h: "교환 매너와 주의점", p: "특별 교환은 하루 1회이므로 상대와 먼저 무엇을 교환할지 합의하세요. 도감 등록 여부에 따라 모래 비용이 크게 달라지니 상대가 도감에 이미 있는지도 확인하면 좋습니다. 교환은 현실에서 만나야 하므로 공개된 장소·낮 시간대를 권장하며, 트레이너 코드 외의 개인정보는 공유하지 마세요." },
    ],
    faqH: "자주 묻는 질문",
    faq: [
      { q: "이로치 교환 별의모래는 얼마인가요?", a: "상대 도감에 이로치가 없으면 특별 교환 최고 비용(좋은 친구 100만, 절친 4만)이고, 이미 도감에 있으면 2만~800입니다. 절친 전에는 비용이 매우 크니 친구 레벨을 먼저 올리세요." },
      { q: "교환 후 개체값이 바뀌나요?", a: "네, 다시 추첨됩니다. 최소치는 친구 레벨(좋은 1, 대단한 2, 매우 친한 3, 절친 5)에 따라 보장되고, 럭키 포켓몬은 최소 12/12/12입니다." },
      { q: "환상의 포켓몬도 교환되나요?", a: "뮤·세레비·지라치 등 환상의 포켓몬은 교환할 수 없습니다. 예외로 멜탄·멜메탈은 교환 가능합니다." },
      { q: "이 이미지에 개인정보가 들어가나요?", a: "입력한 트레이너 코드만 선택적으로 들어갑니다. 이미지는 브라우저에서 생성되며 서버에 업로드되지 않습니다." },
    ],
    relatedH: "함께 보기",
    related: [
      { path: "/gbl/guide/shadow-xl-investment", label: "그림자·XL 육성 가이드" },
      { path: "/gbl/iv", label: "PvP IV 순위 체커" },
      { path: "/gbl/raid/bosses", label: "레이드 보스 100% CP" },
    ],
  },
  en: {
    h2: "Pokémon GO trading rules and how to use this tool",
    lead: "A trade-list image shows your community what you want and what you can offer in one picture. Knowing the game's trading rules before you make one saves wasted meet-ups.",
    sections: [
      { h: "Basic trade requirements", p: "Trades happen between trainers who are friends in-game and physically close (100 m by default, sometimes extended during events). Both trainers must be at least level 10, choose the Pokémon they will give, and confirm. A Pokémon can only be traded once, and Mythical Pokémon (except Meltan and Melmetal) cannot be traded at all." },
      { h: "Special trades and Stardust cost", p: "Legendary Pokémon, Shiny Pokémon and any Pokémon not yet in the receiver's Pokédex count as a 'Special Trade', limited to one per day and expensive in Stardust. The cost drops sharply with friendship level. A Legendary or Shiny not in the Pokédex costs 1,000,000 for Good Friends, 800,000 for Great, 300,000 for Ultra and 40,000 for Best Friends; if it is already registered it costs 20,000 → 16,000 → 1,600 → 800. Regular Pokémon cost 100 if registered and start at 20,000 if not. Waiting until Best Friends is by far the cheapest route." },
      { h: "IVs are re-rolled on trade", p: "A traded Pokémon gets new IVs (Attack/Defense/HP). The guaranteed minimum depends on friendship: Good 1/1/1, Great 2/2/2, Ultra 3/3/3, Best 5/5/5. That is why 'trade re-rolling' for low-Attack PvP spreads can be better at lower friendship levels, while Lucky trades are the way to go for high-IV raid or Master League Pokémon. CP may be adjusted to the receiving trainer's level." },
      { h: "Lucky Pokémon and Lucky Friends", p: "Trades have a chance to produce a Lucky Pokémon, which is guaranteed at least 12/12/12 IVs and needs 50% less Stardust to power up. Pokémon caught long ago (2016–2017) have a much higher Lucky chance. Best Friends who interact can become Lucky Friends, making their next trade 100% Lucky, so save Lucky Friend trades for Legendaries and Master League picks." },
      { h: "Shinies, costumes and Dynamax", p: "The most common community trades involve Shiny Pokémon, costumed Pokémon (event-only hats and outfits) and regional exclusives. This tool marks shinies, costumes and backgrounds, and Dynamax or Gigantamax, so a single image explains what you are after. Costumed forms look different even with the same name, so always label them." },
      { h: "How to use the maker", p: "① Choose whether to add to 'Wanted' or 'Can offer'. ② Search the Pokédex and add Pokémon (toggle shiny, pick a background). ③ Optionally enter your trainer code so it appears on the image. ④ Use 'Share' or 'Save' to export the image and post it in your community. Nothing is stored on a server; the image is rendered on your device." },
      { h: "Trade etiquette and safety", p: "Since Special Trades are one per day, agree on what to trade before meeting. Stardust cost depends on whether the other trainer already has the Pokédex entry, so it is worth asking. Trades require meeting in person, so prefer public places in daylight and share nothing beyond your trainer code." },
    ],
    faqH: "Frequently asked questions",
    faq: [
      { q: "How much Stardust does a Shiny trade cost?", a: "If the receiver has no Shiny entry it is the top Special Trade cost (1,000,000 for Good Friends, 40,000 for Best Friends); if already registered it is 20,000 down to 800. Raise friendship first." },
      { q: "Do IVs change after a trade?", a: "Yes, they are re-rolled with minimums set by friendship level (Good 1, Great 2, Ultra 3, Best 5). Lucky Pokémon are at least 12/12/12." },
      { q: "Can Mythical Pokémon be traded?", a: "No. Mew, Celebi, Jirachi and other Mythicals cannot be traded, with Meltan and Melmetal as the exception." },
      { q: "Does the image include personal data?", a: "Only the trainer code you choose to enter. The image is generated in your browser and is never uploaded." },
    ],
    relatedH: "See also",
    related: [
      { path: "/gbl/guide/shadow-xl-investment", label: "Shadow & XL investment" },
      { path: "/gbl/iv", label: "PvP IV rank checker" },
      { path: "/gbl/raid/bosses", label: "Raid boss 100% CP" },
    ],
  },
  ja: {
    h2: "ポケモンGOの交換ルールとこのツールの使い方",
    lead: "交換リスト画像は「欲しいもの・出せるもの」を1枚で伝えるコミュニティの慣習です。作る前にゲーム内の交換ルールを押さえておくと無駄足を減らせます。",
    sections: [
      { h: "交換の基本条件", p: "ポケモン交換はフレンド登録済みのトレーナー同士が同じ場所（基本100m以内、イベント時は拡大されることも）にいるときに可能です。トレーナーレベル10以上が必要で、交換画面で互いに出すポケモンを選び、双方が確認して成立します。一度交換したポケモンは再交換できず、幻のポケモン（メルタン・メルメタルを除く）は交換対象外です。" },
      { h: "特別な交換とほしのすなコスト", p: "伝説のポケモン、色違い、相手の図鑑にないポケモンは「特別な交換」となり1日1回のみ、ほしのすなも多く必要です。コストは仲良し度が高いほど大きく下がります。図鑑未登録の伝説・色違いは、友達100万 → 仲良し80万 → 親友30万 → 大親友4万、登録済みなら2万 → 1万6千 → 1,600 → 800です。通常ポケモンは登録済み100、未登録2万からです。大親友になってから交換するのが圧倒的に安上がりです。" },
      { h: "交換すると個体値が再抽選されます", p: "交換されたポケモンは個体値（攻/防/HP）が再抽選されます。最低保証は仲良し度により、友達1/1/1、仲良し2/2/2、親友3/3/3、大親友5/5/5です。そのためPvP用の低攻撃個体を狙う「交換ガチャ」は大親友より低い仲良し度のほうが有利な場合があり、逆にレイド・マスターリーグ用の高個体値を狙うならキラ交換が有利です。CPは受け取るトレーナーのレベルに合わせて調整されることがあります。" },
      { h: "キラポケモンとキラフレンド", p: "交換時に一定確率でキラポケモンになり、個体値が最低12/12/12保証、強化のほしのすなが50%割引になります。長期間保管した（2016〜2017年捕獲）ポケモンを交換するとキラ確率が大きく上がります。大親友同士で交流すると「キラフレンド」になり次の交換が100%キラになるため、伝説・マスターリーグ用のポケモンはキラフレンド交換に温存するのが定石です。" },
      { h: "色違い・コスチューム・ダイマックスの表記", p: "コミュニティ交換で最もやり取りされるのが色違い、コスチューム（帽子・衣装などイベント限定の見た目）、地域限定ポケモンです。このツールは色違い表記、コスチューム・背景、ダイマックス・キョダイマックス表示に対応しているため、「何が欲しいか」を文章で説明しなくても画像1枚で伝わります。コスチュームは名前が同じでも見た目が違うので必ず区別して表記してください。" },
      { h: "このツールの使い方", p: "①「欲しいもの」「出せるもの」のどちらに入れるか選び ②図鑑検索でポケモンを追加します（色違い切替・背景選択可）。③トレーナーコードを入力すると画像に一緒に入ります。④「共有」または「保存」で画像を書き出し、コミュニティに投稿してください。アカウント情報はサーバーに保存されず、画像は端末上で生成されます。" },
      { h: "交換のマナーと注意点", p: "特別な交換は1日1回なので、相手と先に何を交換するか合意しましょう。図鑑登録の有無でほしのすなコストが大きく変わるため、相手の図鑑にあるかも確認するとよいです。交換は実際に会う必要があるので、公共の場所・日中を推奨し、トレーナーコード以外の個人情報は共有しないでください。" },
    ],
    faqH: "よくある質問",
    faq: [
      { q: "色違い交換のほしのすなはいくら？", a: "相手の図鑑に色違いがなければ特別な交換の最高コスト（友達100万、大親友4万）、登録済みなら2万〜800です。大親友前はコストが非常に大きいので、まず仲良し度を上げましょう。" },
      { q: "交換後に個体値は変わりますか？", a: "はい、再抽選されます。最低値は仲良し度（友達1、仲良し2、親友3、大親友5）で保証され、キラポケモンは最低12/12/12です。" },
      { q: "幻のポケモンも交換できますか？", a: "ミュウ・セレビィ・ジラーチなど幻のポケモンは交換できません。例外としてメルタン・メルメタルは交換可能です。" },
      { q: "この画像に個人情報は含まれますか？", a: "入力したトレーナーコードのみ任意で含まれます。画像はブラウザで生成され、サーバーにアップロードされません。" },
    ],
    relatedH: "あわせて読む",
    related: [
      { path: "/gbl/guide/shadow-xl-investment", label: "シャドウ・XL育成ガイド" },
      { path: "/gbl/iv", label: "PvP個体値ランクチェッカー" },
      { path: "/gbl/raid/bosses", label: "レイドボス100%CP" },
    ],
  },
  "zh-TW": {
    h2: "寶可夢 GO 交換規則與本工具使用方式",
    lead: "交換清單圖片是社群中用一張圖表達「想要什麼、能給什麼」的慣例。製作前先掌握遊戲的交換規則，可以避免白跑一趟。",
    sections: [
      { h: "交換的基本條件", p: "寶可夢交換需雙方已是遊戲內好友，且位於同一地點（預設 100 公尺內，活動期間可能放寬）。訓練家等級需達 10 級，在交換畫面各自選擇要交出的寶可夢並雙方確認後成立。交換過的寶可夢無法再次交換，幻之寶可夢（美錄坦・美錄梅塔除外）不可交換。" },
      { h: "特殊交換與星星沙子費用", p: "傳說寶可夢、異色寶可夢及對方圖鑑尚未登錄的寶可夢屬於「特殊交換」，每天限 1 次且需大量星星沙子。費用隨好友等級提高而大幅下降。圖鑑未登錄的傳說・異色：普通好友 100 萬 → 好朋友 80 萬 → 摯友 30 萬 → 死黨 4 萬；已登錄則為 2 萬 → 1 萬 6 千 → 1,600 → 800。一般寶可夢已登錄為 100，未登錄從 2 萬起。等到死黨再交換便宜得多。" },
      { h: "交換後個體值會重新決定", p: "交換後的寶可夢個體值（攻/防/HP）會重新抽選。最低保證依好友等級：普通好友 1/1/1、好朋友 2/2/2、摯友 3/3/3、死黨 5/5/5。因此想「洗」出 PvP 用低攻擊個體時，好友等級低於死黨反而可能更有利；相反地，想要團體戰・大師聯盟用的高 IV，幸運交換才是正解。CP 可能依接收方訓練家等級調整。" },
      { h: "幸運寶可夢與幸運好友", p: "交換時有一定機率成為幸運寶可夢，個體值最低保證 12/12/12，強化所需星星沙子減半。交換保存很久（2016〜2017 年捕獲）的寶可夢，幸運機率大幅提高。死黨之間互動可成為「幸運好友」，下一次交換 100% 幸運，因此傳說・大師聯盟用的寶可夢建議留給幸運好友交換。" },
      { h: "異色、造型與極巨化標示", p: "社群交換最常見的是異色寶可夢、造型寶可夢（帽子・服裝等活動限定外觀）與地區限定寶可夢。本工具支援異色標示、造型・背景、極巨化・超極巨化顯示，不必用文字說明也能用一張圖傳達需求。造型寶可夢名稱相同但外觀不同，請務必區分標示。" },
      { h: "本工具使用方式", p: "① 選擇加入「想要」或「可提供」。② 以圖鑑搜尋加入寶可夢（可切換異色、選擇背景）。③ 輸入訓練家代碼會一併顯示在圖片上。④ 用「分享」或「儲存」輸出圖片並張貼到社群。帳號資訊不會儲存在伺服器，圖片在你的裝置上產生。" },
      { h: "交換禮儀與注意事項", p: "特殊交換每天僅 1 次，請事先與對方協議交換內容。星星沙子費用取決於對方圖鑑是否已登錄，最好先確認。交換需要實際碰面，建議選擇公共場所與白天，除訓練家代碼外不要分享其他個人資訊。" },
    ],
    faqH: "常見問題",
    faq: [
      { q: "異色交換要多少星星沙子？", a: "若對方圖鑑沒有該異色，為特殊交換最高費用（普通好友 100 萬、死黨 4 萬）；已登錄則為 2 萬〜800。死黨之前費用極高，請先提升好友等級。" },
      { q: "交換後個體值會改變嗎？", a: "會，重新抽選。最低值依好友等級保證（普通好友 1、好朋友 2、摯友 3、死黨 5），幸運寶可夢最低 12/12/12。" },
      { q: "幻之寶可夢可以交換嗎？", a: "夢幻、時拉比、基拉祈等幻之寶可夢不可交換，美錄坦・美錄梅塔為例外可交換。" },
      { q: "圖片會包含個人資訊嗎？", a: "只有你選擇輸入的訓練家代碼。圖片在瀏覽器產生，不會上傳。" },
    ],
    relatedH: "延伸閱讀",
    related: [
      { path: "/gbl/guide/shadow-xl-investment", label: "暗影・XL 養成指南" },
      { path: "/gbl/iv", label: "PvP IV 排名檢查器" },
      { path: "/gbl/raid/bosses", label: "團體戰頭目 100% CP" },
    ],
  },
};

// ───────────────────────── PvP IV 순위 체커 ─────────────────────────
const IV: Record<Locale, ToolContent> = {
  ko: {
    h2: "IV 순위, 원리부터 실전 활용까지",
    lead: "IV 순위 체커는 4,096가지 개체값 조합을 리그 CP 상한 안에서 전부 계산해 순위를 매깁니다. 순위가 왜 생기는지, 몇 위까지가 의미 있는지, 어디서 좋은 개체를 구하는지 정리했습니다.",
    sections: [
      { h: "개체값(IV)과 CP의 관계", p: "포켓몬마다 공격·방어·체력 개체값이 0~15로 정해져 있고, 종족값에 더해져 실능력치가 됩니다. CP는 공격 × √방어 × √체력 × CPM²(레벨 계수) ÷ 10을 내림한 값으로, 세 스탯 중 공격의 비중이 가장 큽니다. 그래서 같은 레벨이면 공격 개체값이 높을수록 CP가 빨리 오릅니다." },
      { h: "왜 CP 제한 리그에서 공격이 낮은 개체가 1위인가", p: "슈퍼리그(1500)·하이퍼리그(2500)는 CP 상한이 있습니다. 공격 개체값이 낮으면 CP가 천천히 올라 더 높은 레벨까지 키울 수 있고, 레벨이 오르면 방어·체력이 함께 커집니다. 결과적으로 공격은 조금 낮아도 스탯곱(공격 × 방어 × 체력)이 더 커져 오래 버티고 빠른 기술 데미지도 더 많이 받아냅니다. 이 체커의 순위는 바로 이 스탯곱을 기준으로 4,096개 조합을 정렬한 것입니다." },
      { h: "마스터리그는 15/15/15", p: "CP 제한이 없는 마스터리그에서는 스탯을 최대한 올리는 것이 정답이라 15/15/15 개체가 항상 1위입니다. 다만 공격 개체값은 동시 차징 우선권(CMP)에도 영향을 주므로, 마스터리그에서는 공격 15가 아닌 개체는 미러전에서 후공이 되는 손해가 있을 수 있습니다. 타협 개체값이 어디까지 괜찮은지는 아래 심층 분석에서 종별로 다룹니다." },
      { h: "몇 위까지가 실전에서 의미 있나", p: "상위 100위 안이면 1위와 스탯곱 차이가 보통 1~2% 이내라 실전 체감은 거의 없습니다. 오히려 특정 상대의 빠른 기술을 한 대 덜 맞는 벌크포인트나 내 빠른 기술이 한 대 더 들어가는 브레이크포인트가 순위 숫자보다 중요할 때가 많습니다. 순위 500위 밖이라도 지금 당장 쓸 수 있으면 먼저 쓰고, 더 좋은 개체는 천천히 찾는 것이 현실적입니다." },
      { h: "XL 사탕과 레벨 40 이상 개체", p: "순위표의 레벨이 40을 넘으면 그 개체를 완성하려면 XL 사탕이 필요합니다. 슈퍼리그의 많은 주력(마릴리·누오·매지컬리프 등)은 레벨 45~51까지 올려야 1위 스탯이 나오므로, 순위표의 '레벨' 열을 보고 XL 투자가 가능한지 먼저 판단하세요. 종족값이 높은 포켓몬은 레벨 40 이하에서 CP 상한에 닿아 XL이 필요 없습니다." },
      { h: "베스트버디 +1 레벨", p: "베스트버디로 만든 포켓몬은 배틀 중 레벨이 +1 되어 CP 상한을 초과하지 않는 범위에서 스탯이 오릅니다. 그래서 순위 계산은 '베스트버디' 옵션을 켜면 달라지며, CP 캡에 여유가 없는 개체는 베스트버디 효과를 못 받기도 합니다. 주력 포켓몬은 베스트버디 기준으로 순위를 확인하는 것이 정확합니다." },
      { h: "좋은 개체는 어디서 구하나", p: "야생 포획은 0~15 전 범위가 나와 저공격 개체를 얻기에 가장 좋습니다. 레이드·알·리서치 보상으로 얻는 포켓몬은 최소 10/10/10이라 슈퍼·하이퍼용 저공격 개체를 얻기 어렵고, 반대로 GO 로켓단 조무래기에게서 얻는 그림자 포켓몬은 개체값 하한이 없어 저공격 개체를 찾기에 좋습니다. 교환은 친구 레벨별 최소 IV(좋은 1·대단한 2·매우 친한 3·절친 5)가 보장되며, 럭키 교환은 최소 12/12/12라 마스터리그용에 적합합니다. 커뮤니티 데이·스포트라이트 아워는 대량 포획으로 순위 높은 개체를 찾기 좋은 기회입니다." },
    ],
    faqH: "자주 묻는 질문",
    faq: [
      { q: "0/15/15가 항상 최고인가요?", a: "아닙니다. 종족값 구성에 따라 1위 조합은 다릅니다. 공격이 매우 낮은 종은 0/14/15나 1/15/14 같은 조합이, 종족값이 높아 레벨 40 이하에서 CP 캡에 닿는 종은 공격이 조금 있는 조합이 1위인 경우가 많습니다. 반드시 종별로 확인하세요." },
      { q: "게임 내 별 평가와 다른데요?", a: "게임 내 ★ 평가는 15/15/15에 가까울수록 높게 표시하는 단순 합산으로, PvP 스탯곱 순위와 무관합니다. PvP 검색 필터를 쓰거나 이 체커에서 순위를 확인하세요." },
      { q: "순위가 낮으면 키우면 안 되나요?", a: "상위 몇 백 위 차이는 대부분의 매치업에서 결과가 같습니다. 지금 있는 개체로 먼저 쓰고, 벌크포인트·브레이크포인트가 걸리는 상대가 있을 때만 더 좋은 개체를 찾는 것이 사탕·모래 낭비가 없습니다." },
    ],
    relatedH: "함께 보기",
    related: [
      { path: "/gbl/guide/iv-optimization", label: "IV 최적화 가이드" },
      { path: "/gbl/guide/shadow-xl-investment", label: "그림자·XL 육성 가이드" },
      { path: "/gbl/cmp/master", label: "마스터리그 CMP 순위" },
      { path: "/gbl/sim", label: "배틀 시뮬레이터" },
    ],
  },
  en: {
    h2: "IV rank explained: from the math to what actually matters",
    lead: "The IV rank checker computes all 4,096 IV combinations under a league's CP cap and sorts them. Here is why ranks exist, how far down the list still matters, and where to find good spreads.",
    sections: [
      { h: "IVs and CP", p: "Every Pokémon has Attack, Defense and HP IVs from 0 to 15, added to its base stats to form real stats. CP is floor(Attack × √Defense × √HP × CPM² ÷ 10), where CPM is the level multiplier, and Attack carries the most weight. At the same level, a higher Attack IV pushes CP up fastest." },
      { h: "Why low Attack ranks first in capped leagues", p: "Great League (1500) and Ultra League (2500) cap CP. A lower Attack IV makes CP grow more slowly, so the Pokémon can be raised to a higher level, and higher level raises Defense and HP too. The result is a slightly lower Attack but a larger stat product (Attack × Defense × HP): it survives longer and absorbs more fast-move damage. The checker's rank is simply all 4,096 spreads sorted by that stat product." },
      { h: "Master League: 15/15/15", p: "Master League has no cap, so maximizing every stat is correct and 15/15/15 is always rank 1. Attack IV also decides Charged Move Priority (CMP), so anything below 15 Attack can lose the tie in a mirror. How far you can compromise is covered species by species in the deep dives below." },
      { h: "How far down the list still matters", p: "Within the top 100 the stat product usually differs from rank 1 by under 1–2%, which is rarely felt in battle. Bulkpoints (taking one fewer fast move from a specific opponent) and breakpoints (landing one more fast-move damage) often matter more than the rank number. If a spread outside the top 500 is what you have now, use it and hunt for a better one over time." },
      { h: "XL Candy and levels above 40", p: "If the rank table shows a level above 40, finishing that spread requires XL Candy. Many Great League staples (Azumarill, Quagsire, Meganium and others) need level 45–51 for their rank-1 stats, so check the 'Level' column first to see whether the XL investment is realistic. High-base-stat Pokémon hit the cap below level 40 and need no XL." },
      { h: "Best Buddy +1 level", p: "A Best Buddy gains +1 level in battle, raising stats as long as the CP cap allows. Ranks therefore change with the 'Best Buddy' option on, and a spread with no room under the cap may not benefit at all. Check your main Pokémon with Best Buddy enabled for accurate ranks." },
      { h: "Where good spreads come from", p: "Wild catches roll the full 0–15 range, making them the best source of low-Attack spreads. Raids, eggs and research rewards have a 10/10/10 floor, so they rarely give Great or Ultra League spreads, while Shadow Pokémon from Rocket Grunts have no floor and are a good source of low-Attack spreads. Trades guarantee minimums by friendship level (Good 1, Great 2, Ultra 3, Best 5), and Lucky trades guarantee 12/12/12, which suits Master League. Community Days and Spotlight Hours are the best windows to mass-catch for a high-rank spread." },
    ],
    faqH: "Frequently asked questions",
    faq: [
      { q: "Is 0/15/15 always the best?", a: "No. The rank-1 spread depends on base stats. Very low-Attack species often peak at 0/14/15 or 1/15/14, and high-base-stat species that hit the cap under level 40 often prefer some Attack. Always check per species." },
      { q: "Why does the in-game star appraisal disagree?", a: "The in-game stars simply reward closeness to 15/15/15 and ignore PvP stat product. Use the PvP search filter or this checker instead." },
      { q: "Should I skip a low-rank Pokémon?", a: "A gap of a few hundred ranks gives the same result in most matchups. Use what you have now and look for a better spread only when a specific bulkpoint or breakpoint is at stake." },
    ],
    relatedH: "See also",
    related: [
      { path: "/gbl/guide/iv-optimization", label: "IV optimization guide" },
      { path: "/gbl/guide/shadow-xl-investment", label: "Shadow & XL investment" },
      { path: "/gbl/cmp/master", label: "Master League CMP" },
      { path: "/gbl/sim", label: "Battle simulator" },
    ],
  },
  ja: {
    h2: "個体値ランクの原理と実戦での使い方",
    lead: "個体値ランクチェッカーはリーグのCP上限内で4,096通りの個体値をすべて計算して順位付けします。順位が生まれる理由、何位までが意味を持つか、良い個体をどこで手に入れるかをまとめました。",
    sections: [
      { h: "個体値（IV）とCPの関係", p: "ポケモンごとに攻撃・防御・HPの個体値が0〜15で決まり、種族値に加算されて実数値になります。CPは 攻撃 × √防御 × √HP × CPM²（レベル係数）÷ 10 の切り捨てで、3ステータスのうち攻撃の比重が最も大きいです。そのため同じレベルなら攻撃個体値が高いほどCPが早く上がります。" },
      { h: "CP制限リーグで攻撃が低い個体が1位になる理由", p: "スーパーリーグ（1500）・ハイパーリーグ（2500）にはCP上限があります。攻撃個体値が低いとCPがゆっくり上がるためより高いレベルまで育てられ、レベルが上がれば防御・HPも一緒に伸びます。結果として攻撃は少し低くてもステータス積（攻撃×防御×HP）が大きくなり、長く耐えて通常わざのダメージも多く受け止められます。このチェッカーの順位は、まさにこのステータス積で4,096通りを並べたものです。" },
      { h: "マスターリーグは15/15/15", p: "CP制限のないマスターリーグではステータスを最大化するのが正解なので、15/15/15が常に1位です。ただし攻撃個体値は同時ゲージの優先権（CMP）にも影響するため、マスターリーグで攻撃15でない個体はミラー戦で後手になる不利があり得ます。妥協個体がどこまで許容できるかは、下の詳細分析で種別に扱っています。" },
      { h: "何位までが実戦で意味を持つか", p: "上位100位以内なら1位とのステータス積の差は通常1〜2%以内で、実戦での体感はほぼありません。むしろ特定の相手の通常わざを1発少なく受けるバルクポイントや、自分の通常わざが1発多く入るブレイクポイントのほうが順位の数字より重要な場合が多いです。500位圏外でも今すぐ使えるならまず使い、より良い個体はゆっくり探すのが現実的です。" },
      { h: "XLアメとレベル40超えの個体", p: "順位表のレベルが40を超える場合、その個体を完成させるにはXLアメが必要です。スーパーリーグの主力（マリルリ・ヌオー・メガニウムなど）の多くはレベル45〜51まで上げないと1位のステータスにならないため、順位表の「レベル」列を見てXL投資が可能か先に判断してください。種族値が高いポケモンはレベル40以下でCP上限に達するためXLは不要です。" },
      { h: "相棒ブースト +1レベル", p: "大親友の相棒ポケモンはバトル中にレベルが+1され、CP上限を超えない範囲でステータスが上がります。そのため順位計算は「相棒ブースト」オプションをオンにすると変わり、CP上限に余裕のない個体は効果を受けられないこともあります。主力ポケモンは相棒ブースト基準で順位を確認するのが正確です。" },
      { h: "良い個体はどこで手に入るか", p: "野生の捕獲は0〜15の全範囲が出るため低攻撃個体を得るのに最適です。レイド・タマゴ・リサーチ報酬で得るポケモンは最低10/10/10のためスーパー・ハイパー用の低攻撃個体は得にくく、逆にGOロケット団のしたっぱから得るシャドウポケモンは個体値の下限がないため低攻撃個体を探すのに向いています。交換は仲良し度別の最低IV（友達1・仲良し2・親友3・大親友5）が保証され、キラ交換は最低12/12/12でマスターリーグ向きです。コミュニティ・デイやスポットライトアワーは大量捕獲で高順位個体を探す好機です。" },
    ],
    faqH: "よくある質問",
    faq: [
      { q: "0/15/15が常に最高ですか？", a: "いいえ。種族値の構成によって1位の組み合わせは異なります。攻撃が非常に低い種は0/14/15や1/15/14、種族値が高くレベル40以下でCP上限に達する種は攻撃が少しある組み合わせが1位になることが多いです。必ず種別に確認してください。" },
      { q: "ゲーム内の星評価と違うのですが？", a: "ゲーム内の★評価は15/15/15に近いほど高く表示する単純合算で、PvPのステータス積順位とは無関係です。PvP検索フィルターかこのチェッカーで順位を確認してください。" },
      { q: "順位が低いと育てないほうがいいですか？", a: "上位数百位の差はほとんどの対面で結果が同じです。今ある個体でまず使い、バルクポイント・ブレイクポイントが絡む相手がいるときだけより良い個体を探すのがアメ・すなの無駄がありません。" },
    ],
    relatedH: "あわせて読む",
    related: [
      { path: "/gbl/guide/iv-optimization", label: "個体値最適化ガイド" },
      { path: "/gbl/guide/shadow-xl-investment", label: "シャドウ・XL育成ガイド" },
      { path: "/gbl/cmp/master", label: "マスターリーグCMP" },
      { path: "/gbl/sim", label: "バトルシミュレーター" },
    ],
  },
  "zh-TW": {
    h2: "IV 排名：從原理到實戰應用",
    lead: "IV 排名檢查器會在聯盟 CP 上限內計算全部 4,096 種個體值組合並排序。以下說明排名為何存在、幾名以內才有意義，以及好個體從哪裡來。",
    sections: [
      { h: "個體值（IV）與 CP 的關係", p: "每隻寶可夢的攻擊・防禦・HP 個體值為 0〜15，加上種族值後成為實際數值。CP 為 攻擊 × √防禦 × √HP × CPM²（等級係數）÷ 10 向下取整，三項數值中攻擊的比重最大。因此同等級下，攻擊個體值越高 CP 上升越快。" },
      { h: "為何 CP 限制聯盟中低攻擊個體排第一", p: "超級聯盟（1500）與高級聯盟（2500）有 CP 上限。攻擊個體值低，CP 上升較慢，就能養到更高等級；等級上升時防禦・HP 也一起提高。結果是攻擊稍低但能力值乘積（攻擊 × 防禦 × HP）更大，能撐更久、承受更多一般招式傷害。本檢查器的排名正是以此乘積將 4,096 種組合排序。" },
      { h: "大師聯盟：15/15/15", p: "沒有 CP 限制的大師聯盟以最大化數值為正解，15/15/15 永遠第一。但攻擊個體值也影響同時特殊招式的優先權（CMP），大師聯盟中攻擊不滿 15 的個體在鏡像對戰可能後手吃虧。妥協個體可以接受到什麼程度，下方的深入分析會按物種說明。" },
      { h: "幾名以內在實戰才有意義", p: "前 100 名內與第 1 名的能力值乘積差距通常在 1〜2% 以內，實戰幾乎感受不到。反而少承受特定對手一次一般招式的耐久點（bulkpoint）、或自己一般招式多打一點傷害的突破點（breakpoint）常比排名數字更重要。即使排在 500 名外，能立刻使用就先用，更好的個體慢慢找才實際。" },
      { h: "XL 糖果與 40 級以上個體", p: "若排名表的等級超過 40，完成該個體需要 XL 糖果。超級聯盟許多主力（瑪力露麗・沼王・大竺葵等）需升到 45〜51 級才有第 1 名的數值，請先看排名表的「等級」欄判斷 XL 投資是否可行。種族值高的寶可夢在 40 級以下就達 CP 上限，不需 XL。" },
      { h: "最佳夥伴 +1 等級", p: "成為最佳夥伴的寶可夢在對戰中等級 +1，在不超過 CP 上限的範圍內提高數值。因此開啟「最佳夥伴」選項後排名會改變，CP 上限沒有餘裕的個體可能完全無法受益。主力寶可夢建議以最佳夥伴為基準確認排名。" },
      { h: "好個體從哪裡來", p: "野生捕捉會出現 0〜15 全範圍，是取得低攻擊個體的最佳來源。團體戰・蛋・調查獎勵取得的寶可夢最低為 10/10/10，很難得到超級・高級用的低攻擊個體；反之從火箭隊手下取得的暗影寶可夢沒有個體值下限，適合尋找低攻擊個體。交換依好友等級保證最低 IV（普通好友 1・好朋友 2・摯友 3・死黨 5），幸運交換最低 12/12/12，適合大師聯盟。社群日與聚光燈時刻是大量捕捉、尋找高排名個體的好時機。" },
    ],
    faqH: "常見問題",
    faq: [
      { q: "0/15/15 永遠最好嗎？", a: "不是。第 1 名的組合取決於種族值。攻擊極低的物種常是 0/14/15 或 1/15/14，種族值高、40 級以下就達上限的物種則常需要一點攻擊。請務必按物種確認。" },
      { q: "和遊戲內星級評價不同？", a: "遊戲內 ★ 評價只是越接近 15/15/15 越高的簡單加總，與 PvP 能力值乘積排名無關。請使用 PvP 搜尋篩選或本檢查器確認排名。" },
      { q: "排名低就不該養嗎？", a: "相差幾百名在大多數對面結果相同。先用手上的個體，只有在牽涉特定耐久點・突破點的對手時再找更好的個體，才不會浪費糖果與沙子。" },
    ],
    relatedH: "延伸閱讀",
    related: [
      { path: "/gbl/guide/iv-optimization", label: "IV 最佳化指南" },
      { path: "/gbl/guide/shadow-xl-investment", label: "暗影・XL 養成指南" },
      { path: "/gbl/cmp/master", label: "大師聯盟 CMP" },
      { path: "/gbl/sim", label: "對戰模擬器" },
    ],
  },
};

export function getSimContent(lang: string): ToolContent { return SIM[lang as Locale] || SIM.ko; }
export function getTradeContent(lang: string): ToolContent { return TRADE[lang as Locale] || TRADE.ko; }
export function getIvContent(lang: string): ToolContent { return IV[lang as Locale] || IV.ko; }
