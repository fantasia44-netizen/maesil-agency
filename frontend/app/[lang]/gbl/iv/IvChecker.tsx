"use client";
import { useMemo, useState } from "react";
import STATSJSON from "../pokedex_stats.json";
import NAMESJSON from "../pokedex_names.json";
import FORMSJSON from "../gbl_form_stats.json";
import MEGASJSON from "../gbl_mega_stats.json";
import { pokeSprite, monSprite, formDex, formDexById } from "../sprite";
import { leagueName } from "../contentI18n";
import { loadLogo, loadSprites, drawBrandFooter, saveDataUrl, shareDataUrl } from "../raid/raidShareUtil";
import { track } from "../../../../lib/track";
import ShareModal from "../ShareModal";
import { rankIVs, LEAGUE_CAP, cpOf, CPM, type Base, type IVRow } from "./ivRank";
import type { IvDict } from "./dict";
import type { Locale } from "../../../../lib/i18n";

const STATS = STATSJSON as unknown as Record<string, Base>;
const NAMES = NAMESJSON as unknown as Record<string, { ko: string; en: string; ja: string }>;
type FormEntry = { id: string; ko: string; en: string; ja: string; dex: number; a: number; d: number; s: number };
const FORMS = FORMSJSON as unknown as FormEntry[];
const MEGAS = MEGASJSON as unknown as FormEntry[]; // 메가/원시(gamemaster 종족값) — 전 리그 CP캡은 rankIVs가 자동 적용
// dex → 그 종의 메가 종족값(X/Y·원시 포함). 일반몬 화면에서 "메가진화 시 CP" 계산용.
const MEGA_BY_DEX: Record<string, { variant: string; a: number; d: number; s: number }[]> = {};
for (const m of MEGAS) {
  const v = m.id.endsWith("_mega_x") ? "X" : m.id.endsWith("_mega_y") ? "Y" : "";
  (MEGA_BY_DEX[String(m.dex)] = MEGA_BY_DEX[String(m.dex)] || []).push({ variant: v, a: m.a, d: m.d, s: m.s });
}
// 검색 대상: 전 도감(base) + 폼체인지/합체 + 메가/원시. 메가 시 각 리그(1500/2500/무제한) 최적 IV·CP.
type Poke = { key: string; ko: string; en: string; ja: string; dex: string; a: number; d: number; s: number; form: boolean; mega?: boolean; sid?: string };
// base 도감 이름 오버라이드(폼 구분 필요한 종만) — 예: 지가르데 base=50% 폼
const BASE_NAME_OVERRIDE: Record<string, { ko: string; en: string; ja: string }> = {
  "718": { ko: "지가르데 (50% 폼)", en: "Zygarde (50%)", ja: "ジガルデ (50%)" },
};
const POKELIST: Poke[] = [
  ...Object.keys(STATS).filter((dx) => NAMES[dx]).map((dx) => ({ key: dx, ...(BASE_NAME_OVERRIDE[dx] || NAMES[dx]), dex: dx, a: STATS[dx].a, d: STATS[dx].d, s: STATS[dx].s, form: false })),
  ...FORMS.map((f) => ({ key: "f:" + f.id, ko: f.ko, en: f.en, ja: f.ja, dex: String(f.dex), a: f.a, d: f.d, s: f.s, form: true })),
  ...MEGAS.map((m) => ({ key: "m:" + m.id, ko: m.ko, en: m.en, ja: m.ja, dex: String(m.dex), a: m.a, d: m.d, s: m.s, form: true, mega: true, sid: m.id })),
].sort((a, b) => Number(a.dex) - Number(b.dex) || (a.form ? 1 : 0) - (b.form ? 1 : 0));
const spriteOf = (p: Poke) => (p.mega && p.sid ? pokeSprite(formDexById(p.sid, p.dex)) : p.form ? monSprite(p.ko, p.dex) : pokeSprite(p.dex));

