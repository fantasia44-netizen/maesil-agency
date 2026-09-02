"use client";
// 포켓몬별 "개체값 타협점" 분석 뷰 — 관리자 전용(완성 전까지). 완성 시 공개로 전환.
// PvPoke 엔진 전수 시뮬 데이터 + 블로그식 해설 + 판정표 + 불리 매치업 스프라이트.
import React, { useState } from "react";
import Link from "next/link";
import AdSlot from "../../AdSlot";
import CoupangAd from "../../CoupangAd";
import { localizePath, type Locale } from "../../../../../lib/i18n";
import type { IvEntry, SimSpread, Coverage } from "../analysis/registry";
import DEX_TYPE from "../../dex_type.json";
import { localizeOpp } from "./oppNames";
import { formDexById } from "../../sprite";

const SPRITE = (dex: number | null) => dex ? `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${dex}.png` : "";
const DT = DEX_TYPE as Record<string, string>;
const primaryType = (dex: number | null) => (dex ? DT[String(dex)] : null) || "normal";

const CARD = "#ffffff", BORDER = "#e3e8f2";
const TYPE_COLOR: Record<string, string> = {
  normal: "#9fa19f", fire: "#e62829", water: "#2980ef", electric: "#d9a900", grass: "#3fa129",
  ice: "#37b6c9", fighting: "#ff8000", poison: "#9141cb", ground: "#915121", flying: "#6c93e0",
  psychic: "#ef4179", bug: "#91a119", rock: "#96843d", ghost: "#704170", dragon: "#5060e1",
  dark: "#4b4243", steel: "#5a8a9c", fairy: "#d76ad7",
};

// 판정 라벨·색 (로케일)
const VERDICT: Record<string, { color: string; bg: string; label: Record<Locale, string> }> = {
  "실질백": { color: "#15803d", bg: "#dcfce7", label: { ko: "실질백", en: "Stat-hundo", ja: "実質100", "zh-TW": "實質100" } },
  "유사백": { color: "#0369a1", bg: "#e0f2fe", label: { ko: "유사백", en: "Battle-equal", ja: "準100", "zh-TW": "準100" } },
  "조건부": { color: "#ca8a04", bg: "#fef9c3", label: { ko: "조건부", en: "Conditional", ja: "条件付き", "zh-TW": "有條件" } },
  "타협":   { color: "#b45309", bg: "#fef3c7", label: { ko: "타협",   en: "Compromise", ja: "妥協",  "zh-TW": "妥協" } },
  "CMP탈락": { color: "#dc2626", bg: "#fee2e2", label: { ko: "CMP 탈락", en: "CMP loss", ja: "CMP負け", "zh-TW": "CMP落敗" } },
};

const UI: Record<Locale, Record<string, string>> = {
  ko: { back: "← GBL Note", ivTool: "개체값 순위 체커", tier: "티어표", compromiseLabel: "타협 개체값", verdictH: "개체값별 판정 (마스터리그 실측 시뮬)",
        thIv: "개체값(공/방/체)", thCp: "CP", thHp: "HP", thVerdict: "판정", thWeak: "불리해지는 상대", none: "없음", shieldTag: "실드",
        shieldH: "백(100%)의 실드별 성적", win: "승", loss: "패", methodH: "분석 방법", updated: "업데이트", privacy: "개인정보처리방침",
        cmpH: "공격 15는 왜 필수인가 — 동시차징(CMP)", cmpRival: "vs 라이벌", cmpMine: "내 공14", cmpOpp: "상대 공15", cmpNote: "공격 종족값이 곧 우선권. 공14는 같은 종족값 라이벌에게 무조건 밀립니다.",
        bbH: "베스트파트너(L51) 효과", bbCp: "베파 CP", bbNote: "베스트파트너로 키우면 몇몇 매치업을 새로 잡습니다. 단, 상대도 베스트파트너면 미러·라이벌은 무승부라 — 아래 커버리지의 두 시나리오(상대 노베파/베파)를 함께 보세요.",
        verdictBoxH: "강화할까, 말까 — 한눈에", growLabel: "그냥 강화", condLabel: "조건부", waitLabel: "강화 말고 대기", faqH: "자주 묻는 질문" },
  en: { back: "← GBL Note", ivTool: "IV rank checker", tier: "Tier list", compromiseLabel: "Compromise IVs", verdictH: "Verdict by IV spread (Master League sim)",
        thIv: "IVs (Atk/Def/Sta)", thCp: "CP", thHp: "HP", thVerdict: "Verdict", thWeak: "Matchups lost", none: "none", shieldTag: "shields",
        shieldH: "Hundo record by shield count", win: "W", loss: "L", methodH: "Method", updated: "Updated", privacy: "Privacy",
        cmpH: "Why attack 15 is mandatory — CMP", cmpRival: "vs rival", cmpMine: "Mine (atk 14)", cmpOpp: "Foe (atk 15)", cmpNote: "Attack decides priority. Attack 14 always loses to a same-stat rival.",
        bbH: "Best Buddy (L51) effect", bbCp: "BB CP", bbNote: "Best-buddying even a compromise improves every matchup and beats same-stat rivals.",
        verdictBoxH: "Build it or not — at a glance", growLabel: "Just build", condLabel: "Conditional", waitLabel: "Don't build yet", faqH: "FAQ" },
  ja: { back: "← GBL Note", ivTool: "個体値ランク", tier: "ティア表", compromiseLabel: "妥協個体値", verdictH: "個体値ごとの判定（マスター実測シミュ）",
        thIv: "個体値(攻/防/HP)", thCp: "CP", thHp: "HP", thVerdict: "判定", thWeak: "不利になる相手", none: "なし", shieldTag: "シールド",
        shieldH: "100%のシールド別成績", win: "勝", loss: "負", methodH: "分析方法", updated: "更新", privacy: "プライバシー",
        cmpH: "攻撃15が必須の理由 — 同時発動(CMP)", cmpRival: "vs ライバル", cmpMine: "自分 攻14", cmpOpp: "相手 攻15", cmpNote: "攻撃種族値が優先度を決める。攻14は同種族値ライバルに必ず負けます。",
        bbH: "ベストバディ(L51)効果", bbCp: "BB CP", bbNote: "妥協個体でもベストバディにすれば全対面が改善し、同種族値ライバルにも勝てます。",
        verdictBoxH: "強化する？しない？ — 一目で", growLabel: "そのまま強化", condLabel: "条件付き", waitLabel: "強化せず待つ", faqH: "よくある質問" },
  "zh-TW": { back: "← GBL Note", ivTool: "個體值排名", tier: "階級表", compromiseLabel: "妥協個體值", verdictH: "各個體值判定（大師實測模擬）",
        thIv: "個體值(攻/防/HP)", thCp: "CP", thHp: "HP", thVerdict: "判定", thWeak: "落敗對手", none: "無", shieldTag: "護盾",
        shieldH: "100%的護盾別戰績", win: "勝", loss: "負", methodH: "分析方法", updated: "更新", privacy: "隱私權",
        cmpH: "為何攻擊15必須 — 同時放招(CMP)", cmpRival: "vs 對手", cmpMine: "我方 攻14", cmpOpp: "對手 攻15", cmpNote: "攻擊種族值決定優先權。攻14必輸給同種族值對手。",
        bbH: "最佳夥伴(L51)效果", bbCp: "BB CP", bbNote: "妥協個體只要升最佳夥伴，所有對戰皆改善，還能贏過同種族值對手。",
        verdictBoxH: "要不要升 — 一眼看懂", growLabel: "直接升", condLabel: "有條件", waitLabel: "先別升", faqH: "常見問題" },
};

