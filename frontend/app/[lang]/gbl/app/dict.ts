// 배틀 기록 앱(클라이언트) 문구(3개국어).
export type AppDict = {
  gateH1: string; gateTitle: string; gateDescPre: string; gateDescBold: string; gateDescPost: string; gateDesc2: string; gateBtn: string;
  // nav / header
  navRaid: string;
  navMeta: string;
  logout: string;
  nickTitle: string;
  nickSet: string;
  // suffixes
  playsSuffix: string;
  winSuffix: string;
  lossSuffix: string;
  drawSuffix: string;
  timesSuffix: string;
  // tabs
  tabLookup: string;
  tabLog: string;
  tabStats: string;
  // scope
  scopeMine: string;
  scopeAll: string;
  // lookup
  searchPlaceholder: string;
  sortRecent: string;
  sortName: string;
  loading: string;
  emptyMatch: string;
  emptyNone: string;
  // log form
  editingBanner: string;
  oppLabel: string;
  oppPlaceholder: string;
  resWin: string;
  resLoss: string;
  resUndecided: string;
  memoLabel: string;
  memoPlaceholder: string;
  cancel: string;
  reset: string;
  saving: string;
  saveEdit: string;
  saveNew: string;
  // team slot / picker
  slotPre: string;
  slotSuf: string;
  fastLabel: string;
  chargedLabel: string;
  notePlaceholder: string;
  manualPlaceholder: string;
  listBtn: string;
  changeBtn: string;
  searchMonPlaceholder: string;
  notInList: string;
  shadowWord: string;
  // match card
  edit: string;
  del: string;
  // stats
  periodToday: string;
  period7: string;
  period30: string;
  periodSeason: string;
  periodAll: string;
  totalPlays: string;
  record: string;
  winRate: string;
  makeCard: string;
  ratingTrend: string;
  addAccount: string;
  currentScore: string;
  recordBtn: string;
  currentWord: string;
  needTwo: string;
  weekdays: string[];
  calLegendPre: string;
  calLegendBold: string;
  closeX: string;
  dayWinRate: string;
  mostMetPre: string;
  deckKindsSuf: string;
  emptyNoRecord: string;
  emptyNoDeck: string;
  deckAll: string;
  deckWon: string;
  deckLost: string;
  reviewPre: string;
  profileDefault: string;
  ratingWord: string;
  // stats card (canvas) + share
  shareTitle: string;
  shareText: string;
  shareSaved: string;
  shareNoSupport: string;
  shareFallback: string;
  share: string;
  save: string;
  close: string;
  // flash / prompts
  nickPrompt: string;
  nickEmpty: string;
  nickTooLong: string;
  nickChanged: string;
  changeFailPre: string;
  errWord: string;
  loadFail: string;
  loadAllFail: string;
  ratingBadInput: string;
  ratingRecorded: string;
  saveFail: string;
  accountPrompt: string;
  needOppName: string;
  editSaved: string;
  recordSaved: string;
};

