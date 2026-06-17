"""
에이전트가 사용할 수 있는 승인된 SQL 쿼리 템플릿.
자유 SQL 금지 — 이 목록에 있는 것만 실행 가능.
"""

QUERY_TEMPLATES: dict[str, dict] = {

    # ───────────── SALES ─────────────
    # maesil-insight는 단일 테넌트 — operator_id 컬럼 없음
    "sales.today_revenue_by_channel": {
        "db": "maesil-insight",
        "allowed_agents": ["sales", "growth", "orchestrator"],
        "description": "오늘 채널별 주문수/매출 (api_orders)",
        "sql": """
            SELECT channel,
                   COUNT(*) AS order_count,
                   SUM(total_amount) AS gross_revenue,
                   SUM(settlement_amount) AS net_revenue
            FROM api_orders
            WHERE order_date = :target_date
              AND order_status NOT IN ('cancelled', 'returned')
            GROUP BY channel
            ORDER BY gross_revenue DESC NULLS LAST
        """,
        "params": ["target_date"],
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
            FROM api_orders
            WHERE order_date BETWEEN :date_from AND :date_to
              AND order_status NOT IN ('cancelled', 'returned')
            GROUP BY channel, order_date
            ORDER BY order_date DESC, gross_revenue DESC NULLS LAST
        """,
        "params": ["date_from", "date_to"],
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
            FROM api_orders
            WHERE order_date >= :date_from
              AND order_status NOT IN ('cancelled', 'returned')
            GROUP BY year_month, channel
            ORDER BY year_month DESC, gross_revenue DESC NULLS LAST
        """,
        "params": ["date_from"],
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
            FROM api_orders
            WHERE order_date BETWEEN :date_from AND :date_to
              AND order_status NOT IN ('cancelled', 'returned')
            GROUP BY product_name, channel
            ORDER BY gross_revenue DESC NULLS LAST
            LIMIT 20
        """,
        "params": ["date_from", "date_to"],
    },

    # ───────────── FINANCE ─────────────
    "finance.ad_spend_by_channel": {
        "db": "maesil-insight",
        "allowed_agents": ["finance", "sales", "growth", "orchestrator"],
        "description": "채널별 비용 구조 (channel_costs — 수수료율/배송비/포장비)",
        "sql": """
            SELECT channel,
                   fee_rate,
                   shipping,
                   packaging,
                   other_cost,
                   memo
            FROM channel_costs
            WHERE is_deleted IS NOT TRUE
            ORDER BY channel
        """,
        "params": [],
    },

    "finance.expenses_by_category": {
        "db": "maesil-insight",
        "allowed_agents": ["finance", "orchestrator"],
        "description": "기간별 카테고리별 지출",
        "sql": """
            SELECT expense_month,
                   category,
                   subcategory,
                   SUM(amount) AS total_amount,
                   COUNT(*) AS count
            FROM expenses
            WHERE expense_date BETWEEN :date_from AND :date_to
              AND is_deleted IS NOT TRUE
            GROUP BY expense_month, category, subcategory
            ORDER BY expense_month DESC, total_amount DESC NULLS LAST
        """,
        "params": ["date_from", "date_to"],
    },

    "finance.daily_revenue": {
        "db": "maesil-insight",
        "allowed_agents": ["finance", "orchestrator"],
        "description": "일별 매출 (daily_revenue 테이블)",
        "sql": """
            SELECT revenue_date,
                   channel,
                   product_name,
                   category,
                   SUM(qty) AS total_qty,
                   SUM(revenue) AS total_revenue
            FROM daily_revenue
            WHERE revenue_date BETWEEN :date_from AND :date_to
              AND is_deleted IS NOT TRUE
            GROUP BY revenue_date, channel, product_name, category
            ORDER BY revenue_date DESC, total_revenue DESC NULLS LAST
        """,
        "params": ["date_from", "date_to"],
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
            FROM api_settlements
            WHERE settlement_date BETWEEN :date_from AND :date_to
            ORDER BY settlement_date DESC, gross_sales DESC NULLS LAST
        """,
        "params": ["date_from", "date_to"],
    },

    # ───────────── WAREHOUSE ─────────────
    "warehouse.low_stock_items": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "안전재고 이하 상품 목록 (inventory)",
        "sql": """
            SELECT product_name,
                   current_stock,
                   safety_stock,
                   (current_stock - safety_stock) AS stock_gap,
                   category,
                   location,
                   expiry_date
            FROM inventory
            WHERE current_stock <= safety_stock
            ORDER BY stock_gap ASC
        """,
        "params": [],
    },

    "warehouse.inventory_status": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "전체 재고 현황 (inventory)",
        "sql": """
            SELECT product_name,
                   current_stock,
                   safety_stock,
                   category,
                   location,
                   storage_method,
                   expiry_date,
                   updated_at
            FROM inventory
            ORDER BY current_stock ASC
        """,
        "params": [],
    },

    "warehouse.purchase_plans": {
        "db": "maesil-insight",
        "allowed_agents": ["warehouse", "orchestrator"],
        "description": "발주 계획 (purchase_orders)",
        "sql": """
            SELECT id,
                   created_at::date AS order_date,
                   status,
                   memo
            FROM purchase_orders
            WHERE created_at >= :since
            ORDER BY created_at DESC
        """,
        "params": ["since"],
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

    "cs.maeyo_question_log": {
        "db": "maesil-total",
        "allowed_agents": ["cs", "orchestrator"],
        "description": "매요 CS 메시지 수 (maeyo_messages)",
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
