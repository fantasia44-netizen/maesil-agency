// 레이드 기술 상세 — 레이드·체육관 수치 · 배틀 수치 비교 · 가장 세게 쓰는 포켓몬(사이클 DPS) · 딜러 티어표 채용 · 상성. 서버렌더.
// 자동 문장 없음: 전부 표/수치. 배우는 포켓몬 전체 목록은 배틀 기술 페이지에 있어 여기선 싣지 않는다(두 페이지가 겹치지 않게 — 여긴 순위·수치만).
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "../../../AdSlot";
import JsonLd from "../../../JsonLd";
import { formDexById } from "../../../sprite";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, locales, type Locale } from "../../../../../../lib/i18n";
import { typeLabel, TYPE_COLOR } from "../../../typeLabels";
import { ALL_TYPES, typeMult } from "../../../pokemon/[league]/[id]/typeChart";
import { moveName, type Move } from "../../../moves/movesData";
import { turnsToSec } from "../../../moves/fmt";
import { getRaidMoves } from "../dict";
import {
  RAID_FAST, RAID_CHARGED, RAID_MOVES, RAID_DATA_DATE, TABLE_VERSION, raidMoveBySlug, raidMoveById,
  dps, eps, dpe, bars, rankIn, secText, topUsers, tableUsers, usageCount, type RaidMove,
} from "../raidMovesData";

export const revalidate = 3600;
// 온디맨드 SSR(레이아웃이 force-dynamic) — 319×4 프리렌더는 배포만 느려짐.
export function generateStaticParams() { return [] as { id: string }[]; }

const CARD = "#ffffff", BORDER = "#e3e8f2";
const SPRITE = (id: string, dex: number) => `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${formDexById(id, dex)}.png`;
const BASE = "/gbl/raid/moves";

export function generateMetadata({ params }: { params: { lang: string; id: string } }): Metadata {
  const x = raidMoveBySlug(params.id);
  if (!x) return { title: "GBL Note" };
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getRaidMoves(lang);
  const name = moveName(lang, x.m), kind = x.m.kind === "fast" ? t.kindFast : t.kindCharged;
  const path = `${BASE}/${x.m.slug}`;
  return {
    title: t.metaTitle(name, kind), description: t.metaDesc(name, kind),
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    openGraph: { title: t.metaTitle(name, kind), description: t.metaDesc(name, kind), url: localizePath(lang, path), images: ["/gbl-og.png"], type: "article" },
  };
}

// 짝 기술 칩 — 레이드 수치 페이지가 있으면 그쪽으로.
function MoveChip({ lang, m, L, legacy }: { lang: Locale; m: Move; L: (p: string) => string; legacy?: boolean }) {
  const c = TYPE_COLOR[m.type] || "#64748b";
  const st: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 10, textDecoration: "none", background: c + "1c", color: c, border: `1px solid ${c}50`, whiteSpace: "nowrap" };
  const body = <>{moveName(lang, m)}{legacy && <span style={{ color: "#d97706", marginLeft: 2 }}>★</span>}</>;
  return raidMoveById(m.id) ? <Link prefetch={false} href={L(`${BASE}/${m.slug}`)} style={st}>{body}</Link> : <span style={st}>{body}</span>;
}

