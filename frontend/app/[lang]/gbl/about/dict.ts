// GBL Note 소개(서버렌더 SEO) 문구(3개국어).
export type AboutDict = {
  h1: string;
  p1a: string; p1b: string; p1c: string;
  whatH: string;
  whatLogB: string; whatLogRest: string;
  whatRecordB: string; whatRecordRest: string;
  whatMetaB: string; whatMetaRest: string;
  dataH: string;
  dataA: string; dataB: string; dataC: string;
  usageH: string;
  usageA: string; usageB: string; usageC: string; usageLink: string; usageD: string;
  startCta: string;
  footerGuide: string; footerContact: string; footerPrivacy: string;
  metaTitle: string; metaDesc: string; ogTitle: string; ogDesc: string;
};

const ko: AboutDict = {
  h1: "GBL Note 소개",
  p1a: "GBL Note는 포켓몬 GO의 배틀리그(GBL·Go Battle League)를 즐기는 트레이너를 위한 ",
  p1b: "무료 서비스",
  p1c: "입니다. 배틀에서 만난 상대를 기록해두고, 다시 만났을 때 상대의 과거 파티와 기술을 몇 초 안에 확인할 수 있게 돕습니다.",
  whatH: "무엇을 할 수 있나요",
  whatLogB: "상대 기록",
  whatLogRest: " — 방금 만난 상대의 트레이너 이름, 사용 포켓몬 3마리, 기술, 메모를 남길 수 있습니다. 다음에 같은 상대를 만나면 이름 몇 글자만 검색해 과거 기록을 즉시 불러옵니다.",
  whatRecordB: "내 전적",
  whatRecordRest: " — 리그별 승패와 승률, 일자별 전적, 상대 덱별 전적을 한눈에 봅니다.",
  whatMetaB: "실측 메타 · 티어표",
  whatMetaRest: " — 로그인 없이도 볼 수 있는 공개 데이터입니다. 사용자들이 실제로 만난 상대를 익명 집계해 지금 리그에서 무엇을 많이 만나는지(실측 픽률), 어떤 포켓몬이 강한지(티어표), 각 포켓몬의 카운터를 제공합니다.",
  dataH: "데이터는 어떻게 만들어지나요",
  dataA: "실측 메타는 GBL Note 사용자들이 남긴 대전 기록에서 ",
  dataB: "개인 식별정보를 제거한 익명 통계",
  dataC: "로만 집계합니다. 티어와 추천 기술배치는 공개 전투 시뮬레이션 데이터를 기반으로 하며, 여기에 유저 실측 픽률을 함께 제공하는 것이 GBL Note의 특징입니다. 이론상 강한 포켓몬과 실제로 많이 만나는 포켓몬을 함께 볼 수 있습니다.",
  usageH: "이용 안내",
  usageA: "기록 기능은 무료이며, 서비스 운영을 위해 광고가 포함될 수 있습니다. GBL Note는 팬이 만든 ",
  usageB: "비공식",
  usageC: " 도구이며, Niantic · The Pokémon Company · Nintendo와 제휴하거나 이들의 공식 서비스가 아닙니다. ‘포켓몬(Pokémon)’ 및 관련 명칭·이미지의 모든 권리는 각 권리자에게 있습니다. 문의는 ",
  usageLink: "문의 페이지",
  usageD: "를 이용해 주세요.",
  startCta: "무료로 시작하기 →",
  footerGuide: "가이드", footerContact: "문의", footerPrivacy: "개인정보처리방침",
  metaTitle: "GBL Note 소개 — 포켓몬고 배틀 상대 기록 & 실측 메타",
  metaDesc: "GBL Note는 포켓몬 GO 배틀리그에서 만난 상대를 기록하고, 실제 유저 데이터로 리그 메타를 보여주는 무료 서비스입니다.",
  ogTitle: "GBL Note 소개", ogDesc: "포켓몬고 배틀 상대 기록 & 실측 메타",
};

