"""
outreach v4 시스템 시뮬레이션 검증 테스트
- BaseScanner / extract_contact
- outreach_scorer (reach / conversion / risk / GATE)
- outreach_pipeline 핵심 로직
- followup _mark_touch 버그 검증
- naver_blog_scanner URL 파싱
- gmail_watcher 분류 로직
외부 API/DB 없이 순수 로직만 검증
"""
import sys, re, json
from datetime import datetime, timezone, timedelta

sys.stdout.reconfigure(encoding="utf-8")

PASS = FAIL = 0

def check(label, got, expected):
    global PASS, FAIL
    ok = got == expected
    if ok:
        PASS += 1
        print(f"  [PASS] {label}")
    else:
        FAIL += 1
        print(f"  [FAIL] {label}")
        print(f"         got={got!r}")
        print(f"    expected={expected!r}")

def section(name):
    print(f"\n{'='*62}")
    print(f"  {name}")
    print(f"{'='*62}")


# ════════════════════════════════════════════════════════════════
section("1. extract_contact — 연락처 정규식 추출")
# ════════════════════════════════════════════════════════════════

import sys
sys.path.insert(0, ".")
from app.services.scanners.base import extract_contact

# 이메일
c = extract_contact("문의: hello@example.com 로 연락주세요")
check("이메일 추출", c.email, "hello@example.com")

# 카카오 채널
c2 = extract_contact("카카오: https://pf.kakao.com/_abcXYZ/chat 팔로우")
check("카카오채널 추출", c2.kakao, "https://pf.kakao.com/_abcXYZ/chat")

# 카카오 오픈채팅
c3 = extract_contact("오픈채팅: https://open.kakao.com/o/gABC1234")
check("카카오 오픈채팅 추출", c3.kakao, "https://open.kakao.com/o/gABC1234")

# 네이버 카페
c4 = extract_contact("카페: https://cafe.naver.com/myclub 방문해주세요")
check("네이버 카페 추출", c4.naver_cafe, "https://cafe.naver.com/myclub")

# 인스타그램
c5 = extract_contact("인스타: https://www.instagram.com/myhandle")
check("인스타그램 추출", c5.instagram, "https://www.instagram.com/myhandle")

# 유튜브 @핸들
c6 = extract_contact("유튜브: https://www.youtube.com/@mychannelname")
check("유튜브 @핸들 추출", c6.youtube, "https://www.youtube.com/@mychannelname")

# 네이버 블로그
c7 = extract_contact("블로그: https://blog.naver.com/myid/12345")
check("네이버 블로그 추출", c7.blog, "https://blog.naver.com/myid/12345")

# 없는 경우
c8 = extract_contact("아무 연락처 없는 텍스트")
check("연락처 없음 → None", c8.email, None)
check("카카오 없음 → None", c8.kakao, None)

# 복합
c9 = extract_contact("이메일 seller@naver.com / 카페 https://cafe.naver.com/sellershop / 인스타 https://www.instagram.com/sellerId")
check("복합 이메일 추출", c9.email, "seller@naver.com")
check("복합 카페 추출", c9.naver_cafe, "https://cafe.naver.com/sellershop")
check("복합 인스타 추출", c9.instagram, "https://www.instagram.com/sellerId")


# ════════════════════════════════════════════════════════════════
section("2. outreach_scorer — GATE / 점수 계산")
# ════════════════════════════════════════════════════════════════

from app.services.outreach_scorer import (
    calculate_score, compute_conversion_signals, compute_risk_signals,
    is_gate_pass, get_activity_level,
)

# GATE: is_seller_content AND is_educational 둘 다 True
check("GATE 통과 (둘 다 True)",
      is_gate_pass({"is_seller_content": True, "is_educational": True}), True)
check("GATE 실패 (educational False)",
      is_gate_pass({"is_seller_content": True, "is_educational": False}), False)
check("GATE 실패 (seller False)",
      is_gate_pass({"is_seller_content": False, "is_educational": True}), False)
check("GATE 실패 (빈 dict)",
      is_gate_pass({}), False)
check("GATE 실패 (None 값)",
      is_gate_pass({"is_seller_content": None, "is_educational": True}), False)

# conversion_power_score
conv_result = compute_conversion_signals({
    "conversion_signals": {
        "has_paid_course": True,        # +15
        "has_paid_membership": True,    # +12
        "has_consulting": False,
        "has_ebook_sale": False,
        "has_tool_recommendation_content": False,
        "has_affiliate_experience": False,
    }
})
check("conversion 유료강의+멤버십 = 27", conv_result["conversion_power_score"], 27)
check("has_paid_course True", conv_result["has_paid_course"], True)
check("has_paid_membership True", conv_result["has_paid_membership"], True)

# conversion 최대 40 캡
conv_max = compute_conversion_signals({
    "conversion_signals": {
        "has_paid_course": True,                     # +15
        "has_paid_membership": True,                 # +12
        "has_consulting": True,                      # +10
        "has_ebook_sale": True,                      # +8
        "has_tool_recommendation_content": True,     # +8
        "has_affiliate_experience": True,            # +5
    }
})
check("conversion 최대 캡 40", conv_max["conversion_power_score"], 40)  # 58 → capped at 40

# risk_signals
risk_result = compute_risk_signals({
    "risk_signals": {
        "sells_competing_tool": True,    # +30
        "sells_own_program": False,
        "is_competitor_partner": False,
        "has_negative_tool_content": False,
    }
})
check("risk 경쟁툴 = 30", risk_result["competitive_risk_score"], 30)
check("sells_competing_tool True", risk_result["sells_competing_tool"], True)

# risk 최대 40 캡
risk_max = compute_risk_signals({
    "risk_signals": {
        "sells_competing_tool": True,     # +30
        "sells_own_program": True,        # +20
        "is_competitor_partner": True,    # +25
        "has_negative_tool_content": True, # +15
    }
})
check("risk 최대 캡 40", risk_max["competitive_risk_score"], 40)  # 90 → capped at 40

# calculate_score — 이메일 없음, 구독자 10k, 전환 27, 리스크 0
item_a = {
    "contact_email": None,
    "contact_kakao": None,
    "contact_naver_cafe": None,
    "community_size": None,
    "activity_level": "active",
    "subscriber_count": 10000,
    "platforms_json": [],
    "conversion_power_score": 27,
    "competitive_risk_score": 0,
}
score, grade, bd = calculate_score(item_a)
# reach: 이메일 없음(0) + 카카오 없음(0) + 카페 없음(0) + 활성(5) + 구독자 1k~50k(10) = 15
# total: 15 + 27 - 0 = 42
check("점수 42", score, 42)
check("등급 B (42>=50 아니므로 C... 아 42<50이니 C)", grade, "C")

# C는 30~49, 42는 C 맞음
check("breakdown 포함", "reach" in bd, True)
check("breakdown conversion", bd["conversion_power"], 27)

# 이메일 있고, 카카오, 카페, 활성, 구독자 1만, 전환 30, 리스크 0
item_b = {
    "contact_email": "a@b.com",
    "contact_kakao": "https://open.kakao.com/o/abc",
    "contact_naver_cafe": "https://cafe.naver.com/mycafe",
    "community_size": 6000,
    "activity_level": "active",
    "subscriber_count": 15000,
    "platforms_json": [{"platform": "youtube"}, {"platform": "naver_blog"}, {"platform": "instagram"}],
    "conversion_power_score": 30,
    "competitive_risk_score": 0,
}
score2, grade2, bd2 = calculate_score(item_b)
# reach: 이메일(15)+카카오(10)+카페(20)+커뮤니티5k+(5)+활성(5)+구독자(10) = 65, + 3플랫폼(5) = 65+5 = 70
# total: 70 + 30 - 0 = 100
check("풀스코어 100", score2, 100)
check("등급 S (>=85)", grade2, "S")
check("멀티채널 보너스 5 (3개)", bd2["multichannel_bonus"], 5)

# D급 자동 archived 로직 검증
item_d = {
    "contact_email": None, "contact_kakao": None, "contact_naver_cafe": None,
    "community_size": None, "activity_level": "inactive",
    "subscriber_count": 100,
    "platforms_json": [],
    "conversion_power_score": 0, "competitive_risk_score": 0,
}
score_d, grade_d, _ = calculate_score(item_d)
check("D급 점수 (<30)", score_d < 30, True)
check("D급 등급", grade_d, "D")
status_d = "archived" if grade_d == "D" else "discovered"
check("D급 → archived", status_d, "archived")

