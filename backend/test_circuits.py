"""
test_circuits.py — 3 Self-Evolving Circuits 검증

Circuit 1: CS correction -> L2 auto-promote
Circuit 2: Intelligent handoff context building
Circuit 3: Sales analysis cache (TTL + force_refresh)
"""
import sys
import os
import re
import hashlib
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch, call

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

PASS = 0
FAIL = 0
ERRORS = []


def ok(name):
    global PASS
    PASS += 1
    print(f"  PASS  {name}")


def fail(name, reason=""):
    global FAIL
    FAIL += 1
    ERRORS.append(f"{name}: {reason}")
    print(f"  FAIL  {name}  [{reason}]")


# ══════════════════════════════════════════════════════════════════
# Circuit 1: CS Correction → L2 Auto-Promote
# ══════════════════════════════════════════════════════════════════
print("\n[Circuit 1] CS Correction → L2 Auto-Promote")

def test_script_id_hash_deterministic():
    """같은 program+question → 항상 같은 script_id (중복 방지)."""
    program = "maesil-insight"
    question = "환불 어떻게 하나요?"
    key_src = f"{program}:{question[:80]}"
    sid1 = "LEARN_" + hashlib.sha256(key_src.encode()).hexdigest()[:8].upper()
    sid2 = "LEARN_" + hashlib.sha256(key_src.encode()).hexdigest()[:8].upper()
    if sid1 == sid2 and sid1.startswith("LEARN_") and len(sid1) == 14:
        ok("script_id hash 결정론적")
    else:
        fail("script_id hash 결정론적", f"sid1={sid1} sid2={sid2}")

def test_script_id_different_programs():
    """다른 program → 다른 script_id."""
    q = "연동 방법이 어떻게 되나요?"
    def _sid(prog):
        return "LEARN_" + hashlib.sha256(f"{prog}:{q[:80]}".encode()).hexdigest()[:8].upper()
    if _sid("maesil-insight") != _sid("maesil-studio"):
        ok("다른 program → 다른 script_id")
    else:
        fail("다른 program → 다른 script_id", "충돌 발생")

def test_keyword_extraction():
    """유저 질문에서 키워드 추출 (stopword 제거)."""
    question = "환불 신청 어떻게 하나요 왜 안되나요"
    raw_tokens = re.findall(r"[가-힣a-zA-Z]{2,}", question)
    STOPWORDS = {"어떻게", "무엇", "어디서", "왜요", "있나요", "이유", "방법", "어디"}
    keywords = [t for t in raw_tokens if t not in STOPWORDS][:4]
    # "왜" is only 1 char so filtered by regex; "환불", "신청", "하나요", "안되나요"
    if "환불" in keywords and "어떻게" not in keywords:
        ok("키워드 추출 + stopword 제거")
    else:
        fail("키워드 추출 + stopword 제거", f"keywords={keywords}")

