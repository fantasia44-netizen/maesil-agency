"""buyer_import — aT BMS / KOTRA / KITA 등 외부 바이어 파일 유연 임포트.

엑셀(.xlsx/.xls)·CSV 모두 지원하고, 컬럼명을 한글/영문 자동 인식해
buyer_leads 스키마로 매핑한다. (사용자가 받은 파일을 그대로 업로드)
"""
from __future__ import annotations

import csv
import io
import logging
import re

logger = logging.getLogger(__name__)


# ── 컬럼 자동 인식 ──────────────────────────────────────────────────────────────
# (target, [헤더에 포함되면 매칭되는 키워드들]) — 위에서부터 우선순위.
# 더 구체적인 항목(이메일/직책)을 회사명/담당자보다 먼저 평가해야 오인식이 없다.
_HEADER_RULES: list[tuple[str, list[str]]] = [
    ("contact_email", ["이메일", "메일주소", "전자우편", "email", "e-mail", "mail"]),
    ("contact_title", ["직책", "직위", "직함", "title", "position"]),
    ("contact_name",  ["담당자", "담당", "연락담당", "contact person", "contactperson", "contact name", "representative", "rep name"]),
    ("company_name",  ["업체명", "회사명", "기업명", "바이어명", "바이어", "거래처", "상호", "수입업체", "수입상",
                       "company", "firm", "buyer", "importer", "distributor", "corporation", "업체", "회사", "기업"]),
    ("country",       ["국가", "나라", "소재국", "수출국", "수입국", "country", "nation", "지역", "region"]),
    ("product_interest", ["취급품목", "주요품목", "관심품목", "희망품목", "수입품목", "취급제품", "주력품목", "품목",
                          "product", "item", "취급", "관심분야", "interest"]),
    ("industry",      ["업종", "산업", "분야", "업태", "sector", "industry", "category", "business type"]),
]

# notes 로 합쳐 보존할 부가정보 컬럼 (홈페이지/전화/주소/신용 등)
_NOTES_RULES: list[tuple[str, list[str]]] = [
    ("홈페이지", ["홈페이지", "homepage", "website", "url", "web"]),
    ("전화", ["전화", "연락처", "phone", "tel", "telephone", "fax"]),
    ("주소", ["주소", "address", "소재지", "location"]),
    ("신용", ["신용", "credit", "rating"]),
    ("규모", ["규모", "매출", "직원", "size", "revenue", "employee"]),
]


def _norm(h: str) -> str:
    return re.sub(r"[\s_\-()/\.]+", "", (h or "").strip().lower())


def _map_headers(headers: list[str]) -> tuple[dict[str, str], dict[str, str]]:
    """원본 헤더 → (target 매핑, notes 매핑). 한 target 은 첫 매칭만 사용."""
    field_map: dict[str, str] = {}   # original_header → target
    notes_map: dict[str, str] = {}   # original_header → notes_label
    used_targets: set[str] = set()

    for h in headers:
        nh = _norm(h)
        if not nh:
            continue
        matched = False
        for target, keys in _HEADER_RULES:
            if target in used_targets:
                continue
            if any(_norm(k) in nh for k in keys):
                field_map[h] = target
                used_targets.add(target)
                matched = True
                break
        if matched:
            continue
        for label, keys in _NOTES_RULES:
            if any(_norm(k) in nh for k in keys):
                notes_map[h] = label
                break
    return field_map, notes_map


def _decode_csv(content: bytes) -> str:
    """한글 CSV 인코딩 자동 판별 (UTF-8-SIG → CP949 → EUC-KR → UTF-8)."""
    for enc in ("utf-8-sig", "cp949", "euc-kr", "utf-8"):
        try:
            return content.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue
    return content.decode("utf-8", errors="ignore")


def _read_rows(filename: str, content: bytes) -> tuple[list[str], list[dict]]:
    """파일에서 (헤더목록, 행 dict 리스트) 추출. xlsx/xls/csv 지원."""
    name = (filename or "").lower()
    if name.endswith((".xlsx", ".xlsm", ".xls")):
        try:
            import openpyxl
        except ImportError:
            raise ValueError("엑셀 처리 모듈(openpyxl) 미설치 — CSV로 저장 후 업로드해주세요")
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        rows_iter = ws.iter_rows(values_only=True)
        # 첫 비어있지 않은 행을 헤더로
        headers: list[str] = []
        for raw in rows_iter:
            cells = [("" if c is None else str(c).strip()) for c in raw]
            if any(cells):
                headers = cells
                break
        data = []
        for raw in rows_iter:
            cells = [("" if c is None else str(c).strip()) for c in raw]
            if not any(cells):
                continue
            data.append({headers[i]: (cells[i] if i < len(cells) else "") for i in range(len(headers))})
        return headers, data

    # CSV
    text = _decode_csv(content)
    reader = csv.DictReader(io.StringIO(text))
    headers = list(reader.fieldnames or [])
    data = [dict(r) for r in reader]
    return headers, data


def parse_buyer_file(filename: str, content: bytes) -> dict:
    """업로드 파일 → buyer_leads 레코드 리스트 + 매핑 진단.

    반환: {"rows": [...], "mapping": {...}, "headers": [...], "skipped_no_company": N}
    """
    headers, raw_rows = _read_rows(filename, content)
    if not headers:
        raise ValueError("헤더(첫 행)를 읽지 못했습니다 — 파일 형식을 확인해주세요")

    field_map, notes_map = _map_headers(headers)
    if "company_name" not in field_map.values():
        raise ValueError(
            f"회사명 컬럼을 찾지 못했습니다. 인식된 헤더: {headers}. "
            "업체명/회사명/company 등의 컬럼이 필요합니다"
        )

    out: list[dict] = []
    skipped = 0
    for r in raw_rows:
        rec: dict = {"contact_name": None, "contact_email": None, "contact_title": None,
                     "country": "", "industry": None, "product_interest": None}
        for orig, target in field_map.items():
            val = (r.get(orig) or "").strip()
            if val:
                rec[target] = val
        company = (rec.get("company_name") or "").strip()
        if not company:
            skipped += 1
            continue

        # 부가정보 → notes 합치기
        note_parts = []
        for orig, label in notes_map.items():
            v = (r.get(orig) or "").strip()
            if v:
                note_parts.append(f"{label}:{v}")
        notes = " · ".join(note_parts) if note_parts else None

        # 이메일 정제 (여러 개면 첫번째)
        email = (rec.get("contact_email") or "").strip()
        if email:
            m = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", email)
            email = m.group(0).lower() if m else None
        else:
            email = None

        out.append({
            "company_name": company,
            "country": (rec.get("country") or "").strip() or "Unknown",
            "contact_name": rec.get("contact_name") or None,
            "contact_email": email,
            "contact_title": rec.get("contact_title") or None,
            "industry": rec.get("industry") or None,
            "product_interest": rec.get("product_interest") or None,
            "notes": notes,
        })

    mapping_readable = {orig: tgt for orig, tgt in field_map.items()}
    return {
        "rows": out,
        "mapping": mapping_readable,
        "notes_columns": list(notes_map.keys()),
        "headers": headers,
        "skipped_no_company": skipped,
    }
