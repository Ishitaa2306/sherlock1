/**
 * SHERLOCK — API Service
 * Handles all backend communication.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchScenarios() {
  const res = await fetch(`${API_BASE}/api/scenarios`);
  return res.json();
}

export async function triggerScenario(scenarioId) {
  const res = await fetch(`${API_BASE}/api/scenarios/trigger?scenario_id=${scenarioId}`, { method: 'POST' });
  return res.json();
}

export async function resetScenarios() {
  const res = await fetch(`${API_BASE}/api/scenarios/reset`, { method: 'POST' });
  return res.json();
}

export async function fetchServiceStatus() {
  const res = await fetch(`${API_BASE}/api/scenarios/status`);
  return res.json();
}

export async function fetchTelemetry(service, scenario, timeRange = 15) {
  const res = await fetch(`${API_BASE}/api/analyze/telemetry?service=${service}&scenario=${scenario}&time_range=${timeRange}`);
  return res.json();
}

export function streamAnalysis(service, scenario, onToken, onStatus, onTelemetry, onDone, onError) {
  const url = `${API_BASE}/api/analyze/stream?service=${service}&scenario=${scenario}`;
  
  return fetch(url, { method: 'POST' }).then(response => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    function processStream() {
      return reader.read().then(({ done, value }) => {
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              switch (data.type) {
                case 'token': onToken(data.content); break;
                case 'status': onStatus(data.content); break;
                case 'telemetry': onTelemetry(data.content); break;
                case 'done': onDone(data.result, data.telemetry_context); break;
                case 'error': onError(data.content); break;
              }
            } catch (e) { /* skip malformed lines */ }
          }
        }
        return processStream();
      });
    }
    return processStream();
  }).catch(err => onError(err.message));
}

export async function sendChatMessage(message, incidentContext, previousAnalysis, chatHistory, activeIncident) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      incident_context: incidentContext,
      active_incident: activeIncident,
      previous_analysis: previousAnalysis,
      chat_history: chatHistory,
    }),
  });
  return res.json();
}

export async function generateRunbook(analysis, service) {
  const res = await fetch(`${API_BASE}/api/runbook?service=${service}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analysis),
  });
  return res.json();
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  } catch {
    return { status: 'unreachable' };
  }
}

export async function fetchLiveMetrics(service = 'all', rangeMinutes = 15) {
  try {
    const res = await fetch(`${API_BASE}/api/metrics/live?service=${service}&range_minutes=${rangeMinutes}`);
    return res.json();
  } catch {
    return { services: {} };
  }
}

export async function fetchServicesHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/metrics/health`);
    return res.json();
  } catch {
    return { services: {} };
  }
}

export async function fetchIncidents() {
  try {
    const res = await fetch(`${API_BASE}/api/incidents`);
    return res.json();
  } catch {
    return { incidents: [], count: 0 };
  }
}
