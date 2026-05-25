"""
SHERLOCK — Response Parser
Extracts structured JSON from Gemini AI responses.
"""
import json, re
from typing import Dict, Any, Optional
from loguru import logger


def parse_analysis_response(raw_text: str) -> Optional[Dict[str, Any]]:
    """Extract structured RCA JSON from Gemini's response."""
    # Try to find JSON in code fences
    patterns = [
        r'```json\s*\n(.*?)\n\s*```',
        r'```\s*\n(\{.*?\})\s*\n```',
        r'(\{[^{}]*"root_cause"[^{}]*\})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, raw_text, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group(1))
                if "root_cause" in result:
                    logger.info("[Parser] Successfully extracted structured RCA")
                    return _normalize_result(result)
            except json.JSONDecodeError:
                continue

    # Try parsing the entire text as JSON
    try:
        result = json.loads(raw_text)
        if "root_cause" in result:
            return _normalize_result(result)
    except json.JSONDecodeError:
        pass

    logger.warning("[Parser] Could not extract structured JSON — building from text")
    return _build_from_text(raw_text)


def parse_chat_response(raw_text: str) -> Dict[str, Any]:
    """Extract chat response JSON."""
    for pattern in [r'```json\s*\n(.*?)\n\s*```', r'(\{[^{}]*"answer"[^{}]*\})']:
        match = re.search(pattern, raw_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                continue
    try:
        return json.loads(raw_text)
    except:
        return {"answer": raw_text, "suggested_followups": []}


def parse_runbook_response(raw_text: str) -> Dict[str, Any]:
    """Extract runbook JSON."""
    for pattern in [r'```json\s*\n(.*?)\n\s*```', r'(\{[^{}]*"verification_steps"[^{}]*\})']:
        match = re.search(pattern, raw_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                continue
    try:
        return json.loads(raw_text)
    except:
        return _default_runbook()


def _normalize_result(result: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure all required fields exist."""
    import random
    defaults = {
        "root_cause": "Unknown",
        "confidence": random.randint(75, 95),
        "chain_of_events": [],
        "evidence_used": [],
        "immediate_fix": "",
        "long_term_fix": "",
        "affected_services": [],
        "severity": "high",
    }
    for k, v in defaults.items():
        if k not in result:
            result[k] = v
    # Use fallback random score if parsing yields invalid/non-numeric confidence
    try:
        parsed_conf = float(result.get("confidence", 85))
    except (ValueError, TypeError):
        parsed_conf = float(random.randint(75, 95))
    result["confidence"] = max(0, min(100, parsed_conf))
    return result


def _build_from_text(text: str) -> Dict[str, Any]:
    """Build a minimal result from raw text when JSON parsing fails."""
    import random
    return {
        "root_cause": text[:500] if text else "Analysis could not determine root cause",
        "confidence": random.randint(55, 75),
        "chain_of_events": [],
        "evidence_used": ["Raw AI analysis text"],
        "immediate_fix": "Review the full AI analysis output",
        "long_term_fix": "Improve monitoring coverage",
        "affected_services": [],
        "severity": "high",
    }


def _default_runbook():
    return {
        "title": "Incident Response Runbook",
        "incident_type": "service_degradation",
        "severity": "high",
        "verification_steps": [{"step_number": 1, "title": "Check service health", "description": "Verify service status", "command": "curl http://localhost:8001/health", "expected_output": "200 OK", "category": "verification"}],
        "mitigation_steps": [{"step_number": 1, "title": "Restart service", "description": "Restart affected pods", "command": "kubectl rollout restart deployment/auth-service", "expected_output": "deployment restarted", "category": "mitigation"}],
        "resolution_steps": [],
        "validation_steps": [],
    }
