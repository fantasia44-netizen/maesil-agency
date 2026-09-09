// 대표 덱 원본 전략 분석 — 아키타입 수준의 검증 가능한 전략(운영/사고). 세부 수치 주장은 지양,
// 매치업은 실데이터(matchups.json)가 뒷받침. 여기 등록된 덱만 상세 페이지 생성(얕은 페이지 방지).
// 사장님 검수·보강 대상. 새 덱 추가 = 여기 항목 추가 → 자동으로 페이지 생성.
import { type Locale } from "../../../../lib/i18n";

export type DeckAnalysis = { playstyle: string; summary: string; gamePlan: string; keyCards: string[]; techCards?: string[] };

const A: Record<string, Partial<Record<Locale, DeckAnalysis>>> = {
  // ── Mega Lucario ex / Lucario — 격투 어그로 (S, 메타 정점) ──
  "mega-lucario-ex-b3-lucario-a2": {
    ko: {
      playstyle: "격투 어그로",
      summary: "현재 메타 점유율 1위의 격투 속공 덱. 초반부터 압박을 걸어 상대가 자리를 잡기 전에 포인트를 몰아치는 것이 핵심입니다.",
      gamePlan: "리오르–루카리오 라인을 빠르게 세우고 메가 루카리오 ex로 2~3턴 안에 공격을 시작합니다. 상대 벤치를 지목·강제교체(사브리나·사이러스 등)로 원하는 대상을 앞으로 끌어내 급소를 노리고, 컨트롤 덱이 안정되기 전에 게임을 끝내는 레이스형 운영이 정석입니다.",
      keyCards: ["메가 루카리오 ex — 주력 어태커", "리오르/루카리오 — 진화 세팅", "박사의 연구 — 드로우 엔진", "사브리나·X 스피드 — 지목·기동"],
      techCards: ["추가 지목 카드 — 벤치 저격 강화", "데미지 보정 카드 — 핵심 HP선 원킬 조정", "선공권·기동 카드 — 미러전·컨트롤 대비"],
    },
    en: {
      playstyle: "Fighting Aggro",
      summary: "The #1 meta-share deck: a fast Fighting aggro build that wins by applying pressure before the opponent stabilizes.",
      gamePlan: "Set up the Riolu–Lucario line quickly and start attacking with Mega Lucario ex by turn 2–3. Use gust/switch effects to drag the target you want into the active spot, and race prize points before control decks find their footing.",
      keyCards: ["Mega Lucario ex — main attacker", "Riolu/Lucario — evolution setup", "Professor's Research — draw engine", "Sabrina · X Speed — gust & mobility"],
      techCards: ["Extra gust — stronger bench sniping", "Damage boosters — hit key OHKO thresholds", "Going-first / mobility — for the mirror and vs control"],
    },
    ja: {
      playstyle: "闘 アグロ",
      summary: "現環境の使用率トップ。闘タイプの速攻デッキで、相手が構える前に圧をかけてポイントを取り切るのが要です。",
      gamePlan: "リオル–ルカリオのラインを素早く並べ、2〜3ターンでメガルカリオexの攻撃を開始。ベンチ指名・強制入れ替え(サブリナ等)で狙った相手を引きずり出し、コントロールが安定する前に決めるレース型が基本です。",
      keyCards: ["メガルカリオex — 主力アタッカー", "リオル/ルカリオ — 進化セット", "博士の研究 — ドローエンジン", "サブリナ・Xスピード — 指名・機動"],
      techCards: ["追加の指名カード — ベンチ狙撃を強化", "ダメージ補正カード — 重要HPラインを調整", "先攻・機動カード — ミラー/コントロール対策"],
    },
    "zh-TW": {
      playstyle: "格鬥快攻",
      summary: "目前使用率第一的格鬥快攻牌組。核心是從前期就施壓，在對手站穩之前搶下分數。",
      gamePlan: "快速鋪好利歐路–路卡利歐進化線，第2~3回合就用超級路卡利歐ex開始進攻。用指名·強制交換(莎娜等)把想打的目標拉到前排，趕在控制牌組穩住之前結束比賽。",
      keyCards: ["超級路卡利歐ex — 主力攻擊手", "利歐路/路卡利歐 — 進化鋪陳", "博士的研究 — 抽牌引擎", "莎娜·X速度 — 指名·機動"],
      techCards: ["額外指名卡 — 強化備位狙擊", "傷害加成卡 — 湊出關鍵一擊斬線", "先手·機動卡 — 應對鏡像/控制"],
    },
  },
  // ── Mega Altaria ex / Espeon — 컨트롤·버프 (S) ──
  "mega-altaria-ex-b1-espeon-b3a": {
    ko: {
      playstyle: "컨트롤·버프",
      summary: "S티어 중 승률이 가장 높은 그라인드형 덱. 메가 파비코리 ex의 버프와 에브이(Espeon)의 유연함으로 장기전을 지배합니다.",
      gamePlan: "초반은 안정적으로 버티며 어태커를 키우고, 교환에서 우위를 쌓아 상대 자원을 말립니다. 서두르지 않고 일관성과 방해로 롱게임을 가져가는 것이 이 덱의 승리 공식입니다. 속공 덱 상대로는 초반 압박을 넘기는 것이 관건.",
      keyCards: ["메가 파비코리 ex — 버프·핵심", "에브이 계열 — 유연성", "드로우·방해 트레이너 — 자원 관리"],
    },
    en: {
      playstyle: "Control / Buff",
      summary: "The highest-win-rate S-tier deck: a grindy build that dominates long games with Mega Altaria ex's buffs and Espeon's flexibility.",
      gamePlan: "Survive the early turns, build your attacker, and win trades to grind the opponent out of resources. Consistency and disruption over speed — the long game is where this deck wins. Against aggro, surviving the opening pressure is the key.",
      keyCards: ["Mega Altaria ex — buff engine", "Espeon line — flexibility", "Draw / disruption trainers — resource control"],
    },
    ja: {
      playstyle: "コントロール・バフ",
      summary: "Sティアで最も勝率が高いグラインド型。メガチルタリスexのバフとイーブイ系の柔軟さで長期戦を支配します。",
      gamePlan: "序盤は安定して耐えつつアタッカーを育て、交換で優位を積んで相手の資源を枯らします。急がず一貫性と妨害でロングゲームを取るのが勝ち筋。アグロ相手は序盤の圧を凌げるかが鍵です。",
      keyCards: ["メガチルタリスex — バフの核", "イーブイ系 — 柔軟性", "ドロー・妨害トレーナー — 資源管理"],
    },
    "zh-TW": {
      playstyle: "控制·增益",
      summary: "S級中勝率最高的消耗型牌組。以超級七夕青鳥ex的增益與伊布系的靈活度主宰長局。",
      gamePlan: "前期穩住並養攻擊手，靠交換累積優勢、耗光對手資源。不求快、以穩定與干擾拿下長局是致勝方程式。面對快攻，能否撐過前期壓力是關鍵。",
      keyCards: ["超級七夕青鳥ex — 增益核心", "伊布系 — 靈活性", "抽牌·干擾訓練家 — 資源控制"],
    },
  },
  // ── Suicune ex / Baxcalibur — 물 램프 (A) ──
  "suicune-ex-a4a-baxcalibur-b2a": {
    ko: {
      playstyle: "물 램프·미드레인지",
      summary: "박스칼리버로 에너지를 가속해 스이쿤 ex를 빠르게 가동하는 물 덱. 점유율은 높지만 승률은 50% 안팎이라 운영 정밀도가 성패를 가릅니다.",
      gamePlan: "박스칼리버의 에너지 가속으로 스이쿤 ex를 남보다 한 박자 빨리 세워 템포를 잡습니다. 가속이 걸리면 강력하지만 세팅이 어긋나면 손해가 크므로, 드로우로 일관성을 확보하고 무리한 전개를 피하는 것이 중요합니다.",
      keyCards: ["스이쿤 ex — 주력 어태커", "박스칼리버 — 에너지 가속", "물 에너지 · 드로우 트레이너"],
    },
    en: {
      playstyle: "Water Ramp / Midrange",
      summary: "A Water deck that uses Baxcalibur to accelerate energy onto Suicune ex. High share but roughly a coin-flip win rate — piloting precision decides games.",
      gamePlan: "Use Baxcalibur's acceleration to power up Suicune ex a beat ahead of the field and seize tempo. Powerful when it ramps, punishing when it stumbles — secure consistency with draw and avoid overextending.",
      keyCards: ["Suicune ex — main attacker", "Baxcalibur — energy acceleration", "Water Energy · draw trainers"],
    },
    ja: {
      playstyle: "水 ランプ・ミッドレンジ",
      summary: "バクガメスでエネ加速し、スイクンexを早期起動する水デッキ。使用率は高いが勝率は50%前後で、回しの精度が勝敗を分けます。",
      gamePlan: "バクガメスの加速でスイクンexを一手早く立ててテンポを握ります。加速が決まれば強力ですが、セットが崩れると損失が大きいので、ドローで一貫性を確保し無理な展開を避けます。",
      keyCards: ["スイクンex — 主力アタッカー", "バクガメス — エネ加速", "水エネルギー・ドロー"],
    },
    "zh-TW": {
      playstyle: "水系加速·中速",
      summary: "以龜足巨鎧加速能量、快速啟動水君ex的水系牌組。使用率高但勝率約五五波，操作精度決定勝負。",
      gamePlan: "用龜足巨鎧的加速比對手早一步立起水君ex搶節奏。加速到位時強力、鋪不順時損失大，因此要靠抽牌確保穩定、避免過度展開。",
      keyCards: ["水君ex — 主力攻擊手", "龜足巨鎧 — 能量加速", "水能量·抽牌訓練家"],
    },
  },
  // ── Butterfree / Mega Sceptile ex — 풀 툴박스·힐 (A) ──
  "butterfree-b3b-mega-sceptile-ex-b3": {
    ko: {
      playstyle: "풀 툴박스·힐",
      summary: "버터플의 서포트(회복·에너지)와 메가 나무킹 ex의 화력을 결합한 풀 덱. A티어 중에서도 승률이 준수한 그라인드형입니다.",
      gamePlan: "버터플로 회복·에너지를 공급하며 소모전을 버티고, 메가 나무킹 ex를 피니셔로 활용합니다. 상대의 화력을 힐로 상쇄해 자원 우위를 만든 뒤 후반에 굳히는 운영이 핵심입니다.",
      keyCards: ["메가 나무킹 ex — 피니셔", "버터플(캐터피 라인) — 회복·서포트", "리프 케이프 · 향기의 숲 — 유지력"],
    },
    en: {
      playstyle: "Grass Toolbox / Healing",
      summary: "A Grass deck pairing Butterfree's support (healing/energy) with Mega Sceptile ex's damage. A grindy build with a solid win rate for A-tier.",
      gamePlan: "Use Butterfree to supply healing and energy through the war of attrition, and close with Mega Sceptile ex as the finisher. Offset the opponent's damage with healing to build a resource lead, then seal the late game.",
      keyCards: ["Mega Sceptile ex — finisher", "Butterfree (Caterpie line) — healing/support", "Leaf Cape · Fragrant Forest — longevity"],
    },
    ja: {
      playstyle: "草 ツールボックス・回復",
      summary: "バタフリーの支援(回復・エネ)とメガジュカインexの火力を組み合わせた草デッキ。Aティアの中でも勝率が安定したグラインド型です。",
      gamePlan: "バタフリーで回復・エネを供給して消耗戦を凌ぎ、メガジュカインexをフィニッシャーに。相手の火力を回復で相殺して資源優位を作り、後半で締めるのが基本です。",
      keyCards: ["メガジュカインex — フィニッシャー", "バタフリー(キャタピー系) — 回復・支援", "リーフケープ・かぐわしの森 — 継戦力"],
    },
    "zh-TW": {
      playstyle: "草系工具箱·治療",
      summary: "結合巴大蝶的支援(治療·能量)與超級蜥蜴王ex火力的草系牌組。是A級中勝率穩健的消耗型。",
      gamePlan: "用巴大蝶供應治療與能量撐過消耗戰，以超級蜥蜴王ex收尾。用治療抵銷對手輸出、建立資源優勢，後期再一舉鎖定勝局。",
      keyCards: ["超級蜥蜴王ex — 收尾", "巴大蝶(綠毛蟲系) — 治療·支援", "葉子斗篷·芬芳森林 — 續航"],
    },
  },
  // ── Vespiquen ex / Shuckle ex — 벌레 스웜·템포 (A) ──
  "vespiquen-ex-b4-shuckle-ex-a4": {
    ko: {
      playstyle: "벌레 스웜·템포",
      summary: "비퀸 ex가 벤치 전개에 비례해 화력을 내는 벌레 덱. A티어 중에서도 승률이 높은 템포형입니다.",
      gamePlan: "벤치를 빠르게 채워 비퀸 ex의 타점을 끌어올리고, 단단지로 보조하며 상대가 자리를 잡기 전에 템포로 몰아칩니다. 전개가 곧 화력이므로 드로우로 벤치를 안정적으로 채우는 것이 핵심입니다.",
      keyCards: ["비퀸 ex — 벤치 비례 타점", "단단지 — 서포트·유지", "박사의 연구 — 전개 드로우"],
    },
    en: {
      playstyle: "Bug Swarm / Tempo",
      summary: "A Bug deck where Vespiquen ex scales damage with your bench. A high-win-rate tempo build within A-tier.",
      gamePlan: "Fill your bench quickly to raise Vespiquen ex's damage, support with Shuckle, and press tempo before the opponent sets up. Board development is your damage — draw consistently to keep the bench full.",
      keyCards: ["Vespiquen ex — bench-scaling damage", "Shuckle — support / longevity", "Professor's Research — development draw"],
    },
    ja: {
      playstyle: "虫 スウォーム・テンポ",
      summary: "ビークインexがベンチ展開に比例して火力を出す虫デッキ。Aティアの中でも勝率が高いテンポ型です。",
      gamePlan: "ベンチを素早く埋めてビークインexの打点を上げ、ツボツボで支えつつ相手が構える前にテンポで攻めます。展開がそのまま火力なので、ドローでベンチを安定して埋めるのが鍵です。",
      keyCards: ["ビークインex — ベンチ比例打点", "ツボツボ — 支援・継戦", "博士の研究 — 展開ドロー"],
    },
    "zh-TW": {
      playstyle: "蟲群·節奏",
      summary: "蜂女王ex依隨備位展開提升火力的蟲系牌組。是A級中勝率偏高的節奏型。",
      gamePlan: "快速填滿備位以拉高蜂女王ex的打點，用壺壺輔助，在對手站穩前以節奏施壓。展開即火力，靠抽牌穩定補滿備位是關鍵。",
      keyCards: ["蜂女王ex — 依備位提升打點", "壺壺 — 輔助·續航", "博士的研究 — 展開抽牌"],
    },
  },
  // ── Team Rocket's Weezing ex / Hoopa ex — 독·방해 (A) ──
  "team-rockets-weezing-ex-b4a-hoopa-ex-b4": {
    ko: {
      playstyle: "독·방해 (로켓단)",
      summary: "로켓단의 또도가스 ex의 독과 후파 ex를 축으로 상대를 방해하며 그라인드하는 로켓단 덱입니다.",
      gamePlan: "독으로 지속 데미지를 누적시키고, 방해 카드로 상대 전개를 늦추며 장기전으로 끌고 갑니다. 즉발 화력보다 시간이 지날수록 유리해지는 덱이므로, 초반 속공 덱을 어떻게 버티느냐가 승부처입니다.",
      keyCards: ["로켓단의 또도가스 ex — 독 축", "후파 ex — 핵심 어태커", "방해·독 트레이너 — 자원 압박"],
    },
    en: {
      playstyle: "Poison / Disruption (Team Rocket)",
      summary: "A Team Rocket deck that grinds the opponent down with Team Rocket's Weezing ex poison and Hoopa ex.",
      gamePlan: "Stack poison for recurring damage and slow the opponent's setup with disruption to drag the game long. It gets better over time rather than bursting — surviving early aggro is the crux.",
      keyCards: ["TR's Weezing ex — poison core", "Hoopa ex — key attacker", "Disruption / poison trainers — resource pressure"],
    },
    ja: {
      playstyle: "毒・妨害(ロケット団)",
      summary: "ロケット団のマタドガスexの毒とフーパexを軸に、相手を妨害しながらグラインドするロケット団デッキです。",
      gamePlan: "毒で継続ダメージを蓄積し、妨害で相手の展開を遅らせて長期戦に持ち込みます。瞬発火力より時間経過で有利になるデッキなので、序盤の速攻をどう凌ぐかが勝負所です。",
      keyCards: ["ロケット団のマタドガスex — 毒の軸", "フーパex — 主軸アタッカー", "妨害・毒トレーナー — 資源圧迫"],
    },
    "zh-TW": {
      playstyle: "毒·干擾(火箭隊)",
      summary: "以火箭隊的雙彈瓦斯ex的毒與胡帕ex為軸、邊干擾邊消耗對手的火箭隊牌組。",
      gamePlan: "以毒累積持續傷害，用干擾拖慢對手展開、把比賽帶入長局。屬於愈打愈有利而非爆發型，因此能否撐過前期快攻是勝負關鍵。",
      keyCards: ["火箭隊的雙彈瓦斯ex — 毒的核心", "胡帕ex — 主力攻擊手", "干擾·毒訓練家 — 資源壓迫"],
    },
  },
  // ── Mega Blaziken ex — 불꽃 어그로 (A) ──
  "mega-blaziken-ex-b1": {
    ko: {
      playstyle: "불꽃 어그로",
      summary: "메가 번치코 ex의 화력으로 빠르게 압박하는 불꽃 속공 덱. A티어 중 승률이 높은 편입니다.",
      gamePlan: "아차모–영치코 라인을 세워 메가 번치코 ex를 조기에 가동하고, 강한 화력으로 상대를 앞서 나갑니다. 세팅이 완성되면 압도적이므로, 에너지 가속과 드로우로 가동 속도를 최대한 앞당기는 것이 중요합니다.",
      keyCards: ["메가 번치코 ex — 주력 어태커", "아차모/영치코 — 진화 라인", "불꽃 에너지 · 가속 트레이너"],
    },
    en: {
      playstyle: "Fire Aggro",
      summary: "A fast Fire deck that pressures with Mega Blaziken ex's damage. Among the higher win rates in A-tier.",
      gamePlan: "Set up the Torchic–Combusken line to bring Mega Blaziken ex online early and race ahead on damage. Overwhelming once assembled — speed up your setup with energy acceleration and draw.",
      keyCards: ["Mega Blaziken ex — main attacker", "Torchic/Combusken — evolution line", "Fire Energy · acceleration trainers"],
    },
    ja: {
      playstyle: "炎 アグロ",
      summary: "メガバシャーモexの火力で素早く圧をかける炎の速攻デッキ。Aティアの中では勝率が高めです。",
      gamePlan: "アチャモ–ワカシャモのラインを立ててメガバシャーモexを早期起動し、高い火力で先行します。組み上がれば圧倒的なので、エネ加速とドローで起動を早めるのが重要です。",
      keyCards: ["メガバシャーモex — 主力アタッカー", "アチャモ/ワカシャモ — 進化ライン", "炎エネルギー・加速トレーナー"],
    },
    "zh-TW": {
      playstyle: "火焰快攻",
      summary: "以超級火焰雞ex火力快速施壓的火系快攻牌組。在A級中勝率偏高。",
      gamePlan: "鋪好火稚雞–力壯雞進化線，早期啟動超級火焰雞ex，以高火力搶先。組合完成後極為強勢，因此用能量加速與抽牌盡量提早啟動很重要。",
      keyCards: ["超級火焰雞ex — 主力攻擊手", "火稚雞/力壯雞 — 進化線", "火能量·加速訓練家"],
    },
  },
  // ── Mega Sceptile ex / Greninja — 풀·물 템포 (A) ──
  "mega-sceptile-ex-b3-greninja-a1": {
    ko: {
      playstyle: "풀·물 템포",
      summary: "메가 나무킹 ex의 화력에 개굴닌자의 벤치 견제를 더한 템포 덱. A티어 중 승률이 높은 편입니다.",
      gamePlan: "개굴닌자로 상대 벤치에 데미지를 흘려 미리 압박을 만들고, 메가 나무킹 ex로 앞선을 정리합니다. 벤치 견제로 상대의 진화·세팅을 방해하며 템포 우위를 유지하는 것이 핵심입니다.",
      keyCards: ["메가 나무킹 ex — 주력 화력", "개굴닌자 — 벤치 견제", "박사의 연구 — 전개"],
    },
    en: {
      playstyle: "Grass-Water Tempo",
      summary: "A tempo deck adding Greninja's bench pressure to Mega Sceptile ex's damage. Among the higher win rates in A-tier.",
      gamePlan: "Chip the opponent's bench with Greninja to set up pressure early, then clean the active with Mega Sceptile ex. Disrupt their evolutions and setup with bench damage while keeping the tempo lead.",
      keyCards: ["Mega Sceptile ex — main damage", "Greninja — bench pressure", "Professor's Research — development"],
    },
    ja: {
      playstyle: "草・水 テンポ",
      summary: "メガジュカインexの火力にゲッコウガのベンチ牽制を加えたテンポデッキ。Aティアの中では勝率が高めです。",
      gamePlan: "ゲッコウガで相手ベンチにダメージを与えて先に圧をつくり、メガジュカインexで前を処理します。ベンチ牽制で相手の進化・準備を妨げつつテンポ優位を保つのが要です。",
      keyCards: ["メガジュカインex — 主力火力", "ゲッコウガ — ベンチ牽制", "博士の研究 — 展開"],
    },
    "zh-TW": {
      playstyle: "草·水 節奏",
      summary: "在超級蜥蜴王ex火力上加入甲賀忍蛙備位牽制的節奏牌組。在A級中勝率偏高。",
      gamePlan: "用甲賀忍蛙對對手備位造成傷害、提前施壓，再以超級蜥蜴王ex處理前排。以備位牽制妨礙對手進化·佈置，維持節奏優勢是關鍵。",
      keyCards: ["超級蜥蜴王ex — 主力火力", "甲賀忍蛙 — 備位牽制", "博士的研究 — 展開"],
    },
  },
  // ── Hydreigon / Mega Absol ex — 악 미드레인지 (B) ──
  "hydreigon-mega-absol-ex-b1": {
    ko: {
      playstyle: "악 미드레인지",
      summary: "삼삼드래와 메가 앱솔 ex를 축으로 하는 악타입 미드레인지. 승률은 50% 안팎이라 매치업 이해가 승부를 가릅니다.",
      gamePlan: "상황에 맞는 어태커를 골라 교환에서 손해를 안 보며 중반을 지배합니다. 극단적 속공도 극단적 컨트롤도 아닌 균형형이라, 상대 덱을 읽고 유리한 교환을 선택하는 판단이 중요합니다.",
      keyCards: ["삼삼드래 — 안정적 어태커", "메가 앱솔 ex — 핵심 화력", "지목·드로우 트레이너"],
    },
    en: {
      playstyle: "Dark Midrange",
      summary: "A Dark midrange deck built around Hydreigon and Mega Absol ex. Around a 50% win rate — matchup knowledge decides games.",
      gamePlan: "Pick the right attacker for the situation and dominate the mid-game by winning trades. Neither pure aggro nor pure control — reading the opponent and choosing favorable trades is what matters.",
      keyCards: ["Hydreigon — reliable attacker", "Mega Absol ex — key damage", "Gust / draw trainers"],
    },
    ja: {
      playstyle: "悪 ミッドレンジ",
      summary: "サザンドラとメガアブソルexを軸にした悪タイプのミッドレンジ。勝率は50%前後で、相性理解が勝敗を分けます。",
      gamePlan: "状況に合ったアタッカーを選び、交換で損をせず中盤を支配します。極端な速攻でもコントロールでもないバランス型なので、相手を読んで有利な交換を選ぶ判断が重要です。",
      keyCards: ["サザンドラ — 安定アタッカー", "メガアブソルex — 主力火力", "指名・ドロートレーナー"],
    },
    "zh-TW": {
      playstyle: "惡系中速",
      summary: "以三首惡龍與超級阿勃梭魯ex為軸的惡系中速牌組。勝率約五五波，對戰理解決定勝負。",
      gamePlan: "依情況選對攻擊手，靠交換不吃虧來主宰中盤。既非純快攻也非純控制的平衡型，讀懂對手、選擇有利交換的判斷最重要。",
      keyCards: ["三首惡龍 — 穩定攻擊手", "超級阿勃梭魯ex — 主力火力", "指名·抽牌訓練家"],
    },
  },
  // ── Magnezone / Miraidon ex — 번개 (B, 오버퍼포머 승률↑) ──
  "magnezone-b1a-miraidon-ex-b3a": {
    ko: {
      playstyle: "번개 (오버퍼포머)",
      summary: "점유율은 낮지만 승률이 60%대로 눈에 띄는 번개 덱. 미라이돈 ex의 에너지 가속과 자포코일로 빠르게 화력을 폭발시킵니다.",
      gamePlan: "미라이돈 ex로 번개 에너지를 가속해 자포코일 등 주력을 남보다 빨리 가동합니다. 낮은 점유율 대비 높은 승률은 '아직 덜 알려진 강덱'이라는 신호 — 메타가 대비하기 전에 선점 가치가 큽니다.",
      keyCards: ["미라이돈 ex — 에너지 가속", "자포코일 — 주력 화력", "번개 에너지 · 드로우"],
    },
    en: {
      playstyle: "Lightning (Overperformer)",
      summary: "A Lightning deck that stands out with a ~60% win rate despite low share. Miraidon ex accelerates energy so Magnezone bursts damage fast.",
      gamePlan: "Use Miraidon ex to ramp Lightning energy and bring Magnezone online ahead of the field. A high win rate at low share signals an under-the-radar strong deck — real value in picking it up before the meta adapts.",
      keyCards: ["Miraidon ex — energy acceleration", "Magnezone — main damage", "Lightning Energy · draw"],
    },
    ja: {
      playstyle: "雷(オーバーパフォーマー)",
      summary: "使用率は低いが勝率60%台で目立つ雷デッキ。ミライドンexのエネ加速とジバコイルで一気に火力を爆発させます。",
      gamePlan: "ミライドンexで雷エネを加速し、ジバコイル等の主力を早期起動します。低使用率×高勝率は「まだ知られていない強デッキ」のサイン — 環境が対策する前に先取りする価値があります。",
      keyCards: ["ミライドンex — エネ加速", "ジバコイル — 主力火力", "雷エネルギー・ドロー"],
    },
    "zh-TW": {
      playstyle: "雷(超常發揮)",
      summary: "使用率低但勝率達六成的顯眼雷系牌組。以密勒頓ex的能量加速與自爆磁怪一口氣爆發火力。",
      gamePlan: "用密勒頓ex加速雷能量，讓自爆磁怪等主力比對手更早啟動。低使用率×高勝率是「尚未被熟知的強牌」訊號 — 在環境針對之前搶先使用很有價值。",
      keyCards: ["密勒頓ex — 能量加速", "自爆磁怪 — 主力火力", "雷能量·抽牌"],
    },
  },
};

export function getDeckAnalysis(id: string, lang: Locale): DeckAnalysis | null {
  const d = A[id];
  return d ? (d[lang] || d.en || null) : null;
}
export function analyzedDeckIds(): string[] {
  return Object.keys(A);
}