const ko: AppDict = {
  gateH1: "📝 내 배틀 기록", gateTitle: "회원 전용 기능입니다", gateDescPre: "내 배틀 기록·전적 관리는 ", gateDescBold: "가입한 회원", gateDescPost: "만 이용할 수 있어요.",
  gateDesc2: "무료로 가입하고 상대 기록·내 전적을 관리해보세요.", gateBtn: "회원가입 / 로그인",
  navRaid: "🔥 레이드", navMeta: "🌐 메타", logout: "로그아웃",
  nickTitle: "닉네임 수정 (전적 카드에 표시)", nickSet: "닉네임 설정",
  playsSuffix: "판", winSuffix: "승", lossSuffix: "패", drawSuffix: "무", timesSuffix: "회",
  tabLookup: "🔍 조회", tabLog: "✏️ 기록", tabStats: "📊 전적",
  scopeMine: "내 기록", scopeAll: "🌐 전체 유저",
  searchPlaceholder: "상대 트레이너 이름 몇 글자…",
  sortRecent: "🕒 배틀순", sortName: "🔤 이름순",
  loading: "불러오는 중…",
  emptyMatch: "일치하는 상대 기록이 없습니다.",
  emptyNone: "아직 기록이 없습니다. '배틀 후 기록'으로 첫 상대를 남겨보세요.",
  editingBanner: "✏️ 기록 수정 중 — 잘못 입력한 내용을 고치고 \"수정 저장\"을 누르세요.",
  oppLabel: "상대 트레이너 이름", oppPlaceholder: "예: PikaMaster99",
  resWin: "승", resLoss: "패", resUndecided: "미정",
  memoLabel: "전체 메모 (턴/실드 등)",
  memoPlaceholder: "예: 리드 메타그로스, 2실드 쓰고 지진 유도. 백에 김렉이/토게키스.",
  cancel: "취소", reset: "초기화",
  saving: "저장 중…", saveEdit: "수정 저장", saveNew: "기록 저장",
  slotPre: "", slotSuf: "번",
  fastLabel: "빠른 기술", chargedLabel: "차지 기술 (최대 2)",
  notePlaceholder: "개체 메모 (예: 3타에 지진, 실드 씀)",
  manualPlaceholder: "직접 입력 (목록에 없는 개체)",
  listBtn: "목록", changeBtn: "변경",
  searchMonPlaceholder: "포켓몬 검색 (한글)",
  notInList: "+ 목록에 없어요 (직접 입력)",
  shadowWord: "그림자 ",
  edit: "수정", del: "삭제",
  periodToday: "오늘", period7: "7일", period30: "30일", periodSeason: "시즌", periodAll: "전체",
  totalPlays: "총 판수", record: "전적", winRate: "승률",
  makeCard: "📸 전적 카드 만들기 · 자랑하기",
  ratingTrend: "📈 레이팅 추이", addAccount: "+ 계정",
  currentScore: "현재 점수", recordBtn: "기록", currentWord: "현재",
  needTwo: "2번 이상 기록하면 추이 그래프가 나옵니다.",
  weekdays: ["일", "월", "화", "수", "목", "금", "토"],
  calLegendPre: "색 = 그날 승률(초록 좋음·노랑 보통·빨강 나쁨) · 숫자 = 승-패 · ",
  calLegendBold: "날짜 클릭 → 그날 상대",
  closeX: "닫기 ✕",
  dayWinRate: "📊 일자별 승률",
  mostMetPre: "많이 만난 순 · ", deckKindsSuf: "종 덱",
  emptyNoRecord: "아직 기록이 없습니다.", emptyNoDeck: "해당하는 덱이 없습니다.",
  deckAll: "전체 덱", deckWon: "🟢 이긴 덱", deckLost: "🔴 진 덱",
  reviewPre: "복기 — ",
  profileDefault: "기본", ratingWord: "레이팅",
  shareTitle: "내 GBL 전적", shareText: "내 포켓몬GO 배틀 전적 · gblnote.com",
  shareSaved: "💾 저장됨",
  shareNoSupport: "이 브라우저는 바로 공유가 안 돼요. 저장된 이미지를 카톡·메일에 첨부하세요",
  shareFallback: "공유 대신 저장했어요 — 이미지를 첨부해 공유하세요",
  share: "📤 공유", save: "💾 저장", close: "닫기",
  nickPrompt: "닉네임 (전적 카드·자랑하기에 표시됩니다)",
  nickEmpty: "닉네임을 입력하세요",
  nickTooLong: "닉네임은 20자 이내여야 합니다",
  nickChanged: "닉네임이 변경되었습니다",
  changeFailPre: "변경 실패: ", errWord: "오류",
  loadFail: "불러오기 실패", loadAllFail: "전체 기록 로드 실패",
  ratingBadInput: "점수를 정확히 입력하세요", ratingRecorded: "📈 레이팅 기록됨",
  saveFail: "저장 실패",
  accountPrompt: "계정 이름 (예: 부계1)",
  needOppName: "상대 이름을 입력하세요.",
  editSaved: "✅ 수정됨", recordSaved: "✅ 기록 저장됨",
};

