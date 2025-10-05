"""
Main FastAPI application entry point
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time

from app.config import get_settings
from app.database import connect_to_mongo, close_mongo_connection

# Import route modules
from app.routes import auth, reports, alerts, user, upload, map_data

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown events
    """
    # Startup
    print("🚀 Starting Samudra Sahayak API...")
    await connect_to_mongo()
    print("✅ API is ready to accept requests")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down API...")
    await close_mongo_connection()
    print("✅ API shutdown complete")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for Samudra Sahayak - Coastal Safety & Emergency Reporting System",
    version="1.0.0",
    lifespan=lifespan
)


# CORS middleware
cors_origins = settings.get_cors_origins()
print(f"🌐 CORS enabled for origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"❌ Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "detail": str(exc)}
    )


# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.0.0"
    }


# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to Samudra Sahayak API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])
app.include_router(user.router, prefix="/api/user", tags=["User"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(map_data.router, prefix="/api/map", tags=["Map"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