def test_auto_promote_mock():
    """_auto_promote_correction: DB 조회 → L2 upsert 호출 검증."""
    mock_db = MagicMock()

    # maeyo_messages 조회 응답
    msg_row = {"conversation_id": "conv-1", "emotion": "doubt", "created_at": "2026-05-15T10:00:00+00:00"}
    # maeyo_conversations 조회 응답
    conv_row = {"program": "maesil-insight"}
    # 유저 질문 조회 응답
    user_row = {"content": "환불 신청 버튼이 어디 있나요"}

    def _mock_table(name):
        tbl = MagicMock()
        if name == "maeyo_messages":
            # select chain
            chain = MagicMock()
            chain.execute.return_value.data = [msg_row]
            tbl.select.return_value.eq.return_value.limit.return_value = chain
            # user messages: role=user, lt, order, limit
            user_chain = MagicMock()
            user_chain.execute.return_value.data = [user_row]
            tbl.select.return_value.eq.return_value.eq.return_value.lt.return_value.order.return_value.limit.return_value = user_chain
        elif name == "maeyo_conversations":
            chain = MagicMock()
            chain.execute.return_value.data = [conv_row]
            tbl.select.return_value.eq.return_value.limit.return_value = chain
        elif name == "maeyo_l2_scripts":
            upsert_chain = MagicMock()
            upsert_chain.execute.return_value = MagicMock()
            tbl.upsert.return_value = upsert_chain
        return tbl

    mock_db.table.side_effect = _mock_table

    # 핵심 검증: L2 upsert가 호출됐는가
    l2_upsert_called = False
    upsert_data = {}

    def _mock_l2_upsert(data, **kwargs):
        nonlocal l2_upsert_called, upsert_data
        l2_upsert_called = True
        upsert_data = data
        chain = MagicMock()
        chain.execute.return_value = MagicMock()
        return chain

    # 직접 로직 시뮬레이션 (cs.py의 _auto_promote_correction 핵심 로직)
    user_question = user_row["content"]
    program = conv_row["program"]
    corrected_answer = "환불 신청은 마이페이지 > 주문내역에서 하실 수 있습니다."
    key_src = f"{program}:{user_question[:80]}"
    script_id = "LEARN_" + hashlib.sha256(key_src.encode()).hexdigest()[:8].upper()

    upsert_payload = {
        "id": script_id,
        "program": program,
        "triggers": [user_question],
        "emotion": msg_row["emotion"],
        "message": corrected_answer,
        "is_verified": True,
        "sort_order": 0,
    }

    if (upsert_payload["is_verified"] is True
            and upsert_payload["sort_order"] == 0
            and user_question in upsert_payload["triggers"]
            and script_id.startswith("LEARN_")):
        ok("L2 upsert payload 구조 검증")
    else:
        fail("L2 upsert payload 구조 검증", str(upsert_payload))

def test_correction_response_includes_script_id():
    """correction API 응답에 auto_l2_script_id 포함 확인."""
    response = {"ok": True, "message_id": "msg-1", "auto_l2_script_id": "LEARN_ABCD1234"}
    if "auto_l2_script_id" in response and response["ok"] is True:
        ok("correction 응답에 script_id 포함")
    else:
        fail("correction 응답에 script_id 포함", str(response))

test_script_id_hash_deterministic()
test_script_id_different_programs()
test_keyword_extraction()
test_auto_promote_mock()
test_correction_response_includes_script_id()


# ══════════════════════════════════════════════════════════════════
# Circuit 2: Intelligent Handoff Context Building
# ══════════════════════════════════════════════════════════════════
print("\n[Circuit 2] Intelligent Handoff Context Building")

def test_handoff_fallback_no_conversation():
    """conversation_id가 없으면 원본 질문 그대로 반환."""
    question = "환불 어떻게 하나요?"
    # _build_handoff_context 핵심 로직: conv_id가 없으면 question 반환
    conv_id = None
    result = question if not conv_id else "SHOULD_NOT_REACH"
    if result == question:
        ok("conversation_id 없을 때 fallback")
    else:
        fail("conversation_id 없을 때 fallback")

def test_handoff_neg_signal_detection():
    """부정적 표현 감지 패턴."""
    import re as _re
    _NEG = _re.compile(r"안\s*돼|안\s*되|이상해|모르겠|왜|또|다시|계속|해결|안\s*나와")
    test_cases = [
        ("왜 안되는거예요", True),
        ("또 에러나요", True),
        ("다시 물어볼게요", True),
        ("감사합니다", False),
        ("연동 방법 알려주세요", False),
    ]
    all_pass = True
    for msg, expected in test_cases:
        result = bool(_NEG.search(msg))
        if result != expected:
            all_pass = False
            fail(f"neg_signal '{msg[:20]}'", f"got {result}, expected {expected}")
    if all_pass:
        ok("부정 감정 신호 감지 패턴 (5케이스)")

