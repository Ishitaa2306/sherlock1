"""
SHERLOCK — Gemini AI Client
Streaming integration with Google Gemini for real-time RCA.
"""
import os, json, re
from typing import AsyncGenerator
from loguru import logger
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def _configure():
    if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
        genai.configure(api_key=GEMINI_API_KEY)
        return True
    return False

def _get_model():
    return genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        generation_config={"temperature": 0.3, "max_output_tokens": 4096, "top_p": 0.8},
    )

async def stream_analysis(system_prompt: str, user_prompt: str) -> AsyncGenerator[str, None]:
    """Stream Gemini response token-by-token."""
    if not _configure():
        logger.warning("[Gemini] API key not configured — using simulated analysis")
        async for token in _simulate_stream():
            yield token
        return
    
    model = _get_model()
    try:
        response = model.generate_content(
            [{"role": "user", "parts": [f"{system_prompt}\n\n{user_prompt}"]}],
            stream=True,
        )
        for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception as e:
        logger.error(f"[Gemini] Stream error: {e}")
        yield f"\n\n⚠️ Gemini API error: {str(e)}. Using fallback analysis.\n\n"
        async for token in _simulate_stream():
            yield token

async def generate_response(system_prompt: str, user_prompt: str) -> str:
    """Generate a complete (non-streaming) Gemini response."""
    if not _configure():
        return _simulate_chat_response(user_prompt)
    model = _get_model()
    try:
        response = model.generate_content(
            [{"role": "user", "parts": [f"{system_prompt}\n\n{user_prompt}"]}]
        )
        return response.text
    except Exception as e:
        logger.error(f"[Gemini] Generate error: {e}")
        return _simulate_chat_response(user_prompt)