const METHOD: Record<Locale, string> = {
  ko: "이 판정은 PvPoke 오픈소스 배틀 엔진으로 마스터리그 상위 100종 전부와 실드 0·1·2 시나리오를 모두 시뮬레이션한 결과입니다. 100% 개체와 승패가 하나도 안 갈리면 '완벽/유사백', 놓치는 상대가 약한 편(상위권 밖)이면 '타협', 상위 10위권 상대에게 지기 시작하면 진 상대 수만큼 '불리 N종'으로 표기했습니다. 공격 14는 미러 우선권을 잃어 'CMP 탈락'입니다.",
  en: "These verdicts come from simulating each spread against the entire Master League top-100 across 0/1/2-shield scenarios with the open-source PvPoke engine. If no matchup flips versus a hundo it's 'Perfect/Battle-equal'; if it only loses to weaker (non-top) opponents it's 'Fine'; once it loses to a top-10 opponent it's 'N lost' by the number of losses. Attack 14 loses mirror priority — 'CMP loss'.",
  ja: "この判定は、オープンソースのPvPoke対戦エンジンでマスターリーグ上位100種すべて、シールド0・1・2の全シナリオをシミュレートした結果です。100%個体と勝敗が一つも変わらなければ「完璧/準100」、負ける相手が弱め（上位外）なら「妥協」、上位10位の相手に負け始めると負けた数だけ「不利 N体」と表記しました。攻撃14はミラー優先権を失い「CMP負け」です。",
  "zh-TW": "此判定以開源PvPoke對戰引擎，將各個體值對大師聯盟前100名、護盾0·1·2所有情境完整模擬得出。若與100%相比無任何勝負改變則為「完美/準100」，僅輸給較弱（非上位）對手則為「妥協」，一旦輸給前10名對手則依落敗數標為「不利 N種」。攻擊14失去鏡像優先權，為「CMP落敗」。",
};

// 방법론 명세 박스 라벨(E-E-A-T·심사자용) — "복사한 표가 아니라 자체 계산" 신호.
const MBOX: Record<Locale, { basis: string; target: string; targetV: string; shield: string; level: string; levelV: string; engine: string; engineV: string; baseline: string; source: string; last: string; more: string }> = {
  ko: { basis: "분석 기준", target: "대상", targetV: "마스터리그 상위 100종", shield: "실드", level: "레벨", levelV: "50 / 베스트파트너 51", engine: "배틀 엔진", engineV: "PvPoke 기반 GBL Note 시뮬레이터", baseline: "비교 기준", source: "GBL Note 자체 계산·분석", last: "최종 계산", more: "분석 방법 자세히 보기 →" },
  en: { basis: "Basis", target: "Scope", targetV: "Master League Top 100", shield: "Shields", level: "Level", levelV: "50 / Best Buddy 51", engine: "Battle engine", engineV: "GBL Note Simulator (PvPoke-based)", baseline: "Baseline", source: "Calculated & analyzed by GBL Note", last: "Last calculated", more: "About the method →" },
  ja: { basis: "分析基準", target: "対象", targetV: "マスターリーグ上位100種", shield: "シールド", level: "レベル", levelV: "50 / ベストパートナー51", engine: "対戦エンジン", engineV: "PvPoke基盤 GBL Note シミュレーター", baseline: "比較基準", source: "GBL Note 独自計算・分析", last: "最終計算", more: "分析方法の詳細 →" },
  "zh-TW": { basis: "分析基準", target: "對象", targetV: "大師聯盟前100名", shield: "護盾", level: "等級", levelV: "50 / 最佳夥伴51", engine: "對戰引擎", engineV: "PvPoke 基礎 GBL Note 模擬器", baseline: "比較基準", source: "GBL Note 自行計算·分析", last: "最後計算", more: "分析方法詳情 →" },
};

