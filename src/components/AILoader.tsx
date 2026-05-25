import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, Loader2, Brain, Terminal, AlertTriangle, AlertCircle } from 'lucide-react';

interface AILoaderProps {
  onComplete: () => void;
  incidentTitle?: string;
}

interface Step {
  label: string;
  duration: number;
}

export const AILoader: React.FC<AILoaderProps> = ({ onComplete, incidentTitle = 'Unknown Incident' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  // Steps to display in the analyzer dashboard
  const steps: Step[] = [
    { label: 'Fetching system logs...', duration: 600 },
    { label: 'Correlating metrics data...', duration: 700 },
    { label: 'Analyzing deployment history...', duration: 800 },
    { label: 'Investigating trace spans...', duration: 700 },
    { label: 'Running anomaly detection...', duration: 1000 },
    { label: 'Identifying root cause...', duration: 600 }
  ];

  // Simulated live telemetry logs database
  const logDatabase: string[] = [
    '[01:43:22] INFO: Deployment pipeline trigger payload received.',
    '[01:43:25] DEPLOY: Spawning payment-service pods on k8s-node-24.',
    '[01:44:10] SYSTEM: Heathchecks passed. Active router endpoints registered.',
    '[01:45:00] METRICS: Scanning active telemetry streams in zone-b.',
    '[01:47:15] WARN: DB Connection pool utilization exceeded 85% warning threshold.',
    '[01:47:18] INFO: Correlating spike across checkout-api nodes...',
    '[01:47:35] ALARM: Database pooling latency rose from 14ms to 4200ms.',
    '[01:48:10] CRITICAL: node-pg connection pool exhausted. 0 threads available.',
    '[01:48:40] LOGS: Slow query matching signature ledgers_join detected.',
    '[01:49:01] TRACE: Anomaly detected on /checkout/pay route. span duration 5420ms.',
    '[01:50:00] ALARM: HTTP 500 server error rate reached 5.4% threshold.',
    '[01:50:35] AI: Running heuristics scan on commit 8c2f109 changes...',
    '[01:51:00] AI: High-correlation mapping: payment-service ledger queries.',
    '[01:51:08] SUCCESS: Outage root cause identified successfully.'
  ];

  // Lifecycle mount logging
  useEffect(() => {
    isMounted.current = true;
    console.log("Nexus AI Diagnostic Loader mounted successfully.");
    return () => {
      isMounted.current = false;
      console.log("Nexus AI Diagnostic Loader unmounting cleanly.");
    };
  }, []);

  // Progressive steps animation with automatic timeout cleanups and try/catch error guards
  useEffect(() => {
    try {
      if (currentStep < steps.length) {
        const timer = setTimeout(() => {
          if (isMounted.current) {
            setCurrentStep((prev) => prev + 1);
          }
        }, steps[currentStep]?.duration ?? 500);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => {
          if (isMounted.current && typeof onComplete === 'function') {
            try {
              onComplete();
            } catch (err) {
              console.error("Crash inside onComplete callback:", err);
              if (isMounted.current) {
                setHasError(true);
                setErrorMessage(err instanceof Error ? err.message : String(err));
              }
            }
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch (error) {
      console.error("Loader animation exception captured:", error);
      if (isMounted.current) {
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    }
  }, [currentStep, onComplete, steps]);

  // Terminal log simulator with safety boundary checks
  useEffect(() => {
    let logIndex = 0;
    const interval = setInterval(() => {
      try {
        if (logIndex < logDatabase.length) {
          const currentLog = logDatabase[logIndex];
          if (currentLog && isMounted.current) {
            setTerminalLogs((prev) => [...prev, currentLog]);
          }
          logIndex++;
        } else {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Terminal log simulator interval crash:", err);
        clearInterval(interval);
      }
    }, 280);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs locally inside the container
  useEffect(() => {
    try {
      const container = terminalScrollRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    } catch (e) {
      // Ignored non-critical browser layout warnings
    }
  }, [terminalLogs]);

  // Render Fallback Error State UI
  if (hasError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden select-none">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-rose-500/5 filter blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-950/20 border border-rose-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)] mb-6">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-wide">Analysis Parser Failure</h2>
        <p className="text-sm text-cyber-gray font-light mt-2 mb-4 text-center max-w-md">
          {errorMessage || 'An exceptional runtime state occurred while processing telemetry channels.'}
        </p>
        <button
          onClick={() => {
            setHasError(false);
            setErrorMessage('');
            setCurrentStep(0);
            setTerminalLogs([]);
          }}
          className="py-2 px-4 rounded-lg bg-cyber-dark hover:bg-cyber-dark/80 text-cyber-gray hover:text-white border border-cyber-border text-xs tracking-wider uppercase font-semibold transition-all"
        >
          Reset Heuristics Engine
        </button>
      </div>
    );
  }

  // Render Fallback Empty State UI
  if (!steps || steps.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden select-none">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 mb-6">
          <AlertTriangle className="w-8 h-8 text-cyan-400" />
        </div>
        <h2 className="text-xl font-bold text-white tracking-wide">No Telemetry Pipeline Available</h2>
        <p className="text-sm text-cyber-gray font-light mt-2 text-center max-w-md">
          No diagnostic sequences are currently loaded in the telemetry parser channel.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden select-none">
      {/* Background radial glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-cyan-500/5 filter blur-3xl pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      
      {/* Large Glowing Brain Graphic */}
      <div className="relative mb-8 mt-4">
        {/* Animated outer ring */}
        <div className="absolute inset-[-18px] border border-dashed border-cyan-500/20 rounded-full animate-spin-slow" />
        {/* Ambient background blur */}
        <div className="absolute inset-0 bg-cyan-400/20 rounded-full filter blur-2xl animate-pulse" />
        
        {/* Core brain circle */}
        <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-[#0B0F14] border-2 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]">
          <Brain className="w-11 h-11 text-cyan-400 animate-pulse" />
          
          {/* Scanning line indicator */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-cyan-300 opacity-80 animate-scanner shadow-[0_0_8px_#22d3ee]" />
        </div>
      </div>

      {/* Headline Text */}
      <h2 className="text-2xl font-semibold text-white tracking-wide text-center">
        AI Investigation in Progress
      </h2>
      <p className="text-sm text-cyber-gray font-light mt-1.5 mb-10 text-center max-w-md">
        Analyzing incident data across all connected systems for <span className="text-cyan-300 font-normal">"{incidentTitle}"</span>
      </p>

      {/* Investigation Progress Card */}
      <div className="w-full max-w-xl glass-panel p-6 rounded-2xl border border-cyber-border/80 relative">
        <div className="space-y-4">
          {Array.isArray(steps) && steps.map((step, idx) => {
            if (!step) return null;
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            const isWaiting = idx > currentStep;

            return (
              <div 
                key={step.label ?? idx}
                className={`flex items-center justify-between text-sm transition-all duration-300 ${
                  isWaiting ? 'opacity-30 text-gray-500' : 'opacity-100 text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 glow-text-cyan" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                    </div>
                  )}
                  <span className={`tracking-wide font-light ${isCurrent ? 'font-normal text-cyan-300' : ''}`}>
                    {step.label}
                  </span>
                </div>
                {isCurrent && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 animate-pulse">
                    processing..
                  </span>
                )}
                {isDone && (
                  <span className="text-[10px] font-mono text-cyan-400/80">
                    done
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Stream Terminal Card */}
      <div className="w-full max-w-xl mt-6 rounded-xl bg-black/60 border border-cyber-border/40 p-4 font-mono text-[11px] leading-relaxed relative flex flex-col h-44 overflow-hidden">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyber-border/20 text-cyber-gray">
          <div className="flex items-center space-x-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-white tracking-wider">LIVE TELEMETRY SCANNER</span>
          </div>
          <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 font-sans font-bold">
            ANALYZING METRIC ANOMALIES
          </span>
        </div>
        
        <div ref={terminalScrollRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-cyber-gray">
          {Array.isArray(terminalLogs) && terminalLogs.map((log, index) => {
            if (!log || typeof log !== 'string') return null;
            
            let logColor = 'text-cyber-gray';
            if (typeof log === 'string' && log.includes('CRITICAL')) {
              logColor = 'text-rose-400 font-semibold';
            } else if (typeof log === 'string' && (log.includes('WARN') || log.includes('ALARM'))) {
              logColor = 'text-amber-400';
            } else if (typeof log === 'string' && (log.includes('SUCCESS') || log.includes('AI'))) {
              logColor = 'text-cyan-400';
            } else if (typeof log === 'string' && log.includes('DEPLOY')) {
              logColor = 'text-violet-400';
            }

            return (
              <div key={index} className={`terminal-line py-0.5 ${logColor}`}>
                {log}
              </div>
            );
          })}
          {/* Target div removed to prevent global scrollIntoView triggers */}
        </div>
      </div>
    </div>
  );
};
