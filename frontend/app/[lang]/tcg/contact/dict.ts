// 문의(Contact) — 서버렌더 SEO 문구(4개국어). gblnote 고지를 tcg에 맞게 적응(게시판 없음 → 이메일 중심).
export type ContactDict = {
  h1: string;
  introA: string; introB: string; introC: string;
  emailLabel: string;
  tipsP: string;
  privacyA: string; privacyLink: string; privacyC: string;
  footerAbout: string; footerPrivacy: string;
  metaTitle: string; metaDesc: string; ogTitle: string; ogDesc: string;
};

const ko: ContactDict = {
  h1: "문의하기",
  introA: "TCG Note 이용 중 궁금한 점, 오류 제보, 기능 제안, 또는 ",
  introB: "데이터·개인정보 관련 요청",
  introC: "은 아래 이메일로 보내주세요. 확인 후 답변드립니다.",
  emailLabel: "이메일",
  tipsP: "문의하실 때 다음을 함께 적어주시면 더 빠르게 도와드릴 수 있습니다: 사용 중인 기기(안드로이드/아이폰/PC), 접속 주소, 문제가 발생한 화면과 상황. 오류 제보는 캡처 이미지가 있으면 좋습니다.",
  privacyA: "개인정보 처리에 관한 사항은 ",
  privacyLink: "개인정보처리방침",
  privacyC: "을 참고해 주세요.",
  footerAbout: "소개", footerPrivacy: "개인정보처리방침",
  metaTitle: "문의하기 | TCG Note",
  metaDesc: "TCG Note 관련 문의, 오류 제보, 기능 제안, 데이터 삭제 요청은 이메일로 연락해 주세요.",
  ogTitle: "TCG Note 문의", ogDesc: "문의·오류 제보·기능 제안",
};

const en: ContactDict = {
  h1: "Contact",
  introA: "For questions, bug reports, feature suggestions, or ",
  introB: "data & privacy requests",
  introC: " while using TCG Note, please email us below. We'll reply after reviewing.",
  emailLabel: "Email",
  tipsP: "Including the following when you reach out helps us assist you faster: the device you use (Android / iPhone / PC), the URL you were on, and the screen and situation where the problem occurred. For bug reports, a screenshot is helpful.",
  privacyA: "For details on how personal data is handled, please see the ",
  privacyLink: "Privacy Policy",
  privacyC: ".",
  footerAbout: "About", footerPrivacy: "Privacy Policy",
  metaTitle: "Contact | TCG Note",
  metaDesc: "For inquiries, bug reports, feature suggestions, or data deletion requests about TCG Note, please get in touch by email.",
  ogTitle: "Contact TCG Note", ogDesc: "Inquiries · bug reports · feature suggestions",
};

const ja: ContactDict = {
  h1: "お問い合わせ",
  introA: "TCG Note のご利用中の疑問、不具合の報告、機能のご提案、または ",
  introB: "データ・個人情報に関するご依頼",
  introC: " は、下記のメールへお送りください。確認のうえ回答いたします。",
  emailLabel: "メール",
  tipsP: "お問い合わせの際は次を併せてお書きいただくと、より早くお手伝いできます: ご利用の端末(Android / iPhone / PC)、アクセスした URL、問題が起きた画面と状況。不具合の報告はスクリーンショットがあると助かります。",
  privacyA: "個人情報の取り扱いについては、",
  privacyLink: "プライバシーポリシー",
  privacyC: "をご参照ください。",
  footerAbout: "紹介", footerPrivacy: "プライバシーポリシー",
  metaTitle: "お問い合わせ | TCG Note",
  metaDesc: "TCG Note に関するお問い合わせ、不具合の報告、機能のご提案、データ削除のご依頼はメールでご連絡ください。",
  ogTitle: "TCG Note お問い合わせ", ogDesc: "お問い合わせ・不具合報告・機能提案",
};

const zhTW: ContactDict = {
  h1: "聯絡我們",
  introA: "使用 TCG Note 有疑問、錯誤回報、功能建議，或 ",
  introB: "資料·個人資訊相關請求",
  introC: "，請寄至下方電子郵件。我們確認後回覆。",
  emailLabel: "電子郵件",
  tipsP: "聯絡時若一併寫下以下內容能更快協助：使用的裝置（Android/iPhone/PC）、連線網址、發生問題的畫面與情況。錯誤回報若有截圖更好。",
  privacyA: "關於個人資料處理，請參考 ",
  privacyLink: "隱私權政策",
  privacyC: "。",
  footerAbout: "關於", footerPrivacy: "隱私權政策",
  metaTitle: "聯絡我們 | TCG Note",
  metaDesc: "TCG Note 相關洽詢、錯誤回報、功能建議、資料刪除請求，請以電子郵件聯絡。",
  ogTitle: "TCG Note 聯絡", ogDesc: "洽詢·錯誤回報·功能建議",
};

const C = { ko, en, ja, "zh-TW": zhTW } as const;
export function getContact(lang: string): ContactDict {
  return (C as Record<string, ContactDict>)[lang] || ko;
}
