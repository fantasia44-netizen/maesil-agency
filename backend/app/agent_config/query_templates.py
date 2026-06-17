"""
에이전트가 사용할 수 있는 승인된 SQL 쿼리 템플릿.
자유 SQL 금지 — 이 목록에 있는 것만 실행 가능.
실제 maesil-insight DB 스키마 기준 (2026-06-17 검증).
"""

QUERY_TEMPLATES: dict[str, dict] = {

    # ───────────── SALES ─────────────
    "sales.today_revenue_by_channel": {
        "db": "maesil-insight",
        "allowed_agents": ["sales", "growth", "orchestrator"],
        "description": "오늘 채널별 주문수/매출 (api_orders)",
        "sql": """
            SELECT channel,
                   COUNT(*) AS order_count,
                   SUM(total_amount) AS gross_revenue,
                   SUM(settlement_amount) AS net_revenue
            FROM public.api_orders
            WHERE order_date = :target_date
              AND operator_id = :operator_id
              AND order_status NOT IN ('cancelled', 'returned')
            GROUP BY channel
            ORDER BY gross_revenue DESC NULLS LAST
        """,
        "params": ["target_date", "operator_id"],
    },

    "sales.date_range_revenue": {
        "db": "maesil-insight",
        "allowed_agents": ["sales", "finance", "growth", "orchestrator"],
        "description": "기간별 채널별 매출 (api_orders)",
        "sql": """
            SELECT channel,
                   order_date,
                   COUNT(*) AS order_count,
                   SUM(total_amount) AS gross_revenue,
                   SUM(settlement_amount) AS net_revenue
            FROM public.api_orders
            WHERE order_date BETWEEN :date_from AND :date_to
              AND operator_id = :operator_id
              AND order_status NOT IN ('cancelled', 'returned')
            GROUP BY channel, order_date
            ORDER BY order_date DESC, gross_revenue DESC NULLS LAST
        """,
        "params": ["date_from", "date_to", "operator_id"],
    },

    "sales.monthly_summary": {
        "db": "maesil-insight",
        "allowed_agents": ["sales", "finance", "growth", "orchestrator"],
        "description": "월별 채널별 매출 요약 (api_orders)",
        "sql": """
            SELECT TO_CHAR(order_date, 'YYYY-MM') AS year_month,
                   channel,
                   COUNT(*) AS order_count,
                   SUM(total_amount) AS gross_revenue,
                   SUM(settlement_amount) AS net_revenue
            FROM public.api_orders
            WHERE order_date >= :date_from
              AND operator_id = :operator_id
              AND order_status NOT IN ('cancelled', 'returned')
            GROUP BY year_month, channel
            ORDER BY year_month DESC, gross_revenue DESC NULLS LAST
        """,
        "params": ["date_from", "operator_id"],
    },

    "sales.top_products": {
        "db": "maesil-insight",
        "allowed_agents": ["sales", "growth", "orchestrator"],
        "description": "기간 내 상위 판매 상품 (api_orders)",
        "sql": """
            SELECT product_name,
                   channel,
                   SUM(qty) AS total_qty,
                   SUM(total_amount) AS gross_revenue
            FROM public.api_orders
            WHERE order_date BETWEEN :date_from AND :date_to
              AND operator_id = :operator_id
              AND order_status NOT IN ('cancelled', 'returned')
            GROUP BY product_name, channel
            ORDER BY gross_revenue DESC NULLS LAST
            LIMIT 20
        """,
        "params": ["date_from", "date_to", "operator_id"],
    },

    # ───────────── FINANCE ─────────────
    "finance.channel_costs": {
        "db": "maesil-insight",
        "allowed_agents": ["finance", "sales", "growth", "orchestrator"],
        "description": "채널별 수수료·배송비·포장비 구조 (channel_costs)",
        "sql": """
            SELECT channel,
                   fee_rate,
                   shipping,
                   packaging,
                   other_cost,
                   memo
            FROM public.channel_costs
            WHERE operator_id = :operator_id
              AND is_deleted IS NOT TRUE
            ORDER BY channel
        """,
        "params": ["operator_id"],
    },

    "finance.ad_spend_by_channel": {
        "db": "maesil-insight",
        "allowed_agents": ["finance", "sales", "growth", "orchestrator"],
        "description": "기간별 채널별 광고비·ROAS (ad_spend)",
        "sql": """
            SELECT channel,
                   SUM(cost) AS total_cost,
                   SUM(revenue) AS total_revenue,
                   ROUND(AVG(roas)::numeric, 2) AS avg_roas,
                   SUM(clicks) AS total_clicks,
                   SUM(impressions) AS total_impressions
            FROM public.ad_spend
            WHERE date BETWEEN :date_from AND :date_to
              AND operator_id = :operator_id
            GROUP BY channel
            ORDER BY total_cost DESC NULLS LAST
        """,
        "params": ["date_from", "date_to", "operator_id"],
    },

    "finance.daily_profit": {
        "db": "maesil-insight",
        "allowed_agents": ["finance", "orchestrator"],
        "description": "일별 채널별 매출·비용·추정이익 (daily_profit_snapshot)",
        "sql": """
            SELECT date,
                   channel,
                   gross_revenue,
                   order_count,
                   platform_fee,
                   ad_cost,
                   cogs,
                   (gross_revenue - platform_fee - ad_cost - cogs) AS est_profit
            FROM public.daily_profit_snapshot
            WHERE date BETWEEN :date_from AND :date_to
              AND operator_id = :operator_id
            ORDER BY date DESC, gross_revenue DESC NULLS LAST
        """,
        "params": ["date_from", "date_to", "operator_id"],
    },

    "finance.settlement_summary": {
        "db": "maesil-insight",
        "allowed_agents": ["finance", "sales", "orchestrator"],
        "description": "채널별 정산 요약 (api_settlements)",
        "sql": """
            SELECT channel,
                   settlement_date,
                   gross_sales,
                   total_commission,
                   net_settlement,
                   coupon_discount,
                   point_discount
            FROM public.api_settlements
            WHERE settlement_date BETWEEN :date_from AND :date_to
              AND operator_id = :operator_id
            ORDER BY settlement_date DESC, gross_sales DESC NULLS LAST
        """,
        "params": ["date_from", "date_to", "operator_id"],
    },

    # ───────────── WAREHOUSE ─────────────
    "warehouse.low_stock_items": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "안전재고 이하 상품 목록 (inventory_items)",
        "sql": """
            SELECT product_name,
                   sku,
                   current_qty,
                   safety_stock,
                   (current_qty - safety_stock) AS stock_gap,
                   category,
                   lead_time_days
            FROM public.inventory_items
            WHERE operator_id = :operator_id
              AND is_active IS NOT FALSE
              AND current_qty <= safety_stock
            ORDER BY stock_gap ASC
        """,
        "params": ["operator_id"],
    },

    "warehouse.inventory_status": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "전체 재고 현황 (inventory_items)",
        "sql": """
            SELECT product_name,
                   sku,
                   current_qty,
                   safety_stock,
                   category,
                   unit,
                   lead_time_days,
                   updated_at
            FROM public.inventory_items
            WHERE operator_id = :operator_id
              AND is_active IS NOT FALSE
            ORDER BY current_qty ASC
        """,
        "params": ["operator_id"],
    },

    "warehouse.outbound_by_product": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "기간별 상품별 입출고 현황 (inventory_movement)",
        "sql": """
            SELECT product_name,
                   sku,
                   movement_type,
                   SUM(qty_out) AS total_out,
                   SUM(qty_in) AS total_in,
                   COUNT(*) AS movement_count
            FROM public.inventory_movement
            WHERE date BETWEEN :date_from AND :date_to
              AND operator_id = :operator_id
            GROUP BY product_name, sku, movement_type
            ORDER BY total_out DESC NULLS LAST
            LIMIT 30
        """,
        "params": ["date_from", "date_to", "operator_id"],
    },

    # ───────────── CS (maesil-insight) ─────────────
    "cs.maeyo_layer_stats": {
        "db": "maesil-insight",
        "allowed_agents": ["cs", "orchestrator"],
        "description": "매요 CS 레이어별 통계 (maeyo_question_log)",
        "sql": """
            SELECT layer,
                   COUNT(*) AS count,
                   DATE(created_at AT TIME ZONE 'Asia/Seoul') AS date
            FROM public.maeyo_question_log
            WHERE created_at >= :since
              AND operator_id = :operator_id
            GROUP BY layer, date
            ORDER BY date DESC, count DESC
        """,
        "params": ["since", "operator_id"],
    },

    # ───────────── CS (maesil-total agent_work 스키마) ─────────────
    "cs.volume_by_day": {
        "db": "maesil-total",
        "allowed_agents": ["cs", "orchestrator"],
        "description": "일별 매요 CS 대화량 (maeyo_conversations)",
        "sql": """
            SELECT DATE(created_at AT TIME ZONE 'Asia/Seoul') AS date,
                   COUNT(*) AS conversation_count
            FROM agent_work.maeyo_conversations
            WHERE created_at >= :since
            GROUP BY date
            ORDER BY date DESC
        """,
        "params": ["since"],
    },

    "cs.message_by_role": {
        "db": "maesil-total",
        "allowed_agents": ["cs", "orchestrator"],
        "description": "매요 CS 메시지 수 role별 (maeyo_messages)",
        "sql": """
            SELECT DATE(created_at AT TIME ZONE 'Asia/Seoul') AS date,
                   role,
                   COUNT(*) AS count
            FROM agent_work.maeyo_messages
            WHERE created_at >= :since
            GROUP BY date, role
            ORDER BY date DESC, role
        """,
        "params": ["since"],
    },
}
