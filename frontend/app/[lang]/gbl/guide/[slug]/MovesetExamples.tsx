// 기술배치 가이드 실전 예시 — 대표몬(자시안) 실제 추천 기술배치 + 리그별 포켓몬 클릭 그리드.
// "그래서 이 몬은 뭘 쓰나?"는 상세페이지로 연결(가이드→상세 클러스터). 데이터에서 실제 기술/티어 추출.
import Link from "next/link";
import DETAIL_S28 from "../../gbl_detail_s28.json";
import MOVENAMES from "../../pvp_move_names.json";
import { MON, spriteUrl, monName } from "../../meta/monNames";
import { localizePath, type Locale } from "../../../../../lib/i18n";

type DItem = { id: string; tier: string; moveset: string[]; dex?: number };
const DET = DETAIL_S28 as unknown as Record<string, DItem[]>;
const MVN = MOVENAMES as unknown as Record<string, Record<string, string>>;
const mvName = (lang: Locale, id: string) => {
  const m = MVN[id] || MVN[id.replace(/_PLUS$/, "")];
  return (m && (m[lang] || m.en)) || id;
};
const find = (league: string, id: string) => (DET[league] || []).find((d) => d.id === id);
const spriteOf = (id: string, dex?: number) => spriteUrl(MON[id] || ({ id, dex: dex || 0 } as never));

const FEATURED = { league: "master", id: "zacian_crowned_sword" };
const LEAGUES: { key: string; ko: string; en: string; ja: string; "zh-TW": string }[] = [
  { key: "great", ko: "슈퍼리그", en: "Great League", ja: "スーパーリーグ", "zh-TW": "超級聯盟" },
  { key: "ultra", ko: "하이퍼리그", en: "Ultra League", ja: "ハイパーリーグ", "zh-TW": "高級聯盟" },
  { key: "master", ko: "마스터리그", en: "Master League", ja: "マスターリーグ", "zh-TW": "大師聯盟" },
];

const LB: Record<Locale, { secH: string; fastL: string; chargedL: string; note: (n: string, lg: string, t: string) => string; gridH: string; cta: string }> = {
  ko: { secH: "🎯 실전 예시 — 눌러서 각 포켓몬의 추천 기술배치 확인", fastL: "빠른 기술", chargedL: "차지 기술",
    note: (n, lg, t) => `${n} ${lg} ${t}티어의 추천 기술배치입니다. 위 기준(에너지·자속·커버리지)이 실제 포켓몬엔 이렇게 적용돼요. 눌러서 리그·실드별 상세를 확인하세요.`,
    gridH: "리그별 대표 포켓몬 — 눌러서 각자의 기술배치 확인", cta: "상세 보기 →" },
  en: { secH: "🎯 Worked examples — tap a Pokémon for its recommended moveset", fastL: "Fast", chargedL: "Charged",
    note: (n, lg, t) => `${n}'s recommended moveset in ${lg} (${t}-tier). This is how the criteria above (energy, STAB, coverage) apply to a real Pokémon. Tap through for per-league, per-shield detail.`,
    gridH: "Representative Pokémon by league — tap for each moveset", cta: "Details →" },
  ja: { secH: "🎯 実戦例 — タップで各ポケモンの推奨技構成を確認", fastL: "ノーマル", chargedL: "ゲージ",
    note: (n, lg, t) => `${n}の${lg}(${t}ティア)推奨技構成です。上の基準(エネルギー・一致・範囲)が実際のポケモンにこう適用されます。タップでリーグ・シールド別の詳細へ。`,
    gridH: "リーグ別 代表ポケモン — タップで各技構成を確認", cta: "詳細 →" },
  "zh-TW": { secH: "🎯 實戰範例 — 點擊查看各寶可夢的推薦招式配置", fastL: "一般", chargedL: "特殊",
    note: (n, lg, t) => `${n}在${lg}（${t}級）的推薦招式配置。上述標準（能量·本系·打點）在實際寶可夢就是這樣套用。點擊查看各聯盟·護盾詳細。`,
    gridH: "各聯盟代表寶可夢 — 點擊查看各自招式配置", cta: "詳細 →" },
};

function Chip({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: "0.74rem", fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: color + "1f", color, border: `1px solid ${color}55` }}>{label}</span>;
}

export default function MovesetExamples({ lang }: { lang: Locale }) {
  const t = LB[lang] || LB.en;
  const feat = find(FEATURED.league, FEATURED.id);
  const featName = monName(lang, FEATURED.id);
  const lgLabel = (key: string) => { const l = LEAGUES.find((x) => x.key === key); return l ? l[lang] : key; };

  return (
    <div style={{ margin: "18px 0 8px" }}>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>{t.secH}</h2>

      {/* 대표몬 자시안 예시 카드 */}
      {feat && (
        <Link href={localizePath(lang, `/gbl/pokemon/${FEATURED.league}/${FEATURED.id}`)} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
          <div style={{ background: "linear-gradient(100deg,#eef2ff 0%,#faf5ff 60%,#ffffff 100%)", border: "1px solid #dbe2ee", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={spriteOf(FEATURED.id, feat.dex)} alt={featName} width={56} height={56} style={{ imageRendering: "pixelated", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>{featName}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fff", background: "#7c3aed", borderRadius: 7, padding: "2px 8px" }}>{lgLabel(FEATURED.league)} · {feat.tier}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", alignSelf: "center" }}>{t.fastL}</span>
                  <Chip label={mvName(lang, feat.moveset[0])} color="#0891b2" />
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", alignSelf: "center", marginLeft: 4 }}>{t.chargedL}</span>
                  {feat.moveset.slice(1).map((mid) => <Chip key={mid} label={mvName(lang, mid)} color="#dc2626" />)}
                </div>
              </div>
            </div>
            <p style={{ margin: "10px 0 0", fontSize: "0.84rem", color: "#334155", lineHeight: 1.7 }}>
              {t.note(featName, lgLabel(FEATURED.league), feat.tier)}
              <span style={{ color: "#3b5bdb", fontWeight: 700 }}> {t.cta}</span>
            </p>
          </div>
        </Link>
      )}

      {/* 리그별 대표 포켓몬 그리드 → 상세 링크 */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{t.gridH}</div>
        {LEAGUES.map((lg) => {
          const list = (DET[lg.key] || []).filter((d) => d.id !== FEATURED.id).slice(0, 4);
          if (!list.length) return null;
          return (
            <div key={lg.key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#6366f1", marginBottom: 5 }}>{lg[lang]}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {list.map((d) => (
                  <Link key={d.id} href={localizePath(lang, `/gbl/pokemon/${lg.key}/${d.id}`)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: "#fff", border: "1px solid #dbe2ee", borderRadius: 999, padding: "4px 12px 4px 6px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={spriteOf(d.id, d.dex)} alt="" width={26} height={26} style={{ imageRendering: "pixelated" }} />
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>{monName(lang, d.id)}</span>
                    <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "#fff", background: "#94a3b8", borderRadius: 5, padding: "0 5px" }}>{d.tier}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