export default function RaidMoveDetail({ params }: { params: { lang: string; id: string } }) {
  const x = raidMoveBySlug(params.id);
  if (!x) notFound();
  const m = x.m;
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getRaidMoves(lang);
  const L = (p: string) => localizePath(lang, p);
  const name = moveName(lang, m);
  const isFast = m.kind === "fast";
  const kindLabel = isFast ? t.kindFast : t.kindCharged;
  const c = TYPE_COLOR[m.type] || "#64748b";
  const tLabel = typeLabel(lang, m.type);
  const otherNames = [...new Set(locales.filter((l) => l !== lang).map((l) => moveName(l, m)).filter((n) => n && n !== name))];

  const sameKind = isFast ? RAID_FAST : RAID_CHARGED;
  const tiles: { label: string; value: string; sub?: string }[] = isFast
    ? [
        { label: t.power, value: String(x.power) },
        { label: t.duration, value: `${secText(x.dur)}${t.secUnit}` },
        { label: t.energyGain, value: `+${x.energy}` },
        { label: t.dpsLong, value: String(dps(x)), sub: t.rankOf(rankIn(sameKind, x, dps), sameKind.length) },
        { label: t.epsLong, value: String(eps(x)), sub: t.rankOf(rankIn(sameKind, x, eps), sameKind.length) },
      ]
    : [
        { label: t.power, value: String(x.power), sub: t.rankOf(rankIn(sameKind, x, (y) => y.power), sameKind.length) },
        { label: t.energyCost, value: String(x.energy), sub: t.bars(bars(x)) },
        { label: t.duration, value: `${secText(x.dur)}${t.secUnit}`, sub: x.ws ? `${t.windowAt} ${secText(x.ws)}${t.secUnit}` : undefined },
        { label: t.dpsLong, value: String(dps(x)), sub: t.rankOf(rankIn(sameKind, x, dps), sameKind.length) },
        { label: t.dpeLong, value: String(dpe(x)), sub: t.rankOf(rankIn(sameKind, x, dpe), sameKind.length) },
      ];

  const top = topUsers(lang, x);
  const uses = tableUsers(lang, x);
  const eff = { sup: ALL_TYPES.filter((d) => typeMult(m.type, d) > 1), res: ALL_TYPES.filter((d) => typeMult(m.type, d) === 0.625), dbl: ALL_TYPES.filter((d) => typeMult(m.type, d) < 0.5) };
  const metric = (y: RaidMove) => (isFast ? eps(y) : dpe(y));
  const related = sameKind.filter((y) => y.m.type === m.type).sort((a, b) => dps(b) - dps(a) || (a.m.id < b.m.id ? -1 : 1));

  const SITE = "https://gblnote.com";
  const breadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GBL Note", item: SITE + L("/gbl") },
      { "@type": "ListItem", position: 2, name: t.navLabel, item: SITE + L(BASE) },
      { "@type": "ListItem", position: 3, name, item: SITE + L(`${BASE}/${m.slug}`) },
    ],
  };

  const wrap: React.CSSProperties = { minHeight: "100dvh", background: `radial-gradient(900px 420px at 50% -10%, ${c}2e 0%, transparent 62%), linear-gradient(180deg,#f7f9fd,#eef2fb)`, padding: "1.4rem 1rem 4rem" };
  const h2: React.CSSProperties = { margin: "1.5rem 0 4px", fontSize: "1.02rem", fontWeight: 800, color: "#0f172a" };
  const sub: React.CSSProperties = { margin: "0 0 8px", fontSize: "0.74rem", color: "#94a3b8", lineHeight: 1.6 };
  const th: React.CSSProperties = { padding: "7px 8px", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textAlign: "left", whiteSpace: "nowrap", borderBottom: `1px solid ${BORDER}`, background: "#f8fafc" };
  const td: React.CSSProperties = { padding: "7px 8px", fontSize: "0.8rem", color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };
  const num: React.CSSProperties = { fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.3px", whiteSpace: "nowrap" };
  const tableBox: React.CSSProperties = { overflowX: "auto", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 };
  const TypeChips = ({ list }: { list: string[] }) => list.length ? (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {list.map((k) => <span key={k} style={{ fontSize: "0.66rem", fontWeight: 700, color: "#fff", background: TYPE_COLOR[k] || "#94a3b8", padding: "1px 7px", borderRadius: 6 }}>{typeLabel(lang, k)}</span>)}
    </span>
  ) : <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{t.effNone}</span>;
  const MonCell = ({ sid, dex, nm, shadow, href, legacy }: { sid: string; dex: number; nm: string; shadow: boolean; href: string | null; legacy?: boolean }) => {
    const inner = (
      <>
        <span style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", ...(shadow ? { background: "radial-gradient(circle, #a855f7ee 0%, #7c3aed99 42%, transparent 72%)", borderRadius: "50%" } : {}) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {dex > 0 && <img src={SPRITE(sid, dex)} alt={nm} width={32} height={32} loading="lazy" style={{ imageRendering: "pixelated" }} />}
        </span>
        <span style={{ fontSize: "0.84rem", fontWeight: 700, color: href ? "#1d4ed8" : "#0f172a" }}>{nm}{legacy && <span style={{ color: "#d97706", marginLeft: 2 }}>★</span>}</span>
      </>
    );
    const st: React.CSSProperties = { display: "flex", alignItems: "center", gap: 7, textDecoration: "none", color: "#0f172a" };
    return href ? <Link prefetch={false} href={L(href)} style={st}>{inner}</Link> : <span style={st}>{inner}</span>;
  };
  const anyLegacy = top.some((r) => r.legacySelf || r.legacyPair);

  return (
    <div style={wrap}>
      <JsonLd data={breadcrumb} />
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href={L(BASE)} style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none", fontWeight: 700 }}>{t.back}</Link>
          <Link href={L(`/gbl/raid/${m.type}`)} style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none" }}>{t.navRaid}</Link>
          <Link href={L(`/gbl/moves/${m.slug}`)} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{t.navBattle}</Link>
        </div>

        {/* 헤더 */}
        <div style={{ background: `linear-gradient(110deg, ${c}26, #ffffff 70%)`, border: `1px solid ${c}55`, borderLeft: `5px solid ${c}`, borderRadius: 14, padding: "0.95rem 1.1rem" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#fff", background: c, padding: "2px 9px", borderRadius: 8 }}>{tLabel}</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#fff", background: isFast ? "#0891b2" : "#dc2626", padding: "2px 9px", borderRadius: 8 }}>{kindLabel}</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#c2410c", background: "#ffedd5", padding: "2px 9px", borderRadius: 8 }}>{t.vsRaid}</span>
            {uses.length > 0 && <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#ea580c" }}>{t.colUsers} {t.usedSuffix(usageCount(x))}</span>}
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
              <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.35, marginTop: 2 }}>{k.value}</div>
              {k.sub && <div style={{ fontSize: "0.66rem", color: "#94a3b8", marginTop: 1 }}>{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* 레이드 수치 vs 배틀 수치 — 같은 기술의 두 수치 체계를 나란히 */}
        <h2 style={h2}>{t.vsH}</h2>
        <p style={sub}>{t.vsSub}</p>
        <div style={tableBox}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}></th>
                <th style={{ ...th, textAlign: "right" }}>{t.power}</th>
                <th style={{ ...th, textAlign: "right" }}>{isFast ? t.energyGain : t.energyCost}</th>
                <th style={{ ...th, textAlign: "right" }}>{t.colSpeed}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...td, fontWeight: 800, color: "#c2410c" }}>{t.vsRaid}</td>
                <td style={{ ...td, textAlign: "right" }}><span style={num}>{x.power}</span></td>
                <td style={{ ...td, textAlign: "right" }}><span style={num}>{isFast ? `+${x.energy}` : x.energy}</span>{!isFast && <span style={{ fontSize: "0.68rem", color: "#94a3b8", marginLeft: 5 }}>{t.bars(bars(x))}</span>}</td>
                <td style={{ ...td, textAlign: "right" }}><span style={num}>{secText(x.dur)}{t.secUnit}</span></td>
              </tr>
              <tr>
                <td style={{ ...td, fontWeight: 800, color: "#1d4ed8" }}>{t.vsBattle}</td>
                <td style={{ ...td, textAlign: "right" }}><span style={num}>{m.power}</span></td>
                <td style={{ ...td, textAlign: "right" }}><span style={num}>{isFast ? `+${m.gain}` : m.energy}</span></td>
                <td style={{ ...td, textAlign: "right" }}><span style={num}>{isFast ? t.turnsText(m.turns, turnsToSec(m.turns)) : t.instant}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ margin: "8px 0 0" }}>
          <Link href={L(`/gbl/moves/${m.slug}`)} style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1d4ed8", textDecoration: "none" }}>{t.vsLink}</Link>
        </p>

        <AdSlot />

        {/* 이 기술을 가장 세게 쓰는 포켓몬 — 이 기술을 포함한 최고 조합의 사이클 DPS */}
        <h2 style={h2}>{t.topH(name)}</h2>
        {top.length === 0 ? (
          <p style={{ ...sub, fontSize: "0.82rem", color: "#64748b" }}>{t.noTop}</p>
        ) : (
          <>
            <p style={sub}>{t.topSub} {t.topCount(top.length, x.learners)}{anyLegacy ? ` · ${t.legacyLegend}` : ""}</p>
            <div style={tableBox}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: "center", width: 34 }}>{t.colRank}</th>
                    <th style={th}>{t.colMon}</th>
                    <th style={th}>{isFast ? t.colPairCharged : t.colPairFast}</th>
                    <th style={{ ...th, textAlign: "right" }}>{t.colCycle}</th>
                    <th style={{ ...th, textAlign: "right" }}>{t.colDps}</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((r, i) => (
                    <tr key={r.sid}>
                      <td style={{ ...td, textAlign: "center" }}><span style={{ ...num, color: i < 3 ? "#dc2626" : "#94a3b8" }}>{i + 1}</span></td>
                      <td style={td}><MonCell sid={r.sid} dex={r.dex} nm={r.name} shadow={r.shadow} href={r.href} legacy={r.legacySelf} /></td>
                      <td style={td}>{r.pair ? <MoveChip lang={lang} m={r.pair} L={L} legacy={r.legacyPair} /> : <span style={{ fontSize: "0.72rem" }}>{r.pairId}</span>}</td>
                      <td style={{ ...td, textAlign: "right", fontSize: "0.72rem", color: "#64748b", whiteSpace: "nowrap" }}>{t.cycleText(r.n, secText(r.time))}</td>
                      <td style={{ ...td, textAlign: "right" }}><span style={{ ...num, color: c }}>{r.dps.toFixed(1)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 딜러 티어표 채용 — 타입별 상위 30의 추천 기술배치에 이 기술이 들어간 포켓몬 */}
        <h2 style={h2}>{t.tableH(name)}</h2>
        {uses.length === 0 ? (
          <p style={{ ...sub, fontSize: "0.82rem", color: "#64748b" }}>{t.noTable}</p>
        ) : (
          <>
            <p style={sub}>{t.tableSub(TABLE_VERSION === "megafinale" ? t.verMega : t.verCurrent)}</p>
            <div style={tableBox}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 470 }}>
                <thead>
                  <tr>
                    <th style={th}>{t.colTypeRank}</th>
                    <th style={th}>{t.colMon}</th>
                    <th style={th}>{isFast ? t.colPairCharged : t.colPairFast}</th>
                    <th style={{ ...th, textAlign: "right" }}>DPS</th>
                  </tr>
                </thead>
                <tbody>
                  {uses.map((u) => {
                    const tc = TYPE_COLOR[u.type] || "#94a3b8";
                    return (
                      <tr key={`${u.type}-${u.sid || u.koName}`}>
                        <td style={td}>
                          <Link prefetch={false} href={L(`/gbl/raid/${u.type}`)} style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                            <span style={{ fontSize: "0.66rem", fontWeight: 700, color: "#fff", background: tc, padding: "1px 7px", borderRadius: 6 }}>{typeLabel(lang, u.type)}</span>
                            <span style={{ ...num, color: u.rank <= 3 ? "#dc2626" : "#0f172a" }}>{t.rankText(u.rank)}</span>
                          </Link>
                        </td>
                        <td style={td}><MonCell sid={u.sid} dex={u.dex} nm={u.name} shadow={u.shadow} href={u.href} /></td>
                        <td style={td}>{u.other ? <MoveChip lang={lang} m={u.other} L={L} /> : <span style={{ fontSize: "0.72rem" }}>{u.otherId}</span>}</td>
                        <td style={{ ...td, textAlign: "right" }}><span style={num}>{u.dps.toFixed(1)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

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

        {/* 같은 타입 기술의 레이드 수치 비교 */}
        {related.length > 1 && (
          <>
            <h2 style={h2}>{t.relatedH(tLabel, kindLabel)}</h2>
            <div style={tableBox}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 440 }}>
                <thead>
                  <tr>
                    <th style={th}>{t.colName}</th>
                    <th style={{ ...th, textAlign: "right" }}>{t.power}</th>
                    <th style={{ ...th, textAlign: "right" }}>{t.duration}</th>
                    <th style={{ ...th, textAlign: "right" }}>{isFast ? t.energyGain : t.energyCost}</th>
                    <th style={{ ...th, textAlign: "right" }}>DPS</th>
                    <th style={{ ...th, textAlign: "right" }}>{isFast ? "EPS" : "DPE"}</th>
                  </tr>
                </thead>
                <tbody>
                  {related.map((y) => {
                    const me = y.m.id === m.id;
                    return (
                      <tr key={y.m.id} style={me ? { background: c + "14" } : undefined}>
                        <td style={td}>{me ? <b style={{ color: "#0f172a" }}>{moveName(lang, y.m)}</b> : <Link prefetch={false} href={L(`${BASE}/${y.m.slug}`)} style={{ color: "#c2410c", fontWeight: 700, textDecoration: "none" }}>{moveName(lang, y.m)}</Link>}</td>
                        <td style={{ ...td, textAlign: "right" }}><span style={num}>{y.power}</span></td>
                        <td style={{ ...td, textAlign: "right" }}><span style={num}>{secText(y.dur)}{t.secUnit}</span></td>
                        <td style={{ ...td, textAlign: "right" }}><span style={num}>{isFast ? `+${y.energy}` : y.energy}</span></td>
                        <td style={{ ...td, textAlign: "right" }}><span style={{ ...num, color: c }}>{dps(y)}</span></td>
                        <td style={{ ...td, textAlign: "right" }}><span style={num}>{metric(y)}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div style={{ marginTop: 24, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 6px", color: "#0f172a" }}>{t.explainH}</h2>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.75 }}>{t.explainBody(RAID_DATA_DATE)}</p>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: "0.7rem", color: "#b0b8c4" }}>{t.footer(RAID_MOVES.length, RAID_DATA_DATE)}</p>
      </div>
    </div>
  );
}
