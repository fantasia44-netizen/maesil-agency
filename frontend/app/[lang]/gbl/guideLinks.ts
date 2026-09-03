// 내부링크 그물 — 가이드↔데이터 페이지 상호링크 라벨/맵(4개국어).
// 데이터 페이지(레이드/티어) → 관련 가이드, 가이드 → 관련 도구(데이터). SEO 권위 순환 + 체류.
import type { Locale } from "../../../lib/i18n";

// 데이터 페이지에서 노출할 "관련 가이드" 짧은 라벨
export const GUIDE_CHIP: Record<Locale, { typeChart: string; leagueCp: string; party: string; ivOpt: string; header: string }> = {
  ko: { typeChart: "타입 상성·약점표", leagueCp: "리그 CP 제한", party: "파티 구성법", ivOpt: "IV 최적화", header: "📘 가이드" },
  en: { typeChart: "Type Chart", leagueCp: "League CP Limits", party: "Team Building", ivOpt: "IV Optimization", header: "📘 Guides" },
  ja: { typeChart: "タイプ相性表", leagueCp: "リーグCP制限", party: "パーティ構築", ivOpt: "個体値最適化", header: "📘 ガイド" },
  "zh-TW": { typeChart: "屬性相剋表", leagueCp: "聯盟CP限制", party: "隊伍組成", ivOpt: "IV 最佳化", header: "📘 攻略" },
};

// 가이드에서 노출할 "관련 도구(데이터 페이지)" 짧은 라벨
export const TOOL_CHIP: Record<Locale, { raidTier: string; tierList: string; ivChecker: string; sim: string; cmp: string; meta: string; header: string }> = {
  ko: { raidTier: "레이드 딜러 티어", tierList: "배틀리그 티어표", ivChecker: "IV 순위 체커", sim: "배틀 시뮬레이터", cmp: "CMP 순위", meta: "실측 메타", header: "🛠️ 관련 도구" },
  en: { raidTier: "Raid Attacker Tiers", tierList: "Battle League Tiers", ivChecker: "IV Rank Checker", sim: "Battle Simulator", cmp: "CMP Ranking", meta: "Encounter Meta", header: "🛠️ Related tools" },
  ja: { raidTier: "レイドアタッカーティア", tierList: "バトルリーグティア", ivChecker: "個体値ランクチェッカー", sim: "バトルシミュ", cmp: "CMPランキング", meta: "実測メタ", header: "🛠️ 関連ツール" },
  "zh-TW": { raidTier: "團體戰攻擊手強度", tierList: "對戰聯盟強度表", ivChecker: "IV 排名檢查器", sim: "對戰模擬器", cmp: "CMP 排名", meta: "實測環境", header: "🛠️ 相關工具" },
};

// 가이드 slug → 관련 데이터 페이지(경로는 localizePath로 감쌈)
type ToolKey = keyof Omit<(typeof TOOL_CHIP)["ko"], "header">;
export const GUIDE_RELATED_TOOLS: Record<string, { path: string; key: ToolKey }[]> = {
  "type-chart": [{ path: "/gbl/raid", key: "raidTier" }, { path: "/gbl/tier/master", key: "tierList" }],
  "moveset": [{ path: "/gbl/sim", key: "sim" }, { path: "/gbl/tier/master", key: "tierList" }, { path: "/gbl/cmp/master", key: "cmp" }],
  "cct": [{ path: "/gbl/sim", key: "sim" }, { path: "/gbl/tier/master", key: "tierList" }],
  "pogo-pvp-calc": [{ path: "/gbl/sim", key: "sim" }, { path: "/gbl/cmp/master", key: "cmp" }],
  "iv-optimization": [{ path: "/gbl/iv", key: "ivChecker" }, { path: "/gbl/meta/master", key: "meta" }],
  "league-cp": [{ path: "/gbl/tier/master", key: "tierList" }, { path: "/gbl/cmp/master", key: "cmp" }],
  "gbl-basics": [{ path: "/gbl/tier/master", key: "tierList" }, { path: "/gbl/raid", key: "raidTier" }],
  "party-building": [{ path: "/gbl/tier/master", key: "tierList" }, { path: "/gbl/meta/master", key: "meta" }],
};
