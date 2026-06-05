"""Runtime configuration, read from environment variables.

Everything has a sensible local-dev default so `python app.py` works with no setup.
In Azure App Service these are provided as Application Settings.
"""

import os


def _db_url() -> str:
    """SQLAlchemy engine URL.

    Default: SQLite at /home/data on App Service (persisted when
    WEBSITES_ENABLE_APP_SERVICE_STORAGE=true), or ./bromog.db locally.
    Set DATABASE_URL to a Postgres URL to upgrade with no code change.
    """
    explicit = os.environ.get("DATABASE_URL")
    if explicit:
        return explicit
    # /home is persisted on App Service Linux; fall back to repo root locally.
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
