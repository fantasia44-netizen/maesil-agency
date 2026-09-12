// 게시판 — 서버에서 공개 잡담(chat)글을 SSR로 주입해 비회원·크롤러도 글을 읽게 함.
// (레딧 방식: 읽기 공개 + 크롤 가능, 쓰기/댓글만 로그인) 인터랙션은 <BoardClient/>.
import type { Metadata } from "next";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../../lib/i18n";
import BoardClient, { type Post } from "./BoardClient";

export const revalidate = 120;
const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function getPublicPosts(lang: string): Promise<Post[]> {
  try {
    const res = await fetch(`${BASE}/api/gbl/board/public?lang=${lang}`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    return (await res.json()) as Post[];
  } catch {
    return [];
  }
}

const META: Record<Locale, { title: string; desc: string }> = {
  ko: { title: "GBL Note 게시판 — 포켓몬GO 배틀리그 잡담·질문", desc: "포켓몬GO GBL 트레이너들의 잡담·질문·공략 공유 게시판. 누구나 읽고, 로그인하면 글을 쓸 수 있습니다." },
  en: { title: "GBL Note Board — Pokémon GO Battle League Talk & Q&A", desc: "A community board for Pokémon GO GBL trainers to chat, ask, and share tips. Read freely; log in to post." },
  ja: { title: "GBL Note 掲示板 — ポケモンGOバトルリーグ雑談・質問", desc: "ポケモンGO GBLトレーナーの雑談・質問・攻略共有掲示板。誰でも閲覧でき、ログインで投稿できます。" },
  "zh-TW": { title: "GBL Note 討論板 — 寶可夢GO對戰聯盟閒聊·問答", desc: "寶可夢GO GBL訓練家的閒聊·問答·攻略分享討論板。人人可讀，登入即可發文。" },
};

// 공개 글이 이만큼 안 되면 noindex — "아직 글이 없습니다"만 있는 빈 게시판이 색인·심사에 잡히지 않게.
const MIN_POSTS_TO_INDEX = 5;

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const c = META[lang];
  const path = "/gbl/board";
  const posts = await getPublicPosts(lang);
  return {
    title: c.title,
    description: c.desc,
    ...(posts.length >= MIN_POSTS_TO_INDEX ? {} : { robots: { index: false, follow: true } }),
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    openGraph: { title: c.title, description: c.desc, url: localizePath(lang, path), images: ["/gbl-og.png"], type: "website" },
  };
}

export default async function BoardPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const posts = await getPublicPosts(lang);
  return <BoardClient initialPosts={posts} />;
}