async def _simulate_stream():
    """Simulated AI analysis stream for when Gemini API is unavailable."""
    import asyncio
    import random
    confidence = random.randint(84, 96)
    analysis_text = f"""## 🔍 SHERLOCK Investigation Report

**Analyzing telemetry data...**

### Initial Assessment
Examining the deployment events, I notice a new deployment was pushed to auth-service at approximately 14:32 UTC. This deployment included changes to database query patterns — specifically, a new user lookup query was added without a corresponding database index.

### Evidence Chain

1. **14:32 UTC — Deployment Event**: auth-service v2.3.1 deployed with unindexed query changes
2. **14:34 UTC — Latency Spike**: P95 latency on auth-service jumped from 50ms to 800ms
3. **14:36 UTC — DB Pool Warning**: Connection pool utilization hit 80% (20/25 connections)
4. **14:38 UTC — Error Surge**: Error rate climbed to 35% as queries began timing out
5. **14:40 UTC — Pool Exhaustion**: DB connection pool fully saturated at 25/25 connections
6. **14:41 UTC — Cascading Failure**: checkout-service began failing with upstream 503 errors
7. **14:42 UTC — Critical Alert**: "High Error Rate on auth-service" alert triggered
8. **14:43 UTC — Service Degradation**: auth-service health check reporting FAILED status

### Root Cause Determination

The root cause is a **database connection pool exhaustion** triggered by an unindexed query introduced in deployment v2.3.1. The new query performs a full table scan on the `user_sessions` table, causing each database connection to be held 60x longer than normal. This rapidly consumed all 25 available connections in the pool, causing subsequent requests to queue and eventually timeout.

### Confidence: **{confidence}%**

The evidence strongly supports this conclusion based on:
- Direct temporal correlation between deployment and latency spike
- Progressive connection pool exhaustion visible in metrics
- Specific "missing index" error messages in logs
- Cascading failure pattern consistent with upstream dependency failure

```json
{{
  "root_cause": "Database connection pool exhaustion caused by unindexed query on user_sessions table, introduced in auth-service v2.3.1 deployment",
  "confidence": {confidence},
  "chain_of_events": [
    {{"timestamp": "2024-01-15T14:32:00Z", "event": "Deployment of auth-service v2.3.1 with unindexed query", "service": "auth-service", "severity": "info", "details": "New user lookup query added without index on created_at column"}},
    {{"timestamp": "2024-01-15T14:34:00Z", "event": "P95 latency spike from 50ms to 800ms", "service": "auth-service", "severity": "high", "details": "Full table scan causing 60x query slowdown"}},
    {{"timestamp": "2024-01-15T14:36:00Z", "event": "DB connection pool at 80% capacity", "service": "auth-service", "severity": "high", "details": "20/25 connections active, slow queries holding connections"}},
    {{"timestamp": "2024-01-15T14:40:00Z", "event": "DB connection pool EXHAUSTED", "service": "auth-service", "severity": "critical", "details": "25/25 connections active, new requests failing immediately"}},
    {{"timestamp": "2024-01-15T14:41:00Z", "event": "Cascading failure to checkout-service", "service": "checkout-service", "severity": "critical", "details": "upstream auth-service returning 503, checkout cannot validate users"}},
    {{"timestamp": "2024-01-15T14:42:00Z", "event": "Critical alert triggered", "service": "auth-service", "severity": "critical", "details": "Error rate exceeded 50% for 3 consecutive minutes"}}
  ],
  "evidence_used": [
    "Log: DB connection pool exhausted: 25/25 active connections",
    "Log: Query timeout on user_sessions table — missing index on created_at",
    "Metric: http_request_duration_p95 spiked from 0.05s to 5.0s",
    "Metric: db_connections_active reached 25/25 (100% utilization)",
    "Alert: High Error Rate on auth-service — Error rate >50% for 3min",
    "Trace: POST /auth/login — 8000ms [error] (normally 30ms)"
  ],
  "immediate_fix": "1. Rollback auth-service to v2.3.0\\n2. Kill long-running database queries: SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > interval '5 seconds'\\n3. Restart auth-service pods to reset connection pool\\n4. Verify error rate drops below 1%",
  "long_term_fix": "1. Add database index: CREATE INDEX idx_sessions_created_at ON user_sessions(created_at)\\n2. Implement connection pool monitoring with auto-scaling\\n3. Add query performance regression tests to CI/CD pipeline\\n4. Implement circuit breaker between checkout-service and auth-service\\n5. Add mandatory EXPLAIN ANALYZE checks for new queries in PR review",
  "affected_services": ["auth-service", "checkout-service"],
  "severity": "critical"
}}
```"""
    # Stream character by character with realistic typing speed
    for i in range(0, len(analysis_text), 3):
        yield analysis_text[i:i+3]
        await asyncio.sleep(0.02)


