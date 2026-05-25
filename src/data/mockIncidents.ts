export interface MockIncidentMetadata {
  id: string;
  title: string;
  service: string;
  severity: 'P1' | 'P2' | 'P3';
  status: string;
  confidence: number;
  firedAt: string;
  duration: string;
  color: string;
}

const mockIncidents: MockIncidentMetadata[] = [
  {
    id: "INC-001",
    title: "Redis Cache Exhaustion & Session Eviction",
    service: "auth-service",
    severity: "P1",
    status: "ROOT CAUSE FOUND",
    confidence: 92,
    firedAt: "02:10 AM",
    duration: "2m active",
    color: "red"
  },
  {
    id: "INC-002",
    title: "Database Connection Pool Exhaustion",
    service: "payment-service",
    severity: "P1",
    status: "ROOT CAUSE FOUND",
    confidence: 87,
    firedAt: "01:43 AM",
    duration: "14m active",
    color: "red"
  },
  {
    id: "INC-003",
    title: "API Gateway Timeout Errors",
    service: "api-gateway",
    severity: "P2",
    status: "INVESTIGATING",
    confidence: 45,
    firedAt: "03:08 AM",
    duration: "8m active",
    color: "yellow"
  },
  {
    id: "INC-004",
    title: "File Processor Memory Leak",
    service: "file-processor-service",
    severity: "P2",
    status: "MONITORING",
    confidence: 72,
    firedAt: "04:15 AM",
    duration: "5m active",
    color: "orange"
  }
];

export default mockIncidents;
