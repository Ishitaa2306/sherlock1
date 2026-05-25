"""
SHERLOCK — Prometheus Client
Queries Prometheus for real metrics from demo services.
"""
import os, httpx
from typing import Dict, Any, List, Optional
from loguru import logger

PROM_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")

async def query_instant(promql: str) -> List[Dict[str, Any]]:
    """Run an instant PromQL query."""
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{PROM_URL}/api/v1/query", params={"query": promql})
            if r.status_code == 200:
                data = r.json()
                if data.get("status") == "success":
                    return data.get("data", {}).get("result", [])
    except Exception as e:
        logger.error(f"[Prometheus] Query failed: {e}")
    return []

async def query_range(promql: str, start: Optional[str] = None, end: Optional[str] = None, step: str = "30s") -> List[Dict[str, Any]]:
    """Run a range PromQL query and clean NaN/Inf values."""
    import time
    import math
    now = int(time.time())
    params = {"query": promql, "start": start or str(now - 900), "end": end or str(now), "step": step}
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{PROM_URL}/api/v1/query_range", params=params)
            if r.status_code == 200:
                data = r.json()
                if data.get("status") == "success":
                    results = data.get("data", {}).get("result", [])
                    for res in results:
                        values = res.get("values", [])
                        cleaned_values = []
                        for val_pair in values:
                            t_val = val_pair[0]
                            v_str = val_pair[1]
                            try:
                                v_float = float(v_str)
                                if math.isnan(v_float) or math.isinf(v_float):
                                    v_float = 0.0
                            except Exception:
                                v_float = 0.0
                            cleaned_values.append([t_val, str(v_float)])
                        res["values"] = cleaned_values
                    return results
    except Exception as e:
        logger.error(f"[Prometheus] Range query failed: {e}")
    return []

async def get_service_metrics(service: str) -> Dict[str, Any]:
    """Get all key metrics for a specific service."""
    metrics = {}
    queries = {
        "request_rate": f'rate(http_requests_total{{service="{service}"}}[1m])',
        "error_rate": f'rate(http_requests_total{{service="{service}",status=~"5.."}}[1m]) / rate(http_requests_total{{service="{service}"}}[1m]) * 100',
        "latency_p95": f'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{{service="{service}"}}[1m]))',
        "memory_usage": f'process_memory_usage_bytes{{service="{service}"}}',
        "db_connections": f'db_connections_active{{service="{service}"}}',
        "queue_depth": f'queue_depth{{service="{service}"}}',
        "thread_pool": f'thread_pool_active{{service="{service}"}}',
    }
    for name, q in queries.items():
        result = await query_instant(q)
        if result:
            vals = []
            for r in result:
                try:
                    val_str = r["value"][1] if r.get("value") else "0"
                    val = float(val_str)
                    import math
                    if math.isnan(val) or math.isinf(val):
                        val = 0.0
                except Exception:
                    val = 0.0
                vals.append({"labels": r.get("metric", {}), "value": val})
            metrics[name] = vals
        else:
            metrics[name] = []
    return metrics

async def get_all_targets() -> List[Dict[str, Any]]:
    """Get all Prometheus scrape targets and their health."""
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{PROM_URL}/api/v1/targets")
            if r.status_code == 200:
                return r.json().get("data", {}).get("activeTargets", [])
    except Exception as e:
        logger.error(f"[Prometheus] Targets failed: {e}")
    return []
