# Bromog backend — Flask API served by gunicorn.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server/ ./server/
COPY gunicorn.conf.py .

# Local-dev SQLite fallback path. Production uses DATABASE_URL (Neon Postgres);
# see server/config.py. The container disk is ephemeral, so SQLite here is dev-only.
RUN mkdir -p /home/data

EXPOSE 8000

# The platform injects $PORT; gunicorn.conf.py binds to it.
CMD ["gunicorn", "-c", "gunicorn.conf.py", "server:create_app()"]
