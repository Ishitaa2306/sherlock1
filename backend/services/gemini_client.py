"""
SHERLOCK — Gemini AI Client
Streaming integration with Google Gemini for real-time RCA.
"""
import os, json, re, asyncio
from datetime import datetime, timezone
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

def _get_chat_model(system_prompt: str):
    return genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=system_prompt,
        generation_config={
            "temperature": 0.3,
            "max_output_tokens": 4096,
            "top_p": 0.8,
            "response_mime_type": "application/json"
        },
    )

async def generate_response(system_prompt: str, user_prompt: str) -> str:
    """Generate a complete (non-streaming) Gemini response."""
    if not _configure():
        return _simulate_chat_response(user_prompt)
    try:
        model = _get_chat_model(system_prompt)
        response = model.generate_content(
            [{"role": "user", "parts": [user_prompt]}]
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
    Highly sophisticated, SRE context-aware fallback chatbot.
    Simulates a pro-level Senior SRE AI Copilot (SHERLOCK) answering arbitrary questions
    about simulated services and incident scenarios.
    """
    # Extract context details
    service = _extract(r'Service:\s*(\S+)', user_prompt) or "the affected service"
    incident = _extract(r'Title:\s*(.+)', user_prompt) or "the active incident"
    severity = _extract(r'Severity:\s*(\w+)', user_prompt) or "high"
    failure_type = _extract(r'Failure Type:\s*(\w+)', user_prompt) or "unknown"
    description = _extract(r'Description:\s*(.+)', user_prompt) or ""
    
    # Extract live metrics
    err_rate = _extract_float(r'Error Rate:\s*([\d.]+)%', user_prompt)
    latency = _extract_float(r'P95 Latency:\s*([\d.]+)ms', user_prompt)
    memory = _extract_float(r'Memory Usage:\s*([\d.]+)MB', user_prompt)
    db_conns = _extract_float(r'DB Connections:\s*(\d+)/', user_prompt)
    db_max = _extract_float(r'DB Connections:\s*\d+/(\d+)', user_prompt) or 25
    threads = _extract_float(r'Thread Pool:\s*(\d+)/', user_prompt)
    queue = _extract_float(r'Queue Depth:\s*(\d+)', user_prompt)
    cpu = _extract_float(r'CPU Usage:\s*([\d.]+)%', user_prompt)
    
    # Extract previous analysis
    root_cause = _extract(r'Root Cause:\s*(.+)', user_prompt) or ""
    imm_fix = _extract(r'Immediate Fix:\s*(.+)', user_prompt) or ""
    
    # Extract the user's question
    question = _extract(r"Engineer's question:\s*(.+)", user_prompt) or user_prompt[-200:]
    q = question.lower()

    # Identify active scenario based on failure type, service, or question keywords
    scenario = "general"
    if failure_type == "database" or service == "auth-service" or any(w in q for w in ["database", "db", "auth", "connection pool", "unindexed"]):
        scenario = "db_exhaustion"
    elif failure_type == "resource_exhaustion" or service == "recommendation-service" or any(w in q for w in ["memory", "leak", "cache", "recommendation", "oom"]):
        scenario = "memory_leak"
    elif failure_type == "upstream_dependency" or service == "payment-service" or any(w in q for w in ["payment", "timeout", "third-party", "gateway", "thread pool", "resilience"]):
        scenario = "api_timeout"
    elif failure_type == "cpu_stress" or service == "checkout-service" or any(w in q for w in ["cpu", "starvation", "loop", "regex", "checkout"]):
        scenario = "cpu_stress"

    if scenario == "general":
        desc_l = description.lower()
        if "index" in desc_l or "database" in desc_l or "auth" in desc_l:
            scenario = "db_exhaustion"
        elif "memory" in desc_l or "cache" in desc_l or "oom" in desc_l:
            scenario = "memory_leak"
        elif "payment" in desc_l or "timeout" in desc_l or "gateway" in desc_l:
            scenario = "api_timeout"
        elif "cpu" in desc_l or "starvation" in desc_l or "loop" in desc_l:
            scenario = "cpu_stress"

    # Intent routing — greetings first to avoid keyword conflicts
    if any(w in q for w in ["hello", "hi ", "hey", "who are you", "what is sherlock", "what can you do", "help me"]):
        answer = "Hello! I am SHERLOCK, your Senior SRE AI Copilot. I have 20+ years of production operations experience. I can assist you with investigating active incidents, diagnosing root causes, recommending mitigations, and auditing query plans or architectural patterns. Ask me anything about the simulated microservices!"
        followups = ["What caused the active incident?", "What are the live metrics?", "Who should be paged for this?"]
    elif any(w in q for w in ["cause", "why", "what happened", "root cause", "reason"]):
        answer, followups = _get_cause_intent(scenario, service, incident, err_rate, latency, memory, db_conns, db_max, threads, queue, cpu, description, root_cause)
    elif any(w in q for w in ["fix", "mitigate", "resolve", "remediat", "rollback", "restart", "runbook"]):
        answer, followups = _get_fix_intent(scenario, service, incident, err_rate, latency, memory, db_conns, db_max, threads, queue, cpu, imm_fix)
    elif any(w in q for w in ["prevent", "long term", "future", "recur", "avoid"]):
        answer, followups = _get_prevent_intent(scenario, service, incident)
    elif any(w in q for w in ["team", "who", "page", "oncall", "escalat", "notify"]):
        answer, followups = _get_team_intent(scenario, service, incident, severity)
    elif any(w in q for w in ["metric", "monitor", "observ", "dashboard", "grafana", "prometheus", "values", "cpu usage", "memory usage"]):
        answer, followups = _get_metrics_intent(scenario, service, err_rate, latency, memory, db_conns, db_max, threads, queue, cpu)
    elif any(w in q for w in ["log", "error message", "stack trace", "exception"]):
        answer, followups = _get_logs_intent(scenario, service)
    elif any(w in q for w in ["timeline", "when", "sequence", "chronolog", "order of events"]):
        answer, followups = _get_timeline_intent(scenario, service, incident, err_rate, latency, db_conns, memory)
    elif any(w in q for w in ["spread", "cascade", "depend", "downstream", "upstream", "other service", "blast radius", "impact"]):
        answer, followups = _get_dependency_intent(scenario, service, incident, user_prompt)
    elif any(w in q for w in ["query", "sql", "select"]):
        answer, followups = _get_query_intent(scenario, service)
    else:
        answer, followups = _get_general_intent(scenario, service, incident, err_rate, latency, memory, db_conns, threads, cpu, severity)

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


def _get_cause_intent(scenario, service, incident, err, lat, mem, db, db_max, thr, q, cpu, desc, rca):
    if rca:
        return f"Based on my SRE analysis, the root cause of this incident is: **{rca}**.\n\nLooking at the telemetry snapshots, the primary service `{service}` is exhibiting issues. {desc}", [
            f"How do we mitigate this {service} incident immediately?",
            "What is the recommended long-term prevention plan?",
            "Show me the reconstructed timeline of events."
        ]
        
    if scenario == "db_exhaustion":
        return (
            "The root cause is a **database connection pool exhaustion** on `auth-service` (currently utilizing "
            f"{int(db)}/{int(db_max)} connections). A recent deployment (v2.3.1) introduced a user lookup query "
            "`SELECT * FROM user_sessions WHERE created_at > ...` without a database index on the `created_at` column. "
            "This causes full-table scans that run 60x slower, holding db connections open too long, saturating the pool, "
            "and cascading failures to `checkout-service` via upstream 503 errors.",
            ["How do we fix this database connection saturation?", "What index should we add to resolve this permanently?", "Can you show me the problematic SQL query?"]
        )
    elif scenario == "memory_leak":
        return (
            "The root cause is an **unbounded cache memory leak** in the `recommendation-service` (currently consuming "
            f"{mem:.1f}MB memory). A feature flag (`enable_recommendation_cache`) was recently toggled ON. The cache "
            "stores recommended items in-memory but has no eviction policy (like LRU) or maximum bounds, causing memory "
            "to grow continuously until the container triggers an Out Of Memory (OOM) crash and enters CrashLoopBackOff.",
            ["How can we mitigate the memory leak right now?", "What eviction policy should we implement in the cache?", "Show me the logs for recommendation-service."]
        )
    elif scenario == "api_timeout":
        return (
            "The root cause is an **unresponsive third-party payment gateway API** causing thread pool starvation in the "
            f"`payment-service` (currently utilizing {int(thr)}/16 threads and queue depth {int(q)}). Because there is no "
            "client-side circuit breaker or request timeout configured, calls block indefinitely (up to 30 seconds). "
            "This rapidly consumes all threads and blocks subsequent checkout payments.",
            ["How do we trip the circuit breaker to mitigate this?", "What client timeout budget should we configure?", "What is the team responsible for payment integrations?"]
        )
    elif scenario == "cpu_stress":
        return (
            "The root cause is **CPU starvation** on `checkout-service` (currently running at "
            f"{cpu:.1f}% CPU utilization). A recent update introduced an infinite loop or a high-complexity regular "
            "expression while parsing incoming checkout request payloads. This consumes all available core cycles, "
            "blocking the event loop and causing service health checks to fail with 504 Gateway Timeouts.",
            ["How do we horizontally scale checkout-service to mitigate this?", "What is the immediate runbook mitigation?", "How can we prevent CPU starvation in the future?"]
        )
    else:
        return (
            f"Analyzing telemetry for `{service}`: we see an error rate of {err}%, P95 latency of {lat}ms, memory "
            f"usage of {mem:.1f}MB, and CPU utilization of {cpu:.1f}%. The primary anomaly appears to be "
            f"{'high error rates' if err > 5 else 'latency degradation' if lat > 500 else 'resource utilization pressure'}.",
            ["What immediate actions can we take?", "What team owns this service?", "Show me the live metrics panel."]
        )


def _get_fix_intent(scenario, service, incident, err, lat, mem, db, db_max, thr, q, cpu, imm_fix):
    if imm_fix and len(imm_fix) > 20:
        return f"Based on the SRE playbook for '{incident}', here is the mitigation plan:\n\n{imm_fix}", [
            "How do we prevent this from happening again?",
            "Who is the on-call team for this service?",
            "What does the dependency blast radius look like?"
        ]
        
    if scenario == "db_exhaustion":
        return (
            "To mitigate the database connection exhaustion on `auth-service`:\n\n"
            "1. **Immediate Rollback**: Revert `auth-service` deployment to the previous stable version (v2.3.0) to remove the unindexed query.\n"
            "2. **Kill Slow Queries**: Execute this SQL query on your database admin panel to release saturated connections:\n"
            "   ```sql\n   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > interval '5 seconds';\n   ```\n"
            "3. **Restart Service**: Restart auth-service instances to clear any leaked connections: `kubectl rollout restart deployment/auth-service`\n"
            "4. **Verify**: Ensure database connections (currently at " + str(int(db)) + "/" + str(int(db_max)) + ") return below 5.",
            ["What index should we add to prevent this permanently?", "Can you show me the SQL query that caused this?", "Who should be paged to audit this query?"]
        )
    elif scenario == "memory_leak":
        return (
            "To mitigate the recommendation-service memory leak (currently at " + f"{mem:.1f}" + "MB):\n\n"
            "1. **Disable Feature Flag**: Toggle the `enable_recommendation_cache` feature flag to `false` in Consul or your application configuration.\n"
            "2. **Force Restart**: Restart the service container to reclaim memory and break the CrashLoopBackOff:\n"
            "   ```bash\n   kubectl rollout restart deployment/recommendation-service\n   ```\n"
            "3. **Monitor**: Confirm memory usage normalizes below 150MB after restart.",
            ["How do we implement cache eviction to prevent OOMs?", "Show me the logs for recommendation-service.", "What team owns recommendation-service?"]
        )
    elif scenario == "api_timeout":
        return (
            "To mitigate the payment-service thread pool saturation:\n\n"
            "1. **Trip Circuit Breaker**: Manually change the payment gateway circuit breaker state to **OPEN** to immediately reject external calls with fallback cached responses:\n"
            "   ```bash\n   curl -X POST http://localhost:8004/chaos/circuit-breaker/open\n   ```\n"
            "2. **Reduce client timeouts**: Set the HTTP client timeout for the gateway from 30s to 5s.\n"
            "3. **Scale Instances**: Horizontally scale payment-service: `kubectl scale deployment/payment-service --replicas=3` to process queued requests.",
            ["What is the permanent prevention plan?", "What telemetry alerts should we add?", "Show me the active alerts on payment-service."]
        )
    elif scenario == "cpu_stress":
        return (
            "To mitigate the checkout-service CPU starvation (currently at " + f"{cpu:.1f}" + "%):\n\n"
            "1. **Scale Horizontally**: Scale up replicas to distribute CPU load: `kubectl scale deployment/checkout-service --replicas=4`\n"
            "2. **Force Restart**: Terminate locked threads: `kubectl rollout restart deployment/checkout-service`\n"
            "3. **Profile Hot Path**: Capture a CPU profile using `py-spy` or a local debugger to pinpoint the regular expression or infinite loop in payload parsing.",
            ["How do we set container resource limits to prevent this?", "Show me the timeline of events for checkout-service.", "Who should be notified?"]
        )
    else:
        return (
            f"For general mitigation on `{service}`:\n\n"
            "1. Rollback the most recent deployment.\n"
            f"2. Restart service container: `kubectl rollout restart deployment/{service}`\n"
            "3. Scale up replicas if load is elevated.\n"
            "4. Verify metrics stabilize.",
            ["What metrics should we check?", "What alerts are active?", "Can you show me the logs?"]
        )


def _get_prevent_intent(scenario, service, incident):
    if scenario == "db_exhaustion":
        return (
            "To prevent database pool exhaustion in the future:\n\n"
            "1. **Query Indexing**: Add a database index on the lookup column:\n"
            "   ```sql\n   CREATE INDEX idx_sessions_created_at ON user_sessions(created_at);\n   ```\n"
            "2. **CI/CD Checks**: Integrate automated `EXPLAIN ANALYZE` audits in your CI/CD pipeline to reject PRs introducing full-table scans.\n"
            "3. **Observability**: Add Prometheus alerts at 60% pool utilization (15/25 active connections) rather than waiting for 100% saturation.\n"
            "4. **Query Timeouts**: Enforce a strict query execution timeout (e.g. 5 seconds) at the DB pool configuration level.",
            ["What is the immediate mitigation plan?", "Who team owns database configurations?", "Show me the problematic query."]
        )
    elif scenario == "memory_leak":
        return (
            "To prevent memory leaks in recommendation-service cache:\n\n"
            "1. **LRU Eviction**: Replace the unbounded cache with a size-limited cache utilizing LRU eviction. For example, in Python:\n"
            "   ```python\n   from cachetools import LRUCache\n   cache = LRUCache(maxsize=1000)\n   ```\n"
            "2. **Container Limits**: Enforce strict Docker memory limits in deployment yaml:\n"
            "   ```yaml\n   resources:\n     limits:\n       memory: 512Mi\n   ```\n"
            "3. **Heap Profiling**: Run weekly memory leak detection in staging using automated memory profiling.",
            ["How do we fix the memory leak right now?", "Show me the logs for recommendation-service.", "How severe is this OOM risk?"]
        )
    elif scenario == "api_timeout":
        return (
            "To prevent third-party timeouts from exhausting thread pools:\n\n"
            "1. **Circuit Breaker Pattern**: Configure an automated circuit breaker (e.g. Resilience4j) that trips when error rate/timeout rate exceeds 20% over a sliding window.\n"
            "2. **Timeout Budgets**: Implement deadline propagation across microservices. If checkout has a 5s limit, downstream payment calls must time out in 2s.\n"
            "3. **Bulkhead Isolation**: Separate the thread pools used for third-party calls from critical checkout processing threads.",
            ["How do we manually open the circuit breaker?", "Show me the logs for payment-service.", "What alerts are active?"]
        )
    elif scenario == "cpu_stress":
        return (
            "To prevent infinite loops and regex CPU stress:\n\n"
            "1. **CPU Limits**: Restrict CPU cycles per container to ensure a single malfunctioning service does not starve the node:\n"
            "   ```yaml\n   resources:\n     limits:\n       cpu: 1000m\n   ```\n"
            "2. **Static Analysis**: Integrate static analysis checks in CI/CD (e.g. SonarQube) to identify regex backtracking issues or unbounded loops.\n"
            "3. **Loop Watchdogs**: Implement event-loop blocking warning alerts in application runtimes.",
            ["How do we mitigate CPU stress immediately?", "Show me the timeline of events.", "Who team should audit this?"]
        )
    else:
        return (
            "To prevent service degradation in the future:\n\n"
            "1. Configure resource requests and limits in Kubernetes.\n"
            "2. Set up auto-scaling policies based on CPU and request latency.\n"
            "3. Enforce code reviews for cache implementations and database queries.",
            ["What metrics should we set alerts for?", "How do we check service health?"]
        )


def _get_team_intent(scenario, service, incident, severity):
    escalation = "This is a SEV1/P1 incident. Page the team immediately via PagerDuty and open an incident bridge call." if severity.lower() == "critical" else "This is a SEV2/P2 incident. Notify the team on Slack and schedule a review."
    
    if scenario == "db_exhaustion":
        return (
            f"The primary responder team is the **Database / DBA Team** + **Core Backend Team**.\n\n"
            "They own the database connection pool configuration, query optimization, and schema indexing. "
            f"Page them immediately regarding auth-service database pool saturation.\n\n**Escalation**: {escalation}",
            ["How do we mitigate this database exhaustion?", "Can you show me the SQL query?", "Show me the timeline of events."]
        )
    elif scenario == "memory_leak":
        return (
            f"The primary responder team is the **Backend Engineering Team** (specifically the Recommendations sub-team).\n\n"
            "Memory leaks typically stem from application-level caching, feature flag configs, or object references. "
            f"They need to investigate the cache feature flag enabled in the latest build.\n\n**Escalation**: {escalation}",
            ["How do we mitigate the memory leak right now?", "Show me the logs for recommendation-service.", "What is the long-term prevention?"]
        )
    elif scenario == "api_timeout":
        return (
            f"The primary responder team is the **Infrastructure / Platform Engineering Team**.\n\n"
            "They own circuit breaker configurations, service mesh timeout budgets, and payment gateway proxy integrations. "
            f"They should coordinate with the payment provider to verify external API availability.\n\n**Escalation**: {escalation}",
            ["How do we open the circuit breaker manually?", "Show me the active alerts on payment-service.", "What is the prevention plan?"]
        )
    elif scenario == "cpu_stress":
        return (
            f"The primary responder team is the **Checkout Team** + **SRE Team**.\n\n"
            "They should investigate recent deployment modifications to the checkout parsing module. "
            f"The SRE team can help configure horizontal scaling and resource limits.\n\n**Escalation**: {escalation}",
            ["How do we horizontally scale checkout-service?", "What immediate fixes can we try?", "Show me the timeline."]
        )
    else:
        return (
            f"The primary responder team is the **SRE / On-Call Team**.\n\n"
            f"They should triages the initial telemetry and escalate to the appropriate service owners.\n\n**Escalation**: {escalation}",
            ["What caused the active incident?", "Show me the live metrics panel."]
        )


def _get_metrics_intent(scenario, service, err, lat, mem, db, db_max, thr, q, cpu):
    status_lines = []
    status_lines.append(f"📊 **Error Rate**: {err:.2f}% {'🔴 CRITICAL' if err > 20 else '🟡 WARNING' if err > 5 else '🟢 Normal'}")
    status_lines.append(f"⏱️ **P95 Latency**: {lat:.2f}ms {'🔴 CRITICAL' if lat > 2000 else '🟡 WARNING' if lat > 500 else '🟢 Normal'}")
    status_lines.append(f"💾 **Memory**: {mem:.1f}MB {'🔴 CRITICAL' if mem > 350 else '🟡 WARNING' if mem > 150 else '🟢 Normal'}")
    status_lines.append(f"🗄️ **DB Connections**: {int(db)}/{int(db_max)} active {'🔴 CRITICAL' if db >= 22 else '🟡 WARNING' if db >= 15 else '🟢 Normal'}")
    status_lines.append(f"🧵 **Thread Pool**: {int(thr)}/16 active {'🔴 CRITICAL' if thr >= 14 else '🟡 WARNING' if thr >= 10 else '🟢 Normal'}")
    status_lines.append(f"📬 **Queue Depth**: {int(q)} {'🔴 CRITICAL' if q >= 200 else '🟡 WARNING' if q >= 50 else '🟢 Normal'}")
    status_lines.append(f"🖥️ **CPU**: {cpu:.1f}% {'🔴 CRITICAL' if cpu > 90 else '🟡 WARNING' if cpu > 70 else '🟢 Normal'}")
    
    dashboard = f"Here is the live metrics dashboard for **{service}**:\n\n" + "\n".join(status_lines) + f"\n\nFor real-time visual charts, check the Grafana incident dashboard at http://localhost:3001/d/sherlock."
    return dashboard, [
        "What caused this metrics anomaly?",
        "What is the recommended runbook fix?",
        "Who team owns this service?"
    ]


def _get_logs_intent(scenario, service):
    now_str = datetime.now(timezone.utc).isoformat()
    if scenario == "db_exhaustion":
        logs = [
            f"[{now_str}] [ERROR] [auth-service] DB connection pool exhausted. 25/25 connections in use.",
            f"[{now_str}] [WARN] [auth-service] Slow query detected (8400ms): SELECT * FROM user_sessions WHERE created_at > ...",
            f"[{now_str}] [ERROR] [checkout-service] POST /checkout/submit failed: auth-service returned 503 (Service Unavailable)"
        ]
    elif scenario == "memory_leak":
        logs = [
            f"[{now_str}] [CRITICAL] [recommendation-service] Memory usage critical: {358.4:.1f}MB (95% limit reached). No cache eviction active.",
            f"[{now_str}] [INFO] [recommendation-service] RecommendationCache size: 142050 entries, memory leaked.",
            f"[{now_str}] [SYSTEM] [recommendation-service] Container recommendation-service OOMKilled."
        ]
    elif scenario == "api_timeout":
        logs = [
            f"[{now_str}] [ERROR] [payment-service] Upstream payment gateway timeout (30s) on charge validation.",
            f"[{now_str}] [WARN] [payment-service] Thread pool saturated: 16/16 active. Queue depth climbing.",
            f"[{now_str}] [ERROR] [checkout-service] POST /checkout/submit timed out after 30000ms. upstream payment-service blocked."
        ]
    elif scenario == "cpu_stress":
        logs = [
            f"[{now_str}] [CRITICAL] [checkout-service] CPU utilization at 100.0%. Event loop lag: 5200ms.",
            f"[{now_str}] [WARN] [checkout-service] Health check timed out. Thread blocked on payload regex parsing.",
            f"[{now_str}] [ERROR] [nginx] 504 Gateway Timeout on POST /api/checkout/submit"
        ]
    else:
        logs = [
            f"[{now_str}] [INFO] [{service}] System operational.",
            f"[{now_str}] [INFO] [{service}] Performing routine health checks. 200 OK."
        ]
    return f"Here are the most relevant logs for **{service}**:\n\n```log\n" + "\n".join(logs) + "\n```", [
        "What is the root cause based on these logs?",
        "What is the recommended fix?",
        "Show me the metrics dashboard."
    ]


def _get_timeline_intent(scenario, service, incident, err, lat, db, mem):
    if scenario == "db_exhaustion":
        events = [
            "• **T+0min**: Deployment of auth-service v2.3.1 containing unindexed lookup query.",
            "• **T+2min**: Latency begins climbing as sessions table lookup undergoes full scans.",
            f"• **T+4min**: Database connection pool hits 20/25 warning capacity (current: {int(db)}/25).",
            "• **T+6min**: Connections fully saturate at 25/25, new login/checkout requests queue and timeout.",
            "• **T+8min**: Cascading failures start as checkout-service fails to validate sessions."
        ]
    elif scenario == "memory_leak":
        events = [
            "• **T+0min**: Unbounded recommendation cache feature flag enabled.",
            f"• **T+5min**: Cache entries populate rapidly. Memory climbs past 150MB warning threshold.",
            f"• **T+10min**: Cache memory utilization reaches {mem:.0f}MB. GC cycles spike CPU usage.",
            "• **T+12min**: Container hits OOM threshold and is terminated by kernel.",
            "• **T+15min**: Pod enters CrashLoopBackOff as memory leak triggers immediate OOM on restart."
        ]
    elif scenario == "api_timeout":
        events = [
            "• **T+0min**: Third-party payment provider gateway becomes unresponsive.",
            "• **T+1min**: Client requests begin waiting on response, consuming worker threads.",
            "• **T+3min**: Thread pool hits 16/16 limit. Incoming requests queue up.",
            "• **T+5min**: Queue depth exceeds 200. Checkout-service returns timeouts.",
            "• **T+7min**: Circuit breaker should trigger, but manual open is required."
        ]
    elif scenario == "cpu_stress":
        events = [
            "• **T+0min**: Complex payload sent triggering high-backtracking regular expression parsing.",
            "• **T+1min**: CPU core utilization spikes to 100% on all workers.",
            "• **T+3min**: Event loop blocks. Checkout-service stops processing new requests.",
            "• **T+5min**: Kubernetes readiness probes fail. Pod marked as unhealthy."
        ]
    else:
        events = [
            "• **T+0min**: Anomaly detected in telemetry metrics.",
            f"• **T+2min**: Error rate spikes to {err}%.",
            f"• **T+5min**: P95 latency reaches {lat}ms.",
            "• **T+8min**: SHERLOCK incident engine triggers alert."
        ]
    return f"Incident Timeline for **{incident}**:\n\n" + "\n".join(events), [
        "What is the root cause of this sequence of events?",
        "How can we mitigate this immediately?",
        "What prevents this from happening again?"
    ]


def _get_dependency_intent(scenario, service, incident, prompt):
    deps = re.findall(r'(\w+-service): error_rate=([\d.]+)%, p95_latency=([\d.]+)ms', prompt)
    dep_analysis = []
    for dep_svc, dep_err, dep_lat in deps:
        err_f, lat_f = float(dep_err), float(dep_lat)
        if err_f > 5 or lat_f > 500:
            dep_analysis.append(f"  - **{dep_svc}**: error_rate={dep_err}%, latency={dep_lat}ms — **IMPACTED** (Cascading Failure)")
        else:
            dep_analysis.append(f"  - **{dep_svc}**: error_rate={dep_err}%, latency={dep_lat}ms — healthy")
    
    dep_text = "\n".join(dep_analysis) if dep_analysis else "  Cross-service telemetry check not available."
    
    if scenario == "db_exhaustion":
        cascade = "**HIGH RISK**\n\n`auth-service` is a critical upstream dependency for `checkout-service` (used for session validation). When `auth-service` connection pool saturates, checkout requests fail immediately. Recommend implementing a bulkhead pattern and mock fallback authentication."
    elif scenario == "api_timeout":
        cascade = "**HIGH RISK**\n\n`payment-service` acts as a critical bottleneck for the order placement checkout flow. If payments block, checkout threads are starved. Recommend wrapping payment gateways in circuit breakers."
    elif scenario == "memory_leak":
        cascade = "**LOW RISK**\n\n`recommendation-service` failures degrade the user interface (no recommendations shown), but order checkout flows remain functional."
    elif scenario == "cpu_stress":
        cascade = "**MODERATE RISK**\n\n`checkout-service` CPU starvation blocks new orders. Downstream services like `payment-service` will see a reduction in call volume, but are not directly degraded."
    else:
        cascade = f"Degradation of `{service}` may affect downstream consumers depending on API coupling."
        
    return f"Dependency & Cascade Risk Analysis:\n\n{dep_text}\n\n**Blast Radius & Coupling**: {cascade}", [
        "How do we mitigate this blast radius?",
        "What monitoring alerts can we set up?",
        "Show me the timeline of events."
    ]


def _get_query_intent(scenario, service):
    if scenario == "db_exhaustion":
        return (
            "The query causing the connection exhaustion is executing on the `user_sessions` table:\n"
            "```sql\n"
            "SELECT * FROM user_sessions WHERE created_at > NOW() - INTERVAL '30 days' AND status = 'active';\n"
            "```\n"
            "**Audit**: Because there is no database index on the `created_at` column, PostgreSQL is forced to perform a "
            "**Sequential Scan (Seq Scan)** on the entire `user_sessions` table. For large tables, this full table scan takes "
            "several seconds per query, locking the database connection and exhausting the connection pool of 25 connections.",
            ["What index should we add to resolve this?", "How do we kill active slow queries?", "Who team should we contact?"]
        )
    elif scenario == "memory_leak":
        return (
            "The cached object structure causing the memory leak in recommendation-service looks like:\n"
            "```python\n"
            "class RecommendationCache:\n"
            "    def __init__(self):\n"
            "        self._store = {}  # Unbounded dictionary, memory leak\n"
            "\n"
            "    def set(self, user_id, recommendations):\n"
            "        self._store[user_id] = recommendations  # Grows without limit\n"
            "```\n"
            "**Audit**: Since there is no eviction logic or key count limit, the `_store` dictionary grows continuously as user "
            "recommendations are requested, eventually consuming all memory and triggering OOM.",
            ["How do we fix this cache memory leak?", "Show me the logs for recommendation-service.", "What prevents this permanently?"]
        )
    elif scenario == "cpu_stress":
        return (
            "The regular expression causing high CPU backtracking in checkout-service payload validation is:\n"
            "```python\n"
            "import re\n"
            "# Vulnerable regex: exponential backtracking on nested repetitions\n"
            "CHECKOUT_REGEX = re.compile(r'^([a-zA-Z0-9]+)*$')\n"
            "```\n"
            "**Audit**: When parsing long malicious or slightly malformed checkout payload strings, this regular expression "
            "experiences catastrophic backtracking, causing the regex engine to take exponential time to compute, pinning "
            "the CPU core to 100%.",
            ["How do we resolve the CPU stress immediately?", "How do we scale checkout-service horizontally?", "Show me the metrics dashboard."]
        )
    else:
        return (
            "No specific database queries or code snippets are associated with this service/scenario. Review the latest "
            "deployment diff to inspect new codebase changes.",
            ["Show me the metrics dashboard.", "What caused the active incident?"]
        )


def _get_general_intent(scenario, service, incident, err, lat, mem, db, thr, cpu, sev):
    overview = (
        f"Looking at the current state of **{service}**:\n\n"
        f"• **Error Rate**: {err:.2f}% | **P95 Latency**: {lat:.2f}ms\n"
        f"• **Memory**: {mem:.1f}MB | **DB Connections**: {int(db)}/25 active\n"
        f"• **Threads**: {int(thr)}/16 active | **CPU**: {cpu:.1f}%\n"
        f"• **Incident Severity**: {sev.upper()}\n\n"
    )
    if scenario == "db_exhaustion":
        overview += (
            "This service is experiencing a critical **Database Connection Pool Exhaustion** incident. "
            "The database pool is saturated due to slow unindexed queries, causing auth validations to fail."
        )
        followups = ["What query is causing the DB saturation?", "How do we mitigate this database exhaustion?", "Show me the logs."]
    elif scenario == "memory_leak":
        overview += (
            "This service is experiencing a critical **Memory Leak** due to an unbounded cache. "
            "Memory usage is growing linearly, putting the container at immediate risk of OOM termination."
        )
        followups = ["Why is the memory leaking?", "How do we mitigate the memory leak?", "What prevents this permanently?"]
    elif scenario == "api_timeout":
        overview += (
            "This service is experiencing an **Upstream API Timeout** from a third-party gateway. "
            "The failure has saturated the worker thread pool, blocking checkout operations."
        )
        followups = ["Why is the thread pool saturated?", "How do we trip the circuit breaker?", "Show me the logs."]
    elif scenario == "cpu_stress":
        overview += (
            "This service is experiencing **CPU Starvation** at 100% core usage. "
            "An infinite loop or regex backtracking in payload parsing has blocked the event loop."
        )
        followups = ["What causes the CPU starvation?", "How do we scale the service horizontally?", "Show me the timeline."]
    else:
        overview += "All metrics are within nominal limits, and no active anomalies are currently detected."
        followups = ["What scenarios can I trigger?", "Show me the metrics panel.", "Who is on call?"]
        
    return overview, followups
