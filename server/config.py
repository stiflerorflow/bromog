"""Runtime configuration, read from environment variables.

Everything has a sensible local-dev default so `python app.py` works with no setup.
In production (Azure Container Apps) these are provided as environment variables /
secrets; the durable database is Neon Postgres via DATABASE_URL.
"""

import os


def _db_url() -> str:
    """SQLAlchemy engine URL.

    Production sets DATABASE_URL to the Neon Postgres URL. With nothing set we fall
    back to a local SQLite file (dev only — the container disk is ephemeral).
    """
    explicit = os.environ.get("DATABASE_URL")
    if explicit:
        return explicit
    home_data = "/home/data"
    target_dir = home_data if os.path.isdir("/home") and os.access("/home", os.W_OK) else "."
    if target_dir == home_data:
        os.makedirs(home_data, exist_ok=True)
    return f"sqlite:///{os.path.join(target_dir, 'bromog.db')}"


class Config:
    DATABASE_URL = _db_url()

    # Shared bearer token guarding write/read endpoints on the public URL.
    # Empty string disables the check (handy for local dev / tests).
    APP_TOKEN = os.environ.get("APP_TOKEN", "")

    # LLM coach keys (optional). Absent keys -> coach endpoints return 503.
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

    # Where the always-latest APK lives (e.g. the GitHub Release permalink). The
    # /install page and /download redirect point here. Set once; never changes.
    APK_DOWNLOAD_URL = os.environ.get("APK_DOWNLOAD_URL", "")
