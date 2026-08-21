// 비밀번호 재설정(클라이언트) 문구(3개국어).
export type ResetDict = {
  title: string;
  done: string;
  pwPlaceholder: string;
  pw2Placeholder: string;
  changing: string;
  submit: string;
  errShort: string;
  errMismatch: string;
  errBadLink: string;
  errFail: string;
};

const ko: ResetDict = {
  title: "비밀번호 재설정",
  done: "✅ 변경됐습니다. 로그인 화면으로 이동합니다…",
  pwPlaceholder: "새 비밀번호 (8자 이상)",
  pw2Placeholder: "새 비밀번호 확인",
  changing: "변경 중…",
  submit: "비밀번호 변경",
  errShort: "비밀번호는 8자 이상이어야 합니다.",
  errMismatch: "비밀번호가 일치하지 않습니다.",
  errBadLink: "유효하지 않은 링크입니다.",
  errFail: "재설정 실패",
};

const en: ResetDict = {
  title: "Reset password",
  done: "✅ Password changed. Redirecting to the login screen…",
  pwPlaceholder: "New password (8+ characters)",
  pw2Placeholder: "Confirm new password",
  changing: "Changing…",
  submit: "Change password",
  errShort: "Password must be at least 8 characters.",
  errMismatch: "Passwords do not match.",
  errBadLink: "Invalid link.",
  errFail: "Reset failed",
};

const ja: ResetDict = {
  title: "パスワード再設定",
  done: "✅ 変更されました。ログイン画面へ移動します…",
  pwPlaceholder: "新しいパスワード (8文字以上)",
  pw2Placeholder: "新しいパスワード（確認）",
  changing: "変更中…",
  submit: "パスワードを変更",
  errShort: "パスワードは8文字以上で入力してください。",
  errMismatch: "パスワードが一致しません。",
  errBadLink: "無効なリンクです。",
  errFail: "再設定に失敗しました",
};

const M = { ko, en, ja } as const;
export function getReset(lang: string): ResetDict {
  return (M as Record<string, ResetDict>)[lang] || ko;
}
