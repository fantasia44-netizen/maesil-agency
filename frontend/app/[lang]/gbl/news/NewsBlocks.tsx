// 뉴스 글 본문 렌더 — 글 블록(문단·목록·표) + 자동 블록(보스 카드·추천 딜러·딜러표 상위·도감 카드). 서버 컴포넌트.
import Link from "next/link";
import { Fragment } from "react";
import DexHub from "../DexHubCard";
import { formDexById } from "../sprite";
import { localizePath, type Locale } from "../../../../lib/i18n";
import { typeLabel, TYPE_COLOR } from "../typeLabels";
import { moveName, speciesOf, type Move } from "../moves/movesData";
import { raidMoveById } from "../raid/moves/raidMovesData";
import { bossInfo, countersFor, raidTopFor, ivSummary, type AttackerRow } from "./newsData";
import { leagueName } from "../contentI18n";
import { bossGuidePath, GUIDE_LABEL } from "../raid/boss/bosses";
import type { NewsDict } from "./dict";
import type { Block } from "./posts";

const CARD = "#ffffff", BORDER = "#e3e8f2";
const SPRITE = (sid: string, dex: number) => `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${formDexById(sid, dex)}.png`;

// 문장 안의 [[/경로|라벨]] → 내부 링크(로케일 접두 자동).
export function Inline({ text, lang }: { text: string; lang: Locale }) {
  const parts = text.split(/(\[\[[^\]|]+\|[^\]]+\]\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\[\[([^\]|]+)\|([^\]]+)\]\]$/.exec(part);
        return m ? <Link key={i} href={localizePath(lang, m[1])} style={{ color: "#1d4ed8", fontWeight: 700, textDecoration: "none" }}>{m[2]}</Link> : <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

const th: React.CSSProperties = { padding: "7px 8px", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textAlign: "left", whiteSpace: "nowrap", borderBottom: `1px solid ${BORDER}`, background: "#f8fafc" };
const td: React.CSSProperties = { padding: "7px 8px", fontSize: "0.82rem", color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };
const num: React.CSSProperties = { fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" };
const tableBox: React.CSSProperties = { overflowX: "auto", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 };

function TypeChip({ lang, type, mult, t }: { lang: Locale; type: string; mult?: number; t?: NewsDict }) {
  const c = TYPE_COLOR[type] || "#94a3b8";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.68rem", fontWeight: 700, color: "#fff", background: c, padding: "1px 7px", borderRadius: 6, whiteSpace: "nowrap" }}>
      {typeLabel(lang, type)}{mult != null && <span style={{ opacity: 0.9 }}>×{mult}</span>}{mult != null && mult > 2 && t && <span style={{ opacity: 0.9 }}>· {t.doubleWeak}</span>}
    </span>
  );
}
function MoveChip({ lang, m, id }: { lang: Locale; m?: Move; id: string }) {
  if (!m) return <span style={{ fontSize: "0.72rem" }}>{id}</span>;
  const c = TYPE_COLOR[m.type] || "#64748b";
  const st: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 10, textDecoration: "none", background: c + "1c", color: c, border: `1px solid ${c}50`, whiteSpace: "nowrap" };
  return raidMoveById(m.id) ? <Link prefetch={false} href={localizePath(lang, `/gbl/raid/moves/${m.slug}`)} style={st}>{moveName(lang, m)}</Link> : <span style={st}>{moveName(lang, m)}</span>;
}
function MonCell({ lang, r, mark, upcoming }: { lang: Locale; r: AttackerRow; mark?: boolean; upcoming: string }) {
  const inner = (
    <>
      <span style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", ...(r.shadow ? { background: "radial-gradient(circle, #a855f7ee 0%, #7c3aed99 42%, transparent 72%)", borderRadius: "50%" } : {}) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {r.dex > 0 && <img src={SPRITE(r.sid, r.dex)} alt={r.name} width={32} height={32} loading="lazy" style={{ imageRendering: "pixelated" }} />}
      </span>
      <span style={{ fontSize: "0.84rem", fontWeight: mark ? 900 : 700, color: r.href ? "#1d4ed8" : "#0f172a" }}>{r.name}</span>
      {/* 아직 출시 전인 포켓몬(딜러표의 "출시예정" 표시와 같은 기준) */}
      {r.upcoming && <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#0369a1", background: "#e0f2fe", borderRadius: 6, padding: "0 5px", whiteSpace: "nowrap" }}>{upcoming}</span>}
    </>
  );
  const st: React.CSSProperties = { display: "flex", alignItems: "center", gap: 7, textDecoration: "none" };
  return r.href ? <Link prefetch={false} href={localizePath(lang, r.href)} style={st}>{inner}</Link> : <span style={st}>{inner}</span>;
}

function AttackerTable({ lang, t, rows, showType, mark, sub }: { lang: Locale; t: NewsDict; rows: AttackerRow[]; showType: boolean; mark?: string[]; sub: string }) {
  if (!rows.length) return null;
  const marked = new Set(mark || []);
  return (
    <div style={{ margin: "10px 0 16px" }}>
      <div style={tableBox}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "center", width: 34 }}>{t.colRank}</th>
              <th style={th}>{t.colMon}</th>
              {showType && <th style={th}>{t.colType}</th>}
              <th style={th}>{t.colMoves}</th>
              <th style={{ ...th, textAlign: "right" }}>{t.colDps}</th>
              <th style={{ ...th, textAlign: "right" }}>{t.colOverall}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const on = marked.has(r.sid);
              return (
                <tr key={`${r.sid}-${r.type}`} style={on ? { background: "#fff7ed" } : undefined}>
                  <td style={{ ...td, textAlign: "center" }}><span style={{ ...num, color: i < 3 ? "#dc2626" : "#94a3b8" }}>{i + 1}</span></td>
                  <td style={td}><MonCell lang={lang} r={r} mark={on} upcoming={t.upcoming} /></td>
                  {showType && <td style={td}><TypeChip lang={lang} type={r.type} mult={r.mult > 2 ? r.mult : undefined} t={t} /></td>}
                  <td style={td}><span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}><MoveChip lang={lang} m={r.fast} id={r.fastId} /><MoveChip lang={lang} m={r.charged} id={r.chargedId} /></span></td>
                  <td style={{ ...td, textAlign: "right" }}><span style={num}>{r.dps.toFixed(1)}</span></td>
                  <td style={{ ...td, textAlign: "right" }}><span style={{ ...num, color: "#c2410c" }}>{r.er.toFixed(1)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.6 }}>{sub}</p>
    </div>
  );
}

