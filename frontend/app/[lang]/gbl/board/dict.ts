// 게시판(클라이언트) 문구(3개국어).
export type BoardDict = {
  h1: string;
  chatLabel: string;
  chatHint: string;
  inquiryLabel: string;
  inquiryHint: string;
  // 비회원 게이트
  gateTitle: string;
  gateDescPre: string;
  gateDescBold: string;
  gateDescPost: string;
  gateDesc2: string;
  gateBtn: string;
  // 상세
  backToList: string;
  answered: string;
  waiting: string;
  privateTitle: string;
  commentsLabel: string;
  admin: string;
  replyPlaceholderAdmin: string;
  replyPlaceholder: string;
  submitting: string;
  submitReply: string;
  del: string;
  // 목록/작성
  titlePlaceholder: string;
  inquiryBodyPlaceholder: string;
  chatBodyPlaceholder: string;
  privateCheck: string;
  cancel: string;
  submit: string;
  write: string;
  loading: string;
  emptyList: string;
  // confirm & errors
  confirmDelete: string;
  errTitleBody: string;
  errLoad: string;
  errLoadPost: string;
  errWrite: string;
  errReply: string;
  errDelete: string;
};

const ko: BoardDict = {
  h1: "게시판",
  chatLabel: "잡담방",
  chatHint: "자유롭게 이야기 나눠요",
  inquiryLabel: "운영자 문의",
  inquiryHint: "오류 제보·건의·질문 — 운영자가 답변합니다",
  gateTitle: "회원 전용 게시판입니다",
  gateDescPre: "잡담방과 운영자 문의는 ",
  gateDescBold: "가입한 회원",
  gateDescPost: "만 이용할 수 있습니다.",
  gateDesc2: "로그인하거나 무료로 가입하고 이용해 주세요.",
  gateBtn: "로그인 / 회원가입",
  backToList: "← 목록으로",
  answered: "답변완료",
  waiting: "답변대기",
  privateTitle: "비공개",
  commentsLabel: "댓글",
  admin: "🛡️ 운영자",
  replyPlaceholderAdmin: "운영자 답변 달기…",
  replyPlaceholder: "댓글 달기…",
  submitting: "등록 중…",
  submitReply: "댓글 등록",
  del: "삭제",
  titlePlaceholder: "제목",
  inquiryBodyPlaceholder: "문의 내용 (기기·상황·캡처 설명을 적어주시면 빠르게 답변드립니다)",
  chatBodyPlaceholder: "내용",
  privateCheck: "🔒 비공개로 문의 — 나와 운영자만 볼 수 있어요",
  cancel: "취소",
  submit: "등록",
  write: "✏️ 글쓰기",
  loading: "불러오는 중…",
  emptyList: "아직 글이 없습니다. 첫 글을 남겨보세요!",
  confirmDelete: "삭제하시겠습니까?",
  errTitleBody: "제목과 내용을 입력하세요.",
  errLoad: "불러오기 실패",
  errLoadPost: "글 불러오기 실패",
  errWrite: "작성 실패",
  errReply: "댓글 실패",
  errDelete: "삭제 실패",
};

const en: BoardDict = {
  h1: "Board",
  chatLabel: "Chat",
  chatHint: "Talk freely about anything",
  inquiryLabel: "Ask the admin",
  inquiryHint: "Bug reports, suggestions, questions — the admin replies",
  gateTitle: "Members-only board",
  gateDescPre: "The chat board and admin inquiries are for ",
  gateDescBold: "signed-up members",
  gateDescPost: " only.",
  gateDesc2: "Please log in or sign up for free to use them.",
  gateBtn: "Log in / Sign up",
  backToList: "← Back to list",
  answered: "Answered",
  waiting: "Awaiting reply",
  privateTitle: "Private",
  commentsLabel: "Comments",
  admin: "🛡️ Admin",
  replyPlaceholderAdmin: "Write an admin reply…",
  replyPlaceholder: "Write a comment…",
  submitting: "Posting…",
  submitReply: "Post comment",
  del: "Delete",
  titlePlaceholder: "Title",
  inquiryBodyPlaceholder: "Your inquiry (describing your device, situation, and a screenshot helps us reply faster)",
  chatBodyPlaceholder: "Body",
  privateCheck: "🔒 Private inquiry — only you and the admin can see it",
  cancel: "Cancel",
  submit: "Post",
  write: "✏️ New post",
  loading: "Loading…",
  emptyList: "No posts yet. Be the first to write one!",
  confirmDelete: "Delete this?",
  errTitleBody: "Please enter a title and body.",
  errLoad: "Failed to load",
  errLoadPost: "Failed to load post",
  errWrite: "Failed to post",
  errReply: "Failed to comment",
  errDelete: "Failed to delete",
};

