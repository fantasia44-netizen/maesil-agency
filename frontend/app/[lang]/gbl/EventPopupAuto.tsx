"use client";
// gbl 전 페이지 공통 이벤트 자동팝업 — 이벤트 진행 중(start~end)에만, "다시 안 보기" 제외.
import { useState, useEffect } from "react";
import EventBrochure from "./raid/schedule/EventBrochure";
import { BROCHURES, type Brochure } from "./raid/schedule/eventBrochures";
import { isLocale, defaultLocale, type Locale } from "../../../lib/i18n";

export default function EventPopupAuto({ lang: langProp }: { lang?: string }) {
  const lang: Locale = langProp && isLocale(langProp) ? langProp : defaultLocale;
  const [bro, setBro] = useState<Brochure | null>(null);

  useEffect(() => {
    const now = Date.now();
    for (const br of BROCHURES) {
      if (!br.start || !br.end) continue;
      const s = new Date(br.start).getTime(), e = new Date(br.end).getTime();
      if (now < s || now > e) continue;
      try { if (localStorage.getItem("gblBroDismiss:" + br.dateKey)) continue; } catch {}
      setBro(br);
      break;
    }
  }, []);

  if (!bro) return null;
  return (
    <EventBrochure b={bro} lang={lang} onClose={() => setBro(null)}
      onDismiss={() => { try { localStorage.setItem("gblBroDismiss:" + bro.dateKey, "1"); } catch {} setBro(null); }} />
  );
}
