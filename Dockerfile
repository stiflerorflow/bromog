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

# /home is the persisted volume on Azure App Service (WEBSITES_ENABLE_APP_SERVICE_STORAGE=true);
# the SQLite db lives at /home/data/bromog.db by default. See server/config.py.
RUN mkdir -p /home/data

EXPOSE 8000

# App Service injects $PORT; gunicorn.conf.py binds to it.
CMD ["gunicorn", "-c", "gunicorn.conf.py", "server:create_app()"]