const en: AppDict = {
  gateH1: "📝 My battle log", gateTitle: "Members-only feature", gateDescPre: "Logging battles and tracking your record is for ", gateDescBold: "signed-up members", gateDescPost: " only.",
  gateDesc2: "Sign up free to track opponents and your own record.", gateBtn: "Sign up / Log in",
  navRaid: "🔥 Raids", navMeta: "🌐 Meta", logout: "Log out",
  nickTitle: "Edit nickname (shown on battle card)", nickSet: "Set nickname",
  playsSuffix: "", winSuffix: "W", lossSuffix: "L", drawSuffix: "D", timesSuffix: "×",
  tabLookup: "🔍 Look up", tabLog: "✏️ Log", tabStats: "📊 Stats",
  scopeMine: "My log", scopeAll: "🌐 All users",
  searchPlaceholder: "A few letters of the opponent's name…",
  sortRecent: "🕒 Recent", sortName: "🔤 Name",
  loading: "Loading…",
  emptyMatch: "No matching opponent found.",
  emptyNone: "No logs yet. Use 'Log after battle' to record your first opponent.",
  editingBanner: "✏️ Editing a log — fix the mistake and press \"Save changes\".",
  oppLabel: "Opponent trainer name", oppPlaceholder: "e.g. PikaMaster99",
  resWin: "Win", resLoss: "Loss", resUndecided: "TBD",
  memoLabel: "Overall memo (turns / shields, etc.)",
  memoPlaceholder: "e.g. Lead Metagross, baited 2 shields with Earthquake. Garchomp & Togekiss in back.",
  cancel: "Cancel", reset: "Reset",
  saving: "Saving…", saveEdit: "Save changes", saveNew: "Save log",
  slotPre: "Slot ", slotSuf: "",
  fastLabel: "Fast move", chargedLabel: "Charged moves (max 2)",
  notePlaceholder: "Per-mon note (e.g. Earthquake on 3rd, used shield)",
  manualPlaceholder: "Enter manually (not in list)",
  listBtn: "List", changeBtn: "Change",
  searchMonPlaceholder: "Search Pokémon",
  notInList: "+ Not in the list (enter manually)",
  shadowWord: "Shadow ",
  edit: "Edit", del: "Delete",
  periodToday: "Today", period7: "7d", period30: "30d", periodSeason: "Season", periodAll: "All",
  totalPlays: "Total games", record: "Record", winRate: "Win rate",
  makeCard: "📸 Make a battle card · Show off",
  ratingTrend: "📈 Rating trend", addAccount: "+ Account",
  currentScore: "current score", recordBtn: "Log", currentWord: "Now",
  needTwo: "Log twice or more to see the trend graph.",
  weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  calLegendPre: "Color = day's win rate (green good · yellow ok · red bad) · number = W-L · ",
  calLegendBold: "tap a date → that day's opponents",
  closeX: "Close ✕",
  dayWinRate: "📊 Win rate by day",
  mostMetPre: "Most encountered · ", deckKindsSuf: " decks",
  emptyNoRecord: "No logs yet.", emptyNoDeck: "No matching decks.",
  deckAll: "All decks", deckWon: "🟢 Won", deckLost: "🔴 Lost",
  reviewPre: "Review — ",
  profileDefault: "Default", ratingWord: "Rating",
  shareTitle: "My GBL record", shareText: "My Pokémon GO battle record · gblnote.com",
  shareSaved: "💾 Saved",
  shareNoSupport: "This browser can't share directly. Save the image and attach it in your messenger or email.",
  shareFallback: "Saved instead of sharing — attach the image to share it.",
  share: "📤 Share", save: "💾 Save", close: "Close",
  nickPrompt: "Nickname (shown on your battle card and brags)",
  nickEmpty: "Please enter a nickname",
  nickTooLong: "Nickname must be 20 characters or fewer",
  nickChanged: "Nickname changed",
  changeFailPre: "Change failed: ", errWord: "error",
  loadFail: "Failed to load", loadAllFail: "Failed to load all logs",
  ratingBadInput: "Please enter a valid score", ratingRecorded: "📈 Rating logged",
  saveFail: "Save failed",
  accountPrompt: "Account name (e.g. Alt 1)",
  needOppName: "Please enter the opponent's name.",
  editSaved: "✅ Updated", recordSaved: "✅ Log saved",
};

