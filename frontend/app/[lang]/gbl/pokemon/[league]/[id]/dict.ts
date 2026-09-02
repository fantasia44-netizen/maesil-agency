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
  movesetH: string; fastLabel: string; fastTurns: string; chargedHint: string; hitsUnit: string; energyUnit: string; recTag: string; altFastHint: string;
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
  movesetH: "추천 기술배치 · 스킬 타수", fastLabel: "빠른 기술", fastTurns: "턴 · 에너지 +", chargedHint: "차지 기술 — 연속 발동 시 타수(에너지 이월 반영)", hitsUnit: "타", energyUnit: "에너지", recTag: "추천", altFastHint: "↑ 빠른 기술을 눌러 바꾸면 타수가 다시 계산됩니다",
  countersH: "🛡️ 이 포켓몬이 불리한 포켓몬 (카운터)", countersP: "이 포켓몬을 상대로 유리한 포켓몬입니다. 자주 만난다면 아래를 준비하세요.",
  winsH: "⚔️ 이 포켓몬이 유리한 포켓몬", winsP: "이 포켓몬으로 유리하게 상대할 수 있는 포켓몬입니다.", noData: "데이터 없음",
  statsH: "종족값 (전투 스탯)", atk: "공격", def: "방어", hp: "체력",
  rolesH: "역할 점수", roles: ["선봉", "마무리", "교체", "차지", "공격", "일관성"],
  rolesNote: "선봉=초반 유리 · 마무리=후반 뒷심 · 교체=스왑 대응 · 차지=차지기술 압박 · 공격=딜링 · 일관성=상성 안정성 (0~100)",
  explainer: "추천 기술배치는 공개 전투 시뮬레이션(PvPoke) 기준이며, 카운터·잘 잡는 상대는 시뮬 매치업 결과를 바탕으로 정리했습니다. 실측 픽률은 GBL Note 사용자들이 실제로 만난 상대를 익명 집계한 값입니다.",
  explainerTierWord: "티어", recordLink: "내 전적 기록하기 →", privacy: "개인정보처리방침",
  metaTitle: "분석 · 티어·추천기술·카운터 | GBL Note", metaDesc: "티어와 추천 기술배치, 약점 카운터·주요 승패 매치업, 그리고 유저 실측 픽률(최근 30일)까지. 이론 시뮬 + 실전 데이터로 지금 이 리그에서 어떻게 쓰이는지 확인하세요.",
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
  movesetH: "Recommended Moveset · Fast-move Counts", fastLabel: "Fast move", fastTurns: " turns · energy +", chargedHint: "Charged moves — fast-move counts for consecutive uses (energy carryover included)", hitsUnit: "", energyUnit: "energy", recTag: "Rec", altFastHint: "↑ Tap a fast move to switch — counts recompute",
  countersH: "🛡️ Loses to (counters)", countersP: "Pokémon favored against this one. If you meet it often, prepare the below.",
  winsH: "⚔️ Beats", winsP: "Pokémon you can favorably beat with this one.", noData: "No data",
  statsH: "Base stats (battle)", atk: "Atk", def: "Def", hp: "HP",
  rolesH: "Role scores", roles: ["Lead", "Closer", "Switch", "Charger", "Attacker", "Consistency"],
  rolesNote: "Lead=early edge · Closer=late-game · Switch=swap response · Charger=charge pressure · Attacker=damage · Consistency=matchup stability (0–100)",
  explainer: "Recommended movesets are based on public battle simulation (PvPoke); counters and favorable matchups come from sim results. Pick rates are anonymous aggregates of opponents GBL Note users actually faced.",
  explainerTierWord: "-tier", recordLink: "Log my battles →", privacy: "Privacy Policy",
  metaTitle: "PvP Guide · Moves, Counters & Tier | GBL Note", metaDesc: "Tier and recommended moveset, weak-spot counters, key win/loss matchups, and real user pick rate (last 30 days). See how it's actually used in this league — sim theory + real battle data.",
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
  movesetH: "推奨技構成 · 発動回数", fastLabel: "ノーマルアタック", fastTurns: "ターン · エネルギー +", chargedHint: "ゲージ技 — 連続発動時の回数(エネルギー持ち越し反映)", hitsUnit: "回", energyUnit: "エネルギー", recTag: "推奨", altFastHint: "↑ ノーマルアタックをタップで切替 — 回数を再計算",
  countersH: "🛡️ 不利な相手(カウンター)", countersP: "この相手に有利なポケモンです。よく遭遇するなら下記を準備。",
  winsH: "⚔️ 有利な相手", winsP: "このポケモンで有利に戦える相手です。", noData: "データなし",
  statsH: "種族値(バトル)", atk: "こうげき", def: "ぼうぎょ", hp: "HP",
  rolesH: "役割スコア", roles: ["先発", "締め", "交代", "ゲージ", "攻撃", "一貫性"],
  rolesNote: "先発=序盤有利 · 締め=終盤 · 交代=スワップ対応 · ゲージ=ゲージ圧 · 攻撃=火力 · 一貫性=相性安定 (0〜100)",
  explainer: "推奨技構成は公開バトルシミュ(PvPoke)基準、カウンター・有利対面はシミュ結果を元に整理。ピック率はGBL Note利用者が実際に遭遇した相手の匿名集計です。",
  explainerTierWord: "ティア", recordLink: "自分の戦績を記録 →", privacy: "プライバシーポリシー",
  metaTitle: "評価 · 技構成・カウンター・ティア | GBL Note", metaDesc: "ティアと推奨技構成、弱点カウンター、主要な有利・不利対面、そして実測ピック率(直近30日)まで。理論シミュ+実戦データで、このリーグでの実際の使われ方を確認。",
  ogDescSuffix: "カウンター・推奨技・実測ピック率", ogTitleSuffix: "カウンター・技構成",
  share: {
    movesetH: "推奨技構成 · 発動回数", statsH: "種族値", atk: "こうげき", def: "ぼうぎょ", hp: "HP",
    tierLabel: "ティア", pickPrefix: "📊 実測ピック率", hitsUnit: "回",
    cardWord: "情報カード", gameWord: "ポケモンGO", shareSaveWord: "共有・保存", building: "画像を生成中…",
    shareBtn: "📤 共有", saveBtn: "💾 保存", closeBtn: "閉じる",
    winLabel: "有利な相手", loseLabel: "不利な相手(カウンター)",
  },
};

