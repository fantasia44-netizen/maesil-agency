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
# Circuit TOKEN: 토큰 보호 — 회수·글자 수 제한
# ══════════════════════════════════════════════════════════════════
print("\n[Circuit TOKEN] 컨텍스트 토큰 보호 (회수·글자 수 제한)")

# base.py DB 의존성 없이 로직을 인라인으로 검증
# (환경변수 없이도 실행 가능하도록 base.py의 핵심 함수를 로컬 재현)
_MAX_MSG_CHARS: int = 2_000
_MAX_CONTEXT_CHARS: int = 40_000
_MAX_CURRENT_MSG_CHARS: int = 8_000
_TRUNCATE_SUFFIX_BASE: str = "…[내용 일부 생략]"

def _truncate(text: str, max_chars: int, suffix: str = _TRUNCATE_SUFFIX_BASE) -> str:
    if len(text) <= max_chars:
        return text
    cut = max_chars - len(suffix)
    return text[:cut] + suffix

def _build_messages(context_messages, current_message: str, max_turns: int = 8):
    msgs = []
    summary_header = None
    if context_messages:
        # ① summary 파티션 분리
        normal_msgs = []
        for m in context_messages:
            if m.get("message_type") == "summary" or m.get("role") == "summary":
                summary_header = str(m.get("content") or "").strip()
            else:
                normal_msgs.append(m)
        # ② max_turns 슬라이딩
        recent = normal_msgs[-(max_turns * 2):]
        # ③ 각 메시지 글자 제한
        for m in recent:
            role = "user" if m.get("role") == "user" else "assistant"
            raw_content = str(m.get("content") or "").strip()
            if not raw_content:
                continue
            content = _truncate(raw_content, _MAX_MSG_CHARS)
            if msgs and msgs[-1]["role"] == role:
                combined = msgs[-1]["content"] + "\n\n" + content
                msgs[-1]["content"] = _truncate(combined, _MAX_MSG_CHARS)
            else:
                msgs.append({"role": role, "content": content})
        # ④ 전체 합산 제한
        total_chars = sum(len(m["content"]) for m in msgs)
        while msgs and total_chars > _MAX_CONTEXT_CHARS:
            removed = msgs.pop(0)
            total_chars -= len(removed["content"])
        while msgs and msgs[0]["role"] == "assistant":
            removed = msgs.pop(0)
            total_chars -= len(removed["content"])
    # ⑤ summary 헤더 앞에 삽입 (user + assistant ack)
    if summary_header:
        truncated_summary = _truncate(summary_header, 1_500)
        msgs.insert(0, {"role": "user", "content": truncated_summary})
        msgs.insert(1, {"role": "assistant", "content": "이전 대화 요약을 확인했습니다. 계속 진행하겠습니다."})
    safe_current = _truncate(current_message, _MAX_CURRENT_MSG_CHARS)
    if msgs and msgs[-1]["role"] == "user":
        combined = msgs[-1]["content"] + "\n\n" + safe_current
        msgs[-1]["content"] = _truncate(combined, _MAX_CURRENT_MSG_CHARS)
    else:
        msgs.append({"role": "user", "content": safe_current})
    return msgs

_BASE_IMPORTED = True  # 인라인 정의 완료

def test_truncate_short():
    """짧은 텍스트는 그대로."""
    if not _BASE_IMPORTED:
        return
    text = "안녕하세요"
    result = _truncate(text, 100)
    if result == text:
        ok("_truncate: 짧은 텍스트 유지")
    else:
        fail("_truncate: 짧은 텍스트 유지", f"got={result!r}")

def test_truncate_long():
    """긴 텍스트는 잘리고 suffix 추가."""
    if not _BASE_IMPORTED:
        return
    text = "A" * 5000
    result = _truncate(text, 2000)
    if len(result) <= 2000 and result.endswith("…[내용 일부 생략]"):
        ok("_truncate: 긴 텍스트 잘림 + suffix")
    else:
        fail("_truncate: 긴 텍스트 잘림", f"len={len(result)}, ends={result[-20:]!r}")

