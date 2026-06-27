"""
SHERLOCK — FastAPI Backend
AI-Powered Autonomous Incident Investigation Platform
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from loguru import logger

load_dotenv()

# Configure loguru — file logging only if writable (skips on Vercel serverless)
try:
    import pathlib
    pathlib.Path("logs").mkdir(exist_ok=True)
    logger.add("logs/sherlock.log", rotation="50 MB", level="DEBUG",
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level:<8} | {name}:{function}:{line} | {message}")
except Exception:
    pass  # Vercel read-only filesystem — console logging only

app = FastAPI(
    title="SHERLOCK — AI Incident Investigation Platform",
    description="Autonomous SRE copilot that correlates telemetry and performs AI-powered root cause analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Import and register routes
from routes.analyze import router as analyze_router
from routes.chat import router as chat_router
from routes.scenarios import router as scenarios_router
from routes.runbook import router as runbook_router
from routes.metrics import router as metrics_router
from routes.incidents import router as incidents_router

app.include_router(analyze_router)
app.include_router(chat_router)
app.include_router(scenarios_router)
app.include_router(runbook_router)
app.include_router(metrics_router)
app.include_router(incidents_router)


@app.get("/")
async def root():
    return {
        "name": "SHERLOCK",
        "version": "1.0.0",
        "description": "AI-Powered Autonomous Incident Investigation Platform",
        "status": "operational",
        "endpoints": {
            "analyze": "/api/analyze/stream",
            "chat": "/api/chat",
            "scenarios": "/api/scenarios",
            "runbook": "/api/runbook",
            "telemetry": "/api/analyze/telemetry",
        },
    }


@app.get("/health")
async def health():
    gemini_configured = bool(os.getenv("GEMINI_API_KEY", "")) and os.getenv("GEMINI_API_KEY") != "your_gemini_api_key_here"
    dd_configured = bool(os.getenv("DD_API_KEY", "")) and os.getenv("DD_API_KEY") != "your_datadog_api_key_here"
    return {
        "status": "healthy",
        "gemini_configured": gemini_configured,
        "datadog_configured": dd_configured,
        "grafana_url": os.getenv("GRAFANA_URL", "not set"),
        "prometheus_url": os.getenv("PROMETHEUS_URL", "not set"),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
