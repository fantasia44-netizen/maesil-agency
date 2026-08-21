// 포켓몬 상세 페이지 문구(3개국어). {name}/{lg}/{tier}는 페이지에서 삽입.
export type PokeShareDict = {
  movesetH: string; statsH: string; atk: string; def: string; hp: string;
  tierLabel: string; pickPrefix: string; hitsUnit: string;
  cardWord: string; gameWord: string; shareSaveWord: string; building: string;
  shareBtn: string; saveBtn: string; closeBtn: string;
  winLabel: string; loseLabel: string;
};

export type PokeDict = {
  navTier: string; navCmp: string; navMeta: string;
  tierScore: string; pickRate: string;
  movesetH: string; fastLabel: string; fastTurns: string; chargedHint: string; hitsUnit: string; energyUnit: string;
  countersH: string; countersP: string; winsH: string; winsP: string; noData: string;
  statsH: string; atk: string; def: string; hp: string;
  rolesH: string; roles: string[]; rolesNote: string;
  explainer: string; explainerTierWord: string; recordLink: string; privacy: string;
  metaTitle: string; metaDesc: string; ogDescSuffix: string; ogTitleSuffix: string;
  share: PokeShareDict;
};

const ko: PokeDict = {
  navTier: "🏆 티어표", navCmp: "⚡ CMP 순위", navMeta: "📊 실측 메타",
  tierScore: "티어 · 점수", pickRate: "📊 유저 실측 픽률(최근 30일)",
  movesetH: "추천 기술배치 · 스킬 타수", fastLabel: "빠른 기술", fastTurns: "턴 · 에너지 +", chargedHint: "차지 기술 — 연속 발동 시 타수(에너지 이월 반영)", hitsUnit: "타", energyUnit: "에너지",
  countersH: "🛡️ 이 포켓몬이 불리한 포켓몬 (카운터)", countersP: "이 포켓몬을 상대로 유리한 포켓몬입니다. 자주 만난다면 아래를 준비하세요.",
  winsH: "⚔️ 이 포켓몬이 유리한 포켓몬", winsP: "이 포켓몬으로 유리하게 상대할 수 있는 포켓몬입니다.", noData: "데이터 없음",
  statsH: "종족값 (전투 스탯)", atk: "공격", def: "방어", hp: "체력",
  rolesH: "역할 점수", roles: ["선봉", "마무리", "교체", "차지", "공격", "일관성"],
  rolesNote: "선봉=초반 유리 · 마무리=후반 뒷심 · 교체=스왑 대응 · 차지=차지기술 압박 · 공격=딜링 · 일관성=상성 안정성 (0~100)",
  explainer: "추천 기술배치는 공개 전투 시뮬레이션(PvPoke) 기준이며, 카운터·잘 잡는 상대는 시뮬 매치업 결과를 바탕으로 정리했습니다. 실측 픽률은 GBL Note 사용자들이 실제로 만난 상대를 익명 집계한 값입니다.",
  explainerTierWord: "티어", recordLink: "내 전적 기록하기 →", privacy: "개인정보처리방침",
  metaTitle: "카운터·추천 기술배치 | GBL Note", metaDesc: "추천 기술배치, 카운터(약점 상대), 잘 잡는 상대, 종족값과 유저 실측 픽률. 대비법을 확인하세요.",
  ogDescSuffix: "카운터·추천 기술·실측 픽률", ogTitleSuffix: "카운터·기술배치",
  share: {
    movesetH: "추천 기술배치 · 스킬 타수", statsH: "종족값", atk: "공격", def: "방어", hp: "체력",
    tierLabel: "티어", pickPrefix: "📊 실측 픽률", hitsUnit: "타",
    cardWord: "정보카드", gameWord: "포켓몬GO", shareSaveWord: "공유·저장", building: "이미지 생성 중…",
    shareBtn: "📤 공유", saveBtn: "💾 저장", closeBtn: "닫기",
    winLabel: "이기는 상대", loseLabel: "지는 상대(카운터)",
  },
};