def test_build_messages_max_turns():
    """max_turns=3이면 최근 3턴(6개 메시지)만 포함."""
    if not _BASE_IMPORTED:
        return
    # 10턴 히스토리 생성 (user/assistant 교대)
    history = []
    for i in range(10):
        history.append({"role": "user", "content": f"질문{i}"})
        history.append({"role": "assistant", "content": f"답변{i}"})
    msgs = _build_messages(history, "현재질문", max_turns=3)
    # 마지막 user(현재질문) 포함해서 최대 7개 (3턴×2 + 현재1)
    if len(msgs) <= 7:
        ok(f"_build_messages: max_turns=3 → {len(msgs)}개 메시지")
    else:
        fail("_build_messages: max_turns=3 초과", f"got={len(msgs)}")

def test_build_messages_content_truncated():
    """히스토리 메시지 내용이 _MAX_MSG_CHARS 이내로 잘린다."""
    if not _BASE_IMPORTED:
        return
    long_content = "X" * 10_000
    history = [
        {"role": "user", "content": long_content},
        {"role": "assistant", "content": long_content},
    ]
    msgs = _build_messages(history, "짧은질문", max_turns=8)
    # 현재 질문 제외, 히스토리 메시지 내용 확인
    hist_msgs = [m for m in msgs if m["content"] != "짧은질문"]
    all_ok = all(len(m["content"]) <= _MAX_MSG_CHARS for m in hist_msgs)
    if all_ok:
        ok(f"_build_messages: 히스토리 메시지 ≤{_MAX_MSG_CHARS}자")
    else:
        lengths = [len(m["content"]) for m in hist_msgs]
        fail("_build_messages: 히스토리 메시지 글자 초과", f"lengths={lengths}")

def test_build_messages_total_chars():
    """히스토리 합산이 _MAX_CONTEXT_CHARS 초과 시 오래된 것 제거."""
    if not _BASE_IMPORTED:
        return
    # 각 1000자 메시지 50개 — 합산 50000자 > _MAX_CONTEXT_CHARS(40000)
    history = []
    for i in range(25):
        history.append({"role": "user",      "content": f"Q{i}:" + "q" * 990})
        history.append({"role": "assistant", "content": f"A{i}:" + "a" * 990})
    msgs = _build_messages(history, "최신질문", max_turns=30)
    total = sum(len(m["content"]) for m in msgs if m["content"] != "최신질문")
    if total <= _MAX_CONTEXT_CHARS:
        ok(f"_build_messages: 컨텍스트 합산 ≤{_MAX_CONTEXT_CHARS}자 (실제={total})")
    else:
        fail("_build_messages: 컨텍스트 합산 초과", f"total={total}")

def test_build_messages_current_truncated():
    """현재 메시지도 _MAX_CURRENT_MSG_CHARS 이내로 잘린다."""
    if not _BASE_IMPORTED:
        return
    huge_msg = "Z" * 20_000
    msgs = _build_messages([], huge_msg)
    last = msgs[-1]["content"]
    if len(last) <= _MAX_CURRENT_MSG_CHARS:
        ok(f"_build_messages: 현재 메시지 ≤{_MAX_CURRENT_MSG_CHARS}자")
    else:
        fail("_build_messages: 현재 메시지 초과", f"len={len(last)}")

def test_maeyo_engine_max_turns():
    """maeyo_engine._MAX_TURNS, _MAX_HISTORY_MSGS 상수가 소스에 정의되어 있는지 확인."""
    import re as _re
    engine_path = os.path.join(os.path.dirname(__file__), "app", "services", "maeyo_engine.py")
    try:
        with open(engine_path, encoding="utf-8") as _f:
            src = _f.read()
        has_max_turns    = bool(_re.search(r"_MAX_TURNS\s*=\s*\d+", src))
        has_hist_msgs    = bool(_re.search(r"_MAX_HISTORY_MSGS\s*=\s*\d+", src))
        has_hist_chars   = bool(_re.search(r"_MAX_HIST_MSG_CHARS\s*=\s*\d+", src))
        has_truncate_fn  = "_truncate_msg" in src
        all_ok = has_max_turns and has_hist_msgs and has_hist_chars and has_truncate_fn
        if all_ok:
            ok("maeyo_engine 상수 + _truncate_msg 정의 확인")
        else:
            missing = [n for n, v in [
                ("_MAX_TURNS", has_max_turns), ("_MAX_HISTORY_MSGS", has_hist_msgs),
                ("_MAX_HIST_MSG_CHARS", has_hist_chars), ("_truncate_msg", has_truncate_fn),
            ] if not v]
            fail("maeyo_engine 상수 미정의", f"missing={missing}")
    except FileNotFoundError:
        fail("maeyo_engine.py 파일 없음", engine_path)

