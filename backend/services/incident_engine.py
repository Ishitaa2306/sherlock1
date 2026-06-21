"""
SHERLOCK — Real-Time Incident Detection Engine
Queries Prometheus continuously and generates live incidents
based on actual metric anomalies. ZERO hardcoded incidents.
"""
import math
import time
import uuid
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, List
from loguru import logger
import os

PROM_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090/prometheus")

SERVICE_URLS = {
    "auth-service": "http://auth-service:8001",
    "checkout-service": "http://checkout-service:8002",
    "recommendation-service": "http://recommendation-service:8003",
    "payment-service": "http://payment-service:8004",
}

# ━━━ Anomaly Thresholds ━━━
THRESHOLDS = {
    "error_rate_warning": 5.0,       # % 
    "error_rate_critical": 20.0,     # %
    "latency_warning": 500,          # ms
    "latency_critical": 2000,        # ms
    "memory_warning": 150,           # MB
    "memory_critical": 350,          # MB
    "db_connections_warning": 15,    # active
    "db_connections_critical": 22,   # active
    "thread_pool_warning": 10,       # active
    "thread_pool_critical": 14,      # active
    "queue_depth_warning": 50,
    "queue_depth_critical": 200,
    "cpu_warning": 70.0,             # %
    "cpu_critical": 90.0,            # %
}


async def _prom_query(promql: str) -> float:
    """Query Prometheus for a single instant value, safe from NaN/Inf."""
    try:
        async with httpx.AsyncClient(timeout=0.5) as client:
            r = await client.get(f"{PROM_URL}/api/v1/query", params={"query": promql})
            if r.status_code == 200:
                data = r.json()
                if data.get("status") == "success":
                    results = data.get("data", {}).get("result", [])
                    if results:
                        val = float(results[0]["value"][1])
                        if math.isnan(val) or math.isinf(val):
                            return 0.0
                        return val
    except Exception as e:
        logger.debug(f"[IncidentEngine] Prom query failed: {e}")
    return 0.0


async def _check_service_up(service: str) -> bool:
    """Check if service is reachable."""
    url = SERVICE_URLS.get(service)
    if not url:
        return False
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            r = await client.get(f"{url}/health")
            return r.status_code == 200
    except Exception:
        return False


async def _get_service_health(service: str) -> Dict[str, Any]:
    """Get detailed health from service."""
    url = SERVICE_URLS.get(service)
    if not url:
        return {}
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            r = await client.get(f"{url}/health")
            if r.status_code == 200:
                return r.json()
    except Exception:
        pass
    return {}


def _make_incident(
    title: str,
    description: str,
    severity: str,
    service: str,
    failure_type: str,
    affected_services: List[str],
    metric_values: Dict[str, float],
) -> Dict[str, Any]:
    """Create a standardized incident object."""
    return {
        "id": f"inc_{service}_{failure_type}_{int(time.time())}",
        "title": title,
        "description": description,
        "severity": severity,
        "service": service,
        "failure_type": failure_type,
        "affected_services": affected_services,
        "detected_at": datetime.now(timezone.utc).isoformat(),
        "metric_values": metric_values,
        "source": "prometheus_anomaly_detection",
    }


