"""Database models.

The phone is the live source of truth during a workout; the backend stores
immutable, finished sessions for backup/restore and to power the LLM coach.
A session is identified by a client-generated UUID so re-sending it (e.g. when
the offline queue flushes) is idempotent.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    create_engine,
    inspect,
    text,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    sessionmaker,
)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # slug e.g. "stephen"
    name: Mapped[str] = mapped_column(String, nullable=False)

    def to_dict(self) -> dict:
        return {"id": self.id, "name": self.name}


class WorkoutSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # client UUID
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), index=True)
    workout_key: Mapped[str] = mapped_column(String, nullable=False)
    week_id: Mapped[str | None] = mapped_column(String, nullable=True)
    slot_id: Mapped[str | None] = mapped_column(String, nullable=True)
    started_at: Mapped[str] = mapped_column(String, nullable=False)  # ISO-8601
    finished_at: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="LOGGED")  # LOGGED | PARTIAL
    skippies: Mapped[bool] = mapped_column(Boolean, default=False)
    skippies_confessed_at: Mapped[str | None] = mapped_column(String, nullable=True)
    synced_at: Mapped[str] = mapped_column(
        String, default=lambda: datetime.now(timezone.utc).isoformat()
    )

    sets: Mapped[list["SetEntry"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="SetEntry.exercise_key, SetEntry.set_index",
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "workout_key": self.workout_key,
            "week_id": self.week_id,
            "slot_id": self.slot_id,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "status": self.status,
            "skippies": self.skippies,
            "skippies_confessed_at": self.skippies_confessed_at,
            "sets": [s.to_dict() for s in self.sets],
        }


class SetEntry(Base):
    __tablename__ = "set_entries"
    __table_args__ = (
        UniqueConstraint("session_id", "exercise_key", "set_index", name="uq_set"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String, ForeignKey("sessions.id", ondelete="CASCADE"), index=True
    )
    exercise_key: Mapped[str] = mapped_column(String, nullable=False)
    set_index: Mapped[int] = mapped_column(Integer, nullable=False)  # 1 or 2
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    reps: Mapped[int] = mapped_column(Integer, nullable=False)
    done_at: Mapped[str | None] = mapped_column(String, nullable=True)

    session: Mapped[WorkoutSession] = relationship(back_populates="sets")

    def to_dict(self) -> dict:
        return {
            "exercise_key": self.exercise_key,
            "set_index": self.set_index,
            "weight_kg": self.weight_kg,
            "reps": self.reps,
            "done_at": self.done_at,
        }


# Hardcoded roster. Kept here so the DB is seeded consistently; the app's
# user switch lives client-side in web/src/data/program.ts.
SEED_USERS = [
    {"id": "stephen", "name": "Stephen"},
    {"id": "matt", "name": "Matt"},
]


def make_engine(database_url: str):
    # Neon's dashboard hands out `postgres://` URLs, which SQLAlchemy 2.0 no longer
    # recognises as a dialect — normalise to `postgresql://`.
    if database_url.startswith("postgres://"):
        database_url = "postgresql://" + database_url[len("postgres://") :]

    connect_args = {}
    kwargs = {"future": True}
    if database_url.startswith("sqlite"):
        # Flask serves requests across threads; allow the connection to be shared.
        connect_args["check_same_thread"] = False
    else:
        # Postgres (e.g. Neon): validate pooled connections and recycle them so a
        # server-idled connection is replaced instead of raising mid-request.
        kwargs["pool_pre_ping"] = True
        kwargs["pool_recycle"] = 300
    return create_engine(database_url, connect_args=connect_args, **kwargs)


# Columns added after v1 (the Skippies feature). create_all() won't add these to an
# existing table, so we patch them in additively at startup — a tiny migration that
# keeps a pre-existing SQLite/Postgres DB from crashing on the new ORM queries.
_ADDED_SESSION_COLUMNS = {
    "week_id": "VARCHAR",
    "slot_id": "VARCHAR",
    "status": "VARCHAR",
    "skippies": "BOOLEAN",
    "skippies_confessed_at": "VARCHAR",
}


def _ensure_session_columns(engine) -> None:
    insp = inspect(engine)
    if "sessions" not in insp.get_table_names():
        return  # create_all will make it fresh with every column
    existing = {c["name"] for c in insp.get_columns("sessions")}
    missing = {n: t for n, t in _ADDED_SESSION_COLUMNS.items() if n not in existing}
    if not missing:
        return
    with engine.begin() as conn:
        for name, sqltype in missing.items():
            conn.execute(text(f"ALTER TABLE sessions ADD COLUMN {name} {sqltype}"))


def init_db(engine) -> sessionmaker:
    Base.metadata.create_all(engine)
    _ensure_session_columns(engine)
    Session = sessionmaker(bind=engine, future=True, expire_on_commit=False)
    with Session() as s:
        for u in SEED_USERS:
            if s.get(User, u["id"]) is None:
                s.add(User(**u))
        s.commit()
    return Session
