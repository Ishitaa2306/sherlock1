"""
SHERLOCK — Telemetry Aggregator
Pulls from all telemetry sources (Datadog, Prometheus, Grafana) and correlates into unified context.
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from loguru import logger
from services.datadog_client import get_logs, get_metrics, get_alerts, get_traces
from services.prometheus_client_svc import get_service_metrics
from services.grafana_client import get_annotations


async def aggregate_telemetry(
    service: str,
    scenario: str = "",
    time_range_minutes: int = 15,
) -> Dict[str, Any]:
    """
    Pull telemetry from all sources and correlate into a single incident context.
    """
    logger.info(f"[Aggregator] Collecting telemetry for service={service} scenario={scenario}")

    # Pull from all sources concurrently
    import asyncio
    logs_task = asyncio.create_task(get_logs(service=service, time_range_minutes=time_range_minutes))
    metrics_task = asyncio.create_task(get_metrics(service=service, time_range_minutes=time_range_minutes))
    alerts_task = asyncio.create_task(get_alerts(time_range_minutes=60))
    traces_task = asyncio.create_task(get_traces(service=service, time_range_minutes=time_range_minutes))
    prom_task = asyncio.create_task(get_service_metrics(service))
    annotations_task = asyncio.create_task(get_annotations(time_range_minutes=60))

    logs = await logs_task
    dd_metrics = await metrics_task
    alerts = await alerts_task
    traces = await traces_task
    prom_metrics = await prom_task
    annotations = await annotations_task

    # Convert Prometheus metrics to standard format
    prom_formatted = []
    for metric_name, values in prom_metrics.items():
        for v in values:
            prom_formatted.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "metric_name": metric_name,
                "value": v.get("value", 0),
                "service": service,
                "labels": v.get("labels", {}),
                "source": "prometheus",
            })

    # Merge metrics
    all_metrics = dd_metrics + prom_formatted

    # Build deployment events from annotations
    deployments = []
    for ann in annotations:
        deployments.append({
            "timestamp": datetime.fromtimestamp(ann.get("time", 0) / 1000, tz=timezone.utc).isoformat() if ann.get("time") else "",
            "service": service,
            "version": "v2.3.1",
            "deployer": "ci/cd",
            "changes": [ann.get("text", "deployment")],
        })

    # If no deployments from Grafana, add simulated one
    if not deployments:
        from datetime import timedelta
        deploy_time = datetime.now(timezone.utc) - timedelta(minutes=14)
        deployments = [{
            "timestamp": deploy_time.isoformat(),
            "service": service,
            "version": "v2.3.1",
            "deployer": "ci/cd",
            "changes": _get_scenario_changes(scenario),
        }]

    # Identify affected services from alerts
    affected = list(set([a.get("service", service) for a in alerts]))
    if service not in affected:
        affected.insert(0, service)

    now = datetime.now(timezone.utc)
    from datetime import timedelta
    context = {
        "logs": logs,
        "metrics": all_metrics,
        "alerts": alerts,
        "deployments": deployments,
        "traces": traces,
        "time_range": {
            "start": (now - timedelta(minutes=time_range_minutes)).isoformat(),
            "end": now.isoformat(),
        },
        "services_affected": affected,
        "service": service,
        "scenario": scenario,
        "telemetry_summary": {
            "total_logs": len(logs),
            "error_logs": len([l for l in logs if l.get("level") in ("ERROR", "CRITICAL")]),
            "total_metrics": len(all_metrics),
            "total_alerts": len(alerts),
            "critical_alerts": len([a for a in alerts if a.get("severity") == "critical"]),
            "total_traces": len(traces),
            "error_traces": len([t for t in traces if t.get("status") == "error"]),
        }
    }

    logger.info(
        f"[Aggregator] Telemetry collected: {context['telemetry_summary']}"
    )
    return context


def _get_scenario_changes(scenario: str):
    changes_map = {
        "db_exhaustion": [
            "Added new user lookup query without index",
            "Removed connection pool size limit",
            "Updated ORM to eager-load related sessions",
        ],
        "memory_leak": [
            "Enabled recommendation cache feature flag",
            "Removed cache eviction policy",
            "Added unbounded embedding storage",
        ],
        "api_timeout": [
            "Updated payment gateway SDK to v3.2.0",
            "Increased retry count from 3 to 10",
            "Removed circuit breaker timeout",
        ],
    }
    return changes_map.get(scenario, ["Code deployment", "Configuration change"])
