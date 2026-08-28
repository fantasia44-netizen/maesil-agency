// CMP 우선권 순위 페이지 문구(3개국어). {lg}=리그명은 페이지에서 삽입.
export type CmpDict = {
  navTier: string; navMeta: string; navRaid: string;
  h1Suffix: string; intro1: string; intro2: string;
  tierLabel: string; emptyData: string;
  shareTitleSuffix: string; shareSubtitle: string; shareButton: string; shareFooter: string;
  explainerH: string; explainerBody: string; recordLink: string;
  guide: string;
  metaTitle: string; metaDesc: string; ogTitle: string; ogDesc: string;
};

const ko: CmpDict = {
  navTier: "🏆 티어표", navMeta: "📊 실측 메타", navRaid: "🔥 레이드 딜러",
  h1Suffix: "공격력(CMP) 우선권 순위",
  intro1: "두 포켓몬이 같은 턴에 차지 기술을 쏘면, 공격 종족값이 높은 쪽이 먼저 발동합니다(CMP 우선권). 아래는 주요 포켓몬을 공격력 순으로 정렬한 우선권 순위표입니다. 위에 있을수록 CMP 싸움에서 유리합니다.",
  intro2: "숫자 = 유효 공격력(소수점 1자리까지가 실제 CMP 판정 기준 — 0.1만 높아도 먼저 발동). 같은 값은 실제로도 동점(랜덤). 각 포켓몬을 누르면 상세로 이동.",
  tierLabel: "티어", emptyData: "데이터 준비 중입니다.",
  shareTitleSuffix: "CMP 우선권 TOP", shareSubtitle: "유효 공격력 순 = 같은 턴 차지 우선권", shareButton: "📸 이 CMP 순위 이미지로 공유·저장", shareFooter: "포켓몬GO CMP 우선권",
  explainerH: "CMP 우선권이란?",
  explainerBody: "CMP(Charge Move Priority)는 두 포켓몬이 같은 턴에 차지 기술을 발동할 때, 공격 종족값이 높은 쪽이 먼저 터지는 규칙입니다. 먼저 발동하면 상대를 쓰러뜨리거나 실드를 강요할 수 있어, 공격력이 비슷한 대결에서 승패를 가릅니다. 공격 종족값은 시즌 밸런스에 따라 바뀔 수 있습니다.",
  recordLink: "내 전적 기록하기 →", guide: "가이드",
  metaTitle: "공격력(CMP) 우선권 순위 | GBL Note",
  metaDesc: "공격 종족값 순위표. 같은 턴에 차지 기술을 쏠 때 누가 먼저 발동하는지(CMP 우선권)를 공격력 순으로 정리했습니다.",
  ogTitle: "CMP 우선권 순위",
  ogDesc: "공격력 순위 = 차지 우선권 순서",
};

const en: CmpDict = {
  navTier: "🏆 Tier list", navMeta: "📊 Encounter meta", navRaid: "🔥 Raid attackers",
  h1Suffix: "Attack (CMP) Priority Ranking",
  intro1: "When two Pokémon fire a charged move on the same turn, the one with higher Attack goes first (CMP priority). Below are the main Pokémon ranked by Attack — the higher up, the better in a CMP tie.",
  intro2: "The number = effective Attack (the first decimal is the actual CMP tiebreaker — even 0.1 higher fires first). Equal values are true ties (random). Tap a Pokémon for details.",
  tierLabel: "Tier", emptyData: "Data coming soon.",
  shareTitleSuffix: "CMP Priority TOP", shareSubtitle: "By effective Attack = same-turn charge priority", shareButton: "📸 Save/Share this CMP ranking", shareFooter: "Pokémon GO CMP priority",
  explainerH: "What is CMP priority?",
  explainerBody: "CMP (Charge Move Priority) is the rule that, when two Pokémon fire a charged move on the same turn, the one with higher Attack fires first. Firing first can knock out the opponent or force a shield, deciding close matchups. Attack stats can change with seasonal balancing.",
  recordLink: "Log my battles →", guide: "Guides",
  metaTitle: "Attack (CMP) Priority Ranking | GBL Note",
  metaDesc: "Attack stat ranking. Who fires first when charged moves collide on the same turn (CMP priority), ordered by Attack.",
  ogTitle: "CMP Priority Ranking",
  ogDesc: "Attack ranking = charge priority order",
};