// 판정표 읽는 법(범례) — 처음 보는 사람도 이해되게.
const TGUIDE: Record<Locale, { intro: string; perfect: string; perfectB: string; comp: string; compB: string; bad: string; badB: string; cmp: string; cmpB: string; weak: string }> = {
  ko: { intro: "맨 위 15/15/15가 완벽 개체(제일 좋음)이고, 아래로 갈수록 낮은 개체값입니다.",
        perfectB: "완벽·유사백", perfect: "= 100% 개체와 승패가 같음 (불리 없음, 그냥 쓰세요).",
        compB: "타협", comp: "= 놓치는 상대가 약한 편(상위권 아님)이라 감수하고 쓸 만합니다.",
        badB: "불리 N", bad: "= 상위 10위권 강한 상대 N종에게 지기 시작 — 실질 손해가 큽니다.",
        cmpB: "CMP 탈락", cmp: "= 공격 14는 미러·같은 종족값에게 무조건 밀립니다.",
        weak: "‘불리해지는 상대’ = 그 개체값으로 낮췄을 때 새로 지는 상대 (실드0·1·2 = 실드 개수 상황)." },
  en: { intro: "15/15/15 at the top is the perfect IV (best); rows go to lower IVs downward.",
        perfectB: "Perfect·Battle-equal", perfect: "= win/loss identical to a hundo (no disadvantage — just use it).",
        compB: "Fine", comp: "= it only loses to weaker (non-top) opponents, so it's acceptable to run.",
        badB: "N lost", bad: "= it starts losing to N strong top-10 opponents — a real disadvantage.",
        cmpB: "CMP loss", cmp: "= at attack 14 you always lose the mirror / same-stat rivals.",
        weak: "‘Matchups lost’ = opponents you newly lose to at that spread (0/1/2 shields = how many shields are used)." },
  ja: { intro: "一番上の15/15/15が完璧個体（最良）で、下へ行くほど個体値が下がります。",
        perfectB: "完璧·準100", perfect: "= 100%個体と勝敗が同じ（不利なし、そのまま使えます）。",
        compB: "妥協", comp: "= 負ける相手が弱め（上位ではない）なので割り切って使えます。",
        badB: "不利 N", bad: "= 上位10位の強い相手N体に負け始める — 実質的な損失が大きいです。",
        cmpB: "CMP負け", cmp: "= 攻撃14はミラー・同種族値に必ず負けます。",
        weak: "「不利になる相手」= その個体値で新たに負ける相手（シールド0・1・2 = シールドを何枚使う状況か）。" },
  "zh-TW": { intro: "最上方15/15/15為完美個體（最佳），往下個體值遞減。",
        perfectB: "完美·準100", perfect: "= 與100%個體勝負相同（無不利，可直接使用）。",
        compB: "妥協", comp: "= 只輸給較弱（非上位）的對手，可接受並使用。",
        badB: "不利 N", bad: "= 開始輸給前10名強敵N種 — 實質損失較大。",
        cmpB: "CMP落敗", cmp: "= 攻擊14必輸給鏡像·同種族值對手。",
        weak: "「落敗對手」= 該個體值下新增落敗的對手（護盾0·1·2 = 使用幾個護盾的情境）。" },
};