def _simulate_chat_response(user_prompt: str = "") -> str:
    """
    Context-aware fallback chat when Gemini API is unavailable.
    Parses the rich prompt context to generate realistic, data-driven responses.
    """
    # ━━━ Extract context from the enriched prompt ━━━
    service = _extract(r'Service:\s*(\S+)', user_prompt) or "the affected service"
    incident = _extract(r'Title:\s*(.+)', user_prompt) or "the active incident"
    severity = _extract(r'Severity:\s*(\w+)', user_prompt) or "high"
    failure_type = _extract(r'Failure Type:\s*(\w+)', user_prompt) or "unknown"
    description = _extract(r'Description:\s*(.+)', user_prompt) or ""
    
    # Live metrics
    err_rate = _extract_float(r'Error Rate:\s*([\d.]+)%', user_prompt)
    latency = _extract_float(r'P95 Latency:\s*([\d.]+)ms', user_prompt)
    memory = _extract_float(r'Memory Usage:\s*([\d.]+)MB', user_prompt)
    db_conns = _extract_float(r'DB Connections:\s*(\d+)/', user_prompt)
    db_max = _extract_float(r'DB Connections:\s*\d+/(\d+)', user_prompt) or 25
    threads = _extract_float(r'Thread Pool:\s*(\d+)/', user_prompt)
    queue = _extract_float(r'Queue Depth:\s*(\d+)', user_prompt)
    cpu = _extract_float(r'CPU Usage:\s*([\d.]+)%', user_prompt)
    
    # Previous RCA
    root_cause = _extract(r'Root Cause:\s*(.+)', user_prompt) or ""
    imm_fix = _extract(r'Immediate Fix:\s*(.+)', user_prompt) or ""
    
    # Question
    question = _extract(r"Engineer's question:\s*(.+)", user_prompt) or user_prompt[-200:]
    q = question.lower()

    # ━━━ Intent-based response generation ━━━
    if any(w in q for w in ["cause", "why", "what happened", "root cause", "reason"]):
        answer = _build_cause_response(service, incident, failure_type, err_rate, latency, memory, db_conns, db_max, threads, queue, cpu, description, root_cause)
        followups = [
            f"How severe is this {incident}?",
            f"What's the blast radius if {service} stays degraded?",
            f"What immediate steps should we take right now?"
        ]
    elif any(w in q for w in ["fix", "mitigate", "resolve", "remediat", "rollback", "restart"]):
        answer = _build_fix_response(service, incident, failure_type, err_rate, latency, memory, db_conns, db_max, threads, queue, cpu, imm_fix)
        followups = [
            f"How do we prevent {incident} from recurring?",
            f"Should we scale {service} horizontally or vertically?",
            "What monitoring should we add post-incident?"
        ]
    elif any(w in q for w in ["prevent", "long term", "future", "recur", "avoid"]):
        answer = _build_prevention_response(service, incident, failure_type, err_rate, db_conns, memory, threads)
        followups = [
            "What SLOs should we define for this service?",
            f"Should we add circuit breakers to {service}?",
            "What runbook changes should we make?"
        ]
    elif any(w in q for w in ["severe", "severity", "critical", "how bad", "impact", "sla"]):
        answer = _build_severity_response(service, incident, severity, err_rate, latency, memory, db_conns, db_max, threads, cpu)
        followups = [
            f"Can this spread to other services?",
            f"What's the customer-facing impact right now?",
            f"How do we fix {incident}?"
        ]
    elif any(w in q for w in ["spread", "cascade", "depend", "downstream", "upstream", "other service", "blast radius"]):
        answer = _build_dependency_response(service, incident, failure_type, user_prompt)
        followups = [
            f"Which team should handle {incident}?",
            f"Should we enable circuit breakers?",
            "What's the priority order for fixing affected services?"
        ]
    elif any(w in q for w in ["team", "who", "page", "oncall", "escalat", "notify"]):
        answer = _build_team_response(service, incident, failure_type, severity)
        followups = [
            f"What's the recommended fix for {incident}?",
            "Should we declare a formal incident?",
            f"What's the current error rate on {service}?"
        ]
    elif any(w in q for w in ["metric", "monitor", "observ", "dashboard", "grafana", "prometheus"]):
        answer = _build_metrics_response(service, err_rate, latency, memory, db_conns, db_max, threads, queue, cpu)
        followups = [
            "What thresholds should trigger alerts?",
            f"Is {service} recovering or getting worse?",
            "What Grafana panels should we watch?"
        ]
    elif any(w in q for w in ["log", "error message", "stack trace", "exception"]):
        answer = _build_logs_response(service, failure_type, user_prompt)
        followups = [
            f"What caused the errors in {service}?",
            "Are there any correlated deployment events?",
            "Should we increase log verbosity?"
        ]
    elif any(w in q for w in ["timeline", "when", "sequence", "chronolog", "order of events"]):
        answer = _build_timeline_response(service, incident, failure_type, err_rate, latency, db_conns, memory)
        followups = [
            "What was the triggering event?",
            f"How long has {service} been degraded?",
            "Was there a deployment before this started?"
        ]
    else:
        answer = _build_general_response(service, incident, failure_type, err_rate, latency, memory, db_conns, threads, cpu, severity)
        followups = [
            f"What caused {incident}?",
            f"How do we fix {service}?",
            f"How severe is this incident?"
        ]

    return json.dumps({"answer": answer, "suggested_followups": followups})


def _extract(pattern: str, text: str) -> str:
    m = re.search(pattern, text)
    return m.group(1).strip() if m else ""

def _extract_float(pattern: str, text: str) -> float:
    m = re.search(pattern, text)
    try:
        return float(m.group(1)) if m else 0.0
    except (ValueError, AttributeError):
        return 0.0


