// 이용약관 3개국어 사전(페이지 co-located). articles = [{h, lines[]}] 구조로 렌더.
export type TermsDict = {
  title: string;
  effectiveLabel: string;
  articles: { h: string; lines: string[] }[];
  contactHead: string;
  contactSuffix: string; // 문의 페이지 링크 앞 문구
  contactPageLink: string;
  changeNote: string;
};

const ko: TermsDict = {
  title: "이용약관",
  effectiveLabel: "시행일",
  articles: [
    { h: "제1조 (목적·적용)", lines: ["본 약관은 GBL Note(이하 “서비스”, gblnote.com)의 이용 조건과 이용자·운영자의 권리·의무를 정합니다. 서비스를 이용하면 본 약관에 동의한 것으로 봅니다."] },
    { h: "제2조 (서비스 내용)", lines: ["서비스는 포켓몬 GO 배틀리그(GBL) 관련 대전 상대 기록·조회, 실측 메타 통계, 티어·기술·카운터 정보 등을 제공하는 무료 웹 서비스입니다. 일부 콘텐츠는 로그인 없이 이용할 수 있습니다."] },
    { h: "제3조 (계정)", lines: [
      "• 이용자는 정확한 정보로 가입하며, 계정 정보(비밀번호 등)를 스스로 안전하게 관리할 책임이 있습니다.",
      "• 하나의 계정을 여러 사람이 공유하는 것은 제한될 수 있습니다.",
      "• 이용자는 언제든 탈퇴할 수 있으며, 탈퇴 시 계정·기록은 파기됩니다.",
    ] },
    { h: "제4조 (이용자의 의무·금지행위)", lines: [
      "이용자는 다음 행위를 해서는 안 됩니다.",
      "• 허위·조작 데이터를 대량 입력해 통계를 왜곡하는 행위",
      "• 타인 사칭, 타인의 개인정보 무단 수집·게시",
      "• 자동화된 방법으로 서비스를 과도하게 조회·수집하거나 서버에 부하를 주는 행위",
      "• 서비스 운영을 방해하거나 관련 법령을 위반하는 행위",
      "위반 시 운영자는 사전 통지 없이 이용을 제한하거나 계정을 정지·삭제할 수 있습니다.",
    ] },
    { h: "제5조 (이용자 콘텐츠)", lines: ["이용자가 입력한 대전 기록의 권리는 이용자에게 있습니다. 다만 이용자는 서비스가 해당 데이터를 개인 식별정보를 제거한 익명 통계(실측 메타 등)로 가공·표시하는 것에 동의합니다. 개별 기록은 본인만 조회할 수 있습니다."] },
    { h: "제6조 (광고)", lines: ["서비스는 운영을 위해 Google AdSense, 쿠팡 파트너스 등 광고·제휴 링크를 게재할 수 있습니다. 광고 및 제휴 상품의 내용·거래에 대한 책임은 해당 광고주·판매자에게 있습니다. 자세한 사항은 개인정보처리방침을 참고하세요."] },
    { h: "제7조 (서비스의 제공·변경·중단)", lines: ["서비스는 무료로 제공되며, 운영자는 필요에 따라 서비스 내용을 변경하거나 중단할 수 있습니다. 이용자는 본인의 데이터를 스스로 백업할 책임이 있으며, 서비스 중단·장애로 인한 데이터 손실에 대해 운영자는 고의·중과실이 없는 한 책임지지 않습니다."] },
    { h: "제8조 (면책)", lines: [
      "• 서비스가 제공하는 통계·티어·기술 정보 등은 참고용이며, 정확성·완전성을 보증하지 않습니다.",
      "• 무료 서비스로서, 운영자는 관련 법령이 허용하는 범위에서 서비스 이용으로 발생한 손해에 대해 책임을 지지 않습니다.",
    ] },
    { h: "제9조 (지식재산권)", lines: ["서비스의 디자인·코드·편집물에 대한 권리는 운영자에게 있습니다. 포켓몬(Pokémon), 포켓몬 GO 등 게임 관련 명칭·이미지의 권리는 각 권리자에게 있으며, 서비스는 관련 정보를 정보 제공 목적으로 다룹니다."] },
    { h: "제10조 (준거법·관할)", lines: ["본 약관은 대한민국 법을 준거법으로 하며, 분쟁은 관련 법령에 따른 관할 법원에서 해결합니다."] },
  ],
  contactHead: "제11조 (문의)",
  contactSuffix: "약관·서비스 관련 문의:",
  contactPageLink: "문의 페이지",
  changeNote: "본 약관은 관련 법령·정책에 따라 변경될 수 있으며, 변경 시 본 페이지에 공지합니다.",
};

