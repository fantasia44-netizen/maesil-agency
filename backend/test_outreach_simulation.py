"""
OutreachAgent 시뮬레이션 검증 테스트
- 네이버 쇼핑 결과 집계 로직
- 라우팅 룰
- 타겟 리스트 / 제안서 저장 페이로드 구조
- 도구 스키마 필수 필드
"""
import re, sys

PASS = FAIL = 0

def check(label, got, expected):
    global PASS, FAIL
    ok = got == expected
    tag = "PASS" if ok else "FAIL"
    if ok:
        PASS += 1
        print(f"  [{tag}] {label}")
    else:
        FAIL += 1
        print(f"  [{tag}] {label}")
        print(f"         got={got!r}")
        print(f"    expected={expected!r}")

def section(name):
    print(f"\n{'='*58}")
    print(f"  {name}")
    print(f"{'='*58}")


# ════════════════════════════════════════════════════════
section("1. _strip_html — HTML 태그 제거")
# ════════════════════════════════════════════════════════

def _strip_html(text):
    return re.sub(r"<[^>]+>", "", text or "")

check("<b>태그 제거",       _strip_html("<b>스킨케어</b> 세트"), "스킨케어 세트")
check("중첩 태그",          _strip_html("<b><i>제품</i></b>"),   "제품")
check("빈 문자열",          _strip_html(""),                      "")
check("None → 빈 문자열",   _strip_html(None),                    "")
check("태그 없으면 그대로", _strip_html("일반 텍스트"),           "일반 텍스트")
check("여러 태그 혼합",     _strip_html("<span>A</span><b>B</b>"), "AB")


# ════════════════════════════════════════════════════════
section("2. display 파라미터 클램핑")
# ════════════════════════════════════════════════════════

def clamp_display(n):
    return min(max(n, 1), 100)

check("0 → 1 (최소)",     clamp_display(0),   1)
check("50 → 50 (그대로)", clamp_display(50),  50)
check("100 → 100",        clamp_display(100), 100)
check("200 → 100 (최대)", clamp_display(200), 100)
check("-1 → 1",           clamp_display(-1),  1)


# ════════════════════════════════════════════════════════
section("3. 셀러 집계 로직 — search_naver_shopping 핵심")
# ════════════════════════════════════════════════════════

def aggregate_sellers(items):
    """naver_search_tool.py 집계 로직 추출."""
    sellers = {}
    for idx, item in enumerate(items):
        mall = (item.get("mallName") or "").strip()
        if not mall:
            continue
        if mall not in sellers:
            sellers[mall] = {
                "mall_name":      mall,
                "best_rank":      idx + 1,
                "product_count":  0,
                "price_min":      None,
                "price_max":      None,
                "categories":     set(),
                "sample_products": [],
                "store_url":      f"https://smartstore.naver.com/{mall}",
            }
        s = sellers[mall]
        s["product_count"] += 1
        price = int(item.get("lprice") or 0)
        if price:
            s["price_min"] = min(s["price_min"] or price, price)
            s["price_max"] = max(s["price_max"] or price, price)
        cat = (item.get("category1") or "").strip()
        if cat:
            s["categories"].add(cat)
        if len(s["sample_products"]) < 3:
            s["sample_products"].append(_strip_html(item.get("title", "")))

    result = []
    for s in sellers.values():
        s["categories"] = list(s["categories"])
        result.append(s)
    result.sort(key=lambda x: x["best_rank"])
    return result

# 기본 케이스
items_basic = [
    {"mallName": "뷰티샵A", "lprice": "15000", "category1": "화장품", "title": "<b>세럼</b>"},
    {"mallName": "뷰티샵A", "lprice": "25000", "category1": "화장품", "title": "크림"},
    {"mallName": "헬스샵B", "lprice": "30000", "category1": "건강",   "title": "비타민"},
]
sellers = aggregate_sellers(items_basic)

