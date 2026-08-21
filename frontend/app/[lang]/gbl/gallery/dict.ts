// 자랑 갤러리(클라이언트) 문구(3개국어).
export type GalleryDict = {
  navRaid: string;
  h1: string;
  intro: string;
  loading: string;
  empty: string;
  anon: string;
  altBrag: string;
  fab: string;
  fabBusy: string;
  del: string;
  close: string;
  needLogin: string;
  badType: string;
  tooBig: string;
  captionPrompt: string;
  uploadDone: string;
  uploadFail: string;
  confirmDelete: string;
  deleteFail: string;
  errWord: string;
  gateTitle: string; gateDescPre: string; gateDescBold: string; gateDescPost: string; gateDesc2: string; gateBtn: string;
};

const ko: GalleryDict = {
  navRaid: "🔥 레이드",
  h1: "🏆 자랑 갤러리",
  intro: "100% 개체, 레전드 포획, 내 전적 카드… 뭐든 자랑해보세요. 이미지를 올리면 갤러리에 공유됩니다.",
  loading: "불러오는 중…",
  empty: "아직 자랑이 없어요. 첫 자랑의 주인공이 되어보세요! 👇",
  anon: "익명",
  altBrag: "자랑",
  fab: "📸 자랑 올리기",
  fabBusy: "올리는 중…",
  del: "삭제",
  close: "닫기",
  needLogin: "자랑을 올리려면 로그인이 필요합니다",
  badType: "PNG·JPG·WEBP 이미지만 가능해요",
  tooBig: "이미지는 4MB 이하만 올릴 수 있어요",
  captionPrompt: "한마디 (선택) — 예: 드디어 100% 루나아라!",
  uploadDone: "자랑 올리기 완료! 🎉",
  uploadFail: "업로드 실패: ",
  confirmDelete: "이 글을 삭제할까요?",
  deleteFail: "삭제 실패: ",
  errWord: "오류",
  gateTitle: "회원 전용 갤러리입니다", gateDescPre: "자랑 갤러리는 ", gateDescBold: "가입한 회원", gateDescPost: "만 보고 올릴 수 있어요.",
  gateDesc2: "무료로 가입하고 내 자랑을 공유해보세요.", gateBtn: "회원가입 / 로그인",
};

const en: GalleryDict = {
  navRaid: "🔥 Raids",
  h1: "🏆 Brag gallery",
  intro: "A 100% IV catch, a legendary, your battle card… show off anything. Upload an image and it's shared to the gallery.",
  loading: "Loading…",
  empty: "No brags yet. Be the first to show off! 👇",
  anon: "Anonymous",
  altBrag: "Brag",
  fab: "📸 Post a brag",
  fabBusy: "Uploading…",
  del: "Delete",
  close: "Close",
  needLogin: "You need to log in to post a brag",
  badType: "Only PNG, JPG, or WEBP images are allowed",
  tooBig: "Images must be 4MB or smaller",
  captionPrompt: "A quick word (optional) — e.g. Finally a 100% Lunatone!",
  uploadDone: "Brag posted! 🎉",
  uploadFail: "Upload failed: ",
  confirmDelete: "Delete this post?",
  deleteFail: "Delete failed: ",
  errWord: "error",
  gateTitle: "Members-only gallery", gateDescPre: "The brag gallery is for ", gateDescBold: "signed-up members", gateDescPost: " only.",
  gateDesc2: "Sign up free and share your brags.", gateBtn: "Sign up / Log in",
};

const ja: GalleryDict = {
  navRaid: "🔥 レイド",
  h1: "🏆 自慢ギャラリー",
  intro: "個体値100%、伝説の捕獲、自分の戦績カード…なんでも自慢しよう。画像をアップするとギャラリーに共有されます。",
  loading: "読み込み中…",
  empty: "まだ自慢がありません。最初の主役になろう！👇",
  anon: "匿名",
  altBrag: "自慢",
  fab: "📸 自慢を投稿",
  fabBusy: "アップロード中…",
  del: "削除",
  close: "閉じる",
  needLogin: "自慢を投稿するにはログインが必要です",
  badType: "PNG・JPG・WEBP画像のみ可能です",
  tooBig: "画像は4MB以下のみアップできます",
  captionPrompt: "ひとこと (任意) — 例: ついに100%のルナトーン！",
  uploadDone: "自慢を投稿しました！🎉",
  uploadFail: "アップロード失敗: ",
  confirmDelete: "この投稿を削除しますか？",
  deleteFail: "削除失敗: ",
  errWord: "エラー",
  gateTitle: "会員専用ギャラリーです", gateDescPre: "自慢ギャラリーは", gateDescBold: "登録会員", gateDescPost: "のみ閲覧・投稿できます。",
  gateDesc2: "無料登録して自慢を共有しよう。", gateBtn: "会員登録 / ログイン",
};

const M = { ko, en, ja } as const;
export function getGallery(lang: string): GalleryDict {
  return (M as Record<string, GalleryDict>)[lang] || ko;
}
