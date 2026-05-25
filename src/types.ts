export type Severity = 'P1' | 'P2' | 'P3';
export type IncidentStatus = 'Investigating' | 'Root Cause Identified' | 'Monitoring' | 'Resolved';

export interface TimelineEvent {
  time: string;
  title: string;
  description?: string;
  status: 'info' | 'warning' | 'error' | 'success';
}

export interface EvidenceItem {
  id: string;
  type: 'logs' | 'metrics' | 'deployments' | 'traces';
  title: string;
  timestamp: string;
  description: string;
  snippet?: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface MetricPoint {
  time: string;
  value: number;
}

export interface ChartData {
  errorRate: MetricPoint[];
  dbConnections: MetricPoint[];
  cpuUsage: MetricPoint[];
  latency: MetricPoint[];
  deploymentIndex?: number; // Where on the charts the vertical line should draw
}

export interface Incident {
  id: string;
  severity: Severity;
  status: IncidentStatus;
  confidence: number;
  service: string;
  title: string;
  timestamp: string;
  rootCause: string;
  affectedServicesCount: number;
  analysisTimeSeconds: number;
  impactedServices: string[];
  evidenceTrail: EvidenceItem[];
  chainOfEvents: TimelineEvent[];
  immediateFix: {
    description: string;
    actionLabel: string;
    commandToRun?: string;
  };
  longTermFix: {
    description: string;
    actionLabel: string;
  };
  aiCorrelationSummary: string;
  chartData: ChartData;
}
