"use client";
// PvP 배틀 시뮬레이터 UI — PvPoke MIT 엔진(pvpEngine.js) 위에 자체 디자인.
// 4모드: 1:1 배틀 · 메타분석 · 매트릭스 · 팀빌더. IV·기술·레벨·그림자·베파·실드 지정.
import { useEffect, useMemo, useRef, useState } from "react";
import { toPng, toJpeg } from "html-to-image";
import PKNAMES from "../pokedex_names.json";
import MOVENAMES from "../pvp_move_names.json";
import { pokeSprite, formDexById } from "../sprite";
import { track } from "../../../../lib/track";
import {
  runBattle, runMulti, runMatrix, pokemonList, recommendedMoveset, moveInfo, metaList, defaultsFor,
  setSeason, CP, type League, type Cfg, type PokeInfo, type SeasonNum,
} from "./pvpoke";
import type { SimDict } from "./dict";
import type { Locale } from "../../../../lib/i18n";

const PKN = PKNAMES as unknown as Record<string, { ko: string; en: string; ja: string }>;
const MN = MOVENAMES as unknown as Record<string, { ko: string; ja: string; en: string }>;

const TYPE_COLOR: Record<string, string> = {
  normal: "#9099a1", fire: "#ff9d55", water: "#4d90d5", electric: "#f4d23c", grass: "#63bc5a", ice: "#73cec0",
  fighting: "#ce4069", poison: "#ab6ac8", ground: "#d97746", flying: "#8fa8dd", psychic: "#f97176", bug: "#90c12c",
  rock: "#c7b78b", ghost: "#5269ad", dragon: "#0b6dc3", dark: "#5a5366", steel: "#5a8ea1", fairy: "#ec8fe6",
};

// 폼 라벨(다국어) — speciesId 접미 매칭
const FORM_SUFFIX: Record<string, { ko: string; en: string; ja: string; "zh-TW": string }> = {
  therian: { ko: "영물", en: "Therian", ja: "霊獣", "zh-TW": "靈獸" }, origin: { ko: "오리진", en: "Origin", ja: "オリジン", "zh-TW": "起源" },
  incarnate: { ko: "화신", en: "Incarnate", ja: "化身", "zh-TW": "化身" }, altered: { ko: "another", en: "Altered", ja: "アナザー", "zh-TW": "別種" },
  black: { ko: "블랙", en: "Black", ja: "ブラック", "zh-TW": "黑" }, white: { ko: "화이트", en: "White", ja: "ホワイト", "zh-TW": "白" },
  attack: { ko: "어택", en: "Attack", ja: "アタック", "zh-TW": "攻擊" }, defense: { ko: "디펜스", en: "Defense", ja: "ディフェンス", "zh-TW": "防禦" }, speed: { ko: "스피드", en: "Speed", ja: "スピード", "zh-TW": "速度" },
  heat: { ko: "히트", en: "Heat", ja: "ヒート", "zh-TW": "加熱" }, wash: { ko: "워시", en: "Wash", ja: "ウォッシュ", "zh-TW": "清洗" }, frost: { ko: "프로스트", en: "Frost", ja: "フロスト", "zh-TW": "結冰" }, fan: { ko: "팬", en: "Fan", ja: "スピン", "zh-TW": "旋轉" }, mow: { ko: "모우", en: "Mow", ja: "カット", "zh-TW": "切割" },
  alolan: { ko: "알로라", en: "Alolan", ja: "アローラ", "zh-TW": "阿羅拉" }, galarian: { ko: "가라르", en: "Galarian", ja: "ガラル", "zh-TW": "伽勒爾" }, hisuian: { ko: "히스이", en: "Hisuian", ja: "ヒスイ", "zh-TW": "洗翠" }, paldea: { ko: "팔데아", en: "Paldea", ja: "パルデア", "zh-TW": "帕底亞" },
  mega: { ko: "메가", en: "Mega", ja: "メガ", "zh-TW": "超級" }, mega_x: { ko: "메가X", en: "Mega X", ja: "メガX", "zh-TW": "超級X" }, mega_y: { ko: "메가Y", en: "Mega Y", ja: "メガY", "zh-TW": "超級Y" }, primal: { ko: "원시", en: "Primal", ja: "ゲンシ", "zh-TW": "原始" },
  dusk_mane: { ko: "황혼의갈기", en: "Dusk Mane", ja: "たそがれ", "zh-TW": "黃昏之鬃" }, dawn_wings: { ko: "새벽의날개", en: "Dawn Wings", ja: "あかつき", "zh-TW": "拂曉之翼" },
  ice_rider: { ko: "백마", en: "Ice Rider", ja: "はくば", "zh-TW": "白馬" }, shadow_rider: { ko: "흑마", en: "Shadow Rider", ja: "こくば", "zh-TW": "黑馬" },
  crowned_sword: { ko: "검왕", en: "Crowned Sword", ja: "けんのおう", "zh-TW": "劍王" }, crowned_shield: { ko: "방패왕", en: "Crowned Shield", ja: "たてのおう", "zh-TW": "盾王" },
  hero: { ko: "", en: "", ja: "", "zh-TW": "" }, zen: { ko: "달마모드", en: "Zen", ja: "ダルマ", "zh-TW": "達摩模式" }, standard: { ko: "", en: "", ja: "", "zh-TW": "" },
  aria: { ko: "보이스", en: "Aria", ja: "ボイス", "zh-TW": "歌聲" }, pirouette: { ko: "스텝", en: "Pirouette", ja: "ステップ", "zh-TW": "舞步" },
  blade: { ko: "블레이드", en: "Blade", ja: "ブレード", "zh-TW": "劍刃" }, shield: { ko: "실드", en: "Shield", ja: "シールド", "zh-TW": "盾牌" },
};
const FORM_KEYS = Object.keys(FORM_SUFFIX).sort((a, b) => b.length - a.length);
function parseForm(speciesId: string): string {
  const id = speciesId.replace(/_shadow$/, "");
  for (const k of FORM_KEYS) if (id.endsWith("_" + k)) return k;
  return "";
}
function formLabel(lang: Locale, form: string): string {
  const f = FORM_SUFFIX[form];
  if (f) return lang === "en" || lang === "zh-TW" ? f.en : lang === "ja" ? f.ja : f.ko;
  return form.replace(/(^|_)([a-z0-9])/g, (_, a, b) => (a ? " " : "") + b.toUpperCase());
}
function monName(lang: Locale, p: { speciesId: string; speciesName: string; dex: number }): string {
  const cleanEn = p.speciesName.replace(/\s*\((Shadow|Busted)\)/i, ""); // 그림자(😈)·디스가이즈 배틀상태 → 이름서 제거
  if (lang === "en") return cleanEn;
  const base = PKN[String(p.dex)] as Record<string, string> | undefined;
  const bn = base ? (lang === "ja" ? base.ja : lang === "zh-TW" ? (base["zh-TW"] || base.en) : base.ko) : null;
  if (!bn) return cleanEn;
  const form = parseForm(p.speciesId);
  if (form && FORM_SUFFIX[form]) { const fl = formLabel(lang, form); return fl ? `${bn} (${fl})` : bn; }
  const m = cleanEn.match(/\(([^)]+)\)/);
  return m ? `${bn} (${m[1]})` : bn;
}
const moveName = (lang: Locale, id: string): string => { const m = MN[id] as Record<string, string> | undefined; return m ? (lang === "en" ? m.en : lang === "ja" ? m.ja : lang === "zh-TW" ? (m["zh-TW"] || m.en) : m.ko) : id; };
// pokeSummary(엔진결과)용 이름 지역화 — {speciesId, name(en), dex}
const monNameOf = (lang: Locale, p: { speciesId: string; name: string; dex: number }): string => monName(lang, { speciesId: p.speciesId, speciesName: p.name, dex: p.dex });
const moveType = (id: string): string => (moveInfo(id)?.type || "normal");