def _build_cause_response(service, incident, ft, err, lat, mem, db, db_max, thr, q, cpu, desc, rca):
    if rca:
        return f"Based on my previous analysis, the root cause of '{incident}' is: {rca}\n\nLooking at the current live metrics — {service} is showing an error rate of {err}%, P95 latency at {lat}ms, and DB connections at {int(db)}/{int(db_max)}. {desc}"
    parts = [f"Analyzing the telemetry for {service}, here's what I see:\n"]
    if ft == "database" and db >= 20:
        parts.append(f"The database connection pool is critically saturated at {int(db)}/{int(db_max)} active connections. This indicates unindexed queries or connection leaks are holding connections open far too long, causing new requests to queue and timeout. The error rate has climbed to {err}% and P95 latency spiked to {lat}ms as a direct result.")
    elif ft == "resource_exhaustion" and mem > 100:
        parts.append(f"Memory consumption on {service} has grown to {mem:.0f}MB, indicating a memory leak. Without a cache eviction policy, the container will eventually hit OOM limits. Current error rate: {err}%, latency: {lat}ms.")
    elif ft == "upstream_dependency" and thr >= 10:
        parts.append(f"The thread pool on {service} is at {int(thr)}/16 with a queue depth of {int(q)}. This pattern indicates an upstream dependency (likely a third-party API) has become unresponsive, causing retries to exhaust the thread pool. P95 latency: {lat}ms.")
    elif ft == "cpu_stress" and cpu > 70:
        parts.append(f"CPU utilization on {service} is at {cpu}%. This indicates either a compute-intensive loop, thread lock, or resource contention. Error rate: {err}%, latency: {lat}ms.")
    else:
        parts.append(f"Error rate: {err}%, P95 latency: {lat}ms, memory: {mem:.0f}MB, DB connections: {int(db)}/{int(db_max)}, threads: {int(thr)}/16. The primary anomaly appears to be {'high error rates' if err > 10 else 'latency degradation' if lat > 500 else 'resource pressure'}.")
    return " ".join(parts)


def _build_fix_response(service, incident, ft, err, lat, mem, db, db_max, thr, q, cpu, imm_fix):
    if imm_fix and len(imm_fix) > 20:
        return f"Based on the investigation, here are the recommended steps for '{incident}':\n\n{imm_fix}\n\nCurrent state — {service}: error_rate={err}%, latency={lat}ms, db_connections={int(db)}/{int(db_max)}."
    
    if ft == "database":
        return f"To fix the database connection exhaustion on {service} (currently {int(db)}/{int(db_max)} connections):\n\n1. **Immediate**: Kill long-running queries: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > interval '5 seconds';`\n2. **Rollback**: Revert to the previous deployment version to remove the problematic query\n3. **Restart**: `kubectl rollout restart deployment/{service}` to reset the connection pool\n4. **Verify**: Monitor error rate (currently {err}%) — it should drop below 1% within 2 minutes\n5. **Scale**: If connections remain high, increase `max_pool_size` from {int(db_max)} to 50"
    elif ft == "resource_exhaustion":
        return f"To address the memory leak on {service} (currently at {mem:.0f}MB):\n\n1. **Immediate**: Restart affected pods: `kubectl rollout restart deployment/{service}`\n2. **Monitor**: Watch memory growth pattern — if it returns, the leak is in application code\n3. **Add limits**: Set memory limits in the deployment spec: `resources.limits.memory: 512Mi`\n4. **Profile**: Enable heap profiling to identify the leaking allocation\n5. **Verify**: Error rate should normalize from {err}% after restart"
    elif ft == "upstream_dependency":
        return f"To mitigate the upstream API timeout affecting {service} (threads: {int(thr)}/16, queue: {int(q)}):\n\n1. **Circuit Breaker**: Enable circuit breaker to stop retries: set state to OPEN\n2. **Timeout Reduction**: Reduce upstream call timeout from 30s to 5s\n3. **Fallback**: Enable graceful degradation / cached responses\n4. **Scale**: Add more instances to handle the backlog\n5. **Verify**: P95 latency (currently {lat}ms) should drop to baseline ~30ms"
    elif ft == "cpu_stress":
        return f"To resolve CPU starvation on {service} (CPU: {cpu}%):\n\n1. **Immediate**: Scale horizontally: `kubectl scale deployment/{service} --replicas=4`\n2. **Identify**: Check for infinite loops or lock contention in recent deployments\n3. **Resource Limits**: Ensure CPU limits are set: `resources.limits.cpu: 1000m`\n4. **Restart**: `kubectl rollout restart deployment/{service}`\n5. **Verify**: CPU should normalize below 50%, error rate drop from {err}%"
    else:
        return f"For '{incident}' on {service}, I recommend:\n\n1. Rollback the most recent deployment\n2. Restart the service pods to clear any leaked state\n3. Monitor error rate (currently {err}%) and latency ({lat}ms)\n4. Scale up if load is the contributing factor\n5. Review logs for the specific failure pattern"


