"""
SHERLOCK — Scenario Routes
List, trigger, and reset incident scenarios.
"""
from fastapi import APIRouter, Query
from loguru import logger
from services.incident_simulator import (
    list_scenarios, trigger_scenario, reset_all_scenarios, get_service_statuses
)

router = APIRouter(prefix="/api/scenarios", tags=["Scenarios"])


@router.get("")
async def get_scenarios():
    """List all available incident scenarios."""
    return {"scenarios": list_scenarios()}


@router.post("/trigger")
async def trigger(scenario_id: str = Query(..., description="Scenario to trigger")):
    """Trigger an incident scenario on demo services."""
    logger.info(f"[Scenarios] Triggering: {scenario_id}")
    result = await trigger_scenario(scenario_id)
    return result


@router.post("/reset")
async def reset():
    """Reset all chaos/failure modes on all services."""
    logger.info("[Scenarios] Resetting all scenarios")
    result = await reset_all_scenarios()
    return result


@router.get("/status")
async def service_status():
    """Check health status of all demo services."""
    statuses = await get_service_statuses()
    return {"services": statuses}
