// 기술 상세 — 수치 · 타수표 · 이번 시즌 메타 채용 포켓몬(타수·예상 데미지) · 상성 · 배우는 포켓몬. 서버렌더.
// 자동 문장 없음: 전부 표/수치(9월 '가치 낮은 콘텐츠' 교훈 — 문장은 사람이, 데이터는 표로).
// 색인: movesData.isIndexableMove (스위치 꺼짐=전부 noindex). 포켓몬 링크는 MonLink/learnerLink — 상세 페이지가 있는 종 전부(indexGate.hasDetailLink).
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "../../AdSlot";
import JsonLd from "../../JsonLd";
import MonLink from "../../MonLink";
import { formDexById } from "../../sprite";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, locales, type Locale } from "../../../../../lib/i18n";
import { leagueName } from "../../contentI18n";
import { typeLabel, TYPE_COLOR } from "../../typeLabels";
import { ALL_TYPES, typeMult } from "../../pokemon/[league]/[id]/typeChart";
import { getMoves } from "../dict";
import { getRaidMoves } from "../../raid/moves/dict";
import { raidMoveById } from "../../raid/moves/raidMovesData";
import { buffText, turnsToSec } from "../fmt";
import {
  MOVES, FAST, CHARGED, GM_DATE, CORE_LEAGUES, moveBySlug, moveById, moveName, speciesName, dpt, ept, dpe, rankIn,
  countRows, metaUsers, refDefender, usageCount, isIndexableMove, learnerLink, type Move,
} from "../movesData";

export const revalidate = 3600;
// 온디맨드 SSR(레이아웃이 force-dynamic) — 322×4 프리렌더는 배포만 느려짐.
export function generateStaticParams() { return [] as { id: string }[]; }

const CARD = "#ffffff", BORDER = "#e3e8f2";
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a", D: "#64748b" };
const SPRITE = (id: string, dex: number) => `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${formDexById(id, dex)}.png`;

export function generateMetadata({ params }: { params: { lang: string; id: string } }): Metadata {
  const m = moveBySlug(params.id);
  if (!m) return { title: "GBL Note" };
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getMoves(lang);
  const name = moveName(lang, m), kind = m.kind === "fast" ? t.kindFast : t.kindCharged;
  const path = `/gbl/moves/${m.slug}`;
  return {
    title: t.metaTitle(name, kind), description: t.metaDesc(name, kind),
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    ...(isIndexableMove(m) ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title: t.metaTitle(name, kind), description: t.metaDesc(name, kind), url: localizePath(lang, path), type: "article" },
  };
}

function MoveChipLink({ lang, m, L }: { lang: Locale; m: Move; L: (p: string) => string }) {
  const c = TYPE_COLOR[m.type] || "#64748b";
  return (
    <Link prefetch={false} href={L(`/gbl/moves/${m.slug}`)} style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 10, textDecoration: "none", background: c + "1c", color: c, border: `1px solid ${c}50`, whiteSpace: "nowrap" }}>
      {moveName(lang, m)}
    </Link>
  );
}