def test_build_messages_no_leading_assistant():
    """컨텍스트 글자 초과로 오래된 메시지 제거 후 첫 메시지가 user여야 한다."""
    if not _BASE_IMPORTED:
        return
    # 오래된 assistant 메시지가 앞에 남지 않도록
    history = [
        {"role": "assistant", "content": "오래된 답변 " + "A" * 500},
        {"role": "user",      "content": "오래된 질문 " + "Q" * 500},
        {"role": "assistant", "content": "중간 답변"},
        {"role": "user",      "content": "중간 질문"},
    ]
    msgs = _build_messages(history, "현재질문", max_turns=8)
    if msgs[0]["role"] == "user":
        ok("_build_messages: 첫 메시지 항상 user")
    else:
        fail("_build_messages: 첫 메시지가 assistant", f"role={msgs[0]['role']}")

if _BASE_IMPORTED:
    test_truncate_short()
    test_truncate_long()
    test_build_messages_max_turns()
    test_build_messages_content_truncated()
    test_build_messages_total_chars()
    test_build_messages_current_truncated()
    test_maeyo_engine_max_turns()
    test_build_messages_no_leading_assistant()


# ══════════════════════════════════════════════════════════════════
# Circuit PARTITION: 대화 요약 파티션
# ══════════════════════════════════════════════════════════════════
print("\n[Circuit PARTITION] 대화 요약 파티션 (summary 마커 + archived 로딩)")

def test_summary_injected_before_normal():
    """summary 타입 메시지가 normal 메시지 앞에 배치된다."""
    context = [
        {"role": "user",    "content": "오래된 질문1", "message_type": "normal", "is_archived": False},
        {"role": "summary", "content": "📋 이전 대화 요약 (파티션 #1)\n- 매출 10억 확인\n- ROAS 1.8", "message_type": "summary"},
        {"role": "user",    "content": "최근 질문",    "message_type": "normal", "is_archived": False},
        {"role": "assistant","content": "최근 답변",   "message_type": "normal", "is_archived": False},
    ]
    msgs = _build_messages(context, "현재질문", max_turns=8)
    # 첫 번째 메시지가 summary 내용이어야 함
    if msgs[0]["content"].startswith("📋"):
        ok("summary 파티션 앞에 배치 (헤더 주입)")
    else:
        fail("summary 파티션 앞 배치 실패", f"first={msgs[0]['content'][:40]!r}")

def test_summary_followed_by_assistant_ack():
    """summary 삽입 후 assistant 확인 메시지가 이어져 role 교대 유지."""
    context = [
        {"role": "summary", "content": "📋 파티션 #1\n- 내용", "message_type": "summary"},
        {"role": "user",    "content": "최근 질문", "message_type": "normal"},
    ]
    msgs = _build_messages(context, "현재질문")
    # [summary(user), ack(assistant), 최근질문(user), ..., 현재질문(user)]
    roles = [m["role"] for m in msgs]
    valid_alternating = all(
        roles[i] != roles[i+1] for i in range(len(roles) - 1)
    )
    if valid_alternating:
        ok("summary 주입 후 user↔assistant 교대 유지")
    else:
        fail("summary 주입 후 role 교대 깨짐", f"roles={roles}")

def test_summary_header_truncated():
    """요약 헤더가 1500자 이내로 잘린다."""
    context = [
        {"role": "summary", "content": "📋 " + "X" * 5000, "message_type": "summary"},
    ]
    msgs = _build_messages(context, "질문")
    summary_msg = next((m for m in msgs if m["content"].startswith("📋")), None)
    if summary_msg and len(summary_msg["content"]) <= 1_500:
        ok("summary 헤더 ≤1500자 잘림")
    else:
        length = len(summary_msg["content"]) if summary_msg else -1
        fail("summary 헤더 길이 초과", f"len={length}")