check("셀러 2개 추출",           len(sellers), 2)
check("뷰티샵A best_rank=1",     sellers[0]["mall_name"], "뷰티샵A")
check("뷰티샵A best_rank 값",    sellers[0]["best_rank"], 1)
check("헬스샵B best_rank=3",     sellers[1]["best_rank"], 3)
check("뷰티샵A product_count=2", sellers[0]["product_count"], 2)
check("뷰티샵A price_min=15000", sellers[0]["price_min"], 15000)
check("뷰티샵A price_max=25000", sellers[0]["price_max"], 25000)
check("카테고리 중복 제거",       sellers[0]["categories"], ["화장품"])
check("HTML 태그 제거된 상품명",  sellers[0]["sample_products"][0], "세럼")
check("store_url 생성",           sellers[0]["store_url"], "https://smartstore.naver.com/뷰티샵A")

# mallName 없는 항목 스킵
items_no_mall = [
    {"mallName": "",        "lprice": "1000", "title": "상품A"},
    {"mallName": "샵C",     "lprice": "2000", "title": "상품B"},
    {"mallName": None,      "lprice": "3000", "title": "상품C"},
]
sellers2 = aggregate_sellers(items_no_mall)
check("mallName 없는 항목 스킵 → 1개만", len(sellers2), 1)
check("샵C best_rank=2 (idx=1)",          sellers2[0]["best_rank"], 2)

# 가격 0 스킵
items_zero_price = [
    {"mallName": "샵D", "lprice": "0",    "title": "A"},
    {"mallName": "샵D", "lprice": "5000", "title": "B"},
    {"mallName": "샵D", "lprice": None,   "title": "C"},
]
sellers3 = aggregate_sellers(items_zero_price)
check("가격 0/None은 min/max 무시",    sellers3[0]["price_min"], 5000)
check("가격 0/None은 max에도 영향 없음", sellers3[0]["price_max"], 5000)

# sample_products 최대 3개
items_many = [{"mallName": "샵E", "lprice": "1000", "title": f"상품{i}"} for i in range(10)]
sellers4 = aggregate_sellers(items_many)
check("sample_products 최대 3개",      len(sellers4[0]["sample_products"]), 3)
check("sample_products 첫 항목",       sellers4[0]["sample_products"][0], "상품0")

# 순위 기준 정렬
items_order = [
    {"mallName": "나중에등장", "lprice": "1000", "title": "A"},
    {"mallName": "먼저등장",   "lprice": "1000", "title": "B"},
]
# 이미 올바른 순서이지만, 반대로 넣어도 정렬 확인
items_order2 = list(reversed([
    {"mallName": "먼저등장",   "lprice": "1000", "title": "B"},
    {"mallName": "나중에등장", "lprice": "1000", "title": "A"},
]))
sellers5 = aggregate_sellers(items_order2)
check("best_rank 기준 오름차순 정렬", sellers5[0]["mall_name"], "나중에등장")

# 카테고리 중복 누적
items_multi_cat = [
    {"mallName": "멀티샵", "lprice": "1000", "category1": "패션", "title": "A"},
    {"mallName": "멀티샵", "lprice": "2000", "category1": "패션", "title": "B"},
    {"mallName": "멀티샵", "lprice": "3000", "category1": "잡화", "title": "C"},
]
sellers6 = aggregate_sellers(items_multi_cat)
check("카테고리 중복 제거 + 여러 카테고리",
      set(sellers6[0]["categories"]), {"패션", "잡화"})


# ════════════════════════════════════════════════════════
section("4. 라우팅 룰 — outreach 키워드")
# ════════════════════════════════════════════════════════

ROUTING_RULES = [
    (["타겟","영업","제안서","셀러 찾","아웃리치","outreach",
      "발굴","리스트 뽑","홍보 대상","잠재 고객","잠재고객","스토어 찾","쇼핑몰 찾"],
     ["outreach"]),
    (["매출","판매","주문","채널","revenue","sales","roas","광고 성과"],
     ["sales"]),
    (["재무","비용","손익","마진","수익","정산","광고비","finance","pnl"],
     ["finance"]),
    (["재고","발주","입고","출고","안전재고","warehouse","inventory"],
     ["warehouse"]),
    (["cs","고객","상담","클레임","반품","문의","매요","maeyo"],
     ["cs"]),
    (["현황","브리핑","보고","오늘","아침","요약","전체"],
     ["sales","finance"]),
]