export default function MoveDetail({ params }: { params: { lang: string; id: string } }) {
  const m = moveBySlug(params.id);
  if (!m) notFound();
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getMoves(lang);
  const L = (p: string) => localizePath(lang, p);
  const name = moveName(lang, m);
  const isFast = m.kind === "fast";
  const kindLabel = isFast ? t.kindFast : t.kindCharged;
  const c = TYPE_COLOR[m.type] || "#64748b";
  const tLabel = typeLabel(lang, m.type);
  const otherNames = [...new Set(locales.filter((l) => l !== lang).map((l) => moveName(l, m)).filter((n) => n && n !== name))];

  const sameKind = isFast ? FAST : CHARGED;
  const effect = buffText(t, m.buff);
  const tiles: { label: string; value: string; sub?: string }[] = isFast
    ? [
        { label: t.power, value: String(m.power) },
        { label: t.energyGain, value: `+${m.gain}` },
        { label: t.turns, value: `${m.turns}`, sub: `${turnsToSec(m.turns)}${t.secUnit}` },
        { label: t.dptLong, value: String(dpt(m)), sub: t.rankOf(rankIn(sameKind, m, dpt), sameKind.length) },
        { label: t.eptLong, value: String(ept(m)), sub: t.rankOf(rankIn(sameKind, m, ept), sameKind.length) },
      ]
    : [
        { label: t.power, value: String(m.power), sub: t.rankOf(rankIn(sameKind, m, (x) => x.power), sameKind.length) },
        { label: t.energyCost, value: String(m.energy) },
        { label: t.dpeLong, value: String(dpe(m)), sub: t.rankOf(rankIn(sameKind, m, dpe), sameKind.length) },
        { label: t.effect, value: effect || t.noEffect },
      ];

  const cRows = countRows(m);
  const users = metaUsers(lang, m);
  const totalUsers = CORE_LEAGUES.reduce((a, lg) => a + users[lg].length, 0);
  const eff = { sup: ALL_TYPES.filter((d) => typeMult(m.type, d) > 1), res: ALL_TYPES.filter((d) => typeMult(m.type, d) === 0.625), dbl: ALL_TYPES.filter((d) => typeMult(m.type, d) < 0.5) };
  const related = (isFast ? FAST : CHARGED).filter((x) => x.type === m.type && x.id !== m.id).sort((a, b) => usageCount(b) - usageCount(a) || a.id.localeCompare(b.id)).slice(0, 12);
  const eliteSet = new Set(m.elite || []);

  const SITE = "https://gblnote.com";
  const breadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GBL Note", item: SITE + L("/gbl") },
      { "@type": "ListItem", position: 2, name: t.navLabel, item: SITE + L("/gbl/moves") },
      { "@type": "ListItem", position: 3, name, item: SITE + L(`/gbl/moves/${m.slug}`) },
    ],
  };

  const wrap: React.CSSProperties = { minHeight: "100dvh", background: `radial-gradient(900px 420px at 50% -10%, ${c}2e 0%, transparent 62%), linear-gradient(180deg,#f7f9fd,#eef2fb)`, padding: "1.4rem 1rem 4rem" };
  const h2: React.CSSProperties = { margin: "1.5rem 0 4px", fontSize: "1.02rem", fontWeight: 800, color: "#0f172a" };
  const sub: React.CSSProperties = { margin: "0 0 8px", fontSize: "0.74rem", color: "#94a3b8", lineHeight: 1.6 };
  const th: React.CSSProperties = { padding: "7px 8px", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textAlign: "left", whiteSpace: "nowrap", borderBottom: `1px solid ${BORDER}`, background: "#f8fafc" };
  const td: React.CSSProperties = { padding: "7px 8px", fontSize: "0.8rem", color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };
  const num: React.CSSProperties = { fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px", whiteSpace: "nowrap" };
  const tableBox: React.CSSProperties = { overflowX: "auto", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 };
  const seq = (a: number[]) => a.join("·") + (t.hitsUnit ? t.hitsUnit : "");
  const TypeChips = ({ list }: { list: string[] }) => list.length ? (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {list.map((k) => <span key={k} style={{ fontSize: "0.66rem", fontWeight: 700, color: "#fff", background: TYPE_COLOR[k] || "#94a3b8", padding: "1px 7px", borderRadius: 6 }}>{typeLabel(lang, k)}</span>)}
    </span>
  ) : <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{t.effNone}</span>;

  return (
    <div style={wrap}>
      <JsonLd data={breadcrumb} />
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl/moves")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{t.back}</Link>
          <Link href={L("/gbl/tier/great")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{t.navTier}</Link>
          <Link href={L("/gbl/guide/moveset")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{t.navGuide}</Link>
          {/* 같은 기술의 레이드·체육관 수치(위력·시전 시간·DPS)는 별도 페이지 — 배틀 수치와 전혀 다름 */}
          {raidMoveById(m.id) && <Link href={L(`/gbl/raid/moves/${m.slug}`)} style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>🔥 {getRaidMoves(lang).navLabel} →</Link>}
        </div>

        {/* 헤더 */}
        <div style={{ background: `linear-gradient(110deg, ${c}26, #ffffff 70%)`, border: `1px solid ${c}55`, borderLeft: `5px solid ${c}`, borderRadius: 14, padding: "0.95rem 1.1rem" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#fff", background: c, padding: "2px 9px", borderRadius: 8 }}>{tLabel}</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#fff", background: isFast ? "#0891b2" : "#dc2626", padding: "2px 9px", borderRadius: 8 }}>{kindLabel}</span>
            {totalUsers > 0 && <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#3b5bdb" }}>{t.colUsers} {t.usersCount(usageCount(m))}</span>}
          </div>
          <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>
            {name} <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#64748b" }}>— {t.h1Suffix}</span>
          </h1>
          {otherNames.length > 0 && <div style={{ marginTop: 3, fontSize: "0.76rem", color: "#94a3b8" }}>{otherNames.join(" · ")}</div>}
        </div>

        {/* 수치 타일 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))", gap: 8, marginTop: 10 }}>
          {tiles.map((k) => (
            <div key={k.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.7rem 0.8rem" }}>
              <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>{k.label}</div>
              <div style={{ fontSize: k.value.length > 8 ? "0.82rem" : "1.35rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.35, marginTop: 2 }}>{k.value}</div>
              {k.sub && <div style={{ fontSize: "0.66rem", color: "#94a3b8", marginTop: 1 }}>{k.sub}</div>}
            </div>
          ))}
        </div>
        {isFast && effect && <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "#475569" }}>{t.effect}: {effect}</p>}

        {/* 타수표 */}
        {cRows.length > 0 && (
          <>
            <h2 style={h2}>{isFast ? t.countsHFast(name) : t.countsHCharged(name)}</h2>
            <p style={sub}>{t.countsSub}</p>
            <div style={tableBox}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>{isFast ? t.colChargedMoves : t.colFastMoves}</th>
                    <th style={{ ...th, textAlign: "right" }}>{isFast ? t.energyCost : t.colPerTurn}</th>
                    <th style={{ ...th, textAlign: "right" }}>{t.colCounts}</th>
                    <th style={{ ...th, textAlign: "right" }}>{t.colFirst}</th>
                  </tr>
                </thead>
                <tbody>
                  {cRows.map((r) => (
                    <tr key={r.key}>
                      <td style={td}>
                        <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                          {r.moves.slice(0, 3).map((o) => <MoveChipLink key={o.id} lang={lang} m={o} L={L} />)}
                          {r.moves.length > 3 && <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{t.more(r.moves.length - 3)}</span>}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: "right" }}><span style={num}>{isFast ? r.energy : `+${r.gain} / ${r.turns}${t.turnUnit}`}</span></td>
                      <td style={{ ...td, textAlign: "right" }}><span style={{ ...num, color: c }}>{seq(r.counts)}</span></td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}><span style={num}>{r.firstTurns}{t.turnUnit}</span><span style={{ display: "block", fontSize: "0.68rem", color: "#94a3b8" }}>{turnsToSec(r.firstTurns)}{t.secUnit}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <AdSlot />

        {/* 메타 채용 — 현재 시즌 추천 기술배치에서 이 기술을 쓰는 포켓몬 + 타수 + 예상 데미지 */}
        <h2 style={h2}>{t.usersH(name)}</h2>
        {totalUsers === 0 ? (
          <p style={{ ...sub, fontSize: "0.82rem", color: "#64748b" }}>{t.noUsers}</p>
        ) : CORE_LEAGUES.filter((lg) => users[lg].length > 0).map((lg) => {
          const ref = refDefender(lg);
          return (
            <div key={lg} style={{ marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 800, color: "#0f172a" }}>{leagueName(lang, lg)}</h3>
                <span style={{ fontSize: "0.72rem", color: "#3b5bdb", fontWeight: 700 }}>{t.usersCount(users[lg].length)}</span>
              </div>
              <p style={sub}>{t.usersSub(ref.def, ref.hp)}</p>
              <div style={tableBox}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 470 }}>
                  <thead>
                    <tr>
                      <th style={th}>{t.colMon}</th>
                      <th style={{ ...th, textAlign: "center" }}>{t.colTier}</th>
                      <th style={th}>{isFast ? t.colRecCharged : t.colRecFast}</th>
                      <th style={{ ...th, textAlign: "right" }}>{isFast ? t.colDmgHit : t.colDmg}</th>
                      <th style={{ ...th, textAlign: "right" }}>{isFast ? t.colDmgTurn : t.colPct}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users[lg].map((u) => {
                      const fm = u.fastId ? moveById(u.fastId) : undefined;
                      return (
                        <tr key={u.id}>
                          <td style={td}>
                            <MonLink league={lg} id={u.id} href={L(`/gbl/pokemon/${lg}/${u.linkId}`)} style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", color: "#0f172a" }}>
                              <span style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", ...(u.shadow ? { background: "radial-gradient(circle, #a855f7ee 0%, #7c3aed99 42%, transparent 72%)", borderRadius: "50%" } : {}) }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {u.dex > 0 && <img src={SPRITE(u.id, u.dex)} alt={u.name} width={32} height={32} loading="lazy" style={{ imageRendering: "pixelated" }} />}
                              </span>
                              <span style={{ fontSize: "0.84rem", fontWeight: 700, color: u.hasLink ? "#1d4ed8" : "#0f172a" }}>{u.name}</span>
                              {u.stab && <span style={{ fontSize: "0.58rem", fontWeight: 800, color: c, border: `1px solid ${c}66`, borderRadius: 5, padding: "0 4px" }}>{t.stab}</span>}
                            </MonLink>
                          </td>
                          <td style={{ ...td, textAlign: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 6, background: TIER_COLOR[u.tier] || "#94a3b8", color: "#fff", fontWeight: 800, fontSize: "0.7rem" }}>{u.tier}</span>
                          </td>
                          <td style={td}>
                            {isFast ? (
                              <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                {(u.charged || []).map((cm) => { const mv = moveById(cm.id); return (
                                  <span key={cm.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    {mv ? <MoveChipLink lang={lang} m={mv} L={L} /> : <span style={{ fontSize: "0.72rem" }}>{cm.id}</span>}
                                    <span style={{ ...num, fontSize: "0.72rem", color: "#64748b" }}>{seq(cm.counts)}</span>
                                  </span>
                                ); })}
                              </span>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                {fm ? <MoveChipLink lang={lang} m={fm} L={L} /> : <span style={{ fontSize: "0.72rem" }}>{u.fastId}</span>}
                                {u.counts && <span style={{ ...num, color: c }}>{seq(u.counts)}</span>}
                              </span>
                            )}
                          </td>
                          <td style={{ ...td, textAlign: "right" }}><span style={num}>{u.dmg || "–"}</span></td>
                          <td style={{ ...td, textAlign: "right" }}>
                            {isFast ? <span style={num}>{u.dmg ? (Math.round((u.dmg / m.turns) * 10) / 10) : "–"}</span>
                              : <span style={{ ...num, color: u.pct >= 60 ? "#dc2626" : u.pct >= 40 ? "#ea580c" : "#0f172a" }}>{u.pct ? `${u.pct}%` : "–"}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* 타입 상성(공격 타입 기준) */}
        <h2 style={h2}>{t.effH(tLabel)}</h2>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.8rem 0.95rem", display: "flex", flexDirection: "column", gap: 8 }}>
          {([[t.effSuper, eff.sup, "#16a34a"], [t.effResist, eff.res, "#ea580c"], [t.effDouble, eff.dbl, "#dc2626"]] as [string, string[], string][]).map(([label, list, col]) => (
            <div key={label} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.74rem", fontWeight: 800, color: col, minWidth: 132 }}>{label}</span>
              <TypeChips list={list} />
            </div>
          ))}
        </div>

        {/* 배우는 포켓몬 전체 */}
        <h2 style={h2}>{t.learnersH(name, m.learners.length)}</h2>
        <p style={sub}>{t.learnersSub}{eliteSet.size > 0 ? ` ${t.legacyLegend}` : ""}</p>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.8rem 0.9rem", display: "flex", gap: 5, flexWrap: "wrap" }}>
          {m.learners.map((sid) => {
            const lk = learnerLink(sid);
            const label = <>{speciesName(lang, sid)}{eliteSet.has(sid) && <span style={{ color: "#d97706", marginLeft: 2 }}>★</span>}</>;
            const st: React.CSSProperties = { fontSize: "0.76rem", padding: "2px 9px", borderRadius: 10, border: `1px solid ${BORDER}`, background: lk ? "#eef2ff" : "#f8fafc", color: lk ? "#1d4ed8" : "#475569", fontWeight: lk ? 700 : 500, textDecoration: "none", whiteSpace: "nowrap" };
            return lk ? <Link key={sid} href={L(`/gbl/pokemon/${lk.league}/${lk.id}`)} style={st}>{label}</Link> : <span key={sid} style={st}>{label}</span>;
          })}
        </div>

        {/* 같은 타입 다른 기술 */}
        {related.length > 0 && (
          <>
            <h2 style={h2}>{t.relatedH(tLabel, kindLabel)}</h2>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {related.map((o) => <MoveChipLink key={o.id} lang={lang} m={o} L={L} />)}
            </div>
          </>
        )}

        <div style={{ marginTop: 24, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>{t.explainH}</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>{t.explainBody(GM_DATE)}</p>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: "0.7rem", color: "#b0b8c4" }}>{({ ko: `기술 ${MOVES.length}개 · PvPoke 게임마스터 ${GM_DATE}`, en: `${MOVES.length} moves · PvPoke gamemaster ${GM_DATE}`, ja: `技 ${MOVES.length}件 · PvPoke ゲームマスター ${GM_DATE}`, "zh-TW": `招式 ${MOVES.length} 個 · PvPoke gamemaster ${GM_DATE}` } as Record<string, string>)[lang]}</p>
      </div>
    </div>
  );
}
