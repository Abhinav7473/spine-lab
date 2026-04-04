from sqlalchemy import (
    Boolean, Column, Date, Float, ForeignKey,
    Integer, String, Text, TIMESTAMP
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class Paper(Base):
    __tablename__ = "papers"

    id           = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    arxiv_id     = Column(String(20), unique=True, nullable=False)
    title        = Column(Text, nullable=False)
    abstract     = Column(Text)
    authors      = Column(ARRAY(Text))
    categories   = Column(ARRAY(Text))
    published_at = Column(Date)
    page_count   = Column(Integer)
    fetched_at   = Column(TIMESTAMP(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id           = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    seed_topics  = Column(ARRAY(Text), nullable=False)
    created_at   = Column(TIMESTAMP(timezone=True), server_default=func.now())


class UserAccess(Base):
    """Access codes that gate entry to the app. role='dev' grants admin access."""
    __tablename__ = "user_access"

    id         = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    code       = Column(String(64), unique=True, nullable=False)
    role       = Column(String(10), nullable=False, default="user")  # 'dev' | 'user'
    label      = Column(Text)
    used_at    = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())


class ReadingSession(Base):
    __tablename__ = "reading_sessions"

    id                    = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id               = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    paper_id              = Column(UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    started_at            = Column(TIMESTAMP(timezone=True), server_default=func.now())
    ended_at              = Column(TIMESTAMP(timezone=True))
    stayed_in_app         = Column(Boolean, nullable=False, default=True)
    reached_past_abstract = Column(Boolean, nullable=False, default=False)


class ReadingEvent(Base):
    __tablename__ = "reading_events"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    session_id  = Column(UUID(as_uuid=True), ForeignKey("reading_sessions.id", ondelete="CASCADE"), nullable=False)
    event_type  = Column(String(30), nullable=False)
    section     = Column(String(100))
    occurred_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    payload     = Column(JSONB)


class PaperSignal(Base):
    __tablename__ = "paper_signals"

    user_id          = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    paper_id         = Column(UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"), primary_key=True)
    total_dwell_secs = Column(Integer, nullable=False, default=0)
    max_scroll_depth = Column(Float, nullable=False, default=0)
    sections_visited = Column(ARRAY(Text), nullable=False, default=list)
    stayed_in_app    = Column(Boolean, nullable=False, default=True)
    signal_score     = Column(Float)
    last_read_at     = Column(TIMESTAMP(timezone=True), server_default=func.now())


class SectionSignal(Base):
    """Per (user, paper, section) dwell aggregation. Written on session close."""
    __tablename__ = "section_signals"

    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    paper_id    = Column(UUID(as_uuid=True), ForeignKey("papers.id", ondelete="CASCADE"), primary_key=True)
    section     = Column(String(100), primary_key=True)
    dwell_secs  = Column(Integer, nullable=False, default=0)
    visit_count = Column(Integer, nullable=False, default=0)
