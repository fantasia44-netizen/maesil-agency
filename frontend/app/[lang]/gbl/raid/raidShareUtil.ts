// 레이드 이미지 공유 공통 유틸 (클라이언트). PokeAPI 스프라이트=CORS 허용 → 캔버스 오염 방지.

// 임의 URL 이미지 로드(CORS 허용). 실패 시 null.
export function loadImg(url: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = url;
  });
}

// 속성 아이콘(동일 출처 /gbl/types/{key}.svg) — 캔버스 오염 없음. 실패 시 null.
export function loadTypeIcon(typeKey: string): Promise<HTMLImageElement | null> {
  return loadImg(`/gbl/types/${typeKey}.svg`);
}

// 속성 아이콘을 지정 색(기본 흰색)으로 리컬러해서 캔버스에 그림(원 안 배치용).
export function drawTypeIcon(
  ctx: CanvasRenderingContext2D, icon: HTMLImageElement, cx: number, cy: number, size: number, color = "#ffffff",
) {
  const off = document.createElement("canvas"); off.width = size; off.height = size;
  const o = off.getContext("2d"); if (!o) return;
  o.drawImage(icon, 0, 0, size, size);
  o.globalCompositeOperation = "source-in";
  o.fillStyle = color; o.fillRect(0, 0, size, size);
  ctx.drawImage(off, cx - size / 2, cy - size / 2);
}

// GBL Note 로고 아이콘(동일 출처 /gbl-icon.png). 공유 이미지에 워터마크로 삽입.
let _logoCache: HTMLImageElement | null | undefined;
export async function loadLogo(): Promise<HTMLImageElement | null> {
  if (_logoCache !== undefined) return _logoCache;
  _logoCache = await loadImg("/gbl-icon.png");
  return _logoCache;
}

// 공유 이미지 상단 우측 브랜드 마크(로고+GBL Note) — 다운로드본에도 상단 브랜딩 유지.
// cy=세로 중심(기본 72), rx=우측 기준선(기본 W-52).
export function drawBrandTop(
  ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null,
  W: number, accent: string, cy = 72, rx = 0,
) {
  const right = rx || W - 52;
  const s = 40;
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  ctx.fillStyle = accent; ctx.font = "800 30px system-ui, sans-serif";
  ctx.fillText("GBL Note", right, cy);
  const tw = ctx.measureText("GBL Note").width;
  if (logo) ctx.drawImage(logo, right - tw - s - 8, cy - s / 2, s, s);
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

// 공유 이미지 하단 브랜드 푸터 — 로고+GBL Note(좌) / 태그라인+gblnote.com(우).
// fyTop=푸터 영역 시작 y, footH=푸터 높이.
export function drawBrandFooter(
  ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null,
  W: number, fyTop: number, footH: number, accent: string, tagline: string,
) {
  ctx.save();
  ctx.strokeStyle = "#e8ecf3"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(40, fyTop + 8); ctx.lineTo(W - 40, fyTop + 8); ctx.stroke();
  const cy = fyTop + footH / 2 + 10;
  ctx.textBaseline = "middle";
  const ls = 58, lx = 44;
  if (logo) ctx.drawImage(logo, lx, cy - ls / 2, ls, ls);
  ctx.textAlign = "left"; ctx.fillStyle = accent; ctx.font = "900 46px system-ui, sans-serif";
  ctx.fillText("GBL Note", lx + (logo ? ls + 14 : 0), cy);
  ctx.textAlign = "right";
  ctx.fillStyle = "#9aa6bd"; ctx.font = "600 27px system-ui, sans-serif";
  ctx.fillText(tagline, W - 44, cy - 18);
  ctx.fillStyle = accent; ctx.font = "800 33px system-ui, sans-serif";
  ctx.fillText("gblnote.com", W - 44, cy + 20);
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

export function loadSprites(dexes: string[]): Promise<Record<string, HTMLImageElement>> {
  const imgs: Record<string, HTMLImageElement> = {};
  return Promise.all(
    [...new Set(dexes)].filter(Boolean).map((dex) => new Promise<void>((res) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => { imgs[dex] = im; res(); };
      im.onerror = () => res();
      im.src = `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${dex}.png`;
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
