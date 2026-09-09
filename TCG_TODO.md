# TCG Note — 이어서 할 작업 (인수인계)

> 2026-09-10 세션 기준. 회사 PC에서 `git pull` 후 이 파일 참고.
> 현재 배포 상태: `main` = 7641ea9 이후. Render(tcgnote 프론트엔드 서비스) 자동배포됨.

## ✅ 이번 세션에 끝난 것 (배포 완료)
- **AdSense/색인 준비**: env `NEXT_PUBLIC_TCG_ADSENSE_CLIENT=ca-pub-5909036477926766` 반영 → head에 adsense 코드 라이브. ads.txt는 gbl과 같은 계정이라 현행 OK. 사이트맵 112 URL(deck-builder·guides·contact 포함). canonical·hreflang·robots 정상.
- **콘텐츠**: 홈 '직접 써보는 도구' 섹션(덱빌더·카운터·팩시뮬·가이드) / 가이드 6편(초보3 + 자체기능3) / 팩시뮬 확률 출처·확인일 / /tcg/contact 페이지.
- **언어 지역화**: `app/[lang]/tcg/loc.ts` 신설 — 약점(fire→불꽃)·에너지(Fighting→격투)·팩이름(Pikachu→피카츄 등 마스코트팩 KO/JA/ZH). Colorless 표기 **무색→노말**(공식 한국어). 메타 출처 언어누수 수정. 덱빌더 카드풀 60→150장 + 개수안내.
- **로고**: nav·랜딩에 `/tcg-icon.png` 반영.

## ⬜ 회사에서 할 일

### 1. 트레이너/아이템 이름 206개 미번역 (가장 큰 데이터 작업)
- **원인**: `frontend/scripts/tcg/localizeName.cjs`가 gbl `app/[lang]/gbl/pokedex_names.json`(포켓몬 **종족명**)만 사용 → 트레이너·아이템·화석·관장·최신 Gen9 포켓몬은 매핑 실패로 영어 유지.
- **현황**: 카드명 358/3879 미번역(91% 커버), 덱리스트 항목 316/492 미번역. **덱 이름은 37/37 완번역**(문제 아님).
- **미번역 목록 추출**:
  ```bash
  cd frontend
  node -e 'const c=require("./app/[lang]/tcg/data/cards.json"),d=require("./app/[lang]/tcg/data/decks.json");const m=new Set();for(const x of c)if(!(x.nm&&x.nm.ko))m.add(x.name);for(const dk of d)for(const a of [dk.decklist&&dk.decklist.trainer,dk.decklist&&dk.decklist.pokemon])for(const e of a||[])if(!(e.nm&&e.nm.ko))m.add(e.name);console.log([...m].sort().join("\n"))'
  ```
- **해결안**: 트레이너/아이템/화석 공식명 사전(KO/JA/ZH)을 만들어 `localizeName.cjs`에 fallback으로 추가 → `cards.cjs`·`ingest.cjs` 재실행해 cards.json·decks.json 패치. 정확도 중요(공식명 아니면 영어가 나음). 최신 Gen9 포켓몬(Terapagos·Ogerpon·Archaludon 등)은 gbl pokedex_names.json에 종족명 추가하면 gbl·tcg 동시 해결.
- **우선순위**: 인덱스되는 10개 덱 상세 페이지에 실제 나오는 트레이너/아이템부터.

### 2. 로고 배경 투명화
- `frontend/public/tcg-icon.png` (현재 1254×1254·797KB·**배경 있음**)를 **투명배경 + 256×256 · 20KB↓**로 교체. **파일명 그대로 유지**하면 코드 수정 없이 자동 반영(`TcgNav.tsx`·`app/[lang]/tcg/page.tsx`가 `/tcg-icon.png` 참조).
- `frontend/public/tcg note log.png` (공백 파일명·tcg-icon과 md5 동일 중복) → **삭제 가능**.
- 교체 후 커밋·푸시하면 배포 반영.

### 3. (선택) OG 이미지
- `frontend/public/tcg-og.png`가 정사각(1254²) → 카톡/트위터 미리보기 잘림. **1200×630 가로형** 별도 제작 권장.

## 참고
- 원소/팩 지역화 로직: `frontend/app/[lang]/tcg/loc.ts`
- 이름 현지화 파이프라인: `frontend/scripts/tcg/localizeName.cjs` (+ cards.cjs, ingest.cjs)
- 빌드 워크플로: dev 서버 stop → `rm -rf .next && npm run build` → commit → `git push origin main` (Render 자동배포) → dev 재시작.
