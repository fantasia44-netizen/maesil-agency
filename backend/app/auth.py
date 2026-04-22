from fastapi import HTTPException, Request

from app.config import settings


def require_bearer(request: Request) -> None:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = auth.split(" ", 1)[1].strip()
    if token != settings.api_bearer_token:
        raise HTTPException(status_code=401, detail="invalid token")
