// 뉴스 섹션이 열려 있는 로케일 — 클라이언트(내비)에서도 쓰려고 글 데이터와 분리한 작은 파일.
// 글은 한국어 원문이 기본이고, 번역이 있는 글만 다른 언어에 나간다(posts.ts의 en/ja/zh-TW 필드).
// 어떤 언어로 글이 하나라도 생기면 여기에 그 로케일을 추가 → 내비·홈·사이트맵에 그 언어 뉴스가 열린다.
// (posts.ts가 로드될 때 실제 글과 이 목록이 어긋나면 개발 콘솔에 경고)
import type { Locale } from "../../../../lib/i18n";

export const NEWS_LOCALES: Locale[] = ["ko"];
export const newsOpen = (lang: Locale): boolean => NEWS_LOCALES.includes(lang);
