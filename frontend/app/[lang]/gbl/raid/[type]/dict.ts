// 레이드 딜러(속성별 어택커) 페이지 문구(3개국어). {t}=속성명은 페이지에서 삽입.
export type RaidTypeDict = {
  navBack: string; navPvp: string;
  h1TypeWord: string; h1Rest: string;
  intro1: string; intro2: string;
  dateLabel: string; legacyNote: string; upcomingNote: string;
  disclaimer: string;
  overallLabel: string; dpsLabel: string; tdoLabel: string;
  emptyData: string;
  shareTitleSuffix: string; shareSubtitle: string; shareButton: string; shareFooter: string;
  explainerH: string; explainerBody: string; otherTypes: string;
  badgePrimal: string; badgeMega: string; badgeShadow: string; badgeUpcoming: string;
  badgeCoverage: string; badgeCoverageTip: string;
  metaTitle: string; metaDesc: string; ogTitle: string; ogDesc: string;
};

const ko: RaidTypeDict = {
  navBack: "← 레이드 딜러 티어", navPvp: "⚔️ PvP 배틀 →",
  h1TypeWord: "타입", h1Rest: " 레이드 딜러 티어표",
  intro1: "{t}타입 레이드(레전드·5성 등)에 넣을 공격수 DPS 순위입니다. 메가진화·섀도우 포함, 각 포켓몬의 추천 기술배치와 내구(생존)까지 함께 확인하세요.",
  intro2: "종합점수(큰 숫자)로 순위 = 딜(DPS)과 총딜(TDO·버티며 넣는 총 데미지)을 결합한 균형 지표. {t} 약점 대상·레벨40·STAB·약점 1.6배 반영(빠른기술도 속성 일치 시 우대).",
  dateLabel: "데이터 기준일", legacyNote: "레거시* = 전용·이벤트 한정 기술", upcomingNote: "출시예정 = 아직 미출시",
  disclaimer: "※ 수치·순위는 공개 게임데이터 기반 자체 계산으로, 계산 방식(대상 보스·레벨·회피 등)에 따라 포켓배틀러 등 다른 사이트와 다를 수 있으며 오차가 있을 수 있습니다. 참고용으로 봐주세요.",
  overallLabel: "종합점수", dpsLabel: "딜", tdoLabel: "총딜",
  emptyData: "데이터 준비 중입니다.",
  shareTitleSuffix: "레이드 딜러 TOP", shareSubtitle: "종합점수(딜+총딜) 순위 · 메가·섀도우 포함", shareButton: "📸 이 티어표 이미지로 공유·저장", shareFooter: "포켓몬GO 레이드 딜러 티어",
  explainerH: "종합점수는 어떻게 계산했나요?",
  explainerBody: "공개 게임 데이터(종족값·기술 위력/시전시간/에너지)로 표준 PvE 공식을 적용했습니다. 이 속성에 약점인 대상을 레벨40으로 때릴 때 기준입니다. 딜(DPS)은 STAB·약점 1.6배 반영 초당 데미지, 총딜(TDO)은 버티는 시간(체력·방어)까지 반영한 기절 전 총 데미지, 종합점수는 이 둘을 결합한 균형 지표(딜³×총딜)로 순위를 매깁니다(포켓배틀러 Overall 방식). 계산 방식에 따라 다른 사이트와 수치가 다를 수 있으니 참고용으로 봐주세요.",
  otherTypes: "다른 속성 티어표 →",
  badgePrimal: "원시", badgeMega: "메가", badgeShadow: "섀도우", badgeUpcoming: "출시예정",
  badgeCoverage: "비자속", badgeCoverageTip: "자속(STAB)이 아닌 이 속성 커버기술로 딜하는 딜러입니다. 공격 종족값·내구가 높아 종합점수(ER) 상위권에 듭니다.",
  metaTitle: "포켓몬 티어 · 레이드 최강 딜러 DPS 순위표 | GBL Note",
  metaDesc: "레이드 최강 딜러 TOP 30 — 실측 DPS·내구(TDO) 종합 순위. 메가·원시·섀도우 포함, 딜러별 추천 기술배치까지 한눈에. 매주 자동 갱신.",
  ogTitle: "레이드 최강 딜러 티어표 — 실측 DPS 순위",
  ogDesc: "레이드 딜러 TOP 30 DPS·내구 순위 + 추천 기술",
};

