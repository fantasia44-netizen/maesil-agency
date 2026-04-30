"""
매요(Maeyo) CS 엔진 — maesil-agency 중앙 버전

L1/L2/L3 레이어:
  L1: 호출 측(프로그램)이 user_context 구성해서 전달
  L2: DB(maeyo_l2_scripts) 매칭 — is_verified 우선, 트리거 길이순 (비용 0)
  L3: Claude Haiku fallback — verified 예시 few-shot 주입

DB에 L2 스크립트가 없으면 빈 리스트로 동작 (L3 전용 모드).
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

logger = logging.getLogger(__name__)

_HAIKU_MODEL = "claude-haiku-4-5-20251001"

# ─────────────────────────────────────────────────────────────────
# 범위 밖 거절 패턴 (공통)
# ─────────────────────────────────────────────────────────────────
_OUT_OF_SCOPE: list[tuple[str, str]] = [
    (r"경쟁 서비스|다른 서비스 추천|장사왕|셀러노트", "거절"),
    (r"광고 대신 운영|대신 운영해", "거절"),
    (r"세금 신고|세무사", "세무사"),
    (r"주식 투자|투자해도", "거절"),
    (r"다른 사람 매출|타인 매출", "거절_개인정보"),
    (r"채용|직원 채용", "거절"),
    (r"유튜브|youtube|인스타|instagram|틱톡|tiktok|블로그|blog|카카오스토어|11번가|지마켓|옥션|위메프|티몬|올리브영|무신사", "타플랫폼"),
    (r"영상 편집|콘텐츠 제작|SNS 마케팅|팔로워|구독자|조회수|숏폼", "타플랫폼"),
    (r"카페24|고도몰|메이크샵|아임웹|쇼피파이|shopify", "타플랫폼"),
]

_OUT_OF_SCOPE_REPLIES: dict[str, dict] = {
    "거절": {
        "emotion": "doubt",
        "message": "죄송해요, 그 부분은 제 역할 밖이에요.\n서비스 사용에 대한 질문은 뭐든 도와드릴 수 있어요.",
        "action": None, "hint": None,
    },
    "세무사": {
        "emotion": "thinking",
        "message": "세금 신고는 전문 세무사에게 문의해 주세요.\n저는 서비스 내 수익 분석만 도와드릴 수 있어요.",
        "action": None, "hint": None,
    },
    "거절_개인정보": {
        "emotion": "warning",
        "message": "다른 사용자의 데이터는 볼 수 없습니다.\n개인정보 보호 정책에 따라 철저히 분리되어 있어요.",
        "action": None, "hint": None,
    },
    "타플랫폼": {
        "emotion": "doubt",
        "message": "죄송해요, 저는 이 서비스 관련 질문만 도와드릴 수 있어요.\n다른 플랫폼 운영은 제 역할 밖이에요.",
        "action": None, "hint": None,
    },
}

FALLBACK_REPLY: dict = {
    "emotion": "thinking",
    "message": "죄송해요, 지금 답변을 드리기 어려운 상황이에요.\n잠시 후 다시 시도해 주세요.",
    "action": None, "hint": None,
}

# ─────────────────────────────────────────────────────────────────
# L2 스크립트 — DB 로드 (60초 캐시, 프로그램별)
# ─────────────────────────────────────────────────────────────────
_l2_cache: dict[str, list[dict]] = {}
_l2_cache_ts: dict[str, float] = {}
_L2_CACHE_TTL = 60.0


def _load_l2_scripts(program: str = "maesil-insight") -> list[dict]:
    """DB에서 L2 스크립트 로드 (TTL 캐시, 프로그램별).

    정렬 우선순위:
      1) is_verified=True 스크립트 먼저 (오답 방지)
      2) 각 스크립트 내 트리거: 길이 내림차순 (구체적인 것 우선 매칭)
    """
    global _l2_cache, _l2_cache_ts
    now = time.time()
    if now - _l2_cache_ts.get(program, 0.0) < _L2_CACHE_TTL and _l2_cache.get(program):
        return _l2_cache[program]
    try:
        from app.db.maesil_total_client import get_maesil_total_client
        resp = (
            get_maesil_total_client()
            .schema("agent_work")
            .table("maeyo_l2_scripts")
            .select("id,triggers,keywords,emotion,message,action,hint,tts_key,is_verified")
            .eq("is_active", True)
            .in_("program", [program, "common"])
            .order("sort_order")
            .execute()
        )
        rows = resp.data or []
        scripts: list[dict] = []
        for r in rows:
            triggers = r.get("triggers") or []
            # 트리거를 길이 내림차순 정렬 → 더 구체적인 트리거가 먼저 매칭
            triggers_sorted = sorted(triggers, key=lambda t: len(str(t)), reverse=True)
            scripts.append({
                "id":          r["id"],
                "triggers":    triggers_sorted,
                "keywords":    r.get("keywords") or [],
                "emotion":     r.get("emotion", "thinking"),
                "message":     r.get("message", ""),
                "action":      r.get("action"),
                "hint":        r.get("hint"),
                "tts_key":     r.get("tts_key"),
                "is_verified": bool(r.get("is_verified", False)),
            })
        # verified 스크립트를 앞에 배치 (동일 트리거 충돌 시 검증된 것 우선)
        verified   = [s for s in scripts if s["is_verified"]]
        unverified = [s for s in scripts if not s["is_verified"]]
        scripts = verified + unverified

        _l2_cache[program] = scripts
        _l2_cache_ts[program] = now
        logger.debug(
            "[maeyo] L2 loaded '%s': total=%d verified=%d",
            program, len(scripts), len(verified),
        )
    except Exception as e:
        logger.warning("[maeyo] L2 DB 로드 실패 (캐시 유지) program=%s: %s", program, e)
    return _l2_cache.get(program, [])


def invalidate_l2_cache() -> None:
    """L2 스크립트 캐시 강제 무효화 (스크립트 편집/동기화 후 호출)."""
    global _l2_cache_ts
    _l2_cache_ts.clear()


# ─────────────────────────────────────────────────────────────────
# 매칭 유틸
# ─────────────────────────────────────────────────────────────────
def _normalize(text: str) -> str:
    return re.sub(r"[^\w가-힣]", "", text).lower()


def _check_out_of_scope(message: str) -> dict | None:
    for pattern, reply_key in _OUT_OF_SCOPE:
        if re.search(pattern, message, re.I):
            return _OUT_OF_SCOPE_REPLIES.get(reply_key, _OUT_OF_SCOPE_REPLIES["거절"])
    return None


def _match_l2(message: str, scripts: list[dict]) -> dict | None:
    """스크립트 리스트에서 메시지와 매칭되는 첫 번째 스크립트 반환.

    트리거는 이미 길이 내림차순, verified 스크립트가 앞에 배치됨.
    """
    norm_msg = _normalize(message)
    for script in scripts:
        for trigger in (script.get("triggers") or []):
            norm_t = _normalize(str(trigger))
            if norm_t and (norm_t in norm_msg or norm_msg == norm_t):
                return script
        kws = script.get("keywords") or []
        if kws and all(_normalize(str(k)) in norm_msg for k in kws):
            return script
    return None


# ─────────────────────────────────────────────────────────────────
# L3 Claude Haiku 호출
# ─────────────────────────────────────────────────────────────────
def _build_system_prompt(
    user_context: dict,
    program: str,
    verified_examples: list[dict] | None = None,
) -> str:
    plan    = user_context.get("plan_type", "free")
    company = user_context.get("company_name", "")
    program_display = {
        "maesil-insight": "매실 인사이트(Maesil Insight)",
        "maesil-studio":  "매실 스튜디오(Maesil Studio)",
    }.get(program, program)

    channels = user_context.get("connected_channels") or []
    has_coupang_ad = bool(user_context.get("has_coupang_ad"))
    has_naver_ad   = bool(user_context.get("has_naver_ad"))

    if channels:
        ch_status = "연동된 채널: " + ", ".join(channels)
    else:
        ch_status = "연동된 채널: 없음 (아직 채널 연동 전)"

    ad_lines = []
    has_naver   = any("스마트스토어" in c or ("네이버" in c and "광고" not in c) for c in channels)
    has_coupang = any("쿠팡" in c and "광고" not in c for c in channels)
    if has_naver_ad:
        ad_lines.append("네이버 광고: API 연동됨")
    elif has_naver:
        ad_lines.append("네이버 광고: 미연동 (광고센터 SA API 별도 신청 필요)")
    if has_coupang:
        if has_coupang_ad:
            ad_lines.append("쿠팡 광고: 데이터 있음 (파일 업로드됨)")
        else:
            ad_lines.append("쿠팡 광고: 데이터 없음 (Wing 엑셀 다운로드 후 업로드 필요)")
    ad_status = "\n".join(ad_lines) if ad_lines else ""

    if not channels:
        guidance = "【안내 규칙】\n- 채널을 연동하지 않았다. 채널 연결하기를 최우선으로 안내해라."
    else:
        rules = ["【안내 규칙】", "- 이미 채널이 연동되어 있으므로 '채널을 연결하세요'라고 안내하지 마라."]
        if has_coupang and not has_coupang_ad:
            rules.append("- 쿠팡 광고 데이터가 없다. Wing → 광고관리 → 데이터 다운로드 → 파일 업로드 방법을 안내해라.")
        if has_naver and not has_naver_ad:
            rules.append("- 네이버 광고 API가 미연동. ads.naver.com → SA API 사용 관리에서 신청 필요.")
        guidance = "\n".join(rules)

    # 검증된 L2 대본에서 few-shot 예시 (최대 6개)
    example_block = ""
    if verified_examples:
        lines = ["【검증된 답변 스타일 (이 톤·형식으로 답해라)】"]
        for ex in verified_examples[:6]:
            triggers = ex.get("triggers") or []
            if not triggers:
                continue
            q = triggers[0]
            a = ex.get("message", "").replace("\n", " ")
            emotion = ex.get("emotion", "thinking")
            lines.append(f'Q: "{q}"')
            lines.append(f'A: {{"emotion":"{emotion}","message":"{a}","action":null,"hint":null}}')
        if len(lines) > 1:
            example_block = "\n".join(lines) + "\n\n"

    return f"""\
