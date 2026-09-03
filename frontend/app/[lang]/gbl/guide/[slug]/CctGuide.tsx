"use client";
// CCT(Circle Control Tactic) 타이밍 가이드라인 — 매치업별 "몇 번째 평타 뒤 차지"를 보여주는 암기표.
// 원리: 차지무브는 상대 평타 쿨을 리셋 → 타이밍 어긋나면 상대가 평타 1대 공짜(평할). 표대로 치면 평할 0.
// 수식(DCinside CCT 계산법 표를 역산, 14/15 일치·나머지는 원본 오타): 주기 P=상대턴/gcd(내턴,상대턴),
// 시작 o=(n·내턴)%상대턴==(상대턴-gcd) 최소 n → o, o+P, o+2P … 번째 평타. P=1이면 아무때나.
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { shareDataUrl, saveDataUrl } from "../../raid/raidShareUtil";
import type { Locale } from "../../../../../lib/i18n";

const TURNS = [1, 2, 3, 4] as const;

function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }
// 매치업 결과: {any:true} = P=1(아무때나) / 아니면 처음 3개 시퀀스
function cctSeq(a: number, b: number): { any: boolean; seq: number[] } {
  const g = gcd(a, b), P = b / g;
  if (P === 1) return { any: true, seq: [] };
  const tgt = ((b - g) % b + b) % b;
  let o = 1;
  for (let n = 1; n <= b; n++) { if ((n * a) % b === tgt) { o = n; break; } }
  return { any: false, seq: [o, o + P, o + 2 * P] };
}

const LB: Record<Locale, {
  title: string; sub: string; myFast: string; oppFast: string; turnU: string; corner: string;
  any: string; anyShort: string; pick: string; tapPre: string; tapSuf: string;
  note: string; foot: string; share: string; download: string;
}> = {
  ko: {
    title: "CCT 타이밍 표", sub: "Circle Control Tactic", myFast: "내 평타 (턴수)", oppFast: "상대 평타 (턴수)", turnU: "턴", corner: "내\\상대",
    any: "아무때나 차지해도 평할 없음", anyShort: "아무때나", pick: "내 평타 × 상대 평타를 고르세요",
    tapPre: "→ ", tapSuf: " 번째 평타를 친 뒤 차지 (평할 0)",
    note: "차지무브는 상대 평타 쿨을 리셋합니다. 타이밍이 어긋나면 상대가 평타 1대를 공짜로 얻어요(=평할). 표의 숫자 번째 평타 뒤에 차지를 누르면 평할을 0으로 막습니다.",
    foot: "※ 실제 GBL 패스트무브는 1~4턴입니다. 미러(같은 턴수)와 상대 1턴은 언제 눌러도 안전.",
    share: "공유", download: "저장",
  },
  en: {
    title: "CCT Timing Table", sub: "Circle Control Tactic", myFast: "My fast move (turns)", oppFast: "Opponent fast move (turns)", turnU: "turn", corner: "me\\opp",
    any: "Charge anytime — no free move given", anyShort: "anytime", pick: "Pick your fast move × opponent's fast move",
    tapPre: "→ charge after fast move ", tapSuf: " (no free move)",
    note: "A charged move resets the opponent's fast-move cooldown. Mistime it and they get a free fast move. Tap your charge move after the listed fast-move counts to give up none.",
    foot: "※ Real GBL fast moves are 1–4 turns. Mirror (same turns) and a 1-turn opponent are safe anytime.",
    share: "Share", download: "Save",
  },
  ja: {
    title: "CCT タイミング表", sub: "Circle Control Tactic", myFast: "自分の通常 (ターン)", oppFast: "相手の通常 (ターン)", turnU: "ターン", corner: "自\\相",
    any: "いつチャージしても献上なし", anyShort: "いつでも", pick: "自分の通常 × 相手の通常 を選択",
    tapPre: "→ ", tapSuf: " 回目の通常攻撃の後にチャージ（献上0）",
    note: "チャージは相手の通常攻撃のクールをリセットします。タイミングを外すと相手に通常攻撃1回を献上。表の回数の後にチャージすれば0に抑えられます。",
    foot: "※ 実際のGBL通常攻撃は1〜4ターン。ミラー（同ターン）と相手1ターンはいつでも安全。",
    share: "共有", download: "保存",
  },
  "zh-TW": {
    title: "CCT 時機表", sub: "Circle Control Tactic", myFast: "我方平A (回合)", oppFast: "對手平A (回合)", turnU: "回合", corner: "我\\對",
    any: "隨時放大招都不會送平A", anyShort: "隨時", pick: "選擇 我方平A × 對手平A",
    tapPre: "→ 第 ", tapSuf: " 次平A後接大招（送0）",
    note: "大招會重置對手平A的冷卻。時機錯了就送對手一次免費平A。在表列的平A次數後放大招即可歸零。",
    foot: "※ 實際GBL平A為1〜4回合。鏡像（同回合）與對手1回合隨時安全。",
    share: "分享", download: "儲存",
  },
};