const zhTW: PokeDict = {
  navTier: "🏆 強度表", navCmp: "⚡ CMP 排名", navMeta: "📊 實測環境",
  tierScore: "強度 · 評分", pickRate: "📊 玩家實測使用率（近 30 天）",
  movesetH: "推薦招式配置 · 招式次數", fastLabel: "一般招式", fastTurns: "回合 · 能量 +", chargedHint: "特殊招式 — 連續發動時的次數（含能量結轉）", hitsUnit: "次", energyUnit: "能量", recTag: "推薦", altFastHint: "↑ 點擊一般招式切換 — 次數重新計算",
  countersH: "🛡️ 剋制這隻寶可夢的寶可夢（剋星）", countersP: "對這隻寶可夢佔優勢的寶可夢。若常遇到，請準備下方這些。",
  winsH: "⚔️ 這隻寶可夢佔優勢的對手", winsP: "用這隻寶可夢可佔優勢對付的寶可夢。", noData: "無資料",
  statsH: "種族值（對戰數值）", atk: "攻擊", def: "防禦", hp: "HP",
  rolesH: "角色評分", roles: ["先鋒", "收尾", "換場", "放招", "攻擊", "穩定性"],
  rolesNote: "先鋒=前期優勢 · 收尾=後期續航 · 換場=換場應對 · 放招=特殊招式壓迫 · 攻擊=輸出 · 穩定性=相性穩定（0~100）",
  explainer: "推薦招式配置以公開對戰模擬(PvPoke)為準，剋星·佔優對手依模擬對面結果整理。實測使用率是 GBL Note 使用者實際遇到對手的匿名統計。",
  explainerTierWord: "強度", recordLink: "記錄我的戰績 →", privacy: "隱私權政策",
  metaTitle: "分析 · 招式配置·剋星·強度 | GBL Note", metaDesc: "強度與推薦招式配置、弱點剋星、主要勝負對面，以及玩家實測使用率（近30天）。用模擬理論＋實戰數據，確認這隻在此聯盟的實際用法。",
  ogDescSuffix: "剋星·推薦招式·實測使用率", ogTitleSuffix: "剋星·招式配置",
  share: {
    movesetH: "推薦招式配置 · 招式次數", statsH: "種族值", atk: "攻擊", def: "防禦", hp: "HP",
    tierLabel: "強度", pickPrefix: "📊 實測使用率", hitsUnit: "次",
    cardWord: "資訊卡", gameWord: "寶可夢GO", shareSaveWord: "分享·儲存", building: "產生圖片中…",
    shareBtn: "📤 分享", saveBtn: "💾 儲存", closeBtn: "關閉",
    winLabel: "獲勝對手", loseLabel: "落敗對手（剋星）",
  },
};

const P = { ko, en, ja, "zh-TW": zhTW } as const;
export function getPoke(lang: string): PokeDict {
  return (P as Record<string, PokeDict>)[lang] || ko;
}
