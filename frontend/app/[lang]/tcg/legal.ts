// TCG Note 정책·소개 문서(개인정보·약관·소개) 4개국어. AdSense 심사 필수 문서.
// 소개(About)는 사이트 독창성·데이터 출처·방법론을 명시 → 심사 신뢰 + 저작권 안전(출처 표기).
import { type Locale } from "../../../lib/i18n";

export type LegalDoc = { title: string; desc: string; updated: string; sections: { h: string; body: string[] }[] };
export const UPDATED = "2026-09-09";

export const PRIVACY: Record<Locale, LegalDoc> = {
  ko: {
    title: "개인정보처리방침", desc: "TCG Note 개인정보처리방침 — 수집 항목·쿠키·광고·분석 도구 안내.", updated: UPDATED,
    sections: [
      { h: "1. 개요", body: ["TCG Note(tcgnote.net, 이하 '서비스')는 포켓몬 카드 게임 Pocket 관련 정보를 제공하는 팬 제작 비공식 사이트입니다. 회원가입·로그인이 없으며 이름·이메일 등 개인정보를 직접 수집하지 않습니다."] },
      { h: "2. 수집 정보", body: ["서비스는 방문 분석과 광고 제공을 위해 제3자 도구를 통해 비식별 이용 데이터(페이지 조회, 기기·브라우저 유형, 대략적 지역, 유입 경로 등)를 처리할 수 있습니다. 이 데이터는 개인을 특정하지 않습니다."] },
      { h: "3. 쿠키와 제3자", body: [
        "• Google Analytics: 방문 통계를 위해 쿠키를 사용할 수 있습니다.",
        "• Google AdSense: 광고 제공을 위해 쿠키가 설정될 수 있으며, 구글 및 광고 파트너가 이전 방문 기록에 기반한 맞춤 광고를 제공할 수 있습니다.",
        "광고 개인 맞춤 설정은 구글 광고 설정(google.com/settings/ads)에서 관리할 수 있습니다.",
      ] },
      { h: "4. 이용자 권리", body: ["브라우저 설정에서 쿠키를 차단·삭제할 수 있습니다. 서비스는 개인정보를 직접 저장하지 않으므로 열람·삭제 요청 대상 데이터가 없습니다. 문의는 support@maesil-insight.com 또는 '문의' 페이지로 주세요."] },
      { h: "5. 변경", body: ["본 방침은 필요 시 개정될 수 있으며, 개정 시 본 페이지에 게시합니다."] },
    ],
  },
  en: {
    title: "Privacy Policy", desc: "TCG Note privacy policy — data collected, cookies, ads and analytics.", updated: UPDATED,
    sections: [
      { h: "1. Overview", body: ["TCG Note (tcgnote.net, the 'Service') is an unofficial fan-made site providing Pokémon TCG Pocket information. There is no sign-up or login, and we do not directly collect personal data such as name or email."] },
      { h: "2. Data collected", body: ["For traffic analysis and advertising, the Service may process non-identifying usage data (page views, device/browser type, approximate region, referrer) via third-party tools. This data does not identify individuals."] },
      { h: "3. Cookies & third parties", body: [
        "• Google Analytics: may use cookies for visit statistics.",
        "• Google AdSense: cookies may be set to serve ads; Google and ad partners may show personalized ads based on prior visits.",
        "You can manage ad personalization at Google Ads Settings (google.com/settings/ads).",
      ] },
      { h: "4. Your rights", body: ["You can block or delete cookies in your browser settings. As the Service does not store personal data directly, there is no personal data to access or delete. For questions, email support@maesil-insight.com or use the 'Contact' page."] },
      { h: "5. Changes", body: ["This policy may be updated; changes are posted on this page."] },
    ],
  },
  ja: {
    title: "プライバシーポリシー", desc: "TCG Note プライバシーポリシー — 収集情報・クッキー・広告・分析ツール。", updated: UPDATED,
    sections: [
      { h: "1. 概要", body: ["TCG Note(tcgnote.net、以下「本サービス」)はポケモンカードゲーム Pocket 情報を提供するファン制作の非公式サイトです。会員登録・ログインはなく、氏名・メール等の個人情報を直接収集しません。"] },
      { h: "2. 収集する情報", body: ["アクセス解析と広告配信のため、第三者ツールを通じて非識別の利用データ(ページ閲覧、端末・ブラウザ種別、おおよその地域、参照元など)を処理する場合があります。個人を特定しません。"] },
      { h: "3. クッキーと第三者", body: [
        "• Google Analytics: 訪問統計のためクッキーを使用する場合があります。",
        "• Google AdSense: 広告配信のためクッキーが設定され、Googleおよび広告パートナーが過去の訪問に基づく広告を表示する場合があります。",
        "広告のパーソナライズはGoogle広告設定(google.com/settings/ads)で管理できます。",
      ] },
      { h: "4. 利用者の権利", body: ["ブラウザ設定でクッキーを拒否・削除できます。本サービスは個人情報を直接保存しないため、開示・削除の対象データはありません。ご質問は support@maesil-insight.com または「お問い合わせ」ページまで。"] },
      { h: "5. 変更", body: ["本方針は必要に応じて改定し、改定時は本ページに掲載します。"] },
    ],
  },
  "zh-TW": {
    title: "隱私權政策", desc: "TCG Note 隱私權政策 — 蒐集項目·Cookie·廣告·分析工具。", updated: UPDATED,
    sections: [
      { h: "1. 概述", body: ["TCG Note(tcgnote.net，以下稱「本服務」)為提供寶可夢集換式卡牌 Pocket 資訊的粉絲製作非官方網站。無註冊·登入，且不直接蒐集姓名·電子郵件等個人資料。"] },
      { h: "2. 蒐集資訊", body: ["為流量分析與廣告投放，本服務可能透過第三方工具處理非識別性使用資料(頁面瀏覽、裝置·瀏覽器類型、大致地區、來源等)。此資料不識別個人。"] },
      { h: "3. Cookie 與第三方", body: [
        "• Google Analytics：可能使用 Cookie 進行造訪統計。",
        "• Google AdSense：可能設定 Cookie 以投放廣告，Google 及廣告夥伴可能依過往造訪顯示個人化廣告。",
        "廣告個人化可於 Google 廣告設定(google.com/settings/ads)管理。",
      ] },
      { h: "4. 您的權利", body: ["可於瀏覽器設定封鎖·刪除 Cookie。本服務不直接儲存個人資料，故無可查閱·刪除之個資。有問題請寄 support@maesil-insight.com 或使用「聯絡」頁面。"] },
      { h: "5. 變更", body: ["本政策可能更新，更新時公布於本頁。"] },
    ],
  },
};

