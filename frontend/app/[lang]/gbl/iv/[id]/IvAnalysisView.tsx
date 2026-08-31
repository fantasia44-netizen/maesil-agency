"use client";
// 포켓몬별 "개체값 타협점" 분석 뷰 — 관리자 전용(완성 전까지). 완성 시 공개로 전환.
// PvPoke 엔진 전수 시뮬 데이터 + 블로그식 해설 + 판정표 + 불리 매치업 스프라이트.
import { useEffect, useState } from "react";
import Link from "next/link";
import AdSlot from "../../AdSlot";
import CoupangAd from "../../CoupangAd";
import { localizePath, type Locale } from "../../../../../lib/i18n";
import { ivEntry, type SimSpread } from "../analysis/registry";
import { getUser } from "../../../../../lib/api";

const SPRITE = (dex: number | null) => dex ? `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${dex}.png` : "";

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
  "타협":   { color: "#b45309", bg: "#fef3c7", label: { ko: "타협",   en: "Compromise", ja: "妥協",  "zh-TW": "妥協" } },
};

const UI: Record<Locale, Record<string, string>> = {
  ko: { back: "← GBL Note", ivTool: "개체값 순위 체커", tier: "티어표", compromiseLabel: "타협 개체값", verdictH: "개체값별 판정 (마스터리그 실측 시뮬)",
        thIv: "개체값(공/방/체)", thCp: "CP", thHp: "HP", thVerdict: "판정", thWeak: "불리해지는 상대", none: "없음", shieldTag: "실드",
        shieldH: "백(100%)의 실드별 성적", win: "승", loss: "패", methodH: "분석 방법", updated: "업데이트", privacy: "개인정보처리방침",
        cmpH: "공격 15는 왜 필수인가 — 동시차징(CMP)", cmpMirror: "미러전 (그란돈 vs 그란돈)", cmpRival: "vs 라이벌", cmpMine: "내 공14", cmpOpp: "상대 공15", cmpNote: "공격 종족값이 곧 우선권. 공14는 같은 종족값 라이벌에게 무조건 밀립니다.",
        bbH: "베스트버디(L51) 효과", bbCp: "베파 CP", bbNote: "타협 개체도 베스트버디로 키우면 대결이 전부 나아지고, 같은 종족값 라이벌까지 이깁니다.",
        verdictBoxH: "강화할까, 말까 — 한눈에", growLabel: "그냥 강화", condLabel: "조건부", waitLabel: "강화 말고 대기", faqH: "자주 묻는 질문" },
  en: { back: "← GBL Note", ivTool: "IV rank checker", tier: "Tier list", compromiseLabel: "Compromise IVs", verdictH: "Verdict by IV spread (Master League sim)",
        thIv: "IVs (Atk/Def/Sta)", thCp: "CP", thHp: "HP", thVerdict: "Verdict", thWeak: "Matchups lost", none: "none", shieldTag: "shields",
        shieldH: "Hundo record by shield count", win: "W", loss: "L", methodH: "Method", updated: "Updated", privacy: "Privacy",
        cmpH: "Why attack 15 is mandatory — CMP", cmpMirror: "Mirror (Groudon vs Groudon)", cmpRival: "vs rival", cmpMine: "Mine (atk 14)", cmpOpp: "Foe (atk 15)", cmpNote: "Attack decides priority. Attack 14 always loses to a same-stat rival.",
        bbH: "Best Buddy (L51) effect", bbCp: "BB CP", bbNote: "Best-buddying even a compromise improves every matchup and beats same-stat rivals.",
        verdictBoxH: "Build it or not — at a glance", growLabel: "Just build", condLabel: "Conditional", waitLabel: "Don't build yet", faqH: "FAQ" },
  ja: { back: "← GBL Note", ivTool: "個体値ランク", tier: "ティア表", compromiseLabel: "妥協個体値", verdictH: "個体値ごとの判定（マスター実測シミュ）",
        thIv: "個体値(攻/防/HP)", thCp: "CP", thHp: "HP", thVerdict: "判定", thWeak: "不利になる相手", none: "なし", shieldTag: "シールド",
        shieldH: "100%のシールド別成績", win: "勝", loss: "負", methodH: "分析方法", updated: "更新", privacy: "プライバシー",
        cmpH: "攻撃15が必須の理由 — 同時発動(CMP)", cmpMirror: "ミラー(グラードン対決)", cmpRival: "vs ライバル", cmpMine: "自分 攻14", cmpOpp: "相手 攻15", cmpNote: "攻撃種族値が優先度を決める。攻14は同種族値ライバルに必ず負けます。",
        bbH: "ベストバディ(L51)効果", bbCp: "BB CP", bbNote: "妥協個体でもベストバディにすれば全対面が改善し、同種族値ライバルにも勝てます。",
        verdictBoxH: "強化する？しない？ — 一目で", growLabel: "そのまま強化", condLabel: "条件付き", waitLabel: "強化せず待つ", faqH: "よくある質問" },
  "zh-TW": { back: "← GBL Note", ivTool: "個體值排名", tier: "階級表", compromiseLabel: "妥協個體值", verdictH: "各個體值判定（大師實測模擬）",
        thIv: "個體值(攻/防/HP)", thCp: "CP", thHp: "HP", thVerdict: "判定", thWeak: "落敗對手", none: "無", shieldTag: "護盾",
        shieldH: "100%的護盾別戰績", win: "勝", loss: "負", methodH: "分析方法", updated: "更新", privacy: "隱私權",
        cmpH: "為何攻擊15必須 — 同時放招(CMP)", cmpMirror: "鏡像(固拉多對決)", cmpRival: "vs 對手", cmpMine: "我方 攻14", cmpOpp: "對手 攻15", cmpNote: "攻擊種族值決定優先權。攻14必輸給同種族值對手。",
        bbH: "最佳夥伴(L51)效果", bbCp: "BB CP", bbNote: "妥協個體只要升最佳夥伴，所有對戰皆改善，還能贏過同種族值對手。",
        verdictBoxH: "要不要升 — 一眼看懂", growLabel: "直接升", condLabel: "有條件", waitLabel: "先別升", faqH: "常見問題" },
};

