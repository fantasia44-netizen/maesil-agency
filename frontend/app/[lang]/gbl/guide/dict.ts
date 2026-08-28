// GBL 가이드 페이지 크롬(목록·아티클) 문구(3개국어).

// ── 가이드 목록(index) ──
export type GuideIndexDict = {
  back: string; h1: string; intro: string;
  dataPre: string; dataMeta: string; dataMid: string; dataTier: string; dataSuf: string;
  about: string; contact: string; privacy: string;
  metaTitle: string; metaDesc: string;
  keywords: string[]; ogTitle: string; ogDesc: string;
};

const idxKo: GuideIndexDict = {
  back: "← GBL Note",
  h1: "포켓몬고 GBL 가이드",
  intro: "포켓몬 GO 배틀리그(GBL)를 처음 시작하거나 승률을 올리고 싶은 분을 위한 가이드입니다. 기본기부터 파티 구성까지 차근차근 정리했습니다.",
  dataPre: "실전 데이터는 ", dataMeta: "실측 메타", dataMid: " · ", dataTier: "티어표", dataSuf: "에서.",
  about: "소개", contact: "문의", privacy: "개인정보처리방침",
  metaTitle: "포켓몬고 GBL 가이드 — 입문·리그·IV·파티 | GBL Note",
  metaDesc: "포켓몬 GO 배틀리그(GBL) 입문부터 리그별 CP 제한, 개체값(IV) 최적화, 파티 구성법까지. 초보자를 위한 가이드 모음.",
  keywords: ["포켓몬고 GBL 가이드", "배틀리그 입문", "포켓몬고 PVP 가이드", "GBL 하는법"],
  ogTitle: "포켓몬고 GBL 가이드", ogDesc: "입문·리그·IV·파티 구성 가이드",
};

const idxEn: GuideIndexDict = {
  back: "← GBL Note",
  h1: "Pokémon GO GBL Guides",
  intro: "Guides for anyone just starting Pokémon GO's Go Battle League (GBL) or looking to raise their win rate. We cover everything from the fundamentals to team building, step by step.",
  dataPre: "For live data, see the ", dataMeta: "live meta", dataMid: " and ", dataTier: "tier list", dataSuf: ".",
  about: "About", contact: "Contact", privacy: "Privacy Policy",
  metaTitle: "Pokémon GO GBL Guides — Basics, Leagues, IVs | GBL Note",
  metaDesc: "From getting started in the Pokémon GO Go Battle League (GBL) to CP limits by league, IV optimization, and team building. A guide collection for beginners.",
  keywords: ["Pokémon GO GBL guide", "Go Battle League beginner", "Pokémon GO PvP guide", "how to play GBL"],
  ogTitle: "Pokémon GO GBL Guides", ogDesc: "Guides on basics, leagues, IVs, and team building",
};

const idxJa: GuideIndexDict = {
  back: "← GBL Note",
  h1: "ポケモンGO GBLガイド",
  intro: "ポケモンGOのGOバトルリーグ(GBL)を初めて始める方や、勝率を上げたい方のためのガイドです。基本からパーティ構成まで、順を追って整理しました。",
  dataPre: "実戦データは", dataMeta: "実測メタ", dataMid: " · ", dataTier: "ティア表", dataSuf: "で。",
  about: "紹介", contact: "お問い合わせ", privacy: "プライバシーポリシー",
  metaTitle: "ポケモンGO GBLガイド — 入門・リーグ・IV・パーティ | GBL Note",
  metaDesc: "ポケモンGOのGOバトルリーグ(GBL)の入門から、リーグ別CP制限、個体値(IV)最適化、パーティ構成法まで。初心者向けのガイド集。",
  keywords: ["ポケモンGO GBLガイド", "GOバトルリーグ 入門", "ポケモンGO PvP ガイド", "GBL やり方"],
  ogTitle: "ポケモンGO GBLガイド", ogDesc: "入門・リーグ・IV・パーティ構成ガイド",
};

