"""Dev entrypoint — `python app.py` serves the API on :8000 (matches the devcontainer).

In production the container runs gunicorn against `server:create_app()` instead.
"""

from server import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