const ja: CmpDict = {
  navTier: "🏆 ティア表", navMeta: "📊 実測メタ", navRaid: "🔥 レイドアタッカー",
  h1Suffix: "こうげき(CMP)優先度ランキング",
  intro1: "2体が同じターンにゲージ技を撃つと、こうげき種族値が高い方が先に発動します(CMP優先度)。以下は主要ポケモンをこうげき順に並べた優先度ランキングです。上位ほどCMP勝負で有利。",
  intro2: "数字 = 有効こうげき(小数第1位までが実際のCMP判定基準 — 0.1高いだけで先に発動)。同値は実際も同点(ランダム)。ポケモンをタップで詳細へ。",
  tierLabel: "ティア", emptyData: "データ準備中です。",
  shareTitleSuffix: "CMP優先度TOP", shareSubtitle: "有効こうげき順 = 同ターン ゲージ優先度", shareButton: "📸 このCMPランキングを画像で共有・保存", shareFooter: "ポケモンGO CMP優先度",
  explainerH: "CMP優先度とは？",
  explainerBody: "CMP(Charge Move Priority)は、2体が同じターンにゲージ技を発動する際、こうげき種族値が高い方が先に発動する仕様です。先に発動すれば相手を倒すかシールドを強要でき、こうげきが近い対面の勝敗を分けます。こうげき種族値はシーズン調整で変わることがあります。",
  recordLink: "自分の戦績を記録 →", guide: "ガイド",
  metaTitle: "こうげき(CMP)優先度ランキング | GBL Note",
  metaDesc: "こうげき種族値ランキング。同ターンにゲージ技を撃つ際どちらが先に発動するか(CMP優先度)をこうげき順に整理。",
  ogTitle: "CMP優先度ランキング",
  ogDesc: "こうげきランキング = ゲージ優先度順",
};

const zhTW: CmpDict = {
  navTier: "🏆 強度表", navMeta: "📊 實測環境", navRaid: "🔥 團體戰攻擊手",
  h1Suffix: "攻擊力(CMP) 先攻權排名",
  intro1: "兩隻寶可夢同回合放特殊招式時，攻擊種族值高的一方先發動（CMP 先攻權）。下方是將主要寶可夢依攻擊力排序的先攻權排名表。越上面在 CMP 對決越有利。",
  intro2: "數字 = 有效攻擊力（到小數點後 1 位為實際 CMP 判定基準 — 只高 0.1 也先發動）。相同值實際上也同分（隨機）。點各寶可夢前往詳細。",
  tierLabel: "強度", emptyData: "資料準備中。",
  shareTitleSuffix: "CMP 先攻權 TOP", shareSubtitle: "有效攻擊力順 = 同回合特殊招式先攻權", shareButton: "📸 將此 CMP 排名以圖片分享·儲存", shareFooter: "寶可夢GO CMP 先攻權",
  explainerH: "CMP 先攻權是什麼？",
  explainerBody: "CMP(Charge Move Priority) 是兩隻寶可夢同回合發動特殊招式時，攻擊種族值高的一方先觸發的規則。先發動可擊倒對手或逼出護盾，在攻擊力相近的對決中決定勝負。攻擊種族值可能隨賽季平衡調整而改變。",
  recordLink: "記錄我的戰績 →", guide: "攻略",
  metaTitle: "攻擊力(CMP) 先攻權排名 | GBL Note",
  metaDesc: "攻擊種族值排名表。同回合放特殊招式時誰先發動（CMP 先攻權），依攻擊力排序整理。",
  ogTitle: "CMP 先攻權排名",
  ogDesc: "攻擊力排名 = 特殊招式先攻順序",
};

const C = { ko, en, ja, "zh-TW": zhTW } as const;
export function getCmp(lang: string): CmpDict {
  return (C as Record<string, CmpDict>)[lang] || ko;
}