너는 {program_display}의 AI 도우미 '매요'야.
플랜: {plan} | 회사: {company}

【현재 사용자 상태】
{ch_status}
{ad_status}

{guidance}

【역할】
- {program_display} 서비스 사용법, 기능 안내
- 채널 API 연결 방법 안내
- 매출·수익 분석 관련 질문 답변
- 서비스 오류·에러 해결 안내

【절대 금지】
- 다른 플랫폼 안내 (유튜브, 인스타, 타 SaaS 등)
- 세금 신고, 법률, 투자 조언
- 경쟁 서비스 추천

{example_block}【응답 규칙】
- 반드시 아래 JSON만 반환 (다른 텍스트 금지)
- message: 2~3문장, 마크다운 기호(*#`~) 사용 금지, 이모지 금지
- emotion: love/welcome/thinking/doubt/warning/relief/exploration/wink/failure/satisfaction/data_control 중 하나

{{"emotion":"감정코드","message":"답변 메시지","action":{{"label":"버튼명","url":"/경로"}},"hint":"추가팁"}}
action과 hint가 없으면 null로.
"""


def _call_haiku(
    message: str,
    history: list[dict],
    user_context: dict,
    program: str,
    verified_examples: list[dict] | None = None,
) -> dict:
    import os
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        try:
            from app.services.secrets import get_secret
            api_key = get_secret("anthropic_api_key") or ""
        except Exception:
            pass
    if not api_key:
        return FALLBACK_REPLY

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        system_prompt = _build_system_prompt(user_context, program, verified_examples)

        # 최근 6개 메시지만 전달 (비용 절감 + 응답 속도)
        messages = list((history or [])[-6:])
        messages.append({"role": "user", "content": message})

        resp = client.messages.create(
            model=_HAIKU_MODEL,
            max_tokens=400,
            system=system_prompt,
            messages=messages,
        )
        text = resp.content[0].text.strip()
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
        text = re.sub(r"```\s*$", "", text, flags=re.MULTILINE).strip()
        try:
            parsed = json.loads(text)
            return {
                "emotion": parsed.get("emotion", "satisfaction"),
                "message": str(parsed.get("message", text))[:400],
                "action":  parsed.get("action"),
                "hint":    parsed.get("hint"),
            }
        except (json.JSONDecodeError, ValueError):
            return {"emotion": "satisfaction", "message": text[:400], "action": None, "hint": None}
    except Exception as e:
        logger.error("[maeyo] Haiku 오류: %s", e)
        return FALLBACK_REPLY


# ─────────────────────────────────────────────────────────────────
# 메인 처리 함수
# ─────────────────────────────────────────────────────────────────
_MAX_TURNS = 12  # 유저 발화 기준 최대 대화 턴


def process_message(
    message: str,
    history: list[dict] | None = None,
    user_context: dict | None = None,
    program: str = "maesil-insight",
    conversation_id: str | None = None,
) -> dict:
    """
    메시지 처리 메인 함수.

    Returns:
        {emotion, message, action, hint, layer, script_id}
        layer: 'l2' | 'l2.5' | 'l3' | 'fallback'
    """
    user_context = user_context or {}
    history = history or []

    # 대화 턴 제한 — 무한 대화 토큰 낭비 방지
    user_turns = sum(1 for m in history if m.get("role") == "user")
    if user_turns >= _MAX_TURNS:
        return {
            "emotion": "relief",
            "message": (
                "대화가 많이 길어졌네요. 더 정확한 답변을 위해 새 대화를 시작해 주세요.\n"
                "새 대화에서 이어서 질문하시면 더 빠르게 도와드릴게요."
            ),
            "action": None, "hint": None,
            "layer": "limit", "script_id": None,
        }

    # 범위 밖 거절
    oos = _check_out_of_scope(message)
    if oos:
        return {**oos, "layer": "l2", "script_id": None}

    # L2 스크립트 로드 (캐시) — verified 우선 정렬 포함
    scripts = _load_l2_scripts(program)

    # L2 FAQ 매칭
    script = _match_l2(message, scripts)
    if script:
        return {
            "emotion":   script.get("emotion", "thinking"),
            "message":   script.get("message", ""),
            "action":    script.get("action"),
            "hint":      script.get("hint"),
            "layer":     "l2",
            "script_id": script.get("id"),
        }

    # L2.5 — feature_docs 키워드 매칭 (dev 에이전트가 생성한 기능 설명)
    try:
        from app.services.feature_kb import lookup as _kb_lookup
        kb_hit = _kb_lookup(message, program)
        if kb_hit:
            return {
                "emotion":   kb_hit.get("emotion", "thinking"),
                "message":   kb_hit["answer"],
                "action":    None, "hint": None,
                "layer":     "l2.5", "script_id": None,
            }
    except Exception as e:
        logger.warning("[maeyo] feature_kb lookup 실패: %s", e)

    # L3 Haiku — verified 스크립트를 few-shot 예시로 전달
    verified = [s for s in scripts if s.get("is_verified")]
    result = _call_haiku(message, history, user_context, program, verified_examples=verified)
    result["layer"] = "l3"
    result["script_id"] = None

    # L3 응답 이후 사이드이펙트 (비동기 처리 불필요 — 단순 DB INSERT)
    try:
        from app.services.feature_kb import log_unanswered as _log_unanswered
        _log_unanswered(program, message, result.get("message", ""), conversation_id)
    except Exception as e:
        logger.warning("[maeyo] unanswered_log 적재 실패: %s", e)

    try:
        from app.services.feature_kb import detect_and_report_bug as _detect_bug
        _detect_bug(program, message, result.get("message", ""), conversation_id)
    except Exception as e:
        logger.warning("[maeyo] 버그 감지 실패: %s", e)

    return result