// ── 슬롯 상태 ──
type Slot = {
  speciesId: string | null;
  fast: string; charged: [string, string];
  shadow: boolean; bestBuddy: boolean;
  shields: number;
  customIV: boolean; ivs: [number, number, number]; autoLevel: boolean; level: number;
};
const emptySlot = (): Slot => ({ speciesId: null, fast: "", charged: ["", ""], shadow: false, bestBuddy: false, shields: 1, customIV: false, ivs: [0, 15, 15], autoLevel: true, level: 40 });
function slotToCfg(s: Slot): Cfg | null {
  if (!s.speciesId) return null;
  return {
    speciesId: s.speciesId, shadow: s.shadow, bestBuddy: s.bestBuddy,
    fast: s.fast || undefined, charged: s.charged.filter(Boolean),
    ivs: s.customIV ? s.ivs : undefined,
    level: s.customIV && !s.autoLevel ? s.level : undefined,
    shields: s.shields,
  };
}

// ── 공용 소품 ──
function TypeBadge({ ty }: { ty: string }) {
  return <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#fff", background: TYPE_COLOR[ty] || "#888", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: 0.3 }}>{ty}</span>;
}
function Sprite({ dex, sid, size = 44, shadow }: { dex: number; sid?: string; size?: number; shadow?: boolean }) {
  const d = sid ? formDexById(sid, dex) : dex;
  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size }}>
      <img src={pokeSprite(d)} alt="" width={size} height={size} style={{ objectFit: "contain" }} loading="lazy" crossOrigin="anonymous" />
      {shadow && <span style={{ position: "absolute", right: -2, bottom: -2, fontSize: size * 0.34, lineHeight: 1, filter: "drop-shadow(0 1px 1px rgba(0,0,0,.4))" }}>😈</span>}
    </span>
  );
}

// ── 포켓몬 검색 피커 ──
function MonPicker({ list, lang, t, value, onPick }: { list: PokeInfo[]; lang: Locale; t: SimDict; value: PokeInfo | null; onPick: (p: PokeInfo) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list.slice(0, 30);
    return list.filter((p) => p.speciesName.toLowerCase().includes(s) || monName(lang, p).toLowerCase().includes(s) || String(p.dex) === s).slice(0, 40);
  }, [q, list, lang]);
  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input
        value={open ? q : value ? monName(lang, value) : ""}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => { setQ(""); setOpen(true); }}
        placeholder={t.searchPh}
        style={{ width: "100%", padding: "0.5rem 0.6rem", borderRadius: 9, border: "1.5px solid #d6def0", fontSize: "0.9rem", fontWeight: 600, color: "#0f172a", background: "#fff", outline: "none" }}
      />
      {open && (
        <div style={{ position: "absolute", zIndex: 30, top: "calc(100% + 4px)", left: 0, right: 0, maxHeight: 280, overflowY: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 12px 30px rgba(15,23,42,.14)" }}>
          {results.map((p) => (
            <button key={p.speciesId} onMouseDown={() => { onPick(p); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "0.35rem 0.55rem", border: "none", borderBottom: "1px solid #f1f5f9", background: "transparent", cursor: "pointer", textAlign: "left" }}>
              <Sprite dex={p.dex} sid={p.speciesId} size={30} />
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", flex: 1 }}>{monName(lang, p)}</span>
              <span style={{ display: "flex", gap: 3 }}>{p.types.map((ty) => <TypeBadge key={ty} ty={ty} />)}</span>
            </button>
          ))}
          {results.length === 0 && <div style={{ padding: "0.6rem", fontSize: "0.82rem", color: "#94a3b8" }}>—</div>}
        </div>
      )}
    </div>
  );
}

// ── 기술 선택 ──
function MoveSelect({ options, value, onChange, placeholder, lang }: { options: string[]; value: string; onChange: (v: string) => void; placeholder: string; lang: Locale }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "0.4rem 0.5rem", borderRadius: 8, border: "1.5px solid #d6def0", fontSize: "0.82rem", fontWeight: 700, color: value ? "#fff" : "#64748b", background: value ? (TYPE_COLOR[moveType(value)] || "#64748b") : "#fff", outline: "none", cursor: "pointer", appearance: "none" }}>
      <option value="" style={{ color: "#334155", background: "#fff" }}>{placeholder}</option>
      {options.map((m) => <option key={m} value={m} style={{ color: "#334155", background: "#fff" }}>{moveName(lang, m)}</option>)}
    </select>
  );
}