const en: AboutDict = {
  h1: "About GBL Note",
  p1a: "GBL Note is a ",
  p1b: "free service",
  p1c: " for trainers who play the Pokémon GO Go Battle League (GBL). Log the opponents you meet in battle, and when you face them again, check their past teams and moves within seconds.",
  whatH: "What you can do",
  whatLogB: "Log opponents",
  whatLogRest: " — save the trainer name, three Pokémon, moves, and notes for an opponent you just faced. The next time you meet the same trainer, search a few letters of their name to instantly pull up your past record.",
  whatRecordB: "Your record",
  whatRecordRest: " — see wins, losses, and win rate by league, your record by day, and your record against each opponent deck at a glance.",
  whatMetaB: "Live meta · tier list",
  whatMetaRest: " — public data you can view without logging in. By anonymously aggregating the opponents that users actually faced, it shows what you meet most in the current league (live pick rate), which Pokémon are strong (tier list), and the counters for each Pokémon.",
  dataH: "How the data is built",
  dataA: "The live meta is aggregated only as ",
  dataB: "anonymized statistics with personal identifiers removed",
  dataC: ", drawn from the battle logs GBL Note users leave. Tiers and recommended movesets are based on public battle simulation data, and pairing that with users’ live pick rates is what makes GBL Note distinctive — you can see the theoretically strong Pokémon alongside the ones you actually meet most.",
  usageH: "Usage notes",
  usageA: "The logging features are free, and ads may be included to keep the service running. GBL Note is a fan-made ",
  usageB: "unofficial",
  usageC: " tool. It is not affiliated with, or an official service of, Niantic · The Pokémon Company · Nintendo. All rights to “Pokémon” and related names and images belong to their respective owners. For inquiries, please use the ",
  usageLink: "contact page",
  usageD: ".",
  startCta: "Start for free →",
  footerGuide: "Guide", footerContact: "Contact", footerPrivacy: "Privacy Policy",
  metaTitle: "About GBL Note — Pokémon GO Battle Opponent Log & Live Meta",
  metaDesc: "GBL Note is a free service that logs the opponents you meet in the Pokémon GO Battle League and shows the league meta from real user data.",
  ogTitle: "About GBL Note", ogDesc: "Pokémon GO battle opponent log & live meta",
};

const ja: AboutDict = {
  h1: "GBL Note について",
  p1a: "GBL Note は、ポケモン GO の GOバトルリーグ(GBL)を楽しむトレーナーのための",
  p1b: "無料サービス",
  p1c: "です。バトルで遭遇した相手を記録しておき、再戦したときに相手の過去のパーティや技を数秒で確認できるようにします。",
  whatH: "できること",
  whatLogB: "相手の記録",
  whatLogRest: " — 今遭遇した相手のトレーナー名、使用ポケモン3体、技、メモを残せます。次に同じ相手と会ったら、名前を数文字検索するだけで過去の記録をすぐ呼び出せます。",
  whatRecordB: "自分の戦績",
  whatRecordRest: " — リーグ別の勝敗と勝率、日付別の戦績、相手デッキ別の戦績をひと目で確認できます。",
  whatMetaB: "実測メタ · ティア表",
  whatMetaRest: " — ログインなしでも見られる公開データです。利用者が実際に遭遇した相手を匿名で集計し、今のリーグで何によく会うか(実測ピック率)、どのポケモンが強いか(ティア表)、各ポケモンのカウンターを提供します。",
  dataH: "データはどう作られるか",
  dataA: "実測メタは、GBL Note 利用者が残した対戦記録から",
  dataB: "個人を識別できる情報を除いた匿名統計",
  dataC: "としてのみ集計しています。ティアと推奨技構成は公開の戦闘シミュレーションデータに基づき、そこにユーザーの実測ピック率を併せて提供するのが GBL Note の特徴です。理論上強いポケモンと、実際によく遭遇するポケモンを一緒に確認できます。",
  usageH: "ご利用にあたって",
  usageA: "記録機能は無料で、サービス運営のため広告が含まれる場合があります。GBL Note はファンが作った",
  usageB: "非公式",
  usageC: "ツールであり、Niantic · The Pokémon Company · Nintendo と提携しておらず、これらの公式サービスではありません。「ポケモン(Pokémon)」および関連する名称・画像のすべての権利は各権利者に帰属します。お問い合わせは",
  usageLink: "お問い合わせページ",
  usageD: "をご利用ください。",
  startCta: "無料で始める →",
  footerGuide: "ガイド", footerContact: "お問い合わせ", footerPrivacy: "プライバシーポリシー",
  metaTitle: "GBL Note について — ポケモンGO バトル相手の記録 & 実測メタ",
  metaDesc: "GBL Note は、ポケモン GO バトルリーグで遭遇した相手を記録し、実際のユーザーデータでリーグのメタを見せる無料サービスです。",
  ogTitle: "GBL Note について", ogDesc: "ポケモンGO バトル相手の記録 & 実測メタ",
};

