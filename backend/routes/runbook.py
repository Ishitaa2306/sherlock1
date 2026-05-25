"""
SHERLOCK — Runbook Routes
Generate automated incident response runbooks.
"""
from fastapi import APIRouter
from loguru import logger
from services.runbook_generator import generate_runbook

router = APIRouter(prefix="/api/runbook", tags=["Runbook"])


@router.post("")
async def create_runbook(analysis: dict, service: str = "auth-service"):
    """Generate an automated incident response runbook from analysis results."""
    logger.info(f"[Runbook] Generating for service={service}")
    runbook = await generate_runbook(analysis=analysis, service=service)
    return runbook
