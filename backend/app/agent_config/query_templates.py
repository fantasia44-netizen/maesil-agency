"""
에이전트가 사용할 수 있는 승인된 SQL 쿼리 템플릿.
자유 SQL 금지 — 이 목록에 있는 것만 실행 가능.
"""

QUERY_TEMPLATES: dict[str, dict] = {

    # ───────────── SALES ─────────────
    "sales.today_revenue_by_channel": {
        "db": "maesil-insight",
        "allowed_agents": ["sales", "growth", "orchestrator"],
        "description": "오늘 채널별 주문수/매출",
        "sql": """
            SELECT channel,
                   COUNT(*) AS order_count,
                   SUM(total_amount) AS gross_revenue,
                   SUM(settlement) AS net_revenue
            FROM public.order_transactions
            WHERE operator_id = :operator_id
              AND order_date = :target_date
            GROUP BY channel
            ORDER BY gross_revenue DESC NULLS LAST
        """,
        "params": ["operator_id", "target_date"],
    },

    "sales.date_range_revenue": {
        "db": "maesil-insight",
        "allowed_agents": ["sales", "finance", "growth", "orchestrator"],
        "description": "기간별 채널별 매출",
        "sql": """
            SELECT channel,
                   order_date,
                   COUNT(*) AS order_count,
                   SUM(total_amount) AS gross_revenue,
                   SUM(settlement) AS net_revenue
            FROM public.order_transactions
            WHERE operator_id = :operator_id
              AND order_date BETWEEN :date_from AND :date_to
            GROUP BY channel, order_date
            ORDER BY order_date DESC, gross_revenue DESC NULLS LAST
        """,
        "params": ["operator_id", "date_from", "date_to"],
    },

    "sales.monthly_summary": {
        "db": "maesil-insight",
        "allowed_agents": ["sales", "finance", "growth", "orchestrator"],
        "description": "월별 매출 요약",
        "sql": """
            SELECT TO_CHAR(order_date, 'YYYY-MM') AS year_month,
                   channel,
                   COUNT(*) AS order_count,
                   SUM(total_amount) AS gross_revenue,
                   SUM(settlement) AS net_revenue
            FROM public.order_transactions
            WHERE operator_id = :operator_id
              AND order_date >= :date_from
            GROUP BY year_month, channel
            ORDER BY year_month DESC, gross_revenue DESC NULLS LAST
        """,
        "params": ["operator_id", "date_from"],
    },

    "sales.top_products": {
        "db": "maesil-insight",
        "allowed_agents": ["sales", "growth", "orchestrator"],
        "description": "기간 내 상위 판매 상품",
        "sql": """
            SELECT product_name,
                   channel,
                   SUM(qty) AS total_qty,
                   SUM(total_amount) AS gross_revenue
            FROM public.order_transactions
            WHERE operator_id = :operator_id
              AND order_date BETWEEN :date_from AND :date_to
            GROUP BY product_name, channel
            ORDER BY gross_revenue DESC NULLS LAST
            LIMIT 20
        """,
        "params": ["operator_id", "date_from", "date_to"],
    },

    # ───────────── FINANCE ─────────────
    "finance.ad_spend_by_channel": {
        "db": "maesil-insight",
        "allowed_agents": ["finance", "sales", "growth", "orchestrator"],
        "description": "기간별 채널별 광고비",
        "sql": """
            SELECT channel,
                   SUM(cost) AS total_ad_cost,
                   SUM(revenue) AS ad_attributed_revenue,
                   CASE WHEN SUM(cost) > 0
                        THEN ROUND((SUM(revenue)::numeric / SUM(cost)), 2)
                        ELSE NULL END AS roas
            FROM public.ad_spend
            WHERE operator_id = :operator_id
              AND date BETWEEN :date_from AND :date_to
            GROUP BY channel
            ORDER BY total_ad_cost DESC NULLS LAST
        """,
        "params": ["operator_id", "date_from", "date_to"],
    },

    "finance.pnl_costs": {
        "db": "maesil-insight",
        "allowed_agents": ["finance", "orchestrator"],
        "description": "월별 손익 비용 항목",
        "sql": """
            SELECT year_month, category, amount, memo
            FROM public.pnl_costs
            WHERE operator_id = :operator_id
              AND year_month >= :year_month_from
            ORDER BY year_month DESC, amount DESC
        """,
        "params": ["operator_id", "year_month_from"],
    },

    "finance.daily_profit_snapshot": {
        "db": "maesil-insight",
        "allowed_agents": ["finance", "orchestrator"],
        "description": "일별 손익 스냅샷",
        "sql": """
            SELECT date, channel,
                   gross_revenue, cogs, ad_cost,
                   net_profit, margin_rate, confidence_score
            FROM public.daily_profit_snapshot
            WHERE operator_id = :operator_id
              AND date BETWEEN :date_from AND :date_to
            ORDER BY date DESC, net_profit DESC NULLS LAST
        """,
        "params": ["operator_id", "date_from", "date_to"],
    },

    "finance.settlement_summary": {
        "db": "maesil-insight",
        "allowed_agents": ["finance", "orchestrator"],
        "description": "채널별 정산 요약",
        "sql": """
            SELECT channel,
                   settlement_date,
                   net_settlement,
                   gross_sales
            FROM public.api_settlements
            WHERE operator_id = :operator_id
              AND settlement_date BETWEEN :date_from AND :date_to
            ORDER BY settlement_date DESC
        """,
        "params": ["operator_id", "date_from", "date_to"],
    },

    # ───────────── WAREHOUSE ─────────────
    "warehouse.low_stock_items": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "안전재고 이하 상품 목록",
        "sql": """
            SELECT product_name, sku, current_qty,
                   safety_stock, lead_time_days,
                   (current_qty - safety_stock) AS stock_gap
            FROM public.inventory_items
            WHERE operator_id = :operator_id
              AND is_active = TRUE
              AND current_qty <= safety_stock
            ORDER BY stock_gap ASC
        """,
        "params": ["operator_id"],
    },

    "warehouse.inventory_status": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "전체 재고 현황",
        "sql": """
            SELECT product_name, sku, current_qty,
                   safety_stock, lead_time_days, category
            FROM public.inventory_items
            WHERE operator_id = :operator_id
              AND is_active = TRUE
            ORDER BY current_qty ASC
        """,
        "params": ["operator_id"],
    },

    "warehouse.purchase_plans": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "발주 계획 목록",
        "sql": """
            SELECT year_month, product_name, current_qty,
                   avg_daily_sales, days_left, suggested_qty, final_qty,
                   status, memo
            FROM public.purchase_plans
            WHERE operator_id = :operator_id
              AND year_month >= :year_month_from
            ORDER BY year_month DESC, days_left ASC
        """,
        "params": ["operator_id", "year_month_from"],
    },

    # ───────────── PRODUCTION ─────────────
    "production.daily_output": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "기간별 일별 생산 실적 (계획 vs 실제)",
        "sql": """
            SELECT production_date,
                   product_name, sku, factory,
                   SUM(planned_qty) AS planned_qty,
                   SUM(actual_qty)  AS actual_qty,
                   ROUND(
                     CASE WHEN SUM(planned_qty) > 0
                          THEN SUM(actual_qty)::numeric / SUM(planned_qty) * 100
                          ELSE NULL END, 1
                   ) AS achievement_rate,
                   status
            FROM public.production_logs
            WHERE operator_id = :operator_id
              AND production_date BETWEEN :date_from AND :date_to
            GROUP BY production_date, product_name, sku, factory, status
            ORDER BY production_date DESC, actual_qty DESC NULLS LAST
        """,
        "params": ["operator_id", "date_from", "date_to"],
    },

    "production.monthly_summary": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "월별 생산 요약 (상품별 계획달성률)",
        "sql": """
            SELECT TO_CHAR(production_date, 'YYYY-MM') AS year_month,
                   product_name, sku,
                   SUM(planned_qty) AS total_planned,
                   SUM(actual_qty)  AS total_actual,
                   ROUND(
                     CASE WHEN SUM(planned_qty) > 0
                          THEN SUM(actual_qty)::numeric / SUM(planned_qty) * 100
                          ELSE NULL END, 1
                   ) AS achievement_rate,
                   SUM(actual_qty * COALESCE(unit_cost, 0)) AS total_cost
            FROM public.production_logs
            WHERE operator_id = :operator_id
              AND production_date >= :date_from
              AND status != 'cancelled'
            GROUP BY year_month, product_name, sku
            ORDER BY year_month DESC, total_actual DESC NULLS LAST
        """,
        "params": ["operator_id", "date_from"],
    },

    "production.in_progress": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "현재 생산 중인 품목",
        "sql": """
            SELECT product_name, sku, factory, lot_number,
                   planned_qty, actual_qty, production_date, notes
            FROM public.production_logs
            WHERE operator_id = :operator_id
              AND status IN ('planned', 'in_progress')
            ORDER BY production_date ASC
        """,
        "params": ["operator_id"],
    },

    # ───────────── SHIPMENT ─────────────
    "shipment.daily_by_channel": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "기간별 채널별 출고량",
        "sql": """
            SELECT shipment_date, channel,
                   COUNT(DISTINCT order_ref) AS order_count,
                   SUM(qty)                  AS total_qty,
                   SUM(qty * COALESCE(unit_price, 0)) AS total_value
            FROM public.shipment_logs
            WHERE operator_id = :operator_id
              AND shipment_date BETWEEN :date_from AND :date_to
              AND status IN ('shipped', 'delivered')
            GROUP BY shipment_date, channel
            ORDER BY shipment_date DESC, total_qty DESC NULLS LAST
        """,
        "params": ["operator_id", "date_from", "date_to"],
    },

    "shipment.product_summary": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "기간별 상품별 출고량 집계",
        "sql": """
            SELECT product_name, sku, channel,
                   SUM(qty) AS total_qty,
                   SUM(qty * COALESCE(unit_price, 0)) AS total_value,
                   COUNT(*) AS shipment_count
            FROM public.shipment_logs
            WHERE operator_id = :operator_id
              AND shipment_date BETWEEN :date_from AND :date_to
              AND status IN ('shipped', 'delivered')
            GROUP BY product_name, sku, channel
            ORDER BY total_qty DESC NULLS LAST
            LIMIT 30
        """,
        "params": ["operator_id", "date_from", "date_to"],
    },

    "shipment.pending": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "출고 대기 중인 건",
        "sql": """
            SELECT shipment_date, product_name, sku, channel,
                   qty, order_ref, notes
            FROM public.shipment_logs
            WHERE operator_id = :operator_id
              AND status = 'pending'
            ORDER BY shipment_date ASC
        """,
        "params": ["operator_id"],
    },

    "shipment.returns": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "반품 현황",
        "sql": """
            SELECT shipment_date, product_name, sku, channel,
                   qty, notes
            FROM public.shipment_logs
            WHERE operator_id = :operator_id
              AND status = 'returned'
              AND shipment_date >= :date_from
            ORDER BY shipment_date DESC
        """,
        "params": ["operator_id", "date_from"],
    },

    "inventory.movement_summary": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "재고 이동 요약 (생산 입고 vs 출고 순변동)",
        "sql": """
            SELECT sku, product_name,
                   SUM(qty_in)  AS total_in,
                   SUM(qty_out) AS total_out,
                   SUM(qty_in - qty_out) AS net_change
            FROM public.inventory_movement
            WHERE operator_id = :operator_id
              AND date BETWEEN :date_from AND :date_to
            GROUP BY sku, product_name
            ORDER BY net_change ASC
        """,
        "params": ["operator_id", "date_from", "date_to"],
    },

    # ───────────── CS (maesil-insight) ─────────────
    "cs.recent_conversations": {
        "db": "maesil-insight",
        "allowed_agents": ["cs", "orchestrator"],
        "description": "최근 CS 대화 목록",
        "sql": """
            SELECT id, title, status, created_at, updated_at
            FROM public.cs_conversations
            WHERE operator_id = :operator_id
            ORDER BY updated_at DESC
            LIMIT :limit
        """,
        "params": ["operator_id", "limit"],
    },

    "cs.conversation_messages": {
        "db": "maesil-insight",
        "allowed_agents": ["cs", "orchestrator"],
        "description": "특정 대화의 메시지",
        "sql": """
            SELECT role, content, tokens_used, created_at
            FROM public.cs_messages
            WHERE conversation_id = :conversation_id
            ORDER BY created_at ASC
        """,
        "params": ["conversation_id"],
    },

    "cs.volume_by_day": {
        "db": "maesil-insight",
        "allowed_agents": ["cs", "orchestrator"],
        "description": "일별 CS 문의량",
        "sql": """
            SELECT DATE(created_at AT TIME ZONE 'Asia/Seoul') AS date,
                   COUNT(*) AS conversation_count
            FROM public.cs_conversations
            WHERE operator_id = :operator_id
              AND created_at >= :since
            GROUP BY date
            ORDER BY date DESC
        """,
        "params": ["operator_id", "since"],
    },

    "cs.maeyo_question_log": {
        "db": "maesil-insight",
        "allowed_agents": ["cs", "orchestrator"],
        "description": "매요AI 질문 레이어별 통계",
        "sql": """
            SELECT layer,
                   COUNT(*) AS count,
                   DATE(created_at AT TIME ZONE 'Asia/Seoul') AS date
            FROM public.maeyo_question_log
            WHERE operator_id = :operator_id
              AND created_at >= :since
            GROUP BY layer, date
            ORDER BY date DESC, layer
        """,
        "params": ["operator_id", "since"],
    },
}
