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
    return app
