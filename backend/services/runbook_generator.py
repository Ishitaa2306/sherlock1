"""
SHERLOCK — Runbook Generator
Uses Gemini to produce structured remediation runbooks.
"""
from typing import Dict, Any
from loguru import logger
from services.gemini_client import generate_response
from services.prompt_builder import build_runbook_prompt
from services.response_parser import parse_runbook_response
from datetime import datetime, timezone


async def generate_runbook(analysis: Dict[str, Any], service: str) -> Dict[str, Any]:
    """Generate a structured runbook from the analysis results."""
    logger.info(f"[Runbook] Generating for service={service}")
    
    prompt = build_runbook_prompt(analysis, service)
    raw_response = await generate_response(
        "You are SHERLOCK, an SRE AI generating incident response runbooks. Return valid JSON only.",
        prompt
    )
    
    runbook = parse_runbook_response(raw_response)
    runbook["generated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Ensure we have a complete runbook even if AI output was incomplete
    if not runbook.get("verification_steps"):
        runbook["verification_steps"] = _default_verification(service, analysis)
    if not runbook.get("mitigation_steps"):
        runbook["mitigation_steps"] = _default_mitigation(service, analysis)
    if not runbook.get("resolution_steps"):
        runbook["resolution_steps"] = _default_resolution(service, analysis)
    if not runbook.get("validation_steps"):
        runbook["validation_steps"] = _default_validation(service)
    
    logger.info(f"[Runbook] Generated with {sum(len(runbook.get(k,[])) for k in ['verification_steps','mitigation_steps','resolution_steps','validation_steps'])} total steps")
    return runbook


def _default_verification(service: str, analysis: Dict) -> list:
    return [
        {"step_number": 1, "title": "Check service health", "description": f"Verify {service} health endpoint",
         "command": f"curl -s http://{service}:8001/health | jq .", "expected_output": "status: degraded", "category": "verification"},
        {"step_number": 2, "title": "Check error rate", "description": "Query Prometheus for current error rate",
         "command": f'curl -s "http://prometheus:9090/api/v1/query?query=rate(http_requests_total{{service=\\"{service}\\",status=~\\"5..\\"\\ }}[5m])"',
         "expected_output": "Elevated error rate values", "category": "verification"},
        {"step_number": 3, "title": "Review recent logs", "description": "Check for error patterns",
         "command": f"docker logs sherlock-{service.replace('-service','')} --tail 50", "expected_output": "Error log entries", "category": "verification"},
    ]

def _default_mitigation(service: str, analysis: Dict) -> list:
    root = analysis.get("root_cause", "")
    return [
        {"step_number": 1, "title": "Rollback deployment", "description": "Revert to last known good version",
         "command": f"kubectl rollout undo deployment/{service}", "expected_output": "deployment rolled back", "category": "mitigation"},
        {"step_number": 2, "title": "Restart affected pods", "description": "Force restart to clear bad state",
         "command": f"kubectl rollout restart deployment/{service}", "expected_output": "deployment restarted", "category": "mitigation"},
        {"step_number": 3, "title": "Scale up replicas", "description": "Add capacity while investigating",
         "command": f"kubectl scale deployment/{service} --replicas=5", "expected_output": "deployment scaled", "category": "mitigation"},
    ]

def _default_resolution(service: str, analysis: Dict) -> list:
    return [
        {"step_number": 1, "title": "Apply permanent fix", "description": "Deploy the code fix",
         "command": f"kubectl set image deployment/{service} {service}=registry/{service}:fixed", "expected_output": "image updated", "category": "resolution"},
        {"step_number": 2, "title": "Add monitoring", "description": "Create alert for this failure mode",
         "command": "# Add Datadog monitor via API or UI", "expected_output": "Monitor created", "category": "resolution"},
    ]

def _default_validation(service: str) -> list:
    return [
        {"step_number": 1, "title": "Verify error rate", "description": "Confirm errors have stopped",
         "command": f"curl -s http://{service}:8001/health", "expected_output": "status: healthy", "category": "validation"},
        {"step_number": 2, "title": "Check latency", "description": "Verify latency is back to normal",
         "command": f'curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket{{service=\\"{service}\\"}}[5m]))"',
         "expected_output": "p95 < 100ms", "category": "validation"},
    ]