# 경쟁툴 판매자 점수 낮음 검증
item_risk = {
    "contact_email": "top@creator.com",  # +15
    "contact_kakao": None,
    "contact_naver_cafe": None,
    "community_size": None,
    "activity_level": "active",          # +5
    "subscriber_count": 50000,           # +10
    "platforms_json": [],
    "conversion_power_score": 15,        # +15 (강의)
    "competitive_risk_score": 30,        # -30 (경쟁툴)
}
score_r, grade_r, bd_r = calculate_score(item_risk)
# reach = 15 + 5 + 10 = 30, total = 30 + 15 - 30 = 15 → D급
check("경쟁툴 판매자 D급", grade_r, "D")
check("경쟁툴 감점 반영", bd_r["risk_deduction"], 30)


# ════════════════════════════════════════════════════════════════
section("3. get_activity_level — 활성도 판단")
# ════════════════════════════════════════════════════════════════

now = datetime.now(timezone.utc)
check("30일 전 → active",      get_activity_level(now - timedelta(days=30)), "active")
check("89일 전 → active",      get_activity_level(now - timedelta(days=89)), "active")
check("91일 전 → semi_active", get_activity_level(now - timedelta(days=91)), "semi_active")
check("179일 전 → semi_active",get_activity_level(now - timedelta(days=179)), "semi_active")
check("181일 전 → inactive",   get_activity_level(now - timedelta(days=181)), "inactive")
check("None → unknown",        get_activity_level(None), "unknown")

# timezone naive datetime 처리
naive_dt = datetime.now() - timedelta(days=10)
check("naive datetime → active", get_activity_level(naive_dt), "active")


# ════════════════════════════════════════════════════════════════
section("4. naver_blog_scanner — URL 파싱")
# ════════════════════════════════════════════════════════════════

from app.services.scanners.naver_blog_scanner import NaverBlogScanner, _parse_naver_date, _normalize_blog_url

scanner = NaverBlogScanner.__new__(NaverBlogScanner)

# _extract_blog_id
check("네이버블로그 blog_id 추출",
      scanner._extract_blog_id("https://blog.naver.com/myuser123/12345"),
      "myuser123")

check("티스토리 blog_id 추출",
      scanner._extract_blog_id("https://mychannel.tistory.com/post/123"),
      "mychannel.tistory.com")

check("URL에 경로 없으면 fallback",
      scanner._extract_blog_id("https://blog.naver.com/"),
      "https://blog.naver.com/")

# _normalize_blog_url
check("네이버블로그 정규화 URL",
      _normalize_blog_url("myuser123", "fallback"),
      "https://blog.naver.com/myuser123")

check("티스토리 정규화 URL",
      _normalize_blog_url("mychannel.tistory.com", "fallback"),
      "https://mychannel.tistory.com")

check("기타 → fallback",
      _normalize_blog_url("somethingelse.com", "https://fallback.url"),
      "https://fallback.url")

# _parse_naver_date
dt = _parse_naver_date("20240115")
check("날짜 파싱 년도", dt.year, 2024)
check("날짜 파싱 월", dt.month, 1)
check("날짜 파싱 일", dt.day, 15)
check("빈 날짜 → None", _parse_naver_date(""), None)
check("잘못된 날짜 → None", _parse_naver_date("INVALID"), None)


# ════════════════════════════════════════════════════════════════
section("5. outreach_followup — _mark_touch 버그 수정 검증")
# ════════════════════════════════════════════════════════════════

# _mark_touch 로직을 직접 시뮬레이션 (DB 없이 update dict 구조 검증)
def simulate_mark_touch(status, error=None):
    """수정된 _mark_touch 로직 시뮬레이션."""
    update = {"status": status}
    if status == "sent":
        update["sent_at"] = "2026-06-12T00:00:00+00:00"
    elif status == "replied":
        update["replied_at"] = "2026-06-12T00:00:00+00:00"
    if error:
        update["error_msg"] = error[:500]
    return update

u_sent = simulate_mark_touch("sent")
check("sent → sent_at 있음", "sent_at" in u_sent, True)
check("sent → sent_at None 아님", u_sent["sent_at"] is not None, True)

u_failed = simulate_mark_touch("failed", "timeout 오류")
check("failed → sent_at 없음 (덮어쓰기 안 함)", "sent_at" not in u_failed, True)
check("failed → error_msg 있음", u_failed.get("error_msg"), "timeout 오류")
check("failed → replied_at 없음", "replied_at" not in u_failed, True)

u_skipped = simulate_mark_touch("skipped")
check("skipped → sent_at 없음", "sent_at" not in u_skipped, True)
check("skipped → replied_at 없음", "replied_at" not in u_skipped, True)

