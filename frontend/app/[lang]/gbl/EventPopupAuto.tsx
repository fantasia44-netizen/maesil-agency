"use client";
// gbl 전 페이지 공통 이벤트 자동팝업 — 이벤트 진행 중(start~end)에만, "다시 안 보기" 제외.
// 레이드 브로마이드(BROCHURES) 우선, 없으면 GBL 이벤트(GBL_EVENTS) 팝업.
import { useState, useEffect } from "react";
import EventBrochure from "./raid/schedule/EventBrochure";
import { BROCHURES, type Brochure } from "./raid/schedule/eventBrochures";
import GblEventBrochure from "./schedule/GblEventBrochure";
import { GBL_EVENTS, type GblEvent } from "./schedule/gblEvents";
import { getSchedule } from "./schedule/dict";
import { isLocale, defaultLocale, type Locale } from "../../../lib/i18n";

export default function EventPopupAuto({ lang: langProp }: { lang?: string }) {
  const lang: Locale = langProp && isLocale(langProp) ? langProp : defaultLocale;
  const [bro, setBro] = useState<Brochure | null>(null);
  const [gblEv, setGblEv] = useState<GblEvent | null>(null);

  useEffect(() => {
    const now = Date.now();
    // 1) 레이드 브로마이드 우선
    for (const br of BROCHURES) {
      if (!br.start || !br.end) continue;
      const s = new Date(br.start).getTime(), e = new Date(br.end).getTime();
      if (now < s || now > e) continue;
      try { if (localStorage.getItem("gblBroDismiss:" + br.dateKey)) continue; } catch {}
      setBro(br);
      return;
    }
    // 2) GBL 이벤트(월챔 등)
    for (const ev of GBL_EVENTS) {
      const s = Date.parse(ev.start), e = Date.parse(ev.end);
      if (now < s || now > e) continue;
      try { if (localStorage.getItem("gblEvDismiss:" + ev.start)) continue; } catch {}
      setGblEv(ev);
      return;
    }
  }, []);

  if (bro) {
    return (
      <EventBrochure b={bro} lang={lang} onClose={() => setBro(null)}
        onDismiss={() => { try { localStorage.setItem("gblBroDismiss:" + bro.dateKey, "1"); } catch {} setBro(null); }} />
    );
  }
  if (gblEv) {
    return (
      <GblEventBrochure ev={gblEv} lang={lang} t={getSchedule(lang)} onClose={() => setGblEv(null)}
        onDismiss={() => { try { localStorage.setItem("gblEvDismiss:" + gblEv.start, "1"); } catch {} setGblEv(null); }} />
    );
  }
  return null;
}
