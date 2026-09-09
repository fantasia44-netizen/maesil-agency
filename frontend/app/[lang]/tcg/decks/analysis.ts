// 대표 덱 원본 전략 분석 — 아키타입 수준의 검증 가능한 전략(운영/사고). 세부 수치 주장은 지양,
// 매치업은 실데이터(matchups.json)가 뒷받침. 여기 등록된 덱만 상세 페이지 생성(얕은 페이지 방지).
// 사장님 검수·보강 대상. 새 덱 추가 = 여기 항목 추가 → 자동으로 페이지 생성.
import { type Locale } from "../../../../lib/i18n";

export type DeckAnalysis = { playstyle: string; summary: string; gamePlan: string; keyCards: string[] };

const A: Record<string, Partial<Record<Locale, DeckAnalysis>>> = {
  // ── Mega Lucario ex / Lucario — 격투 어그로 (S, 메타 정점) ──
  "mega-lucario-ex-b3-lucario-a2": {
    ko: {
      playstyle: "격투 어그로",
      summary: "현재 메타 점유율 1위의 격투 속공 덱. 초반부터 압박을 걸어 상대가 자리를 잡기 전에 포인트를 몰아치는 것이 핵심입니다.",
      gamePlan: "리오르–루카리오 라인을 빠르게 세우고 메가 루카리오 ex로 2~3턴 안에 공격을 시작합니다. 상대 벤치를 지목·강제교체(사브리나·사이러스 등)로 원하는 대상을 앞으로 끌어내 급소를 노리고, 컨트롤 덱이 안정되기 전에 게임을 끝내는 레이스형 운영이 정석입니다.",
      keyCards: ["메가 루카리오 ex — 주력 어태커", "리오르/루카리오 — 진화 세팅", "박사의 연구 — 드로우 엔진", "사브리나·X 스피드 — 지목·기동"],
    },
    en: {
      playstyle: "Fighting Aggro",
      summary: "The #1 meta-share deck: a fast Fighting aggro build that wins by applying pressure before the opponent stabilizes.",
      gamePlan: "Set up the Riolu–Lucario line quickly and start attacking with Mega Lucario ex by turn 2–3. Use gust/switch effects to drag the target you want into the active spot, and race prize points before control decks find their footing.",
      keyCards: ["Mega Lucario ex — main attacker", "Riolu/Lucario — evolution setup", "Professor's Research — draw engine", "Sabrina · X Speed — gust & mobility"],
    },
    ja: {
      playstyle: "闘 アグロ",
      summary: "現環境の使用率トップ。闘タイプの速攻デッキで、相手が構える前に圧をかけてポイントを取り切るのが要です。",
      gamePlan: "リオル–ルカリオのラインを素早く並べ、2〜3ターンでメガルカリオexの攻撃を開始。ベンチ指名・強制入れ替え(サブリナ等)で狙った相手を引きずり出し、コントロールが安定する前に決めるレース型が基本です。",
      keyCards: ["メガルカリオex — 主力アタッカー", "リオル/ルカリオ — 進化セット", "博士の研究 — ドローエンジン", "サブリナ・Xスピード — 指名・機動"],
    },
    "zh-TW": {
      playstyle: "格鬥快攻",
      summary: "目前使用率第一的格鬥快攻牌組。核心是從前期就施壓，在對手站穩之前搶下分數。",
      gamePlan: "快速鋪好利歐路–路卡利歐進化線，第2~3回合就用超級路卡利歐ex開始進攻。用指名·強制交換(莎娜等)把想打的目標拉到前排，趕在控制牌組穩住之前結束比賽。",
      keyCards: ["超級路卡利歐ex — 主力攻擊手", "利歐路/路卡利歐 — 進化鋪陳", "博士的研究 — 抽牌引擎", "莎娜·X速度 — 指名·機動"],
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
};

export function getDeckAnalysis(id: string, lang: Locale): DeckAnalysis | null {
  const d = A[id];
  return d ? (d[lang] || d.en || null) : null;
}
export function analyzedDeckIds(): string[] {
  return Object.keys(A);
}
