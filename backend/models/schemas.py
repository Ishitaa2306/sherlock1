"""
SHERLOCK — Pydantic Models
Data schemas for incidents, telemetry, analysis results, and chat.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class IncidentScenario(str, Enum):
    DB_EXHAUSTION = "db_exhaustion"
    MEMORY_LEAK = "memory_leak"
    API_TIMEOUT = "api_timeout"


# ━━━ Telemetry Models ━━━

class LogEntry(BaseModel):
    timestamp: str
    service: str
    level: str
    message: str
    attributes: Dict[str, Any] = {}


class MetricDatapoint(BaseModel):
    timestamp: str
    metric_name: str
    value: float
    service: str
    labels: Dict[str, str] = {}


class AlertEvent(BaseModel):
    timestamp: str
    title: str
    severity: Severity
    service: str
    status: str = "triggered"
    message: str = ""


class DeploymentEvent(BaseModel):
    timestamp: str
    service: str
    version: str
    deployer: str = "ci/cd"
    changes: List[str] = []


class TraceSpan(BaseModel):
    trace_id: str
    span_id: str
    service: str
    operation: str
    duration_ms: float
    status: str
    timestamp: str
    parent_span_id: Optional[str] = None


# ━━━ Aggregated Telemetry Context ━━━

class TelemetryContext(BaseModel):
    logs: List[LogEntry] = []
    metrics: List[MetricDatapoint] = []
    alerts: List[AlertEvent] = []
    deployments: List[DeploymentEvent] = []
    traces: List[TraceSpan] = []
    time_range: Dict[str, str] = {}
    services_affected: List[str] = []


# ━━━ Analysis Results ━━━

class ChainEvent(BaseModel):
    timestamp: str
    event: str
    service: str
    severity: Severity
    details: str = ""


class AnalysisResult(BaseModel):
    root_cause: str
    confidence: float = Field(ge=0, le=100)
    chain_of_events: List[ChainEvent] = []
    evidence_used: List[str] = []
    immediate_fix: str
    long_term_fix: str
    affected_services: List[str] = []
    severity: Severity = Severity.HIGH
    scenario: str = ""


# ━━━ Chat ━━━

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    incident_context: Optional[Dict[str, Any]] = None
    active_incident: Optional[Dict[str, Any]] = None
    previous_analysis: Optional[Dict[str, Any]] = None
    chat_history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    answer: str
    suggested_followups: List[str] = []


# ━━━ Runbook ━━━

class RunbookStep(BaseModel):
    step_number: int
    title: str
    description: str
    command: str = ""
    expected_output: str = ""
    category: str = "mitigation"  # verification, mitigation, resolution, validation


class Runbook(BaseModel):
    title: str
    incident_type: str
    severity: Severity
    verification_steps: List[RunbookStep] = []
    mitigation_steps: List[RunbookStep] = []
    resolution_steps: List[RunbookStep] = []
    validation_steps: List[RunbookStep] = []
    generated_at: str = ""


# ━━━ Scenario ━━━

class ScenarioInfo(BaseModel):
    id: str
    name: str
    description: str
    affected_services: List[str]
    severity: Severity
    failure_type: str
    trigger_endpoint: str


class ScenarioTriggerResponse(BaseModel):
    scenario: str
    status: str
    services_affected: List[str]
    message: str