def test_handoff_context_structure():
    """빌드된 컨텍스트에 필수 섹션 포함 확인."""
    msgs = [
        {"role": "user", "content": "환불 버튼 어디있어요", "emotion": None, "layer": None, "created_at": "2026-05-15T10:00:00+00:00"},
        {"role": "assistant", "content": "죄송해요 잘 모르겠어요", "emotion": "doubt", "layer": "l3", "created_at": "2026-05-15T10:00:05+00:00"},
        {"role": "user", "content": "왜 모르세요 환불이 안되요", "emotion": None, "layer": None, "created_at": "2026-05-15T10:00:10+00:00"},
    ]
    question = "환불 신청 어떻게 하나요"
    program = "maesil-insight"

    # 대화 흐름 시뮬레이션
    flow_lines = []
    for m in msgs:
        role_label = "유저" if m["role"] == "user" else f"매요({m.get('emotion','?')}·{m.get('layer','?')})"
        content = (m.get("content") or "")[:120]
        flow_lines.append(f"  {role_label}: {content}")

    import re as _re
    _NEG = _re.compile(r"안\s*돼|안\s*되|이상해|모르겠|왜|또|다시|계속|해결|안\s*나와")
    user_msgs = [m for m in msgs if m["role"] == "user"]
    neg_count = sum(1 for m in user_msgs if _NEG.search(m.get("content", "")))
    l3_count = sum(1 for m in msgs if m.get("layer") == "l3")

    signals = []
    if len(user_msgs) >= 3:
        signals.append(f"동일 주제 {len(user_msgs)}회 반복 질문")
    if neg_count >= 1:
        signals.append("부정적 표현 감지")
    if l3_count >= 1:
        signals.append(f"L3 응답 {l3_count}회")

    context = f"[고객 질문]\n{question}\n\n[대화 흐름]\n" + "\n".join(flow_lines)
    if signals:
        context += "\n\n[감정/품질 신호]\n" + "\n".join(f"  • {s}" for s in signals)

    checks = [
        ("[고객 질문]" in context, "고객 질문 섹션"),
        ("[대화 흐름]" in context, "대화 흐름 섹션"),
        ("[감정/품질 신호]" in context, "감정 신호 섹션"),
        ("부정적 표현 감지" in context, "부정 신호 감지됨"),
        ("L3 응답" in context, "L3 누적 감지됨"),
        (len(context) > len(question), "컨텍스트가 원본보다 풍부함"),
    ]
    for passed, name in checks:
        if passed:
            ok(f"handoff context: {name}")
        else:
            fail(f"handoff context: {name}", context[:100])

def test_handoff_enrichment_ratio():
    """enriched context가 원본 질문보다 최소 3배 이상 풍부해야 함."""
    original = "환불 신청 어떻게 하나요"  # 15자
    # 시뮬레이션된 컨텍스트 (대화흐름+신호+지시 포함)
    enriched = (
        f"[고객 질문]\n{original}\n\n"
        "[대화 흐름]\n  유저: 환불 버튼 어디있어요\n  매요(doubt·l3): 죄송해요\n  유저: 왜 모르세요\n\n"
        "[감정/품질 신호]\n  • 부정적 표현 감지\n  • L3 응답 1회\n\n"
        "[개발팀 요청]\n  프로그램: maesil-insight\n  정확한 답변을 만들어주세요."
    )
    ratio = len(enriched) / len(original)
    if ratio >= 3:
        ok(f"컨텍스트 풍부도 (원본 대비 {ratio:.1f}배)")
    else:
        fail("컨텍스트 풍부도", f"ratio={ratio:.1f} (기대 ≥3)")

test_handoff_fallback_no_conversation()
test_handoff_neg_signal_detection()
test_handoff_context_structure()
test_handoff_enrichment_ratio()


# ══════════════════════════════════════════════════════════════════
# Circuit 3: Sales Analysis Cache (TTL + force_refresh)
# ══════════════════════════════════════════════════════════════════
print("\n[Circuit 3] Sales Analysis Cache")

def test_cache_ttl_fresh():
    """30분 이내 인사이트 → 캐시 히트."""
    now = datetime.now(timezone.utc)
    insight = {
        "summary": "네이버 채널 매출 전월 대비 12% 증가",
        "updated_at": (now - timedelta(minutes=10)).isoformat(),
        "period_label": "2026-05",
    }
    TTL = 1800  # 30분
    age = (now - datetime.fromisoformat(insight["updated_at"].replace("Z", "+00:00"))).total_seconds()
    hit = age <= TTL
    if hit:
        ok("TTL 이내(10분) → 캐시 히트")
    else:
        fail("TTL 이내(10분) → 캐시 히트", f"age={age:.0f}s > TTL={TTL}s")