function BossCard({ lang, t, sid, withCp }: { lang: Locale; t: NewsDict; sid: string; withCp: boolean }) {
  const b = bossInfo(lang, sid);
  if (!b) return null;
  const c = TYPE_COLOR[b.types[0]] || "#64748b";
  const line: React.CSSProperties = { display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" };
  const lab: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 800, color: "#64748b", minWidth: 44, paddingTop: 2 };
  return (
    <div style={{ margin: "10px 0 16px", background: `linear-gradient(110deg, ${c}1f, #ffffff 70%)`, border: `1px solid ${c}55`, borderLeft: `5px solid ${c}`, borderRadius: 12, padding: "0.8rem 0.95rem", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SPRITE(b.sid, b.dex)} alt={b.name} width={48} height={48} style={{ imageRendering: "pixelated" }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "1rem", fontWeight: 900, color: "#0f172a" }}>{b.name}</div>
          <div style={{ display: "flex", gap: 4, marginTop: 3 }}>{b.types.map((ty) => <TypeChip key={ty} lang={lang} type={ty} />)}</div>
        </div>
        <span style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
          {bossGuidePath(b.sid) && <Link href={localizePath(lang, bossGuidePath(b.sid)!)} style={{ fontSize: "0.76rem", fontWeight: 800, color: "#ea580c", textDecoration: "none" }}>{GUIDE_LABEL[lang]} →</Link>}
          {b.href && <Link href={localizePath(lang, b.href)} style={{ fontSize: "0.76rem", fontWeight: 800, color: "#1d4ed8", textDecoration: "none" }}>{t.dexLink}</Link>}
        </span>
      </div>
      <div style={line}><span style={{ ...lab, color: "#16a34a" }}>{t.weakH}</span><span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>{b.weak.map((w) => <TypeChip key={w.type} lang={lang} type={w.type} mult={w.mult} t={t} />)}</span></div>
      <div style={line}><span style={{ ...lab, color: "#ea580c" }}>{t.resistH}</span><span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>{b.resist.map((w) => <TypeChip key={w.type} lang={lang} type={w.type} mult={w.mult} />)}</span></div>
      {withCp && b.cp20 > 0 && (
        <div style={line}><span style={lab}>CP</span>
          <span style={{ fontSize: "0.84rem", color: "#334155" }}>{t.cpLabel} <b style={{ ...num, fontSize: "0.95rem" }}>{b.cp20.toLocaleString("en-US")}</b> · {t.cpBoost} <b style={num}>{b.cp25.toLocaleString("en-US")}</b></span>
        </div>
      )}
    </div>
  );
}

