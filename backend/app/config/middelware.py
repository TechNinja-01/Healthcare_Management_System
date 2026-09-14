import os

from fastapi.middleware.cors import CORSMiddleware


def _allowed_origins() -> list[str]:
    # Comma-separated list, e.g.
    # ALLOWED_ORIGINS="https://myapp.duckdns.org,http://localhost:5173"
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def register_middleware(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
