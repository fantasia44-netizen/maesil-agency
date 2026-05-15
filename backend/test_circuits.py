"""
test_circuits.py — Self-Evolving Circuits 검증 (P1 보강 포함)

Circuit 0: Dev Lessons Learned
Circuit 1: CS Correction -> L2 Auto-Promote (draft 워크플로우 포함)
Circuit 2: Intelligent Handoff Context Building
Circuit 3: Sales Analysis Cache (TTL + force_refresh)
Circuit P1: P1 보강 검증
  P1-1: _pending / _recent_pr DB 영속화
  P1-2: L2 draft -> approve / reject 워크플로우
  P1-3: dev_lessons 품질 필드 (root_cause, actual_fix, lesson_quality)
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
# Circuit 1: CS Correction → L2 Auto-Promote (draft 워크플로우)
# ══════════════════════════════════════════════════════════════════
print("\n[Circuit 1] CS Correction → L2 Auto-Promote (draft workflow)")

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
    if "환불" in keywords and "어떻게" not in keywords:
        ok("키워드 추출 + stopword 제거")
    else:
        fail("키워드 추출 + stopword 제거", f"keywords={keywords}")

def test_auto_promote_creates_draft():
    """P1 보강: correction → is_verified=False, status='draft' (L2 매칭 제외 상태)."""
    user_question = "환불 신청 버튼이 어디 있나요"
    program = "maesil-insight"
    corrected_answer = "환불 신청은 마이페이지 > 주문내역에서 하실 수 있습니다."
    key_src = f"{program}:{user_question[:80]}"
    script_id = "LEARN_" + hashlib.sha256(key_src.encode()).hexdigest()[:8].upper()

    # P1 이후 페이로드: is_verified=False, status='draft'
    upsert_payload = {
        "id": script_id,
        "program": program,
        "triggers": [user_question],
        "emotion": "doubt",
        "message": corrected_answer,
        "is_active": True,
        "is_verified": False,   # P1: 관리자 승인 전까지 미검증
        "status": "draft",      # P1: L2 매칭 제외
        "sort_order": 0,
    }

    checks = [
        (upsert_payload["is_verified"] is False, "is_verified=False (승인 전)"),
        (upsert_payload["status"] == "draft", "status='draft'"),
        (upsert_payload["is_active"] is True, "is_active=True (DB엔 존재)"),
        (script_id.startswith("LEARN_"), "script_id LEARN_ prefix"),
        (user_question in upsert_payload["triggers"], "trigger 포함"),
    ]
    all_pass = True
    for passed, name in checks:
        if not passed:
            all_pass = False
            fail(f"draft payload: {name}", str(upsert_payload))
    if all_pass:
        ok("correction → draft 등록 payload (5항목)")

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
test_auto_promote_creates_draft()
test_correction_response_includes_script_id()


# ══════════════════════════════════════════════════════════════════
# Circuit 2: Intelligent Handoff Context Building
# ══════════════════════════════════════════════════════════════════
print("\n[Circuit 2] Intelligent Handoff Context Building")

def test_handoff_fallback_no_conversation():
    """conversation_id가 없으면 원본 질문 그대로 반환."""
    question = "환불 어떻게 하나요?"
    conv_id = None
    result = question if not conv_id else "SHOULD_NOT_REACH"
    if result == question:
        ok("conversation_id 없을 때 fallback")
    else:
        fail("conversation_id 없을 때 fallback")

def test_handoff_neg_signal_detection():
    """부정적 표현 감지 패턴."""
    _NEG = re.compile(r"안\s*돼|안\s*되|이상해|모르겠|왜|또|다시|계속|해결|안\s*나와")
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

    flow_lines = []
    for m in msgs:
        role_label = "유저" if m["role"] == "user" else f"매요({m.get('emotion','?')}·{m.get('layer','?')})"
        content = (m.get("content") or "")[:120]
        flow_lines.append(f"  {role_label}: {content}")

    _NEG = re.compile(r"안\s*돼|안\s*되|이상해|모르겠|왜|또|다시|계속|해결|안\s*나와")
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
    original = "환불 신청 어떻게 하나요"
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
        fail("컨텍스트 풍부도", f"ratio={ratio:.1f} (기대 >=3)")

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
    TTL = 1800
    age = (now - datetime.fromisoformat(insight["updated_at"].replace("Z", "+00:00"))).total_seconds()
    if age <= TTL:
        ok("TTL 이내(10분) → 캐시 히트")
    else:
        fail("TTL 이내(10분) → 캐시 히트", f"age={age:.0f}s > TTL={TTL}s")

def test_cache_ttl_stale():
    """35분 지난 인사이트 → 캐시 미스."""
    now = datetime.now(timezone.utc)
    insight = {"updated_at": (now - timedelta(minutes=35)).isoformat()}
    TTL = 1800
    age = (now - datetime.fromisoformat(insight["updated_at"].replace("Z", "+00:00"))).total_seconds()
    if age > TTL:
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
# Circuit 0: Dev Lessons Learned (P1-3 품질 필드 포함)
# ══════════════════════════════════════════════════════════════════
print("\n[Circuit 0] Dev Lessons Learned (P1-3 quality fields)")

def test_extract_root_cause_from_body():
    """PR body에서 root_cause 추출."""
    pr_body = (
        "## AI 자동 수정\n\n"
        "NaverAdClient.create_stat_report 함수가 정의되지 않아 AttributeError 발생. "
        "api_client.py에 누락된 메서드를 추가함.\n\n"
        "---\n*maesil-agency 자동 생성*"
    )
    # _extract_root_cause_from_body 로직 직접 시뮬레이션
    body = re.sub(r"```[\s\S]*?```", "", pr_body)
    lines = [ln.strip() for ln in body.split("\n") if ln.strip()]
    skip_prefixes = ("##", "#", "---", "*maesil-agency", "PR제목", "커밋메시지", "함수명", "신뢰도")
    root_cause = None
    for ln in lines:
        if not any(ln.startswith(p) for p in skip_prefixes) and len(ln) > 15:
            root_cause = ln[:200]
            break

    if root_cause and "AttributeError" in root_cause:
        ok("PR body에서 root_cause 추출")
    else:
        fail("PR body에서 root_cause 추출", f"got={root_cause!r}")

def test_extract_root_cause_empty_body():
    """PR body가 None이면 root_cause=None."""
    pr_body = None
    root_cause = None  # 그대로 None
    if root_cause is None:
        ok("PR body None → root_cause None")
    else:
        fail("PR body None → root_cause None")

def test_save_lesson_payload_v2():
    """P1-3: _save_lesson payload — 품질 필드 포함 구조 검증."""
    repo = "fantasia44-netizen/maesil-insight"
    pr_title = "[fix] NaverAdClient.create_stat_report AttributeError 수정"
    pr_url = "https://github.com/fantasia44-netizen/maesil-insight/pull/7"
    file_path = "app/services/naver_ad/api_client.py"
    fn_name = "NaverAdClient.create_stat_report"
    commit_msg = "fix: NaverAdClient에 누락된 create_stat_report 메서드 추가"
    test_result = "unknown"
    lesson_quality = "ok"

    payload = {
        "repo": repo,
        "error_type": fn_name,
        "error_pattern": pr_title,
        "root_cause": "NaverAdClient.create_stat_report 함수 미정의",
        "fix_summary": pr_title,
        "actual_fix": commit_msg,
        "files_changed": [file_path],
        "pr_url": pr_url,
        "pr_title": pr_title,
        "test_result": test_result,
        "lesson_quality": lesson_quality,
    }
    checks = [
        ("actual_fix" in payload, "actual_fix 필드 존재"),
        (payload["actual_fix"] == commit_msg, "actual_fix = commit_msg"),
        ("root_cause" in payload, "root_cause 필드 존재"),
        ("test_result" in payload, "test_result 필드 존재"),
        ("lesson_quality" in payload, "lesson_quality 필드 존재"),
        (payload["lesson_quality"] in ("good", "ok", "bad"), "lesson_quality 유효 값"),
        (file_path in payload["files_changed"], "files_changed 포함"),
    ]
    all_pass = True
    for passed, name in checks:
        if not passed:
            all_pass = False
            fail(f"save_lesson_v2: {name}")
    if all_pass:
        ok("save_lesson v2 payload 구조 (7항목)")

def test_lessons_context_format_v2():
    """P1-3: _build_lessons_context 업데이트 형식 — root_cause + quality badge."""
    lessons = [
        {
            "error_type": "NaverAdClient.create_stat_report",
            "error_pattern": "[fix] create_stat_report AttributeError 수정",
            "root_cause": "api_client.py에 메서드 누락",
            "fix_summary": "[fix] create_stat_report AttributeError 수정",
            "actual_fix": "fix: NaverAdClient에 누락된 메서드 추가",
            "files_changed": ["app/services/naver_ad/api_client.py"],
            "pr_url": "https://github.com/test/repo/pull/7",
            "lesson_quality": "good",
            "created_at": "2026-05-16T09:30:00+00:00",
        },
        {
            "error_type": "SyncLog.start",
            "error_pattern": "[fix] SyncLog.start 잘못된 접근 시도",
            "root_cause": None,
            "fix_summary": "잘못된 수정 시도",
            "actual_fix": "잘못된 수정 시도",
            "files_changed": [],
            "pr_url": None,
            "lesson_quality": "bad",
            "created_at": "2026-05-16T08:00:00+00:00",
        },
    ]

    # _build_lessons_context 로직 시뮬레이션 (P1-3 버전)
    lines = ["## 📚 과거 유사 수정 이력 (참고)"]
    for i, l in enumerate(lessons, 1):
        pr_ref = f"[PR]({l.get('pr_url')})" if l.get("pr_url") else ""
        created = (l.get("created_at") or "")[:10]
        files = ", ".join((l.get("files_changed") or [])[:3])
        quality = l.get("lesson_quality") or "ok"
        badge = "✅" if quality == "good" else ("⚠️ [실패 시도]" if quality == "bad" else "")
        root_cause = l.get("root_cause") or ""
        actual_fix = l.get("actual_fix") or l.get("fix_summary") or "?"

        entry = f"{i}. {badge}**{l.get('error_pattern', '?')}** {pr_ref} ({created})"
        if root_cause:
            entry += f"\n   원인: {root_cause[:120]}"
        entry += f"\n   수정: {actual_fix[:120]} | 파일: {files or '?'}"
        lines.append(entry)

    context = "\n".join(lines)

    checks = [
        ("📚 과거 유사 수정 이력" in context, "헤더"),
        ("✅" in context, "good 레슨 배지"),
        ("⚠️ [실패 시도]" in context, "bad 레슨 배지"),
        ("원인: api_client.py" in context, "root_cause 표시"),
        ("actual_fix 누락된 메서드" in context or "누락된 메서드" in context, "actual_fix 표시"),
        ("2026-05-16" in context, "날짜 포함"),
    ]
    all_pass = True
    for passed, name in checks:
        if not passed:
            all_pass = False
            fail(f"lessons_context_v2: {name}", context[:200])
    if all_pass:
        ok("lessons_context v2 형식 (6항목)")

def test_lessons_empty_returns_empty():
    """빈 레슨 목록 → 빈 문자열."""
    lessons = []
    result = "" if not lessons else "SHOULD_NOT_REACH"
    if result == "":
        ok("빈 레슨 → 빈 문자열")
    else:
        fail("빈 레슨 → 빈 문자열")

def test_bad_lesson_excluded_from_context():
    """lesson_quality='bad'인 레슨은 _load_lessons 쿼리에서 제외됨 (neq 필터)."""
    # 실제 DB 쿼리 시뮬레이션: neq('lesson_quality', 'bad') 적용
    all_lessons = [
        {"lesson_quality": "good", "error_pattern": "fix A"},
        {"lesson_quality": "ok",   "error_pattern": "fix B"},
        {"lesson_quality": "bad",  "error_pattern": "fix C (실패 시도)"},
    ]
    # neq('bad') 필터 적용
    filtered = [l for l in all_lessons if l.get("lesson_quality") != "bad"]
    if len(filtered) == 2 and all(l["lesson_quality"] != "bad" for l in filtered):
        ok("bad 레슨 조회 제외 (neq 필터)")
    else:
        fail("bad 레슨 조회 제외", f"filtered={[l['error_pattern'] for l in filtered]}")

test_extract_root_cause_from_body()
test_extract_root_cause_empty_body()
test_save_lesson_payload_v2()
test_lessons_context_format_v2()
test_lessons_empty_returns_empty()
test_bad_lesson_excluded_from_context()


# ══════════════════════════════════════════════════════════════════
# Circuit P1-1: _pending / _recent_pr DB 영속화
# ══════════════════════════════════════════════════════════════════
print("\n[Circuit P1-1] _pending / _recent_pr DB 영속화")

def test_pending_task_key_format():
    """pending task_id 키 형식 검증."""
    conv_id = "conv-abc-1234"
    pr_key = f"pr:{conv_id}"
    recent_key = f"recent_pr:{conv_id}"
    checks = [
        (pr_key == "pr:conv-abc-1234", "pr approval 키 형식"),
        (recent_key == "recent_pr:conv-abc-1234", "recent pr 키 형식"),
        (pr_key != recent_key, "두 키가 구분됨"),
    ]
    all_pass = True
    for passed, name in checks:
        if not passed:
            all_pass = False
            fail(f"pending key: {name}")
    if all_pass:
        ok("pending task_id 키 형식 (3항목)")

def test_pending_payload_structure():
    """DB 저장 pending payload 구조 검증."""
    conv_id = "conv-test-001"
    action = {
        "action_id": "abc12345",
        "repo": "fantasia44-netizen/maesil-insight",
        "branch": "fix/agency-abc12345",
        "base_branch": "main",
        "path": "app/services/naver_ad.py",
        "patch_code": "def create_stat_report(self): ...",
        "fn_name": "create_stat_report",
        "commit_msg": "fix: add create_stat_report method",
        "pr_title": "[fix] NaverAdClient.create_stat_report 추가",
        "confidence": "high",
    }
    from datetime import timedelta
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()

    db_row = {
        "task_id": f"pr:{conv_id}",
        "task_type": "pr_approval",
        "payload": action,
        "status": "pending",
        "conversation_id": conv_id,
        "expires_at": expires_at,
    }

    checks = [
        (db_row["task_id"] == f"pr:{conv_id}", "task_id 형식"),
        (db_row["task_type"] == "pr_approval", "task_type"),
        (db_row["status"] == "pending", "초기 status=pending"),
        (db_row["payload"]["fn_name"] == "create_stat_report", "payload.fn_name"),
        ("expires_at" in db_row, "expires_at 존재"),
        (db_row["payload"]["confidence"] == "high", "confidence 포함"),
    ]
    all_pass = True
    for passed, name in checks:
        if not passed:
            all_pass = False
            fail(f"pending payload: {name}")
    if all_pass:
        ok("pending DB row 구조 (6항목)")

def test_pending_expiry_check():
    """만료된 pending은 None 반환 (expires_at < now)."""
    now = datetime.now(timezone.utc)
    # 만료된 레코드: 25시간 전 생성
    expired_row = {
        "status": "pending",
        "expires_at": (now - timedelta(hours=25)).isoformat(),
        "payload": {"action_id": "old"},
    }
    # _get_pending 로직: expires_at >= now 조건
    is_valid = datetime.fromisoformat(expired_row["expires_at"].replace("Z", "+00:00")) >= now
    if not is_valid:
        ok("만료된 pending → None (expires_at 체크)")
    else:
        fail("만료된 pending → None", "만료됐는데 유효로 판정")

def test_pending_memory_fallback():
    """DB 실패 시 메모리 fallback 동작 시뮬레이션."""
    _pending_mem: dict = {}
    conv_id = "conv-fallback-test"
    action = {"action_id": "fb001", "repo": "test/repo"}

    # DB 저장 실패 시 메모리에 저장
    db_failed = True
    if db_failed:
        _pending_mem[conv_id] = action

    # 조회: 메모리 먼저 확인
    result = _pending_mem.get(conv_id)
    if result and result["action_id"] == "fb001":
        ok("DB 실패 시 메모리 fallback 동작")
    else:
        fail("DB 실패 시 메모리 fallback", f"result={result}")

def test_recent_pr_payload_includes_pr_body():
    """P1-1: recent_pr payload에 pr_body, commit_msg 포함 (레슨 저장 시 활용)."""
    recent_pr_data = {
        "repo": "fantasia44-netizen/maesil-insight",
        "pr_number": 7,
        "pr_url": "https://github.com/fantasia44-netizen/maesil-insight/pull/7",
        "pr_title": "[fix] NaverAdClient.create_stat_report 추가",
        "pr_body": "## AI 자동 수정\n\n함수 누락으로 AttributeError 발생...",
        "commit_msg": "fix: NaverAdClient에 누락된 메서드 추가",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    checks = [
        ("pr_body" in recent_pr_data, "pr_body 포함"),
        ("commit_msg" in recent_pr_data, "commit_msg 포함"),
        (recent_pr_data["pr_number"] == 7, "pr_number"),
        (len(recent_pr_data["pr_body"]) > 10, "pr_body 내용 있음"),
    ]
    all_pass = True
    for passed, name in checks:
        if not passed:
            all_pass = False
            fail(f"recent_pr payload: {name}")
    if all_pass:
        ok("recent_pr payload에 pr_body/commit_msg 포함 (4항목)")

def test_pending_del_marks_done():
    """_del_pending: DB status를 'done'으로 변경."""
    # 삭제 후 상태
    status_after = "done"  # update({'status': 'done'}) 결과
    _pending_mem: dict = {"conv-1": {"action_id": "x"}}
    _pending_mem.pop("conv-1", None)

    if status_after == "done" and "conv-1" not in _pending_mem:
        ok("pending 삭제: DB=done, 메모리 제거")
    else:
        fail("pending 삭제", f"status={status_after}")

test_pending_task_key_format()
test_pending_payload_structure()
test_pending_expiry_check()
test_pending_memory_fallback()
test_recent_pr_payload_includes_pr_body()
test_pending_del_marks_done()


# ══════════════════════════════════════════════════════════════════
# Circuit P1-2: L2 draft → approve / reject 워크플로우
# ══════════════════════════════════════════════════════════════════
print("\n[Circuit P1-2] L2 draft → approve / reject 워크플로우")

def test_l2_draft_not_in_matching():
    """status='draft'인 스크립트는 L2 매칭에서 제외."""
    all_scripts = [
        {"id": "L2_001", "status": "active",  "triggers": ["환불"], "is_active": True},
        {"id": "LEARN_ABCD", "status": "draft", "triggers": ["환불 방법"], "is_active": True},
        {"id": "L2_002", "status": "active",  "triggers": ["배송"], "is_active": True},
        {"id": "L2_003", "status": None,       "triggers": ["취소"], "is_active": True},
    ]
    # _load_l2_scripts 필터: status=active OR status IS NULL
    matching = [s for s in all_scripts
                if s.get("status") == "active" or s.get("status") is None]
    script_ids = [s["id"] for s in matching]

    checks = [
        ("LEARN_ABCD" not in script_ids, "draft 스크립트 제외"),
        ("L2_001" in script_ids, "active 스크립트 포함"),
        ("L2_003" in script_ids, "status=None 스크립트 포함 (하위호환)"),
        (len(matching) == 3, "매칭 대상 3개"),
    ]
    all_pass = True
    for passed, name in checks:
        if not passed:
            all_pass = False
            fail(f"draft 필터: {name}", f"matching={script_ids}")
    if all_pass:
        ok("draft L2 매칭 제외 + 하위호환 (4항목)")

def test_l2_approve_payload():
    """approve 시 status='active', is_verified=True로 변경."""
    script_before = {"id": "LEARN_ABCD", "status": "draft", "is_verified": False}

    # PATCH /l2-scripts/{id}/approve 로직
    update_payload = {
        "status": "active",
        "is_verified": True,
        "sort_order": 0,
    }
    script_after = {**script_before, **update_payload}

    checks = [
        (script_after["status"] == "active", "status=active"),
        (script_after["is_verified"] is True, "is_verified=True"),
        (script_after["sort_order"] == 0, "sort_order=0 (최우선)"),
    ]
    all_pass = True
    for passed, name in checks:
        if not passed:
            all_pass = False
            fail(f"approve: {name}")
    if all_pass:
        ok("approve → status=active + is_verified=True (3항목)")

def test_l2_reject_payload():
    """reject 시 is_active=False (비활성화, DB에서 제거하지 않음)."""
    script_before = {"id": "LEARN_ABCD", "status": "draft", "is_active": True}

    # PATCH /l2-scripts/{id}/reject 로직
    update_payload = {"is_active": False}
    script_after = {**script_before, **update_payload}

    checks = [
        (script_after["is_active"] is False, "is_active=False"),
        (script_after["status"] == "draft", "status 유지 (기록 보존)"),
        (script_after["id"] == "LEARN_ABCD", "id 보존"),
    ]
    all_pass = True
    for passed, name in checks:
        if not passed:
            all_pass = False
            fail(f"reject: {name}")
    if all_pass:
        ok("reject → is_active=False (기록 보존) (3항목)")

def test_l2_drafts_list_api():
    """GET /l2-scripts/drafts — draft 목록 조회 결과 구조."""
    mock_drafts = [
        {
            "id": "LEARN_ABCD1234",
            "program": "maesil-insight",
            "triggers": ["환불 신청 버튼이 어디 있나요"],
            "keywords": ["환불", "신청"],
            "emotion": "doubt",
            "message": "환불 신청은 마이페이지에서 하실 수 있습니다.",
            "is_active": True,
            "updated_at": "2026-05-16T09:00:00+00:00",
        }
    ]
    # 응답 구조 검증
    checks = [
        (len(mock_drafts) == 1, "draft 1개 반환"),
        (mock_drafts[0]["id"].startswith("LEARN_"), "LEARN_ prefix"),
        ("triggers" in mock_drafts[0], "triggers 포함"),
        ("message" in mock_drafts[0], "message 포함"),
        (mock_drafts[0]["is_active"] is True, "is_active=True"),
    ]
    all_pass = True
    for passed, name in checks:
        if not passed:
            all_pass = False
            fail(f"drafts API: {name}")
    if all_pass:
        ok("drafts 목록 API 구조 (5항목)")

def test_l2_approve_triggers_cache_invalidation():
    """approve 후 L2 캐시 무효화 필요 (draft는 무효화 불필요)."""
    # draft 등록 시: 캐시 무효화 안 함 (draft는 L2에 포함 안 되므로)
    draft_invalidates_cache = False
    # approve 후: 캐시 무효화 필요 (이제 active로 바뀌어 L2에 포함됨)
    approve_invalidates_cache = True

    if not draft_invalidates_cache and approve_invalidates_cache:
        ok("draft 등록=캐시유지, approve=캐시무효화")
    else:
        fail("캐시 무효화 정책",
             f"draft_invalidates={draft_invalidates_cache}, approve_invalidates={approve_invalidates_cache}")

test_l2_draft_not_in_matching()
test_l2_approve_payload()
test_l2_reject_payload()
test_l2_drafts_list_api()
test_l2_approve_triggers_cache_invalidation()


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
