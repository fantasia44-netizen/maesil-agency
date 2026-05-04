"""
HTML 제안서 렌더러.

snapshot payload를 받아 브라우저 인쇄(→PDF 저장) 가능한
풀 HTML 문서를 반환.
브라우저 의존성만 사용하므로 서버 추가 의존성 없음.
"""
from __future__ import annotations


def _esc(s: str) -> str:
    """HTML 특수문자 이스케이프."""
    return (
        s.replace("&", "&amp;")
         .replace("<", "&lt;")
         .replace(">", "&gt;")
         .replace('"', "&quot;")
    )


def _nl2br(s: str) -> str:
    return _esc(s).replace("\n", "<br>")


def _date_str(iso: str) -> str:
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime("%Y년 %m월 %d일")
    except Exception:
        return ""


def _benchmark_html(bm: dict) -> str:
    if not bm:
        return ""

    avg_roas      = float(bm.get("avg_roas", 0))
    avg_margin    = float(bm.get("avg_margin_pct", 0))
    sample_size   = int(bm.get("sample_size", 0))
    category      = _esc(bm.get("category", ""))
    top_channel   = _esc(bm.get("top_channel", ""))
    source        = bm.get("source", "benchmark")
    source_label  = "매실 실측 데이터" if source.startswith("maesil-insight:") else "업계 평균 기준"

    roas_width    = min(int(avg_roas / 6 * 100), 100)
    margin_width  = min(int(avg_margin / 40 * 100), 100)

    return f"""
<div class="bm-card">
  <div class="bm-header">
    <span class="bm-icon">📊</span>
    <span class="bm-title">{category} 카테고리 평균 성과</span>
    <span class="bm-meta">{sample_size}개 스토어 · {source_label}</span>
  </div>
  <div class="bm-grid">
    <div class="bm-item">
      <div class="bm-label">평균 ROAS</div>
      <div class="bm-value">{avg_roas:.1f}<span class="bm-unit">x</span></div>
      <div class="bm-bar-wrap"><div class="bm-bar" style="width:{roas_width}%"></div></div>
      <div class="bm-sub">광고비 1원 → {avg_roas:.1f}원 매출</div>
    </div>
    <div class="bm-item">
      <div class="bm-label">평균 실수익률</div>
      <div class="bm-value">{avg_margin:.0f}<span class="bm-unit">%</span></div>
      <div class="bm-bar-wrap"><div class="bm-bar" style="width:{margin_width}%"></div></div>
      <div class="bm-sub">광고비·수수료 차감 후 순이익</div>
    </div>
    <div class="bm-item">
      <div class="bm-label">주요 매출 채널</div>
      <div class="bm-value ch">{top_channel}</div>
      <div class="bm-sub">매출 비중 1위</div>
    </div>
  </div>
</div>
"""


def _body_html(payload: dict) -> str:
    sections = payload.get("sections") or {}
    proposal_text = payload.get("proposal", "")

    section_labels = [
        ("greeting",         "인사말"),
        ("insight",          "현황 파악"),
        ("value_proposition","제안 내용"),
        ("social_proof",     "도입 효과"),
        ("cta",              "다음 단계"),
    ]

    if any(sections.get(k) for k, _ in section_labels):
        parts = []
        for key, label in section_labels:
            content = sections.get(key, "").strip()
            if content:
                parts.append(
                    f'<div class="sec">'
                    f'<div class="sec-label">{label}</div>'
                    f'<div class="sec-body">{_nl2br(content)}</div>'
                    f'</div>'
                )
        return "\n".join(parts)
    else:
        paras = [p.strip() for p in proposal_text.strip().split("\n\n") if p.strip()]
        return "\n".join(f"<p>{_nl2br(p)}</p>" for p in paras)