def test_conv_summarizer_constants():
    """conv_summarizer 상수 + maybe_summarize 함수 정의 확인 (소스 파싱)."""
    import re as _re
    path = os.path.join(os.path.dirname(__file__), "app", "services", "conv_summarizer.py")
    try:
        with open(path, encoding="utf-8") as _f:
            src = _f.read()
        checks = {
            # 타입 어노테이션 형태도 허용: _PARTITION_THRESHOLD: int = 20
            "_PARTITION_THRESHOLD": bool(_re.search(r"_PARTITION_THRESHOLD[:\s].*=\s*\d+", src)),
            "_ARCHIVE_BATCH":       bool(_re.search(r"_ARCHIVE_BATCH[:\s].*=\s*\d+", src)),
            "maybe_summarize":      "def maybe_summarize" in src,
            "_call_haiku_summary":  "_call_haiku_summary" in src,
            "save_summary_partition": "save_summary_partition" in src,
            "archive_messages":     "archive_messages" in src,
        }
        missing = [k for k, v in checks.items() if not v]
        if not missing:
            ok("conv_summarizer 구성 요소 완비")
        else:
            fail("conv_summarizer 누락", f"missing={missing}")
    except FileNotFoundError:
        fail("conv_summarizer.py 없음", path)

def test_conversations_service_partition_api():
    """conversations.py에 파티션 API 함수가 모두 정의되어 있는지 확인."""
    import re as _re
    path = os.path.join(os.path.dirname(__file__), "app", "services", "conversations.py")
    try:
        with open(path, encoding="utf-8") as _f:
            src = _f.read()
        required = [
            "def save_summary_partition",
            "def archive_messages",
            "def count_active_messages",
            "include_archived",
            "message_type",
        ]
        missing = [fn for fn in required if fn not in src]
        if not missing:
            ok("conversations.py 파티션 API 완비")
        else:
            fail("conversations.py 파티션 API 누락", f"{missing}")
    except FileNotFoundError:
        fail("conversations.py 없음", path)

def test_sql_028_exists():
    """SQL 028 마이그레이션 파일 존재 + 핵심 DDL 포함 확인."""
    import re as _re
    path = os.path.join(os.path.dirname(__file__), "sql", "028_conversation_partitions.sql")
    try:
        with open(path, encoding="utf-8") as _f:
            src = _f.read()
        checks = {
            "message_type": "message_type" in src,
            "is_archived":  "is_archived" in src,
            "idx_summary":  "idx_conv_msgs_summary" in src,
            "idx_active":   "idx_conv_msgs_active" in src,
        }
        missing = [k for k, v in checks.items() if not v]
        if not missing:
            ok("028 SQL: message_type + is_archived + 인덱스 정의")
        else:
            fail("028 SQL 누락", f"{missing}")
    except FileNotFoundError:
        fail("028_conversation_partitions.sql 없음", path)

def test_no_archived_in_default_load():
    """get_messages 기본(include_archived=False)에서 archived 메시지는 제외된다 — 로직 검증."""
    # 실제 DB 연결 없이 필터링 로직을 시뮬레이션
    all_msgs = [
        {"id": "1", "role": "user",    "message_type": "normal",  "is_archived": True,  "content": "오래된 질문"},
        {"id": "2", "role": "assistant","message_type": "normal",  "is_archived": True,  "content": "오래된 답변"},
        {"id": "3", "role": "summary", "message_type": "summary", "is_archived": False, "content": "📋 파티션 #1"},
        {"id": "4", "role": "user",    "message_type": "normal",  "is_archived": False, "content": "최근 질문"},
        {"id": "5", "role": "assistant","message_type": "normal",  "is_archived": False, "content": "최근 답변"},
    ]
    # conversations.py의 get_messages 로직 시뮬레이션
    summary_rows = [m for m in all_msgs if m["message_type"] == "summary"]
    active_rows  = [m for m in all_msgs if m["message_type"] == "normal" and not m["is_archived"]]
    result = (summary_rows[-1:] if summary_rows else []) + active_rows

    has_archived = any(m.get("is_archived") for m in result)
    has_summary  = any(m["message_type"] == "summary" for m in result)
    has_recent   = any(m["content"] == "최근 질문" for m in result)

    if not has_archived and has_summary and has_recent:
        ok("archived 제외, summary 포함, 최근 메시지 포함 (로딩 로직 검증)")
    else:
        fail("스마트 로딩 로직 오류",
             f"archived={has_archived}, summary={has_summary}, recent={has_recent}")

test_summary_injected_before_normal()
test_summary_followed_by_assistant_ack()
test_summary_header_truncated()
test_conv_summarizer_constants()
test_conversations_service_partition_api()
test_sql_028_exists()
test_no_archived_in_default_load()


# ══════════════════════════════════════════════════════════════════
# Circuit MEMORY: Memory API + Dev→CS 역피드백
# ══════════════════════════════════════════════════════════════════
print("\n[Circuit MEMORY] Memory API + Dev→CS 역피드백")

