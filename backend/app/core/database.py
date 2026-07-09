from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# ── Serverless-aware pooling ─────────────────────────────────────────────────
# On Vercel each warm function instance keeps its own pool, so a large pool_size
# multiplied across instances can exhaust Postgres' max_connections. Keep the
# per-instance pool small and lean on the DB provider's connection pooler
# (PgBouncer / Neon-Supabase "pooled" connection string) for scale.
#
# PERFORMANCE NOTE: the biggest latency win is putting the database in the SAME
# region as the Vercel functions and using the provider's *pooled* DATABASE_URL.
# Those are env/infra changes (no schema, no data touched) — see the summary.
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=5,            # small per-instance pool (serverless-friendly)
    max_overflow=5,         # a few extra under burst
    pool_timeout=30,        # wait up to 30s for a connection
    pool_recycle=300,       # recycle every 5 min (survives PgBouncer/idle drops)
    pool_pre_ping=True,     # validate before use → no stalls on stale connections
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
