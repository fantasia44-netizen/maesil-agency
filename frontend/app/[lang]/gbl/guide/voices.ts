// 가이드 "레전드 한마디 — GBL Note의 이견": 운영자(레전드 도달)의 개인 의견. 표·시뮬이 못 하는 말.
// guides.ts의 일반 설명(자동생성형)과 분리된 개인의견형 블록. 판단은 운영자 원문, 번역만 다국어.
// 새 한마디: 슬러그 키에 {q(질문), a(답)}를 추가하면 [slug]/page.tsx가 자동 렌더.
export type Voice = { q: string; a: string };
export type VoiceSet = { ko: Voice[]; en: Voice[]; ja: Voice[]; "zh-TW": Voice[] };

export const GUIDE_VOICE: Record<string, VoiceSet> = {
  cct: {
    ko: [{
      q: "꼭 CCT를 지켜야 하나?",
      a: "그럴 수도 있고 아닐 수도 있다. 상대가 실드가 없고 내 CMP가 높다면 CMP를 걸어서 CCT보다 차징을 한 번 더 채워 때릴 수도 있다. 베테랑 이상 구간에 가면 CCT만 지키다가 프렌드 실드를 당하게 되기 때문에, 기초적으로 CCT를 지키는 게 맞지만 4턴 기술을 7턴에 쓴다든지, 상대가 프렌드 실드를 하는 경우에 대비해 한 턴씩 지켜보면서 싸우는 경우, 동시타를 거는 경우도 있다. 무조건 CCT를 지키면서 싸워야 하는 것은 아니라는 게 팁.",
    }],
    en: [{
      q: "Do you always have to respect CCT?",
      a: "Sometimes yes, sometimes no. If the opponent has no shields and my CMP is higher, I can lean on CMP and charge one more fast move past CCT before firing. Once you reach Veteran and above, playing strictly by CCT gets you baited into feeding shields, so CCT is the right foundation — but people also throw a 4-turn move on turn 7, watch turn by turn in case the opponent is fishing for a shield, or go for a simultaneous throw. You don't have to fight by CCT every single time — that's the tip.",
    }],
    ja: [{
      q: "CCTは必ず守るべき？",
      a: "守る場合もあるし、守らない場合もある。相手にシールドがなく自分のCMPが高いなら、CMPを利用してCCTよりもう1回ゲージを貯めてから撃つこともできる。ベテラン以上の帯に行くとCCTだけ守っていてはシールドを釣られてしまうので、基本はCCTを守るのが正しいが、4ターン技を7ターン目に撃つ、相手のシールド釣りに備えて1ターンずつ様子を見ながら戦う、同時撃ちを狙う、といった場面もある。必ずCCTで戦わなければならないわけではない、というのがコツ。",
    }],
    "zh-TW": [{
      q: "一定要遵守CCT嗎？",
      a: "可以說是，也可以說不是。如果對手沒有護盾而我的CMP較高，可以靠CMP比CCT多蓄一次小招再打。到了老手段位以上，只死守CCT會被騙盾，所以基礎上遵守CCT是對的，但也有人4回合的招在第7回合才放、為了防對手騙盾而一回合一回合觀察著打、或是搶同時出招。不是每一場都非得照CCT打——這是小訣竅。",
    }],
  },
  moveset: {
    ko: [{
      q: "모든 포켓몬이 추천 기술만 쓰나?",
      a: "그것도 아니다. 실제 검왕은 인파이트를 많이 쓰지만, 제크로무·펄기아에게 인파이트만 날리다가 지는 경우도 생기고, 드래곤들은 검왕의 기술을 막지 않는 경우도 많다. 그렇다면 치근거리기를 익힌다든지, 남들이 다 쓰는 기술이 아닌 다른 기술로 카운터 공격을 할 수도 있다. 추천 기술은 추천일 뿐, 실제로는 상대의 방심을 노리는 기술을 쓰는 것도 배틀의 팁.",
    }],
    en: [{
      q: "Does every Pokémon only run the recommended moves?",
      a: "Not that either. Crowned Sword Zacian mostly runs Close Combat, but it can lose to Zekrom or Palkia by throwing nothing but Close Combat, and Dragons often don't shield Zacian's moves at all. So you could learn Play Rough, or counter with a move nobody else runs. The recommended moveset is only a recommendation — using a move that catches the opponent off guard is a real battle tip.",
    }],
    ja: [{
      q: "すべてのポケモンが推奨技だけを使う？",
      a: "それも違う。実際、剣の王ザシアンはインファイトをよく使うが、ゼクロムやパルキアにインファイトだけ撃って負けることもあるし、ドラゴンはザシアンの技をシールドで防がないことも多い。ならばじゃれつくを覚えさせるなど、みんなが使う技ではない別の技で反撃することもできる。推奨技はあくまで推奨、相手の油断を突く技を使うのもバトルのコツ。",
    }],
    "zh-TW": [{
      q: "所有寶可夢都只用推薦招式嗎？",
      a: "也不是。實際上劍之王蒼響很常用近身戰，但對捷克羅姆、帕路奇亞只丟近身戰也會輸，而且龍系常常根本不擋蒼響的招。那麼學嬉鬧、或用大家都不帶的招式來反打也可以。推薦招式只是推薦，實戰中用能抓對手鬆懈的招式，也是對戰的小訣竅。",
    }],
  },
  "gbl-basics": {
    ko: [{
      q: "이론을 공부하면 강해지나?",
      a: "여기서 이론은 짧게 설명했다. 하지만 많은 대전으로 실전을 익히고, 온라인 스트리머 고수 방송을 많이 보면서 그들이 쓰는 테크닉과 포켓몬을 보며 대리로 감을 익히는 게 좋다. 아무리 공부한다고 강해지는 게 아니라 실전 감각을 맞아가면서 익히고, 메타 흐름·포켓몬 상성·기술·CMP를 외우고 공부해 가며 레전드로 갈 수 있는 노력이 많이 필요하다. 질 때도 있고, 모든 덱을 이길 수 있는 완벽한 덱은 없으며, 상성이 있어도 극복하는 법이 있다. 레전드든 리더보드든 나와 같은 3마리 포켓몬·같은 기술·실드 2장으로 하는 공평한 대결이니, 계속하다 보면 좋은 결과가 있을 것이다.",
    }],
    en: [{
      q: "Does studying theory make you stronger?",
      a: "The theory above is the short version. What really helps is battling a lot, and watching high-level streamers — learn by proxy from the techniques and Pokémon they use. You don't get strong just by studying: you learn by taking hits, while also memorizing the meta flow, matchups, moves and CMP. Reaching Legend takes a lot of that effort. You will lose sometimes, there is no perfect team that beats everything, and even bad matchups can be overcome. Legend or leaderboard, everyone fights with the same three Pokémon, the same moves and two shields — it's a fair fight, so keep at it and the results will come.",
    }],
    ja: [{
      q: "理論を勉強すれば強くなる？",
      a: "ここで理論は短く説明した。しかし多くの対戦で実戦を積み、上手い配信者の動画をたくさん見て、彼らのテクニックとポケモンから感覚を身につけるのがいい。勉強すれば強くなるのではなく、殴られながら実戦感覚を覚え、メタの流れ・相性・技・CMPを覚えて勉強していく努力がレジェンドには必要。負けることもあるし、すべてに勝てる完璧なパーティはなく、相性が悪くても克服する方法はある。レジェンドでもリーダーボードでも、同じ3体・同じ技・シールド2枚の公平な勝負なので、続けていれば良い結果が出るはず。",
    }],
    "zh-TW": [{
      q: "讀理論就會變強嗎？",
      a: "這裡的理論只是簡短說明。更重要的是靠大量對戰累積實戰經驗，多看高手實況主的直播，從他們用的技巧和寶可夢間接培養手感。不是讀得多就會變強，而是要邊挨打邊學實戰感覺，同時背熟環境走向、屬性相剋、招式、CMP，才能一路努力到傳奇。會輸是正常的，沒有能贏所有隊伍的完美隊伍，屬性不利也有克服的方法。不管是傳奇還是排行榜，大家都是同樣3隻、同樣招式、2張護盾的公平對決，持續下去就會有好結果。",
    }],
  },
  "league-cp": {
    ko: [
      { q: "슈퍼리그", a: "전 세계에서 유저가 가장 많고, 실제 배틀 고수와 월드 챔피언십 유저들도 슈퍼리그에 집중하고 있어 유저층이 깊고 넓다. 고수가 많고 3200~3400점도 가능하다. 입문은 쉽지만 고수가 많다." },
      { q: "하이퍼리그", a: "사탕·모래 투자가 많고, 강화해도 레이드에 쓸 수 없는 포켓몬들이라 유저가 가장 적은 리그. 거기다 체력·방어가 특히 높아 타임아웃도 잘 나오고 배틀 시간이 오래 걸린다. 유저가 적은 만큼 하이퍼리그만 집중해서 레전드를 찍는 유저도 있으니, 레전드만 목표로 한다면 하이퍼리그에 집중해 보는 것도 좋다는 의견." },
      { q: "마스터리그", a: "최강 전설몬들이 등장하고, 레이드를 많이 한 유저에게 특히 유리하다. 최대 CP 포켓몬으로 구성되기 때문에 전설몬을 잡는 레이드 유저가 진입하기에 비교적 적합한 리그. 강화한 포켓몬을 레이드에도 쓸 수 있고, 슈퍼리그보다 유저 수는 적지만 그래도 중간 정도 인기가 있는 리그." },
    ],
    en: [
      { q: "Great League", a: "The most players worldwide, and the top battlers and World Championship players all focus on the Great League, so the player base is deep and wide. Lots of strong players; 3200–3400 rating is achievable. Easy to get into, but full of experts." },
      { q: "Ultra League", a: "Heavy candy and stardust investment into Pokémon that are useless in raids even after powering up — the league with the fewest players. On top of that, HP and defense run especially high, so timeouts are common and battles take long. Because few people play it, some players focus only on Ultra to hit Legend — if Legend is your only goal, focusing on the Ultra League is worth considering. My opinion." },
      { q: "Master League", a: "The strongest legendaries show up, and it strongly favors players who have raided a lot. Since teams are built from max-CP Pokémon, it's a relatively good entry point for raiders who catch legendaries. Your powered-up Pokémon work in raids too. Fewer players than the Great League, but still moderately popular." },
    ],
    ja: [
      { q: "スーパーリーグ", a: "世界で最もプレイヤーが多く、実際のバトル上級者や世界大会の選手もスーパーリーグに集中しているため、層が深く広い。上級者が多く、3200〜3400も狙える。入門は簡単だが上級者が多い。" },
      { q: "ハイパーリーグ", a: "アメ・砂の投資が大きく、強化してもレイドで使えないポケモンが多いため最もプレイヤーが少ないリーグ。しかもHP・防御が特に高くタイムアウトが出やすく、バトル時間が長い。人が少ない分、ハイパーだけに集中してレジェンドに到達する人もいるので、レジェンドだけが目標ならハイパー集中も良いという意見。" },
      { q: "マスターリーグ", a: "最強の伝説ポケモンが登場し、レイドをたくさんやった人に特に有利。最大CPのポケモンで構成されるため、伝説を捕まえるレイド勢が参入するには比較的向いたリーグ。強化したポケモンはレイドでも使える。スーパーよりプレイヤーは少ないが、それでも中程度の人気がある。" },
    ],
    "zh-TW": [
      { q: "超級聯盟", a: "全世界玩家最多，實際的對戰高手和世界大賽選手也都集中在超級聯盟，玩家層又深又廣。高手很多，3200～3400分也有可能。入門容易，但高手多。" },
      { q: "高級聯盟", a: "糖果·星塵投資大，而且強化了也不能用在團體戰的寶可夢居多，是玩家最少的聯盟。加上HP·防禦特別高，常打到時間到、對戰時間長。正因為人少，也有玩家只專攻高級聯盟打到傳奇，如果目標只是傳奇，專攻高級聯盟也是不錯的選擇——這是我的看法。" },
      { q: "大師聯盟", a: "最強的傳說寶可夢登場，對打過很多團體戰的玩家特別有利。因為是用最高CP的寶可夢組隊，對抓傳說的團體戰玩家來說是相對適合入門的聯盟。強化的寶可夢也能用在團體戰。玩家比超級聯盟少，但仍有中等人氣。" },
    ],
  },
  "iv-optimization": {
    ko: [{
      q: "무조건 공격 낮고 방어·체력 높은 개체가 정답인가?",
      a: "기본은 공격이 낮고 방어·체력이 높은 유닛 위주로 구성한다. 하지만 여기서 중요한 점 — 미러전, 즉 같은 포켓몬끼리 만나면 공격이 높은 쪽이 우선권(CMP)을 가지기 때문에, 무조건 공격 IV가 낮은 것보다 미러전이 자주 나오는 포켓몬이라면 공격 IV 1~3 정도에 전체 IV가 적당히 높은 개체가 더 좋을 수 있다. 무조건 1~3순위 개체가 좋은 것도 아니라는 사실.",
    }],
    en: [{
      q: "Is low attack / high defense & HP always the answer?",
      a: "The baseline is to build around units with low attack and high defense and HP. But here's the important part — in a mirror, when the same Pokémon meet, the one with higher attack gets priority (CMP). So rather than the lowest attack IV no matter what, for a Pokémon that often ends up in mirrors, an attack IV of around 1–3 with decently high overall IVs can be better. A rank 1–3 spread isn't automatically the best.",
    }],
    ja: [{
      q: "攻撃が低く防御・HPが高い個体が常に正解？",
      a: "基本は攻撃が低く防御・HPが高い個体を中心に組む。ただしここが重要 — ミラー戦、つまり同じポケモン同士が当たると攻撃が高い方が優先権(CMP)を取るため、とにかく攻撃IVが低いものより、ミラーがよく起きるポケモンなら攻撃IV 1〜3程度で全体のIVがそこそこ高い個体の方が良いこともある。順位1〜3の個体が常に最良というわけではない。",
    }],
    "zh-TW": [{
      q: "一定是攻擊低、防禦·HP高的個體最好嗎？",
      a: "基本上以攻擊低、防禦·HP高的單位為主來組隊。但這裡有個重點——鏡像戰，也就是同一隻寶可夢對上時，攻擊較高的一方擁有優先權(CMP)，所以與其一味追求攻擊IV最低，常打鏡像戰的寶可夢反而攻擊IV約1～3、整體IV適中偏高的個體可能更好。第1～3名的個體不一定就是最好的。",
    }],
  },
  "party-building": {
    ko: [{
      q: "ABB덱? ABC덱?",
      a: "대중적으로 ABB덱, ABC덱을 많이 사용한다. 타입에 따라 선봉이 불리할 경우 바로 교체하는 ABB덱이나, 선봉이 불리하더라도 비슷하게 싸우면서 교체하는 ABC덱 구성부터, 다양한 플레이 방법에 따른 덱 조합이 되어야 좋다.",
    }],
    en: [{
      q: "ABB team? ABC team?",
      a: "ABB and ABC teams are the popular builds. From an ABB team that swaps immediately when the lead is type-disadvantaged, to an ABC team that trades roughly evenly in a bad lead before swapping — your team composition should match the way you actually play.",
    }],
    ja: [{
      q: "ABB構築？ABC構築？",
      a: "一般的にはABB構築、ABC構築がよく使われる。タイプ的に先発が不利ならすぐ交代するABB構築、先発が不利でも互角に戦ってから交代するABC構築など、さまざまなプレイスタイルに合わせたパーティの組み合わせになっているのが良い。",
    }],
    "zh-TW": [{
      q: "ABB隊？ABC隊？",
      a: "一般常用ABB隊和ABC隊。從屬性上先發不利就立刻換人的ABB隊，到先發不利也能打得差不多再換人的ABC隊，隊伍組合應該配合各種不同的打法來構成才好。",
    }],
  },
};
