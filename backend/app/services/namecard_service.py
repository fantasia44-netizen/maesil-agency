"""
namecard_service — 명함 사진 → Claude 비전으로 정보 추출 + 회사 요약 메모.

영업비서 '수집' 소스. 사진 한 장 업로드하면 이름·회사·직함·연락처를 구조화 추출하고,
회사/브랜드에 대한 짧은 메모를 생성한다. 한글·영문·현지어 명함 모두 처리.
"""
from __future__ import annotations

import base64
import json
import logging

logger = logging.getLogger(__name__)

_SUPPORTED_MEDIA = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
}

_EXTRACT_PROMPT = """이 이미지는 명함(business card)입니다. 명함에서 정보를 추출해 JSON으로만 답하세요.

규칙:
- 값이 없으면 빈 문자열 "". 절대 지어내지 마세요.
- 이메일/전화는 명함에 적힌 그대로. 전화는 대표번호·휴대폰 중 연락 가능한 것 우선.
- company_name은 회사/브랜드명, title은 직함(대표/팀장/과장 등).
- ai_memo: 회사명·업종으로 유추 가능한 1~2문장 한국어 메모(무슨 회사로 보이는지, 영업 관점 힌트). 과장·허위 금지, 모르면 "".

{
  "person_name": "",
  "company_name": "",
  "title": "",
  "email": "",
  "phone": "",
  "address": "",
  "website": "",
  "ai_memo": ""
}"""


def _anthropic_key(tenant_id: str | None) -> str:
    from app.services.secrets import get_tenant_secret
    return get_tenant_secret(tenant_id, "anthropic_api_key") or ""


def extract_namecard(image_bytes: bytes, media_type: str, tenant_id: str | None) -> dict:
    """명함 이미지 → 구조화 추출 dict. 실패 시 {'error': ...}."""
    if media_type not in _SUPPORTED_MEDIA:
        return {"error": f"지원하지 않는 이미지 형식: {media_type}"}
    if not image_bytes:
        return {"error": "빈 이미지"}
    if len(image_bytes) > 5 * 1024 * 1024:
        return {"error": "이미지가 너무 큽니다(5MB 이하)"}

    key = _anthropic_key(tenant_id)
    if not key:
        return {"error": "anthropic_api_key 미설정"}

    # jpg → jpeg 정규화 (Claude API media_type 규격)
    mt = "image/jpeg" if media_type == "image/jpg" else media_type
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",  # 비전 지원 + 저비용
            max_tokens=600,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {
                        "type": "base64", "media_type": mt, "data": b64,
                    }},
                    {"type": "text", "text": _EXTRACT_PROMPT},
                ],
            }],
        )
        text = (msg.content[0].text or "").strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text)
    except Exception as e:
        logger.warning("[namecard] 추출 실패: %s", e)
        return {"error": f"추출 실패: {e}"}

    # 표준 필드만 통과 + 문자열 정리
    fields = ("person_name", "company_name", "title", "email",
              "phone", "address", "website", "ai_memo")
    out = {f: (str(data.get(f) or "").strip()) for f in fields}
    out["raw_extracted"] = data
    return out