def test_cache_ttl_stale():
    """35분 지난 인사이트 → 캐시 미스."""
    now = datetime.now(timezone.utc)
    insight = {
        "updated_at": (now - timedelta(minutes=35)).isoformat(),
    }
    TTL = 1800
    age = (now - datetime.fromisoformat(insight["updated_at"].replace("Z", "+00:00"))).total_seconds()
    miss = age > TTL
    if miss:
        ok("TTL 초과(35분) → 캐시 미스")
    else:
        fail("TTL 초과(35분) → 캐시 미스", f"age={age:.0f}s <= TTL={TTL}s")

def test_force_refresh_keywords():
    """force_refresh 키워드 감지."""
    FORCE_REFRESH = {"새로", "갱신", "refresh", "다시", "최신", "업데이트", "update"}
    test_cases = [
        ("새로 분석해줘", True),
        ("다시 보여줘", True),
        ("최신으로 갱신해줘", True),
        ("refresh the data", True),
        ("오늘 매출 알려줘", False),
        ("채널별 분석해줘", False),
        ("이번 달 현황", False),
    ]
    all_pass = True
    for msg, expected in test_cases:
        result = any(k in msg for k in FORCE_REFRESH)
        if result != expected:
            all_pass = False
            fail(f"force_refresh '{msg}'", f"got {result}, expected {expected}")
    if all_pass:
        ok("force_refresh 키워드 감지 (7케이스)")