// ── 슬롯 설정 패널 ──
function SlotPanel({ list, lang, t, slot, setSlot, league, accent }: { list: PokeInfo[]; lang: Locale; t: SimDict; slot: Slot; setSlot: (s: Slot) => void; league: League; accent: string }) {
  const info = useMemo(() => (slot.speciesId ? list.find((p) => p.speciesId === slot.speciesId) || null : null), [slot.speciesId, list]);
  const pick = (p: PokeInfo) => {
    const rec = recommendedMoveset(p.speciesId, league);
    setSlot({ ...emptySlot(), speciesId: p.speciesId, fast: rec.fast, charged: [rec.charged[0] || "", rec.charged[1] || ""], shields: slot.shields });
  };
  const set = (patch: Partial<Slot>) => setSlot({ ...slot, ...patch });
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e6ebf5", borderRadius: 14, padding: "0.8rem", boxShadow: "0 2px 10px rgba(15,23,42,.04)" }}>
      <MonPicker list={list} lang={lang} t={t} value={info} onPick={pick} />
      {info && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Sprite dex={info.dex} sid={info.speciesId} size={52} shadow={slot.shadow} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.98rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.15 }}>{monName(lang, info)}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 3 }}>{info.types.map((ty) => <TypeBadge key={ty} ty={ty} />)}</div>
            </div>
          </div>
          {/* 기술 */}
          <div style={{ display: "grid", gap: 5 }}>
            <MoveSelect options={info.fastMoves} value={slot.fast} onChange={(v) => set({ fast: v })} placeholder={t.fast} lang={lang} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              <MoveSelect options={info.chargedMoves} value={slot.charged[0]} onChange={(v) => set({ charged: [v, slot.charged[1]] })} placeholder={t.charged} lang={lang} />
              <MoveSelect options={info.chargedMoves} value={slot.charged[1]} onChange={(v) => set({ charged: [slot.charged[0], v] })} placeholder={t.charged} lang={lang} />
            </div>
          </div>
          {/* 실드 + 토글 */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 9 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b" }}>{t.shields}</span>
              {[0, 1, 2].map((n) => (
                <button key={n} onClick={() => set({ shields: n })}
                  style={{ width: 26, height: 26, borderRadius: 7, border: "1.5px solid " + (slot.shields === n ? accent : "#d6def0"), background: slot.shields === n ? accent : "#fff", color: slot.shields === n ? "#fff" : "#64748b", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>{n}</button>
              ))}
            </div>
            {info.hasShadow && <Toggle label={t.shadow} on={slot.shadow} onClick={() => set({ shadow: !slot.shadow })} accent="#7c3aed" />}
            <Toggle label={t.bestBuddy} on={slot.bestBuddy} onClick={() => set({ bestBuddy: !slot.bestBuddy })} accent="#e8a33d" />
            <Toggle label={t.advanced} on={slot.customIV} onClick={() => {
              if (!slot.customIV && slot.speciesId) { const d = defaultsFor(slot.speciesId, league); set({ customIV: true, ivs: d.ivs, level: d.level }); }
              else set({ customIV: !slot.customIV });
            }} accent={accent} />
          </div>
          {/* 개체값/레벨 */}
          {slot.customIV && (
            <div style={{ marginTop: 9, padding: "0.6rem", background: "#f7f9ff", borderRadius: 10, display: "grid", gap: 7 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                {([["atk", t.atk], ["def", t.def], ["sta", t.sta]] as const).map(([k, lbl], i) => (
                  <label key={k} style={{ fontSize: "0.68rem", fontWeight: 800, color: "#64748b" }}>{lbl}
                    <input type="number" min={0} max={15} value={slot.ivs[i]} onChange={(e) => { const v = Math.max(0, Math.min(15, +e.target.value || 0)); const ivs = [...slot.ivs] as [number, number, number]; ivs[i] = v; set({ ivs }); }}
                      style={{ width: "100%", marginTop: 2, padding: "0.3rem", borderRadius: 6, border: "1.5px solid #d6def0", fontSize: "0.82rem", fontWeight: 700, textAlign: "center" }} />
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Toggle label={t.auto + " Lv"} on={slot.autoLevel} onClick={() => set({ autoLevel: !slot.autoLevel })} accent={accent} />
                {!slot.autoLevel && (
                  <label style={{ fontSize: "0.7rem", fontWeight: 800, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>{t.level}
                    <input type="number" min={1} max={51} step={0.5} value={slot.level} onChange={(e) => set({ level: Math.max(1, Math.min(51, +e.target.value || 1)) })}
                      style={{ width: 60, padding: "0.3rem", borderRadius: 6, border: "1.5px solid #d6def0", fontSize: "0.82rem", fontWeight: 700, textAlign: "center" }} />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function Toggle({ label, on, onClick, accent }: { label: string; on: boolean; onClick: () => void; accent: string }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.28rem 0.55rem", borderRadius: 999, border: "1.5px solid " + (on ? accent : "#d6def0"), background: on ? accent : "#fff", color: on ? "#fff" : "#64748b", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}>
      {on ? "●" : "○"} {label}
    </button>
  );
}

// ── 배틀 타임라인(애니메이션 재생) ──
function hpAt(curve: { time: number; hp: number }[], time: number, start: number): number {
  let hp = start;
  for (const p of curve || []) { if (p.time <= time) hp = p.hp; else break; }
  return hp;
}
function Timeline({ res, lang, t }: { res: any; lang: Locale; t: SimDict }) {
  const dur = res.duration || 1;
  const startA = res.a.startHp, startB = res.b.startHp;
  const [now, setNow] = useState(dur);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number>(0);
  const last = useRef<number>(0);

  useEffect(() => { setNow(0); setPlaying(true); }, [res]); // 새 배틀 → 자동재생

  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const PLAYBACK = 3300; // 전투 길이와 무관하게 ~3.3초 재생(빠른 2배속감)
    const step = (ts: number) => {
      const dt = ts - last.current; last.current = ts;
      setNow((n: number) => { const nn = n + dt * (dur / PLAYBACK); if (nn >= dur) { setPlaying(false); return dur; } return nn; });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, dur]);

  const done = now >= dur;
  const hpA = hpAt(res.hpCurve?.a, now, startA), hpB = hpAt(res.hpCurve?.b, now, startB);

  const track = (actor: number, start: number, hp: number, name: string, dex: number, sid: string, shadow: boolean, color: string) => {
    const evts = res.timeline.filter((e: any) => e.actor === actor);
    const ratio = start ? hp / start : 0;
    const hpColor = ratio > 0.4 ? "#16a34a" : ratio > 0.18 ? "#eab308" : "#ef4444";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, width: 108, flexShrink: 0 }}>
          <Sprite dex={dex} sid={sid} size={26} shadow={shadow} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.64rem", fontWeight: 800, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            <div style={{ fontSize: "0.6rem", fontWeight: 800, color: hpColor }}>{Math.round(hp)} <span style={{ color: "#cbd5e1" }}>/ {start}</span></div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 5, overflow: "hidden", marginBottom: 3 }}>
            <div style={{ width: `${Math.max(0, ratio) * 100}%`, height: "100%", background: hpColor, transition: "width 70ms linear" }} />
          </div>
          <div style={{ position: "relative", height: 22, background: "#f1f5f9", borderRadius: 6, overflow: "hidden" }}>
            {evts.map((e: any, i: number) => {
              const left = (e.time / dur) * 100;
              const reached = e.time <= now + 1;
              const fresh = reached && now - e.time < 350;
              const op = reached ? 1 : 0.14;
              const sc = fresh ? 1.5 : 1;
              const isCharged = e.type && String(e.type).includes("charged");
              const isFast = e.type && String(e.type).includes("fast");
              const isShield = e.type === "shield";
              const isDisguise = e.type === "shieldSpecial"; // 따라큐 탈 벗겨짐 등
              if (isDisguise) return <span key={i} title="Disguise Busted" style={{ position: "absolute", left: `${left}%`, top: 2, transform: `translateX(-50%) scale(${sc})`, fontSize: "0.72rem", opacity: op, transition: "opacity 90ms, transform 90ms" }}>🎭</span>;
              if (isShield) return <span key={i} title="Shield" style={{ position: "absolute", left: `${left}%`, top: 2, transform: `translateX(-50%) scale(${sc})`, fontSize: "0.7rem", opacity: op, transition: "opacity 90ms, transform 90ms" }}>🛡️</span>;
              if (isCharged) return <span key={i} title={e.name} style={{ position: "absolute", left: `${left}%`, top: 2, transform: `translateX(-50%) scale(${sc})`, width: 10, height: 18, borderRadius: 3, background: TYPE_COLOR[moveType(chargedIdOf(e, res, actor))] || color, boxShadow: fresh ? "0 0 0 2px #fbbf24" : "0 0 0 1.5px #fff", opacity: op, transition: "opacity 90ms, transform 90ms, box-shadow 90ms" }} />;
              if (isFast) return <span key={i} style={{ position: "absolute", left: `${left}%`, top: 8, transform: `translateX(-50%) scale(${sc})`, width: 5, height: 8, borderRadius: 2, background: color, opacity: op * 0.8, transition: "opacity 90ms, transform 90ms" }} />;
              return null;
            })}
            {/* 플레이헤드 */}
            {!done && <div style={{ position: "absolute", left: `${(now / dur) * 100}%`, top: 0, bottom: 0, width: 2, background: "#0f172a", opacity: 0.5, transform: "translateX(-1px)" }} />}
          </div>
        </div>
      </div>
    );
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 900, color: "#334155" }}>{t.timelineH}</span>
        <span style={{ fontSize: "0.66rem", fontWeight: 800, color: "#94a3b8" }}>{(now / 1000).toFixed(1)} / {(dur / 1000).toFixed(1)}s</span>
      </div>
      {track(0, startA, hpA, monNameOf(lang, res.a), res.a.dex, res.a.speciesId, res.a.shadow, "#3b5bdb")}
      {track(1, startB, hpB, monNameOf(lang, res.b), res.b.dex, res.b.speciesId, res.b.shadow, "#e0245e")}
      {/* 재생 컨트롤 */}
      <div className="sim-noshot" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <button onClick={() => { if (done) setNow(0); setPlaying((p) => !p); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.35rem 0.9rem", borderRadius: 999, border: "none", background: "linear-gradient(90deg,#3b5bdb,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: "0.76rem", cursor: "pointer" }}>
          {playing ? "⏸ " + t.pause : (done ? "↻ " + t.replay : "▶ " + t.play)}
        </button>
        <span style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: "0.62rem", color: "#94a3b8", fontWeight: 700 }}>
          <span>▪ {t.fastHits}</span><span>▮ {t.chThrown}</span><span>🛡️ {t.shUsed}</span>
        </span>
      </div>
    </div>
  );
}
function chargedIdOf(_e: any, res: any, actor: number): string { const c = actor === 0 ? res.a.charged : res.b.charged; return c && c[0] ? c[0].moveId : ""; }

// ── 결과 패널 ──
function ResultPanel({ res, lang, t }: { res: any; lang: Locale; t: SimDict }) {
  const [ra, rb] = res.ratings;
  const winA = res.winner === "a", winB = res.winner === "b";
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e6ebf5", borderRadius: 14, padding: "0.9rem", marginTop: 12, boxShadow: "0 4px 16px rgba(15,23,42,.05)" }}>
      {/* 승자 배너 + 점수바 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <PokeResult p={res.a} lang={lang} t={t} win={winA} align="left" />
        <div style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 900, color: "#94a3b8" }}>VS</div>
        <PokeResult p={res.b} lang={lang} t={t} win={winB} align="right" />
      </div>
      {/* 조건: 스킬 + 실드 + 그림자/베파 (개체값·레벨은 위 헤더에 표시) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "flex-start", gap: 10, marginBottom: 11 }}>
        <CondSide p={res.a} lang={lang} t={t} align="left" />
        <div />
        <CondSide p={res.b} lang={lang} t={t} align="right" />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 900, color: winA ? "#3b5bdb" : "#94a3b8", width: 44, textAlign: "right" }}>{ra}</span>
        <div style={{ flex: 1, height: 10, borderRadius: 6, overflow: "hidden", display: "flex", background: "#eef2f8" }}>
          <div style={{ width: `${(ra / (ra + rb || 1)) * 100}%`, background: "linear-gradient(90deg,#3b5bdb,#5b7cff)" }} />
          <div style={{ flex: 1, background: "linear-gradient(90deg,#ff6b8a,#e0245e)" }} />
        </div>
        <span style={{ fontSize: "0.72rem", fontWeight: 900, color: winB ? "#e0245e" : "#94a3b8", width: 44 }}>{rb}</span>
      </div>
      <Timeline res={res} lang={lang} t={t} />
    </div>
  );
}
function PokeResult({ p, lang, t, win, align }: { p: any; lang: Locale; t: SimDict; win: boolean; align: "left" | "right" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align === "left" ? "flex-start" : "flex-end" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: align === "right" ? "row-reverse" : "row" }}>
        <Sprite dex={p.dex} sid={p.speciesId} size={40} shadow={p.shadow} />
        <div style={{ textAlign: align }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: 4, flexDirection: align === "right" ? "row-reverse" : "row" }}>
            {win && <span style={{ fontSize: "0.7rem" }}>👑</span>}{monNameOf(lang, p)}
          </div>
          <div style={{ fontSize: "0.66rem", color: "#64748b", fontWeight: 700 }}>CP {p.cp} · Lv {p.level} · {p.ivs.join("/")}</div>
        </div>
      </div>
      <div style={{ fontSize: "0.62rem", color: "#94a3b8", fontWeight: 700, marginTop: 3 }}>{t.hpLeft} {p.hp}/{p.startHp} · ⚡{p.energy}</div>
    </div>
  );
}
function MoveChip({ id, lang }: { id: string; lang: Locale }) {
  return <span style={{ display: "inline-block", background: TYPE_COLOR[moveType(id)] || "#888", color: "#fff", fontSize: "0.6rem", fontWeight: 800, borderRadius: 5, padding: "2px 6px" }}>{moveName(lang, id)}</span>;
}
function CondSide({ p, lang, t, align }: { p: any; lang: Locale; t: SimDict; align: "left" | "right" }) {
  const end = align === "right" ? "flex-end" : "flex-start";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: end }}>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: end }}>
        {p.fast && <MoveChip id={p.fast.moveId} lang={lang} />}
        {(p.charged || []).map((m: any) => <MoveChip key={m.moveId} id={m.moveId} lang={lang} />)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: end }}>
        <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#475569", background: "#eef2f8", borderRadius: 5, padding: "1px 6px" }}>🛡️ {p.startShields}</span>
        {p.shadow && <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#7c3aed", background: "#f3e8ff", borderRadius: 5, padding: "1px 6px" }}>😈 {t.shadow}</span>}
        {p.bestBuddy && <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#b45309", background: "#fef3c7", borderRadius: 5, padding: "1px 6px" }}>⭐ {t.bestBuddy}</span>}
      </div>
    </div>
  );
}

// ── 결과 이미지 공유/다운로드(바이럴) ──
const CAP_OPTS = { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true, style: { margin: "0" }, filter: (n: any) => !(n?.classList?.contains?.("sim-noshot")) } as const;
async function downloadNode(node: HTMLElement | null, filename: string) {
  if (!node) return;
  const url = await toPng(node, CAP_OPTS);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
}
async function shareNode(node: HTMLElement | null, filename: string, title: string) {
  if (!node) return;
  const dataUrl = await toJpeg(node, { ...CAP_OPTS, quality: 0.95 });
  const nav = navigator as any;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], filename, { type: "image/jpeg" });
    if (typeof navigator.share === "function" && nav.canShare && nav.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title, text: "gblnote.com" }); return;
    }
  } catch { /* fall through */ }
  const a = document.createElement("a"); a.href = dataUrl; a.download = filename; a.click();
}
// 캡처 대상에 넣는 브랜딩 푸터(유입 유도)
function BrandFooter({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, paddingTop: 8, borderTop: "1px solid #eef2f8" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/gbl-icon.png" alt="" width={16} height={16} crossOrigin="anonymous" />
      <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#334155" }}>gblnote.com</span>
      <span style={{ fontSize: "0.66rem", color: "#94a3b8", fontWeight: 600 }}>· {label}</span>
    </div>
  );
}
function ShareBar({ t, nodeRef, filename, title }: { t: SimDict; nodeRef: React.RefObject<HTMLDivElement>; filename: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const run = (fn: () => Promise<void>, ev: "share" | "download") => async () => { setBusy(true); try { track(ev, "/gbl/sim", "sim"); await fn(); } catch { /* noop */ } setBusy(false); };
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
      <button disabled={busy} onClick={run(() => shareNode(nodeRef.current, filename, title), "share")}
        style={{ padding: "0.55rem 1.4rem", borderRadius: 999, border: "none", background: busy ? "#cbd5e1" : "linear-gradient(90deg,#3b5bdb,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: "0.86rem", cursor: busy ? "default" : "pointer" }}>📤 {t.shareBtn}</button>
      <button disabled={busy} onClick={run(() => downloadNode(nodeRef.current, filename), "download")}
        style={{ padding: "0.55rem 1.4rem", borderRadius: 999, border: "none", background: busy ? "#cbd5e1" : "#334155", color: "#fff", fontWeight: 800, fontSize: "0.86rem", cursor: busy ? "default" : "pointer" }}>💾 {t.downloadBtn}</button>
    </div>
  );
}

// ═══════════════ 메인 ═══════════════
export default function SimView({ lang, t }: { lang: Locale; t: SimDict }) {
  const [ready, setReady] = useState(false);
  const [league, setLeague] = useState<League>("great");
  const [mode, setMode] = useState<"single" | "multi" | "matrix" | "team">("single");
  const [season, setSeasonNum] = useState<SeasonNum>(27);
  const list = useMemo(() => (ready ? pokemonList() : []), [ready, season]);

  useEffect(() => { setReady(true); }, []);

  // 시즌 전환: 엔진 데이터 스왑을 동기로 먼저 수행한 뒤 상태 갱신(→ list 재계산이 새 데이터로 실행됨).
  const changeSeason = (s: SeasonNum) => { if (s === season) return; setSeason(s); setSeasonNum(s); };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <style>{`@media(max-width:640px){.sim-slots{grid-template-columns:1fr !important;}}`}</style>
      {/* 시즌 선택 (27 현재 / 28 미리보기) */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", marginBottom: 10 }}>
        {([27, 28] as SeasonNum[]).map((s) => {
          const on = season === s;
          const isNew = s === 28;
          return (
            <button key={s} onClick={() => changeSeason(s)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.38rem 0.9rem", borderRadius: 999,
                border: on ? (isNew ? "1px solid #6d28d9" : "1px solid #0f172a") : "1px solid #e2e8f0",
                fontSize: "0.8rem", fontWeight: 800, cursor: "pointer",
                background: on ? (isNew ? "linear-gradient(135deg,#4c1d95,#6d28d9)" : "#0f172a") : "#fff",
                color: on ? "#fff" : "#64748b" }}>
              {isNew && "🌙"} {s === 27 ? t.seasonCur : t.seasonNew}
              {isNew && <span style={{ fontSize: "0.6rem", fontWeight: 900, background: on ? "rgba(255,255,255,.22)" : "#ede9fe", color: on ? "#fff" : "#6d28d9", borderRadius: 999, padding: "1px 6px" }}>{t.seasonNewBadge}</span>}
            </button>
          );
        })}
      </div>
      {season === 28 && (
        <div style={{ fontSize: "0.72rem", color: "#6d28d9", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 10, padding: "7px 12px", marginBottom: 10, lineHeight: 1.55, textAlign: "center" }}>
          {t.seasonNote}
        </div>
      )}
      {/* 리그 탭 */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10 }}>
        {(["great", "ultra", "master"] as League[]).map((lg) => (
          <button key={lg} onClick={() => setLeague(lg)}
            style={{ padding: "0.42rem 1rem", borderRadius: 999, border: "none", fontSize: "0.84rem", fontWeight: 800, cursor: "pointer", background: league === lg ? "#0f172a" : "#e8eef7", color: league === lg ? "#fff" : "#475569" }}>
            {t.leagues[lg]}
          </button>
        ))}
      </div>
      {/* 모드 탭 */}
      <div style={{ display: "flex", gap: 4, background: "#e8eef7", padding: 4, borderRadius: 12, marginBottom: 14 }}>
        {(["single", "multi", "matrix", "team"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            style={{ flex: 1, padding: "0.5rem 0.3rem", borderRadius: 9, border: "none", fontSize: "0.8rem", fontWeight: 800, cursor: "pointer", background: mode === m ? "#fff" : "transparent", color: mode === m ? "#0f172a" : "#64748b", boxShadow: mode === m ? "0 1px 4px rgba(15,23,42,.1)" : "none" }}>
            {t.modes[m]}
          </button>
        ))}
      </div>

      {!ready ? <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8", fontSize: "0.9rem" }}>{t.computing}</div>
        : mode === "single" ? <SingleMode key={season} list={list} lang={lang} t={t} league={league} />
        : mode === "multi" ? <MultiMode key={season} list={list} lang={lang} t={t} league={league} />
        : mode === "matrix" ? <MatrixMode key={season} lang={lang} t={t} league={league} />
        : <TeamMode key={season} list={list} lang={lang} t={t} league={league} />}

      <p style={{ marginTop: 26, paddingTop: 14, borderTop: "1px solid #e6ebf5", fontSize: "0.68rem", color: "#94a3b8", lineHeight: 1.6, textAlign: "center" }}>
        ⚙️ {t.engineCredit}
      </p>
    </div>
  );
}

// ── 1:1 배틀 ──
function SingleMode({ list, lang, t, league }: { list: PokeInfo[]; lang: Locale; t: SimDict; league: League }) {
  const [A, setA] = useState<Slot>(emptySlot());
  const [B, setB] = useState<Slot>(emptySlot());
  const [res, setRes] = useState<any>(null);
  const shotRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setRes(null); }, [league]);
  const cfgA = slotToCfg(A), cfgB = slotToCfg(B);
  const run = () => { if (cfgA && cfgB) setRes(runBattle(cfgA, cfgB, league)); };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="sim-slots">
        <SlotPanel list={list} lang={lang} t={t} slot={A} setSlot={setA} league={league} accent="#3b5bdb" />
        <SlotPanel list={list} lang={lang} t={t} slot={B} setSlot={setB} league={league} accent="#e0245e" />
      </div>
      <div style={{ textAlign: "center", margin: "14px 0" }}>
        <button onClick={run} disabled={!cfgA || !cfgB}
          style={{ padding: "0.7rem 2.4rem", borderRadius: 999, border: "none", fontSize: "1rem", fontWeight: 900, cursor: cfgA && cfgB ? "pointer" : "not-allowed", color: "#fff", background: cfgA && cfgB ? "linear-gradient(90deg,#3b5bdb,#e0245e)" : "#cbd5e1", boxShadow: cfgA && cfgB ? "0 6px 18px rgba(59,91,219,.3)" : "none" }}>
          ⚔️ {t.run}
        </button>
      </div>
      {res ? <>
        <div ref={shotRef} style={{ background: "#fff", borderRadius: 14, padding: "2px", maxWidth: 540, margin: "0 auto" }}>
          <ResultPanel res={res} lang={lang} t={t} />
          <BrandFooter label={t.shareResult} />
        </div>
        <ShareBar t={t} nodeRef={shotRef} filename={`gblnote-${res.a.speciesId}-vs-${res.b.speciesId}.png`} title={`${res.a.name} vs ${res.b.name} · ${t.shareResult}`} />
      </> : <div style={{ textAlign: "center", padding: "1.4rem", color: "#94a3b8", fontSize: "0.86rem" }}>{t.empty}</div>}
    </div>
  );
}

// ── 메타 분석(1 vs 메타) ──
function MultiMode({ list, lang, t, league }: { list: PokeInfo[]; lang: Locale; t: SimDict; league: League }) {
  const [A, setA] = useState<Slot>(emptySlot());
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<"rating" | "score">("rating");
  const shotRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setRes(null); }, [league]);
  const cfg = slotToCfg(A);
  const run = () => {
    if (!cfg) return;
    setBusy(true);
    setTimeout(() => { setRes(runMulti(cfg, league, A.shields, 100)); setBusy(false); }, 20);
  };
  const rows = useMemo(() => {
    if (!res) return [];
    const r = [...res.results];
    if (sort === "rating") r.sort((a: any, b: any) => b.rating - a.rating);
    return r;
  }, [res, sort]);
  return (
    <div>
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <SlotPanel list={list} lang={lang} t={t} slot={A} setSlot={setA} league={league} accent="#3b5bdb" />
      </div>
      <p style={{ textAlign: "center", fontSize: "0.78rem", color: "#64748b", margin: "8px 0" }}>{t.multiHint}</p>
      <div style={{ textAlign: "center", margin: "10px 0" }}>
        <button onClick={run} disabled={!cfg || busy}
          style={{ padding: "0.6rem 2rem", borderRadius: 999, border: "none", fontSize: "0.94rem", fontWeight: 900, cursor: cfg && !busy ? "pointer" : "not-allowed", color: "#fff", background: cfg && !busy ? "linear-gradient(90deg,#3b5bdb,#5b7cff)" : "#cbd5e1" }}>
          {busy ? t.computing : "📊 " + t.analyze}
        </button>
      </div>
      {res && <>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <SortBtn label={t.sortRating} on={sort === "rating"} onClick={() => setSort("rating")} />
            <SortBtn label={t.sortScore} on={sort === "score"} onClick={() => setSort("score")} />
          </div>
        </div>
        <div ref={shotRef} style={{ background: "#fff", borderRadius: 14, padding: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 12 }}>
            <Stat label={t.wins} val={res.wins} color="#16a34a" />
            <Stat label={t.losses} val={res.losses} color="#e0245e" />
            <Stat label={t.winRate} val={`${Math.round((res.wins / (res.wins + res.losses)) * 100)}%`} color="#3b5bdb" />
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {rows.map((r: any) => <MultiRow key={r.oppId} r={r} lang={lang} list={list} />)}
          </div>
          <BrandFooter label={t.shareMeta} />
        </div>
        <ShareBar t={t} nodeRef={shotRef} filename={`gblnote-meta-${res.opponent}-${league}.png`} title={t.shareMeta} />
      </>}
    </div>
  );
}
function MultiRow({ r, lang, list }: { r: any; lang: Locale; list: PokeInfo[] }) {
  const info = list.find((p) => p.speciesId === r.oppId || p.speciesId === r.oppId.replace("_shadow", ""));
  const dex = info?.dex || 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.35rem 0.6rem", background: "#fff", border: "1px solid #eef2f8", borderRadius: 9 }}>
      <Sprite dex={dex} sid={r.oppId} size={28} shadow={r.oppId.includes("_shadow")} />
      <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1e293b", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info ? monName(lang, { ...info, speciesId: r.oppId }) : r.oppName}</span>
      <span style={{ display: "flex", gap: 3 }}>{r.oppTypes.map((ty: string) => <TypeBadge key={ty} ty={ty} />)}</span>
      <div style={{ width: 90, height: 8, borderRadius: 5, overflow: "hidden", background: "#eef2f8" }}>
        <div style={{ width: `${Math.min(100, r.rating / 10)}%`, height: "100%", background: r.win ? "#16a34a" : "#e0245e" }} />
      </div>
      <span style={{ width: 34, textAlign: "right", fontSize: "0.76rem", fontWeight: 900, color: r.win ? "#16a34a" : "#e0245e" }}>{r.rating}</span>
    </div>
  );
}
function Stat({ label, val, color }: { label: string; val: any; color: string }) {
  return <div style={{ textAlign: "center" }}><div style={{ fontSize: "1.2rem", fontWeight: 900, color }}>{val}</div><div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#94a3b8" }}>{label}</div></div>;
}
function SortBtn({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return <button onClick={onClick} style={{ padding: "0.28rem 0.6rem", borderRadius: 7, border: "1.5px solid " + (on ? "#0f172a" : "#d6def0"), background: on ? "#0f172a" : "#fff", color: on ? "#fff" : "#64748b", fontSize: "0.68rem", fontWeight: 800, cursor: "pointer" }}>{label}</button>;
}

// ── 매트릭스(메타 NxN) ──
function MatrixMode({ lang, t, league }: { lang: Locale; t: SimDict; league: League }) {
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [shields, setShields] = useState(1);
  const shotRef = useRef<HTMLDivElement>(null);
  const meta = useMemo(() => metaList(league).slice(0, 12), [league]);
  useEffect(() => { setRes(null); }, [league]);
  const run = () => { setBusy(true); setTimeout(() => { setRes(runMatrix(league, meta.map((m) => m.s), shields, 12)); setBusy(false); }, 20); };
  const infoOf = (id: string) => pokemonList().find((x) => x.speciesId === id || x.speciesId === id.replace("_shadow", ""));
  const dexOf = (id: string) => infoOf(id)?.dex || 0;
  const nameOf = (id: string) => { const p = infoOf(id); return p ? monName(lang, { ...p, speciesId: id }) : id; };
  const cell = (v: number) => (v >= 500 ? `rgba(22,163,74,${Math.min(0.85, ((v - 500) / 500) * 1.5 + 0.12)})` : `rgba(224,36,94,${Math.min(0.85, ((500 - v) / 500) * 1.5 + 0.12)})`);
  return (
    <div>
      <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#64748b", margin: "0 0 8px" }}>{t.matrixHint}</p>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b" }}>{t.shields}</span>
        {[0, 1, 2].map((n) => <button key={n} onClick={() => setShields(n)} style={{ width: 26, height: 26, borderRadius: 7, border: "1.5px solid " + (shields === n ? "#0f172a" : "#d6def0"), background: shields === n ? "#0f172a" : "#fff", color: shields === n ? "#fff" : "#64748b", fontWeight: 800, cursor: "pointer" }}>{n}</button>)}
        <button onClick={run} disabled={busy} style={{ marginLeft: 8, padding: "0.5rem 1.4rem", borderRadius: 999, border: "none", background: busy ? "#cbd5e1" : "linear-gradient(90deg,#3b5bdb,#5b7cff)", color: "#fff", fontWeight: 900, fontSize: "0.86rem", cursor: busy ? "default" : "pointer" }}>{busy ? t.computing : "▦ " + t.analyze}</button>
      </div>
      {res && <><div style={{ overflowX: "auto", paddingBottom: 6, display: "flex", justifyContent: "center" }}>
        <div ref={shotRef} style={{ background: "#fff", padding: "16px", borderRadius: 14, border: "1.5px solid #e6ebf5" }}>
        <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "#0f172a", textAlign: "center", marginBottom: 10 }}>{t.matrixH} · {t.leagues[league]}</div>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, margin: "0 auto" }}>
          <thead>
            <tr>
              <th style={{ padding: "0 6px 6px 0", textAlign: "right", fontSize: "0.6rem", color: "#94a3b8", fontWeight: 800 }}>vs →</th>
              {res.ids.map((id: string, j: number) => (
                <th key={id} title={nameOf(id)} style={{ padding: "2px 1px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <Sprite dex={dexOf(id)} sid={id} size={26} shadow={id.includes("_shadow")} />
                    <span style={{ fontSize: "0.58rem", fontWeight: 900, color: "#64748b" }}>{j + 1}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {res.grid.map((row: number[], i: number) => (
              <tr key={i} style={{ background: i % 2 ? "#fafbfe" : "#fff" }}>
                <th style={{ padding: "2px 8px 2px 2px", textAlign: "left", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.62rem", fontWeight: 900, color: "#94a3b8", minWidth: 14, textAlign: "right" }}>{i + 1}</span>
                    <Sprite dex={dexOf(res.ids[i])} sid={res.ids[i]} size={26} shadow={res.ids[i].includes("_shadow")} />
                    <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#1e293b" }}>{nameOf(res.ids[i])}</span>
                  </div>
                </th>
                {row.map((v: number, j: number) => (
                  <td key={j} style={{ padding: 2, textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 34, borderRadius: 8, background: i === j ? "#eef2f8" : cell(v), color: i === j ? "#cbd5e1" : Math.abs(v - 500) > 150 ? "#fff" : "#334155", fontSize: "0.66rem", fontWeight: 800 }}>{i === j ? "—" : v}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <BrandFooter label={t.shareMatrix} />
        </div>
      </div>
      <ShareBar t={t} nodeRef={shotRef} filename={`gblnote-matrix-${league}.png`} title={t.shareMatrix} />
      </>}
    </div>
  );
}

// ── 팀 빌더(1~3 vs 메타) ──
function TeamMode({ list, lang, t, league }: { list: PokeInfo[]; lang: Locale; t: SimDict; league: League }) {
  const [team, setTeam] = useState<Slot[]>([emptySlot(), emptySlot(), emptySlot()]);
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const shotRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setRes(null); }, [league]);
  const cfgs = team.map(slotToCfg).filter(Boolean) as Cfg[];
  const setTeamSlot = (i: number, s: Slot) => setTeam(team.map((x, j) => (j === i ? s : x)));
  const run = () => {
    if (!cfgs.length) return;
    setBusy(true);
    setTimeout(() => {
      const N = 24;
      const meta = metaList(league).slice(0, N);
      const grid = cfgs.map((cfg) => runMulti(cfg, league, 1, N).results);
      setRes({ team: cfgs.map((c) => c.speciesId), meta: meta.map((m) => m.s), grid });
      setBusy(false);
    }, 20);
  };
  const infoOf = (id: string) => list.find((x) => x.speciesId === id || x.speciesId === id.replace("_shadow", ""));
  const dexOf = (id: string) => infoOf(id)?.dex || 0;
  const nameOf = (id: string) => { const p = infoOf(id); return p ? monName(lang, { ...p, speciesId: id }) : id; };
  return (
    <div>
      <p style={{ textAlign: "center", fontSize: "0.8rem", color: "#64748b", margin: "0 0 10px" }}>{t.teamHint}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }} className="sim-slots">
        {team.map((s, i) => <SlotPanel key={i} list={list} lang={lang} t={t} slot={s} setSlot={(v) => setTeamSlot(i, v)} league={league} accent="#3b5bdb" />)}
      </div>
      <div style={{ textAlign: "center", margin: "12px 0" }}>
        <button onClick={run} disabled={!cfgs.length || busy}
          style={{ padding: "0.6rem 2rem", borderRadius: 999, border: "none", fontSize: "0.94rem", fontWeight: 900, cursor: cfgs.length && !busy ? "pointer" : "not-allowed", color: "#fff", background: cfgs.length && !busy ? "linear-gradient(90deg,#3b5bdb,#5b7cff)" : "#cbd5e1" }}>
          {busy ? t.computing : "🛡️ " + t.analyze}
        </button>
      </div>
      {res && <><div style={{ overflowX: "auto", display: "flex", justifyContent: "center" }}>
        <div ref={shotRef} style={{ background: "#fff", padding: "16px", borderRadius: 14, border: "1.5px solid #e6ebf5", minWidth: 340 }}>
        <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "#0f172a", textAlign: "center", marginBottom: 10 }}>{t.vsMetaH} · {t.leagues[league]}</div>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, margin: "0 auto", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ background: "#f7f9ff", borderTopLeftRadius: 8 }} />
              {res.team.map((id: string, ti: number) => (
                <th key={id} style={{ padding: "6px 4px", background: "#f7f9ff", borderTopRightRadius: ti === res.team.length - 1 ? 8 : 0, minWidth: 62 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <Sprite dex={dexOf(id)} sid={id} size={34} shadow={id.includes("_shadow")} />
                    <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#334155", maxWidth: 62, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(id)}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {res.meta.map((mid: string, mi: number) => (
              <tr key={mid} style={{ background: mi % 2 ? "#fafbfe" : "#fff" }}>
                <td style={{ padding: "3px 10px 3px 6px", textAlign: "left", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Sprite dex={dexOf(mid)} sid={mid} size={30} shadow={mid.includes("_shadow")} />
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1e293b" }}>{nameOf(mid)}</span>
                  </div>
                </td>
                {res.grid.map((col: any[], ti: number) => {
                  const m = col[mi]; const v = m ? m.rating : 0; const win = v >= 500;
                  const bg = win ? `rgba(22,163,74,${Math.min(0.85, ((v - 500) / 500) * 1.5 + 0.15)})` : `rgba(224,36,94,${Math.min(0.85, ((500 - v) / 500) * 1.5 + 0.15)})`;
                  return (
                    <td key={ti} title={`${v}`} style={{ textAlign: "center", padding: "4px 3px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 10, background: bg, color: "#fff", fontWeight: 900, fontSize: "1rem" }}>{win ? "○" : "✕"}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <BrandFooter label={t.shareTeam} />
        </div>
      </div>
      <ShareBar t={t} nodeRef={shotRef} filename={`gblnote-team-${league}.png`} title={t.shareTeam} />
      </>}
    </div>
  );
}