const METHOD: Record<Locale, string> = {
  ko: "이 판정은 PvPoke 오픈소스 배틀 엔진으로 마스터리그 상위 100종 전부와, 실드 0·1·2개 시나리오를 모두 시뮬레이션해 얻은 결과입니다. 100% 개체와 승패가 갈리는 매치업이 하나도 없으면 '유사백', 스탯·CP까지 완전히 같으면 '실질백', 승패를 놓치는 상대가 생기면 '타협'으로 표기했습니다.",
  en: "These verdicts come from simulating each spread against the entire Master League top-100 across 0-, 1-, and 2-shield scenarios with the open-source PvPoke battle engine. If no matchup flips versus a hundo it's 'battle-equal'; if stats and CP are identical too it's 'stat-hundo'; if any matchup is lost it's 'compromise'.",
  ja: "この判定は、オープンソースのPvPoke対戦エンジンでマスターリーグ上位100種すべて、シールド0・1・2枚の全シナリオをシミュレートした結果です。100%個体と勝敗が変わる相手が一つもなければ「準100」、ステータス・CPまで同一なら「実質100」、勝敗を落とす相手が出れば「妥協」と表記しました。",
  "zh-TW": "此判定以開源PvPoke對戰引擎，將各個體值對大師聯盟前100名、護盾0·1·2的所有情境完整模擬得出。若與100%相比無任何對戰勝負改變則為「準100」，連數值·CP都相同則為「實質100」，若有對手落敗則為「妥協」。",
};

// 불리 매치업 스프라이트 칩(상대별 dedupe, 실드 태그 병합)
function weakChips(spread: SimSpread, shieldWord: string) {
  const byOpp: Record<string, { dex: number | null; name: string; types: string[]; shields: Set<number> }> = {};
  for (const f of spread.flips) {
    const k = f.oppId;
    if (!byOpp[k]) byOpp[k] = { dex: f.dex, name: f.opp, types: f.types || [], shields: new Set() };
    byOpp[k].shields.add(f.shields);
  }
  return Object.values(byOpp);
}