const en: TermsDict = {
  title: "Terms of Service",
  effectiveLabel: "Effective date",
  articles: [
    { h: "1. Purpose & Scope", lines: ["These terms govern the use of GBL Note (the “Service”, gblnote.com) and the rights and obligations of users and the operator. By using the Service, you agree to these terms."] },
    { h: "2. The Service", lines: ["The Service is a free web service that provides Pokémon GO Battle League (GBL) features such as logging and looking up opponents, encounter-meta statistics, and tier / move / counter information. Some content is available without logging in."] },
    { h: "3. Accounts", lines: [
      "• You must register with accurate information and are responsible for keeping your account details (such as your password) secure.",
      "• Sharing a single account among several people may be restricted.",
      "• You may delete your account at any time; upon deletion, your account and records are destroyed.",
    ] },
    { h: "4. User Obligations & Prohibited Conduct", lines: [
      "You must not do any of the following:",
      "• Mass-entering false or manipulated data to distort statistics",
      "• Impersonating others, or collecting/posting others' personal information without consent",
      "• Excessively scraping the Service by automated means or overloading the servers",
      "• Interfering with Service operations or violating applicable laws",
      "In case of violation, the operator may restrict use or suspend/delete the account without prior notice.",
    ] },
    { h: "5. User Content", lines: ["You retain the rights to the battle records you enter. However, you agree that the Service may process and display that data as anonymous statistics with personal identifiers removed (e.g., encounter meta). Individual records are visible only to you."] },
    { h: "6. Advertising", lines: ["To fund operations, the Service may display advertising and affiliate links such as Google AdSense and Coupang Partners. Responsibility for the content and transactions of ads and affiliate products lies with the respective advertisers/sellers. See the Privacy Policy for details."] },
    { h: "7. Provision, Changes & Discontinuation", lines: ["The Service is provided free of charge, and the operator may change or discontinue it as needed. You are responsible for backing up your own data, and the operator is not liable for data loss due to Service discontinuation or failure, absent willful misconduct or gross negligence."] },
    { h: "8. Disclaimer", lines: [
      "• Statistics, tiers, and move information provided by the Service are for reference only, and their accuracy or completeness is not guaranteed.",
      "• As a free service, the operator is not liable for damages arising from use of the Service, to the extent permitted by applicable law.",
    ] },
    { h: "9. Intellectual Property", lines: ["Rights to the Service's design, code, and compilations belong to the operator. Rights to game-related names and images such as Pokémon and Pokémon GO belong to their respective owners; the Service handles related information for informational purposes."] },
    { h: "10. Governing Law & Jurisdiction", lines: ["These terms are governed by the laws of the Republic of Korea, and disputes are resolved by the competent court under applicable law."] },
  ],
  contactHead: "11. Contact",
  contactSuffix: "For questions about these terms or the Service:",
  contactPageLink: "Contact page",
  changeNote: "These terms may change in accordance with applicable laws and policies; any changes will be announced on this page.",
};

const ja: TermsDict = {
  title: "利用規約",
  effectiveLabel: "施行日",
  articles: [
    { h: "第1条 (目的・適用)", lines: ["本規約は GBL Note(以下「本サービス」、gblnote.com)の利用条件と、利用者・運営者の権利・義務を定めます。本サービスを利用した場合、本規約に同意したものとみなします。"] },
    { h: "第2条 (サービス内容)", lines: ["本サービスは、ポケモンGOバトルリーグ(GBL)に関する対戦相手の記録・照会、実測メタ統計、ティア・技・カウンター情報などを提供する無料のWebサービスです。一部のコンテンツはログインなしで利用できます。"] },
    { h: "第3条 (アカウント)", lines: [
      "• 利用者は正確な情報で登録し、アカウント情報(パスワード等)を自ら安全に管理する責任を負います。",
      "• 一つのアカウントを複数人で共有することは制限される場合があります。",
      "• 利用者はいつでも退会でき、退会時にアカウント・記録は破棄されます。",
    ] },
    { h: "第4条 (利用者の義務・禁止行為)", lines: [
      "利用者は次の行為をしてはなりません。",
      "• 虚偽・改ざんデータを大量に入力し統計を歪める行為",
      "• 他人のなりすまし、他人の個人情報の無断収集・掲載",
      "• 自動化された方法でサービスを過度に照会・収集し、またはサーバーに負荷をかける行為",
      "• サービス運営を妨害し、または関連法令に違反する行為",
      "違反時、運営者は事前通知なく利用を制限し、またはアカウントを停止・削除することがあります。",
    ] },
    { h: "第5条 (利用者コンテンツ)", lines: ["利用者が入力した対戦記録の権利は利用者に帰属します。ただし利用者は、本サービスが当該データを個人を識別する情報を除いた匿名統計(実測メタ等)として加工・表示することに同意します。個別の記録は本人のみが閲覧できます。"] },
    { h: "第6条 (広告)", lines: ["本サービスは運営のため、Google AdSense、楽天/Coupangパートナー等の広告・アフィリエイトリンクを掲載することがあります。広告およびアフィリエイト商品の内容・取引についての責任は各広告主・販売者にあります。詳細はプライバシーポリシーをご確認ください。"] },
    { h: "第7条 (サービスの提供・変更・中断)", lines: ["本サービスは無料で提供され、運営者は必要に応じて内容を変更・中断できます。利用者は自身のデータを自らバックアップする責任を負い、サービスの中断・障害によるデータ損失について、運営者は故意・重過失がない限り責任を負いません。"] },
    { h: "第8条 (免責)", lines: [
      "• 本サービスが提供する統計・ティア・技情報等は参考用であり、正確性・完全性を保証しません。",
      "• 無料サービスとして、運営者は関連法令が許す範囲で、サービス利用により生じた損害について責任を負いません。",
    ] },
    { h: "第9条 (知的財産権)", lines: ["本サービスのデザイン・コード・編集物に関する権利は運営者に帰属します。ポケモン(Pokémon)、ポケモンGO等のゲーム関連の名称・画像の権利は各権利者に帰属し、本サービスは関連情報を情報提供目的で取り扱います。"] },
    { h: "第10条 (準拠法・管轄)", lines: ["本規約は大韓民国法を準拠法とし、紛争は関連法令に基づく管轄裁判所で解決します。"] },
  ],
  contactHead: "第11条 (お問い合わせ)",
  contactSuffix: "規約・サービスに関するお問い合わせ:",
  contactPageLink: "お問い合わせページ",
  changeNote: "本規約は関連法令・方針に応じて変更されることがあり、変更時は本ページにて告知します。",
};

const TERMS = { ko, en, ja } as const;
export function getTerms(lang: string): TermsDict {
  return (TERMS as Record<string, TermsDict>)[lang] || ko;
}
