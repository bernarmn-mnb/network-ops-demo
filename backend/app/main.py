"""
FastAPI Backend for Elastic Demo Starter

This backend acts as a proxy between the frontend and Elastic Agent Builder,
keeping API keys secure while enabling SSE streaming.

Architecture:
Frontend (Vite/React) <-> Backend (FastAPI) <-> Elastic Agent Builder (Kibana)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .otel import init_otel
from .routes.agent import router as agent_router
from .routes.audit import router as audit_router
from .routes.branding import router as branding_router
from .routes.mcp import router as mcp_router
from .routes.a2a import router as a2a_router
from .routes.search_simple import router as search_simple_router
from .routes.search import router as search_router
from .routes.search_fields import router as search_fields_router
from .routes.analytics import router as analytics_router
from .routes.tracking import router as tracking_router

# Create FastAPI application
app = FastAPI(
    title="Elastic Agent API",
    description="Backend proxy for Elastic Agent Builder",
    version="1.0.0",
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenTelemetry (if configured)
init_otel(app)

# Register routes
app.include_router(agent_router)
app.include_router(audit_router)
app.include_router(branding_router)
app.include_router(mcp_router)
app.include_router(a2a_router)

# Search & Analytics routes (requires Elasticsearch connection)
app.include_router(search_simple_router)
app.include_router(search_router)
app.include_router(search_fields_router)
app.include_router(analytics_router)
app.include_router(tracking_router)


@app.get("/")
async def root():
    """Root endpoint - basic API info."""
    return {
        "name": "Elastic Agent API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/agent/health",
    }


@app.get("/health")
async def health():
    """Global health check."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )

