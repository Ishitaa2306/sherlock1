/**
 * SHERLOCK — Incident Sidebar
 * Displays LIVE dynamically-detected incidents from Prometheus anomaly detection.
 * No hardcoded scenarios. Every card reflects a real metric anomaly.
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Database, MemoryStick, Clock, AlertTriangle, Play, RotateCcw,
  Server, Cpu, Wifi, WifiOff, Activity, Zap, TrendingUp,
} from 'lucide-react';

// Dynamic icon selection based on incident type
const FAILURE_ICONS = {
  database: Database,
  resource_exhaustion: MemoryStick,
  upstream_dependency: Clock,
  error_rate: AlertTriangle,
  latency: TrendingUp,
  service_down: WifiOff,
  cpu_stress: Cpu,
};

const FAILURE_COLORS = {
  database: 'text-red-400',
  resource_exhaustion: 'text-orange-400',
  upstream_dependency: 'text-yellow-400',
  error_rate: 'text-pink-400',
  latency: 'text-amber-400',
  service_down: 'text-red-500',
  cpu_stress: 'text-purple-400',
};

export default function ScenarioSidebar({
  scenarios,
  activeScenario,
  onSelectScenario,
  onTrigger,
  onReset,
  onGenerateChaos,
  chaosToast,
  isInvestigating,
  serviceStatuses,
}) {
  const hasIncidents = scenarios.length > 0;

  return (
    <aside className="w-72 bg-sherlock-surface/50 border-r border-sherlock-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sherlock-border">
        <h2 className="text-sm font-semibold text-sherlock-text tracking-wider uppercase flex items-center gap-2 font-sans">
          <AlertTriangle className="w-4 h-4 text-sherlock-warning" />
          Live Incidents
          {hasIncidents && (
            <span className="ml-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] text-red-400 font-sans font-semibold">{scenarios.length}</span>
            </span>
          )}
        </h2>
      </div>

      {/* Live Incident List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!hasIncidents && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Activity className="w-10 h-10 text-sherlock-accent/30 mb-3" />
            <p className="text-xs text-sherlock-dim font-sans">No anomalies detected</p>
            <p className="text-[10px] text-sherlock-dim/50 mt-1 font-sans">All services nominal</p>
          </div>
        )}

        {scenarios.map((incident) => {
          const Icon = FAILURE_ICONS[incident.failure_type] || AlertTriangle;
          const isActive = activeScenario === incident.id;
          const colorClass = FAILURE_COLORS[incident.failure_type] || 'text-sherlock-accent';

          return (
            <motion.button
              key={incident.id}
              onClick={() => onSelectScenario(incident.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                isActive
                  ? 'bg-sherlock-accent/10 border-sherlock-accent/40 shadow-lg shadow-sherlock-accent/5'
                  : 'bg-sherlock-card/50 border-sherlock-border hover:border-sherlock-dim'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <Icon className={`w-4 h-4 mt-0.5 ${isActive ? 'text-sherlock-accent' : colorClass}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isActive ? 'text-sherlock-accent' : 'text-sherlock-text'}`}>
                    {incident.title || incident.name}
                  </p>
                  <p className="text-xs text-sherlock-dim mt-1 line-clamp-2">
                    {incident.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-semibold uppercase tracking-wider ${
                      incident.severity === 'critical'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {incident.severity}
                    </span>
                    <span className="text-[10px] text-sherlock-dim font-sans font-medium">
                      {incident.affected_services?.length || 1} services
                    </span>
                    {/* Show key metric value */}
                    {incident.metric_values && (
                      <span className="text-[10px] text-sherlock-dim font-sans font-semibold ml-auto">
                        {incident.failure_type === 'database' && `${incident.metric_values.db_connections}/25`}
                        {incident.failure_type === 'resource_exhaustion' && `${incident.metric_values.memory_mb}MB`}
                        {incident.failure_type === 'upstream_dependency' && `${incident.metric_values.latency_p95_ms}ms`}
                        {incident.failure_type === 'error_rate' && `${incident.metric_values.error_rate}%`}
                        {incident.failure_type === 'latency' && `${incident.metric_values.latency_p95_ms}ms`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t border-sherlock-border space-y-2">
        <motion.button
          onClick={onGenerateChaos}
          disabled={!!chaosToast}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all shadow-[0_0_10px_rgba(239,68,68,0.15)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Zap className="w-3.5 h-3.5" />
          {chaosToast || "Simulate Random Failure"}
        </motion.button>
        
        <motion.button
          onClick={onTrigger}
          disabled={!hasIncidents || isInvestigating}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 rounded-lg bg-sherlock-accent/20 border border-sherlock-accent/40 text-sherlock-accent text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sherlock-accent/30 transition-colors"
        >
          <Play className="w-4 h-4" />
          Investigate
        </motion.button>
        <button
          onClick={onReset}
          className="w-full py-2 rounded-lg bg-sherlock-card border border-sherlock-border text-sherlock-dim text-xs font-medium flex items-center justify-center gap-2 hover:text-sherlock-text hover:border-sherlock-dim transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset All
        </button>
      </div>

      {/* Service Health */}
      <div className="p-3 border-t border-sherlock-border">
        <p className="text-[10px] text-sherlock-dim font-sans font-semibold tracking-wider uppercase mb-2 flex items-center gap-1.5">
          <Server className="w-3 h-3" />
          Service Health
        </p>
        <div className="space-y-1.5">
          {['auth-service', 'checkout-service', 'recommendation-service', 'payment-service'].map((svc) => {
            const status = serviceStatuses?.[svc]?.status || 'unknown';
            const color = status === 'healthy' ? 'bg-sherlock-accent' : status === 'degraded' ? 'bg-sherlock-warning' : 'bg-sherlock-dim';
            return (
              <div key={svc} className="flex items-center justify-between text-xs">
                <span className="text-sherlock-muted font-sans font-medium truncate">{svc}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                  <span className={`font-sans font-semibold text-[10px] ${status === 'healthy' ? 'text-sherlock-accent' : status === 'degraded' ? 'text-sherlock-warning' : 'text-sherlock-dim'}`}>
                    {status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
