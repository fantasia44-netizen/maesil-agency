// 개인정보처리방침 3개국어 사전(페이지 co-located).
export type PrivacyDict = {
  title: string;
  effectiveLabel: string;
  intro: string;
  s1h: string; s1: string[];
  s2h: string; s2: string[];
  s3h: string; s3: string[];
  s4h: string; s4intro: string; s4providers: string;
  s4gaPre: string; s4gaLink: string; s4gaPost: string;
  s4adsPre: string; s4adsLink: string; s4adsPost: string;
  s4coupang: string; s4cookie: string;
  s5h: string; s5: string[];
  contactHead: string; contactSuffix: string;
  changeNote: string; termsLink: string;
};

const ko: PrivacyDict = {
  title: "개인정보처리방침",
  effectiveLabel: "시행일",
  intro: "GBL Note(이하 “서비스”)는 이용자의 개인정보를 중요하게 생각하며, 아래와 같이 수집·이용·보관합니다. 본 방침은 서비스(gblnote.com) 이용자에게 적용됩니다.",
  s1h: "1. 수집하는 항목",
  s1: [
    "• 계정: 이메일 주소, 비밀번호(암호화 저장), 닉네임(선택). 구글 로그인 시 구글이 제공하는 이메일·프로필.",
    "• 이용 기록: 이용자가 직접 입력한 포켓몬 GO GBL 대전 메모(상대 이름, 사용 포켓몬·기술, 메모 등)",
    "• 자동 수집: 접속 로그, 쿠키 및 유사기술(로그인 유지·광고·분석), 기기·브라우저 정보, 대략적 접속 지역",
  ],
  s2h: "2. 이용 목적",
  s2: ["• 회원 식별 및 로그인 유지", "• 이용자가 입력한 대전 기록의 저장·조회 기능 제공", "• 서비스 개선, 방문 통계 분석, 오류 대응", "• 광고 제공 및 서비스 운영"],
  s3h: "3. 보관 및 파기",
  s3: [
    "개인정보는 회원 탈퇴 또는 삭제 요청 시까지 보관하며, 요청 시 지체 없이 파기합니다. 개별 대전 기록(상대 이름·메모 등)은 해당 이용자 본인만 조회할 수 있으며, 다른 이용자에게 공개되지 않습니다.",
    "단, 서비스는 전체 이용자의 대전 데이터를 개인 식별정보를 제거한 익명 통계(포켓몬·덱 사용률 등)로 가공하여 공개 메타 페이지에 표시할 수 있습니다. 이 통계에는 상대 이름·이용자 정보 등 개인을 식별할 수 있는 내용이 포함되지 않습니다.",
  ],
  s4h: "4. 제3자 처리 위탁 및 쿠키",
  s4intro: "서비스는 개인정보를 외부에 판매하지 않습니다. 다만 아래 제공자를 통해 데이터가 처리되며, 각 제공자는 쿠키·식별자를 사용할 수 있습니다.",
  s4providers: "• Supabase(데이터 저장), Render(서버 호스팅), Cloudflare(도메인·네트워크)",
  s4gaPre: "• Google Analytics(방문 통계): 방문·페이지뷰·기기·대략적 지역 등을 익명 집계합니다. 이용자는 ",
  s4gaLink: "Google 애널리틱스 차단 도구",
  s4gaPost: "로 거부할 수 있습니다.",
  s4adsPre: "• Google AdSense(광고): 맞춤 광고를 위해 쿠키가 사용될 수 있습니다. 이용자는 ",
  s4adsLink: "Google 광고 설정",
  s4adsPost: "에서 관리·거부할 수 있습니다.",
  s4coupang: "• 쿠팡 파트너스(제휴 광고): 서비스에는 쿠팡 파트너스 제휴 링크·배너가 포함될 수 있으며, 이를 통해 쿠팡의 쿠키가 설정될 수 있습니다. 이 배너 노출·클릭에 따라 서비스는 일정액의 수수료를 제공받습니다.",
  s4cookie: "이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 이 경우 로그인 유지 등 일부 기능이 제한될 수 있습니다.",
  s5h: "5. 이용자의 권리",
  s5: ["이용자는 언제든 본인의 개인정보 열람·수정·삭제 및 처리 정지를 요청할 수 있습니다. 계정·데이터 삭제를 원하시면 아래 연락처로 요청해 주세요."],
  contactHead: "6. 문의처",
  contactSuffix: "개인정보 관련 문의:",
  changeNote: "본 방침은 관련 법령 및 서비스 정책에 따라 변경될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.",
  termsLink: "이용약관",
};

