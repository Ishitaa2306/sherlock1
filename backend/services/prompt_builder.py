"""
SHERLOCK — Prompt Builder
Constructs the Gemini AI prompt with full telemetry context for RCA.
"""
import json
from typing import Dict, Any

SYSTEM_PROMPT = """You are SHERLOCK — an elite Senior SRE Incident Investigator AI with 20+ years of production operations experience.

You are investigating a REAL production incident. You have been given REAL telemetry data including logs, metrics, alerts, traces, and deployment events.

YOUR MISSION:
1. Analyze ALL provided telemetry data
2. Identify the SINGLE root cause
3. Reconstruct the exact chronological chain of events
4. Provide a confidence score (0-100)
5. Recommend immediate mitigation
6. Recommend long-term prevention

RULES:
- Use EXACT timestamps and values from the telemetry
- Be SPECIFIC — no vague explanations
- Cite exact log messages, metric values, and alert titles as evidence
- Explain the causal chain step by step
- Think like a senior SRE performing root cause analysis
- Your confidence score should reflect how certain you are

First, think through your investigation step by step. Reason about what the telemetry shows.
Then output a JSON block with your structured findings.

OUTPUT FORMAT — You MUST return a valid JSON object with this exact structure at the end of your response, wrapped in ```json ``` code fences:

```json
{
  "root_cause": "A clear, specific description of the root cause",
  "confidence": 85,
  "chain_of_events": [
    {
      "timestamp": "ISO timestamp",
      "event": "What happened",
      "service": "service-name",
      "severity": "critical|high|medium|low|info",
      "details": "Specific details with actual values"
    }
  ],
  "evidence_used": [
    "Exact log message or metric that supports this conclusion"
  ],
  "immediate_fix": "Step-by-step immediate mitigation",
  "long_term_fix": "Architectural/process changes to prevent recurrence",
  "affected_services": ["service-name"],
  "severity": "critical"
}
```"""


def build_analysis_prompt(telemetry_context: Dict[str, Any]) -> str:
    """Build the full analysis prompt with telemetry data."""
    service = telemetry_context.get("service", "unknown")
    scenario = telemetry_context.get("scenario", "")
    summary = telemetry_context.get("telemetry_summary", {})

    # Format logs (top 20 most relevant)
    logs = telemetry_context.get("logs", [])[:20]
    logs_text = "\n".join([
        f"  [{l.get('timestamp','')}] [{l.get('level','')}] [{l.get('service','')}] {l.get('message','')}"
        for l in logs
    ])

    # Format metrics
    metrics = telemetry_context.get("metrics", [])[:30]
    metrics_text = "\n".join([
        f"  [{m.get('timestamp','')}] {m.get('metric_name','')}: {m.get('value',0)} ({m.get('service','')})"
        for m in metrics
    ])

    # Format alerts
    alerts = telemetry_context.get("alerts", [])
    alerts_text = "\n".join([
        f"  [{a.get('timestamp','')}] [{a.get('severity','')}] {a.get('title','')} — {a.get('message','')}"
        for a in alerts
    ])

    # Format deployments
    deploys = telemetry_context.get("deployments", [])
    deploys_text = "\n".join([
        f"  [{d.get('timestamp','')}] {d.get('service','')} {d.get('version','')} by {d.get('deployer','')} — Changes: {', '.join(d.get('changes',[]))}"
        for d in deploys
    ])

    # Format traces
    traces = telemetry_context.get("traces", [])[:15]
    traces_text = "\n".join([
        f"  [{t.get('timestamp','')}] {t.get('service','')}/{t.get('operation','')} — {t.get('duration_ms',0)}ms [{t.get('status','')}]"
        for t in traces
    ])

    prompt = f"""
=== INCIDENT INVESTIGATION ===
Primary Service Under Investigation: {service}
Time Range: {telemetry_context.get('time_range',{}).get('start','')} to {telemetry_context.get('time_range',{}).get('end','')}
Affected Services: {', '.join(telemetry_context.get('services_affected', []))}

=== TELEMETRY SUMMARY ===
Total Logs: {summary.get('total_logs',0)} (Errors: {summary.get('error_logs',0)})
Total Metrics: {summary.get('total_metrics',0)}
Total Alerts: {summary.get('total_alerts',0)} (Critical: {summary.get('critical_alerts',0)})
Total Traces: {summary.get('total_traces',0)} (Errors: {summary.get('error_traces',0)})

=== DEPLOYMENT EVENTS ===
{deploys_text or '  No deployment events found'}

=== ALERTS (Active) ===
{alerts_text or '  No active alerts'}

=== LOGS (Recent) ===
{logs_text or '  No logs available'}

=== METRICS ===
{metrics_text or '  No metrics available'}

=== TRACES ===
{traces_text or '  No traces available'}

=== INVESTIGATION REQUEST ===
Analyze all the telemetry above. Think step by step through the evidence.
Identify the root cause, explain the chain of events, and provide your recommendations.
"""
    return prompt