export const TERMS: Record<Locale, LegalDoc> = {
  ko: {
    title: "이용약관", desc: "TCG Note 이용약관 — 이용 조건·저작권·데이터 출처·면책.", updated: UPDATED,
    sections: [
      { h: "제1조 (성격)", body: ["TCG Note는 포켓몬 카드 게임 Pocket 관련 정보를 제공하는 팬 제작 비공식 사이트입니다. The Pokémon Company·Nintendo·DeNA와 무관하며 공식 서비스가 아닙니다."] },
      { h: "제2조 (지식재산권)", body: ["'포켓몬', 카드 명칭·이미지 등은 각 권리자(Nintendo/Creatures/GAME FREAK/The Pokémon Company)의 자산입니다. 본 서비스는 정보 제공 목적의 팬사이트로서 이를 명시합니다."] },
      { h: "제3조 (데이터 출처)", body: ["덱 통계(점유율·승률·매치업)는 Limitless TCG(play.limitlesstcg.com)의 공개 대회 데이터를 본 서비스가 자체 집계·계산한 것입니다. 원 통계 출처는 Limitless TCG이며 각 페이지에 표기합니다. 카드 데이터는 커뮤니티 공개 데이터셋을 이용합니다."] },
      { h: "제4조 (면책)", body: ["제공되는 통계·공략은 참고용이며 정확성·최신성을 보증하지 않습니다. 게임 내 실제 결과와 다를 수 있습니다."] },
      { h: "제5조 (광고)", body: ["서비스는 운영을 위해 Google AdSense 등 광고를 게재할 수 있습니다. 광고 내용의 책임은 각 광고주에게 있습니다."] },
    ],
  },
  en: {
    title: "Terms of Use", desc: "TCG Note terms — usage, intellectual property, data sources, disclaimer.", updated: UPDATED,
    sections: [
      { h: "1. Nature", body: ["TCG Note is an unofficial fan-made site providing Pokémon TCG Pocket information. It is not affiliated with The Pokémon Company, Nintendo or DeNA, and is not an official service."] },
      { h: "2. Intellectual property", body: ["'Pokémon', card names and images are the property of their respective owners (Nintendo/Creatures/GAME FREAK/The Pokémon Company). This Service is an informational fan site and acknowledges this."] },
      { h: "3. Data sources", body: ["Deck statistics (share, win rate, matchups) are aggregated and computed by us from public tournament data on Limitless TCG (play.limitlesstcg.com). The underlying statistics originate from Limitless TCG, attributed on each page. Card data uses a community open dataset."] },
      { h: "4. Disclaimer", body: ["Statistics and guides are for reference only; accuracy and currency are not guaranteed and may differ from in-game results."] },
      { h: "5. Advertising", body: ["The Service may display advertising such as Google AdSense to fund operations. Responsibility for ad content lies with the respective advertisers."] },
    ],
  },
  ja: {
    title: "利用規約", desc: "TCG Note 利用規約 — 利用条件·著作権·データ出典·免責。", updated: UPDATED,
    sections: [
      { h: "第1条 (性格)", body: ["TCG Note はポケモンカードゲーム Pocket 情報を提供するファン制作の非公式サイトです。株式会社ポケモン・任天堂・DeNA とは無関係で、公式サービスではありません。"] },
      { h: "第2条 (知的財産権)", body: ["「ポケモン」、カード名称·画像等は各権利者(任天堂/クリーチャーズ/ゲームフリーク/株式会社ポケモン)の資産です。本サービスは情報提供目的のファンサイトとしてこれを明記します。"] },
      { h: "第3条 (データ出典)", body: ["デッキ統計(使用率·勝率·相性)は Limitless TCG(play.limitlesstcg.com)の公開大会データを本サービスが自前で集計·計算したものです。元統計の出典は Limitless TCG で、各ページに表記します。カードデータはコミュニティ公開データセットを利用します。"] },
      { h: "第4条 (免責)", body: ["提供する統計·攻略は参考用であり、正確性·最新性を保証しません。ゲーム内の実際の結果と異なる場合があります。"] },
      { h: "第5条 (広告)", body: ["本サービスは運営のため Google AdSense 等の広告を掲載する場合があります。広告内容の責任は各広告主にあります。"] },
    ],
  },
  "zh-TW": {
    title: "使用條款", desc: "TCG Note 使用條款 — 使用條件·著作權·數據來源·免責。", updated: UPDATED,
    sections: [
      { h: "第1條（性質）", body: ["TCG Note 為提供寶可夢集換式卡牌 Pocket 資訊的粉絲製作非官方網站。與 The Pokémon Company·任天堂·DeNA 無關，非官方服務。"] },
      { h: "第2條（智慧財產權）", body: ["「寶可夢」、卡片名稱·圖像等為各權利人(任天堂/Creatures/GAME FREAK/The Pokémon Company)之資產。本服務為資訊性粉絲網站並予以載明。"] },
      { h: "第3條（數據來源）", body: ["牌組統計(使用率·勝率·對戰)為本服務自 Limitless TCG(play.limitlesstcg.com)公開賽事數據自行彙整·計算。原始統計來源為 Limitless TCG，於各頁標示。卡片數據使用社群公開資料集。"] },
      { h: "第4條（免責）", body: ["所提供之統計·攻略僅供參考，不保證正確性·即時性，可能與遊戲內實際結果不同。"] },
      { h: "第5條（廣告）", body: ["本服務為營運可能刊登 Google AdSense 等廣告。廣告內容責任歸各廣告主。"] },
    ],
  },
};

