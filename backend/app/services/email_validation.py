"""
email_validation — 아웃리치 이메일 주소 검증.

배경(2026-07-10): 유튜브 설명란 정규식 추출이 `th@compounds.with`,
`alibabacocre@e.com` 같은 비실재 주소를 리드에 저장 → Gmail 발송 후
NXDOMAIN 반송(bounce) 발생. 반송률은 발신 도메인 평판을 직접 깎으므로
(정상 메일까지 스팸함행) 3단 방어:

  1) is_plausible_email  — 문법 + TLD 화이트리스트 (추출 시, 네트워크 없음)
  2) domain_accepts_mail — DNS-over-HTTPS(Google)로 MX/A 존재 확인 (발송 직전, 캐시)
  3) validate_email_for_send — 위 둘 결합. False면 발송하지 말 것.

판단 원칙: '확실히 불가능'할 때만 False (NXDOMAIN, 엉터리 TLD).
DNS 일시 장애·타임아웃은 True(관대) — 멀쩡한 리드를 네트워크 사정으로 버리지 않는다.
"""
from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)

_SYNTAX_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@([a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)+)$")

# 실사용 TLD 화이트리스트 — 한국/글로벌 비즈니스 메일에서 실제로 쓰이는 것 위주.
# `.with` 같은 비-TLD 오추출을 걸러내는 게 목적이므로 완전망라가 아니라 보수적 통과 목록.
_TLD_ALLOW = {
    # 글로벌 일반
    "com", "net", "org", "info", "biz", "pro", "name", "mobi", "edu", "gov", "mil", "int",
    # 국가
    "kr", "jp", "cn", "tw", "hk", "sg", "vn", "th", "id", "my", "ph", "in", "us", "uk",
    "de", "fr", "nl", "es", "it", "se", "no", "ch", "at", "be", "pl", "ru", "br", "mx",
    "ca", "au", "nz", "eu", "asia", "io", "co", "me", "cc", "tv", "ai", "gg", "to", "ly", "im", "is",
    # 신규 gTLD (비즈니스에서 실사용되는 것)
    "dev", "app", "xyz", "shop", "store", "site", "online", "cloud", "tech", "space",
    "live", "life", "world", "today", "email", "group", "company", "team", "zone",
    "plus", "club", "fun", "run", "kim", "studio", "design", "agency", "media",
    "marketing", "digital", "network", "systems", "solutions", "services", "center",
    "academy", "school", "works", "tools", "page", "link", "blog", "wiki", "news",
}

# 도메인 → 발송가능 여부 캐시 (프로세스 생명주기 동안 유지)
_domain_cache: dict[str, bool] = {}


def is_plausible_email(email: str | None) -> bool:
    """문법 + TLD 검증 (네트워크 없음). 추출 단계용."""
    if not email or len(email) > 254:
        return False
    m = _SYNTAX_RE.match(email.strip())
    if not m:
        return False
    domain = m.group(1).lower()
    if ".." in domain or domain.startswith("-") or domain.endswith("-"):
        return False
    tld = domain.rsplit(".", 1)[-1]
    return tld in _TLD_ALLOW


def _doh_query(domain: str, rtype: str, timeout: float) -> dict | None:
    import httpx
    r = httpx.get(
        "https://dns.google/resolve",
        params={"name": domain, "type": rtype},
        timeout=timeout,
    )
    r.raise_for_status()
    return r.json()


def domain_accepts_mail(domain: str, timeout: float = 5.0) -> bool:
    """도메인이 메일을 받을 수 있는지 DNS로 확인 (MX → A 폴백). 결과 캐시.

    False = 확실히 불가(NXDOMAIN 또는 MX/A 모두 없음). 조회 실패 시 True(관대).
    """
    domain = (domain or "").strip().lower()
    if not domain:
        return False
    if domain in _domain_cache:
        return _domain_cache[domain]
    ok = True
    try:
        mx = _doh_query(domain, "MX", timeout)
        if mx is not None and mx.get("Status") == 3:          # NXDOMAIN
            ok = False
        elif mx is not None and mx.get("Status") == 0 and mx.get("Answer"):
            ok = True
        else:
            # MX 없음/기타 → A 레코드 폴백
            a = _doh_query(domain, "A", timeout)
            if a is not None and a.get("Status") == 3:
                ok = False
            elif a is not None and a.get("Status") == 0:
                ok = bool(a.get("Answer"))
            else:
                ok = True
    except Exception as e:
        logger.debug("DoH 조회 실패 [%s]: %s — 관대 통과", domain, e)
        ok = True
    _domain_cache[domain] = ok
    return ok


def validate_email_for_send(email: str | None) -> tuple[bool, str]:
    """발송 직전 최종 검증. (ok, 사유) 반환 — ok=False면 발송 금지."""
    if not is_plausible_email(email):
        return False, "invalid_format_or_tld"
    domain = email.strip().rsplit("@", 1)[-1].lower()
    if not domain_accepts_mail(domain):
        return False, "domain_not_found"
    return True, "ok"