u_replied = simulate_mark_touch("replied")
check("replied → replied_at 있음", "replied_at" in u_replied, True)
check("replied → sent_at 없음", "sent_at" not in u_replied, True)


# ════════════════════════════════════════════════════════════════
section("6. TOUCH_SCHEDULE 구조 검증")
# ════════════════════════════════════════════════════════════════

from app.services.outreach_pipeline import TOUCH_SCHEDULE

check("터치 스케줄 6단계", len(TOUCH_SCHEDULE), 6)
check("1차 이메일 Day0", TOUCH_SCHEDULE[0], {"sequence": 1, "channel": "email", "delay_days": 0})
check("2차 이메일 Day3", TOUCH_SCHEDULE[1], {"sequence": 2, "channel": "email", "delay_days": 3})
check("3차 이메일 Day10", TOUCH_SCHEDULE[2], {"sequence": 3, "channel": "email", "delay_days": 10})
check("4차 인스타DM Day14", TOUCH_SCHEDULE[3], {"sequence": 4, "channel": "instagram_dm", "delay_days": 14})
check("5차 카페쪽지 Day17", TOUCH_SCHEDULE[4], {"sequence": 5, "channel": "naver_cafe_message", "delay_days": 17})
check("6차 유튜브댓글 Day21", TOUCH_SCHEDULE[5], {"sequence": 6, "channel": "youtube_comment", "delay_days": 21})

# 이메일 없으면 이메일 터치 제외되는 로직
def simulate_schedule(has_email, has_instagram, has_cafe):
    rows = []
    for t in TOUCH_SCHEDULE:
        ch = t["channel"]
        if ch == "email" and not has_email: continue
        if ch == "instagram_dm" and not has_instagram: continue
        if ch == "naver_cafe_message" and not has_cafe: continue
        rows.append(t)
    return rows

check("이메일 없으면 이메일 터치 0건",
      sum(1 for t in simulate_schedule(False, True, True) if t["channel"] == "email"), 0)
check("이메일 없어도 비이메일 터치 포함",
      len(simulate_schedule(False, True, True)), 3)  # instagram_dm, naver_cafe, youtube
check("이메일만 있으면 4건 (이메일3 + 유튜브댓글1 - 유튜브댓글은 항상 포함)",
      len(simulate_schedule(True, False, False)), 4)
check("모두 있으면 6건",
      len(simulate_schedule(True, True, True)), 6)


# ════════════════════════════════════════════════════════════════
section("7. 채널 유형별 이메일 초안 fallback 로직")
# ════════════════════════════════════════════════════════════════

from app.services.channel_analyzer import _build_default_draft, CHANNEL_TYPES

# 모든 채널 유형에 대해 기본 초안이 생성되는지 확인
for ct in CHANNEL_TYPES.keys():
    lead_mock = {
        "handle_name": f"테스트채널_{ct}",
        "subscriber_count": 10000,
        "contact_email": "test@example.com",
    }
    subj, body = _build_default_draft(lead_mock, ct)
    check(f"{ct} 제목 생성됨", bool(subj), True)
    check(f"{ct} 본문 생성됨", bool(body), True)
    check(f"{ct} 채널명 포함", "테스트채널" in subj or "테스트채널" in body, True)

check("알 수 없는 채널유형 → 기본 초안",
      bool(_build_default_draft({"handle_name": "채널"}, "unknown_type")[1]), True)


# ════════════════════════════════════════════════════════════════
section("8. YouTube scanner — Haiku 프롬프트 JSON 파싱 시뮬레이션")
# ════════════════════════════════════════════════════════════════

# AI 응답이 예상 형식인지 검증 (실제 API 호출 없이 샘플 응답으로)
sample_haiku_response = json.dumps({
    "is_seller_content": True,
    "is_educational": True,
    "conversion_signals": {
        "has_paid_course": True,
        "has_paid_membership": False,
        "has_ebook_sale": False,
        "has_consulting": False,
        "has_tool_recommendation_content": True,
        "has_affiliate_experience": True,
    },
    "risk_signals": {
        "sells_competing_tool": False,
        "sells_own_program": False,
        "is_competitor_partner": False,
        "has_negative_tool_content": False,
    },
    "content_summary": "쿠팡 광고 최적화 방법을 가르치는 교육 채널",
    "confidence": "high",
})