def _build_prevention_response(service, incident, ft, err, db, mem, thr):
    base = f"To prevent '{incident}' from recurring on {service}:\n\n"
    if ft == "database":
        return base + "1. **Query Review**: Add mandatory EXPLAIN ANALYZE checks in CI/CD for any new database queries\n2. **Connection Pool Monitoring**: Set up alerts at 60% pool utilization (15/25) — don't wait for saturation\n3. **Index Auditing**: Run weekly index usage analysis and add missing indexes proactively\n4. **Circuit Breakers**: Implement circuit breakers between services dependent on auth\n5. **Connection Timeouts**: Set aggressive idle connection timeouts (30s) to reclaim leaked connections\n6. **Load Testing**: Add database-focused load tests to the deployment pipeline"
    elif ft == "resource_exhaustion":
        return base + f"1. **Memory Limits**: Set hard container memory limits with OOM policies\n2. **Cache Eviction**: Implement LRU cache eviction policies — current memory is {mem:.0f}MB with no eviction\n3. **Profiling**: Enable continuous memory profiling in staging environments\n4. **Canary Deployments**: Use canary releases to catch memory leaks before full rollout\n5. **Alerting**: Set memory growth rate alerts (delta > 50MB/hour)"
    elif ft == "upstream_dependency":
        return base + f"1. **Circuit Breakers**: Implement Hystrix/resilience4j circuit breakers with sensible timeouts\n2. **Bulkheads**: Isolate thread pools per upstream dependency\n3. **Fallback Responses**: Design graceful degradation paths for each external dependency\n4. **Timeout Budgets**: Implement deadline propagation across service calls\n5. **Dependency SLAs**: Negotiate and monitor SLAs with third-party providers"
    else:
        return base + "1. Implement comprehensive health checks and readiness probes\n2. Add auto-scaling policies based on error rate and latency thresholds\n3. Improve observability with distributed tracing and structured logging\n4. Conduct regular chaos engineering exercises\n5. Create and maintain incident runbooks for each failure mode"


def _build_severity_response(service, incident, sev, err, lat, mem, db, db_max, thr, cpu):
    severity_label = sev.upper() if sev else "HIGH"
    reasons = []
    if err > 20:
        reasons.append(f"error rate at {err}% (5x above the 5% warning threshold)")
    elif err > 5:
        reasons.append(f"error rate at {err}% (above the 5% warning threshold)")
    if lat > 2000:
        reasons.append(f"P95 latency at {lat}ms (4x above the 500ms SLO)")
    elif lat > 500:
        reasons.append(f"P95 latency at {lat}ms (above the 500ms SLO)")
    if db >= 22:
        reasons.append(f"DB connections at {int(db)}/{int(db_max)} (critical saturation)")
    if mem > 350:
        reasons.append(f"memory at {mem:.0f}MB (OOM risk)")
    if cpu > 90:
        reasons.append(f"CPU at {cpu}% (starvation)")
    
    reason_text = ", ".join(reasons) if reasons else f"anomalous metric values on {service}"
    return f"This incident is classified as **{severity_label}** because {reason_text}. The combination of these metrics indicates {'active service degradation with customer impact' if sev == 'critical' else 'service instability requiring prompt attention'}. {'Cascading failures to dependent services are likely if not addressed within minutes.' if sev == 'critical' else 'Continued monitoring is required to prevent escalation.'}"