export default function CctGuide({ lang }: { lang: Locale }) {
  const t = LB[lang] || LB.en;
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [my, setMy] = useState<number>(2);
  const [opp, setOpp] = useState<number>(3);

  const sel = cctSeq(my, opp);

  const capture = async () => {
    const el = ref.current as HTMLElement;
    const p = toPng(el, { pixelRatio: 2, backgroundColor: "#0f172a", skipFonts: true, width: el.scrollWidth, height: el.scrollHeight });
    return Promise.race([p, new Promise<string>((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000))]);
  };
  const onSave = async () => { if (busy) return; setBusy(true); try { saveDataUrl(await capture(), "gbl-cct-table.png"); } catch { /* noop */ } setBusy(false); };
  const onShare = async () => { if (busy) return; setBusy(true); try { await shareDataUrl(await capture(), null, "gbl-cct-table.png", t.title, "gblnote.com"); } catch { /* noop */ } setBusy(false); };

  const btn: React.CSSProperties = { border: "none", cursor: "pointer", fontWeight: 800, fontSize: "0.84rem", borderRadius: 999, padding: "8px 18px", display: "inline-flex", alignItems: "center", gap: 6, color: "#fff" };
  const seqStr = (s: number[]) => s.join(" · ");

  // 셀 표시
  const cellText = (a: number, b: number) => {
    const r = cctSeq(a, b);
    return r.any ? t.anyShort : seqStr(r.seq);
  };

  return (
    <div style={{ margin: "16px 0 8px" }}>
      {/* 매치업 선택기 */}
      <div style={{ background: "#ffffff", border: "1px solid #e3e8f2", borderRadius: 14, padding: "14px 14px 16px" }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>{t.pick}</div>
        {[{ lab: t.myFast, val: my, set: setMy, accent: "#dc2626" }, { lab: t.oppFast, val: opp, set: setOpp, accent: "#2563eb" }].map((row) => (
          <div key={row.lab} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#475569", minWidth: 118 }}>{row.lab}</span>
            {TURNS.map((n) => (
              <button key={n} onClick={() => row.set(n)}
                style={{ width: 40, height: 36, borderRadius: 9, cursor: "pointer", fontWeight: 800, fontSize: "0.9rem",
                  border: row.val === n ? `2px solid ${row.accent}` : "1px solid #cbd5e1",
                  background: row.val === n ? row.accent : "#f8fafc", color: row.val === n ? "#fff" : "#475569" }}>{n}</button>
            ))}
          </div>
        ))}
        {/* 결과 */}
        <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 11, background: "linear-gradient(90deg,#0f172a,#1e293b)", color: "#fff" }}>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700, marginBottom: 3 }}>
            {my}{t.turnU} → {opp}{t.turnU}
          </div>
          <div style={{ fontSize: "1.05rem", fontWeight: 900, lineHeight: 1.35 }}>
            {sel.any ? t.any : (<><span style={{ color: "#94a3b8", fontWeight: 700 }}>{t.tapPre}</span><span style={{ color: "#fbbf24" }}>{seqStr(sel.seq)}</span><span style={{ color: "#94a3b8", fontWeight: 700 }}>{t.tapSuf}</span></>)}
          </div>
        </div>
      </div>

      {/* 공유/저장 */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "14px 0 8px" }}>
        <button onClick={onShare} disabled={busy} style={{ ...btn, background: busy ? "#94a3b8" : "linear-gradient(90deg,#3b5bdb,#7c3aed)" }}>📤 {t.share}</button>
        <button onClick={onSave} disabled={busy} style={{ ...btn, background: busy ? "#94a3b8" : "#334155" }}>💾 {t.download}</button>
      </div>

      {/* 캡처 보드: 전체 표 */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: 14 }}>
        <div ref={ref} style={{ background: "#0f172a", padding: 16, minWidth: 320, boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gbl-icon.png" alt="" width={26} height={26} />
            <div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: "0.98rem", lineHeight: 1.1 }}>{t.title}</div>
              <div style={{ color: "#818cf8", fontWeight: 800, fontSize: "0.66rem", letterSpacing: 1 }}>{t.sub} · gblnote.com</div>
            </div>
          </div>

          {/* 축 라벨 */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#7f1d1d", color: "#fecaca", fontWeight: 800, fontSize: "0.64rem", borderRadius: 6, padding: "2px 8px" }}>⚔️ ↓ {t.myFast}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#1e3a8a", color: "#bfdbfe", fontWeight: 800, fontSize: "0.64rem", borderRadius: 6, padding: "2px 8px" }}>🛡️ → {t.oppFast}</span>
          </div>

          {/* 표: 행=내 평타, 열=상대 평타 */}
          <div style={{ display: "inline-block", border: "1px solid #1e293b", borderRadius: 8, overflow: "hidden" }}>
            {/* 헤더행 */}
            <div style={{ display: "flex" }}>
              <div style={{ width: 44, height: 34, background: "#111827", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "0.6rem", fontWeight: 800, borderRight: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}>{t.corner}</div>
              {TURNS.map((b) => (
                <div key={b} style={{ width: 72, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: opp === b ? "#1e3a8a" : "#0b1220", color: opp === b ? "#fff" : "#93c5fd", fontWeight: 800, fontSize: "0.78rem", borderRight: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}>{b}{t.turnU}</div>
              ))}
            </div>
            {/* 데이터행 */}
            {TURNS.map((a) => (
              <div key={a} style={{ display: "flex" }}>
                <div style={{ width: 44, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: my === a ? "#7f1d1d" : "#0b1220", color: my === a ? "#fff" : "#fca5a5", fontWeight: 800, fontSize: "0.78rem", borderRight: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}>{a}{t.turnU}</div>
                {TURNS.map((b) => {
                  const on = my === a && opp === b;
                  const isAny = cctSeq(a, b).any;
                  return (
                    <div key={b} style={{ width: 72, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                      background: on ? "#fbbf24" : isAny ? "#0f172a" : "#111827",
                      color: on ? "#0f172a" : isAny ? "#475569" : "#e2e8f0",
                      fontWeight: on ? 900 : 700, fontSize: "0.74rem", borderRight: "1px solid #1e293b", borderBottom: "1px solid #1e293b", boxSizing: "border-box" }}>
                      {cellText(a, b)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, color: "#94a3b8", fontSize: "0.66rem", fontWeight: 600, lineHeight: 1.6, maxWidth: 340 }}>{t.foot}</div>
        </div>
      </div>

      {/* 원리 설명(가시 본문) */}
      <div style={{ marginTop: 12, padding: "12px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 11, fontSize: "0.82rem", color: "#334155", lineHeight: 1.75 }}>
        {t.note}
      </div>
    </div>
  );
}