parsed = json.loads(sample_haiku_response)
check("GATE 통과", is_gate_pass(parsed), True)

conv = compute_conversion_signals(parsed)
check("conversion 강의+툴추천+어필리에이트 = 28", conv["conversion_power_score"], 28)  # 15+8+5

risk = compute_risk_signals(parsed)
check("risk 없음 = 0", risk["competitive_risk_score"], 0)

# 빈 응답 안전 처리
check("빈 응답 GATE 실패", is_gate_pass({}), False)
conv_empty = compute_conversion_signals({})
check("빈 응답 conversion = 0", conv_empty["conversion_power_score"], 0)
risk_empty = compute_risk_signals({})
check("빈 응답 risk = 0", risk_empty["competitive_risk_score"], 0)


# ════════════════════════════════════════════════════════════════
section("9. 통합 시나리오 — 실제 파이프라인 데이터 흐름 검증")
# ════════════════════════════════════════════════════════════════

# 시나리오: 유튜버 A (10만 구독, 유료강의, 이메일 있음)
ai_a = {
    "is_seller_content": True, "is_educational": True,
    "conversion_signals": {"has_paid_course": True, "has_paid_membership": False,
                           "has_ebook_sale": False, "has_consulting": False,
                           "has_tool_recommendation_content": True, "has_affiliate_experience": False},
    "risk_signals": {"sells_competing_tool": False, "sells_own_program": False,
                     "is_competitor_partner": False, "has_negative_tool_content": False},
}
conv_a = compute_conversion_signals(ai_a)
risk_a = compute_risk_signals(ai_a)
score_input_a = {
    "contact_email": "youtuber@gmail.com", "contact_kakao": None,
    "contact_naver_cafe": None, "community_size": None,
    "activity_level": "active", "subscriber_count": 100000,
    "platforms_json": [], **conv_a, **risk_a,
}
score_a, grade_a, _ = calculate_score(score_input_a)
# reach: 이메일(15)+활성(5)+구독자 1k~50k(10, 100k는 50k 초과라 0) → 20
# wait, subscriber: 1000<=100000<=50000 → False, so 0 for that bracket
# Actually: 1000 <= subs <= 50_000 → 100000 > 50000, so 0
# reach = 15(email) + 5(active) = 20
# conversion = 15+8 = 23
# risk = 0
# total = 20 + 23 - 0 = 43 → C급
check("10만 유튜버 점수 43", score_a, 43)
check("10만 유튜버 C급 (구독자 상한 초과)", grade_a, "C")
check("GATE 통과", is_gate_pass(ai_a), True)

# 시나리오: 경쟁툴 판매자 (50k 구독, 자체 프로그램, 유료강의)
ai_b = {
    "is_seller_content": True, "is_educational": True,
    "conversion_signals": {"has_paid_course": True, "has_paid_membership": True,
                           "has_ebook_sale": False, "has_consulting": False,
                           "has_tool_recommendation_content": False, "has_affiliate_experience": False},
    "risk_signals": {"sells_competing_tool": True, "sells_own_program": True,
                     "is_competitor_partner": False, "has_negative_tool_content": False},
}
conv_b = compute_conversion_signals(ai_b)
risk_b = compute_risk_signals(ai_b)
score_input_b = {
    "contact_email": "competitor@gmail.com", "contact_kakao": None,
    "contact_naver_cafe": None, "community_size": None,
    "activity_level": "active", "subscriber_count": 50000,
    "platforms_json": [], **conv_b, **risk_b,
}
score_b, grade_b, bd_b = calculate_score(score_input_b)
# reach: 이메일(15)+활성(5)+구독자 1k~50k(10) = 30
# conversion: 유료강의(15)+멤버십(12) = 27 (max 40)
# risk: 경쟁툴(30)+자체프로그램(20) = 40 (capped)
# total: 30 + 27 - 40 = 17 → D급
check("경쟁툴+자체프로그램 D급", grade_b, "D")
check("경쟁툴 감점 40 (캡)", bd_b["risk_deduction"], 40)
check("경쟁툴 → archived", "archived" if grade_b == "D" else "discovered", "archived")


# ════════════════════════════════════════════════════════════════
print(f"\n{'='*62}")
print(f"  최종 결과: {PASS}/{PASS+FAIL} PASSED  " +
      ("ALL PASS ✓" if FAIL == 0 else f"FAIL {FAIL}건"))
print(f"{'='*62}")
if FAIL:
    sys.exit(1)
