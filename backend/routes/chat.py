"""
SHERLOCK — Chat Routes
Real-time, context-aware conversational SRE Copilot.
Injects live telemetry, incident state, and metrics into every response.
"""
import json
from fastapi import APIRouter
from loguru import logger
from models.schemas import ChatRequest, ChatResponse
from services.prompt_builder import build_chat_prompt
from services.gemini_client import generate_response
from services.response_parser import parse_chat_response


router = APIRouter(prefix="/api/chat", tags=["Chat"])


async def _gather_live_context(active_incident: dict = None, incident_context: dict = None) -> dict:
    """
    Gather LIVE telemetry data from Prometheus and service health endpoints
    to inject into every chat response. This ensures the AI always has
    current, real-time data — not stale context from an old investigation.
    """
    from services.datadog_client import (
        get_logs, get_alerts, get_traces, get_metrics, get_service_health
    )
    from services.incident_engine import _prom_query, _get_service_health

    live_context = {}

    # Determine which service to focus on
    service = "auth-service"
    if active_incident:
        service = active_incident.get("service", service)

    try:
        # Fetch real-time metrics from Prometheus
        err_rate = await _prom_query(
            f'sum(rate(http_requests_total{{service="{service}",status=~"5.."}}[1m])) '
            f'/ sum(rate(http_requests_total{{service="{service}"}}[1m])) * 100'
        )
        latency_p95 = await _prom_query(
            f'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket'
            f'{{service="{service}"}}[1m])) by (le)) * 1000'
        )
        memory_mb = await _prom_query(
            f'process_memory_usage_bytes{{service="{service}"}} / 1024 / 1024'
        )
        db_conns = await _prom_query(f'db_connections_active{{service="{service}"}}')
        threads = await _prom_query(f'thread_pool_active{{service="{service}"}}')
        queue_depth = await _prom_query(f'queue_depth{{service="{service}"}}')
        cpu_pct = await _prom_query(f'process_cpu_percent{{service="{service}"}}')

        live_context["live_metrics"] = {
            "service": service,
            "error_rate_pct": round(err_rate, 2),
            "p95_latency_ms": round(latency_p95, 2),
            "memory_mb": round(memory_mb, 2),
            "db_connections_active": int(db_conns),
            "db_connections_max": 25,
            "thread_pool_active": int(threads),
            "thread_pool_max": 16,
            "queue_depth": int(queue_depth),
            "cpu_percent": round(cpu_pct, 2),
        }

        # Get live service health
        health = await _get_service_health(service)
        live_context["service_health"] = health

        # Get fresh logs, alerts, traces
        live_context["recent_logs"] = await get_logs(service=service, time_range_minutes=5, limit=10)
        live_context["active_alerts"] = await get_alerts(time_range_minutes=15)
        live_context["recent_traces"] = await get_traces(service=service, time_range_minutes=5, limit=5)

        # Also get cross-service metrics for dependency analysis
        cross_service_metrics = {}
        for svc in ["auth-service", "checkout-service", "recommendation-service", "payment-service"]:
            if svc != service:
                svc_err = await _prom_query(
                    f'sum(rate(http_requests_total{{service="{svc}",status=~"5.."}}[1m])) '
                    f'/ sum(rate(http_requests_total{{service="{svc}"}}[1m])) * 100'
                )
                svc_lat = await _prom_query(
                    f'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket'
                    f'{{service="{svc}"}}[1m])) by (le)) * 1000'
                )
                cross_service_metrics[svc] = {
                    "error_rate_pct": round(svc_err, 2),
                    "p95_latency_ms": round(svc_lat, 2),
                }
        live_context["cross_service_metrics"] = cross_service_metrics

    except Exception as e:
        logger.warning(f"[Chat] Failed to gather live context: {e}")

    return live_context


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Answer follow-up engineering questions using real-time incident context."""
    logger.info(f"[Chat] Question: {request.message[:100]}")

    # Gather LIVE telemetry data to inject into the prompt
    live_context = await _gather_live_context(
        active_incident=request.active_incident,
        incident_context=request.incident_context,
    )

    prompt = build_chat_prompt(
        message=request.message,
        incident_context=request.incident_context,
        active_incident=request.active_incident,
        previous_analysis=request.previous_analysis,
        chat_history=[m.model_dump() for m in request.chat_history],
        live_context=live_context,
    )

    system_prompt = (
        "You are SHERLOCK, an elite Senior SRE AI Copilot with 20+ years of production operations experience. "
        "You are actively assisting an engineer with a REAL production incident. "
        "You have access to LIVE Prometheus metrics, service health data, real logs, and traces. "
        "Be analytical, conversational, and cite SPECIFIC numbers and service names. "
        "Never give generic answers — always reference the actual data you've been given. "
        "Return JSON with 'answer' (your detailed, contextual response) and 'suggested_followups' (array of 3 relevant follow-up questions)."
    )

    raw = await generate_response(system_prompt, prompt)

    parsed = parse_chat_response(raw)
    return ChatResponse(
        answer=parsed.get("answer", raw),
        suggested_followups=parsed.get("suggested_followups", [
            "What metrics should I monitor to prevent this?",
            "Can you show me the exact timeline again?",
            "What similar incidents have occurred before?",
        ]),
    )