const en: PokeDict = {
  navTier: "🏆 Tier list", navCmp: "⚡ CMP ranking", navMeta: "📊 Encounter meta",
  tierScore: "Tier · Score", pickRate: "📊 Real pick rate (last 30 days)",
  movesetH: "Recommended Moveset · Fast-move Counts", fastLabel: "Fast move", fastTurns: " turns · energy +", chargedHint: "Charged moves — fast-move counts for consecutive uses (energy carryover included)", hitsUnit: "", energyUnit: "energy",
  countersH: "🛡️ Loses to (counters)", countersP: "Pokémon favored against this one. If you meet it often, prepare the below.",
  winsH: "⚔️ Beats", winsP: "Pokémon you can favorably beat with this one.", noData: "No data",
  statsH: "Base stats (battle)", atk: "Atk", def: "Def", hp: "HP",
  rolesH: "Role scores", roles: ["Lead", "Closer", "Switch", "Charger", "Attacker", "Consistency"],
  rolesNote: "Lead=early edge · Closer=late-game · Switch=swap response · Charger=charge pressure · Attacker=damage · Consistency=matchup stability (0–100)",
  explainer: "Recommended movesets are based on public battle simulation (PvPoke); counters and favorable matchups come from sim results. Pick rates are anonymous aggregates of opponents GBL Note users actually faced.",
  explainerTierWord: "-tier", recordLink: "Log my battles →", privacy: "Privacy Policy",
  metaTitle: "Counters & Recommended Moveset | GBL Note", metaDesc: "recommended moveset, counters (weak matchups), favorable targets, base stats, and real user pick rate. Check how to prepare.",
  ogDescSuffix: "counters · recommended moves · real pick rate", ogTitleSuffix: "Counters & Moveset",
  share: {
    movesetH: "Recommended Moveset · Counts", statsH: "Base stats", atk: "Atk", def: "Def", hp: "HP",
    tierLabel: "Tier", pickPrefix: "📊 Pick rate", hitsUnit: "",
    cardWord: "Info Card", gameWord: "Pokémon GO", shareSaveWord: "Share/Save", building: "Generating image…",
    shareBtn: "📤 Share", saveBtn: "💾 Save", closeBtn: "Close",
    winLabel: "Beats", loseLabel: "Loses to (counters)",
  },
};

const ja: PokeDict = {
  navTier: "🏆 ティア表", navCmp: "⚡ CMPランキング", navMeta: "📊 実測メタ",
  tierScore: "ティア · スコア", pickRate: "📊 実測ピック率(直近30日)",
  movesetH: "推奨技構成 · 発動回数", fastLabel: "ノーマルアタック", fastTurns: "ターン · エネルギー +", chargedHint: "ゲージ技 — 連続発動時の回数(エネルギー持ち越し反映)", hitsUnit: "回", energyUnit: "エネルギー",
  countersH: "🛡️ 不利な相手(カウンター)", countersP: "この相手に有利なポケモンです。よく遭遇するなら下記を準備。",
  winsH: "⚔️ 有利な相手", winsP: "このポケモンで有利に戦える相手です。", noData: "データなし",
  statsH: "種族値(バトル)", atk: "こうげき", def: "ぼうぎょ", hp: "HP",
  rolesH: "役割スコア", roles: ["先発", "締め", "交代", "ゲージ", "攻撃", "一貫性"],
  rolesNote: "先発=序盤有利 · 締め=終盤 · 交代=スワップ対応 · ゲージ=ゲージ圧 · 攻撃=火力 · 一貫性=相性安定 (0〜100)",
  explainer: "推奨技構成は公開バトルシミュ(PvPoke)基準、カウンター・有利対面はシミュ結果を元に整理。ピック率はGBL Note利用者が実際に遭遇した相手の匿名集計です。",
  explainerTierWord: "ティア", recordLink: "自分の戦績を記録 →", privacy: "プライバシーポリシー",
  metaTitle: "カウンター・推奨技構成 | GBL Note", metaDesc: "推奨技構成、カウンター(弱点相手)、有利な相手、種族値と実測ピック率。対策を確認。",
  ogDescSuffix: "カウンター・推奨技・実測ピック率", ogTitleSuffix: "カウンター・技構成",
  share: {
    movesetH: "推奨技構成 · 発動回数", statsH: "種族値", atk: "こうげき", def: "ぼうぎょ", hp: "HP",
    tierLabel: "ティア", pickPrefix: "📊 実測ピック率", hitsUnit: "回",
    cardWord: "情報カード", gameWord: "ポケモンGO", shareSaveWord: "共有・保存", building: "画像を生成中…",
    shareBtn: "📤 共有", saveBtn: "💾 保存", closeBtn: "閉じる",
    winLabel: "有利な相手", loseLabel: "不利な相手(カウンター)",
  },
};

const P = { ko, en, ja } as const;
export function getPoke(lang: string): PokeDict {
  return (P as Record<string, PokeDict>)[lang] || ko;
}