function IvTable({ lang, t, sid, floor, n }: { lang: Locale; t: NewsDict; sid: string; floor: number; n: number }) {
  const s = ivSummary(lang, sid, floor, n);
  // 표가 조용히 비면 글에 구멍이 난 채 발행된다 — 빌드에서 걸리게 한다.
  if (!s) throw new Error(`뉴스 { iv } 블록: 종족값을 찾을 수 없는 sid "${sid}"`);
  const cell = (p: { iv: string; level: number; cp: number }) => <><b style={num}>{p.iv}</b> <span style={{ fontSize: "0.72rem", color: "#64748b", whiteSpace: "nowrap" }}>Lv {p.level} · CP {p.cp.toLocaleString("en-US")}</span></>;
  return (
    <div style={{ margin: "10px 0 16px" }}>
      <div style={tableBox}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>{t.ivLeague}</th>
              <th style={th}>{t.ivBest}</th>
              <th style={th}>{t.ivHundo}</th>
              {floor > 0 && <th style={th}>{t.ivFloor(floor)}</th>}
            </tr>
          </thead>
          <tbody>
            {s.leagues.map((l) => (
              <tr key={l.league}>
                <td style={{ ...td, fontWeight: 800, whiteSpace: "nowrap" }}>{leagueName(lang, l.league)}</td>
                <td style={td}>{l.top.map((p, i) => <div key={p.iv} style={{ opacity: i === 0 ? 1 : 0.72 }}><span style={{ ...num, color: i === 0 ? "#dc2626" : "#94a3b8", marginRight: 5 }}>{i + 1}</span>{cell(p)}</div>)}</td>
                <td style={td}><span style={num}>{t.ivRank(l.hundo.rank)}</span> <span style={{ fontSize: "0.72rem", color: "#64748b", whiteSpace: "nowrap" }}>Lv {l.hundo.level} · CP {l.hundo.cp.toLocaleString("en-US")}</span></td>
                {floor > 0 && <td style={td}>{l.floorBest ? <>{cell(l.floorBest)} <span style={{ fontSize: "0.72rem", color: "#64748b" }}>({t.ivRank(l.floorBest.rank)})</span></> : "-"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.6 }}>{t.ivSub}</p>
    </div>
  );
}

export default function NewsBlocks({ lang, t, blocks, adAfter, ad }: { lang: Locale; t: NewsDict; blocks: Block[]; adAfter?: number; ad?: React.ReactNode }) {
  return (
    <>
      {blocks.map((b, i) => {
        let el: React.ReactNode = null;
        if ("h" in b) el = <h2 style={{ fontSize: "1.08rem", fontWeight: 800, color: "#0f172a", margin: "1.4rem 0 6px" }}>{b.h}</h2>;
        else if ("p" in b) el = <p style={{ margin: "0 0 10px", fontSize: "0.94rem", color: "#334155", lineHeight: 1.85 }}><Inline text={b.p} lang={lang} /></p>;
        else if ("ul" in b) el = <ul style={{ margin: "0 0 12px", paddingLeft: "1.2rem", fontSize: "0.94rem", color: "#334155", lineHeight: 1.85 }}>{b.ul.map((x, j) => <li key={j}><Inline text={x} lang={lang} /></li>)}</ul>;
        else if ("note" in b) el = <p style={{ margin: "14px 0", padding: "0.7rem 0.9rem", fontSize: "0.82rem", color: "#475569", lineHeight: 1.75, background: "#f8fafc", border: `1px solid ${BORDER}`, borderRadius: 10 }}><Inline text={b.note} lang={lang} /></p>;
        else if ("table" in b) el = (
          <div style={{ ...tableBox, margin: "10px 0 16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{b.table.head.map((x, j) => <th key={j} style={th}>{x}</th>)}</tr></thead>
              <tbody>{b.table.rows.map((row, j) => <tr key={j}>{row.map((x, k) => <td key={k} style={td}><Inline text={x} lang={lang} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        );
        else if ("boss" in b) el = <BossCard lang={lang} t={t} sid={b.boss} withCp />;
        else if ("weak" in b) el = <BossCard lang={lang} t={t} sid={b.weak} withCp={false} />;
        else if ("counters" in b) el = <AttackerTable lang={lang} t={t} rows={countersFor(lang, b.counters.boss, b.counters.n)} showType sub={t.countersSub} />;
        else if ("raidTop" in b) el = <AttackerTable lang={lang} t={t} rows={raidTopFor(lang, b.raidTop.type, b.raidTop.n)} showType={false} mark={b.raidTop.mark} sub={t.raidTopSub} />;
        else if ("iv" in b) el = <IvTable lang={lang} t={t} sid={b.iv.sid} floor={b.iv.floor || 0} n={b.iv.n || 3} />;
        else if ("dex" in b) { const sp = speciesOf(b.dex.replace(/_shadow$/, "")); el = sp ? (
          <div style={{ margin: "6px 0 14px" }}>
            <div style={{ fontSize: "0.86rem", fontWeight: 800, color: "#0f172a" }}>{sp.n[lang] || sp.n.en}</div>
            <DexHub lang={lang} id={b.dex} dex={sp.dex} league="" />
          </div>
        ) : null; }
        return <Fragment key={i}>{el}{adAfter === i && ad}</Fragment>;
      })}
    </>
  );
}