const en: RaidTypeDict = {
  navBack: "← Raid attacker tiers", navPvp: "⚔️ PvP battle →",
  h1TypeWord: "-type", h1Rest: " Raid Attacker Tiers",
  intro1: "The best {t}-type attackers (DPS ranking) for raids — legendary, 5-star, and more. Includes Megas and Shadows, with each Pokémon's recommended moveset and bulk (survivability).",
  intro2: "Ranked by Overall score (big number) = a balanced metric combining DPS and TDO (total damage while surviving). Based on hitting targets weak to {t} at level 40, with STAB and 1.6× weakness (fast moves are also favored when type-matched).",
  dateLabel: "Data as of", legacyNote: "Legacy* = exclusive/event-only move", upcomingNote: "Upcoming = not yet released",
  disclaimer: "※ Values and rankings are our own calculations from public game data; depending on the method (target boss, level, dodging, etc.) they may differ from other sites and contain errors. For reference only.",
  overallLabel: "Overall", dpsLabel: "DPS", tdoLabel: "TDO",
  emptyData: "Data coming soon.",
  shareTitleSuffix: "Raid Attacker TOP", shareSubtitle: "Overall (DPS+TDO) ranking · Megas & Shadows", shareButton: "📸 Save/Share this tier list", shareFooter: "Pokémon GO raid attacker tiers",
  explainerH: "How is the Overall score calculated?",
  explainerBody: "We apply the standard PvE formula to public game data (base stats, move power/duration/energy), assuming you hit a target weak to this type at level 40. DPS is per-second damage with STAB and 1.6× weakness; TDO is total damage before fainting, factoring in bulk (HP/Defense); Overall combines the two into a balanced metric (DPS³×TDO) for ranking (PokeBattler's Overall method). Numbers may differ from other sites depending on the method — use for reference.",
  otherTypes: "Other type tiers →",
  badgePrimal: "Primal", badgeMega: "Mega", badgeShadow: "Shadow", badgeUpcoming: "Upcoming",
  badgeCoverage: "No STAB", badgeCoverageTip: "No same-type (STAB) bonus — hits with a coverage move of this type only. Its high stats keep the Overall score high, but real performance depends on the specific boss matchup.",
  metaTitle: "Pokémon Tier · Raid Attacker DPS Ranking | GBL Note",
  metaDesc: "Raid attacker DPS & bulk ranking. Includes Megas & Shadows with recommended movesets. Optimal raid farming lineups.",
  ogTitle: "Raid Attacker Tiers — DPS ranking",
  ogDesc: "Raid attacker DPS & bulk ranking + recommended moves",
};

const ja: RaidTypeDict = {
  navBack: "← レイドアタッカーティア", navPvp: "⚔️ PvPバトル →",
  h1TypeWord: "タイプ", h1Rest: " レイドアタッカーティア",
  intro1: "レイド(伝説・5★等)向けの{t}タイプ アタッカーDPSランキングです。メガ・シャドウ含む、各ポケモンの推奨技構成と耐久まで確認できます。",
  intro2: "総合スコア(大きな数字)で順位 = 火力(DPS)と総火力(TDO・耐えながら与える総ダメージ)を組み合わせた均衡指標。{t}弱点の相手をレベル40で攻撃する基準、STAB・弱点1.6倍反映(ノーマルアタックもタイプ一致で優遇)。",
  dateLabel: "データ基準日", legacyNote: "レガシー* = 専用・イベント限定技", upcomingNote: "実装予定 = 未実装",
  disclaimer: "※ 数値・順位は公開ゲームデータに基づく独自計算で、計算方式(対象ボス・レベル・回避等)により他サイトと異なる場合や誤差があります。参考用としてご覧ください。",
  overallLabel: "総合スコア", dpsLabel: "火力", tdoLabel: "総火力",
  emptyData: "データ準備中です。",
  shareTitleSuffix: "レイドアタッカーTOP", shareSubtitle: "総合スコア(火力+総火力)順 · メガ・シャドウ含む", shareButton: "📸 このティア表を画像で共有・保存", shareFooter: "ポケモンGO レイドアタッカーティア",
  explainerH: "総合スコアはどう算出？",
  explainerBody: "公開ゲームデータ(種族値・技威力/発生/エネルギー)に標準PvE公式を適用。この属性が弱点の相手をレベル40で攻撃する基準です。火力(DPS)はSTAB・弱点1.6倍反映の秒間ダメージ、総火力(TDO)は耐久(HP・防御)まで反映した気絶前の総ダメージ、総合スコアは両者を組み合わせた均衡指標(火力³×総火力)で順位付け(PokeBattler Overall方式)。計算方式により他サイトと数値が異なる場合があるため参考用に。",
  otherTypes: "他の属性ティア →",
  badgePrimal: "ゲンシ", badgeMega: "メガ", badgeShadow: "シャドウ", badgeUpcoming: "実装予定",
  badgeCoverage: "不一致", badgeCoverageTip: "タイプ一致(STAB)ボーナスなし — この属性はサブ技のみで攻撃。高種族値で総合スコアは上位ですが、実戦性能は対象ボスとの相性次第です。",
  metaTitle: "ポケモン ティア · レイド最強アタッカー DPS順位 | GBL Note",
  metaDesc: "レイドアタッカーのDPS・耐久順位を掲載。メガ・シャドウ含む推奨技構成まで。弱点を突く最強アタッカーを一覧で確認でき、レイド周回の最適編成に役立ちます。",
  ogTitle: "レイドアタッカーティア — DPS順位",
  ogDesc: "レイドアタッカーDPS・耐久順位 + 推奨技",
};

