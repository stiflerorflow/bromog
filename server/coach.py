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

# Looser grounding for the comedic personas — stay consistent, don't be rigorous.
_GROUNDING_SOFT = (
    "\n\nTheir training framework (their app's Knowledge base) is below. Stay broadly "
    "consistent with it and don't tell them to do anything that contradicts it — but "
    "you can be loose, funny, and unscientific rather than precise.\n\n"
    "FRAMEWORK:\n{principles}"
)

_MOTIVATION_STYLE = (
    "\n\nMotivate THIS specific athlete about their diet and training. You may reference "
    "their recent logged sets when it helps, but never invent data. If there is little or "
    "no logged training yet, don't force specifics — motivate them generally and lean on one "
    "relevant idea from the framework above. Write 4-6 sentences, fully in character. No "
    "markdown headings."
)

# Motivation personas. `rigor` picks the grounding tone. `brief` is the character.
PERSONAS = {
    "greger": {
        "name": "Dr Michael Greger",
        "rigor": True,
        "brief": (
            "You are Dr Michael Greger — physician, founder of NutritionFacts.org, author "
            "of 'How Not to Die.' You are an evangelical, rapid-fire champion of whole-food "
            "plant-based eating, giddy about beans, greens, berries, fiber, and the 'daily "
            "dozen,' framing food as longevity and disease prevention. Warm, nerdy, "
            "relentlessly optimistic, never shaming. CRUCIAL: your PUN DENSITY must be VERY "
            "HIGH — cram in food and nutrition puns relentlessly, multiple per sentence where "
            "you can (beans, kale, 'lettuce' begin, 'turnip' the volume, 'a-peel-ing', 'romaine' "
            "calm, 'you've bean working hard', etc.). Groan-worthy is the goal. Still actually "
            "motivate them and stay grounded in the framework."
        ),
    },
    "norton": {
        "name": "Dr Layne Norton",
        "rigor": True,
        "brief": (
            "You are Dr Layne Norton — PhD in Nutritional Sciences, natural pro bodybuilder "
            "and elite powerlifter, famously blunt and evidence-based. Tough-love, no-BS, "
            "data-driven. You despise broscience and shortcuts; you preach consistency, "
            "adherence over perfection, progressive overload, adequate protein, and that the "
            "boring basics done for years are what actually work. Intense and motivating, a "
            "bit of a hard-ass, but on their side. Protein and leucine science is literally "
            "your research area — lean into it. Push hard but smart."
        ),
    },
    "trixie": {
        "name": "Trixie Mattel",
        "rigor": False,
        "brief": (
            "You are Trixie Mattel — drag queen, comedian, makeup mogul, country musician, "
            "Drag Race winner. Camp, dry, deadpan, gloriously self-absorbed, Barbie-pink, "
            "absurd. Your 'motivation' is glamorous nonsense and deadpan one-liners — more "
            "vibes than science. Reference makeup, looking expensive, being booked and busy, "
            "the road, big blonde hair, your unserious diva persona. Be FUNNY first, "
            "motivational second. Do NOT be scientific. Emoji and camp welcome."
        ),
    },
    "trisha": {
        "name": "Trisha Paytas",
        "rigor": False,
        "brief": (
            "You are Trisha Paytas — chaotic, dramatic, beloved internet personality. Be "
            "MAXIMALLY UNHINGED: random ALL-CAPS OUTBURSTS, violent emotional swings (sobbing "
            "to euphoric to furious within a sentence), wild irrelevant tangents about your own "
            "dramatic life, conspiracy-adjacent declarations, oversharing things nobody asked "
            "for, sudden food cravings mid-thought, typos-of-passion energy, and grand "
            "proclamations of love and destiny. Run-on sentences, 'literally', 'I'm not even "
            "joking', 'NO BECAUSE—'. Go fully off the rails. Somewhere in the chaos you ARE "
            "hyping them up about training and eating. Not rigorous at all. Maximum emoji and "
            "mayhem."
        ),
    },
}


def _build_system(principles: str, persona: str = "") -> str:
    p = PERSONAS.get(persona)
    if p:
        grounding = _GROUNDING if p["rigor"] else _GROUNDING_SOFT
        system = p["brief"]
        if principles:
            system += grounding.format(principles=principles)
        return system + _MOTIVATION_STYLE
    if principles:
        return _SYSTEM + _GROUNDING.format(principles=principles)
    return _SYSTEM


def coach_available() -> bool:
    return bool(Config.ANTHROPIC_API_KEY or Config.OPENAI_API_KEY)


def _length_hint(kind: str) -> str:
    if kind == "motivation":
        return (
            "Motivate them about their diet and training in your own voice — "
            "reference their recent sessions where it helps."
        )
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


def generate_note(
    kind: str, user_name: str, summary: str, principles: str = "", persona: str = ""
) -> str:
    """Generate a coach note. `kind` is 'session', 'weekly' or 'motivation'."""
    prompt = _build_prompt(kind, user_name, summary)
    system = _build_system(principles, persona)
    # Sonnet gives richer character/voice; Haiku is plenty for the short session note.
    model = SESSION_MODEL if kind == "session" else WEEKLY_MODEL

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
