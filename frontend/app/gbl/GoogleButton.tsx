"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gblGoogle } from "../../lib/api";

// Google Identity Services 로그인 버튼.
// NEXT_PUBLIC_GOOGLE_CLIENT_ID(웹 OAuth 클라이언트 ID)가 있어야 노출.
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

let scriptPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof document === "undefined") return resolve();
    if (document.querySelector('script[data-gsi="1"]')) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true; s.setAttribute("data-gsi", "1");
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gsi load failed"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function GoogleButton({ onError }: { onError?: (msg: string) => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CLIENT_ID || !ref.current) return;
    let cancelled = false;
    loadGsi().then(() => {
      if (cancelled || !ref.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google;
      if (!g?.accounts?.id) return;
      g.accounts.id.initialize({
        client_id: CLIENT_ID,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callback: async (resp: any) => {
          try {
            await gblGoogle(resp.credential);
            router.push("/gbl/app");
          } catch (e) {
            onError?.(e instanceof Error ? e.message : "구글 로그인 실패");
          }
        },
      });
      g.accounts.id.renderButton(ref.current, {
        theme: "filled_blue", size: "large", type: "standard",
        text: "continue_with", shape: "pill", logo_alignment: "left", width: 320,
      });
    }).catch(() => onError?.("구글 로그인 로드 실패"));
    return () => { cancelled = true; };
  }, [router, onError]);

  if (!CLIENT_ID) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div ref={ref} />
    </div>
  );
}