const zhTW: RaidTypeDict = {
  navBack: "← 團體戰攻擊手強度", navPvp: "⚔️ PvP 對戰 →",
  h1TypeWord: "屬性", h1Rest: " 團體戰攻擊手強度表",
  intro1: "{t}屬性團體戰（傳說·五星等）的攻擊手 DPS 排名。含超級進化·暗影，一併確認各寶可夢的推薦招式配置與耐久（生存）。",
  intro2: "以綜合評分（大數字）排名 = 結合輸出(DPS)與總輸出(TDO·撐著打的總傷害)的平衡指標。以 {t} 弱點對象·等級40·屬性一致1.2倍·弱點1.6倍計算（一般招式屬性一致時也加成）。",
  dateLabel: "資料基準日", legacyNote: "傳承* = 專屬·活動限定招式", upcomingNote: "即將推出 = 尚未推出",
  disclaimer: "※ 數值·排名為基於公開遊戲資料的自行計算，依計算方式（對象頭目·等級·閃避等）可能與 PokéBattler 等其他網站不同，並可能有誤差。僅供參考。",
  overallLabel: "綜合評分", dpsLabel: "輸出", tdoLabel: "總輸出",
  emptyData: "資料準備中。",
  shareTitleSuffix: "團體戰攻擊手 TOP", shareSubtitle: "綜合評分（輸出+總輸出）排名 · 含超級·暗影", shareButton: "📸 將此強度表以圖片分享·儲存", shareFooter: "寶可夢GO 團體戰攻擊手強度",
  explainerH: "綜合評分怎麼計算的？",
  explainerBody: "以公開遊戲資料（種族值·招式威力/施放時間/能量）套用標準 PvE 公式。以等級40攻擊此屬性弱點對象為基準。輸出(DPS)為含屬性一致·弱點1.6倍的每秒傷害，總輸出(TDO)為含撐場時間（HP·防禦）的擊倒前總傷害，綜合評分結合兩者（輸出³×總輸出）排名（PokéBattler Overall 方式）。依計算方式可能與其他網站數值不同，僅供參考。",
  otherTypes: "其他屬性強度表 →",
  badgePrimal: "原始", badgeMega: "超級", badgeShadow: "暗影", badgeUpcoming: "即將推出",
  badgeCoverage: "非本屬", badgeCoverageTip: "以非屬性一致(STAB)的此屬性招式輸出的攻擊手。攻擊種族值·耐久高，因此進入綜合評分(ER)前段。",
  metaTitle: "寶可夢強度表 · 團體戰攻擊手 DPS 排名 | GBL Note",
  metaDesc: "團體戰攻擊手 DPS·耐久排名。含超級·暗影的推薦招式配置。刷團體戰最佳組合。",
  ogTitle: "團體戰攻擊手強度表 — DPS 排名",
  ogDesc: "團體戰攻擊手 DPS·耐久排名 + 推薦招式",
};

const R = { ko, en, ja, "zh-TW": zhTW } as const;
export function getRaidType(lang: string): RaidTypeDict {
  return (R as Record<string, RaidTypeDict>)[lang] || ko;
}
