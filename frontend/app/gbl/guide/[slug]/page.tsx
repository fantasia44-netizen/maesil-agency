// GBL 가이드 아티클 — 서버렌더 SEO. 원문 한국어 콘텐츠(AdSense 가치 콘텐츠).
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "../../AdSlot";

export const revalidate = 86400;

type Section = { h?: string; p: string };
type Guide = { title: string; desc: string; keywords: string[]; updated: string; sections: Section[] };

export const GUIDES: Record<string, Guide> = {
  "gbl-basics": {
    title: "포켓몬고 GBL 입문 가이드 — 배틀리그 기본",
    desc: "포켓몬 GO 배틀리그(GBL)를 처음 시작하는 분을 위한 기본 가이드. 리그 종류, 실드, 에너지, 기술 구조를 쉽게 정리했습니다.",
    keywords: ["포켓몬고 GBL", "배틀리그 입문", "GBL 하는법", "포켓몬고 PVP 기초"],
    updated: "2026-08-19",
    sections: [
      { p: "GBL(Go Battle League·배틀리그)은 포켓몬 GO의 실시간 3대3 대인전입니다. 두 트레이너가 각자 3마리로 구성한 파티로 겨루며, 상대 3마리를 먼저 모두 쓰러뜨리면 승리합니다. 이 글에서는 처음 시작하는 분이 알아야 할 핵심만 정리합니다." },
      { h: "1. 세 가지 리그", p: "GBL에는 CP 제한이 다른 세 리그가 있습니다. 슈퍼리그(Great, CP 1500 이하), 하이퍼리그(Ultra, CP 2500 이하), 마스터리그(Master, 제한 없음)입니다. 제한이 낮은 리그일수록 종족값보다 기술·상성 싸움이 중요해지고, 마스터리그는 전설·최고 CP 포켓몬이 주력이 됩니다." },
      { h: "2. 기술 — 빠른 기술과 차지 기술", p: "각 포켓몬은 빠른 기술 1개와 차지 기술 최대 2개를 씁니다. 빠른 기술은 계속 사용하며 에너지를 모으고, 에너지가 차면 큰 데미지의 차지 기술을 발동합니다. 어떤 기술을 배우느냐(기술배치)에 따라 같은 포켓몬도 성능이 크게 달라집니다." },
      { h: "3. 실드(방어막) 2개", p: "각자 배틀당 실드를 2번 쓸 수 있습니다. 실드는 상대의 차지 기술 데미지를 막아줍니다. 실드를 언제 쓰고 언제 아끼느냐가 GBL 실력의 핵심입니다. 상대 차지 기술을 무조건 막기보다, 큰 위협일 때 아껴 쓰는 판단이 중요합니다." },
      { h: "4. 교체와 선봉", p: "배틀 중 포켓몬을 교체할 수 있지만, 교체 후에는 일정 시간 다시 못 바꿉니다(스왑 쿨타임). 그래서 첫 번째로 내는 선봉 포켓몬 선택과, 불리할 때 안전하게 빼는 타이밍이 승패를 가릅니다." },
      { h: "5. 다음 단계", p: "기본을 익혔다면, 지금 리그에서 무엇을 많이 만나는지(실측 메타)와 어떤 포켓몬이 강한지(티어표)를 보는 것이 실전에 큰 도움이 됩니다. GBL Note의 실측 메타·티어표로 현재 유행을 확인해보세요." },
    ],
  },
  "league-cp": {
    title: "리그별 CP 제한 — 슈퍼·하이퍼·마스터리그",
    desc: "포켓몬 GO 배틀리그의 슈퍼리그(1500)·하이퍼리그(2500)·마스터리그(무제한) CP 제한과 각 리그 특징을 정리했습니다.",
    keywords: ["슈퍼리그 CP", "하이퍼리그 CP", "마스터리그", "포켓몬고 리그 제한", "GBL CP 제한"],
    updated: "2026-08-19",
    sections: [
      { p: "GBL의 세 리그는 참가할 수 있는 포켓몬의 CP(전투력) 상한이 다릅니다. 이 제한이 각 리그의 전략과 주력 포켓몬을 완전히 다르게 만듭니다." },
      { h: "슈퍼리그 (Great League) — CP 1500 이하", p: "가장 낮은 제한이라 종족값 총량보다 상성·기술·내구가 중요합니다. 낮은 CP 안에서 스탯 균형이 좋은 포켓몬이 강세이며, 개체값(IV)도 공격이 낮고 방어·체력이 높은 쪽이 유리한 경우가 많습니다. 진입 장벽이 낮아 입문자에게 추천됩니다." },
      { h: "하이퍼리그 (Ultra League) — CP 2500 이하", p: "슈퍼리그보다 종족값이 큰 포켓몬이 등장하며, 준전설·지역 포켓몬도 활약합니다. 내구가 높은 포켓몬과 사탕·모래 투자가 어느 정도 필요해 중급자용 리그로 여겨집니다." },
      { h: "마스터리그 (Master League) — 제한 없음", p: "CP 제한이 없어 최고 종족값의 전설 포켓몬들이 주력입니다. 자시안, 디아루가·펄기아, 큐레무 등 고종족값 포켓몬이 메타를 지배하며, 최대 레벨·높은 IV·XL 사탕 투자가 성능에 직결됩니다." },
      { h: "어느 리그부터?", p: "시즌마다 열리는 리그가 로테이션됩니다. 입문자는 슈퍼리그로 상성·실드 운영을 익히고, 투자 여력이 생기면 마스터리그로 넓히는 흐름을 추천합니다. 현재 각 리그에서 무엇이 강한지는 GBL Note 티어표에서 확인할 수 있습니다." },
    ],
  },
  "iv-optimization": {
    title: "GBL 개체값(IV) 최적화 기초",
    desc: "슈퍼·하이퍼리그에서 왜 공격 IV가 낮은 개체가 유리한지, 스탯 프로덕트 개념과 IV 고르는 법을 쉽게 설명합니다.",
    keywords: ["포켓몬고 IV", "개체값 최적화", "스탯 프로덕트", "슈퍼리그 IV", "GBL 개체값"],
    updated: "2026-08-19",
    sections: [
      { p: "많은 입문자가 '공격 15/15/15가 최고'라고 생각하지만, CP 제한이 있는 GBL에서는 오히려 공격 IV가 낮은 개체가 더 강한 경우가 많습니다. 왜 그런지 정리합니다." },
      { h: "CP 제한과 스탯 프로덕트", p: "CP는 공격·방어·체력을 종합한 값입니다. 같은 CP 상한(예: 슈퍼리그 1500) 안에서, 공격 IV가 낮으면 그만큼 방어·체력을 더 높인 채로 레벨을 올릴 수 있습니다. 결과적으로 공격은 조금 낮아도 전체 스탯의 곱(스탯 프로덕트)이 커져 더 오래 버티고 실드 싸움에서 유리해집니다." },
      { h: "그래서 낮은 공격이 유리", p: "슈퍼리그·하이퍼리그에서는 보통 공격 IV가 낮고 방어·체력이 높은 개체(이른바 'PVP 순위 1위 IV')를 찾습니다. 잡은 포켓몬을 순위 조회 앱이나 게임 내 PVP IV 표시로 확인해 방어·체력 위주 개체를 고르세요." },
      { h: "마스터리그는 반대", p: "CP 제한이 없는 마스터리그에서는 스탯을 최대한 높이는 게 이득이라, 공격 포함 IV가 높고 레벨(및 XL 사탕)이 높은 개체가 강합니다. 리그에 따라 원하는 IV 방향이 정반대라는 점을 기억하세요." },
      { h: "요약", p: "슈퍼·하이퍼 = 방어·체력 높은(공격 낮은) 개체, 마스터 = 전반적으로 높은 개체 + 고레벨. 어떤 포켓몬을 키울지는 티어표와 실측 픽률로 우선순위를 정하면 사탕·모래 낭비를 줄일 수 있습니다." },
    ],
  },
  "party-building": {
    title: "GBL 파티 구성법 — 선봉·에이스·마무리",
    desc: "포켓몬 GO 배틀리그 3마리 파티를 짜는 기본 틀. 선봉·안티메타·안전 교체(마무리) 역할과 상성 코어를 설명합니다.",
    keywords: ["GBL 파티", "포켓몬고 조합", "배틀리그 파티 구성", "안티메타", "포켓몬고 파티 짜기"],
    updated: "2026-08-19",
    sections: [
      { p: "GBL은 3마리 파티의 상성 조합 싸움입니다. 좋은 파티는 세 마리가 서로의 약점을 메워, 어떤 상대가 나와도 대응할 수 있게 짜입니다. 기본 틀을 소개합니다." },
      { h: "1. 선봉 (리드)", p: "가장 먼저 내는 포켓몬입니다. 지금 메타에서 많이 나오는 상대에게 두루 무난한, 상성 손해가 적은 포켓몬이 좋습니다. 실측 픽률 상위 포켓몬에게 강한 선봉을 고르면 초반 유리하게 시작할 수 있습니다." },
      { h: "2. 에이스·안티메타", p: "메타 상위 포켓몬을 저격하는 역할입니다. 자주 만나는 강한 포켓몬(티어 S·실측 상위)을 확실히 잡는 카운터를 넣으면, 상대가 그 포켓몬을 꺼냈을 때 크게 이득을 봅니다." },
      { h: "3. 마무리·안전 교체", p: "불리할 때 안전하게 빼서 낼 수 있는, 약점이 적고 뒷심이 좋은 포켓몬입니다. 상대 실드가 빠진 후반에 차지 기술로 마무리하는 역할을 맡습니다." },
      { h: "상성 코어", p: "세 마리의 약점이 서로 겹치지 않게 하는 것이 핵심입니다. 예를 들어 한 마리가 땅 타입에 약하면, 다른 두 마리는 땅에 강하거나 땅을 잡을 수 있어야 합니다. 각 포켓몬의 카운터·잘 잡는 상대는 GBL Note 포켓몬 상세 페이지에서 확인할 수 있습니다." },
      { h: "실전 팁", p: "완벽한 파티는 없습니다. 지금 리그의 실측 메타를 보고 '내가 자주 만나는 상대'에 맞춰 조정하는 것이 승률을 올리는 가장 빠른 길입니다." },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = GUIDES[params.slug];
  if (!g) return { title: "GBL Note" };
  return {
    title: `${g.title} | GBL Note`,
    description: g.desc,
    keywords: g.keywords,
    alternates: { canonical: `/gbl/guide/${params.slug}` },
    openGraph: { title: g.title, description: g.desc, url: `/gbl/guide/${params.slug}`, images: ["/gbl-og.png"], type: "article" },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

export default function GuidePage({ params }: { params: { slug: string } }) {
  const g = GUIDES[params.slug];
  if (!g) notFound();
  const others = Object.entries(GUIDES).filter(([s]) => s !== params.slug);

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/gbl" style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href="/gbl/guide" style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>📖 가이드 목록</Link>
        </div>

        <article>
          <h1 style={{ margin: "0.2rem 0 0.3rem", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.35 }}>{g.title}</h1>
          <p style={{ margin: "0 0 1rem", fontSize: "0.76rem", color: "#94a3b8" }}>업데이트 {g.updated} · GBL Note 가이드</p>

          {g.sections.map((s, i) => (
            <section key={i} style={{ marginBottom: 16 }}>
              {s.h && <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>{s.h}</h2>}
              <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155", lineHeight: 1.85 }}>{s.p}</p>
              {i === 1 && <div style={{ marginTop: 14 }}><AdSlot /></div>}
            </section>
          ))}
        </article>

        <div style={{ marginTop: 24, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>다른 가이드</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {others.map(([s, gg]) => (
              <Link key={s} href={`/gbl/guide/${s}`} style={{ fontSize: "0.86rem", color: "#3b5bdb", textDecoration: "none" }}>· {gg.title}</Link>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: "0.82rem", color: "#475569" }}>
            지금 리그 메타가 궁금하다면 <Link href="/gbl/meta/master" style={{ color: "#3b5bdb", fontWeight: 600 }}>실측 메타</Link> ·{" "}
            <Link href="/gbl/tier/master" style={{ color: "#3b5bdb", fontWeight: 600 }}>티어표</Link>를 확인하세요.
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href="/gbl/privacy" style={{ color: "#64748b", textDecoration: "none" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
