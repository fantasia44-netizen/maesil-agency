# TCG Note — 이어서 할 작업 (인수인계)

> 2026-09-10 세션 기준. 회사 PC에서 `git pull` 후 이 파일 참고.
> 현재 배포 상태: `main` = 7641ea9 이후. Render(tcgnote 프론트엔드 서비스) 자동배포됨.

## ✅ 이번 세션에 끝난 것 (배포 완료)
- **AdSense/색인 준비**: env `NEXT_PUBLIC_TCG_ADSENSE_CLIENT=ca-pub-5909036477926766` 반영 → head에 adsense 코드 라이브. ads.txt는 gbl과 같은 계정이라 현행 OK. 사이트맵 112 URL(deck-builder·guides·contact 포함). canonical·hreflang·robots 정상.
- **콘텐츠**: 홈 '직접 써보는 도구' 섹션(덱빌더·카운터·팩시뮬·가이드) / 가이드 6편(초보3 + 자체기능3) / 팩시뮬 확률 출처·확인일 / /tcg/contact 페이지.
- **언어 지역화**: `app/[lang]/tcg/loc.ts` 신설 — 약점(fire→불꽃)·에너지(Fighting→격투)·팩이름(Pikachu→피카츄 등 마스코트팩 KO/JA/ZH). Colorless 표기 **무색→노말**(공식 한국어). 메타 출처 언어누수 수정. 덱빌더 카드풀 60→150장 + 개수안내.
- **로고**: nav·랜딩에 `/tcg-icon.png` 반영.

## ⬜ 회사에서 할 일

### 1. 트레이너/아이템 이름 현지화 — ✅ 검증된 것 완료 / 🔶 나머지는 의도적 영어 유지 (2026-09-10)
- **데이터 소스 조사 결론**: flibustier·chase-manning(PocketDecks)·hugoburguete·TCGdex **전부 EN(+FR)만** 제공. 메모리의 "flibustier 9개국어 내장"은 **부정확**(dist=cards.json/cards.fr.json뿐). 즉 **공식 KO/JA/TW 카드명을 담은 데이터셋은 없음** → 수기 검증만이 방법. 자동 추출(WebFetch 소형모델)은 오매핑 발생(Rocky Helmet→커다란망토, 초련↔Clair 등) → **신뢰 불가, 절대 그대로 쓰지 말 것**.
- **한 일**: `localizeName.cjs`에 트레이너/아이템 **override 사전**(`TRAINER`) 추가 → `localize()` 최상단에서 우선 조회. 원칙 **"정확도 > 커버리지"**: 포켓몬 위키/나무위키 **설명 대조로 교차검증한 것만** 등재.
  - 캐릭터(서포트): Cyrus=태홍, Sabrina=초련, Erika=민화, Wallace=윤진, Korrina=코르니, Cynthia=시로나, Clemont=시트론, Mars=마르스 (+JA/TW 프랜차이즈 정식명).
  - 아이템(불변 정식명): Professor's Research=박사의 연구, Poké Ball=몬스터볼, Rare Candy=이상한사탕, Rocky Helmet=딱딱헬멧, Poison Barb=독바늘.
  - `cards.cjs` 재실행(→cards.json 92%) + decks.json 이름필드 **in-place 패치**(142개 항목, 통계·덱ID 불변). 렌더 검증: KO 박사의 연구·태홍 / JA 博士の研究·アカギ / EN 영어유지, 4개국어 누수 0.
- **남은 37개(의도적 영어 유지)**: Pocket 전용 스타디움/도구·미검증 캐릭터. 공식 KO명 확인 전엔 영어가 나음(사장님 원칙).
  `Arena of Antiquity, Castform Sunny Form, Clear Veil, Clemont's Backpack, Copycat, Deceptive Needle, Elegant Cape, Field Blower, Flame Patch, Fragrant Forest, Giant Cape, Hiking Trail, Inflatable Boat, Kid's Room, Leaf, Leaf Cape, Lisia, Lucky Ice Pop, May, Peculiar Plaza, Pokémon Center Lady, Professor Turo, Protective Poncho, Quick-Grow Extract, Rainbow Cave, Repel, Sightseer, Small Balloon, Soothing Shore, Starting Plains, Teal Mask Ogerpon ex, Team Rocket's Boss, Team Rocket's Goo-zooka, Team Rocket's Master Plan, Training Area, Wally, X Speed`
  - **추가하려면**: 공식 KO명을 신뢰소스(포켓몬코리아 공식/나무위키 세트별 카드페이지)에서 **1건씩 육안 확인** 후 `localizeName.cjs`의 `TRAINER`에 추가 → `node scripts/tcg/cards.cjs` + decks.json 패치 재실행. 고빈도 우선: Copycat(10)·Field Blower(5)·X Speed(4)·Pokémon Center Lady(3).
  - Gen9 포켓몬(Ogerpon 등)은 gbl `pokedex_names.json`에 종족명 추가하면 gbl·tcg 동시 해결.

### 2. 로고 배경 투명화 — ✅ 완료 (2026-09-10)
- `frontend/public/tcg-icon.png`: 가장자리 flood-fill로 흰 배경 투명화(내부 카드 흰면 보존) + 256×256 리사이즈 + 256색 양자화 → **9,952 bytes**(목표 20KB↓ 충족), 파일명 유지=자동 반영. 원본 백업은 세션 스크래치패드.
- 중복 `tcg note log.png` **삭제 완료**. (`tcg note logo.png`=사장님 원본 소스, untracked로 잔존·미커밋)

### 3. (선택) OG 이미지
- `frontend/public/tcg-og.png`가 정사각(1254²) → 카톡/트위터 미리보기 잘림. **1200×630 가로형** 별도 제작 권장.

## 참고
- 원소/팩 지역화 로직: `frontend/app/[lang]/tcg/loc.ts`
- 이름 현지화 파이프라인: `frontend/scripts/tcg/localizeName.cjs` (+ cards.cjs, ingest.cjs)
- 빌드 워크플로: dev 서버 stop → `rm -rf .next && npm run build` → commit → `git push origin main` (Render 자동배포) → dev 재시작.
