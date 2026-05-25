"""
SHERLOCK — Incident Simulator
Triggers real failure scenarios on demo services.
"""
import httpx
from typing import Dict, Any
from loguru import logger

SERVICE_URLS = {
    "auth-service": "http://auth-service:8001",
    "checkout-service": "http://checkout-service:8002",
    "recommendation-service": "http://recommendation-service:8003",
    "payment-service": "http://payment-service:8004",
}

# For local dev (outside Docker)
LOCAL_URLS = {
    "auth-service": "http://localhost:8001",
    "checkout-service": "http://localhost:8002",
    "recommendation-service": "http://localhost:8003",
    "payment-service": "http://localhost:8004",
}

def _get_url(service: str) -> str:
    return SERVICE_URLS.get(service, LOCAL_URLS.get(service, f"http://localhost:8001"))

SCENARIOS = {
    "db_exhaustion": {
        "id": "db_exhaustion",
        "name": "Database Connection Exhaustion",
        "description": "A deployment introduces an unindexed query causing DB connection pool saturation. Auth-service fails, checkout cascades.",
        "affected_services": ["auth-service", "checkout-service"],
        "severity": "critical",
        "failure_type": "database",
        "primary_service": "auth-service",
        "chaos_endpoint": "/chaos/db-exhaustion",
    },
    "memory_leak": {
        "id": "memory_leak",
        "name": "Memory Leak — Unbounded Cache",
        "description": "A feature flag enables an unbounded recommendation cache. Memory grows until OOM kill. Pods restart in CrashLoopBackOff.",
        "affected_services": ["recommendation-service"],
        "severity": "critical",
        "failure_type": "resource_exhaustion",
        "primary_service": "recommendation-service",
        "chaos_endpoint": "/chaos/memory-leak",
    },
    "api_timeout": {
        "id": "api_timeout",
        "name": "Third-Party API Timeout",
        "description": "Payment gateway becomes unresponsive. Retries exhaust thread pool. Queue backs up. Checkout fails completely.",
        "affected_services": ["payment-service", "checkout-service"],
        "severity": "critical",
        "failure_type": "upstream_dependency",
        "primary_service": "payment-service",
        "chaos_endpoint": "/chaos/api-timeout",
    },
    "cpu_stress": {
        "id": "cpu_stress",
        "name": "CPU Starvation (Infinite Loop)",
        "description": "A bad regex or infinite loop spins up on all cores, causing CPU starvation. Health checks begin to fail.",
        "affected_services": ["checkout-service"],
        "severity": "critical",
        "failure_type": "cpu_stress",
        "primary_service": "checkout-service",
        "chaos_endpoint": "/chaos/cpu-stress",
    },
}

async def trigger_scenario(scenario_id: str) -> Dict[str, Any]:
    """Trigger a failure scenario on the target demo services."""
    scenario = SCENARIOS.get(scenario_id)
    if not scenario:
        return {"error": f"Unknown scenario: {scenario_id}"}

    primary = scenario["primary_service"]
    url = _get_url(primary) + scenario["chaos_endpoint"]
    results = {"scenario": scenario_id, "triggered": [], "failed": []}

    logger.info(f"[Simulator] Triggering scenario={scenario_id} on {primary}")

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.post(url)
            if r.status_code == 200:
                results["triggered"].append(primary)
                logger.info(f"[Simulator] ✅ Chaos triggered on {primary}")
                
                # Add Grafana annotation
                try:
                    from services.grafana_client import create_annotation
                    await create_annotation(
                        text=f"Incident Simulator: {scenario['name']} triggered on {primary}.",
                        tags=["chaos", scenario_id, primary]
                    )
                except Exception as e_ann:
                    logger.debug(f"[Simulator] Failed to create Grafana annotation: {e_ann}")
            else:
                results["failed"].append(primary)
    except Exception as e:
        logger.error(f"[Simulator] Failed to trigger on {primary}: {e}")
        results["failed"].append(primary)

    results["status"] = "active" if results["triggered"] else "failed"
    results["message"] = f"Scenario '{scenario['name']}' {'activated' if results['triggered'] else 'failed to activate'}"
    return results

async def reset_all_scenarios() -> Dict[str, Any]:
    """Reset all chaos on all services."""
    results = {"reset": [], "failed": []}
    for service, url in SERVICE_URLS.items():
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                r = await client.post(f"{url}/chaos/reset")
                if r.status_code == 200:
                    results["reset"].append(service)
        except Exception as e:
            results["failed"].append(service)

    # Add Grafana annotation for reset
    try:
        from services.grafana_client import create_annotation
        await create_annotation(
            text="Incident Simulator: All chaos modes reset to normal operational steady state.",
            tags=["chaos", "reset"]
        )
    except Exception as e_ann:
        logger.debug(f"[Simulator] Failed to create Grafana annotation: {e_ann}")

    logger.info(f"[Simulator] Reset results: {results}")
    return results

async def get_service_statuses() -> Dict[str, Any]:
    """Check health of all demo services."""
    statuses = {}
    for service in SERVICE_URLS:
        url = _get_url(service)
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                r = await client.get(f"{url}/health")
                if r.status_code == 200:
                    statuses[service] = r.json()
                else:
                    statuses[service] = {"status": "error", "code": r.status_code}
        except Exception as e:
            statuses[service] = {"status": "unreachable", "error": str(e)}
    return statuses

def list_scenarios():
    """Return all available scenarios."""
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "description": s["description"],
            "affected_services": s["affected_services"],
            "severity": s["severity"],
            "failure_type": s["failure_type"],
        }
        for s in SCENARIOS.values()
    ]