def _build_dependency_response(service, incident, ft, prompt):
    # Extract cross-service metrics from prompt
    deps = re.findall(r'(\w+-service): error_rate=([\d.]+)%, p95_latency=([\d.]+)ms', prompt)
    dep_analysis = []
    for dep_svc, dep_err, dep_lat in deps:
        err_f, lat_f = float(dep_err), float(dep_lat)
        if err_f > 5 or lat_f > 500:
            dep_analysis.append(f"  - **{dep_svc}**: error_rate={dep_err}%, latency={dep_lat}ms — IMPACTED")
        else:
            dep_analysis.append(f"  - **{dep_svc}**: error_rate={dep_err}%, latency={dep_lat}ms — healthy")
    
    dep_text = "\n".join(dep_analysis) if dep_analysis else "  Cross-service metrics not available."
    
    cascade_risk = "HIGH" if ft == "database" and service == "auth-service" else "MODERATE" if ft == "upstream_dependency" else "LOW"
    
    return f"Analyzing service dependencies for '{incident}':\n\n{dep_text}\n\n**Cascade Risk: {cascade_risk}**\n\n{'auth-service is a critical dependency — checkout-service and recommendation-service both depend on it for user validation. When auth goes down, all services requiring authentication will fail.' if service == 'auth-service' else f'{service} failure may impact downstream consumers depending on the coupling pattern.'}"


def _build_team_response(service, incident, ft, sev):
    team_map = {
        "database": ("Database/DBA Team", "They own connection pool configuration, query optimization, and index management. Page the on-call DBA immediately."),
        "resource_exhaustion": ("Backend Engineering Team", "Memory leaks typically originate in application code. The backend team should review recent deployments and run memory profiling."),
        "upstream_dependency": ("Infrastructure/Platform Team", "Third-party API timeouts and circuit breaker configuration fall under infrastructure. They can also adjust timeout policies and scaling rules."),
        "cpu_stress": ("SRE/Platform Team", "CPU starvation requires infrastructure-level investigation. SRE should check for resource contention, noisy neighbors, and scaling policies."),
        "error_rate": ("Backend Engineering Team + SRE", "Elevated error rates require code-level investigation by backend engineering with SRE support for infrastructure checks."),
        "latency": ("Backend Engineering + DBA Team", "Latency issues often span code performance and database query optimization."),
        "service_down": ("SRE/On-Call Team", "Service unavailability is a P0 — SRE on-call should be paged immediately via PagerDuty."),
    }
    team, reason = team_map.get(ft, ("SRE Team", "General incident response."))
    escalation = "This is a P1/SEV1 — page immediately via PagerDuty and open a bridge call." if sev == "critical" else "This is a P2/SEV2 — notify the team via Slack and schedule a review within 30 minutes."
    return f"For '{incident}' on {service}, the primary response team should be the **{team}**.\n\n{reason}\n\n**Escalation**: {escalation}"


def _build_metrics_response(service, err, lat, mem, db, db_max, thr, q, cpu):
    status_lines = []
    status_lines.append(f"📊 **Error Rate**: {err}% {'🔴 CRITICAL' if err > 20 else '🟡 WARNING' if err > 5 else '🟢 Normal'}")
    status_lines.append(f"⏱️ **P95 Latency**: {lat}ms {'🔴 CRITICAL' if lat > 2000 else '🟡 WARNING' if lat > 500 else '🟢 Normal'}")
    status_lines.append(f"💾 **Memory**: {mem:.0f}MB {'🔴 CRITICAL' if mem > 350 else '🟡 WARNING' if mem > 150 else '🟢 Normal'}")
    status_lines.append(f"🗄️ **DB Connections**: {int(db)}/{int(db_max)} {'🔴 CRITICAL' if db >= 22 else '🟡 WARNING' if db >= 15 else '🟢 Normal'}")
    status_lines.append(f"🧵 **Thread Pool**: {int(thr)}/16 {'🔴 CRITICAL' if thr >= 14 else '🟡 WARNING' if thr >= 10 else '🟢 Normal'}")
    status_lines.append(f"📬 **Queue Depth**: {int(q)} {'🔴 CRITICAL' if q >= 200 else '🟡 WARNING' if q >= 50 else '🟢 Normal'}")
    status_lines.append(f"🖥️ **CPU**: {cpu}% {'🔴 CRITICAL' if cpu > 90 else '🟡 WARNING' if cpu > 70 else '🟢 Normal'}")
    return f"Here's the live metrics dashboard for **{service}**:\n\n" + "\n".join(status_lines) + f"\n\nYou can also check Grafana at http://localhost/grafana/ for time-series visualization of these metrics."