export const ABOUT: Record<Locale, LegalDoc> = {
  ko: {
    title: "TCG Note 소개", desc: "TCG Note는 포켓몬 카드 게임 Pocket의 메타를 대회 데이터로 분석하는 팬 사이트입니다.", updated: UPDATED,
    sections: [
      { h: "무엇을 하는 곳인가", body: ["TCG Note는 포켓몬 카드 게임 Pocket(포켓포켓)의 메타를 '데이터'로 분석합니다. 감이나 개인 의견이 아니라, 실제 대회 결과를 집계한 점유율·승률·상성 통계 위에 원본 해석을 얹어 덱 티어와 공략을 제공합니다."] },
      { h: "어떻게 만드는가 (방법론)", body: [
        "• 덱 티어·통계: Limitless TCG의 공개 대회 결과(순위·대진)를 자체 집계해 점유율, 승률, 표본수, 상대별 매치업을 계산합니다. 표본이 적은 덱의 과대평가를 막기 위해 Wilson 95% 하한으로 티어를 보정합니다.",
        "• 대표 덱리스트: 각 아키타입에서 최고 성적을 낸 실제 대회 덱을 대표 리스트로 보여줍니다.",
        "• 공략 해석: 통계 위에 아키타입별 운영 전략을 직접 작성합니다.",
        "• 자동 갱신: 새 대회가 반영되면 통계가 재계산됩니다.",
      ] },
      { h: "출처와 권리", body: ["덱 통계의 원 출처는 Limitless TCG(play.limitlesstcg.com)이며 각 페이지에 표기합니다. 통계는 사실 데이터이며 본 서비스가 직접 계산해 원본 해석과 함께 제공합니다. 포켓몬 관련 명칭·이미지의 권리는 각 권리자에게 있으며, 본 사이트는 비공식 팬사이트입니다."] },
      { h: "연락처", body: ["문의·오류 제보·데이터 삭제 요청: support@maesil-insight.com (또는 사이트 하단 '문의' 페이지)."] },
    ],
  },
  en: {
    title: "About TCG Note", desc: "TCG Note is a fan site that analyzes the Pokémon TCG Pocket meta with tournament data.", updated: UPDATED,
    sections: [
      { h: "What this is", body: ["TCG Note analyzes the Pokémon TCG Pocket meta with data. Not gut feeling or opinion — we layer original interpretation on top of share, win-rate and matchup statistics aggregated from real tournament results, to provide deck tiers and guides."] },
      { h: "How we build it (methodology)", body: [
        "• Deck tiers & stats: we aggregate public tournament results (standings & pairings) from Limitless TCG to compute share, win rate, sample size and per-opponent matchups. Tiers use the Wilson 95% lower bound to avoid overrating small samples.",
        "• Representative decklists: for each archetype we show the actual best-performing tournament list.",
        "• Guide interpretation: we write archetype game plans ourselves on top of the stats.",
        "• Auto-update: statistics recompute as new tournaments are included.",
      ] },
      { h: "Sources & rights", body: ["The underlying deck statistics originate from Limitless TCG (play.limitlesstcg.com), attributed on each page. Statistics are factual data we compute ourselves and present with original interpretation. Pokémon names and images belong to their respective owners; this is an unofficial fan site."] },
      { h: "Contact", body: ["Inquiries, bug reports, data deletion requests: support@maesil-insight.com (or the 'Contact' page in the site footer)."] },
    ],
  },
  ja: {
    title: "TCG Note について", desc: "TCG Note はポケモンカードゲーム Pocket の環境を大会データで分析するファンサイトです。", updated: UPDATED,
    sections: [
      { h: "何をするサイトか", body: ["TCG Note はポケモンカードゲーム Pocket(ポケポケ)の環境を「データ」で分析します。感覚や個人の意見ではなく、実際の大会結果を集計した使用率·勝率·相性の統計の上に独自の解釈を加え、デッキティアと攻略を提供します。"] },
      { h: "作り方(方法論)", body: [
        "• デッキティア·統計: Limitless TCG の公開大会結果(順位·対戦)を自前集計し、使用率·勝率·サンプル数·相手別相性を計算。サンプルが少ないデッキの過大評価を防ぐため Wilson 95%下限でティア補正。",
        "• 代表デッキリスト: 各アーキタイプで最高成績の実際の大会デッキを代表として表示。",
        "• 攻略解釈: 統計の上にアーキタイプ別の立ち回りを自ら執筆。",
        "• 自動更新: 新しい大会が反映されると統計が再計算されます。",
      ] },
      { h: "出典と権利", body: ["デッキ統計の元出典は Limitless TCG(play.limitlesstcg.com)で、各ページに表記します。統計は本サービスが自ら計算する事実データで、独自解釈と共に提供します。ポケモン関連の名称·画像の権利は各権利者に帰属し、本サイトは非公式ファンサイトです。"] },
      { h: "連絡先", body: ["お問い合わせ·不具合報告·データ削除依頼: support@maesil-insight.com(またはサイトフッターの「お問い合わせ」ページ)。"] },
    ],
  },
  "zh-TW": {
    title: "關於 TCG Note", desc: "TCG Note 是以賽事數據分析寶可夢集換式卡牌 Pocket 環境的粉絲網站。", updated: UPDATED,
    sections: [
      { h: "這是什麼", body: ["TCG Note 以「數據」分析寶可夢集換式卡牌 Pocket 的環境。並非憑感覺或個人意見，而是在彙整實際賽事結果的使用率·勝率·對戰統計之上，加入原創解讀，提供牌組強度與攻略。"] },
      { h: "如何製作（方法）", body: [
        "• 牌組強度·統計：自 Limitless TCG 公開賽事結果(排名·對戰)自行彙整，計算使用率·勝率·樣本數·對手別對戰。以 Wilson 95%下限修正，避免小樣本被高估。",
        "• 代表牌組：每個牌型顯示最佳成績的實際賽事牌表。",
        "• 攻略解讀：在統計之上自行撰寫各牌型操作策略。",
        "• 自動更新：新賽事納入後統計即重新計算。",
      ] },
      { h: "來源與權利", body: ["牌組統計原始來源為 Limitless TCG(play.limitlesstcg.com)，於各頁標示。統計為本服務自行計算之事實數據，並附原創解讀。寶可夢相關名稱·圖像權利歸各權利人所有，本站為非官方粉絲網站。"] },
      { h: "聯絡", body: ["洽詢·錯誤回報·資料刪除請求：support@maesil-insight.com(或網站頁尾的「聯絡」頁面)。"] },
    ],
  },
};
