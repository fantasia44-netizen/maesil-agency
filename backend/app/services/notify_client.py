"""
notify_client — maesil-insight의 알림 게이트웨이(/api/v1/notify/email) 호출.

agency는 자체 메일 인프라를 두지 않고 maesil-insight를 통해 발송한다.
필요한 시크릿:
  - maesil_insight_url    (예: https://maesil-insight.onrender.com)
  - harness_api_token     (Bearer 토큰, maesil-insight HARNESS_API_TOKEN 과 동일)
"""
from __future__ import annotations

import logging

import httpx

from app.services.secrets import get_secret

logger = logging.getLogger(__name__)

SOURCE = "maesil-agency"


class NotifyError(RuntimeError):
    pass


def send_email(to: str, subject: str, html: str, source: str = SOURCE, timeout: float = 30.0) -> dict:
    """maesil-insight 메일 게이트웨이로 단일 수신자 메일 발송.

    Returns: { ok: bool, id: str | None, status: int, error: str | None }
    """
    base_url = get_secret("maesil_insight_url")
    token = get_secret("harness_api_token")

    if not base_url:
        return {"ok": False, "status": 0, "error": "maesil_insight_url 미설정 (/settings에서 등록)"}
    if not token:
        return {"ok": False, "status": 0, "error": "harness_api_token 미설정 (/settings에서 등록)"}

    url = base_url.rstrip("/") + "/api/v1/notify/email"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {"to": to, "subject": subject, "html": html, "source": source}

    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=timeout)
    except Exception as e:
        logger.exception("notify_client: 요청 실패")
        return {"ok": False, "status": 0, "error": f"request failed: {e}"}

    if resp.status_code == 200:
        try:
            body = resp.json()
            return {"ok": bool(body.get("ok", True)), "id": body.get("id"), "status": 200, "error": None}
        except Exception:
            return {"ok": True, "id": None, "status": 200, "error": None}

    err_text = resp.text[:500]
    logger.warning("notify_client: %s — %s", resp.status_code, err_text)
    return {"ok": False, "status": resp.status_code, "error": err_text}
