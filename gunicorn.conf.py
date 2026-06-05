"""Gunicorn config for the Bromog backend.

Bind to the port App Service provides via $PORT (defaults to 8000 locally).
A single worker with a couple of threads is plenty for a 3-person app and keeps
the SQLite-on-/home story simple (no cross-process write contention).
"""

import os

bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
workers = 1
threads = 4
timeout = 60
accesslog = "-"
errorlog = "-"