def _build_logs_response(service, ft, prompt):
    # Extract log lines from the prompt
    log_matches = re.findall(r'\[(\w+)\]\s*\[([^\]]+)\]\s*(.+)', prompt)
    if log_matches:
        log_lines = [f"  [{level}] {msg.strip()}" for level, svc, msg in log_matches[:6] if svc.strip() == service or service in msg]
        if not log_lines:
            log_lines = [f"  [{level}] {msg.strip()}" for level, svc, msg in log_matches[:6]]
        return f"Here are the most relevant recent log entries for **{service}**:\n\n" + "\n".join(log_lines) + "\n\nThe error-level logs indicate the primary failure pattern. I'd focus on the CRITICAL entries first for root cause analysis."
    return f"I don't have detailed log entries for {service} in the current context. Try running an investigation first to collect telemetry, or check the container logs directly with: `docker compose logs {service} --tail 50`"


def _build_timeline_response(service, incident, ft, err, lat, db, mem):
    events = []
    if ft == "database":
        events = [
            "T+0min: New deployment pushed with unindexed database query",
            f"T+2min: P95 latency begins climbing (current: {lat}ms)",
            f"T+4min: DB connection pool pressure increases ({int(db)}/25)",
            f"T+6min: Error rate spikes to {err}%",
            f"T+8min: DB pool fully saturated, cascading failures begin",
            "T+10min: Critical alert triggered, incident detected by SHERLOCK"
        ]
    elif ft == "resource_exhaustion":
        events = [
            "T+0min: Memory allocation without corresponding deallocation detected",
            f"T+5min: Memory grows past warning threshold (current: {mem:.0f}MB)",
            f"T+10min: Garbage collection pressure increases, latency climbs to {lat}ms",
            f"T+15min: Error rate reaches {err}% as OOM pressure mounts",
            "T+20min: SHERLOCK detects anomaly and generates incident"
        ]
    elif ft == "upstream_dependency":
        events = [
            "T+0min: Upstream third-party API becomes unresponsive",
            "T+1min: Retry logic kicks in, consuming thread pool resources",
            f"T+3min: Thread pool saturation, latency spikes to {lat}ms",
            f"T+5min: Queue backlog grows, error rate hits {err}%",
            "T+7min: Circuit breaker should have tripped but wasn't configured"
        ]
    else:
        events = [
            "T+0min: Initial anomaly detected in service metrics",
            f"T+2min: Error rate climbs to {err}%",
            f"T+5min: P95 latency reaches {lat}ms",
            "T+8min: SHERLOCK anomaly detection triggers incident"
        ]
    return f"Reconstructed timeline for '{incident}':\n\n" + "\n".join(events)


def _build_general_response(service, incident, ft, err, lat, mem, db, thr, cpu, sev):
    return f"Looking at the current state of **{service}** for '{incident}':\n\n• Error rate: {err}% | P95 latency: {lat}ms\n• Memory: {mem:.0f}MB | DB connections: {int(db)}/25\n• Threads: {int(thr)}/16 | CPU: {cpu}%\n• Severity: {sev.upper()}\n\nThe {'critical' if sev == 'critical' else 'elevated'} metrics indicate {'active service degradation' if err > 10 or lat > 500 else 'early warning signs'}. I'd recommend {'immediate mitigation' if sev == 'critical' else 'close monitoring and investigation'}. What specific aspect would you like me to dig into?"
