import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import alert_channels, alerts, chat, health, programs, secrets_router, widgets

logger = logging.getLogger(__name__)


async def _poll_loop():
    """3분마다 Render 로그 폴링 + 알림 발송."""
    import asyncio
    from app.services import alert_dispatcher, render_logs

    while True:
        await asyncio.sleep(180)  # 3분
        try:
            render_logs.poll_all()
            alert_dispatcher.dispatch_pending(limit=100)
            logger.info("[scheduler] poll cycle done")
        except Exception as e:
            logger.error("[scheduler] poll error: %s", e)


@asynccontextmanager
async def lifespan(application: FastAPI):
    import asyncio
    task = asyncio.create_task(_poll_loop())
    logger.info("[scheduler] 3분 폴링 스케줄러 시작")
    yield
    task.cancel()
    logger.info("[scheduler] 스케줄러 종료")


app = FastAPI(title="maesil-agency", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(secrets_router.router)
app.include_router(widgets.router)
app.include_router(chat.router)
app.include_router(programs.router)
app.include_router(alert_channels.router)
app.include_router(alerts.router)


@app.get("/")
def root() -> dict:
    return {"service": "maesil-agency", "version": app.version}
