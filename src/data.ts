import type { Incident } from './types';

export const mockIncidents: Incident[] = [
  {
    id: 'inc-p1-db-pool',
    severity: 'P1',
    status: 'Root Cause Identified',
    confidence: 87,
    service: 'payment-service',
    title: 'Database Connection Pool Exhaustion',
    timestamp: 'Jan 15, 01:51',
    rootCause: 'Deployment v2.4.1 introduced an unoptimized query causing DB pool exhaustion.',
    affectedServicesCount: 3,
    analysisTimeSeconds: 8,
    impactedServices: ['payment-service', 'checkout-api', 'user-service'],
    evidenceTrail: [
      {
        id: 'ev-1',
        type: 'deployments',
        title: 'Deployment v2.4.1 initiated',
        timestamp: '01:43:22',
        description: 'payment-service deployed to production cluster with 4 new db commits.',
        snippet: 'commit 8c2f109: add query-batching to bulk payment orders\ncommit a4f7d2e: update node pg-pool max connections default to 20',
        severity: 'info'
      },
      {
        id: 'ev-2',
        type: 'metrics',
        title: 'DB connection pool spike',
        timestamp: '01:47:15',
        description: 'Database connection utilization rose from 12% to 98% in under 90 seconds.',
        snippet: 'FATAL: remaining connection slots are reserved for non-replication superuser connections\npool utilization: 98/100 active connections',
        severity: 'critical'
      },
      {
        id: 'ev-3',
        type: 'logs',
        title: 'Slow query execution logs detected',
        timestamp: '01:48:40',
        description: 'Unindexed JOIN operations detected in billing reconciliations ledger logs.',
        snippet: 'SELECT * FROM ledger l INNER JOIN users u ON l.user_id = u.id \nWHERE l.status = \'pending\' ORDER BY l.created_at DESC;\n-- duration: 8400ms | affected_rows: 15,200',
        severity: 'warning'
      },
      {
        id: 'ev-4',
        type: 'traces',
        title: 'Request latency anomaly',
        timestamp: '01:49:01',
        description: 'P99 latency exceeded 5000ms threshold on /checkout/pay route.',
        snippet: 'trace_id: tr-8b9a102f9c\nspan: checkout-service -> payment-service (5420ms)\nerror: ContextTimeoutExceeded',
        severity: 'critical'
      }
    ],
    chainOfEvents: [
      {
        time: '01:43',
        title: 'Deployment v2.4.1 initiated',
        description: 'payment-service rolled out in zone-b',
        status: 'info'
      },
      {
        time: '01:47',
        title: 'DB latency spike detected',
        description: 'Average query execution time rose to 8.4s',
        status: 'warning'
      },
      {
        time: '01:48',
        title: 'Connection pool exhausted',
        description: 'All 20 available connection threads occupied',
        status: 'error'
      },
      {
        time: '01:50',
        title: 'Error rate exceeded 5% threshold',
        description: '500 Server Errors spike on gateway nodes',
        status: 'error'
      },
      {
        time: '01:51',
        title: 'AI identified root cause',
        description: 'Ledger table scanning identified as bottleneck',
        status: 'success'
      }
    ],
    immediateFix: {
      description: 'Rollback deployment v2.4.1 to restore database connection stability.',
      actionLabel: 'Execute Rollback',
      commandToRun: 'kubectl rollout undo deployment/payment-service -n prod'
    },
    longTermFix: {
      description: 'Optimize the affected query with proper indexing and connection pooling tuning.',
      actionLabel: 'Create Jira Ticket'
    },
    aiCorrelationSummary: 'Strong correlation found between deployment timestamp and metric anomalies. Error rate spike coincides with DB connection pool saturation at 01:47:15 — 4 minutes after deployment.',
    chartData: {
      deploymentIndex: 1, // Represents 01:44
      errorRate: [
        { time: '01:40', value: 0.1 },
        { time: '01:44', value: 0.2 }, // v2.4.1 Marker
        { time: '01:48', value: 2.2 },
        { time: '01:51', value: 2.5 },
        { time: '01:54', value: 1.8 },
        { time: '01:59', value: 0.2 }
      ],
      dbConnections: [
        { time: '01:40', value: 4 },
        { time: '01:44', value: 5 }, // v2.4.1 Marker
        { time: '01:48', value: 22 },
        { time: '01:51', value: 24 },
        { time: '01:54', value: 20 },
        { time: '01:59', value: 6 }
      ],
      cpuUsage: [
        { time: '01:40', value: 15 },
        { time: '01:44', value: 18 },
        { time: '01:48', value: 40 },
        { time: '01:51', value: 46 },
        { time: '01:54', value: 35 },
        { time: '01:59', value: 16 }
      ],
      latency: [
        { time: '01:40', value: 14 },
        { time: '01:44', value: 16 },
        { time: '01:48', value: 102 },
        { time: '01:51', value: 124 },
        { time: '01:54', value: 85 },
        { time: '01:59', value: 18 }
      ]
    }
  },
  {
    id: 'inc-p2-api-gw',
    severity: 'P2',
    status: 'Investigating',
    confidence: 45,
    service: 'api-gateway',
    title: 'API Gateway Timeout Errors',
    timestamp: 'Jan 16, 14:22',
    rootCause: 'Consul route propagation latency in network fabrics causing packet drop rates >15%.',
    affectedServicesCount: 2,
    analysisTimeSeconds: 4,
    impactedServices: ['api-gateway', 'auth-service'],
    evidenceTrail: [
      {
        id: 'ev-201',
        type: 'deployments',
        title: 'Consul configuration reload',
        timestamp: '14:15:10',
        description: 'Agent hot-reload triggered on cluster zone-a.',
        snippet: 'consul reload -config-dir=/etc/consul.d/\n==> Configuration reload triggered...',
        severity: 'info'
      },
      {
        id: 'ev-202',
        type: 'metrics',
        title: 'Packet drop rate spike',
        timestamp: '14:18:00',
        description: 'Internal routing packet drop rates exceeded normal threshold by 12x.',
        snippet: 'packet loss: 16.4%\nroute status: degraded (node-09)',
        severity: 'warning'
      },
      {
        id: 'ev-203',
        type: 'traces',
        title: 'Gateway timeout events',
        timestamp: '14:20:45',
        description: '504 Gateway Timeouts detected on critical user auth endpoints.',
        snippet: 'GET /api/v1/auth/session - 504 Gateway Timeout (5002ms)\nclient_ip: 102.84.12.3',
        severity: 'critical'
      }
    ],
    chainOfEvents: [
      {
        time: '14:15',
        title: 'Consul config reload triggered',
        description: 'Hot config reload initiated by operations script',
        status: 'info'
      },
      {
        time: '14:18',
        title: 'Internal route sync failure',
        description: 'Auth service nodes disappeared from load-balancer registry',
        status: 'warning'
      },
      {
        time: '14:20',
        title: '504 Gateway Timeouts active',
        description: 'Critical authentication requests began piling up',
        status: 'error'
      },
      {
        time: '14:22',
        title: 'AI correlation initiated',
        description: 'Scanning service meshes and network routing fabrics...',
        status: 'info'
      }
    ],
    immediateFix: {
      description: 'Force cache flush and restart Consul agent container on degraded nodes.',
      actionLabel: 'Flush Agent Cache',
      commandToRun: 'docker restart consul-agent-zone-a'
    },
    longTermFix: {
      description: 'Configure intelligent fallback routes and increase Consul sync heartbeat timers.',
      actionLabel: 'Optimize Config'
    },
    aiCorrelationSummary: 'AI identified a high likelihood (45%) of route synchronization failure coinciding with Consul mesh config update at 14:15. Route convergence is blocked by unresolvable zone-a networks.',
    chartData: {
      deploymentIndex: 1, // Represents 14:16
      errorRate: [
        { time: '14:10', value: 0.05 },
        { time: '14:16', value: 0.1 }, // consul sync marker
        { time: '14:20', value: 1.9 },
        { time: '14:24', value: 2.2 },
        { time: '14:28', value: 2.0 },
        { time: '14:32', value: 0.08 }
      ],
      dbConnections: [
        { time: '14:10', value: 8 },
        { time: '14:16', value: 8 },
        { time: '14:20', value: 19 },
        { time: '14:24', value: 21 },
        { time: '14:28', value: 15 },
        { time: '14:32', value: 9 }
      ],
      cpuUsage: [
        { time: '14:10', value: 22 },
        { time: '14:16', value: 25 },
        { time: '14:20', value: 46 },
        { time: '14:24', value: 48 },
        { time: '14:28', value: 39 },
        { time: '14:32', value: 24 }
      ],
      latency: [
        { time: '14:10', value: 12 },
        { time: '14:16', value: 14 },
        { time: '14:20', value: 86 },
        { time: '14:24', value: 98 },
        { time: '14:28', value: 72 },
        { time: '14:32', value: 14 }
      ]
    }
  },
  {
    id: 'inc-p2-memory-leak',
    severity: 'P2',
    status: 'Monitoring',
    confidence: 72,
    service: 'worker-service',
    title: 'Memory Leak in Worker Pods',
    timestamp: 'Jan 15, 12:30',
    rootCause: 'Circular references in the cached user profiles parser leaking heap memory.',
    affectedServicesCount: 1,
    analysisTimeSeconds: 6,
    impactedServices: ['worker-service'],
    evidenceTrail: [
      {
        id: 'ev-301',
        type: 'logs',
        title: 'Heap memory usage breach',
        timestamp: '12:15:30',
        description: 'Node process memory allocation crossed critical warning threshold (88%).',
        snippet: 'WARNING: Heap limit reached (942MB / 1024MB)\nPerforming GC sweep, freed: 4MB (ineffective)',
        severity: 'critical'
      },
      {
        id: 'ev-302',
        type: 'traces',
        title: 'OOM container kill event',
        timestamp: '12:22:12',
        description: 'Kubernetes node terminated worker-pod-3df2b due to Out-Of-Memory limit.',
        snippet: 'reason: OOMKilled\nexitCode: 137\ncontainer_id: docker://83fa109f',
        severity: 'critical'
      }
    ],
    chainOfEvents: [
      {
        time: '12:10',
        title: 'Cache sync schedule launched',
        description: 'Large bulk customer catalog batch started running',
        status: 'info'
      },
      {
        time: '12:15',
        title: 'GC thrashing detected',
        description: 'V8 engine spending 84% time on ineffective garbage collections',
        status: 'warning'
      },
      {
        time: '12:22',
        title: 'Pod container terminated (OOM)',
        description: 'Kubernetes restarted worker replica #3',
        status: 'error'
      },
      {
        time: '12:30',
        title: 'Root cause identified',
        description: 'Circular references found in JSON catalog deserializer',
        status: 'success'
      }
    ],
    immediateFix: {
      description: 'Scale worker pods pool deployment up to 6 replicas and trigger rolling updates.',
      actionLabel: 'Scale Replicas',
      commandToRun: 'kubectl scale deployment/worker-service --replicas=6'
    },
    longTermFix: {
      description: 'Rewrite JSON parse tree mappings to drop pointer loops and use WeakMaps.',
      actionLabel: 'Create Jira Ticket'
    },
    aiCorrelationSummary: 'Memory utilization logs indicate an accumulation of uncollected map nodes during JSON parsing operations starting at 12:10:00. This is typical of an active circular reference in native buffers.',
    chartData: {
      deploymentIndex: 1,
      errorRate: [
        { time: '12:00', value: 0.0 },
        { time: '12:10', value: 0.1 },
        { time: '12:20', value: 0.8 },
        { time: '12:30', value: 4.1 },
        { time: '12:40', value: 2.2 },
        { time: '12:50', value: 0.1 }
      ],
      dbConnections: [
        { time: '12:00', value: 3 },
        { time: '12:10', value: 4 },
        { time: '12:20', value: 5 },
        { time: '12:30', value: 6 },
        { time: '12:40', value: 4 },
        { time: '12:50', value: 3 }
      ],
      cpuUsage: [
        { time: '12:00', value: 12 },
        { time: '12:10', value: 14 },
        { time: '12:20', value: 82 },
        { time: '12:30', value: 96 },
        { time: '12:40', value: 54 },
        { time: '12:50', value: 16 }
      ],
      latency: [
        { time: '12:00', value: 4 },
        { time: '12:10', value: 6 },
        { time: '12:20', value: 24 },
        { time: '12:30', value: 184 },
        { time: '12:40', value: 45 },
        { time: '12:50', value: 5 }
      ]
    }
  },
  {
    id: 'inc-p3-cdn-fail',
    severity: 'P3',
    status: 'Resolved',
    confidence: 95,
    service: 'cdn-assets',
    title: 'CDN Cache Invalidation Failure',
    timestamp: 'Jan 14, 23:45',
    rootCause: 'Invalid API key configurations in Cloudflare edge webhooks.',
    affectedServicesCount: 2,
    analysisTimeSeconds: 2,
    impactedServices: ['cdn-assets', 'static-router'],
    evidenceTrail: [
      {
        id: 'ev-401',
        type: 'logs',
        title: 'Edge webhook response failure',
        timestamp: '23:41:15',
        description: 'Purge dispatch request returned HTTP 403 Forbidden.',
        snippet: 'POST https://api.cloudflare.com/client/v4/zones/.../purge_cache\n< HTTP/1.1 403 Forbidden\n{ "success": false, "errors": [{ "code": 9109, "message": "Unauthorized" }] }',
        severity: 'critical'
      }
    ],
    chainOfEvents: [
      {
        time: '23:38',
        title: 'Static assets deployed',
        description: 'v2.4.0 static images and bundles written to S3',
        status: 'info'
      },
      {
        time: '23:40',
        title: 'CDN Cache Purge dispatched',
        description: 'Webhook sent to Cloudflare cache proxy API',
        status: 'warning'
      },
      {
        time: '23:41',
        title: 'API Authentication Rejected',
        description: 'Cloudflare returned 403 authorization error',
        status: 'error'
      },
      {
        time: '23:45',
        title: 'AI Root Cause Verified',
        description: 'Webhook credentials successfully resolved and verified',
        status: 'success'
      }
    ],
    immediateFix: {
      description: 'Sync credentials in HashiCorp Vault webhook store.',
      actionLabel: 'Sync Vault Secrets'
    },
    longTermFix: {
      description: 'Automate API token renewal rotation via Terraform secret management policies.',
      actionLabel: 'Create Jira Ticket'
    },
    aiCorrelationSummary: 'Webhook invalidations fail systematically on Cloudflare route endpoints starting immediately at 23:40:00. Token validation shows expired credentials from Vault storage.',
    chartData: {
      deploymentIndex: 1,
      errorRate: [
        { time: '23:30', value: 0.0 },
        { time: '23:38', value: 0.0 },
        { time: '23:41', value: 1.4 },
        { time: '23:45', value: 1.5 },
        { time: '23:50', value: 0.1 },
        { time: '23:58', value: 0.0 }
      ],
      dbConnections: [
        { time: '23:30', value: 2 },
        { time: '23:38', value: 2 },
        { time: '23:41', value: 2 },
        { time: '23:45', value: 2 },
        { time: '23:50', value: 2 },
        { time: '23:58', value: 2 }
      ],
      cpuUsage: [
        { time: '23:30', value: 8 },
        { time: '23:38', value: 8 },
        { time: '23:41', value: 12 },
        { time: '23:45', value: 14 },
        { time: '23:50', value: 9 },
        { time: '23:58', value: 8 }
      ],
      latency: [
        { time: '23:30', value: 4 },
        { time: '23:38', value: 4 },
        { time: '23:41', value: 18 },
        { time: '23:45', value: 16 },
        { time: '23:50', value: 5 },
        { time: '23:58', value: 4 }
      ]
    }
  }
];
