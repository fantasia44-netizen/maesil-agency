"use client";
// 대표덱 공유카드 — 이 덱의 사용률·최근 승률·추세 + 유리/불리 상대. 공유 로직은 공용 ShareCard.
import ShareCard, { shareUiFor } from "../../ShareCard";

type MU = { name: string; wr: number };
type Props = {
  id: string; name: string; tier: string; share: number; recentWr: number; trendD: number; n: number;
  fav: MU[]; threat: MU | null;
  ui: { share: string; win: string; games: string; best: string; worst: string; d7: string; foot: string };
  lang: string;
};

export default function DeckShareCard({ id, name, tier, share, recentWr, trendD, n, fav, threat, ui, lang }: Props) {
  const trendStr = `${trendD > 0 ? "+" : ""}${trendD}%p`;
  const trendColor = trendD > 1.5 ? "#16a34a" : trendD < -1.5 ? "#dc2626" : "#94a3b8";
  return (
    <ShareCard ui={shareUiFor(lang)} filename={`tcg-deck-${id}.png`} shareTitle={name} trackLabel={`deck:${id}`} trackPath={`/tcg/decks/${id}`} compact>
      <div style={{ width: 420, background: "linear-gradient(160deg,#fee6e6,#fef7f5)", padding: "22px 22px 18px", fontFamily: "system-ui,'Malgun Gothic',sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>🎴</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#b91c1c" }}>TCG Note</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ background: "#dc2626", color: "#fff", borderRadius: 6, padding: "1px 9px", fontSize: 14, fontWeight: 900 }}>{tier}</span>
          <span style={{ fontSize: 17, fontWeight: 900, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: "#475569", marginBottom: 12, background: "#fff", borderRadius: 10, padding: "9px 12px" }}>
          <span>{ui.share} <b style={{ color: "#dc2626" }}>{share}%</b></span>
          <span>{ui.d7} <b style={{ color: recentWr >= 50 ? "#16a34a" : "#dc2626" }}>{recentWr}%</b> <b style={{ color: trendColor }}>{trendStr}</b></span>
          <span style={{ color: "#94a3b8" }}>{n.toLocaleString()}{ui.games}</span>
        </div>
        {fav.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 10, padding: "9px 12px", marginBottom: 8, borderLeft: "4px solid #16a34a" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#16a34a", marginBottom: 4 }}>⚔️ {ui.best}</div>
            {fav.slice(0, 2).map((m) => (
              <div key={m.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "1px 0" }}>
                <span style={{ color: "#0f172a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                <span style={{ fontWeight: 900, color: "#16a34a" }}>{m.wr}%</span>
              </div>
            ))}
          </div>
        )}
        {threat && (
          <div style={{ background: "#fff", borderRadius: 10, padding: "9px 12px", marginBottom: 8, borderLeft: "4px solid #dc2626" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#dc2626", marginBottom: 4 }}>🛡️ {ui.worst}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#0f172a", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{threat.name}</span>
              <span style={{ fontWeight: 900, color: "#dc2626" }}>{threat.wr}%</span>
            </div>
          </div>
        )}
        <div style={{ marginTop: 6, paddingTop: 9, borderTop: "1px solid #f3d4d4", fontSize: 10.5, color: "#a15b5b", lineHeight: 1.5 }}>
          {ui.foot}<br /><b style={{ color: "#dc2626" }}>tcgnote.net</b>
        </div>
      </div>
    </ShareCard>
  );
}