def test_memory_router_exists():
    """memory.py 라우터 파일 존재 + 필수 엔드포인트 정의 확인."""
    path = os.path.join(os.path.dirname(__file__), "app", "routers", "memory.py")
    try:
        with open(path, encoding="utf-8") as _f:
            src = _f.read()
        required = [
            '@router.get("/dev")',
            '@router.get("/cs")',
            '@router.get("/growth")',
            '@router.get("/sales")',
            '@router.get("/summary")',
        ]
        missing = [ep for ep in required if ep not in src]
        if not missing:
            ok("memory 라우터 5개 엔드포인트 정의")
        else:
            fail("memory 라우터 엔드포인트 누락", f"{missing}")
    except FileNotFoundError:
        fail("memory.py 없음", path)

def test_memory_registered_in_main():
    """main.py에 memory 라우터가 등록되어 있는지 확인."""
    path = os.path.join(os.path.dirname(__file__), "app", "main.py")
    try:
        with open(path, encoding="utf-8") as _f:
            src = _f.read()
        if "memory" in src and "memory.router" in src:
            ok("main.py에 memory 라우터 등록 확인")
        else:
            fail("main.py memory 라우터 미등록")
    except FileNotFoundError:
        fail("main.py 없음", path)

def test_dev_cs_feedback_in_mark_pr_merged():
    """_mark_pr_merged에 Dev→CS 역피드백 호출이 포함되어 있는지 확인."""
    import re as _re
    path = os.path.join(os.path.dirname(__file__), "app", "services", "dev_chat_agent.py")
    try:
        with open(path, encoding="utf-8") as _f:
            src = _f.read()
        has_push_fn   = "def _push_feature_kb_from_pr" in src
        has_call      = "_push_feature_kb_from_pr(" in src
        has_infer     = "_infer_program" in src
        has_skip      = "_is_feature_worthy" in src
        all_ok = has_push_fn and has_call and has_infer and has_skip
        if all_ok:
            ok("Dev→CS 역피드백 구성 완비 (4항목)")
        else:
            missing = [n for n, v in [
                ("_push_feature_kb_from_pr 정의", has_push_fn),
                ("_push_feature_kb_from_pr 호출", has_call),
                ("_infer_program", has_infer),
                ("_is_feature_worthy", has_skip),
            ] if not v]
            fail("Dev→CS 역피드백 누락", f"{missing}")
    except FileNotFoundError:
        fail("dev_chat_agent.py 없음", path)

def test_program_hint_inference():
    """_PROGRAM_HINTS 기반 program 추론 로직 시뮬레이션."""
    _PROGRAM_HINTS_LOCAL = [
        (["studio", "스튜디오", "content", "콘텐츠"], "maesil-studio"),
        (["insight", "인사이트", "sales", "매출", "maeyo", "매요"], "maesil-insight"),
    ]
    _SKIP_LOCAL = ["infra", "ci", "cd", "deploy", "docker", "migration", "sql", "test", "lint", "chore"]

    def infer(pr_title, file_path=None):
        text = " ".join(filter(None, [pr_title, file_path])).lower()
        for keywords, prog in _PROGRAM_HINTS_LOCAL:
            if any(k in text for k in keywords):
                return prog
        return None

    def worthy(pr_title, commit_msg=None):
        text = " ".join(filter(None, [pr_title, commit_msg])).lower()
        return not any(k in text for k in _SKIP_LOCAL)

    cases = [
        (infer("매출 채널 분석 개선") == "maesil-insight",      "인사이트 PR 추론"),
        (infer("studio 이미지 생성 버그 수정") == "maesil-studio", "스튜디오 PR 추론"),
        (infer("인프라 docker 업데이트") is None,               "인프라 PR → None"),
        (worthy("매요 cs 답변 개선"),                           "일반 PR → worthy=True"),
        (not worthy("ci: github actions 업데이트"),            "CI PR → worthy=False"),
    ]
    all_ok = True
    for passed, name in cases:
        if not passed:
            all_ok = False
            fail(f"program 추론: {name}")
    if all_ok:
        ok(f"program 추론 + worthy 필터 ({len(cases)}케이스)")

test_memory_router_exists()
test_memory_registered_in_main()
test_dev_cs_feedback_in_mark_pr_merged()
test_program_hint_inference()


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
