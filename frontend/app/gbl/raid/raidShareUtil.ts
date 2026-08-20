// 레이드 이미지 공유 공통 유틸 (클라이언트). PokeAPI 스프라이트=CORS 허용 → 캔버스 오염 방지.

export function loadSprites(dexes: string[]): Promise<Record<string, HTMLImageElement>> {
  const imgs: Record<string, HTMLImageElement> = {};
  return Promise.all(
    [...new Set(dexes)].filter(Boolean).map((dex) => new Promise<void>((res) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => { imgs[dex] = im; res(); };
      im.onerror = () => res();
      im.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
    })),
  ).then(() => imgs);
}

// 로고(노트+몬스터볼 위치핀)를 캔버스에 직접 그림 — 공유 이미지 워터마크용. 어느 브라우저서든 안전.
export function drawLogo(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, accent = "#4f8cff") {
  const s = size;
  ctx.save();
  // 노트(책)
  const bw = s * 0.82, bh = s * 1.02, bx = cx - bw / 2, by = cy - bh / 2;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, s * 0.17);
  ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.lineWidth = Math.max(2, s * 0.055); ctx.strokeStyle = accent; ctx.stroke();
  // 몬스터볼 위치핀
  const hr = s * 0.24, hcx = cx, hcy = cy - s * 0.05, tipY = cy + s * 0.36;
  ctx.beginPath();
  ctx.moveTo(hcx, tipY);
  ctx.bezierCurveTo(hcx - hr * 0.95, hcy + hr * 0.95, hcx - hr, hcy + hr * 0.35, hcx - hr, hcy);
  ctx.arc(hcx, hcy, hr, Math.PI, 0, false);
  ctx.bezierCurveTo(hcx + hr, hcy + hr * 0.35, hcx + hr * 0.95, hcy + hr * 0.95, hcx, tipY);
  ctx.closePath();
  ctx.fillStyle = accent; ctx.fill();
  ctx.lineWidth = Math.max(1.5, s * 0.045); ctx.strokeStyle = "#ffffff"; ctx.stroke();
  // 밴드 + 버튼
  ctx.save();
  ctx.beginPath(); ctx.arc(hcx, hcy, hr, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = "#ffffff"; ctx.fillRect(hcx - hr, hcy - hr * 0.15, hr * 2, hr * 0.3);
  ctx.restore();
  ctx.beginPath(); ctx.arc(hcx, hcy, hr * 0.42, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
  ctx.beginPath(); ctx.arc(hcx, hcy, hr * 0.24, 0, Math.PI * 2); ctx.fillStyle = accent; ctx.fill();
  ctx.restore();
}

export function saveDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl; a.download = filename; a.click();
}

export async function shareDataUrl(dataUrl: string, file: File | null, filename: string, title: string, text: string) {
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  try {
    let f = file;
    if (!f) { const blob = await (await fetch(dataUrl)).blob(); f = new File([blob], filename, { type: "image/png" }); }
    if (f && typeof navigator.share === "function" && nav.canShare && nav.canShare({ files: [f] })) {
      await navigator.share({ files: [f], title, text });
      return;
    }
    saveDataUrl(dataUrl, filename);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    saveDataUrl(dataUrl, filename);
  }
}