def rule_route(message):
    m = message.lower()
    for keywords, agents in ROUTING_RULES:
        if any(k in m for k in keywords):
            return agents
    return None

# outreach 라우팅
check("'타겟 뽑아줘'",         rule_route("스킨케어 셀러 타겟 뽑아줘"),     ["outreach"])
check("'제안서 만들어줘'",      rule_route("제안서 만들어줘"),               ["outreach"])
check("'영업 리스트'",          rule_route("영업 리스트 정리해줘"),           ["outreach"])
check("'잠재고객 찾아줘'",      rule_route("잠재고객 찾아줘"),               ["outreach"])
check("'발굴'",                 rule_route("새 셀러 발굴해줘"),               ["outreach"])
check("'outreach'",             rule_route("outreach list"),                  ["outreach"])
check("'홍보 대상'",            rule_route("홍보 대상 찾아줘"),               ["outreach"])

# 기존 라우팅 유지 확인
check("'매출' → sales",         rule_route("이번달 매출 현황"),               ["sales"])
check("'광고비' → finance",     rule_route("광고비 얼마야"),                  ["finance"])
check("'재고' → warehouse",     rule_route("재고 현황 알려줘"),               ["warehouse"])
check("'고객' → cs",            rule_route("고객 문의 현황"),                 ["cs"])
check("'오늘 브리핑' → s+f",    rule_route("오늘 브리핑 해줘"),              ["sales","finance"])
check("매칭 없으면 None",        rule_route("안녕하세요"),                     None)


# ════════════════════════════════════════════════════════
section("5. save_target_list 페이로드 구조")
# ════════════════════════════════════════════════════════

def build_target_payload(keyword, targets):
    return {
        "keyword":    keyword,
        "targets":    targets,
        "created_at": "2026-05-04T00:00:00+00:00",
    }

sample_targets = [
    {
        "mall_name":      "뷰티셀러A",
        "store_url":      "https://smartstore.naver.com/뷰티셀러A",
        "best_rank":      7,
        "product_count":  4,
        "price_range":    "1만~3만원",
        "categories":     ["화장품"],
        "priority_score": 8,
        "proposal_point": "순위 7위이나 광고 인사이트 없어 보임. 매실인사이트로 ROAS 개선 여지 있음",
    }
]

payload = build_target_payload("스킨케어", sample_targets)
check("keyword 포함",                "keyword" in payload,             True)
check("targets 포함",                "targets" in payload,             True)
check("created_at 포함",             "created_at" in payload,          True)
check("targets 1건",                 len(payload["targets"]),          1)
check("priority_score 범위 1~10",    1 <= sample_targets[0]["priority_score"] <= 10, True)
check("proposal_point 비어있지 않음", bool(sample_targets[0]["proposal_point"]), True)
check("store_url 스마트스토어",       sample_targets[0]["store_url"].startswith("https://smartstore.naver.com/"), True)


# ════════════════════════════════════════════════════════
section("6. 도구 스키마 필수 필드 검증")
# ════════════════════════════════════════════════════════

OUTREACH_TOOLS = [
    {"name": "search_naver_shopping",  "input_schema": {"required": ["keyword"]}},
    {"name": "save_target_list",       "input_schema": {"required": ["keyword", "targets"]}},
    {"name": "create_proposal_draft",  "input_schema": {"required": ["mall_name", "store_url", "proposal"]}},
    {"name": "create_finding",         "input_schema": {"required": ["kind", "title", "body"]}},
]

tool_map = {t["name"]: t["input_schema"]["required"] for t in OUTREACH_TOOLS}