const LEAGUES: { key: string; c: string }[] = [
  { key: "great", c: "#2563eb" }, { key: "ultra", c: "#d97706" }, { key: "master", c: "#7c3aed" },
];
const localName = (lang: Locale, p: { ko: string; en: string; ja: string; "zh-TW"?: string }) => (lang === "en" ? p.en : lang === "ja" ? p.ja : lang === "zh-TW" ? (p["zh-TW"] || p.en) : p.ko);

export default function IvChecker({ lang, t }: { lang: Locale; t: IvDict }) {
  const [q, setQ] = useState("");
  const [selKey, setSelKey] = useState<string | null>(null);
  const [league, setLeague] = useState("great");
  const [bb, setBb] = useState(false);
  const [iv, setIv] = useState({ a: "", d: "", s: "" });
  const [curCp, setCurCp] = useState(""); // 내 유닛 현재 CP(선택) — 실제 레벨 기준 메가 CP 계산용
  const [myRow, setMyRow] = useState<IVRow | null>(null);
  const [ivErr, setIvErr] = useState("");
  const [img, setImg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return POKELIST.filter((p) => p.ko.toLowerCase().includes(s) || p.en.toLowerCase().includes(s) || p.ja.includes(q.trim()) || ((p as { "zh-TW"?: string })["zh-TW"] || "").includes(q.trim()) || p.dex === s).slice(0, 24);
  }, [q]);

  const picked = selKey ? POKELIST.find((p) => p.key === selKey) || null : null;
  const rows = useMemo(() => {
    if (!picked) return [];
    return rankIVs({ a: picked.a, d: picked.d, s: picked.s }, LEAGUE_CAP[league], bb ? 51 : 50);
  }, [selKey, league, bb]); // eslint-disable-line react-hooks/exhaustive-deps
  const findMyIv = () => {
    const a = Number(iv.a), d = Number(iv.d), s = Number(iv.s);
    if (![a, d, s].every((n) => Number.isInteger(n) && n >= 0 && n <= 15)) { setIvErr(t.invalidIv); setMyRow(null); return; }
    setIvErr("");
    setMyRow(rows.find((r) => r.ia === a && r.id === d && r.is === s) || null);
  };

  const CARD = "#fff", BORDER = "#e3e8f2";
  const lgC = LEAGUES.find((l) => l.key === league)!.c;
  const top = rows.slice(0, 100);
  // 메가/원시 선택 시: 같은 레벨의 "메진 전"(비메가) CP — 메가는 진화 후 레벨업 불가라, 이 CP까지 키운 뒤 메가진화.
  const megaBase = picked && picked.mega && STATS[picked.dex] ? STATS[picked.dex] : null;
  const preCp = (r: IVRow) => (megaBase ? cpOf(megaBase.a + r.ia, megaBase.d + r.id, megaBase.s + r.is, CPM[Math.round((r.level - 1) * 2)]) : null);
  // 일반몬 선택 시: 그 종에 메가가 있으면 "메가진화 시 CP"(같은 레벨) — 내 개체를 메진하면 얼마가 되나.
  const megaForms = picked && !picked.mega ? (MEGA_BY_DEX[picked.dex] || []) : [];
  const megaCpStr = (r: IVRow) => megaForms.map((m) => (m.variant ? m.variant + " " : "") + cpOf(m.a + r.ia, m.d + r.id, m.s + r.is, CPM[Math.round((r.level - 1) * 2)])).join(" / ");
  // 메가 폼별 IV 랭킹(현재 리그) — 내 IV가 '메가로선' 몇 등/몇 %인지 산출용.
  const megaRanks = useMemo(() => megaForms.map((m) => rankIVs({ a: m.a, d: m.d, s: m.s }, LEAGUE_CAP[league], bb ? 51 : 50)), [selKey, league, bb]); // eslint-disable-line react-hooks/exhaustive-deps
  // 내 유닛: IV + 현재 CP → 실제 레벨 추정 → 그 레벨에서 메가진화 시 CP(X/Y 각각).
  const myUnitMega = (() => {
    if (!megaForms.length || !picked || !STATS[picked.dex]) return null;
    const a = Number(iv.a), d = Number(iv.d), s = Number(iv.s), c = Number(curCp);
    if (![a, d, s].every((n) => Number.isInteger(n) && n >= 0 && n <= 15) || !(c >= 10)) return null;
    const b = STATS[picked.dex]; const maxIdx = 100; // 레벨1~51 전부 탐색(내 유닛이 베프/고레벨일 수 있음)
    let bi = 0, bd = Infinity;
    for (let i = 0; i <= maxIdx; i++) { const cc = cpOf(b.a + a, b.d + d, b.s + s, CPM[i]); const df = Math.abs(cc - c); if (df < bd) { bd = df; bi = i; } }
    const baseCp = cpOf(b.a + a, b.d + d, b.s + s, CPM[bi]);
    // 근사치 스냅은 허용(반레벨 이산이라 ±약간). 다만 그 IV로 도달 불가능한 범위 밖(자릿수 오타 등)이면 경고.
    if (Math.abs(baseCp - c) > 80) return { invalid: true as const };
    const cap = LEAGUE_CAP[league];
    return {
      level: 1 + bi * 0.5, baseCp,
      megaCps: megaForms.map((m, i) => {
        const mc = cpOf(m.a + a, m.d + d, m.s + s, CPM[bi]);
        const rr = megaRanks[i]?.find((r) => r.ia === a && r.id === d && r.is === s);
        return { variant: m.variant, cp: mc, rank: rr?.rank ?? null, pct: rr?.pct ?? null, over: cap != null && mc > cap };
      }),
    };
  })();
  const MEGA_L = ({
    ko: { pre: "메진 전", note: "⚠️ 메가는 진화 후 파워업 불가 — 일반몬을 '메진 전 CP'까지 키운 뒤 메가진화하면 위 CP가 됩니다.", post: "메가진화 시", postNote: "💡 '메가진화 시' = 이 레벨에서 메가진화하면 되는 CP(같은 개체·레벨). 메가는 진화 후 파워업 불가.", curCpL: "현재 CP", unit: "내 유닛", mismatch: "⚠️ 입력한 공/방/체로는 그 CP가 나오지 않습니다 — 개체값과 현재 CP를 다시 확인하세요.", over: "리그 초과·탈락", ok: "리그 OK", rankU: "위" },
    en: { pre: "pre-Mega", note: "⚠️ Can't power up while Mega — raise the base form to the 'pre-Mega' CP, then Mega-evolve to reach the CP shown.", post: "as Mega", postNote: "💡 'as Mega' = CP if you Mega-evolve at this level (same IVs/level). Can't power up while Mega.", curCpL: "Current CP", unit: "Your unit", mismatch: "⚠️ That CP isn't possible with those IVs — double-check the IVs and current CP.", over: "over cap · out", ok: "eligible", rankU: "" },
    ja: { pre: "メガ前", note: "⚠️ メガ中はパワーアップ不可 — 通常個体を「メガ前CP」まで上げてからメガ進化すると上のCPになります。", post: "メガ時", postNote: "💡 「メガ時」= このレベルでメガ進化した時のCP(同個体・同レベル)。メガ中はパワーアップ不可。", curCpL: "現在CP", unit: "マイ個体", mismatch: "⚠️ その個体値ではそのCPになりません — 個体値と現在CPを再確認してください。", over: "上限超過·不可", ok: "使用可", rankU: "位" },
    "zh-TW": { pre: "超進化前", note: "⚠️ 超進化後無法強化 — 將一般個體練到「超進化前CP」再超進化，即為上方CP。", post: "超進化時", postNote: "💡 「超進化時」= 在此等級超進化後的CP（同個體·同等級）。超進化後無法強化。", curCpL: "目前CP", unit: "我的個體", mismatch: "⚠️ 該個體值無法達到此CP — 請重新確認個體值與目前CP。", over: "超過上限·不可", ok: "可用", rankU: "名" },
  } as Record<string, { pre: string; note: string; post: string; postNote: string; curCpL: string; unit: string; mismatch: string; over: string; ok: string; rankU: string }>)[lang] || { pre: "pre-Mega", note: "", post: "as Mega", postNote: "", curCpL: "Current CP", unit: "Your unit", mismatch: "", over: "over", ok: "ok", rankU: "" };
  const tpl = (s: string, n: number) => s.replace("{n}", String(n));

  // IV 순위표 상위 N개를 이미지로(공유·저장). 출처 gblnote.com.
  const buildImage = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      const N = 20, share = rows.slice(0, N);
      const spDex = picked.form ? String(formDex(picked.ko, Number(picked.dex))) : picked.dex;
      const [imgs, logo] = await Promise.all([loadSprites([spDex]), loadLogo()]);
      const W = 1080, headH = 220, thH = 52, rowH = 46, footH = 150;
      const H = headH + thH + rowH * share.length + footH;
      const c = document.createElement("canvas"); const SC = 2; c.width = W * SC; c.height = H * SC;
      const ctx = c.getContext("2d"); if (!ctx) { setBusy(false); return; }
      ctx.scale(SC, SC);
      ctx.fillStyle = "#eceff7"; ctx.fillRect(0, 0, W, H);
      const M = 22;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(M, M, W - M * 2, H - M * 2, 28); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.roundRect(M, M, W - M * 2, 14, 28); ctx.clip(); ctx.fillStyle = lgC; ctx.fillRect(M, M, W - M * 2, 20); ctx.restore();
      // 헤더: 스프라이트 + 이름 + 리그 + 종족값
      const sp = imgs[spDex]; if (sp) ctx.drawImage(sp, 44, 56, 116, 116);
      const nx = 178;
      ctx.textAlign = "left"; ctx.fillStyle = "#0f172a"; ctx.font = "900 54px system-ui, sans-serif";
      ctx.fillText(localName(lang, picked), nx, 108);
      ctx.fillStyle = lgC; ctx.font = "800 30px system-ui, sans-serif";
      ctx.fillText(`${leagueName(lang, league)} · ${tpl(t.imgTopLabel, N)}`, nx, 150);
      ctx.fillStyle = "#94a3b8"; ctx.font = "600 26px system-ui, sans-serif";
      ctx.fillText(`#${picked.dex} · ${picked.a}/${picked.d}/${picked.s}`, nx, 188);
      // 표 헤더
      const cols: [string, number, CanvasTextAlign][] = [[t.thRank, 90, "center"], [t.thIv, 150, "left"], [t.thCp, 470, "right"], [t.thLv, 590, "right"], [t.thAtk, 700, "right"], [t.thDef, 810, "right"], [t.thHp, 900, "right"], ["%", W - 46, "right"]];
      const thY = headH + 34;
      ctx.font = "700 27px system-ui, sans-serif"; ctx.fillStyle = "#94a3b8";
      for (const [lbl, x, al] of cols) { ctx.textAlign = al; ctx.fillText(lbl, x, thY); }
      // 행
      share.forEach((r, i) => {
        const y = headH + thH + rowH * i + 31;
        if (i % 2 === 1) { ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.roundRect(40, y - 32, W - 80, rowH - 6, 8); ctx.fill(); }
        const c1 = r.rank <= 3 ? lgC : "#334155";
        ctx.font = "800 28px system-ui, sans-serif";
        const vals: [string, number, CanvasTextAlign, string][] = [
          [String(r.rank), 90, "center", r.rank <= 3 ? lgC : "#94a3b8"], [`${r.ia}/${r.id}/${r.is}`, 150, "left", "#0f172a"],
          [String(r.cp), 470, "right", "#334155"], [String(r.level), 590, "right", "#64748b"],
          [r.att.toFixed(1), 700, "right", "#475569"], [r.def.toFixed(1), 810, "right", "#475569"], [String(r.hp), 900, "right", "#475569"],
          [`${r.pct.toFixed(2)}%`, W - 46, "right", c1],
        ];
        for (const [txt, x, al, col] of vals) { ctx.textAlign = al; ctx.fillStyle = col; ctx.fillText(txt, x, y); }
      });
      drawBrandFooter(ctx, logo, W, headH + thH + rowH * share.length, footH, lgC, `${t.imgFooter} · ${leagueName(lang, league)}`);
      setImg(c.toDataURL("image/png"));
      setFile(null);
      c.toBlob((b) => { if (b) setFile(new File([b], `gbl-iv-${picked.ko}.png`, { type: "image/png" })); }, "image/png");
    } finally { setBusy(false); }
  };

  return (
    <div>
      {/* 검색 */}
      <div style={{ position: "relative" }}>
        <input value={q} onChange={(e) => { setQ(e.target.value); setMyRow(null); }} placeholder={t.searchPlaceholder}
          style={{ width: "100%", padding: "11px 14px", fontSize: "0.95rem", borderRadius: 12, border: `1.5px solid ${BORDER}`, background: "#fff", color: "#0f172a", outline: "none" }} />
        {matches.length > 0 && (
          <div style={{ position: "absolute", zIndex: 20, top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: "0 12px 30px -10px rgba(15,23,42,.2)", maxHeight: 320, overflowY: "auto" }}>
            {matches.map((p) => (
              <button key={p.key} onClick={() => { setSelKey(p.key); setQ(""); setMyRow(null); setIv({ a: "", d: "", s: "" }); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "7px 12px", background: "none", border: "none", cursor: "pointer", borderBottom: `1px solid #f1f5f9` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={spriteOf(p)} alt="" width={32} height={32} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>{localName(lang, p)}</span>
                <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#94a3b8" }}>#{p.dex}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "6px 2px 0" }}>{t.searchHint}</div>

      {!picked ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem", fontSize: "0.92rem" }}>{t.selectPrompt}</div>
      ) : (
        <>
          {/* 선택 헤더 */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, background: `linear-gradient(110deg, ${lgC}18, #fff 75%)`, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${lgC}`, borderRadius: 14, padding: "10px 14px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={spriteOf(picked)} alt={localName(lang, picked)} width={54} height={54} style={{ imageRendering: "pixelated", objectFit: "contain" }} />
            <div>
              <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#0f172a" }}>{localName(lang, picked)}</div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>#{picked.dex} · {picked.a}/{picked.d}/{picked.s}</div>
            </div>
          </div>

          {/* 리그 탭 + 베프 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {LEAGUES.map((l) => {
              const on = l.key === league;
              return (
                <button key={l.key} onClick={() => { setLeague(l.key); setMyRow(null); }}
                  style={{ padding: "7px 15px", borderRadius: 999, fontSize: "0.84rem", fontWeight: 800, cursor: "pointer",
                    border: `1px solid ${on ? l.c : BORDER}`, background: on ? l.c : "#fff", color: on ? "#fff" : "#64748b" }}>
                  {leagueName(lang, l.key)}
                </button>
              );
            })}
            <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "#475569", cursor: "pointer" }}>
              <input type="checkbox" checked={bb} onChange={(e) => { setBb(e.target.checked); setMyRow(null); }} /> {t.bestBuddy}
            </label>
          </div>

          {/* 내 IV 찾기 */}
          <div style={{ marginTop: 12, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a", marginBottom: 7 }}>🔎 {t.findH}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {([["a", t.ivAtk], ["d", t.ivDef], ["s", t.ivHp]] as const).map(([k, lb]) => (
                <span key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: "0.74rem", color: "#64748b" }}>{lb}</span>
                  <input type="number" min={0} max={15} value={iv[k]} onChange={(e) => setIv((v) => ({ ...v, [k]: e.target.value }))}
                    style={{ width: 52, padding: "6px 8px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", color: "#0f172a", fontSize: "0.85rem", textAlign: "center" }} />
                </span>
              ))}
              {megaForms.length > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: "0.74rem", color: "#d97706", fontWeight: 700 }}>{MEGA_L.curCpL}</span>
                  <input type="number" min={10} value={curCp} onChange={(e) => setCurCp(e.target.value)} placeholder="CP"
                    style={{ width: 68, padding: "6px 8px", borderRadius: 8, border: "1px solid #fbbf24", background: "#fffbeb", color: "#0f172a", fontSize: "0.85rem", textAlign: "center" }} />
                </span>
              )}
              <button onClick={findMyIv} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: lgC, color: "#fff", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>{t.findBtn}</button>
              {ivErr && <span style={{ fontSize: "0.74rem", color: "#dc2626" }}>{ivErr}</span>}
            </div>
            {myUnitMega && ("invalid" in myUnitMega ? (
              <div style={{ marginTop: 9, fontSize: "0.8rem", fontWeight: 700, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 12px" }}>{MEGA_L.mismatch}</div>
            ) : (
              <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 8, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "8px 12px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#92400e" }}>🔮 {MEGA_L.unit}</span>
                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>CP {myUnitMega.baseCp} · L{myUnitMega.level}</span>
                <span style={{ fontSize: "0.78rem", color: "#92400e" }}>→ {MEGA_L.post}</span>
                {myUnitMega.megaCps.map((m, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontSize: "1.05rem", fontWeight: 900, color: m.over ? "#dc2626" : "#16a34a" }}>{m.variant ? m.variant + " " : ""}{m.cp}</span>
                    <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#fff", background: m.over ? "#dc2626" : "#16a34a", borderRadius: 5, padding: "1px 6px" }}>{m.over ? MEGA_L.over : MEGA_L.ok}</span>
                    {m.rank != null && <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>#{m.rank}{MEGA_L.rankU} · {m.pct!.toFixed(1)}%</span>}
                  </span>
                ))}
              </div>
            ))}
            {myRow && (
              <div style={{ marginTop: 9, display: "flex", alignItems: "center", gap: 10, background: `${lgC}14`, border: `1px solid ${lgC}44`, borderRadius: 10, padding: "8px 12px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.78rem", color: "#475569" }}>{t.yourRank}</span>
                <span style={{ fontSize: "1.15rem", fontWeight: 900, color: lgC }}>#{myRow.rank}{t.rankUnit}</span>
                <span style={{ fontSize: "0.78rem", color: "#64748b" }}>· {myRow.pct.toFixed(2)}% · CP {myRow.cp}{megaBase && <span style={{ color: "#d97706", fontWeight: 700 }}> ({MEGA_L.pre} {preCp(myRow)})</span>}{megaForms.length > 0 && <span style={{ color: "#d97706", fontWeight: 700 }}> · {MEGA_L.post} {megaCpStr(myRow)}</span>} · L{myRow.level}</span>
              </div>
            )}
          </div>

          {megaBase && (
            <div style={{ marginTop: 10, fontSize: "0.76rem", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "8px 12px", lineHeight: 1.5 }}>{MEGA_L.note}</div>
          )}
          {megaForms.length > 0 && (
            <div style={{ marginTop: 10, fontSize: "0.76rem", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "8px 12px", lineHeight: 1.5 }}>{MEGA_L.postNote}</div>
          )}

          {/* 순위표 */}
          <div style={{ marginTop: 12, overflowX: "auto", border: `1px solid ${BORDER}`, borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", minWidth: 560 }}>
              <thead>
                <tr style={{ background: "#f8fafc", color: "#64748b" }}>
                  {[t.thRank, t.thIv, t.thCp, t.thLv, t.thAtk, t.thDef, t.thHp, t.thProduct].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 0 ? "center" : i === 1 ? "left" : "right", padding: "8px 9px", fontWeight: 800, whiteSpace: "nowrap", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top.map((r) => {
                  const mine = myRow && r.rank === myRow.rank;
                  return (
                    <tr key={r.rank} style={{ background: mine ? `${lgC}18` : r.rank % 2 === 0 ? "#fbfcfe" : "#fff" }}>
                      <td style={{ textAlign: "center", padding: "6px 9px", fontWeight: 900, color: r.rank <= 3 ? lgC : "#94a3b8" }}>{r.rank}</td>
                      <td style={{ padding: "6px 9px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{r.ia}/{r.id}/{r.is}</td>
                      <td style={{ textAlign: "right", padding: "6px 9px", color: "#334155" }}>{r.cp}{megaBase && <span style={{ display: "block", fontSize: "0.68rem", color: "#d97706", fontWeight: 700, whiteSpace: "nowrap" }}>{MEGA_L.pre} {preCp(r)}</span>}{megaForms.length > 0 && <span style={{ display: "block", fontSize: "0.68rem", color: "#d97706", fontWeight: 700, whiteSpace: "nowrap" }}>{MEGA_L.post} {megaCpStr(r)}</span>}</td>
                      <td style={{ textAlign: "right", padding: "6px 9px", color: "#64748b" }}>{r.level}</td>
                      <td style={{ textAlign: "right", padding: "6px 9px", color: "#475569" }}>{r.att.toFixed(1)}</td>
                      <td style={{ textAlign: "right", padding: "6px 9px", color: "#475569" }}>{r.def.toFixed(1)}</td>
                      <td style={{ textAlign: "right", padding: "6px 9px", color: "#475569" }}>{r.hp}</td>
                      <td style={{ textAlign: "right", padding: "6px 9px", fontWeight: 700, color: lgC }}>{r.pct.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "7px 2px 0" }}>{t.topNote}</div>

          {/* 공유·저장 (상위 20위 이미지) */}
          <button onClick={buildImage} disabled={busy}
            style={{ width: "100%", marginTop: 12, padding: "11px", borderRadius: 10, border: "none", cursor: busy ? "default" : "pointer", fontWeight: 800, fontSize: "0.9rem", background: busy ? "#cbd5e1" : `linear-gradient(90deg,${lgC},#7c3aed)`, color: "#fff" }}>
            {busy ? t.imgBuilding : t.shareBtn}
          </button>
          {img && (
            <ShareModal img={img} onClose={() => setImg(null)}>
              <button onClick={() => { track("share", "/gbl/iv", "iv-table"); shareDataUrl(img, file, `gbl-iv-${picked?.ko || "iv"}.png`, `${picked ? localName(lang, picked) : ""} ${leagueName(lang, league)} IV`, `${picked ? localName(lang, picked) : ""} · gblnote.com`); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: `linear-gradient(90deg,${lgC},#7c3aed)`, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>{t.imgShare}</button>
              <button onClick={() => { track("download", "/gbl/iv", "iv-table"); saveDataUrl(img, `gbl-iv-${picked?.ko || "iv"}.png`); }} style={{ padding: "11px 20px", borderRadius: 10, border: "none", background: "#334155", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.92rem" }}>{t.imgSave}</button>
              <button onClick={() => setImg(null)} style={{ padding: "11px 16px", borderRadius: 10, border: "1px solid #e3e8f2", background: "#f1f5f9", color: "#64748b", cursor: "pointer", fontSize: "0.9rem" }}>{t.imgClose}</button>
            </ShareModal>
          )}
        </>
      )}
    </div>
  );
}
