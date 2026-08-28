"use client";
// 상단 고정 언어 전환 토글(KO/EN/JA). 현재 경로의 로케일 프리픽스만 바꿔 같은 페이지의 다른 언어판으로 이동.
// ko는 프리픽스 없음(/gbl/...), en·ja는 /{locale}/gbl/... — middleware와 동일 규칙.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeMeta, isLocale, defaultLocale, localizePath, type Locale } from "../../../lib/i18n";

// pathname에서 선행 로케일 프리픽스를 떼어 "맨몸" 경로(/gbl/...)를 얻는다.
function barePath(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean); // ["en","gbl","raid"] or ["gbl","raid"]
  if (seg.length && isLocale(seg[0]) && seg[0] !== defaultLocale) {
    return "/" + seg.slice(1).join("/");
  }
  return pathname || "/gbl";
}

// 현재 URL이 어느 로케일인지 (프리픽스 없으면 ko)
function currentLocale(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  return first && isLocale(first) ? first : defaultLocale;
}

export default function LangSwitch() {
  const pathname = usePathname() || "/gbl";
  const bare = barePath(pathname);
  const cur = currentLocale(pathname);

  return (
    <div
      aria-label="language"
      style={{
        display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 3,
        padding: "5px 10px",
        background: "#f4f7fc", borderBottom: "1px solid #e6ebf5",
      }}
    >
      {locales.map((l) => {
        const active = l === cur;
        const short = localeMeta[l].short;
        return (
          <Link
            key={l}
            href={localizePath(l, bare)}
            hrefLang={localeMeta[l].htmlLang}
            aria-current={active ? "true" : undefined}
            title={localeMeta[l].label}
            style={{
              fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.02em",
              padding: "4px 9px", borderRadius: 999, textDecoration: "none",
              color: active ? "#fff" : "#475569",
              background: active ? "#3b5bdb" : "transparent",
            }}
          >
            {short}
          </Link>
        );
      })}
    </div>
  );
}
