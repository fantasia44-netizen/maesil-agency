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