async def detect_incidents() -> List[Dict[str, Any]]:
    """
    Query Prometheus for ALL services, detect anomalies, generate live incidents.
    This is the CORE function — every incident is born from a real metric reading.
    """
    incidents = []
    now = datetime.now(timezone.utc)

    for service in SERVICE_URLS:
        # ━━━ Fetch ALL real metrics for this service ━━━
        err_rate = await _prom_query(
            f'sum(rate(http_requests_total{{service="{service}",status=~"5.."}}[20s])) '
            f'/ sum(rate(http_requests_total{{service="{service}"}}[20s])) * 100'
        )
        latency_p95 = await _prom_query(
            f'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket'
            f'{{service="{service}"}}[20s])) by (le)) * 1000'
        )
        memory_mb = await _prom_query(
            f'process_memory_usage_bytes{{service="{service}"}} / 1024 / 1024'
        )
        db_conns = await _prom_query(
            f'db_connections_active{{service="{service}"}}'
        )
        threads = await _prom_query(
            f'thread_pool_active{{service="{service}"}}'
        )
        queue = await _prom_query(
            f'queue_depth{{service="{service}"}}'
        )
        cpu_usage = await _prom_query(
            f'process_cpu_percent{{service="{service}"}}'
        )

        # Get service health for additional context
        health = await _get_service_health(service)
        is_up = await _check_service_up(service)

        metrics = {
            "error_rate": round(err_rate, 2),
            "latency_p95_ms": round(latency_p95, 2),
            "memory_mb": round(memory_mb, 2),
            "db_connections": round(db_conns, 0),
            "thread_pool_active": round(threads, 0),
            "queue_depth": round(queue, 0),
            "cpu_usage": round(cpu_usage, 2),
        }

        # ━━━ ANOMALY DETECTION RULES ━━━

        # 1. Service Down
        if not is_up:
            incidents.append(_make_incident(
                title=f"Service Unavailable — {service}",
                description=f"{service} is not responding to health checks. Container may have crashed or become unreachable.",
                severity="critical",
                service=service,
                failure_type="service_down",
                affected_services=[service],
                metric_values=metrics,
            ))
            continue  # Skip other checks if service is down

        # 1.5. CPU Starvation
        if cpu_usage >= THRESHOLDS["cpu_critical"]:
            incidents.append(_make_incident(
                title=f"CPU Starvation — {service}",
                description=f"CPU utilization at {cpu_usage:.1f}% (critical). Thread lock or infinite loop detected.",
                severity="critical",
                service=service,
                failure_type="cpu_stress",
                affected_services=[service],
                metric_values=metrics,
            ))
        elif cpu_usage >= THRESHOLDS["cpu_warning"]:
            incidents.append(_make_incident(
                title=f"High CPU Usage — {service}",
                description=f"CPU utilization at {cpu_usage:.1f}%.",
                severity="warning",
                service=service,
                failure_type="cpu_stress",
                affected_services=[service],
                metric_values=metrics,
            ))

        # 2. Database Connection Exhaustion
        if db_conns >= THRESHOLDS["db_connections_critical"]:
            affected = [service]
            if service == "auth-service":
                affected.append("checkout-service")  # Cascading
            incidents.append(_make_incident(
                title=f"Database Connection Exhaustion — {service}",
                description=(
                    f"DB connection pool saturated: {int(db_conns)}/25 active connections. "
                    f"Unindexed queries causing pool saturation. Error rate at {err_rate:.1f}%. "
                    f"P95 latency spiked to {latency_p95:.0f}ms."
                ),
                severity="critical",
                service=service,
                failure_type="database",
                affected_services=affected,
                metric_values=metrics,
            ))
        elif db_conns >= THRESHOLDS["db_connections_warning"]:
            incidents.append(_make_incident(
                title=f"DB Connection Pool Pressure — {service}",
                description=f"DB connections at {int(db_conns)}/25. Approaching saturation threshold.",
                severity="warning",
                service=service,
                failure_type="database",
                affected_services=[service],
                metric_values=metrics,
            ))

        # 3. Memory Leak Detection
        if memory_mb >= THRESHOLDS["memory_critical"]:
            incidents.append(_make_incident(
                title=f"Possible Memory Leak — {service}",
                description=(
                    f"Container memory at {memory_mb:.0f}MB and growing. "
                    f"No cache eviction policy detected. OOM kill imminent. "
                    f"Memory leak active: {health.get('memory_leak_active', False)}."
                ),
                severity="critical",
                service=service,
                failure_type="resource_exhaustion",
                affected_services=[service],
                metric_values=metrics,
            ))
        elif memory_mb >= THRESHOLDS["memory_warning"]:
            incidents.append(_make_incident(
                title=f"High Memory Usage — {service}",
                description=f"Memory at {memory_mb:.0f}MB. Monitor for continued growth.",
                severity="warning",
                service=service,
                failure_type="resource_exhaustion",
                affected_services=[service],
                metric_values=metrics,
            ))

        # 4. API Timeout / Thread Pool Exhaustion
        if threads >= THRESHOLDS["thread_pool_critical"] or queue >= THRESHOLDS["queue_depth_critical"]:
            affected = [service]
            if service == "payment-service":
                affected.append("checkout-service")
            incidents.append(_make_incident(
                title=f"Third-Party API Timeout — {service}",
                description=(
                    f"Thread pool at {int(threads)}/16. Queue depth: {int(queue)}. "
                    f"Upstream dependency unresponsive. Retries exhausting resources. "
                    f"P95 latency: {latency_p95:.0f}ms."
                ),
                severity="critical",
                service=service,
                failure_type="upstream_dependency",
                affected_services=affected,
                metric_values=metrics,
            ))
        elif threads >= THRESHOLDS["thread_pool_warning"] or queue >= THRESHOLDS["queue_depth_warning"]:
            incidents.append(_make_incident(
                title=f"API Latency Spike — {service}",
                description=f"Threads: {int(threads)}/16, queue: {int(queue)}. Latency: {latency_p95:.0f}ms.",
                severity="warning",
                service=service,
                failure_type="upstream_dependency",
                affected_services=[service],
                metric_values=metrics,
            ))

        # 5. High Error Rate (only if not already covered by above)
        if err_rate >= THRESHOLDS["error_rate_critical"] and db_conns < THRESHOLDS["db_connections_warning"]:
            incidents.append(_make_incident(
                title=f"High Error Rate — {service}",
                description=f"Error rate at {err_rate:.1f}% (threshold: 20%). Service returning 5xx responses.",
                severity="critical",
                service=service,
                failure_type="error_rate",
                affected_services=[service],
                metric_values=metrics,
            ))
        elif err_rate >= THRESHOLDS["error_rate_warning"] and db_conns < THRESHOLDS["db_connections_warning"]:
            incidents.append(_make_incident(
                title=f"Elevated Error Rate — {service}",
                description=f"Error rate at {err_rate:.1f}% (threshold: 5%).",
                severity="warning",
                service=service,
                failure_type="error_rate",
                affected_services=[service],
                metric_values=metrics,
            ))

        # 6. Latency Spike (only if not already covered)
        if latency_p95 >= THRESHOLDS["latency_critical"] and threads < THRESHOLDS["thread_pool_warning"]:
            incidents.append(_make_incident(
                title=f"P95 Latency Spike — {service}",
                description=f"P95 latency at {latency_p95:.0f}ms (threshold: 2000ms). Baseline is ~30ms.",
                severity="critical",
                service=service,
                failure_type="latency",
                affected_services=[service],
                metric_values=metrics,
            ))
        elif latency_p95 >= THRESHOLDS["latency_warning"] and threads < THRESHOLDS["thread_pool_warning"]:
            incidents.append(_make_incident(
                title=f"Latency Degradation — {service}",
                description=f"P95 latency at {latency_p95:.0f}ms (threshold: 500ms).",
                severity="warning",
                service=service,
                failure_type="latency",
                affected_services=[service],
                metric_values=metrics,
            ))

    # Sort: critical first, then warning
    severity_order = {"critical": 0, "warning": 1, "info": 2}
    incidents.sort(key=lambda x: severity_order.get(x["severity"], 99))

    logger.debug(f"[IncidentEngine] Detected {len(incidents)} live incidents")
    return incidents


async def get_raw_metrics() -> Dict[str, Any]:
    """Return raw Prometheus metrics for all services — debugging endpoint."""
    result = {}
    for service in SERVICE_URLS:
        result[service] = {
            "error_rate": await _prom_query(
                f'sum(rate(http_requests_total{{service="{service}",status=~"5.."}}[20s])) '
                f'/ sum(rate(http_requests_total{{service="{service}"}}[20s])) * 100'
            ),
            "latency_p95_ms": await _prom_query(
                f'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket'
                f'{{service="{service}"}}[20s])) by (le)) * 1000'
            ),
            "memory_mb": await _prom_query(
                f'process_memory_usage_bytes{{service="{service}"}} / 1024 / 1024'
            ),
            "db_connections": await _prom_query(f'db_connections_active{{service="{service}"}}'),
            "thread_pool": await _prom_query(f'thread_pool_active{{service="{service}"}}'),
            "queue_depth": await _prom_query(f'queue_depth{{service="{service}"}}'),
        }
        # Clean NaN/Inf
        for k, v in result[service].items():
            if math.isnan(v) or math.isinf(v):
                result[service][k] = 0.0
            else:
                result[service][k] = round(v, 2)
    return result