const zhTW: AboutDict = {
  h1: "GBL Note 介紹",
  p1a: "GBL Note 是為享受寶可夢 GO 對戰聯盟(GBL·Go Battle League)的訓練家準備的 ",
  p1b: "免費服務",
  p1c: "。幫您記錄對戰中遇到的對手，再次相遇時可在幾秒內確認對手過去的隊伍與招式。",
  whatH: "可以做什麼",
  whatLogB: "對手記錄",
  whatLogRest: " — 可記下剛遇到的對手訓練家名稱、使用的 3 隻寶可夢、招式、備註。下次再遇到同一對手，只要搜尋名字幾個字就能立即叫出過去記錄。",
  whatRecordB: "我的戰績",
  whatRecordRest: " — 一眼看出各聯盟的勝負與勝率、每日戰績、對各對手隊伍的戰績。",
  whatMetaB: "實測環境 · 強度表",
  whatMetaRest: " — 無需登入即可查看的公開資料。將使用者實際遇到的對手匿名彙整，提供現在聯盟最常遇到什麼（實測使用率）、哪些寶可夢強勢（強度表）、各寶可夢的剋星。",
  dataH: "資料是怎麼產生的",
  dataA: "實測環境僅以 GBL Note 使用者留下的對戰記錄中 ",
  dataB: "去除個人識別資訊的匿名統計",
  dataC: " 彙整。強度與推薦招式配置以公開對戰模擬資料為基礎，並一併提供玩家實測使用率，這是 GBL Note 的特色。可同時比較理論上強勢與實際常遇到的寶可夢。",
  usageH: "使用說明",
  usageA: "記錄功能免費，為維持服務營運可能包含廣告。GBL Note 是粉絲製作的 ",
  usageB: "非官方",
  usageC: " 工具，與 Niantic · The Pokémon Company · Nintendo 無合作，也非其官方服務。『寶可夢(Pokémon)』及相關名稱·圖像之所有權利屬於各權利方。聯絡請使用 ",
  usageLink: "聯絡頁面",
  usageD: "。",
  startCta: "免費開始 →",
  footerGuide: "攻略", footerContact: "聯絡", footerPrivacy: "隱私權政策",
  metaTitle: "GBL Note 介紹 — 寶可夢GO 對戰對手記錄 & 實測環境",
  metaDesc: "GBL Note 是記錄寶可夢 GO 對戰聯盟遇到的對手，並以真實玩家資料呈現聯盟環境的免費服務。",
  ogTitle: "GBL Note 介紹", ogDesc: "寶可夢GO 對戰對手記錄 & 實測環境",
};

const A = { ko, en, ja, "zh-TW": zhTW } as const;
export function getAbout(lang: string): AboutDict {
  return (A as Record<string, AboutDict>)[lang] || ko;
}