check("search_naver_shopping 필수: keyword",
      "keyword" in tool_map["search_naver_shopping"], True)

check("save_target_list 필수: keyword+targets",
      set(tool_map["save_target_list"]) == {"keyword","targets"}, True)

check("create_proposal_draft 필수: mall_name+store_url+proposal",
      set(tool_map["create_proposal_draft"]) == {"mall_name","store_url","proposal"}, True)

check("create_finding 필수: kind+title+body",
      set(tool_map["create_finding"]) == {"kind","title","body"}, True)

check("총 4개 도구 정의",
      len(OUTREACH_TOOLS), 4)


# ════════════════════════════════════════════════════════
section("7. 통합 시나리오 — 스킨케어 타겟 발굴")
# ════════════════════════════════════════════════════════

# 네이버쇼핑 응답 mock
mock_items = [
    {"mallName": "글로우샵",   "lprice": "18000", "category1": "화장품", "title": "<b>수분크림</b>"},
    {"mallName": "스킨랩",     "lprice": "12000", "category1": "화장품", "title": "세럼"},
    {"mallName": "글로우샵",   "lprice": "25000", "category1": "화장품", "title": "앰플"},
    {"mallName": "네이처풀",   "lprice": "9000",  "category1": "화장품", "title": "토너"},
    {"mallName": "스킨랩",     "lprice": "35000", "category1": "화장품", "title": "크림"},
    {"mallName": "글로우샵",   "lprice": "8000",  "category1": "화장품", "title": "클렌저"},
    {"mallName": "네이처풀",   "lprice": "15000", "category1": "화장품", "title": "에센스"},
    {"mallName": "스킨랩",     "lprice": "20000", "category1": "화장품", "title": "마스크팩"},
]

sellers_result = aggregate_sellers(mock_items)

# Step 1: 셀러 목록 추출
check("셀러 3개 추출",               len(sellers_result), 3)
check("글로우샵 best_rank=1",        sellers_result[0]["mall_name"], "글로우샵")
check("스킨랩 best_rank=2",          sellers_result[1]["mall_name"], "스킨랩")
check("네이처풀 best_rank=4",        sellers_result[2]["best_rank"], 4)

# Step 2: 상품 수 집계
check("글로우샵 상품 3개",           sellers_result[0]["product_count"], 3)
check("스킨랩 상품 3개",             sellers_result[1]["product_count"], 3)
check("네이처풀 상품 2개",           sellers_result[2]["product_count"], 2)

# Step 3: 가격 범위
check("글로우샵 price_min=8000",     sellers_result[0]["price_min"], 8000)
check("글로우샵 price_max=25000",    sellers_result[0]["price_max"], 25000)

# Step 4: 타겟 리스트 저장 구조
final_targets = [
    {
        "mall_name":      s["mall_name"],
        "store_url":      s["store_url"],
        "best_rank":      s["best_rank"],
        "product_count":  s["product_count"],
        "priority_score": 9 if s["best_rank"] <= 3 else 6,
        "proposal_point": f"{s['mall_name']}은 {s['product_count']}개 상품 운영 중. 매실인사이트로 통합 분석 제안.",
    }
    for s in sellers_result
]
payload = build_target_payload("스킨케어", final_targets)
check("최종 타겟 리스트 3건",        len(payload["targets"]), 3)
check("글로우샵 priority=9 (순위1)", payload["targets"][0]["priority_score"], 9)
check("네이처풀 priority=6 (순위4)", payload["targets"][2]["priority_score"], 6)
check("proposal_point 모두 있음",
      all(bool(t["proposal_point"]) for t in payload["targets"]), True)


# ════════════════════════════════════════════════════════
print(f"\n{'='*58}")
print(f"  최종 결과: {PASS}/{PASS+FAIL} PASSED  " +
      ("ALL PASS" if FAIL == 0 else f"FAIL {FAIL}건"))
print(f"{'='*58}")
if FAIL:
    sys.exit(1)
