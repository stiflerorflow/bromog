"""Optional LLM coach.

Runs server-side only — API keys never ship in the Android APK. Off the critical
logging path: the client calls these endpoints on demand (tap-to-generate), passing
a compact per-exercise trend summary it already computed locally. We keep the model
cheap (Haiku for the short per-session note, Sonnet for the less frequent weekly
review) because this is a lightweight, non-critical feature for a 3-person app.

If no ANTHROPIC_API_KEY is set we fall back to OpenAI; if neither is set the routes
return 503 and the app simply hides the coach.
"""

from __future__ import annotations

from .config import Config

SESSION_MODEL = "claude-haiku-4-5"
WEEKLY_MODEL = "claude-sonnet-4-6"

_SYSTEM = (
    "You are a concise, encouraging strength coach for a gym-logging app. "
    "Every exercise is done for exactly 2 working sets, weights are in kilograms, "
    "and the user follows a fixed 4-day split. You are given a compact summary of "
    "recent logged sets. Comment only on what the numbers show: progress, stalls "
    "(same weight and reps for 3+ sessions -> suggest a small deload or a rep/tempo "
    "change), and what to push next session. Be specific with numbers. Never invent "
    "data you were not given. No markdown headings, no emoji."
)

_GROUNDING = (
    "\n\nThe athlete trains by the framework below (their app's Knowledge base). "
    "Ground every suggestion in it and NEVER contradict it. In particular: train at "
    "RIR 1-3 (not to failure), ~60 hard sets a week is the target ceiling, two sets "
    "per exercise is deliberate, progress is slow by design (don't call normal slow "
    "muscle gain a failure), and cardio is one hard + one easy session. Use this as "
    "authoritative; the logged numbers are the evidence you interpret through it.\n\n"
    "FRAMEWORK:\n{principles}"
)


def _build_system(principles: str) -> str:
    if principles:
        return _SYSTEM + _GROUNDING.format(principles=principles)
    return _SYSTEM


def coach_available() -> bool:
    return bool(Config.ANTHROPIC_API_KEY or Config.OPENAI_API_KEY)


def _length_hint(kind: str) -> str:
    if kind == "weekly":
        return (
            "Write a short weekly review: 3-5 sentences. Call out the single best "
            "lift of the week and the one that needs attention."
        )
    return (
        "Write a 2-3 sentence note about the session just finished: one thing that "
        "went well and one concrete target for next time."
    )


def _build_prompt(kind: str, user_name: str, summary: str) -> str:
    return (
        f"Trainee: {user_name}\n\n"
        f"Recent training data:\n{summary}\n\n"
        f"{_length_hint(kind)}"
    )


def generate_note(kind: str, user_name: str, summary: str, principles: str = "") -> str:
    """Generate a coach note. `kind` is 'session' or 'weekly'."""
    prompt = _build_prompt(kind, user_name, summary)
    system = _build_system(principles)
    model = WEEKLY_MODEL if kind == "weekly" else SESSION_MODEL

    if Config.ANTHROPIC_API_KEY:
        return _anthropic(model, system, prompt)
    if Config.OPENAI_API_KEY:
        return _openai(system, prompt)
    raise RuntimeError("No LLM key configured")


def _anthropic(model: str, system: str, prompt: str) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)
    resp = client.messages.create(
        model=model,
        max_tokens=400,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return "".join(b.text for b in resp.content if b.type == "text").strip()


def _openai(system: str, prompt: str) -> str:
    from openai import OpenAI

    client = OpenAI(api_key=Config.OPENAI_API_KEY)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=400,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
    )
    return (resp.choices[0].message.content or "").strip()