def render_proposal_html(snapshot: dict) -> str:
    """snapshot dict → 완전한 HTML 문서 문자열."""
    payload      = snapshot.get("payload", {})
    mall_name    = _esc(payload.get("mall_name", "스토어"))
    store_url    = payload.get("store_url", "")
    product_area = _esc(payload.get("product_area", ""))
    benchmark    = payload.get("benchmark") or {}
    created_at   = payload.get("created_at", snapshot.get("created_at", ""))
    date_s       = _date_str(created_at)

    store_link = (
        f'<a href="{_esc(store_url)}" target="_blank" rel="noopener">{_esc(store_url)}</a>'
        if store_url else ""
    )

    bm_html   = _benchmark_html(benchmark)
    body_html = _body_html(payload)

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>매실 제안서 — {mall_name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap');
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Noto Sans KR',-apple-system,sans-serif;background:#f1f5f9;color:#0f172a;line-height:1.75}}
.page{{max-width:760px;margin:2rem auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}}

/* 헤더 */
.hd{{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:#fff;padding:2.2rem 2.8rem;position:relative}}
.hd-logo{{font-size:.78rem;font-weight:700;color:#4ade80;letter-spacing:.15em;text-transform:uppercase;margin-bottom:1.1rem}}
.hd h1{{font-size:1.8rem;font-weight:700;margin-bottom:.3rem}}
.hd .sub{{font-size:.88rem;color:#94a3b8}}
.hd .dt{{position:absolute;top:2.2rem;right:2.8rem;font-size:.76rem;color:#64748b}}

/* 스토어 정보 */
.store-row{{padding:.9rem 2.8rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:.82rem;color:#475569}}
.store-row a{{color:#2563eb;text-decoration:none}}
.store-row a:hover{{text-decoration:underline}}

/* 본문 */
.body{{padding:2.2rem 2.8rem}}
p{{margin-bottom:1.1rem;font-size:.95rem;color:#1e293b}}

/* 섹션 */
.sec{{margin-bottom:1.6rem}}
.sec-label{{font-size:.7rem;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.45rem}}
.sec-body{{font-size:.95rem;color:#1e293b}}

/* 벤치마크 */
.bm-card{{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:1.4rem;margin:1.8rem 0}}
.bm-header{{display:flex;align-items:center;gap:.6rem;margin-bottom:1.2rem}}
.bm-icon{{font-size:1.1rem}}
.bm-title{{font-size:.88rem;font-weight:700;color:#166534}}
.bm-meta{{font-size:.72rem;color:#6b7280;margin-left:auto}}
.bm-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:1.2rem}}
.bm-label{{font-size:.7rem;color:#6b7280;margin-bottom:.2rem}}
.bm-value{{font-size:1.6rem;font-weight:700;color:#15803d;margin-bottom:.35rem;line-height:1}}
.bm-unit{{font-size:1rem;font-weight:600}}
.bm-value.ch{{font-size:1.1rem}}
.bm-bar-wrap{{height:7px;background:#dcfce7;border-radius:4px;overflow:hidden;margin-bottom:.35rem}}
.bm-bar{{height:100%;background:linear-gradient(90deg,#22c55e,#16a34a);border-radius:4px}}
.bm-sub{{font-size:.7rem;color:#6b7280}}

/* 푸터 */
.ft{{background:#f8fafc;border-top:1px solid #e2e8f0;padding:1.1rem 2.8rem;display:flex;justify-content:space-between;align-items:center}}
.ft-brand{{font-weight:700;color:#22c55e;font-size:.88rem}}
.ft-note{{font-size:.73rem;color:#94a3b8}}

/* 인쇄 제어 바 */
.ctrl-bar{{position:fixed;top:1rem;right:1rem;display:flex;gap:.5rem;z-index:200}}
.btn-print{{background:#0f172a;color:#fff;border:none;border-radius:7px;padding:8px 18px;font-size:.82rem;font-weight:600;cursor:pointer;font-family:inherit}}
.btn-print:hover{{background:#1e293b}}
.btn-close{{background:#e2e8f0;color:#475569;border:none;border-radius:7px;padding:8px 12px;font-size:.82rem;cursor:pointer;font-family:inherit}}

@media print{{
  body{{background:#fff}}
  .ctrl-bar,.no-print{{display:none!important}}
  .page{{margin:0;border-radius:0;box-shadow:none;max-width:100%}}
}}
@page{{margin:1.5cm 1.8cm}}
</style>
</head>
<body>

<div class="ctrl-bar no-print">
  <button class="btn-print" onclick="window.print()">🖨️ PDF 저장 / 인쇄</button>
  <button class="btn-close" onclick="window.close()">✕</button>
</div>

<div class="page">
  <div class="hd">
    <div class="hd-logo">🌿 Maesil · 영업 제안서</div>
    <h1>{mall_name} 귀중</h1>
    {f'<div class="sub">{product_area}</div>' if product_area else ''}
    {f'<div class="dt">{date_s}</div>' if date_s else ''}
  </div>

  {f'<div class="store-row">스토어 · {store_link}</div>' if store_link else ''}

  <div class="body">
    {bm_html}
    {body_html}
  </div>

  <div class="ft">
    <div class="ft-brand">매실 (Maesil)</div>
    <div class="ft-note">본 제안서는 영업 참고용입니다.</div>
  </div>
</div>

</body>
</html>"""
