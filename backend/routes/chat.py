"""
SHERLOCK — Chat Routes
Real-time, context-aware conversational SRE Copilot.
Injects live telemetry, incident state, and metrics into every response.
"""
import json
import asyncio
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
        # Define all concurrent tasks
        tasks = {
            "err_rate": _prom_query(f'sum(rate(http_requests_total{{service="{service}",status=~"5.."}}[1m])) / sum(rate(http_requests_total{{service="{service}"}}[1m])) * 100'),
            "latency_p95": _prom_query(f'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{{service="{service}"}}[1m])) by (le)) * 1000'),
            "memory_mb": _prom_query(f'process_memory_usage_bytes{{service="{service}"}} / 1024 / 1024'),
            "db_conns": _prom_query(f'db_connections_active{{service="{service}"}}'),
            "threads": _prom_query(f'thread_pool_active{{service="{service}"}}'),
            "queue_depth": _prom_query(f'queue_depth{{service="{service}"}}'),
            "cpu_pct": _prom_query(f'process_cpu_percent{{service="{service}"}}'),
            "health": _get_service_health(service),
            "recent_logs": get_logs(service=service, time_range_minutes=5, limit=10),
            "active_alerts": get_alerts(time_range_minutes=15),
            "recent_traces": get_traces(service=service, time_range_minutes=5, limit=5),
        }
        
        # Cross-service metrics tasks
        cross_services = ["auth-service", "checkout-service", "recommendation-service", "payment-service"]
        for svc in cross_services:
            if svc != service:
                tasks[f"cross_err_{svc}"] = _prom_query(f'sum(rate(http_requests_total{{service="{svc}",status=~"5.."}}[1m])) / sum(rate(http_requests_total{{service="{svc}"}}[1m])) * 100')
                tasks[f"cross_lat_{svc}"] = _prom_query(f'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{{service="{svc}"}}[1m])) by (le)) * 1000')

        # Run all concurrently
        keys = list(tasks.keys())
        results = await asyncio.gather(*[tasks[k] for k in keys], return_exceptions=True)
        res_dict = {k: v for k, v in zip(keys, results) if not isinstance(v, Exception)}

        # Extract values with fallbacks
        err_rate = res_dict.get("err_rate", 0.0)
        latency_p95 = res_dict.get("latency_p95", 0.0)
        memory_mb = res_dict.get("memory_mb", 0.0)
        db_conns = res_dict.get("db_conns", 0.0)
        threads = res_dict.get("threads", 0.0)
        queue_depth = res_dict.get("queue_depth", 0.0)
        cpu_pct = res_dict.get("cpu_pct", 0.0)

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

        live_context["service_health"] = res_dict.get("health", {})
        live_context["recent_logs"] = res_dict.get("recent_logs", [])
        live_context["active_alerts"] = res_dict.get("active_alerts", [])
        live_context["recent_traces"] = res_dict.get("recent_traces", [])

        cross_service_metrics = {}
        for svc in cross_services:
            if svc != service:
                cross_service_metrics[svc] = {
                    "error_rate_pct": round(res_dict.get(f"cross_err_{svc}", 0.0), 2),
                    "p95_latency_ms": round(res_dict.get(f"cross_lat_{svc}", 0.0), 2),
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
