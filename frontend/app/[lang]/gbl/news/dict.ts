// 뉴스(/gbl/news) 화면 문구 — 4개국어. 글 본문은 posts.ts.
import type { Locale } from "../../../../lib/i18n";
import type { Cat } from "./posts";

export type NewsDict = {
  navLabel: string; back: string; listNav: string;
  h1: string; intro: string; metaTitle: string; metaDesc: string; titleSuffix: string;
  cat: Record<Cat, string>;
  published: (d: string) => string; updated: (d: string) => string;
  toolsH: string; moreH: string; sourcesH: string; empty: string;
  // 자동 블록
  weakH: string; resistH: string; doubleWeak: string; upcoming: string; cpLabel: string; cpBoost: string; dexLink: string;
  colRank: string; colMon: string; colType: string; colMoves: string; colDps: string; colOverall: string;
  countersSub: string; raidTopSub: string;
  // 홈·RSS
  homeH: string; homeMore: string; rssTitle: string; rssDesc: string;
};

const ko: NewsDict = {
  navLabel: "뉴스", back: "← GBL Note", listNav: "뉴스 목록",
  h1: "포켓몬고 뉴스 · 공략",
  intro: "포켓몬 GO의 이벤트 소식과 레이드 보스 공략을 GBL Note 데이터와 함께 정리합니다. 글에 나오는 순위와 CP는 딜러 티어표·도감과 같은 데이터에서 가져옵니다.",
  metaTitle: "포켓몬고 뉴스 · 이벤트 소식 · 레이드 보스 공략 | GBL Note",
  metaDesc: "포켓몬 GO 이벤트 일정과 보상, 레이드 보스 약점·추천 딜러·100% CP, 신규 포켓몬 성능 분석을 GBL Note 데이터로 정리한 소식 모음.",
  titleSuffix: " | GBL Note",
  cat: { raid: "레이드 공략", event: "이벤트", analysis: "분석", battle: "배틀리그" },
  published: (d) => `${d} 작성`, updated: (d) => `${d} 수정`,
  toolsH: "함께 보면 좋은 도구", moreH: "다른 소식", sourcesH: "출처", empty: "아직 올라온 글이 없습니다.",
  weakH: "약점", resistH: "반감", doubleWeak: "이중 약점", upcoming: "출시 예정", cpLabel: "100% 개체 CP", cpBoost: "날씨 부스트", dexLink: "도감 보기 →",
  colRank: "순위", colMon: "포켓몬", colType: "공격 타입", colMoves: "추천 기술", colDps: "사이클 DPS", colOverall: "종합",
  countersSub: "딜러 티어표(레벨 40 · 개체값 15) 기준. 약점 타입 공격수를 합쳐 종합 점수 순으로 정렬했습니다.",
  raidTopSub: "딜러 티어표(레벨 40 · 개체값 15) 기준 종합 점수 순.",
  homeH: "최신 소식", homeMore: "뉴스 전체 →",
  rssTitle: "GBL Note — 포켓몬고 뉴스 · 공략", rssDesc: "포켓몬 GO 이벤트 소식과 레이드 보스 공략",
};

const en: NewsDict = {
  navLabel: "News", back: "← GBL Note", listNav: "All news",
  h1: "Pokémon GO News & Guides",
  intro: "Pokémon GO event news and raid boss guides, backed by GBL Note data. Rankings and CP values in each article come from the same data as the attacker tiers and the Pokédex pages.",
  metaTitle: "Pokémon GO News — Events & Raid Boss Guides | GBL Note",
  metaDesc: "Pokémon GO event schedules and rewards, raid boss weaknesses, best counters and 100% IV CP, and performance analysis of new Pokémon — all backed by GBL Note data.",
  titleSuffix: " | GBL Note",
  cat: { raid: "Raid guide", event: "Event", analysis: "Analysis", battle: "Battle League" },
  published: (d) => `Published ${d}`, updated: (d) => `Updated ${d}`,
  toolsH: "Related tools", moreH: "More news", sourcesH: "Sources", empty: "No articles yet.",
  weakH: "Weak to", resistH: "Resists", doubleWeak: "double weakness", upcoming: "Upcoming", cpLabel: "100% IV CP", cpBoost: "weather boosted", dexLink: "Pokédex page →",
  colRank: "Rank", colMon: "Pokémon", colType: "Attack type", colMoves: "Moveset", colDps: "Cycle DPS", colOverall: "Overall",
  countersSub: "From the attacker tiers (Level 40, 15 IVs). Attackers of every weakness type are merged and sorted by overall score.",
  raidTopSub: "From the attacker tiers (Level 40, 15 IVs), sorted by overall score.",
  homeH: "Latest news", homeMore: "All news →",
  rssTitle: "GBL Note — Pokémon GO News & Guides", rssDesc: "Pokémon GO event news and raid boss guides",
};

