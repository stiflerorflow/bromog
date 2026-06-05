"""HTTP API.

The phone is the live source of truth during a workout; these endpoints back up
finished sessions and power the optional coach. Writes/reads are guarded by a shared
bearer token (APP_TOKEN) so the public App Service URL is not wide open.
"""

from __future__ import annotations

import hmac
from functools import wraps

from flask import Blueprint, current_app, jsonify, request

from . import coach
from .config import Config
from .models import SetEntry, User, WorkoutSession

api = Blueprint("api", __name__, url_prefix="/api")


def _session_factory():
    return current_app.config["DB_SESSION"]


def require_token(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if Config.APP_TOKEN:
            header = request.headers.get("Authorization", "")
            token = header[7:] if header.startswith("Bearer ") else ""
            if not hmac.compare_digest(token, Config.APP_TOKEN):
                return jsonify({"error": "unauthorized"}), 401
        return fn(*args, **kwargs)

    return wrapper


@api.get("/health")
def health():
    return jsonify({"status": "ok"})


@api.get("/users")
@require_token
def list_users():
    Session = _session_factory()
    with Session() as s:
        users = s.query(User).order_by(User.id).all()
        return jsonify([u.to_dict() for u in users])


@api.put("/sessions/<session_id>")
@require_token
def upsert_session(session_id: str):
    """Idempotent upsert of a finished session by client UUID.

    Safe to retry from the offline queue — replaying the same UUID replaces the
    record's sets rather than duplicating them.
    """
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    workout_key = data.get("workout_key")
    started_at = data.get("started_at")
    if not user_id or not workout_key or not started_at:
        return jsonify({"error": "user_id, workout_key and started_at are required"}), 400

    # Validate the sets payload up front so a malformed body is a clean 400, not a 500.
    raw_sets = data.get("sets", [])
    if not isinstance(raw_sets, list):
        return jsonify({"error": "sets must be a list"}), 400
    parsed_sets = []
    seen = set()
    for entry in raw_sets:
        try:
            exercise_key = str(entry["exercise_key"])
            set_index = int(entry["set_index"])
            weight_kg = float(entry["weight_kg"])
            reps = int(entry["reps"])
        except (KeyError, TypeError, ValueError):
            return jsonify({"error": "each set needs exercise_key, set_index, weight_kg, reps"}), 400
        if set_index not in (1, 2) or not (0 <= weight_kg <= 2000) or not (0 <= reps <= 1000):
            return jsonify({"error": "set values out of range"}), 400
        key = (exercise_key, set_index)
        if key in seen:
            return jsonify({"error": f"duplicate set {key}"}), 400
        seen.add(key)
        parsed_sets.append(
            {
                "exercise_key": exercise_key,
                "set_index": set_index,
                "weight_kg": weight_kg,
                "reps": reps,
                "done_at": entry.get("done_at"),
            }
        )

    Session = _session_factory()
    with Session() as s:
        if s.get(User, user_id) is None:
            return jsonify({"error": f"unknown user {user_id}"}), 400

        ws = s.get(WorkoutSession, session_id)
        if ws is None:
            ws = WorkoutSession(id=session_id, user_id=user_id, workout_key=workout_key)
            s.add(ws)
        else:
            ws.user_id = user_id
            ws.workout_key = workout_key
        ws.week_id = data.get("week_id")
        ws.slot_id = data.get("slot_id")
        ws.started_at = started_at
        ws.finished_at = data.get("finished_at")
        status = data.get("status") or "LOGGED"
        ws.status = status if status in ("LOGGED", "PARTIAL") else "LOGGED"
        ws.skippies = bool(data.get("skippies", False))
        ws.skippies_confessed_at = data.get("skippies_confessed_at")

        # Replace sets wholesale (immutable record; replay = same content).
        ws.sets.clear()
        s.flush()
        for entry in parsed_sets:
            ws.sets.append(SetEntry(**entry))
        s.commit()
        return jsonify(ws.to_dict()), 200


@api.get("/sessions")
@require_token
def list_sessions():
    """Full history for a user — used to restore local state after a reinstall."""
    user_id = request.args.get("user")
    Session = _session_factory()
    with Session() as s:
        q = s.query(WorkoutSession)
        if user_id:
            q = q.filter(WorkoutSession.user_id == user_id)
        sessions = q.order_by(WorkoutSession.started_at.desc()).all()
        return jsonify([ws.to_dict() for ws in sessions])


@api.post("/coach")
@require_token
def coach_note():
    """Generate an optional coach note from a client-supplied trend summary."""
    if not coach.coach_available():
        return jsonify({"error": "coach not configured"}), 503

    data = request.get_json(silent=True) or {}
    kind = data.get("kind", "session")
    if kind not in ("session", "weekly", "motivation"):
        return jsonify({"error": "kind must be 'session', 'weekly' or 'motivation'"}), 400
    summary = (data.get("summary") or "").strip()
    user_name = data.get("user_name") or "Athlete"
    principles = (data.get("principles") or "").strip()
    persona = (data.get("persona") or "").strip()
    if not summary:
        # Motivation still works with no history — it leans on the framework instead.
        if kind == "motivation":
            summary = "No training has been logged yet."
        else:
            return jsonify({"error": "summary is required"}), 400

    try:
        note = coach.generate_note(kind, user_name, summary, principles, persona)
    except Exception:  # surface upstream failures without leaking internals
        current_app.logger.exception("coach generation failed")
        return jsonify({"error": "coach generation failed"}), 502
    return jsonify({"note": note})
