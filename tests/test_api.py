"""Backend API tests.

Run with: pytest
"""

import os
import uuid

import pytest

# Use a throwaway on-disk sqlite db and a known token before importing the app.
os.environ["DATABASE_URL"] = "sqlite:///./test_bromog.db"
os.environ["APP_TOKEN"] = "test-token"

from server import create_app  # noqa: E402


@pytest.fixture()
def client(tmp_path):
    db_file = tmp_path / "bromog.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_file}"
    app = create_app()
    app.testing = True
    with app.test_client() as c:
        yield c


def _auth(extra=None):
    headers = {"Authorization": "Bearer test-token"}
    if extra:
        headers.update(extra)
    return headers


def _session_payload(**overrides):
    payload = {
        "user_id": "stephen",
        "workout_key": "monday",
        "started_at": "2026-06-01T18:00:00Z",
        "finished_at": "2026-06-01T18:45:00Z",
        "sets": [
            {"exercise_key": "machine_press", "set_index": 1, "weight_kg": 40, "reps": 10},
            {"exercise_key": "machine_press", "set_index": 2, "weight_kg": 40, "reps": 9},
        ],
    }
    payload.update(overrides)
    return payload


def test_health_is_open(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_users_seeded(client):
    resp = client.get("/api/users", headers=_auth())
    assert resp.status_code == 200
    ids = {u["id"] for u in resp.get_json()}
    assert ids == {"stephen", "matt"}


def test_requires_token(client):
    assert client.get("/api/users").status_code == 401
    assert client.get("/api/sessions").status_code == 401


def test_upsert_is_idempotent(client):
    sid = str(uuid.uuid4())
    first = client.put(f"/api/sessions/{sid}", json=_session_payload(), headers=_auth())
    assert first.status_code == 200

    # Replaying the same UUID must not duplicate the session or its sets.
    second = client.put(f"/api/sessions/{sid}", json=_session_payload(), headers=_auth())
    assert second.status_code == 200

    listing = client.get("/api/sessions?user=stephen", headers=_auth()).get_json()
    assert len(listing) == 1
    assert len(listing[0]["sets"]) == 2


def test_skippies_amendment_round_trips(client):
    sid = str(uuid.uuid4())
    payload = _session_payload(
        week_id="2026-W23",
        slot_id="S1_MON",
        status="LOGGED",
        skippies=True,
        skippies_confessed_at="2026-06-01T21:00:00Z",
    )
    assert client.put(f"/api/sessions/{sid}", json=payload, headers=_auth()).status_code == 200
    got = client.get("/api/sessions?user=stephen", headers=_auth()).get_json()[0]
    assert got["skippies"] is True
    assert got["week_id"] == "2026-W23"
    assert got["slot_id"] == "S1_MON"
    assert got["skippies_confessed_at"] == "2026-06-01T21:00:00Z"


def test_defaults_when_skippies_fields_absent(client):
    sid = str(uuid.uuid4())
    assert client.put(f"/api/sessions/{sid}", json=_session_payload(), headers=_auth()).status_code == 200
    got = client.get("/api/sessions?user=stephen", headers=_auth()).get_json()[0]
    assert got["skippies"] is False
    assert got["status"] == "LOGGED"


def test_upsert_validates_payload(client):
    sid = str(uuid.uuid4())
    # missing started_at
    bad = _session_payload()
    bad.pop("started_at")
    assert client.put(f"/api/sessions/{sid}", json=bad, headers=_auth()).status_code == 400
    # malformed set (non-numeric weight)
    bad2 = _session_payload(sets=[{"exercise_key": "machine_press", "set_index": 1, "weight_kg": "heavy", "reps": 8}])
    assert client.put(f"/api/sessions/{sid}", json=bad2, headers=_auth()).status_code == 400
    # duplicate set index
    dup = _session_payload(
        sets=[
            {"exercise_key": "machine_press", "set_index": 1, "weight_kg": 40, "reps": 8},
            {"exercise_key": "machine_press", "set_index": 1, "weight_kg": 42, "reps": 8},
        ]
    )
    assert client.put(f"/api/sessions/{sid}", json=dup, headers=_auth()).status_code == 400


def test_upsert_rejects_unknown_user(client):
    sid = str(uuid.uuid4())
    resp = client.put(
        f"/api/sessions/{sid}", json=_session_payload(user_id="ghost"), headers=_auth()
    )
    assert resp.status_code == 400


def test_history_is_scoped_by_user(client):
    client.put(f"/api/sessions/{uuid.uuid4()}", json=_session_payload(), headers=_auth())
    client.put(
        f"/api/sessions/{uuid.uuid4()}",
        json=_session_payload(user_id="matt", workout_key="wednesday"),
        headers=_auth(),
    )
    stephen = client.get("/api/sessions?user=stephen", headers=_auth()).get_json()
    matt = client.get("/api/sessions?user=matt", headers=_auth()).get_json()
    assert len(stephen) == 1 and stephen[0]["user_id"] == "stephen"
    assert len(matt) == 1 and matt[0]["user_id"] == "matt"


def test_download_redirects_when_configured(client, monkeypatch):
    from server.config import Config

    monkeypatch.setattr(Config, "APK_DOWNLOAD_URL", "https://example.com/bromog.apk")
    resp = client.get("/download")
    assert resp.status_code == 302
    assert resp.headers["Location"] == "https://example.com/bromog.apk"


def test_download_503_when_unconfigured(client, monkeypatch):
    from server.config import Config

    monkeypatch.setattr(Config, "APK_DOWNLOAD_URL", "")
    assert client.get("/download").status_code == 503


def test_install_page_renders(client, monkeypatch):
    from server.config import Config

    monkeypatch.setattr(Config, "APK_DOWNLOAD_URL", "https://example.com/bromog.apk")
    resp = client.get("/install")
    assert resp.status_code == 200
    assert b"Install Bromog" in resp.data


def test_coach_unconfigured_returns_503(client, monkeypatch):
    # No LLM keys in the test env -> coach is unavailable.
    monkeypatch.setattr("server.coach.Config.ANTHROPIC_API_KEY", "")
    monkeypatch.setattr("server.coach.Config.OPENAI_API_KEY", "")
    resp = client.post(
        "/api/coach", json={"kind": "session", "summary": "x"}, headers=_auth()
    )
    assert resp.status_code == 503


def test_coach_uses_llm_when_configured(client, monkeypatch):
    monkeypatch.setattr("server.coach.Config.ANTHROPIC_API_KEY", "sk-test")
    monkeypatch.setattr("server.coach.Config.OPENAI_API_KEY", "")
    monkeypatch.setattr(
        "server.coach.generate_note", lambda *a, **k: "Great work, push +2.5kg next time."
    )
    resp = client.post(
        "/api/coach",
        json={"kind": "session", "summary": "machine_press 40kg x10/9", "user_name": "Stephen"},
        headers=_auth(),
    )
    assert resp.status_code == 200
    assert "push" in resp.get_json()["note"]
