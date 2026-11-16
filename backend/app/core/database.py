import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

db_url = settings.normalized_database_url

engine_kwargs = {
    "echo": False,
}

if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # PostgreSQL / Neon configuration with resilience & connection pooling
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

try:
    engine = create_engine(db_url, **engine_kwargs)
except Exception as e:
    logger.error(f"Failed to initialize database engine for {db_url}: {e}")
    # Fallback to in-memory sqlite if connection fails completely
    engine = create_engine("sqlite:///./releaseguard.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_connection() -> dict:
    """Verifies live database connectivity and returns connection diagnostics."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "CONNECTED",
            "dialect": engine.dialect.name,
            "is_postgres": engine.dialect.name == "postgresql",
            "error": None
        }
    except Exception as e:
        logger.warning(f"Database connectivity check failed: {e}")
        return {
            "status": "DISCONNECTED",
            "dialect": engine.dialect.name,
            "is_postgres": engine.dialect.name == "postgresql",
            "error": str(e)
        }
