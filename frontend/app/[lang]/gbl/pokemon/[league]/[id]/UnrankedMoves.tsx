"use client";
// 랭킹 밖 포켓몬용 기술 패널 — MovesetPanel(빠른 기술을 고르면 차지 기술 타수 재계산)을 선택 상태만 얹어 그대로 사용.
import { useState } from "react";
import MovesetPanel, { type FastOpt, type ChargedOpt, type PanelLabels } from "./MovesetPanel";

export default function UnrankedMoves({ fasts, charged, labels }: { fasts: FastOpt[]; charged: ChargedOpt[]; labels: PanelLabels }) {
  const [sel, setSel] = useState(fasts[0]?.id || "");
  return <MovesetPanel fasts={fasts} charged={charged} sel={sel} onSel={setSel} labels={labels} />;
}
