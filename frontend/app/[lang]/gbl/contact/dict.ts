// 문의(Contact) — 서버렌더 SEO 문구(3개국어).
export type ContactDict = {
  h1: string;
  introA: string; introB: string; introC: string; introD: string; introE: string;
  boardLabel: string; boardCta: string; boardNote: string;
  privateA: string; privateB: string; privateC: string;
  emailLabel: string;
  tipsP: string;
  privacyA: string; privacyLink: string; privacyC: string;
  footerAbout: string; footerGuide: string; footerPrivacy: string;
  metaTitle: string; metaDesc: string; ogTitle: string; ogDesc: string;
};

const ko: ContactDict = {
  h1: "문의하기",
  introA: "GBL Note 이용 중 궁금한 점, 오류 제보, 기능 제안은 ",
  introB: "회원 게시판",
  introC: "에서 남겨주세요. 회원가입(무료) 후 ",
  introD: "운영자 문의",
  introE: " 게시판에 글을 남기면 운영자가 답변드리고, 답변은 다른 이용자에게도 도움이 됩니다.",
  boardLabel: "회원 게시판으로 문의",
  boardCta: "게시판에서 문의하기 →",
  boardNote: "비회원은 로그인/회원가입 화면으로 안내됩니다.",
  privateA: "계정·데이터 삭제 요청 등 ",
  privateB: "비공개로 처리할 사항",
  privateC: "은 아래 이메일로 보내주세요.",
  emailLabel: "이메일",
  tipsP: "문의하실 때 다음을 함께 적어주시면 더 빠르게 도와드릴 수 있습니다: 사용 중인 기기(안드로이드/아이폰), 접속 주소, 문제가 발생한 화면과 상황. 오류 제보는 캡처 이미지가 있으면 좋습니다.",
  privacyA: "개인정보 처리에 관한 사항은 ",
  privacyLink: "개인정보처리방침",
  privacyC: "을 참고해 주세요.",
  footerAbout: "소개", footerGuide: "가이드", footerPrivacy: "개인정보처리방침",
  metaTitle: "문의하기 | GBL Note",
  metaDesc: "GBL Note 관련 문의, 오류 제보, 기능 제안, 데이터 삭제 요청은 이메일로 연락해 주세요.",
  ogTitle: "GBL Note 문의", ogDesc: "문의·오류 제보·기능 제안",
};

const en: ContactDict = {
  h1: "Contact",
  introA: "For questions, bug reports, or feature suggestions while using GBL Note, please post on the ",
  introB: "member board",
  introC: ". After signing up (free), leave a post on the ",
  introD: "Ask the operator",
  introE: " board and the operator will reply — and the answer helps other users too.",
  boardLabel: "Ask on the member board",
  boardCta: "Ask on the board →",
  boardNote: "Non-members are directed to the login / sign-up screen.",
  privateA: "For matters to be handled ",
  privateB: "privately",
  privateC: ", such as account or data deletion requests, please email us below.",
  emailLabel: "Email",
  tipsP: "Including the following when you reach out helps us assist you faster: the device you use (Android / iPhone), the URL you were on, and the screen and situation where the problem occurred. For bug reports, a screenshot is helpful.",
  privacyA: "For details on how personal data is handled, please see the ",
  privacyLink: "Privacy Policy",
  privacyC: ".",
  footerAbout: "About", footerGuide: "Guide", footerPrivacy: "Privacy Policy",
  metaTitle: "Contact | GBL Note",
  metaDesc: "For inquiries, bug reports, feature suggestions, or data deletion requests about GBL Note, please get in touch by email.",
  ogTitle: "Contact GBL Note", ogDesc: "Inquiries · bug reports · feature suggestions",
};

const ja: ContactDict = {
  h1: "お問い合わせ",
  introA: "GBL Note のご利用中の疑問、不具合の報告、機能のご提案は、",
  introB: "会員掲示板",
  introC: "からお寄せください。会員登録(無料)のうえ、",
  introD: "運営者への問い合わせ",
  introE: "掲示板に投稿いただくと運営者が回答し、その回答は他の利用者にも役立ちます。",
  boardLabel: "会員掲示板でお問い合わせ",
  boardCta: "掲示板で問い合わせる →",
  boardNote: "非会員の方はログイン / 会員登録画面へご案内します。",
  privateA: "アカウント・データ削除のご依頼など、",
  privateB: "非公開で扱う事項",
  privateC: "は、下記のメールへお送りください。",
  emailLabel: "メール",
  tipsP: "お問い合わせの際は次を併せてお書きいただくと、より早くお手伝いできます: ご利用の端末(Android / iPhone)、アクセスした URL、問題が起きた画面と状況。不具合の報告はスクリーンショットがあると助かります。",
  privacyA: "個人情報の取り扱いについては、",
  privacyLink: "プライバシーポリシー",
  privacyC: "をご参照ください。",
  footerAbout: "紹介", footerGuide: "ガイド", footerPrivacy: "プライバシーポリシー",
  metaTitle: "お問い合わせ | GBL Note",
  metaDesc: "GBL Note に関するお問い合わせ、不具合の報告、機能のご提案、データ削除のご依頼はメールでご連絡ください。",
  ogTitle: "GBL Note お問い合わせ", ogDesc: "お問い合わせ・不具合報告・機能提案",
};

const C = { ko, en, ja } as const;
export function getContact(lang: string): ContactDict {
  return (C as Record<string, ContactDict>)[lang] || ko;
}
