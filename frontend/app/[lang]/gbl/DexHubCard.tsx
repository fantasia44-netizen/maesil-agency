// 도감 허브 블록 — 포켓몬 상세(랭킹 밖 포함)에 붙는 "이 포켓몬의 다른 정보" 카드. 서버 컴포넌트.
// 배틀리그(리그별 티어·순위) · 레이드(딜러표 순위) · IV(순위 체커·타협 분석)로 한 번에 이동.
// 기술은 상세의 기술 패널이 각 기술 페이지로 직접 연결(여기선 생략).
import Link from "next/link";
import { localizePath, type Locale } from "../../../lib/i18n";
import { leagueShort } from "./contentI18n";
import { typeLabel, TYPE_COLOR } from "./typeLabels";
import { standings, raidRanksOfDex } from "./dexHub";
import { PUBLISHED_ANALYSIS } from "./iv/analysis/published";

const T: Record<Locale, { h: string; battle: string; raid: string; iv: string; rank: (n: number) => string; shadow: string; mega: string; ivCheck: string; ivDeep: string; noRank: string; raidAll: string }> = {
  ko: { h: "이 포켓몬의 다른 정보", battle: "배틀리그", raid: "레이드", iv: "개체값", rank: (n) => `${n}위`, shadow: "섀도우", mega: "메가", ivCheck: "IV 순위 보기 →", ivDeep: "타협 개체 분석 →", noRank: "랭킹 없음", raidAll: "딜러 티어 전체 →" },
  en: { h: "More on this Pokémon", battle: "Battle League", raid: "Raids", iv: "IVs", rank: (n) => `#${n}`, shadow: "Shadow", mega: "Mega", ivCheck: "IV ranks →", ivDeep: "Compromise-IV analysis →", noRank: "Unranked", raidAll: "All attacker tiers →" },
  ja: { h: "このポケモンのほかの情報", battle: "バトルリーグ", raid: "レイド", iv: "個体値", rank: (n) => `${n}位`, shadow: "シャドウ", mega: "メガ", ivCheck: "個体値ランクを見る →", ivDeep: "妥協個体の分析 →", noRank: "ランク外", raidAll: "アタッカー一覧 →" },
  "zh-TW": { h: "這隻寶可夢的其他資訊", battle: "對戰聯盟", raid: "團體戰", iv: "個體值", rank: (n) => `第${n}名`, shadow: "暗影", mega: "超級", ivCheck: "查看IV排名 →", ivDeep: "妥協個體分析 →", noRank: "未上榜", raidAll: "全部攻擊手排行 →" },
};
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a", D: "#64748b" };
const BORDER = "#e3e8f2";

export default function DexHub({ lang, id, dex, league }: { lang: Locale; id: string; dex: number; league: string }) {
  const t = T[lang];
  const L = (p: string) => localizePath(lang, p);
  const st = standings(id);
  const raids = raidRanksOfDex(dex).slice(0, 8);
  const baseId = id.replace(/_shadow$/, "");
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" };
  const label: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 800, color: "#64748b", minWidth: 58 };
  const chip = (on = false): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.76rem", fontWeight: 700, padding: "3px 10px", borderRadius: 12, textDecoration: "none", whiteSpace: "nowrap",
    border: `1px solid ${on ? "#3b5bdb" : BORDER}`, background: on ? "#eef2ff" : "#fff", color: on ? "#1d4ed8" : "#334155" });
  if (!st.length && !raids.length && !dex) return null;

  return (
    <div style={{ marginTop: 10, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.75rem 0.95rem", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#0f172a" }}>🔗 {t.h}</div>

      {/* 배틀리그 — 리그별 티어·순위. 보고 있는 리그는 강조 */}
      <div style={row}>
        <span style={label}>{t.battle}</span>
        {st.length === 0 && <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{t.noRank}</span>}
        {st.map((s) => (
          <Link key={s.league} href={L(`/gbl/pokemon/${s.league}/${s.id}`)} style={chip(s.league === league)}>
            {leagueShort(lang, s.league)}
            {s.tier && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 17, height: 17, borderRadius: 5, background: TIER_COLOR[s.tier] || "#94a3b8", color: "#fff", fontSize: "0.6rem", fontWeight: 800 }}>{s.tier}</span>}
            <span style={{ fontWeight: 600, color: "#64748b" }}>{t.rank(s.rank)}</span>
          </Link>
        ))}
        {st.length > 0 && league && <Link href={L(`/gbl/tier/${league}`)} style={{ fontSize: "0.72rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{leagueShort(lang, league)} →</Link>}
      </div>

      {/* 레이드 — 이 포켓몬(일반·섀도우·메가)의 딜러표 순위 */}
      {raids.length > 0 && (
        <div style={row}>
          <span style={label}>{t.raid}</span>
          {raids.map((r, i) => {
            const c = TYPE_COLOR[r.type] || "#94a3b8";
            const tag = r.mega ? `${t.mega}${r.megaVariant ? " " + r.megaVariant : ""}` : r.shadow ? t.shadow : "";
            return (
              <Link key={`${r.type}-${r.sid}-${i}`} href={L(`/gbl/raid/${r.type}`)} style={chip()}>
                <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#fff", background: c, padding: "0 6px", borderRadius: 6 }}>{typeLabel(lang, r.type)}</span>
                {t.rank(r.rank)}
                {tag && <span style={{ fontSize: "0.64rem", fontWeight: 700, color: r.mega ? "#7c3aed" : "#6d28d9" }}>{tag}</span>}
              </Link>
            );
          })}
          <Link href={L("/gbl/raid")} style={{ fontSize: "0.72rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>{t.raidAll}</Link>
        </div>
      )}

      {/* IV — 순위 체커(이 포켓몬 선택 상태로) + 타협 개체 분석(발행된 종만) */}
      {dex > 0 && (
        <div style={row}>
          <span style={label}>{t.iv}</span>
          <Link href={`${L("/gbl/iv")}?p=${dex}`} style={chip()}>{t.ivCheck}</Link>
          {PUBLISHED_ANALYSIS.has(baseId) && <Link href={L(`/gbl/iv/${baseId}`)} style={chip()}>{t.ivDeep}</Link>}
        </div>
      )}
    </div>
  );
}
