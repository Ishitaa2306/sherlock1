/**
 * SHERLOCK — Main Application
 * AI-Powered Autonomous Incident Investigation Platform
 * Master dashboard that orchestrates all components.
 * 
 * ALL INCIDENTS ARE DYNAMICALLY DETECTED FROM LIVE PROMETHEUS METRICS.
 * ZERO HARDCODED SCENARIOS.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, MessageSquare, BookOpen, Activity, Layers } from 'lucide-react';
import Header from './components/Header';
import ScenarioSidebar from './components/ScenarioSidebar';
import StreamingTerminal from './components/StreamingTerminal';
import RootCausePanel from './components/RootCausePanel';
import TimelinePanel from './components/TimelinePanel';
import MetricsPanel from './components/MetricsPanel';
import ChatPanel from './components/ChatPanel';
import RunbookPanel from './components/RunbookPanel';
import {
  triggerScenario, resetScenarios,
  fetchServiceStatus, streamAnalysis, checkHealth, fetchTelemetry,
  fetchLiveMetrics, fetchServicesHealth, fetchIncidents,
} from './services/api';

const TABS = [
  { id: 'analysis', label: 'Analysis', Icon: Activity },
  { id: 'metrics', label: 'Metrics', Icon: BarChart3 },
  { id: 'chat', label: 'AI Chat', Icon: MessageSquare },
  { id: 'runbook', label: 'Runbook', Icon: BookOpen },
];

// Map failure_type to scenario trigger IDs for the chaos API
const FAILURE_TYPE_TO_SCENARIO = {
  database: 'db_exhaustion',
  resource_exhaustion: 'memory_leak',
  upstream_dependency: 'api_timeout',
  error_rate: 'db_exhaustion',
  latency: 'api_timeout',
  service_down: 'db_exhaustion',
  cpu_stress: 'cpu_stress',
};

export default function App() {
  // ━━━ State ━━━
  const [incidents, setIncidents] = useState([]);
  const [activeIncident, setActiveIncident] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis');
  const [backendStatus, setBackendStatus] = useState(null);
  const [serviceStatuses, setServiceStatuses] = useState({});
  const [hasSimulated, setHasSimulated] = useState(false);

  // Investigation state
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamStatus, setStreamStatus] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [telemetryContext, setTelemetryContext] = useState(null);
  const [telemetrySummary, setTelemetrySummary] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState('');

  // Live metrics (independent of investigations)
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [servicesHealth, setServicesHealth] = useState({});
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Chaos triggering state
  const [chaosToast, setChaosToast] = useState('');

  // Ticking Clock state
  const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ━━━ Initialize + Poll Live Incidents ━━━
  useEffect(() => {
    const init = async () => {
      try {
        const [health, statusData, incidentData] = await Promise.all([
          checkHealth(),
          fetchServiceStatus().catch(() => ({ services: {} })),
          fetchIncidents().catch(() => ({ incidents: [] })),
        ]);
        setBackendStatus(health);
        setServiceStatuses(statusData.services || {});
        const liveIncidents = incidentData.incidents || [];
        setIncidents(liveIncidents);
        if (liveIncidents.length > 0 && !activeIncident) {
          setActiveIncident(liveIncidents[0]);
        }
      } catch {
        /* fallback — no incidents until backend comes up */
      }
    };
    init();

    // Poll incidents + service status every 8 seconds
    const interval = setInterval(async () => {
      try {
        const [statusData, incidentData] = await Promise.all([
          fetchServiceStatus().catch(() => ({ services: {} })),
          fetchIncidents().catch(() => ({ incidents: [] })),
        ]);
        setServiceStatuses(statusData.services || {});
        const liveIncidents = incidentData.incidents || [];
        setIncidents(liveIncidents);
        // Auto-select first incident if none selected
        setActiveIncident((prev) => {
          if (!prev && liveIncidents.length > 0) return liveIncidents[0];
          // Keep current selection if it still exists
          if (prev && liveIncidents.find((i) => i.service === prev.service && i.failure_type === prev.failure_type)) {
            return liveIncidents.find((i) => i.service === prev.service && i.failure_type === prev.failure_type);
          }
          return liveIncidents.length > 0 ? liveIncidents[0] : null;
        });
      } catch { /* ignore */ }
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // ━━━ Live Metrics Polling (every 10s, independent of investigations) ━━━
  useEffect(() => {
    const loadMetrics = async () => {
      setMetricsLoading(true);
      try {
        const [metricsData, healthData] = await Promise.all([
          fetchLiveMetrics('all', 15),
          fetchServicesHealth(),
        ]);
        setLiveMetrics(metricsData);
        setServicesHealth(healthData.services || {});
      } catch { /* keep previous data */ }
      setMetricsLoading(false);
    };
    loadMetrics();
    const interval = setInterval(loadMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  // ━━━ Investigation ━━━
  const handleInvestigate = useCallback(async () => {
    if (isInvestigating || !activeIncident) return;

    const service = activeIncident.service;
    const scenarioId = FAILURE_TYPE_TO_SCENARIO[activeIncident.failure_type] || 'db_exhaustion';

    // Reset state
    setIsInvestigating(true);
    setStreamText('');
    setStreamStatus('');
    setAnalysisResult(null);
    setIsComplete(false);
    setError('');
    setActiveTab('analysis');

    // Trigger scenario chaos if not already active
    try {
      await triggerScenario(scenarioId);
    } catch { /* service might not be reachable */ }

    // Fetch telemetry for metrics display
    try {
      const telemetry = await fetchTelemetry(service, scenarioId);
      setTelemetryContext(telemetry);
    } catch { /* continue without telemetry display */ }

    // Start streaming analysis
    streamAnalysis(
      service,
      scenarioId,
      (token) => setStreamText((prev) => prev + token),
      (status) => setStreamStatus(status),
      (summary) => setTelemetrySummary(summary),
      (result, ctx) => {
        setAnalysisResult(result);
        setIsInvestigating(false);
        setIsComplete(true);
        if (ctx) setTelemetrySummary(ctx);
      },
      (err) => {
        setError(err);
        setIsInvestigating(false);
      },
    );
  }, [activeIncident, isInvestigating]);

  const handleReset = async () => {
    try {
      await resetScenarios();
      setStreamText('');
      setStreamStatus('');
      setAnalysisResult(null);
      setTelemetryContext(null);
      setTelemetrySummary(null);
      setIsComplete(false);
      setError('');
      setIncidents([]);
      setActiveIncident(null);
      setHasSimulated(false);
    } catch { /* ignore */ }
  };

  const handleGenerateChaos = async () => {
    if (chaosToast) return;
    const scenarios = ['memory_leak', 'cpu_stress', 'api_timeout', 'db_exhaustion'];
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    setChaosToast(`Triggering ${randomScenario}...`);
    setHasSimulated(true);
    try {
      await triggerScenario(randomScenario);
      setTimeout(() => setChaosToast('Simulated Incident Triggered!'), 500);
      
      // Immediate poll to fetch incidents
      setTimeout(async () => {
        try {
          const [statusData, incidentData] = await Promise.all([
            fetchServiceStatus().catch(() => ({ services: {} })),
            fetchIncidents().catch(() => ({ incidents: [] })),
          ]);
          setServiceStatuses(statusData.services || {});
          const liveIncidents = incidentData.incidents || [];
          setIncidents(liveIncidents);
          if (liveIncidents.length > 0) {
            setActiveIncident(liveIncidents[0]);
          }
        } catch { /* ignore */ }
      }, 600);
    } catch {
      setChaosToast('Failed to simulate incident');
    }
    
    setTimeout(() => setChaosToast(''), 4000);
  };

  // ━━━ Render ━━━
  return (
    <div className="h-screen flex flex-col bg-sherlock-bg grid-bg overflow-hidden">
      <Header backendStatus={backendStatus} isInvestigating={isInvestigating} />

      <div className="flex-1 flex min-h-0">
        {/* Sidebar — now uses LIVE incidents */}
        <ScenarioSidebar
          scenarios={hasSimulated ? incidents : []}
          activeScenario={activeIncident?.id || ''}
          onSelectScenario={(id) => {
            const found = incidents.find((i) => i.id === id);
            if (found) setActiveIncident(found);
          }}
          onTrigger={handleInvestigate}
          onReset={handleReset}
          onGenerateChaos={handleGenerateChaos}
          chaosToast={chaosToast}
          isInvestigating={isInvestigating}
          serviceStatuses={serviceStatuses}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-sherlock-accent/15 text-sherlock-accent border border-sherlock-accent/30'
                      : 'text-sherlock-dim hover:text-sherlock-muted border border-transparent'
                  }`}
                >
                  <tab.Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}

            {/* Right-side Stats & Clock */}
            <div className="ml-auto flex items-center gap-3 text-[10px] font-sans text-sherlock-dim font-medium">
              {/* Ticking Clock */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sherlock-card border border-sherlock-accent/15 text-sherlock-accent font-semibold shadow-sm font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-sherlock-accent animate-pulse" />
                <span>{timeStr}</span>
              </div>

              {/* Telemetry summary badges */}
              {telemetrySummary && (
                <div className="flex items-center gap-2 border-l border-sherlock-accent/10 pl-3 flex">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {telemetrySummary.total_logs || 0} logs
                  </span>
                  <span className="text-red-400 font-semibold">{telemetrySummary.error_logs || 0} errors</span>
                  <span className="font-semibold">{telemetrySummary.total_alerts || 0} alerts</span>
                  <span className="font-semibold">{telemetrySummary.total_traces || 0} traces</span>
                </div>
              )}

              {/* Live incident count */}
              {!telemetrySummary && hasSimulated && incidents.length > 0 && (
                <div className="flex items-center gap-2 border-l border-sherlock-accent/10 pl-3 flex font-sans">
                  <span className="flex items-center gap-1 text-red-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    {incidents.filter((i) => i.severity === 'critical').length} critical
                  </span>
                  <span className="text-yellow-400 font-semibold">
                    {incidents.filter((i) => i.severity === 'warning').length} warning
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden p-4 pt-2">
            <AnimatePresence mode="wait">
              {activeTab === 'analysis' && (
                <motion.div
                  key="analysis"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <StreamingTerminal
                      streamText={streamText}
                      status={streamStatus}
                      isStreaming={isInvestigating}
                      isComplete={isComplete}
                      error={error}
                    />
                  </div>
                  <div className="w-[420px] shrink-0 overflow-y-auto space-y-4 pr-1">
                    {analysisResult && (
                      <>
                        <RootCausePanel result={analysisResult} />
                        <TimelinePanel events={analysisResult.chain_of_events} />
                      </>
                    )}
                    {!analysisResult && !isInvestigating && (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center text-sherlock-dim/30">
                          <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
                          <p className="text-sm font-mono">
                            {(hasSimulated && incidents.length > 0)
                              ? 'Select an incident and click Investigate'
                              : 'No anomalies detected — all systems nominal'}
                          </p>
                        </div>
                      </div>
                    )}
                    {isInvestigating && !analysisResult && (
                      <div className="h-full flex items-center justify-center">
                        <motion.div
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-center"
                        >
                          <Activity className="w-12 h-12 mx-auto mb-3 text-sherlock-accent" />
                          <p className="text-sm font-mono text-sherlock-accent">Analyzing...</p>
                        </motion.div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'metrics' && (
                <motion.div
                  key="metrics"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto pr-1"
                >
                  <MetricsPanel
                    liveMetrics={liveMetrics}
                    servicesHealth={servicesHealth}
                    isLoading={metricsLoading}
                    alerts={telemetryContext?.alerts || []}
                  />
                </motion.div>
              )}

              {activeTab === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <div className="bg-sherlock-card/50 rounded-xl h-full shadow-[0_0_20px_rgba(0,0,0,0.3)] flex flex-col min-h-0">
                    <ChatPanel 
                      incidentContext={telemetryContext} 
                      analysisResult={analysisResult} 
                      activeIncident={activeIncident}
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'runbook' && (
                <motion.div
                  key="runbook"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full overflow-y-auto pr-1"
                >
                  <RunbookPanel
                    analysisResult={analysisResult}
                    service={activeIncident?.service || 'auth-service'}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