// ── 전 메타 커버리지 그리드 문구 ──
const COV: Record<Locale, { h: string; sub: string; shieldTag: string; win: string; loss: string; bbH: string; bbSub: string; oppNoBB: string; oppBB: string; bbMirrorNote: string; noGain: string }> = {
  ko: { h: "🔬 전 메타 100종 전수 시뮬 — 만나고 이기는 상대", sub: "마스터리그 상위 100종과 실드별로 1:1 직접 배틀한 결과입니다. 초록=승, 빨강=패. (배틀 레이팅 500=대등, 높을수록 여유승)",
        shieldTag: "실드", win: "승", loss: "패",
        bbH: "⭐ 베스트파트너(L51) 효과 — 새로 이기는 상대",
        bbSub: "베스트파트너로 키우면 새로 이기는 상대입니다. 상대가 베스트파트너인지 아닌지에 따라 결과가 달라져 두 경우를 모두 표시합니다.",
        oppNoBB: "상대 노베파 (L50)", oppBB: "상대도 베파 (L51)",
        bbMirrorNote: "※ 미러·같은 종족값 라이벌{rival}은 상대도 베스트파트너면 무승부로 돌아갑니다(양쪽 L51 동일). 즉 베스트파트너가 미러를 이기게 해주는 건 상대가 노베파일 때뿐입니다.",
        noGain: "없음" },
  en: { h: "🔬 Full-meta sim — all 100, who you meet & beat", sub: "1-on-1 battles vs the Master League top 100, per shield. Green = win, red = loss. (Rating 500 = even; higher = more comfortable.)",
        shieldTag: "shields", win: "W", loss: "L",
        bbH: "⭐ Best Buddy (L51) effect — newly won matchups",
        bbSub: "Opponents you newly beat once best-buddied. The result depends on whether the opponent is best-buddied too, so both cases are shown.",
        oppNoBB: "Opp not BB (L50)", oppBB: "Opp also BB (L51)",
        bbMirrorNote: "※ The mirror and same-stat rival{rival} return to a tie when the opponent is best-buddied too (both L51). So Best Buddy only wins the mirror when the opponent isn't best-buddied.",
        noGain: "none" },
  ja: { h: "🔬 全メタ100種フルシミュ — 遭遇して勝てる相手", sub: "マスター上位100種とシールド別に1対1で対戦した結果。緑=勝、赤=負。(レーティング500=互角、高いほど余裕勝ち)",
        shieldTag: "シールド", win: "勝", loss: "負",
        bbH: "⭐ ベストパートナー(L51)効果 — 新たに勝てる相手",
        bbSub: "ベストパートナーにすると新たに勝てる相手です。相手がベストパートナーかどうかで結果が変わるため両方表示します。",
        oppNoBB: "相手ノーBP (L50)", oppBB: "相手もBP (L51)",
        bbMirrorNote: "※ ミラー・同種族値ライバル{rival}は相手もベストパートナーなら互角に戻ります(両方L51)。つまりBPでミラーに勝てるのは相手がノーBPのときだけです。",
        noGain: "なし" },
  "zh-TW": { h: "🔬 全環境100種完整模擬 — 遭遇並戰勝的對手", sub: "與大師聯盟前100名依護盾1對1對戰的結果。綠=勝，紅=負。(評分500=平手，越高越輕鬆)",
        shieldTag: "護盾", win: "勝", loss: "負",
        bbH: "⭐ 最佳夥伴(L51)效果 — 新增戰勝對手",
        bbSub: "升最佳夥伴後新增戰勝的對手。結果取決於對手是否也升最佳夥伴，故兩種情況都顯示。",
        oppNoBB: "對手未BP (L50)", oppBB: "對手也BP (L51)",
        bbMirrorNote: "※ 鏡像·同種族值對手{rival}在對手也升最佳夥伴時回到平手(雙方L51)。也就是說最佳夥伴只有在對手未升時才能贏鏡像。",
        noGain: "無" },
};