const ja: NewsDict = {
  navLabel: "ニュース", back: "← GBL Note", listNav: "ニュース一覧",
  h1: "ポケモンGO ニュース・攻略",
  intro: "ポケモンGOのイベント情報とレイドボス攻略を、GBL Noteのデータとあわせてまとめます。記事内の順位やCPは、アタッカーティアや図鑑と同じデータから取得しています。",
  metaTitle: "ポケモンGO ニュース · イベント情報 · レイドボス攻略 | GBL Note",
  metaDesc: "ポケモンGOのイベント日程と報酬、レイドボスの弱点・おすすめアタッカー・100%個体CP、新ポケモンの性能分析をGBL Noteのデータでまとめたニュース。",
  titleSuffix: " | GBL Note",
  cat: { raid: "レイド攻略", event: "イベント", analysis: "分析", battle: "バトルリーグ" },
  published: (d) => `${d} 公開`, updated: (d) => `${d} 更新`,
  toolsH: "あわせて使えるツール", moreH: "ほかのニュース", sourcesH: "出典", empty: "まだ記事がありません。",
  weakH: "弱点", resistH: "半減", doubleWeak: "二重弱点", upcoming: "実装予定", cpLabel: "100%個体CP", cpBoost: "天候ブースト", dexLink: "図鑑を見る →",
  colRank: "順位", colMon: "ポケモン", colType: "攻撃タイプ", colMoves: "おすすめ技", colDps: "サイクルDPS", colOverall: "総合",
  countersSub: "アタッカーティア(レベル40 · 個体値15)基準。弱点タイプのアタッカーをまとめ、総合スコア順に並べています。",
  raidTopSub: "アタッカーティア(レベル40 · 個体値15)基準の総合スコア順。",
  homeH: "最新ニュース", homeMore: "ニュース一覧 →",
  rssTitle: "GBL Note — ポケモンGO ニュース・攻略", rssDesc: "ポケモンGOのイベント情報とレイドボス攻略",
};

const zh: NewsDict = {
  navLabel: "新聞", back: "← GBL Note", listNav: "新聞列表",
  h1: "寶可夢GO 新聞 · 攻略",
  intro: "以 GBL Note 的資料整理寶可夢GO的活動消息與團體戰頭目攻略。文章中的排名與CP，取自與攻擊手排行、圖鑑相同的資料。",
  metaTitle: "寶可夢GO 新聞 · 活動消息 · 團體戰頭目攻略 | GBL Note",
  metaDesc: "以 GBL Note 資料整理寶可夢GO的活動時程與獎勵、團體戰頭目弱點·推薦攻擊手·100%個體CP，以及新寶可夢的性能分析。",
  titleSuffix: " | GBL Note",
  cat: { raid: "團體戰攻略", event: "活動", analysis: "分析", battle: "對戰聯盟" },
  published: (d) => `${d} 發布`, updated: (d) => `${d} 更新`,
  toolsH: "相關工具", moreH: "其他新聞", sourcesH: "資料來源", empty: "目前還沒有文章。",
  weakH: "弱點", resistH: "抵抗", doubleWeak: "雙重弱點", upcoming: "即將推出", cpLabel: "100%個體CP", cpBoost: "天氣加成", dexLink: "查看圖鑑 →",
  colRank: "排名", colMon: "寶可夢", colType: "攻擊屬性", colMoves: "推薦招式", colDps: "循環DPS", colOverall: "綜合",
  countersSub: "依攻擊手排行(等級40 · 個體值15)。合併各弱點屬性的攻擊手，依綜合評分排序。",
  raidTopSub: "依攻擊手排行(等級40 · 個體值15)的綜合評分排序。",
  homeH: "最新消息", homeMore: "全部新聞 →",
  rssTitle: "GBL Note — 寶可夢GO 新聞 · 攻略", rssDesc: "寶可夢GO活動消息與團體戰頭目攻略",
};

const D: Record<Locale, NewsDict> = { ko, en, ja, "zh-TW": zh };
export const getNews = (lang: Locale): NewsDict => D[lang] || ko;
