from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import alert_channels, alerts, chat, health, secrets_router, widgets

app = FastAPI(title="maesil-agency", version="0.1.0")

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
app.include_router(alert_channels.router)
app.include_router(alerts.router)


@app.get("/")
def root() -> dict:
    return {"service": "maesil-agency", "version": app.version}