const idxZhTW: GuideIndexDict = {
  back: "← GBL Note",
  h1: "寶可夢GO GBL 攻略",
  intro: "為剛開始玩寶可夢 GO 對戰聯盟(GBL)或想提升勝率的人準備的攻略。從基礎到隊伍組建，循序整理。",
  dataPre: "實戰資料在 ", dataMeta: "實測環境", dataMid: " · ", dataTier: "強度表", dataSuf: "。",
  about: "關於", contact: "聯絡", privacy: "隱私權政策",
  metaTitle: "寶可夢GO GBL 攻略 — 入門·聯盟·IV·隊伍 | GBL Note",
  metaDesc: "寶可夢 GO 對戰聯盟(GBL) 從入門到各聯盟 CP 限制、個體值(IV)最佳化、隊伍組建法。給新手的攻略合集。",
  keywords: ["寶可夢GO GBL 攻略", "對戰聯盟入門", "寶可夢GO PVP 攻略", "GBL 怎麼玩"],
  ogTitle: "寶可夢GO GBL 攻略", ogDesc: "入門·聯盟·IV·隊伍組建攻略",
};

const IDX = { ko: idxKo, en: idxEn, ja: idxJa, "zh-TW": idxZhTW } as const;
export function getGuideIndex(lang: string): GuideIndexDict {
  return (IDX as Record<string, GuideIndexDict>)[lang] || idxKo;
}

// ── 가이드 아티클(article) 크롬 ──
export type GuideArticleDict = {
  back: string; listNav: string; titleSuffix: string;
  updatedPre: string; updatedSuf: string;
  othersH: string;
  metaPre: string; metaMeta: string; metaMid: string; metaTier: string; metaSuf: string;
  privacy: string;
};

const artKo: GuideArticleDict = {
  back: "← GBL Note", listNav: "📖 가이드 목록", titleSuffix: " | GBL Note",
  updatedPre: "업데이트 ", updatedSuf: " · GBL Note 가이드",
  othersH: "다른 가이드",
  metaPre: "지금 리그 메타가 궁금하다면 ", metaMeta: "실측 메타", metaMid: " · ", metaTier: "티어표", metaSuf: "를 확인하세요.",
  privacy: "개인정보처리방침",
};

const artEn: GuideArticleDict = {
  back: "← GBL Note", listNav: "📖 All guides", titleSuffix: " | GBL Note",
  updatedPre: "Updated ", updatedSuf: " · GBL Note guide",
  othersH: "Other guides",
  metaPre: "Curious about the current league meta? Check the ", metaMeta: "live meta", metaMid: " and ", metaTier: "tier list", metaSuf: ".",
  privacy: "Privacy Policy",
};

const artJa: GuideArticleDict = {
  back: "← GBL Note", listNav: "📖 ガイド一覧", titleSuffix: " | GBL Note",
  updatedPre: "更新 ", updatedSuf: " · GBL Noteガイド",
  othersH: "他のガイド",
  metaPre: "今のリーグメタが気になるなら", metaMeta: "実測メタ", metaMid: " · ", metaTier: "ティア表", metaSuf: "を確認しましょう。",
  privacy: "プライバシーポリシー",
};

const artZhTW: GuideArticleDict = {
  back: "← GBL Note", listNav: "📖 攻略列表", titleSuffix: " | GBL Note",
  updatedPre: "更新 ", updatedSuf: " · GBL Note 攻略",
  othersH: "其他攻略",
  metaPre: "想了解現在的聯盟環境，請看 ", metaMeta: "實測環境", metaMid: " · ", metaTier: "強度表", metaSuf: "。",
  privacy: "隱私權政策",
};

const ART = { ko: artKo, en: artEn, ja: artJa, "zh-TW": artZhTW } as const;
export function getGuideArticle(lang: string): GuideArticleDict {
  return (ART as Record<string, GuideArticleDict>)[lang] || artKo;
}