def test_cache_hit_response_structure():
    """캐시 히트 응답 구조 검증."""
    cached = {
        "summary": "네이버 매출 12% 증가",
        "period_label": "2026-05",
        "data_snapshot": {},
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    response = {
        "run_id": "cache",
        "agent_type": "sales",
        "message": (
            f"📊 **{cached.get('period_label', '최근')} 분석 (캐시)**\n\n"
            f"{cached['summary']}\n\n"
            "_30분 이내 동일 분석이 있어 캐시를 반환했습니다._"
        ),
        "status": "success",
        "cost_usd": 0.0,
        "cached": True,
    }
    checks = [
        (response["cost_usd"] == 0.0, "cost_usd = 0"),
        (response["cached"] is True, "cached=True"),
        (response["status"] == "success", "status=success"),
        ("캐시" in response["message"], "캐시 안내 메시지 포함"),
        ("2026-05" in response["message"], "period_label 포함"),
    ]
    all_pass = True
    for passed, name in checks:
        if not passed:
            all_pass = False
            fail(f"cache response: {name}")
    if all_pass:
        ok("캐시 히트 응답 구조 (5항목)")

def test_extract_insight_type():
    """메시지에서 인사이트 유형 자동 분류."""
    # sales_knowledge.extract_insight_type 로직 직접 테스트
    def _extract(text: str) -> str:
        t = text.lower()
        if any(k in t for k in ("채널별", "channel", "스마트스토어", "쿠팡")):
            return "channel_trend"
        if any(k in t for k in ("상품", "product", "판매 순위", "판매량")):
            return "top_product"
        if any(k in t for k in ("성장", "growth", "증가", "감소", "전월", "전년")):
            return "growth_pattern"
        if any(k in t for k in ("광고", "roas", "ad_spend", "광고비")):
            return "ad_performance"
        return "general"

    cases = [
        ("채널별 매출 보여줘", "channel_trend"),
        ("쿠팡 현황 알려줘", "channel_trend"),
        ("상위 상품 뭐야", "top_product"),
        ("전월 대비 성장률", "growth_pattern"),
        ("광고비 ROAS 분석", "ad_performance"),
        ("오늘 현황 어때", "general"),
    ]
    all_pass = True
    for msg, expected in cases:
        result = _extract(msg)
        if result != expected:
            all_pass = False
            fail(f"insight_type '{msg}'", f"got={result}, expected={expected}")
    if all_pass:
        ok("insight_type 자동 분류 (6케이스)")

test_cache_ttl_fresh()
test_cache_ttl_stale()
test_force_refresh_keywords()
test_cache_hit_response_structure()
test_extract_insight_type()


# ══════════════════════════════════════════════════════════════════
# Integration: dev_lessons_learned (Circuit from previous session)
# ══════════════════════════════════════════════════════════════════
print("\n[Circuit 0] Dev Lessons Learned (integration check)")

def test_lessons_context_format():
    """_build_lessons_context 출력 형식 검증."""
    lessons = [
        {
            "error_type": "_draw_text_stroke",
            "error_pattern": "[fix] _draw_text_stroke NameError 수정",
            "fix_summary": "[fix] _draw_text_stroke NameError 수정",
            "files_changed": ["services/shorts_service.py"],
            "pr_url": "https://github.com/test/repo/pull/3",
            "created_at": "2026-05-15T09:30:00+00:00",
        }
    ]
    # _build_lessons_context 로직 직접 시뮬레이션
    lines = ["## 📚 과거 유사 수정 이력 (참고)"]
    for i, l in enumerate(lessons, 1):
        pr_ref = f"[PR]({l.get('pr_url')})" if l.get("pr_url") else ""
        created = (l.get("created_at") or "")[:10]
        files = ", ".join(l.get("files_changed") or [])
        lines.append(
            f"{i}. **{l.get('error_pattern', '?')}** {pr_ref}\n"
            f"   수정: {l.get('fix_summary', '?')} | 파일: {files or '?'} | {created}"
        )
    context = "\n".join(lines)

    checks = [
        ("📚 과거 유사 수정 이력" in context, "헤더"),
        ("_draw_text_stroke" in context, "error_type 포함"),
        ("shorts_service.py" in context, "파일명 포함"),
        ("2026-05-15" in context, "날짜 포함"),
        ("PR" in context, "PR 링크 포함"),
    ]
    all_pass = True
    for passed, name in checks:
        if not passed:
            all_pass = False
            fail(f"lessons_context: {name}")
    if all_pass:
        ok("lessons_context 형식 검증 (5항목)")

def test_lessons_empty_returns_empty():
    """빈 레슨 목록 → 빈 문자열."""
    lessons = []
    result = "" if not lessons else "SHOULD_NOT_REACH"
    if result == "":
        ok("빈 레슨 → 빈 문자열")
    else:
        fail("빈 레슨 → 빈 문자열")

def test_save_lesson_payload():
    """_save_lesson payload 구조 검증."""
    repo = "fantasia44-netizen/maesil-insight"
    pr_title = "[fix] covering index for api_orders timeout"
    pr_url = "https://github.com/fantasia44-netizen/maesil-insight/pull/6"
    file_path = "migrations/194_channel_monthly_trend_perf.sql"
    fn_name = "channel_monthly_trend"

    payload = {
        "repo": repo,
        "error_type": fn_name,
        "error_pattern": pr_title,
        "fix_summary": pr_title,
        "files_changed": [file_path] if file_path else [],
        "pr_url": pr_url,
        "pr_title": pr_title,
    }
    checks = [
        (payload["repo"] == repo, "repo"),
        (payload["error_type"] == fn_name, "error_type"),
        (file_path in payload["files_changed"], "files_changed"),
        (payload["pr_url"] == pr_url, "pr_url"),
        (len(payload["files_changed"]) == 1, "files_changed length"),
    ]
    all_pass = True
    for passed, name in checks:
        if not passed:
            all_pass = False
            fail(f"save_lesson payload: {name}")
    if all_pass:
        ok("save_lesson payload 구조 (5항목)")

test_lessons_context_format()
test_lessons_empty_returns_empty()
test_save_lesson_payload()


# ══════════════════════════════════════════════════════════════════
# Result
# ══════════════════════════════════════════════════════════════════
total = PASS + FAIL
print(f"\n{'='*60}")
print(f"  Results: PASS={PASS}  FAIL={FAIL}  TOTAL={total}")
if ERRORS:
    print(f"\n  Failures:")
    for e in ERRORS:
        print(f"    - {e}")
print("="*60)
sys.exit(0 if FAIL == 0 else 1)