const en: PrivacyDict = {
  title: "Privacy Policy",
  effectiveLabel: "Effective date",
  intro: "GBL Note (the “Service”) values your privacy and collects, uses, and stores personal data as described below. This policy applies to users of the Service (gblnote.com).",
  s1h: "1. Information We Collect",
  s1: [
    "• Account: email address, password (stored encrypted), nickname (optional). With Google sign-in, the email and profile Google provides.",
    "• Usage records: Pokémon GO GBL battle notes you enter yourself (opponent name, Pokémon/moves used, memos, etc.)",
    "• Automatically collected: access logs, cookies and similar technologies (login sessions, ads, analytics), device/browser info, approximate location.",
  ],
  s2h: "2. Purposes of Use",
  s2: ["• Identifying members and maintaining login sessions", "• Providing storage and lookup of the battle records you enter", "• Improving the Service, analyzing visit statistics, handling errors", "• Serving ads and operating the Service"],
  s3h: "3. Retention & Deletion",
  s3: [
    "Personal data is retained until you delete your account or request deletion, and is destroyed without delay upon request. Individual battle records (opponent names, memos, etc.) are visible only to you and are not disclosed to other users.",
    "However, the Service may process all users' battle data into anonymous statistics with personal identifiers removed (e.g., Pokémon/deck usage rates) and display them on public meta pages. These statistics contain nothing that could identify an individual, such as opponent names or user information.",
  ],
  s4h: "4. Third-Party Processing & Cookies",
  s4intro: "The Service does not sell personal data to third parties. However, data is processed through the providers below, each of which may use cookies/identifiers.",
  s4providers: "• Supabase (data storage), Render (server hosting), Cloudflare (domain/network)",
  s4gaPre: "• Google Analytics (visit statistics): anonymously aggregates visits, pageviews, device, and approximate region. You can opt out with the ",
  s4gaLink: "Google Analytics Opt-out add-on",
  s4gaPost: ".",
  s4adsPre: "• Google AdSense (ads): cookies may be used for personalized ads. You can manage or opt out in ",
  s4adsLink: "Google Ads Settings",
  s4adsPost: ".",
  s4coupang: "• Coupang Partners (affiliate ads): the Service may include Coupang Partners affiliate links/banners, through which Coupang cookies may be set. The Service earns a commission based on impressions/clicks of these banners.",
  s4cookie: "You may refuse cookie storage in your browser settings, but some features such as staying logged in may then be limited.",
  s5h: "5. Your Rights",
  s5: ["You may request access to, correction or deletion of, or suspension of processing of your personal data at any time. To delete your account or data, please contact us at the address below."],
  contactHead: "6. Contact",
  contactSuffix: "For privacy inquiries:",
  changeNote: "This policy may change in accordance with applicable laws and Service policy; any changes will be announced on this page.",
  termsLink: "Terms of Service",
};

const ja: PrivacyDict = {
  title: "プライバシーポリシー",
  effectiveLabel: "施行日",
  intro: "GBL Note(以下「本サービス」)は利用者の個人情報を重要と考え、以下のとおり収集・利用・保管します。本方針は本サービス(gblnote.com)の利用者に適用されます。",
  s1h: "1. 収集する項目",
  s1: [
    "• アカウント: メールアドレス、パスワード(暗号化して保存)、ニックネーム(任意)。Googleログイン時はGoogleが提供するメール・プロフィール。",
    "• 利用記録: 利用者が自ら入力したポケモンGO GBLの対戦メモ(相手の名前、使用ポケモン・技、メモ等)",
    "• 自動収集: アクセスログ、Cookieおよび類似技術(ログイン維持・広告・分析)、端末・ブラウザ情報、おおよその接続地域",
  ],
  s2h: "2. 利用目的",
  s2: ["• 会員の識別およびログイン維持", "• 利用者が入力した対戦記録の保存・照会機能の提供", "• サービス改善、訪問統計の分析、エラー対応", "• 広告の提供およびサービス運営"],
  s3h: "3. 保管および破棄",
  s3: [
    "個人情報は退会または削除要請時まで保管し、要請時は遅滞なく破棄します。個別の対戦記録(相手の名前・メモ等)は当該利用者本人のみが閲覧でき、他の利用者には公開されません。",
    "ただし本サービスは、全利用者の対戦データを個人を識別する情報を除いた匿名統計(ポケモン・デッキ使用率等)に加工し、公開メタページに表示することがあります。この統計には相手の名前・利用者情報など個人を識別できる内容は含まれません。",
  ],
  s4h: "4. 第三者処理の委託およびCookie",
  s4intro: "本サービスは個人情報を外部に販売しません。ただし以下の提供者を通じてデータが処理され、各提供者はCookie・識別子を使用することがあります。",
  s4providers: "• Supabase(データ保存)、Render(サーバーホスティング)、Cloudflare(ドメイン・ネットワーク)",
  s4gaPre: "• Google Analytics(訪問統計): 訪問・ページビュー・端末・おおよその地域等を匿名で集計します。利用者は",
  s4gaLink: "Googleアナリティクス オプトアウト アドオン",
  s4gaPost: "で拒否できます。",
  s4adsPre: "• Google AdSense(広告): パーソナライズ広告のためCookieが使用される場合があります。利用者は",
  s4adsLink: "Google広告設定",
  s4adsPost: "で管理・拒否できます。",
  s4coupang: "• Coupangパートナー(アフィリエイト広告): 本サービスにはCoupangパートナーのアフィリエイトリンク・バナーが含まれる場合があり、これによりCoupangのCookieが設定されることがあります。このバナーの表示・クリックに応じて、本サービスは一定額の手数料を受け取ります。",
  s4cookie: "利用者はブラウザ設定でCookieの保存を拒否できますが、その場合ログイン維持など一部機能が制限されることがあります。",
  s5h: "5. 利用者の権利",
  s5: ["利用者はいつでも自身の個人情報の閲覧・訂正・削除および処理の停止を請求できます。アカウント・データの削除をご希望の場合は、下記の連絡先へご請求ください。"],
  contactHead: "6. お問い合わせ",
  contactSuffix: "個人情報に関するお問い合わせ:",
  changeNote: "本方針は関連法令およびサービス方針に応じて変更されることがあり、変更時は本ページにて告知します。",
  termsLink: "利用規約",
};

const PRIV = { ko, en, ja } as const;
export function getPrivacy(lang: string): PrivacyDict {
  return (PRIV as Record<string, PrivacyDict>)[lang] || ko;
}
