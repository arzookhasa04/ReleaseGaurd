import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal, get_db
from app.engines.state_machine import InvalidStateTransitionError
from app.services.demo_seeder import seed_demo_data
from app.adapters.prometheus_exporter import get_prometheus_metrics_output
from app.adapters.kubernetes import KubernetesAdapter

# Import API Routers
from app.api.services import router as services_router
from app.api.deployments import router as deployments_router
from app.api.slo import router as slo_router
from app.api.metrics import router as metrics_router
from app.api.incidents import router as incidents_router
from app.api.chaos import router as chaos_router
from app.api.audit import router as audit_router
from app.api.ai import router as ai_router
from app.api.demo import router as demo_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("releaseguard")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables and seed demo dataset
    logger.info("Initializing ReleaseGuard AI Database Tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_data(db, force=False)
        logger.info("Demo dataset verified and ready.")
    finally:
        db.close()
    yield
    # Shutdown logic if any
    logger.info("Shutting down ReleaseGuard AI platform.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SLO-Aware Deployment & Automated Recovery Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
@app.exception_handler(InvalidStateTransitionError)
async def invalid_state_transition_handler(request: Request, exc: InvalidStateTransitionError):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "INVALID_STATE_TRANSITION",
            "message": str(exc),
            "current_state": exc.current_state,
            "target_state": exc.target_state
        }
    )

# Routers
app.include_router(services_router, prefix=settings.API_V1_STR)
app.include_router(deployments_router, prefix=settings.API_V1_STR)
app.include_router(slo_router, prefix=settings.API_V1_STR)
app.include_router(metrics_router, prefix=settings.API_V1_STR)
app.include_router(incidents_router, prefix=settings.API_V1_STR)
app.include_router(chaos_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(demo_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    cluster_status = KubernetesAdapter.get_cluster_status()
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "infrastructure": cluster_status
    }

@app.get("/metrics")
def prometheus_metrics(db: Session = Depends(get_db)):
    metrics_data = get_prometheus_metrics_output(db)
    return Response(content=metrics_data, media_type=CONTENT_TYPE_LATEST)
