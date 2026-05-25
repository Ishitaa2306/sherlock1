export interface MockTimelineEvent {
  timestamp: string;
  event_type: 'warning' | 'error' | 'critical' | 'deployment' | 'ai_analysis';
  title: string;
  description: string;
}

export interface MockMetricAnomaly {
  metric_name: string;
  normal_value: string;
  incident_value: string;
  unit: string;
}

export interface MockChartData {
  labels: string[];
  error_rate: number[];
  db_connections: number[];
  cpu_usage: number[];
  response_time: number[];
}

export interface MockAnalysisPayload {
  incident_title: string;
  affected_service: string;
  severity: 'P1' | 'P2' | 'P3';
  root_cause: string;
  confidence: number;
  confidence_reasoning: string;
  chain_of_events: MockTimelineEvent[];
  evidence_used: string[];
  immediate_fix: {
    description: string;
    action_label: string;
  };
  long_term_fix: {
    description: string;
    action_label: string;
  };
  diagnosis_summary: string;
  metrics_anomalies: MockMetricAnomaly[];
  chart_data: MockChartData;
  deployment_marker: string | null;
}

const mockAnalysis: Record<string, MockAnalysisPayload> = {
  "INC-001": {
    incident_title: "Redis Cache Exhaustion & Session Eviction",
    affected_service: "auth-service",
    severity: "P1",
    root_cause: "A 400% surge in external authentication API calls beginning at 02:10 AM exceeded Redis max-memory limits at 02:14 AM, causing session token generation to fail with OOM responses and preventing all new user logins.",
    confidence: 92,
    confidence_reasoning: "High confidence — Redis memory threshold breach timestamp directly precedes session generation failures, OOM errors explicitly logged, and external traffic surge confirmed in metrics.",
    chain_of_events: [
      {
        timestamp: "02:10 AM",
        event_type: "warning",
        title: "External authentication surge begins",
        description: "External authentication API calls rose 400% above baseline, flooding the session creation pipeline."
      },
      {
        timestamp: "02:14 AM",
        event_type: "error",
        title: "Redis max-memory capacity exceeded",
        description: "Physical cache memory exceeded configured allocation of 512MB, triggering eviction policy conflicts."
      },
      {
        timestamp: "02:15 AM",
        event_type: "critical",
        title: "Token generation dispatch failed",
        description: "Session store returned out-of-memory responses causing 100% failure rate on new session creation."
      },
      {
        timestamp: "02:18 AM",
        event_type: "ai_analysis",
        title: "ARIA identified root cause keys",
        description: "Vault sessions config files identified as lacking dynamic TTL policies confirming memory exhaustion root cause."
      }
    ],
    evidence_used: [
      "Log at 02:14 AM: Redis MAXMEMORY condition reached — eviction policy allkeys-lru triggered",
      "Log at 02:15 AM: ERROR auth-service — SessionStore OOM: cannot allocate new session token",
      "Metric: Redis memory usage spiked from 61% to 100% between 02:10 and 02:14 AM",
      "Metric: Authentication request rate increased 400% from baseline at 02:10 AM",
      "Metric: Session creation success rate dropped from 99.8% to 0% at 02:15 AM"
    ],
    immediate_fix: {
      description: "Flush expired session tokens immediately using Redis CLI and execute configuration patch to trigger LRU eviction on expired keys. This frees 40 to 60% of Redis memory and restores session creation within 2 to 3 minutes.",
      action_label: "FLUSH & HOT-PATCH REDIS"
    },
    long_term_fix: {
      description: "Refactor Vault dynamic session token parameters to require mandatory key lifetimes with maximum TTL of 3600 seconds. Implement Redis memory alerting at 70% threshold. Add auto-scaling for Redis cluster during traffic spikes.",
      action_label: "CREATE JIRA TICKET"
    },
    diagnosis_summary: "A sudden 400% traffic surge overwhelmed Redis cache capacity, exhausting memory and breaking session token generation. The root cause is missing TTL policies on session keys combined with insufficient Redis memory allocation for peak traffic scenarios.",
    metrics_anomalies: [
      { metric_name: "error_rate", normal_value: "0.2", incident_value: "4.8", unit: "percentage" },
      { metric_name: "db_connections", normal_value: "12", incident_value: "28", unit: "active connections" },
      { metric_name: "cpu_usage", normal_value: "34", incident_value: "96", unit: "percentage" },
      { metric_name: "response_time", normal_value: "48", incident_value: "198", unit: "milliseconds" }
    ],
    chart_data: {
      labels: ["02:00","02:02","02:04","02:06","02:08","02:10","02:12","02:14","02:16","02:18","02:20"],
      error_rate: [0.2,0.2,0.2,0.2,0.2,0.8,2.1,4.8,4.8,4.6,4.5],
      db_connections: [12,12,13,12,13,15,20,28,28,27,26],
      cpu_usage: [34,35,34,36,35,52,78,96,95,93,91],
      response_time: [48,50,49,51,48,89,134,198,195,191,188]
    },
    deployment_marker: null
  },
  "INC-002": {
    incident_title: "Database Connection Pool Exhaustion",
    affected_service: "payment-service",
    severity: "P1",
    root_cause: "Deployment v2.4.1 at 01:43 AM introduced a full table scan query on the user_recommendations table (50M rows) without an index, causing each API call to hold a database connection for 44 seconds and exhausting the 100-connection pool by 01:50 AM.",
    confidence: 87,
    confidence_reasoning: "High confidence — deployment timestamp at 01:43 directly precedes connection pool exhaustion at 01:50, logs explicitly show slow query on user_recommendations, and metric spike aligns precisely with deployment window.",
    chain_of_events: [
      {
        timestamp: "01:43 AM",
        event_type: "deployment",
        title: "Deployment v2.4.1 goes live",
        description: "New recommendations API endpoint deployed with unindexed full table scan query on user_recommendations table containing 50M rows."
      },
      {
        timestamp: "01:47 AM",
        event_type: "warning",
        title: "DB connection pool reaches 78%",
        description: "Each /api/recommendations call holds a connection for 44 seconds. Connections accumulate faster than they release."
      },
      {
        timestamp: "01:49 AM",
        event_type: "error",
        title: "Connection pool reaches 100% capacity",
        description: "All 100 database connections exhausted. New requests including login begin queuing with 30 second timeout."
      },
      {
        timestamp: "01:50 AM",
        event_type: "critical",
        title: "Auth service begins failing",
        description: "Login requests cannot acquire database connections. Error rate spikes from 0.2% to 23% within 60 seconds."
      },
      {
        timestamp: "01:51 AM",
        event_type: "ai_analysis",
        title: "ARIA root cause analysis complete",
        description: "Deployment v2.4.1 identified as root cause with 87% confidence based on query timing and connection pool correlation."
      }
    ],
    evidence_used: [
      "Deployment log at 01:43 AM: v2.4.1 deployed — includes new query on user_recommendations table",
      "Log at 01:47 AM: WARN database — connection pool at 78/100 capacity",
      "Log at 01:49 AM: ERROR database — connection pool at 100/100 requests queuing",
      "Log at 01:50 AM: ERROR auth-service — failed to acquire DB connection after 30000ms",
      "Metric: DB connections climbed from 20 to 100 between 01:44 and 01:50 AM",
      "Metric: Response time spiked from 52ms to 30000ms at 01:50 AM"
    ],
    immediate_fix: {
      description: "Roll back deployment v2.4.1 to v2.4.0 immediately using the deployment pipeline. This removes the unindexed query and restores normal connection pool levels within 3 to 4 minutes as slow queries drain.",
      action_label: "ROLLBACK v2.4.1"
    },
    long_term_fix: {
      description: "Add a composite index on user_recommendations(user_id, created_at) before redeploying. Implement mandatory query performance testing in CI/CD pipeline. Add connection pool alerting at 60% threshold with page to on-call engineer.",
      action_label: "CREATE JIRA TICKET"
    },
    diagnosis_summary: "A deployment introduced a catastrophically slow database query that held connections for 44 seconds each, exhausting the connection pool and cascading failures across all database-dependent services including authentication and payments.",
    metrics_anomalies: [
      { metric_name: "error_rate", normal_value: "0.2", incident_value: "23", unit: "percentage" },
      { metric_name: "db_connections", normal_value: "20", incident_value: "100", unit: "active connections" },
      { metric_name: "response_time", normal_value: "52", incident_value: "30000", unit: "milliseconds" },
      { metric_name: "cpu_usage", normal_value: "34", incident_value: "96", unit: "percentage" }
    ],
    chart_data: {
      labels: ["01:40","01:42","01:44","01:46","01:47","01:48","01:49","01:50","01:51","01:52"],
      error_rate: [0.1,0.1,0.2,1.2,3.4,8.7,15.2,23.0,24.1,24.1],
      db_connections: [18,20,22,45,78,94,100,100,100,100],
      cpu_usage: [34,36,36,67,78,89,92,96,94,94],
      response_time: [48,52,52,890,4200,15000,28000,30000,30000,30000]
    },
    deployment_marker: "01:43"
  },
  "INC-003": {
    incident_title: "API Gateway Timeout Errors",
    affected_service: "api-gateway",
    severity: "P2",
    root_cause: "SendGrid email API began experiencing elevated latency of 2800ms at 03:08 AM against a configured timeout of 5000ms, causing notification-service retry storms that saturated all 32 worker threads and blocked the api-gateway upstream.",
    confidence: 45,
    confidence_reasoning: "Medium confidence — external dependency failure confirmed but root cause of SendGrid latency elevation is outside our infrastructure. Internal circuit breaker absence is a contributing architectural factor.",
    chain_of_events: [
      {
        timestamp: "03:08 AM",
        event_type: "warning",
        title: "SendGrid API latency elevates",
        description: "SendGrid /v3/mail/send response time increases from 400ms to 2800ms — external infrastructure issue beyond our control."
      },
      {
        timestamp: "03:10 AM",
        event_type: "error",
        title: "Notification service timeout errors begin",
        description: "Email delivery requests begin timing out at 5000ms. Retry logic triggers 3 attempts per failed request multiplying load."
      },
      {
        timestamp: "03:13 AM",
        event_type: "error",
        title: "Worker thread pool saturated",
        description: "All 32 notification-service worker threads occupied with SendGrid retries. New requests queue indefinitely."
      },
      {
        timestamp: "03:15 AM",
        event_type: "critical",
        title: "API Gateway timeout alert fires",
        description: "api-gateway cannot reach notification-service. Timeout error rate reaches 18% exceeding the 10% threshold."
      }
    ],
    evidence_used: [
      "Log at 03:08 AM: WARN api-gateway — SendGrid response time 2800ms normal baseline 400ms",
      "Log at 03:10 AM: ERROR notification-service — SendGrid POST /v3/mail/send timeout after 5000ms",
      "Log at 03:13 AM: ERROR notification-service — all 32 worker threads occupied with retry tasks",
      "Infrastructure event at 03:08 AM: SendGrid status page reports elevated latency on mail endpoints",
      "Metric: api-gateway error rate climbed from 0.3% to 18% between 03:08 and 03:15 AM"
    ],
    immediate_fix: {
      description: "Temporarily disable the email notification feature flag to stop all new SendGrid requests. This immediately frees worker threads and restores api-gateway response times within 60 seconds.",
      action_label: "DISABLE EMAIL FEATURE"
    },
    long_term_fix: {
      description: "Implement circuit breaker pattern on notification-service with 3-second timeout and fallback to async queue. Add SendGrid latency monitoring with alert at 1000ms. Implement bulkhead isolation so email failures cannot saturate the shared worker pool.",
      action_label: "CREATE JIRA TICKET"
    },
    diagnosis_summary: "An external SendGrid outage triggered a retry storm in the notification service which saturated all available worker threads and cascaded to block the api-gateway. The underlying architectural issue is the complete absence of a circuit breaker pattern on the external email dependency.",
    metrics_anomalies: [
      { metric_name: "error_rate", normal_value: "0.3", incident_value: "18", unit: "percentage" },
      { metric_name: "response_time", normal_value: "180", incident_value: "15000", unit: "milliseconds" },
      { metric_name: "cpu_usage", normal_value: "31", incident_value: "74", unit: "percentage" }
    ],
    chart_data: {
      labels: ["03:00","03:02","03:04","03:06","03:08","03:10","03:12","03:14","03:15"],
      error_rate: [0.3,0.3,0.3,0.3,0.8,4.2,9.8,15.3,18.0],
      db_connections: [22,22,23,22,24,24,26,28,28],
      cpu_usage: [31,32,31,33,38,52,61,68,74],
      response_time: [180,182,179,181,890,3400,8900,12000,15000]
    },
    deployment_marker: null
  },
  "INC-004": {
    incident_title: "File Processor Memory Leak — OOM Crash",
    affected_service: "file-processor-service",
    severity: "P2",
    root_cause: "A memory leak in ImageMagick buffer handling within file-processor-service caused heap memory to grow steadily from 41% at 01:30 AM to 98% by 04:15 AM, eventually triggering a fatal OOM crash at 04:22 AM after processing approximately 2400 file upload jobs.",
    confidence: 72,
    confidence_reasoning: "Good confidence — steady linear memory growth at 0.33% per minute over 173 minutes is a classic memory leak signature. ImageMagick stream objects explicitly referenced in logs as accumulating. No deployment in window confirms pre-existing code defect not a regression.",
    chain_of_events: [
      {
        timestamp: "01:30 AM",
        event_type: "warning",
        title: "Memory growth pattern begins",
        description: "file-processor-service memory at 41%. ImageMagick buffer objects begin accumulating in heap with each processed upload."
      },
      {
        timestamp: "03:00 AM",
        event_type: "warning",
        title: "Memory reaches 79% — GC pressure",
        description: "Garbage collector unable to free ImageMagick stream objects. Processing throughput begins degrading as GC cycles increase."
      },
      {
        timestamp: "04:15 AM",
        event_type: "error",
        title: "Memory at 98% — critical threshold",
        description: "Heap approaching 2048MB limit. GC running continuously. Service throughput dropped 60% due to GC pause times."
      },
      {
        timestamp: "04:22 AM",
        event_type: "critical",
        title: "OOM crash — service completely down",
        description: "Fatal JavaScript heap out of memory error. All 3 pods crash simultaneously. File upload endpoint returns 503 to all users."
      },
      {
        timestamp: "04:23 AM",
        event_type: "ai_analysis",
        title: "ARIA memory leak pattern confirmed",
        description: "Linear memory growth over 173 minutes confirms ImageMagick buffer leak as root cause with 72% confidence."
      }
    ],
    evidence_used: [
      "Log at 03:00 AM: WARN — ImageMagick buffer objects accumulating in heap GC unable to free stream handles",
      "Log at 04:22 AM: FATAL — JavaScript heap out of memory — Allocation failed — process killed",
      "Metric: Memory grew linearly from 41% at 01:30 to 98% at 04:15 — consistent 0.33% per minute growth rate",
      "Metric: CPU spiked to 89% at 04:15 as GC ran continuously attempting to reclaim memory",
      "No deployments in the 3-hour incident window — confirms pre-existing code defect not deployment regression"
    ],
    immediate_fix: {
      description: "Restart all file-processor-service pods immediately to clear the heap and restore upload functionality. Set up an automated restart trigger at 80% memory threshold as a temporary mitigation until the code fix is deployed.",
      action_label: "RESTART SERVICE PODS"
    },
    long_term_fix: {
      description: "Audit all ImageMagick stream handling in file-processor-service — ensure stream.destroy() is explicitly called in every code path including all error handlers and finally blocks. Add heap memory alerting at 70% threshold with automated pod restart. Integrate heap profiling into CI/CD pipeline to catch leaks before production.",
      action_label: "CREATE JIRA TICKET"
    },
    diagnosis_summary: "A pre-existing memory leak in ImageMagick buffer handling caused gradual heap exhaustion over 173 minutes of normal operation. The service crashed when the Node.js heap reached its 2048MB configured limit. This is a code defect unrelated to any recent deployment and will recur on every pod restart until the stream.destroy() fix is deployed.",
    metrics_anomalies: [
      { metric_name: "memory_usage", normal_value: "41", incident_value: "98", unit: "percentage" },
      { metric_name: "error_rate", normal_value: "0.1", incident_value: "100", unit: "percentage" },
      { metric_name: "cpu_usage", normal_value: "28", incident_value: "89", unit: "percentage" }
    ],
    chart_data: {
      labels: ["01:30","02:00","02:30","03:00","03:30","04:00","04:15","04:22"],
      error_rate: [0.1,0.1,0.2,0.3,0.8,1.2,8.4,100],
      db_connections: [12,14,13,14,15,16,15,0],
      cpu_usage: [28,31,38,44,58,67,89,0],
      response_time: [120,134,198,289,640,1240,4800,0]
    },
    deployment_marker: null
  }
};

export default mockAnalysis;