export default function IvAnalysisView({ lang, id }: { lang: Locale; id: string }) {
  // 관리자 전용 게이트 — 완성 전까지 super_admin만 열람. 완성 시 이 게이트 제거하면 전체 공개.
  // 게이트 통과 전엔 데이터를 조회조차 않아 초기 HTML에 콘텐츠가 실리지 않음(비공개).
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { setIsAdmin(getUser()?.role === "super_admin"); setReady(true); }, []);
  const e = ivEntry(id);
  if (!ready || !e) {
    if (ready && !e) return null;
    return <div style={{ minHeight: "60vh" }} />;
  }
  if (!isAdmin) {
    return (
      <div style={{ minHeight: "70dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "2.2rem" }}>🔒</div>
        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>준비 중인 기능입니다</div>
        <div style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.7, maxWidth: 340 }}>
          개체값 타협 분석은 관리자 검수 중입니다. 곧 모든 트레이너에게 공개됩니다.
        </div>
        <Link href={localizePath(lang, "/gbl")} style={{ marginTop: 6, fontSize: "0.85rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>← GBL Note</Link>
      </div>
    );
  }
  const a = e.article[lang] || e.article.en;
  const u = UI[lang] || UI.en;
  const L = (p: string) => localizePath(lang, p);
  const sim = e.sim;
  const nrm = sim.normal;
  const bb = sim.bestBuddy;
  const name = e.name[lang] || e.name.en;
  const rivalName = e.rivalName ? (e.rivalName[lang] || e.rivalName.en) : null;

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ maxWidth: 740, margin: "0 auto 6px" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#b45309", background: "#fef3c7", padding: "2px 10px", borderRadius: 20 }}>🔒 관리자 검수용 · 비공개</span>
      </div>
      <div style={{ maxWidth: 740, margin: "0 auto" }}>
        <div style={{ marginBottom: 10, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{u.back}</Link>
          <Link href={L("/gbl/iv")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{u.ivTool}</Link>
          <Link href={L(`/gbl/pokemon/master/${id}`)} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{name}</Link>
        </div>

        {/* 히어로 */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SPRITE(e.dex)} alt={name} width={68} height={68} style={{ imageRendering: "pixelated" }} />
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>{a.title}</h1>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>100% CP {nrm.hundo.cp} · L{nrm.hundo.level} · {e.season} · {u.updated} {e.updated}</div>
          </div>
        </div>

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

        {/* CMP — 공격15 필수(미러/라이벌 대결, 스프라이트) */}
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 4px", color: "#0f172a" }}>{u.cmpH}</h2>
        <p style={{ margin: "0 0 12px", fontSize: "0.82rem", color: "#64748b", lineHeight: 1.6 }}>{u.cmpNote}</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          {([["mirror", u.cmpMirror, e.dex], ["rival", u.cmpRival + (rivalName ? ` · ${rivalName}` : ""), sim.rivalDex]] as const).map(([key, label, oppDex]) => {
            const duel = key === "mirror" ? sim.cmp.mirror : sim.cmp.rival;
            if (!duel) return null;
            return (
              <div key={key} style={{ flex: "1 1 260px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.9rem 1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SPRITE(e.dex)} alt="" width={34} height={34} style={{ imageRendering: "pixelated" }} />
                  <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#94a3b8" }}>vs</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={SPRITE(oppDex)} alt="" width={34} height={34} style={{ imageRendering: "pixelated" }} />
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
        <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: "0 0 10px", color: "#0f172a" }}>{u.verdictH}</h2>
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
                return (
                  <tr key={sp.iv.join("/")} style={{ borderTop: `1px solid #f1f5f9`, background: isHundo ? "#fafbff" : undefined }}>
                    <td style={{ padding: "0.55rem 0.8rem", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>{sp.iv.join(" / ")}</td>
                    <td style={{ padding: "0.55rem 0.8rem", color: "#475569" }}>{sp.cp}</td>
                    <td style={{ padding: "0.55rem 0.8rem", color: sp.stats.hp < nrm.hundo.stats.hp ? "#b45309" : "#475569", fontWeight: sp.stats.hp < nrm.hundo.stats.hp ? 700 : 400 }}>{sp.stats.hp}</td>
                    <td style={{ padding: "0.55rem 0.8rem" }}>
                      <span style={{ fontSize: "0.74rem", fontWeight: 800, color: v.color, background: v.bg, padding: "2px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>{v.label[lang] || v.label.en}</span>
                    </td>
                    <td style={{ padding: "0.55rem 0.8rem" }}>
                      {chips.length === 0 ? <span style={{ color: "#cbd5e1" }}>{u.none}</span> : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {chips.map((c) => (
                            <span key={c.name} title={c.name} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: (TYPE_COLOR[c.types[0]] || "#94a3b8") + "1a", border: `1px solid ${BORDER}`, borderRadius: 20, padding: "1px 8px 1px 2px", fontSize: "0.72rem", color: "#334155", fontWeight: 600 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={SPRITE(c.dex)} alt={c.name} width={22} height={22} style={{ imageRendering: "pixelated" }} />
                              {c.name}<span style={{ color: "#94a3b8", fontWeight: 500 }}>·{u.shieldTag}{[...c.shields].sort().join("")}</span>
                            </span>
                          ))}
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

        {/* 분석 방법(E-E-A-T) */}
        <div style={{ marginTop: 8, padding: "0.9rem 1.1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{u.methodH}</div>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", lineHeight: 1.75 }}>{METHOD[lang] || METHOD.en}</p>
        </div>

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
