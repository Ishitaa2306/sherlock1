"""
SHERLOCK — Live Incidents Route
Returns dynamically detected incidents from the real-time anomaly engine.
NO hardcoded incidents. Every incident comes from live Prometheus data.
"""
from fastapi import APIRouter
from loguru import logger
from services.incident_engine import detect_incidents, get_raw_metrics

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


@router.get("")
async def get_live_incidents():
    """
    GET /api/incidents
    Returns live incidents detected from real Prometheus metrics.
    Frontend polls this every 8 seconds.
    """
    incidents = await detect_incidents()
    return {"incidents": incidents, "count": len(incidents)}


@router.get("/metrics")
async def get_debug_metrics():
    """
    GET /api/incidents/metrics
    Returns raw Prometheus metric values for debugging.
    """
    metrics = await get_raw_metrics()
    return {"metrics": metrics}