const ja: AppDict = {
  gateH1: "📝 自分のバトル記録", gateTitle: "会員専用機能です", gateDescPre: "バトル記録・戦績管理は", gateDescBold: "登録会員", gateDescPost: "のみ利用できます。",
  gateDesc2: "無料登録して相手の記録・自分の戦績を管理しよう。", gateBtn: "会員登録 / ログイン",
  navRaid: "🔥 レイド", navMeta: "🌐 メタ", logout: "ログアウト",
  nickTitle: "ニックネーム編集 (戦績カードに表示)", nickSet: "ニックネーム設定",
  playsSuffix: "戦", winSuffix: "勝", lossSuffix: "敗", drawSuffix: "分", timesSuffix: "回",
  tabLookup: "🔍 検索", tabLog: "✏️ 記録", tabStats: "📊 戦績",
  scopeMine: "自分の記録", scopeAll: "🌐 全ユーザー",
  searchPlaceholder: "相手トレーナー名を数文字…",
  sortRecent: "🕒 対戦順", sortName: "🔤 名前順",
  loading: "読み込み中…",
  emptyMatch: "一致する相手の記録がありません。",
  emptyNone: "まだ記録がありません。「対戦後に記録」で最初の相手を残しましょう。",
  editingBanner: "✏️ 記録を編集中 — 間違いを直して「変更を保存」を押してください。",
  oppLabel: "相手トレーナー名", oppPlaceholder: "例: PikaMaster99",
  resWin: "勝", resLoss: "敗", resUndecided: "未定",
  memoLabel: "全体メモ (ターン/シールドなど)",
  memoPlaceholder: "例: リードにメタグロス、2シールド使わせて地震を誘導。裏にガブリアス/トゲキッス。",
  cancel: "キャンセル", reset: "リセット",
  saving: "保存中…", saveEdit: "変更を保存", saveNew: "記録を保存",
  slotPre: "", slotSuf: "番目",
  fastLabel: "ノーマルアタック", chargedLabel: "スペシャルアタック (最大2)",
  notePlaceholder: "個体メモ (例: 3発目で地震、シールド使用)",
  manualPlaceholder: "手入力 (リストにない個体)",
  listBtn: "リスト", changeBtn: "変更",
  searchMonPlaceholder: "ポケモン検索",
  notInList: "+ リストにない (手入力)",
  shadowWord: "シャドウ ",
  edit: "編集", del: "削除",
  periodToday: "今日", period7: "7日", period30: "30日", periodSeason: "シーズン", periodAll: "全体",
  totalPlays: "総対戦数", record: "戦績", winRate: "勝率",
  makeCard: "📸 戦績カードを作る · 自慢する",
  ratingTrend: "📈 レート推移", addAccount: "+ アカウント",
  currentScore: "現在のスコア", recordBtn: "記録", currentWord: "現在",
  needTwo: "2回以上記録すると推移グラフが表示されます。",
  weekdays: ["日", "月", "火", "水", "木", "金", "土"],
  calLegendPre: "色 = その日の勝率(緑=良・黄=普通・赤=悪) · 数字 = 勝-敗 · ",
  calLegendBold: "日付タップ → その日の相手",
  closeX: "閉じる ✕",
  dayWinRate: "📊 日別勝率",
  mostMetPre: "遭遇が多い順 · ", deckKindsSuf: "種のデッキ",
  emptyNoRecord: "まだ記録がありません。", emptyNoDeck: "該当するデッキがありません。",
  deckAll: "全デッキ", deckWon: "🟢 勝ったデッキ", deckLost: "🔴 負けたデッキ",
  reviewPre: "振り返り — ",
  profileDefault: "基本", ratingWord: "レート",
  shareTitle: "私のGBL戦績", shareText: "私のポケモンGOバトル戦績 · gblnote.com",
  shareSaved: "💾 保存しました",
  shareNoSupport: "このブラウザでは直接共有できません。保存した画像をメッセンジャーやメールに添付してください。",
  shareFallback: "共有の代わりに保存しました — 画像を添付して共有してください。",
  share: "📤 共有", save: "💾 保存", close: "閉じる",
  nickPrompt: "ニックネーム (戦績カード・自慢に表示されます)",
  nickEmpty: "ニックネームを入力してください",
  nickTooLong: "ニックネームは20文字以内で入力してください",
  nickChanged: "ニックネームを変更しました",
  changeFailPre: "変更失敗: ", errWord: "エラー",
  loadFail: "読み込みに失敗しました", loadAllFail: "全記録の読み込みに失敗しました",
  ratingBadInput: "スコアを正しく入力してください", ratingRecorded: "📈 レートを記録しました",
  saveFail: "保存に失敗しました",
  accountPrompt: "アカウント名 (例: サブ1)",
  needOppName: "相手の名前を入力してください。",
  editSaved: "✅ 更新しました", recordSaved: "✅ 記録を保存しました",
};

const M = { ko, en, ja } as const;
export function getApp(lang: string): AppDict {
  return (M as Record<string, AppDict>)[lang] || ko;
}