def build_chat_prompt(
    message: str, 
    incident_context: Dict[str, Any] = None, 
    active_incident: Dict[str, Any] = None,
    previous_analysis: Dict[str, Any] = None, 
    chat_history: list = None,
    live_context: Dict[str, Any] = None,
) -> str:
    """
    Build a deeply contextual chat prompt that injects:
    - Live Prometheus metrics (real-time)
    - Active incident details
    - Previous RCA results
    - Service health state
    - Recent logs, alerts, traces
    - Cross-service dependency metrics
    - Full conversational memory
    """
    context_parts = []

    # ━━━ 1. Active Incident Context ━━━
    if active_incident:
        inc_title = active_incident.get("title", "Unknown Incident")
        inc_svc = active_incident.get("service", "unknown")
        inc_sev = active_incident.get("severity", "unknown")
        inc_desc = active_incident.get("description", "")
        inc_type = active_incident.get("failure_type", "")
        inc_metrics = active_incident.get("metric_values", {})
        inc_affected = active_incident.get("affected_services", [])

        context_parts.append(f"""=== CURRENT ACTIVE INCIDENT ===
Title: {inc_title}
Service: {inc_svc}
Severity: {inc_sev}
Failure Type: {inc_type}
Description: {inc_desc}
Affected Services: {', '.join(inc_affected) if inc_affected else inc_svc}
Metric Snapshot at Detection: {json.dumps(inc_metrics, indent=2) if inc_metrics else 'N/A'}
""")

    # ━━━ 2. LIVE Real-Time Metrics (from Prometheus) ━━━
    if live_context and live_context.get("live_metrics"):
        m = live_context["live_metrics"]
        context_parts.append(f"""=== LIVE PROMETHEUS METRICS (RIGHT NOW) ===
Service: {m.get('service', 'unknown')}
Error Rate: {m.get('error_rate_pct', 0)}%
P95 Latency: {m.get('p95_latency_ms', 0)}ms
Memory Usage: {m.get('memory_mb', 0)}MB
DB Connections: {m.get('db_connections_active', 0)}/{m.get('db_connections_max', 25)} active
Thread Pool: {m.get('thread_pool_active', 0)}/{m.get('thread_pool_max', 16)} active
Queue Depth: {m.get('queue_depth', 0)}
CPU Usage: {m.get('cpu_percent', 0)}%
""")

    # ━━━ 3. Service Health ━━━
    if live_context and live_context.get("service_health"):
        h = live_context["service_health"]
        context_parts.append(f"""=== SERVICE HEALTH STATUS ===
{json.dumps(h, indent=2)}
""")

    # ━━━ 4. Cross-Service Dependency Metrics ━━━
    if live_context and live_context.get("cross_service_metrics"):
        dep_lines = []
        for svc, vals in live_context["cross_service_metrics"].items():
            dep_lines.append(f"  {svc}: error_rate={vals.get('error_rate_pct',0)}%, p95_latency={vals.get('p95_latency_ms',0)}ms")
        if dep_lines:
            context_parts.append("=== OTHER SERVICE METRICS (Dependency Check) ===\n" + "\n".join(dep_lines) + "\n")

    # ━━━ 5. Previous RCA Result ━━━
    if previous_analysis:
        rca = previous_analysis.get("root_cause", "")
        confidence = previous_analysis.get("confidence", 0)
        imm_fix = previous_analysis.get("immediate_fix", "")
        lt_fix = previous_analysis.get("long_term_fix", "")
        evidence = previous_analysis.get("evidence_used", [])
        affected = previous_analysis.get("affected_services", [])
        
        context_parts.append(f"""=== PREVIOUS INVESTIGATION RCA ===
Root Cause: {rca}
Confidence: {confidence}%
Immediate Fix: {imm_fix}
Long-Term Fix: {lt_fix}
Evidence Used: {json.dumps(evidence[:6])}
Affected Services: {', '.join(affected)}
""")

    # ━━━ 6. Active Alerts ━━━
    if live_context and live_context.get("active_alerts"):
        alerts = live_context["active_alerts"][:8]
        alert_lines = [
            f"  [{a.get('severity','').upper()}] {a.get('title','')} — {a.get('message','')}"
            for a in alerts
        ]
        context_parts.append("=== ACTIVE ALERTS ===\n" + "\n".join(alert_lines) + "\n")

    # ━━━ 7. Recent Logs ━━━
    if live_context and live_context.get("recent_logs"):
        logs = live_context["recent_logs"][:8]
        log_lines = [
            f"  [{l.get('level','INFO')}] [{l.get('service','')}] {l.get('message','')}"
            for l in logs
        ]
        context_parts.append("=== RECENT LOGS (Last 5min) ===\n" + "\n".join(log_lines) + "\n")
    elif incident_context:
        logs = incident_context.get("logs", [])[:10]
        if logs:
            log_lines = [f"  [{l.get('level','')}] {l.get('message','')}" for l in logs]
            context_parts.append("=== RECENT LOGS ===\n" + "\n".join(log_lines) + "\n")

    # ━━━ 8. Recent Traces ━━━
    if live_context and live_context.get("recent_traces"):
        traces = live_context["recent_traces"][:5]
        trace_lines = [
            f"  {t.get('operation','')}: {t.get('duration_ms',0)}ms [{t.get('status','ok')}]"
            for t in traces
        ]
        context_parts.append("=== RECENT TRACES ===\n" + "\n".join(trace_lines) + "\n")

    # ━━━ 9. Investigation Telemetry Summary ━━━
    if incident_context:
        summary = incident_context.get("telemetry_summary", {})
        if summary:
            context_parts.append(f"""=== INVESTIGATION TELEMETRY SUMMARY ===
Total Logs: {summary.get('total_logs', 0)} (Errors: {summary.get('error_logs', 0)})
Total Alerts: {summary.get('total_alerts', 0)} (Critical: {summary.get('critical_alerts', 0)})
Total Traces: {summary.get('total_traces', 0)} (Errors: {summary.get('error_traces', 0)})
""")

    # ━━━ 10. Conversation History ━━━
    history_text = ""
    if chat_history:
        formatted_history = []
        for m in chat_history[-10:]:
            role = m.get("role", "user").upper()
            content = m.get("content", "")
            formatted_history.append(f"{role}: {content}")
        history_text = "\n".join(formatted_history)

    return f"""You are SHERLOCK, an elite Senior SRE Incident Investigator AI Copilot with 20+ years of production operations experience.
You are actively helping an engineer investigate a REAL production incident in real-time.

{chr(10).join(context_parts)}

=== CONVERSATION HISTORY ===
{history_text if history_text else 'This is the first message in this conversation.'}

=== BEHAVIOR RULES ===
1. You MUST answer the engineer's specific question directly. Do NOT repeat a generic RCA summary unless they ask for it.
2. Reference EXACT numbers from the live metrics above (error rates, latencies, memory usage, DB connections, etc.).
3. Mention SPECIFIC service names, threshold values, and log messages.
4. If they ask about severity, explain WHY using actual metric values vs SLO thresholds.
5. If they ask about fixes, provide concrete operational steps (kubectl commands, SQL queries, scaling actions, rollback commands).
6. If they ask about impact/spread, analyze the cross-service dependency metrics provided.
7. If they ask about teams, infer from the failure type: database issues → DBA team, memory leaks → backend team, API timeouts → infrastructure/networking team, CPU stress → SRE team.
8. If they reference a previous question, use the conversation history to maintain continuity.
9. Be conversational, analytical, and technical — like a real senior SRE engineer talking to a colleague.
10. Do NOT use placeholder values like "X%" or "N ms". Use the ACTUAL numbers from the data.

Engineer's question: {message}

Respond with deep technical insight based on the real data above.
Return ONLY valid JSON: {{"answer": "your detailed, contextual, data-driven response", "suggested_followups": ["relevant question 1", "relevant question 2", "relevant question 3"]}}"""


def build_runbook_prompt(analysis: Dict[str, Any], service: str) -> str:
    """Build prompt to generate automated runbook."""
    return f"""You are SHERLOCK, generating an automated incident runbook.

Incident Analysis:
{json.dumps(analysis, indent=2)}

Service: {service}

Generate a detailed runbook with these sections:
1. Verification Steps — confirm the issue
2. Mitigation Steps — immediate fixes
3. Resolution Steps — permanent fixes
4. Validation Steps — verify the fix worked

Each step needs: step_number, title, description, command (exact shell command), expected_output, category.

Return JSON:
{{
  "title": "Runbook title",
  "incident_type": "type",
  "severity": "critical|high|medium|low",
  "verification_steps": [...],
  "mitigation_steps": [...],
  "resolution_steps": [...],
  "validation_steps": [...]
}}"""
