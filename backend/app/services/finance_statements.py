"""finance_statements — 카드매출·카드매입·현금영수증·은행내역 엑셀 파서.

카드사/은행/홈택스 파일은 양식이 제각각 → 컬럼명 키워드 자동 매핑으로 흡수.
헤더 행: 날짜 계열 + (금액 계열 or 입출금 계열) 키워드가 함께 있는 행을 탐지.

카드/현금영수증 파일에 공급가액·부가세 컬럼이 없으면(승인금액만 있으면)
합계에서 10% 역산하고 vat_estimated=True 로 표시한다.
"""
from __future__ import annotations

import logging

from app.services.finance_hometax import (
    load_excel_rows, _safe_str, _safe_int, _normalize_date,
)

logger = logging.getLogger(__name__)

# 컬럼명 키워드 → 필드 매핑 (부분 일치, 왼쪽 우선)
_COLUMN_KEYWORDS: dict[str, list[str]] = {
    "tx_date":      ["거래일시", "거래일자", "승인일시", "승인일자", "매출일자",
                     "사용일자", "이용일자", "발행일자", "거래일", "일자"],
    "counterparty": ["가맹점명", "이용가맹점", "가맹점", "거래처", "적요",
                     "내용", "상호", "이용하신곳", "받는분", "보낸분"],
    "approval_no":  ["승인번호", "승인 번호"],
    "supply_amount": ["공급가액", "공급가"],
    "vat_amount":   ["부가세", "부가가치세", "세액"],
    "total_amount": ["합계금액", "승인금액", "이용금액", "매출금액", "거래금액",
                     "발행금액", "합계", "총금액"],
    "deposit":      ["입금액", "입금금액", "맡기신금액", "맡긴금액", "입금"],
    "withdrawal":   ["출금액", "출금금액", "찾으신금액", "찾은금액", "출금"],
}


def _map_header(header_vals: list[str]) -> dict[str, int]:
    """헤더 행 → {필드: 컬럼인덱스}. 키워드 부분일치, 이미 배정된 컬럼은 재사용 안 함."""
    mapping: dict[str, int] = {}
    used: set[int] = set()
    for field, keywords in _COLUMN_KEYWORDS.items():
        for kw in keywords:
            found = None
            for i, h in enumerate(header_vals):
                if i not in used and h and kw in h:
                    found = i
                    break
            if found is not None:
                mapping[field] = found
                used.add(found)
                break
    return mapping


def _find_statement_header(rows: list[list]) -> tuple[int, dict[str, int]] | None:
    """날짜 + (금액 or 입출금) 컬럼이 함께 잡히는 첫 행을 헤더로."""
    for i in range(min(15, len(rows))):
        vals = [_safe_str(v) for v in rows[i]]
        m = _map_header(vals)
        if "tx_date" in m and ("total_amount" in m or "deposit" in m
                               or "withdrawal" in m or "supply_amount" in m):
            return i, m
    return None


def parse_statement_excel(file_bytes: bytes, filename: str, kind: str) -> list[dict]:
    """카드/현금영수증/은행 엑셀 → finance_transactions insert용 dict 목록.

    kind: card_sales | card_purchase | cash_receipt | bank
    """
    rows = load_excel_rows(file_bytes, filename)
    found = _find_statement_header(rows)
    if not found:
        # 사용자가 매핑을 고칠 수 있게, 처음 몇 행의 내용을 에러에 포함
        sample = " / ".join(
            ", ".join(_safe_str(v) for v in r[:8] if _safe_str(v)) for r in rows[:5]
        )[:300]
        raise ValueError(
            "엑셀에서 날짜·금액 컬럼을 찾지 못했습니다. "
            f"(인식된 앞부분: {sample or '내용 없음'}) "
            "— 이 파일 양식을 알려주시면 파서에 추가할 수 있습니다."
        )

    header_idx, m = found
    is_bank = kind == "bank"

    def _cell(row, field):
        i = m.get(field)
        return row[i] if (i is not None and i < len(row)) else None

    results: list[dict] = []
    for row in rows[header_idx + 1:]:
        tx_date = _normalize_date(_cell(row, "tx_date"))
        if not tx_date or len(tx_date) < 10:
            continue  # 빈 행/합계 행

        counterparty = _safe_str(_cell(row, "counterparty"))
        approval_no = _safe_str(_cell(row, "approval_no"))
        supply = _safe_int(_cell(row, "supply_amount"))
        vat = _safe_int(_cell(row, "vat_amount"))
        total = _safe_int(_cell(row, "total_amount"))
        deposit = _safe_int(_cell(row, "deposit"))
        withdrawal = _safe_int(_cell(row, "withdrawal"))

        vat_estimated = False
        if is_bank:
            if deposit == 0 and withdrawal == 0:
                continue
            supply = vat = 0
            total = deposit - withdrawal
        else:
            if total == 0 and supply != 0:
                total = supply + vat
            if total == 0:
                continue
            # 공급가액·부가세 컬럼 없는 카드 파일 → 합계에서 10% 역산
            if supply == 0 and vat == 0:
                supply = round(total / 1.1)
                vat = total - supply
                vat_estimated = True

        results.append({
            "kind": kind,
            "tx_date": tx_date[:10],
            "counterparty": counterparty,
            "approval_no": approval_no,
            "supply_amount": supply,
            "vat_amount": vat,
            "total_amount": total,
            "deposit": deposit,
            "withdrawal": withdrawal,
            "vat_estimated": vat_estimated,
            "source": "excel",
        })

    logger.info("[finance] 명세서 파싱: %d건 (kind=%s, 매핑=%s)",
                len(results), kind, list(m.keys()))
    return results
