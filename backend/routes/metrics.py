"""
SHERLOCK — Live Metrics Route
Serves real Prometheus time-series data directly to the frontend.
"""
import time
from fastapi import APIRouter, Query
from loguru import logger
from services.prometheus_client_svc import query_range, query_instant, get_all_targets

router = APIRouter(prefix="/api/metrics", tags=["Metrics"])

SERVICES = ["auth-service", "checkout-service", "recommendation-service", "payment-service"]

# Metric definitions: (promql_template, label, unit)
METRIC_QUERIES = {
    "latency_p95": (
        'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{{service="{svc}"}}[1m])) by (le)) * 1000',
        "P95 Latency (ms)", "ms"
    ),
    "error_rate": (
        'sum(rate(http_requests_total{{service="{svc}",status=~"5.."}}[1m])) / sum(rate(http_requests_total{{service="{svc}"}}[1m])) * 100',
        "Error Rate (%)", "%"
    ),
    "request_rate": (
        'sum(rate(http_requests_total{{service="{svc}"}}[1m]))',
        "Request Rate (req/s)", "req/s"
    ),
    "memory_mb": (
        'process_memory_usage_bytes{{service="{svc}"}} / 1024 / 1024',
        "Memory (MB)", "MB"
    ),
    "db_connections": (
        'db_connections_active{{service="{svc}"}}',
        "DB Connections", ""
    ),
    "queue_depth": (
        'queue_depth{{service="{svc}"}}',
        "Queue Depth", ""
    ),
    "thread_pool": (
        'thread_pool_active{{service="{svc}"}}',
        "Active Threads", ""
    ),
    "cpu_usage": (
        'process_cpu_percent{{service="{svc}"}}',
        "CPU Usage (%)", "%"
    ),
}


def _parse_range_result(result: list, metric_key: str) -> list:
    """Convert Prometheus range result to [{time, value}] array."""
    if not result:
        return []
    # Use first series (single service query)
    series = result[0]
    values = series.get("values", [])
    return [
        {"time": int(ts), "value": round(float(val), 3) if val != "NaN" else 0}
        for ts, val in values
    ]


@router.get("/live")
async def get_live_metrics(
    service: str = Query("all", description="Service name or 'all'"),
    range_minutes: int = Query(15, description="Time range in minutes"),
):
    """
    Returns real time-series Prometheus data for all metrics.
    Frontend polls this every 10s to keep charts live.
    """
    target_services = SERVICES if service == "all" else [service]
    step = "15s" if range_minutes <= 15 else "30s"
    now = int(time.time())
    start = str(now - range_minutes * 60)
    end = str(now)

    result = {}

    for svc in target_services:
        svc_data = {}
        for metric_key, (promql_template, label, unit) in METRIC_QUERIES.items():
            promql = promql_template.format(svc=svc)
            try:
                raw = await query_range(promql, start=start, end=end, step=step)
                series = _parse_range_result(raw, metric_key)
                # Get current value (last point)
                current = series[-1]["value"] if series else 0
                svc_data[metric_key] = {
                    "label": label,
                    "unit": unit,
                    "series": series,
                    "current": current,
                }
            except Exception as e:
                logger.warning(f"[Metrics] Failed {metric_key} for {svc}: {e}")
                svc_data[metric_key] = {"label": label, "unit": unit, "series": [], "current": 0}

        result[svc] = svc_data

    return {"services": result, "timestamp": now, "range_minutes": range_minutes}


@router.get("/health")
async def get_services_health():
    """
    Returns current health status for all services based on live Prometheus metrics.
    """
    statuses = {}
    now = int(time.time())
    start = str(now - 120)  # last 2 min
    end = str(now)

    for svc in SERVICES:
        try:
            err_raw = await query_range(
                f'sum(rate(http_requests_total{{service="{svc}",status=~"5.."}}[1m])) / sum(rate(http_requests_total{{service="{svc}"}}[1m])) * 100',
                start=start, end=end, step="30s"
            )
            lat_raw = await query_range(
                f'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{{service="{svc}"}}[1m])) by (le)) * 1000',
                start=start, end=end, step="30s"
            )
            err_series = _parse_range_result(err_raw, "error_rate")
            lat_series = _parse_range_result(lat_raw, "latency_p95")

            error_rate = err_series[-1]["value"] if err_series else 0
            latency = lat_series[-1]["value"] if lat_series else 0

            if error_rate > 20 or latency > 2000:
                status = "critical"
            elif error_rate > 5 or latency > 500:
                status = "degraded"
            else:
                status = "healthy"

            statuses[svc] = {
                "status": status,
                "error_rate": round(error_rate, 2),
                "latency_p95_ms": round(latency, 1),
            }
        except Exception as e:
            logger.warning(f"[Metrics] Health check failed for {svc}: {e}")
            statuses[svc] = {"status": "unknown", "error_rate": 0, "latency_p95_ms": 0}

    return {"services": statuses}
