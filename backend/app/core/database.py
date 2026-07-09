from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import settings

# ── Serverless + external pooler (Supabase/PgBouncer) ────────────────────────
# On Vercel, many function instances each keep their own SQLAlchemy pool. Behind
# Supabase's pooler (capped at ~15 clients in session mode) those held
# connections quickly exhaust the limit → "max clients reached" 500s.
#
# Fix: NullPool — SQLAlchemy holds NO connections; each request opens one and
# hands it straight back to the external pooler when done. Let Supabase's pooler
# do the pooling. Pair this with the *transaction* pooler URL (port 6543) for
# both scale and speed (see the deploy note). No schema/data changes.
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