// 전 메타 커버리지 그리드 — 팀빌더식(스프라이트 + 승/패 색 + 레이팅). 실드 토글.
function CoverageSection({ lang, cov, bbCov, bbOppCov, rivalName }: { lang: Locale; cov: Coverage; bbCov?: Coverage; bbOppCov?: Coverage; rivalName?: string | null }) {
  const [sh, setSh] = useState(1);
  const c = COV[lang] || COV.en;
  // 미러 노트의 라이벌 이름은 페이지 포켓몬별로 다름 → {rival} 자리에 실제 이름(없으면 괄호 생략).
  const rivalTok = rivalName ? (lang === "ko" ? `(${rivalName})` : lang === "ja" || lang === "zh-TW" ? `(${rivalName})` : ` (${rivalName})`) : "";
  const bbMirrorNote = c.bbMirrorNote.replace("{rival}", rivalTok);
  const cur = cov.find((x) => x.shields === sh) || cov[0];
  if (!cur) return null;
  const opps = cur.opps;
  const wins = opps.filter((o) => o.win).length;
  const total = opps.length;
  const pct = Math.round((wins / total) * 100);
  // 베스트파트너로 새로 이기는 상대(같은 실드, 노멀 대비). 상대 노베파/베파 두 경우.
  const gainedOf = (c2?: Coverage) => {
    const g = c2?.find((x) => x.shields === sh);
    return g ? g.opps.filter((o) => { const n = opps.find((x) => x.id === o.id); return n && !n.win && o.win; }) : [];
  };
  const gainedNoBB = gainedOf(bbCov);
  const gainedBB = gainedOf(bbOppCov);
  const cell = (o: { dex: number | null; name: string; rating: number; win: boolean }) => {
    const bg = o.win ? "#dcfce7" : "#fee2e2";
    const bd = o.win ? "#86efac" : "#fca5a5";
    const rc = o.win ? "#15803d" : "#b91c1c";
    const nm = localizeOpp(o, lang);
    return (
      <div key={o.dex + o.name} title={`${nm} · ${o.rating}`}
        style={{ position: "relative", aspectRatio: "1", background: bg, border: `1px solid ${bd}`, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SPRITE(o.dex)} alt={nm} width={30} height={30} loading="lazy" style={{ imageRendering: "pixelated" }} />
        <span style={{ position: "absolute", bottom: 0, right: 1, fontSize: "0.52rem", fontWeight: 800, color: rc }}>{o.rating}</span>
      </div>
    );
  };
  return (
    <section style={{ marginBottom: 26 }}>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 4px", color: "#0f172a" }}>{c.h}</h2>
      <p style={{ margin: "0 0 10px", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.6 }}>{c.sub}</p>
      {/* 실드 토글 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {[0, 1, 2].map((s) => (
          <button key={s} onClick={() => setSh(s)}
            style={{ padding: "5px 14px", borderRadius: 999, fontSize: "0.8rem", fontWeight: 800, cursor: "pointer",
              border: sh === s ? "none" : "1px solid #dbe2ee", background: sh === s ? "#3b5bdb" : "#fff", color: sh === s ? "#fff" : "#475569" }}>
            {c.shieldTag} {s}
          </button>
        ))}
      </div>
      {/* 승률 바 */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 800, marginBottom: 4 }}>
          <span style={{ color: "#15803d" }}>{wins}{c.win}</span>
          <span style={{ color: "#0f172a" }}>{pct}%</span>
          <span style={{ color: "#b91c1c" }}>{total - wins}{c.loss}</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, overflow: "hidden", display: "flex", border: `1px solid ${BORDER}` }}>
          <div style={{ width: `${pct}%`, background: "linear-gradient(90deg,#22c55e,#16a34a)" }} />
          <div style={{ flex: 1, background: "#fecaca" }} />
        </div>
      </div>
      {/* 100종 스프라이트 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))", gap: 4 }}>
        {opps.map(cell)}
      </div>
      {/* 베스트파트너 효과 — 상대 노베파/베파 두 시나리오 */}
      {bbCov && (
        <div style={{ marginTop: 16, background: "linear-gradient(120deg,#fef9c3,#ffffff 72%)", border: "1px solid #fde68a", borderRadius: 12, padding: "0.85rem 1rem" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>{c.bbH}</div>
          <div style={{ fontSize: "0.78rem", color: "#a16207", marginBottom: 10 }}>{c.bbSub}</div>
          {([[c.oppNoBB, gainedNoBB], [c.oppBB, gainedBB]] as const).map(([label, list], i) => (
            (i === 1 && !bbOppCov) ? null : (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
                {label} <span style={{ color: "#a16207" }}>· +{list.length}{c.win}</span>
              </div>
              {list.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))", gap: 4 }}>
                  {list.map((o) => (
                    <div key={o.id} title={`${localizeOpp(o, lang)} · ${o.rating}`} style={{ position: "relative", aspectRatio: "1", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={SPRITE(o.dex)} alt={localizeOpp(o, lang)} width={30} height={30} loading="lazy" style={{ imageRendering: "pixelated" }} />
                      <span style={{ position: "absolute", top: -3, right: -3, fontSize: "0.6rem" }}>⭐</span>
                    </div>
                  ))}
                </div>
              ) : <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>{c.noGain}</div>}
            </div>
            )
          ))}
          <div style={{ fontSize: "0.72rem", color: "#64748b", lineHeight: 1.55, marginTop: 6, paddingTop: 8, borderTop: "1px solid #fde68a" }}>{bbMirrorNote}</div>
        </div>
      )}
    </section>
  );
}

// 불리 매치업 스프라이트 칩(상대별 dedupe, 실드 태그 병합)
function weakChips(spread: SimSpread, shieldWord: string) {
  const byOpp: Record<string, { id: string; dex: number | null; name: string; types: string[]; shields: Set<number> }> = {};
  for (const f of spread.flips) {
    const k = f.oppId;
    if (!byOpp[k]) byOpp[k] = { id: k, dex: f.dex, name: f.opp, types: f.types || [], shields: new Set() };
    byOpp[k].shields.add(f.shields);
  }
  return Object.values(byOpp);
}

