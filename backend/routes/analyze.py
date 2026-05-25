"""
SHERLOCK — Analyze Routes
Streaming AI-powered incident analysis endpoint.
"""
import json
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from loguru import logger
from services.telemetry_aggregator import aggregate_telemetry
from services.prompt_builder import build_analysis_prompt, SYSTEM_PROMPT
from services.gemini_client import stream_analysis
from services.response_parser import parse_analysis_response

router = APIRouter(prefix="/api/analyze", tags=["Analysis"])


@router.post("/stream")
async def stream_investigate(
    service: str = Query("auth-service", description="Service to investigate"),
    scenario: str = Query("db_exhaustion", description="Incident scenario"),
    time_range: int = Query(15, description="Time range in minutes"),
):
    """
    Stream AI investigation results via SSE.
    This is the CORE endpoint — it pulls real telemetry, feeds it to Gemini,
    and streams the AI's reasoning live to the frontend.
    """
    logger.info(f"[Analyze] Starting investigation: service={service} scenario={scenario}")

    async def event_stream():
        # Phase 1: Collect telemetry
        yield f"data: {json.dumps({'type': 'status', 'content': 'Emitting probes and waiting for metrics to converge...'})}\n\n"
        import asyncio
        await asyncio.sleep(4.0)  # Wait 4s for Prometheus scrape cycle and traffic convergence

        yield f"data: {json.dumps({'type': 'status', 'content': 'Collecting real-time telemetry from Prometheus, Grafana, and service endpoints...'})}\n\n"

        try:
            context = await aggregate_telemetry(service=service, scenario=scenario, time_range_minutes=time_range)
        except Exception as e:
            logger.error(f"[Analyze] Telemetry collection failed: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': f'Telemetry collection failed: {str(e)}'})}\n\n"
            return

        # Send telemetry summary
        yield f"data: {json.dumps({'type': 'telemetry', 'content': context.get('telemetry_summary', {})})}\n\n"

        # Phase 2: Build prompt
        yield f"data: {json.dumps({'type': 'status', 'content': 'Building investigation context for AI analysis...'})}\n\n"
        user_prompt = build_analysis_prompt(context)

        # Phase 3: Stream AI reasoning
        yield f"data: {json.dumps({'type': 'status', 'content': 'SHERLOCK AI is investigating... Streaming live reasoning:'})}\n\n"

        full_response = ""
        async for token in stream_analysis(SYSTEM_PROMPT, user_prompt):
            full_response += token
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        # Phase 4: Parse structured result
        yield f"data: {json.dumps({'type': 'status', 'content': 'Parsing structured analysis...'})}\n\n"
        result = parse_analysis_response(full_response)

        if result:
            result["scenario"] = scenario
            yield f"data: {json.dumps({'type': 'done', 'result': result, 'telemetry_context': context.get('telemetry_summary', {})})}\n\n"
        else:
            yield f"data: {json.dumps({'type': 'error', 'content': 'Failed to parse structured analysis'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.get("/telemetry")
async def get_telemetry(
    service: str = Query("auth-service"),
    scenario: str = Query("db_exhaustion"),
    time_range: int = Query(15),
):
    """Get raw telemetry context without AI analysis."""
    context = await aggregate_telemetry(service=service, scenario=scenario, time_range_minutes=time_range)
    return context
