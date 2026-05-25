import config from '../config';
import mockIncidents from '../data/mockIncidents';
import type { MockIncidentMetadata } from '../data/mockIncidents';
import mockAnalysis from '../data/mockAnalysis';
import type { MockAnalysisPayload } from '../data/mockAnalysis';
import type { Incident, IncidentStatus, TimelineEvent, EvidenceItem, MetricPoint } from '../types';

/**
 * Dynamic adapter mapping flat ARIA AI response schema to rich UI Component interfaces.
 * This keeps all custom SVG telemetric charts, accordions, and active alerts working seamlessly.
 */
function mapAnalysisToIncident(
  metadata: MockIncidentMetadata,
  analysis: MockAnalysisPayload
): Incident {
  // Parse flat string logs in evidence_used into structured EvidenceItem[] accordions
  const evidenceTrail: EvidenceItem[] = (analysis.evidence_used || []).map((str, idx) => {
    const lowerStr = str.toLowerCase();
    let type: 'logs' | 'metrics' | 'deployments' | 'traces' = 'logs';

    if (lowerStr.includes('metric:')) type = 'metrics';
    else if (lowerStr.includes('deployment log') || lowerStr.includes('deploy:')) type = 'deployments';
    else if (lowerStr.includes('trace:') || lowerStr.includes('latency')) type = 'traces';

    // Parse timing markers (e.g. "02:14 AM")
    const timeMatch = str.match(/\b\d{2}:\d{2}\s*(?:AM|PM)?\b/i);
    const timestamp = timeMatch ? timeMatch[0] : metadata.firedAt;

    // Clean prefix logs identifiers e.g. "Log at 02:14 AM: "
    const cleanDescription = str.replace(/^[^:]+:\s*/, '');

    return {
      id: `ev-${idx}`,
      type,
      title: str.split(':')[0] || 'Telemetry Event',
      timestamp,
      description: cleanDescription,
      snippet: str, // Dump complete log string as preview snippet
      severity: lowerStr.includes('error') || lowerStr.includes('fatal') || lowerStr.includes('critical') ? 'critical' : 'warning'
    };
  });

  // Map timeline events
  const chainOfEvents: TimelineEvent[] = (analysis.chain_of_events || []).map((evt) => ({
    time: evt.timestamp,
    title: evt.title,
    description: evt.description,
    status: evt.event_type === 'critical' || evt.event_type === 'error' ? 'error' :
            evt.event_type === 'warning' ? 'warning' :
            evt.event_type === 'deployment' ? 'info' : 'success'
  }));

  // Build telemetry metric points from mock arrays
  const labels = analysis.chart_data?.labels || [];
  const errorRate: MetricPoint[] = (analysis.chart_data?.error_rate || []).map((v, i) => ({
    time: labels[i] || '00:00',
    value: v
  }));
  const dbConnections: MetricPoint[] = (analysis.chart_data?.db_connections || []).map((v, i) => ({
    time: labels[i] || '00:00',
    value: v
  }));
  const cpuUsage: MetricPoint[] = (analysis.chart_data?.cpu_usage || []).map((v, i) => ({
    time: labels[i] || '00:00',
    value: v
  }));
  const latency: MetricPoint[] = (analysis.chart_data?.response_time || []).map((v, i) => ({
    time: labels[i] || '00:00',
    value: v
  }));

  const deploymentIndex = analysis.deployment_marker ? labels.indexOf(analysis.deployment_marker) : undefined;

  // Build compliant Incident interface
  return {
    id: metadata.id,
    severity: metadata.severity,
    status: (metadata.status === 'ROOT CAUSE FOUND' ? 'Root Cause Identified' : metadata.status) as IncidentStatus,
    confidence: analysis.confidence,
    service: metadata.service,
    title: metadata.title,
    timestamp: metadata.firedAt,
    rootCause: analysis.root_cause,
    affectedServicesCount: analysis.metrics_anomalies?.length || 3,
    analysisTimeSeconds: 5, // Simulated heuristic time
    impactedServices: [metadata.service, ...(analysis.affected_service !== metadata.service ? [analysis.affected_service] : [])],
    evidenceTrail,
    chainOfEvents,
    immediateFix: {
      description: analysis.immediate_fix.description,
      actionLabel: analysis.immediate_fix.action_label,
      commandToRun: metadata.id === 'INC-001' ? 'redis-cli config set maxmemory-policy allkeys-lru' : undefined
    },
    longTermFix: {
      description: analysis.long_term_fix.description,
      actionLabel: analysis.long_term_fix.action_label
    },
    aiCorrelationSummary: analysis.confidence_reasoning || analysis.diagnosis_summary,
    chartData: {
      errorRate,
      dbConnections,
      cpuUsage,
      latency,
      deploymentIndex: (deploymentIndex !== undefined && deploymentIndex >= 0) ? deploymentIndex : undefined
    }
  };
}

/**
 * Fetch high-level Active Incidents metadata list
 */
export async function getIncidents(): Promise<Incident[]> {
  if (config.USE_MOCK_DATA) {
    return new Promise((resolve) => {
      // Simulate real-world SRE async API load delays
      setTimeout(() => {
        const fallbackIncidents: Incident[] = mockIncidents.map((meta) => {
          // Pre-populate empty analyses for list items
          const details = mockAnalysis[meta.id] || mockAnalysis["INC-001"];
          return mapAnalysisToIncident(meta, details);
        });
        resolve(fallbackIncidents);
      }, 600);
    });
  }

  const response = await fetch(`${config.BACKEND_URL}/api/incidents`);
  const rawData: MockIncidentMetadata[] = await response.json();
  
  // Return resolved mapped array
  return Promise.all(
    rawData.map(async (meta) => {
      const details = await analyzeIncident(meta.id);
      return details;
    })
  );
}

/**
 * Fetch detailed AI Root-Cause Analysis payload for an Incident
 */
export async function analyzeIncident(incidentId: string): Promise<Incident> {
  const metadata = mockIncidents.find((i) => i.id === incidentId) || mockIncidents[0];

  if (config.USE_MOCK_DATA) {
    return new Promise((resolve) => {
      // Simulate rich ARIA heuristic model calculation delay
      setTimeout(() => {
        const details = mockAnalysis[incidentId] || mockAnalysis["INC-001"];
        resolve(mapAnalysisToIncident(metadata, details));
      }, 2500); // Set to 2.5s delay to represent heavy processing times
    });
  }

  const response = await fetch(`${config.BACKEND_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incident_id: incidentId })
  });
  
  const analysis: MockAnalysisPayload = await response.json();
  return mapAnalysisToIncident(metadata, analysis);
}
