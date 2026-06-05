"""Flask application factory for the Bromog backend."""

from __future__ import annotations

import os

from flask import Flask

from .config import Config
from .models import init_db, make_engine
from .pages import pages
from .routes import api


def create_app(database_url: str | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    # Read the URL fresh at construction so tests (and re-creation) can point at a
    # different database than the one resolved at import time.
    url = database_url or os.environ.get("DATABASE_URL") or Config.DATABASE_URL
    engine = make_engine(url)
    app.config["DB_SESSION"] = init_db(engine)

    app.register_blueprint(api)
    app.register_blueprint(pages)

    # CORS: the Capacitor Android WebView serves the app from https://localhost and
    # fetches this API cross-origin with an Authorization header — which triggers an
    # OPTIONS preflight that must carry CORS headers or the WebView blocks the request
    # (sync + coach would silently fail). The bearer token still guards every call, so
    # a wildcard origin is acceptable here.
    @app.after_request
    def add_cors_headers(resp):  # type: ignore[no-untyped-def]
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, OPTIONS"
        resp.headers["Access-Control-Max-Age"] = "86400"
        return resp

    return app