const ja: BoardDict = {
  h1: "掲示板",
  chatLabel: "雑談",
  chatHint: "自由に語り合いましょう",
  inquiryLabel: "運営への問い合わせ",
  inquiryHint: "不具合報告・要望・質問 — 運営が回答します",
  gateTitle: "会員専用の掲示板です",
  gateDescPre: "雑談と運営への問い合わせは",
  gateDescBold: "登録した会員",
  gateDescPost: "のみ利用できます。",
  gateDesc2: "ログインするか、無料で登録してご利用ください。",
  gateBtn: "ログイン / 会員登録",
  backToList: "← 一覧へ",
  answered: "回答済み",
  waiting: "回答待ち",
  privateTitle: "非公開",
  commentsLabel: "コメント",
  admin: "🛡️ 運営",
  replyPlaceholderAdmin: "運営の回答を書く…",
  replyPlaceholder: "コメントを書く…",
  submitting: "登録中…",
  submitReply: "コメント登録",
  del: "削除",
  titlePlaceholder: "タイトル",
  inquiryBodyPlaceholder: "問い合わせ内容 (端末・状況・スクショの説明を書くと早く回答できます)",
  chatBodyPlaceholder: "本文",
  privateCheck: "🔒 非公開で問い合わせ — 自分と運営だけが見られます",
  cancel: "キャンセル",
  submit: "登録",
  write: "✏️ 投稿する",
  loading: "読み込み中…",
  emptyList: "まだ投稿がありません。最初の投稿をどうぞ！",
  confirmDelete: "削除しますか？",
  errTitleBody: "タイトルと本文を入力してください。",
  errLoad: "読み込みに失敗しました",
  errLoadPost: "投稿の読み込みに失敗しました",
  errWrite: "投稿に失敗しました",
  errReply: "コメントに失敗しました",
  errDelete: "削除に失敗しました",
};

const zhTW: BoardDict = {
  h1: "討論板",
  chatLabel: "閒聊區",
  chatHint: "自由聊天",
  inquiryLabel: "管理員聯絡",
  inquiryHint: "錯誤回報·建議·提問 — 管理員會回覆",
  gateTitle: "會員專用討論板",
  gateDescPre: "閒聊區與管理員聯絡 ",
  gateDescBold: "註冊會員",
  gateDescPost: " 才能使用。",
  gateDesc2: "請登入或免費註冊後使用。",
  gateBtn: "登入 / 註冊",
  backToList: "← 回列表",
  answered: "已回覆",
  waiting: "等待回覆",
  privateTitle: "非公開",
  commentsLabel: "留言",
  admin: "🛡️ 管理員",
  replyPlaceholderAdmin: "管理員回覆…",
  replyPlaceholder: "留言…",
  submitting: "送出中…",
  submitReply: "送出留言",
  del: "刪除",
  titlePlaceholder: "標題",
  inquiryBodyPlaceholder: "洽詢內容（寫下裝置·情況·截圖說明能更快回覆）",
  chatBodyPlaceholder: "內容",
  privateCheck: "🔒 非公開洽詢 — 只有我和管理員能看",
  cancel: "取消",
  submit: "送出",
  write: "✏️ 發文",
  loading: "載入中…",
  emptyList: "還沒有文章。來發第一篇吧！",
  confirmDelete: "確定刪除嗎？",
  errTitleBody: "請輸入標題與內容。",
  errLoad: "載入失敗",
  errLoadPost: "文章載入失敗",
  errWrite: "發表失敗",
  errReply: "留言失敗",
  errDelete: "刪除失敗",
};

const M = { ko, en, ja, "zh-TW": zhTW } as const;
export function getBoard(lang: string): BoardDict {
  return (M as Record<string, BoardDict>)[lang] || ko;
}