export default function IvAnalysisView({ lang, id, e }: { lang: Locale; id: string; e: IvEntry }) {
  // 공개 — 서버렌더(초기 HTML에 콘텐츠 실림, 크롤 가능). 발행 여부는 page.tsx가 색인/JSON-LD로 제어.
  // 데이터(e)는 서버(page.tsx)에서 해당 몬만 prop으로 전달 — registry를 클라에서 import하면
  // 20종 6.3MB가 통째로 번들돼 로드가 5초 걸리던 문제를 막음(이 파일은 registry를 타입만 참조).
  const a = e.article[lang] || e.article.en;
  const seasonLoc = lang === "ja" ? e.season.replace("시즌", "シーズン") : lang === "zh-TW" ? e.season.replace("시즌", "賽季") : lang === "en" ? e.season.replace("시즌", "Season") : e.season;
  const u = UI[lang] || UI.en;
  const L = (p: string) => localizePath(lang, p);
  const sim = e.sim;
  const nrm = sim.normal;
  const bb = sim.bestBuddy;
  const name = e.name[lang] || e.name.en;
  const rivalName = e.rivalName ? (e.rivalName[lang] || e.rivalName.en) : null;
  // CMP 미러 라벨 — 페이지 포켓몬 이름으로 동적 생성(과거 '그란돈' 하드코딩 버그 방지).
  const cmpMirrorLabel = lang === "ja" ? `ミラー(${name}対決)`
    : lang === "zh-TW" ? `鏡像(${name}對決)`
    : lang === "en" ? `Mirror (${name} vs ${name})`
    : `미러전 (${name} vs ${name})`;
  // 상대 메타 랭크(커버리지 score 내림차순) — 판정에 "누구에게 지는가"를 반영.
  const rankOf: Record<string, number> = {};
  ((nrm.coverage?.find((c) => c.shields === 1) || nrm.coverage?.[0])?.opps || []).forEach((o, i) => { rankOf[o.id] = i + 1; });
  const TOP_RANK = 10; // 이 순위 안 상대에게 지면 '불리', 그보다 약한 상대만 놓치면 '조건부 타협'

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>
        <div style={{ marginBottom: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{u.back}</Link>
          <Link href={L("/gbl/iv")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{u.ivTool}</Link>
          <Link href={L(`/gbl/pokemon/master/${id}`)} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{name}</Link>
        </div>

        {/* 히어로 배너 — 타입 테마 그라디언트 + 큰 스프라이트(썸네일/og 재사용 가능) */}
        {(() => {
          const tc = TYPE_COLOR[primaryType(e.dex)] || "#3b5bdb";
          return (
            <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, padding: "1.15rem 1.2rem", marginBottom: 8,
              background: `radial-gradient(520px 180px at 90% -25%, ${tc}44, transparent 66%), linear-gradient(135deg, ${tc}14, #ffffff 82%)`,
              border: `1px solid ${tc}40` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SPRITE(formDexById(id, e.dex))} alt={name} width={92} height={92} style={{ imageRendering: "pixelated", filter: `drop-shadow(0 4px 10px ${tc}55)`, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>{a.title}</h1>
                  <div style={{ fontSize: "0.76rem", color: "#475569", marginTop: 5, fontWeight: 600 }}>💯 CP {nrm.hundo.cp} · L{nrm.hundo.level} · {seasonLoc} · {u.updated} {e.updated}</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 공감 후킹 리드 */}
        {a.hook && <p style={{ margin: "0.6rem 0 0.3rem", fontSize: "0.98rem", color: "#0f172a", fontWeight: 700, lineHeight: 1.75 }}>{a.hook}</p>}
        {/* 리드 */}
        <p style={{ margin: "0.4rem 0 1rem", fontSize: "0.95rem", color: "#334155", lineHeight: 1.85 }}>{a.lead}</p>

        {/* 타협개체 결론 배지 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(120deg,#eef2ff,#ffffff 70%)", border: `1px solid ${BORDER}`, borderLeft: "4px solid #3b5bdb", borderRadius: 12, padding: "0.9rem 1.1rem", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 700 }}>{u.compromiseLabel}</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#3b5bdb", letterSpacing: "0.5px" }}>{a.compromise}</div>
          </div>
          <div style={{ fontSize: "0.82rem", color: "#475569", lineHeight: 1.6 }}>{a.compromiseNote}</div>
        </div>

        {/* 강화 의사결정 판정 박스(TL;DR) — 그냥 강화 / 조건부 / 대기 */}
        {a.verdict && a.verdict.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 10px", color: "#0f172a" }}>{u.verdictBoxH}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {a.verdict.map((v, i) => {
                const m = v.tier === "grow" ? { c: "#16a34a", ic: "✅", label: u.growLabel }
                  : v.tier === "conditional" ? { c: "#d97706", ic: "⚠️", label: u.condLabel }
                  : { c: "#dc2626", ic: "❌", label: u.waitLabel };
                return (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#fff", border: `1px solid ${BORDER}`, borderLeft: `4px solid ${m.c}`, borderRadius: 10, padding: "0.7rem 0.9rem" }}>
                    <span style={{ fontSize: "1rem", lineHeight: 1.4 }}>{m.ic}</span>
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 900, color: m.c }}>{m.label} <span style={{ color: "#0f172a" }}>· {v.iv}</span></div>
                      <div style={{ fontSize: "0.83rem", color: "#475569", lineHeight: 1.55, marginTop: 2 }}>{v.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 전 메타 100종 커버리지 그리드(연구 증거 — 팀빌더식) */}
        {sim.normal.coverage && (
          <CoverageSection lang={lang} cov={sim.normal.coverage} bbCov={sim.bestBuddy.coverage} bbOppCov={sim.bestBuddy.oppBB?.coverage} rivalName={rivalName} />
        )}

        {/* CMP — 공격15 필수(미러/라이벌 대결, 스프라이트) */}
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 4px", color: "#0f172a" }}>{u.cmpH}</h2>
        <p style={{ margin: "0 0 12px", fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>{u.cmpNote}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          {([["mirror", cmpMirrorLabel, e.dex], ["rival", u.cmpRival + (rivalName ? ` · ${rivalName}` : ""), sim.rivalDex]] as const).map(([key, label, oppDex]) => {
            const duel = key === "mirror" ? sim.cmp.mirror : sim.cmp.rival;
            if (!duel) return null;
            return (
              <div key={key} style={{ flex: "1 1 260px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.9rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SPRITE(formDexById(id, e.dex))} alt="" width={34} height={34} style={{ imageRendering: "pixelated" }} />
                  <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#94a3b8" }}>vs</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SPRITE(key === "mirror" ? formDexById(id, e.dex) : oppDex)} alt="" width={34} height={34} style={{ imageRendering: "pixelated" }} />
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a", marginLeft: 2 }}>{label}</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 6 }}>{u.cmpMine} vs {u.cmpOpp}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {duel.map((d) => {
                    const lose = d.result === "패", tie = d.result === "무";
                    const c = lose ? "#dc2626" : tie ? "#64748b" : "#16a34a";
                    return (
                      <div key={d.shields} style={{ flex: 1, textAlign: "center", background: c + "12", border: `1px solid ${c}44`, borderRadius: 8, padding: "5px 4px" }}>
                        <div style={{ fontSize: "0.64rem", color: "#94a3b8" }}>{u.shieldTag}{d.shields}</div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 900, color: c }}>{d.result}</div>
                        <div style={{ fontSize: "0.62rem", color: "#94a3b8" }}>{d.mine}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 판정 표 */}
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>{u.verdictH}</h2>
        {(() => { const g = TGUIDE[lang] || TGUIDE.en; return (
          <div style={{ margin: "0 0 10px", padding: "0.7rem 0.9rem", background: "#f8fafc", border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: "0.76rem", color: "#475569", lineHeight: 1.7 }}>
            <div style={{ fontWeight: 700, color: "#334155", marginBottom: 6 }}>💡 {g.intro}</div>
            {([[g.perfectB, g.perfect, "#15803d", "#dcfce7"], [g.compB, g.comp, "#ca8a04", "#fef9c3"], [g.badB, g.bad, "#dc2626", "#fee2e2"], [g.cmpB, g.cmp, "#991b1b", "#fee2e2"]] as const).map(([badge, txt, color, bg]) => (
              <div key={badge} style={{ marginBottom: 2 }}>
                <span style={{ display: "inline-block", minWidth: 64, textAlign: "center", background: bg, color, fontWeight: 800, borderRadius: 6, padding: "0px 6px", fontSize: "0.7rem", marginRight: 6 }}>{badge}</span>{txt}
              </div>
            ))}
            <div style={{ marginTop: 6, color: "#64748b" }}>{g.weak}</div>
          </div>
        ); })()}
        <div style={{ overflowX: "auto", marginBottom: 24 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <thead>
              <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                <th style={{ padding: "0.6rem 0.8rem", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>{u.thIv}</th>
                <th style={{ padding: "0.6rem 0.8rem", textAlign: "left", fontWeight: 600 }}>{u.thCp}</th>
                <th style={{ padding: "0.6rem 0.8rem", textAlign: "left", fontWeight: 600 }}>{u.thHp}</th>
                <th style={{ padding: "0.6rem 0.8rem", textAlign: "left", fontWeight: 600 }}>{u.thVerdict}</th>
                <th style={{ padding: "0.6rem 0.8rem", textAlign: "left", fontWeight: 600 }}>{u.thWeak}</th>
              </tr>
            </thead>
            <tbody>
              {nrm.spreads.map((sp) => {
                const v = VERDICT[sp.verdict] || VERDICT["타협"];
                const chips = weakChips(sp, u.shieldTag);
                const isHundo = sp.iv.join("") === "151515";
                // 재판정: 완벽(15/15/15) / CMP탈락 / 유사백(무손실) / 조건부 타협(약한 상대만) / 불리 N(상위 랭크에게 짐).
                const nLoss = chips.length;
                const minLostRank = nLoss ? Math.min(...sp.flips.map((f) => rankOf[f.oppId] || 99)) : 99;
                let vc: { color: string; bg: string } = v;
                let vlabel = v.label[lang] || v.label.en;
                if (sp.verdict === "CMP탈락") { vc = VERDICT["CMP탈락"]; vlabel = VERDICT["CMP탈락"].label[lang]; }
                else if (isHundo) { vc = VERDICT["실질백"]; vlabel = lang === "en" ? "Perfect" : lang === "ja" ? "完璧" : lang === "zh-TW" ? "完美" : "완벽"; }
                else if (nLoss === 0) { vc = VERDICT["유사백"]; vlabel = VERDICT["유사백"].label[lang]; }
                else if (minLostRank <= TOP_RANK) { vc = { color: "#dc2626", bg: "#fee2e2" }; vlabel = lang === "en" ? `${nLoss} lost` : lang === "ja" ? `不利 ${nLoss}体` : lang === "zh-TW" ? `不利 ${nLoss}種` : `불리 ${nLoss}종`; }
                else { vc = { color: "#ca8a04", bg: "#fef9c3" }; vlabel = lang === "en" ? "Fine" : lang === "ja" ? "妥協" : lang === "zh-TW" ? "妥協" : "타협"; }
                return (
                  <tr key={sp.iv.join("/")} style={{ borderTop: `1px solid #f1f5f9`, background: isHundo ? "#fafbff" : undefined }}>
                    <td style={{ padding: "0.55rem 0.8rem", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>{sp.iv.join(" / ")}</td>
                    <td style={{ padding: "0.55rem 0.8rem", color: "#475569" }}>{sp.cp}</td>
                    <td style={{ padding: "0.55rem 0.8rem", color: sp.stats.hp < nrm.hundo.stats.hp ? "#b45309" : "#475569", fontWeight: sp.stats.hp < nrm.hundo.stats.hp ? 700 : 400 }}>{sp.stats.hp}</td>
                    <td style={{ padding: "0.55rem 0.8rem" }}>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: vc.color, background: vc.bg, padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>{vlabel}</span>
                    </td>
                    <td style={{ padding: "0.55rem 0.8rem" }}>
                      {chips.length === 0 ? <span style={{ color: "#cbd5e1" }}>{u.none}</span> : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {chips.map((c) => {
                            const cn = localizeOpp(c, lang);
                            return (
                            <span key={c.name} title={cn} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: (TYPE_COLOR[c.types[0]] || "#94a3b8") + "1a", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "1px 8px 1px 2px", fontSize: "0.72rem", color: "#334155", fontWeight: 600 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={SPRITE(c.dex)} alt={cn} width={22} height={22} style={{ imageRendering: "pixelated" }} />
                              {cn}<span style={{ color: "#94a3b8", fontWeight: 500 }}>·{u.shieldTag}{[...c.shields].sort().join("")}</span>
                            </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <AdSlot />

        {/* 블로그식 해설 (가변 구조) */}
        <article>
          {a.sections.map((s, i) => (
            <section key={i} style={{ marginTop: i === 0 ? 8 : 22 }}>
              {s.h && <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 8px", color: "#0f172a" }}>{s.h}</h2>}
              <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155", lineHeight: 1.9 }}>{s.body}</p>
            </section>
          ))}
        </article>

        {/* 실드별 성적 표 (백 기준) */}
        {/* 베스트버디 효과 */}
        <div style={{ marginTop: 26, background: "linear-gradient(120deg,#fef9c3,#ffffff 72%)", border: `1px solid #fde68a`, borderRadius: 12, padding: "0.9rem 1.1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: "1.05rem" }}>⭐</span>
            <span style={{ fontSize: "0.98rem", fontWeight: 800, color: "#0f172a" }}>{u.bbH}</span>
            <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#a16207", fontWeight: 700 }}>{u.bbCp} {bb.hundo.cp} · L{bb.hundo.level}</span>
          </div>
          <p style={{ margin: 0, fontSize: "0.84rem", color: "#475569", lineHeight: 1.7 }}>{u.bbNote}</p>
        </div>

        <h2 style={{ fontSize: "1.02rem", fontWeight: 800, margin: "26px 0 10px", color: "#0f172a" }}>{u.shieldH}</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
          {nrm.hundo.byShield.map((b) => (
            <div key={b.shields} style={{ flex: "1 1 120px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "0.7rem 0.9rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 700 }}>{u.shieldTag} {b.shields}</div>
              <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a", marginTop: 3 }}>
                <span style={{ color: "#16a34a" }}>{b.wins}{u.win}</span> · <span style={{ color: "#dc2626" }}>{b.losses}{u.loss}</span>
              </div>
            </div>
          ))}
        </div>

        {a.closing && (
          <p style={{ margin: "0 0 20px", padding: "0.9rem 1.1rem", background: "#f8fafc", border: `1px solid ${BORDER}`, borderRadius: 12, fontSize: "0.9rem", color: "#0f172a", fontWeight: 600, lineHeight: 1.8 }}>{a.closing}</p>
        )}

        {/* FAQ — 자주 묻는 질문(구조화 데이터는 page.tsx의 FAQPage JSON-LD와 동기) */}
        {a.faq && a.faq.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 10px", color: "#0f172a" }}>{u.faqH}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {a.faq.map((f, i) => (
                <div key={i} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "0.75rem 0.95rem" }}>
                  <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.6 }}>Q. {f.q}</div>
                  <div style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.7, marginTop: 4 }}>{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 분석 방법(E-E-A-T) — 자체 계산 명세 박스 + 서술 + Methodology 링크 */}
        {(() => { const mb = MBOX[lang] || MBOX.en; const rows: [string, string][] = [
          [mb.basis, seasonLoc], [mb.target, mb.targetV], [mb.shield, "0 · 1 · 2"],
          [mb.level, mb.levelV], [mb.engine, mb.engineV], [mb.baseline, "15/15/15"], [mb.last, e.updated],
        ]; return (
          <div style={{ marginTop: 8, padding: "0.9rem 1.1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{u.methodH}</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 12px", fontSize: "0.76rem", marginBottom: 9 }}>
              {rows.map(([k, v]) => (
                <React.Fragment key={k}>
                  <span style={{ color: "#94a3b8", fontWeight: 700 }}>{k}</span>
                  <span style={{ color: "#334155", fontWeight: 600 }}>{v}</span>
                </React.Fragment>
              ))}
            </div>
            <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#3b5bdb", marginBottom: 8 }}>✔ {mb.source}</div>
            <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.75 }}>{METHOD[lang] || METHOD.en}</p>
            <Link href={L("/gbl/about")} style={{ fontSize: "0.78rem", color: "#3b5bdb", fontWeight: 700, textDecoration: "none" }}>{mb.more}</Link>
          </div>
        ); })()}

        <CoupangAd />

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8", display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href={L(`/gbl/tier/master`)} style={{ color: "#64748b", textDecoration: "none" }}>{u.tier}</Link>
          <Link href={L("/gbl/sim")} style={{ color: "#64748b", textDecoration: "none" }}>Simulator</Link>
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b", textDecoration: "none" }}>{u.privacy}</Link>
        </div>
      </div>
    </div>
  );
}
