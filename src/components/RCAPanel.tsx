import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Incident } from '../types';
import { 
  Sparkles, Copy, Check, ChevronDown, ChevronUp, Cpu,
  Terminal, Wrench, ExternalLink, Calendar, HelpCircle, Loader2 
} from 'lucide-react';

interface RCAPanelProps {
  incident: Incident | null;
}

// 1. Custom Count-Up Hook for Progress Ring
const useCountUp = (target: number, duration: number = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = target;
    if (start === end) {
      setCount(end);
      return;
    }

    const totalMiliseconds = duration;
    const incrementTime = 16; // ~60fps
    const totalSteps = Math.ceil(totalMiliseconds / incrementTime);
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / totalSteps;
      // Ease out quadratic progress formula
      const easedProgress = progress * (2 - progress);
      const current = Math.floor(easedProgress * end);
      
      if (step >= totalSteps) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
};

// 2. Premium Floating Glow Particles for the Confidence Circle
const ParticleGlow: React.FC<{ color: string }> = ({ color }) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    // Generate static configurations for particles to avoid dynamic hydration mismatch
    const items = Array.from({ length: 6 }).map((_, i) => ({
      id: i,
      x: Math.cos((i * 2 * Math.PI) / 6) * 62 + (Math.random() - 0.5) * 8,
      y: Math.sin((i * 2 * Math.PI) / 6) * 62 + (Math.random() - 0.5) * 8,
      size: Math.random() * 4 + 2.5,
      delay: Math.random() * 1.5,
      duration: Math.random() * 2.5 + 2,
    }));
    setParticles(items);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `calc(50% + ${p.x}px)`,
            top: `calc(50% + ${p.y}px)`,
            width: p.size,
            height: p.size,
            backgroundColor: color,
            filter: 'blur(1px)',
            opacity: 0.25,
          }}
          animate={{
            y: [0, -10, 0],
            x: [0, Math.sin(p.id) * 6, 0],
            opacity: [0.15, 0.65, 0.15],
            scale: [1, 1.25, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// 3. Dynamic Highlighter for Root Cause Statement Keywords
const highlightRootCause = (text: string) => {
  if (!text) return '';
  
  // Strip raw markdown symbols before highlighting to prevent them from showing up
  let cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1'); // Strip **bold**
  cleanText = cleanText.replace(/###?\s+(.*?)(?:\n|$)/g, '$1\n'); // Strip ## headers
  cleanText = cleanText.replace(/`([^`]+)`/g, '$1'); // Strip `code` ticks
  
  // Regex to match target keywords: versions (vX.Y.Z), service names, error codes, key terms
  const keywordRegex = /(v\d+\.\d+\.\d+|auth-service|api-gateway|session-store|redis-cache|database-pool|payment-service|checkout-api|user-service|worker-service|cdn-assets|static-router|Redis cache exhaustion|session eviction|Redis max-memory pool exhaustion|TTL policy|maxmemory|OOM|out of memory|LRU eviction|connections spike|eviction policy|memory limit threshold|workload surge|database deadlock|thread pools exhaustion|unconfigured TTL policy|unoptimized query|db connection pool exhaustion|Consul route propagation latency|packet drop rates|circular references|heap memory|invalid API key configurations|Cloudflare edge webhooks)/gi;
  
  const parts = cleanText.split(keywordRegex);
  
  return parts.map((part, i) => {
    if (part.match(keywordRegex)) {
      let styleClass = 'font-semibold text-accent-primary bg-accent-primary-dim px-1 py-0.5 rounded border border-border-emphasis';
      const lower = part.toLowerCase();
      if (lower.includes('oom') || lower.includes('out of memory') || lower.includes('exhaustion') || lower.includes('deadlock') || lower.includes('surge') || lower.includes('fail') || lower.includes('leak') || lower.includes('drop')) {
        styleClass = 'font-semibold text-status-critical bg-status-critical-dim px-1 py-0.5 rounded border border-status-critical-dim';
      } else if (lower.startsWith('v') && /\d/.test(lower)) {
        styleClass = 'font-bold text-accent-secondary bg-accent-secondary-dim px-1.5 py-0.5 rounded border border-accent-secondary-dim font-mono text-[85%]';
      } else if (lower.includes('ttl') || lower.includes('lru') || lower.includes('policy') || lower.includes('key') || lower.includes('secret')) {
        styleClass = 'font-semibold text-status-warning bg-status-warning-dim px-1 py-0.5 rounded border border-status-warning-dim font-mono';
      }
      return (
        <span key={i} className={`mx-0.5 inline-block max-w-full break-words whitespace-normal select-text ${styleClass}`}>
          {part}
        </span>
      );
    }
    return <span key={i} className="select-text font-inter font-light text-text-primary">{part}</span>;
  });
};

export const RCAPanel: React.FC<RCAPanelProps> = ({ incident }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const [isRollbackExecuted, setIsRollbackExecuted] = useState(false);
  const [isRollbackLoading, setIsRollbackLoading] = useState(false);
  const [isJiraCreated, setIsJiraCreated] = useState(false);
  const [isJiraLoading, setIsJiraLoading] = useState(false);

  // Reset SRE actions states when active incident changes
  useEffect(() => {
    setIsRollbackExecuted(false);
    setIsRollbackLoading(false);
    setIsJiraCreated(false);
    setIsJiraLoading(false);
    setExpandedEvidence({});
    
    if (incident) {
      console.log("Nexus Hero AI RCA Panel mounted with active incident context:", incident.id);
    }
    return () => {
      console.log("Nexus Hero AI RCA Panel unmounted for context switch.");
    };
  }, [incident?.id]);

  const toggleEvidence = (id: string) => {
    setExpandedEvidence(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const executeRollback = () => {
    setIsRollbackLoading(true);
    setTimeout(() => {
      setIsRollbackLoading(false);
      setIsRollbackExecuted(true);
    }, 2000);
  };

  const createJiraTicket = () => {
    setIsJiraLoading(true);
    setTimeout(() => {
      setIsJiraLoading(false);
      setIsJiraCreated(true);
    }, 1500);
  };

  // State 1: Render Premium SRE Empty State if no incident is selected
  if (!incident) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden select-none min-h-[500px]">
        {/* Animated background pulse glow */}
        <div className="absolute w-[450px] h-[450px] rounded-full bg-accent-primary/5 filter blur-[100px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative mb-6 mt-2">
          <div className="absolute inset-[-14px] border border-dashed border-accent-primary/20 rounded-full animate-spin-slow" />
          <div className="absolute inset-0 bg-accent-primary/10 rounded-full filter blur-xl animate-pulse" />
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-background-base border border-accent-primary/40 shadow-[0_0_24px_var(--accent-primary-dim)]">
            <Cpu className="w-9 h-9 text-accent-primary animate-pulse" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-text-primary tracking-wide font-syne uppercase">
          Nexus Diagnostic Console
        </h3>
        <p className="text-sm text-text-secondary font-inter font-light mt-2 max-w-sm text-center leading-relaxed">
          Select an incident alert from the left sidebar to initiate automated root cause correlation telemetry scans.
        </p>

        {/* Subtle quick tips frame */}
        <div className="mt-8 p-4 rounded-xl border border-border-default bg-background-overlay/50 font-mono text-xs text-text-muted leading-relaxed max-w-xs text-left shadow-lg">
          <div className="flex items-center space-x-1.5 text-accent-primary font-bold mb-1.5 uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Operational Telemetry</span>
          </div>
          • Live cluster event correlation active.<br />
          • Analysis compiles logs, db pools, and network traces.<br />
          • Remediation rollback triggers active.
        </div>
      </div>
    );
  }

  // State 3: Render complete AI RCA Panel
  const confidenceVal = useCountUp(incident.confidence, 1500);

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'P1': return 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.06)]';
      case 'P2': return 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.06)]';
      case 'P3': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.06)]';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'rgb(34, 211, 238)'; // Cyan/Teal
    if (score >= 50) return 'rgb(251, 191, 36)'; // Amber/Yellow
    return 'rgb(244, 63, 94)'; // Rose/Red
  };

  const getConfidenceGlowClass = (score: number) => {
    if (score >= 80) return 'shadow-[0_0_25px_rgba(34,211,238,0.1)] border-cyan-500/30 bg-cyan-950/5';
    if (score >= 50) return 'shadow-[0_0_25px_rgba(251,191,36,0.1)] border-amber-500/30 bg-amber-950/5';
    return 'shadow-[0_0_25px_rgba(244,63,94,0.1)] border-rose-500/30 bg-rose-950/5';
  };

  const getConfidenceGlowColor = (score: number) => {
    if (score >= 80) return '#06b6d4'; // Cyan
    if (score >= 50) return '#f59e0b'; // Amber
    return '#f43f5e'; // Rose
  };

  return (
    <div className="flex-1 min-h-0 h-full max-h-full flex flex-col space-y-5 md:space-y-6 overflow-y-auto px-2 py-2 pr-2.5 custom-scrollbar select-none z-10 w-full max-w-5xl mx-auto">
      
      {/* 1. PREMIUM ROOT CAUSE SUMMARY HERO CARD */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-background-elevated p-4 md:p-5 rounded-2xl border border-accent-secondary-dim hover:border-accent-secondary/50 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] group transition-all duration-500"
      >
        {/* Glowing aura inside card */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-accent-secondary-dim rounded-full filter blur-[60px] pointer-events-none group-hover:scale-125 transition-all duration-700" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-accent-primary-dim rounded-full filter blur-[60px] pointer-events-none" />

        {/* Decorative corner scanning indicator */}
        <div className="absolute top-0 right-0 w-[100px] h-[1px] bg-gradient-to-l from-accent-secondary via-accent-primary to-transparent" />
        <div className="absolute top-0 right-0 w-[1px] h-[100px] bg-gradient-to-b from-accent-secondary via-transparent to-transparent" />

        <div className="flex items-center space-x-3 mb-4">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-background-overlay border border-border-emphasis shadow-[0_0_12px_var(--accent-secondary-dim)]">
            <Sparkles className="w-4 h-4 text-accent-secondary animate-pulse" />
            <span className="absolute inset-0 rounded-lg border border-accent-secondary/20 animate-ping" />
          </div>
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-accent-secondary font-mono">
              Nexus AI Engine
            </h4>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-syne">
              Root Cause Identification Summary
            </h3>
          </div>
        </div>

        {/* Large elegant root cause statement with custom keyword highlights */}
        <div className="text-base md:text-lg font-inter font-light text-text-primary leading-relaxed tracking-wide pr-6 select-text mb-4">
          {highlightRootCause(incident.rootCause)}
        </div>

        <div className="mt-4 pt-4 border-t border-cyber-border/20 flex flex-wrap items-center justify-between gap-3 text-[10px] text-cyber-gray font-mono">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span>Diagnostic Confidence: <strong className="text-violet-300 font-semibold">{incident.confidence}%</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>Scope: <strong className="text-cyan-300 font-semibold">{incident.affectedServicesCount} Impacted Nodes</strong></span>
            </div>
          </div>
          
          <button
            onClick={() => handleCopy(incident.rootCause, 'hero-root-cause')}
            className="flex items-center space-x-1.5 text-cyber-gray hover:text-white transition-colors duration-200"
          >
            {copiedId === 'hero-root-cause' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied Summary</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Summary</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* 2. INCIDENT METADATA & CONFIDENCE DIAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Title Details Card */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-cyber-border/80 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-60 h-60 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center space-x-2.5 mb-3">
              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold border rounded-md uppercase tracking-widest font-mono ${getSeverityColor(incident.severity)}`}>
                {incident.severity}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#111827]/40 border border-cyber-border font-mono text-[10px] text-cyber-gray">
                {incident.service}
              </span>
              <span className="text-[10px] text-cyber-gray font-light">
                • Diagnosed in {incident.analysisTimeSeconds}s
              </span>
            </div>

            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide leading-snug">
              {incident.title}
            </h2>
            
            <p className="text-xs text-cyber-gray font-light mt-3 leading-relaxed">
              {incident.aiCorrelationSummary || 'System telemetry indicates dynamic session token workloads spiking synchronously with connection errors.'}
            </p>
          </div>

          <div className="mt-5">
            <h5 className="text-[9px] font-extrabold uppercase tracking-widest text-cyber-gray mb-2.5">
              Impacted System Services ({incident.affectedServicesCount})
            </h5>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(incident?.impactedServices) && incident.impactedServices.map((srv) => (
                <span 
                  key={srv ?? 'unknown'} 
                  className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all duration-300 ${
                    srv === incident.service 
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.1)]' 
                      : 'bg-cyber-dark/60 border-cyber-border text-cyber-gray hover:text-white hover:border-cyber-border-hover'
                  }`}
                >
                  {srv}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Large Prominent Confidence Dial Card */}
        <div className={`glass-panel p-6 rounded-2xl border relative overflow-hidden flex flex-col items-center justify-center text-center transition-all duration-500 ${getConfidenceGlowClass(incident.confidence)}`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/2 rounded-full filter blur-2xl pointer-events-none" />

          {/* Large circular confidence score container */}
          <div className="relative flex items-center justify-center w-36 h-36 select-none flex-shrink-0 mb-3">
            
            {/* Pulsing glow under the circle */}
            <div 
              className="absolute inset-4 rounded-full filter blur-md opacity-25 animate-pulse"
              style={{ backgroundColor: getConfidenceColor(incident.confidence) }}
            />

            <svg className="w-full h-full transform -rotate-90 animate-fade-in" viewBox="0 0 140 140">
              {/* Outer dial guide rail */}
              <circle
                cx="70"
                cy="70"
                r="55"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="6"
                fill="transparent"
              />
              {/* Active progressive stroke */}
              <motion.circle
                cx="70"
                cy="70"
                r="55"
                stroke={getConfidenceColor(incident.confidence)}
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="346"
                initial={{ strokeDashoffset: 346 }}
                animate={{ strokeDashoffset: 346 - (346 * confidenceVal) / 100 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                style={{
                  strokeLinecap: 'round',
                  filter: `drop-shadow(0 0 8px ${getConfidenceGlowColor(incident.confidence)}40)`,
                }}
              />
            </svg>
            
            {/* Count-up numbering dial text */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-white leading-none tracking-tight font-mono">
                {confidenceVal}%
              </span>
              <span className="text-[8px] text-cyber-gray font-bold tracking-widest uppercase mt-1">
                AI Confidence
              </span>
            </div>

            {/* Drifting HSL matched particle bubbles */}
            <ParticleGlow color={getConfidenceColor(incident.confidence)} />
          </div>

          <p className="text-[10px] text-cyber-gray font-light leading-relaxed max-w-[200px]">
            {incident.confidence >= 80 
              ? 'High confidence based on strong temporal correlation between deployment activity and system degradation.' 
              : incident.confidence >= 50
              ? 'Moderate confidence. Correlation traces identify concurrent network congestion alongside the incident timeline.'
              : 'Low confidence. System telemetry suggests multi-factor cascade anomalies with high noise levels.'}
          </p>
        </div>
      </div>

      {/* D. Progressive Events Timeline & Actions Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Timeline event chain */}
        <div className="glass-panel p-6 rounded-2xl border border-cyber-border/80 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-white tracking-wider uppercase font-sans mb-5 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Chain of Events</span>
            </h3>

            <div className="relative pl-6 border-l border-cyber-border/60 space-y-6 ml-3">
              {Array.isArray(incident?.chainOfEvents) && incident.chainOfEvents.map((evt, idx) => {
                if (!evt) return null;
                
                // Color node mappings
                const getNodeStyles = (status: string) => {
                  switch (status) {
                    case 'success': return 'bg-[#0B0F14] border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]';
                    case 'error': return 'bg-[#0B0F14] border-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]';
                    case 'warning': return 'bg-[#0B0F14] border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]';
                    default: return 'bg-[#0B0F14] border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]';
                  }
                };

                return (
                  <motion.div 
                    key={evt.time ?? idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.25 }}
                    className="relative"
                  >
                    {/* Event Dot */}
                    <div className={`absolute left-[-31.5px] top-1 w-3 h-3 rounded-full border-2 transition-all duration-300 ${getNodeStyles(evt.status)}`} />

                    {/* Timeline Data */}
                    <div>
                      <span className="font-mono text-[9px] text-cyber-gray font-light">{evt.time}</span>
                      <h4 className="text-xs font-semibold text-white tracking-wide mt-0.5">{evt.title}</h4>
                      {evt.description && (
                        <p className="text-[10px] text-cyber-gray font-light mt-0.5 leading-relaxed">{evt.description}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side-by-side Remediation Fix Panels */}
        <div className="flex flex-col space-y-6">
          
          {/* Immediate Action Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-rose-500/20 hover:border-rose-500/30 relative flex flex-col justify-between h-[160px] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-500/40 via-red-500/40 to-transparent" />
            
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Immediate Fix</h4>
                <p className="text-[11px] text-cyber-gray font-light mt-1.5 leading-relaxed">
                  {incident.immediateFix.description}
                </p>
              </div>
            </div>

            <div className="mt-4">
              {isRollbackExecuted ? (
                <div className="flex items-center space-x-2 py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium leading-tight">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span>Rollback dispatched. Verification tests active.</span>
                </div>
              ) : (
                <button
                  onClick={executeRollback}
                  disabled={isRollbackLoading}
                  className="w-full py-2 px-4 rounded-xl border border-rose-500/40 bg-rose-950/15 hover:bg-rose-900/20 text-rose-300 font-semibold text-[11px] tracking-wider uppercase transition-all duration-300 flex items-center justify-center space-x-2 shadow-[0_0_12px_rgba(244,63,94,0.06)] hover:shadow-[0_0_16px_rgba(244,63,94,0.12)] disabled:opacity-50"
                >
                  {isRollbackLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing...</span>
                    </>
                  ) : (
                    <span>{incident.immediateFix.actionLabel}</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Long-Term Prevention Action Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 hover:border-cyan-500/30 relative flex flex-col justify-between h-[160px] overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-500/40 via-violet-500/40 to-transparent" />
            
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Long-term Fix</h4>
                <p className="text-[11px] text-cyber-gray font-light mt-1.5 leading-relaxed">
                  {incident.longTermFix.description}
                </p>
              </div>
            </div>

            <div className="mt-4">
              {isJiraCreated ? (
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-medium">
                  <span className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Jira ticket logged: <strong className="font-semibold text-white">JIRA-9841</strong></span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 hover:text-white cursor-pointer" />
                </div>
              ) : (
                <button
                  onClick={createJiraTicket}
                  disabled={isJiraLoading}
                  className="w-full py-2 px-4 rounded-xl border border-cyan-500/40 bg-cyan-950/15 hover:bg-cyan-900/20 text-cyan-300 font-semibold text-[11px] tracking-wider uppercase transition-all duration-300 flex items-center justify-center space-x-2 shadow-[0_0_12px_rgba(6,182,212,0.06)] hover:shadow-[0_0_16px_rgba(6,182,212,0.12)] disabled:opacity-50"
                >
                  {isJiraLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>{incident.longTermFix.actionLabel}</span>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* E. Technical Evidence Used accordion list */}
      <div className="glass-panel p-6 rounded-2xl border border-cyber-border/80">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-white tracking-wider uppercase font-sans flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Diagnostic Telemetry Evidence</span>
          </h3>
          <span className="text-[11px] text-cyber-gray font-light">
            {incident?.evidenceTrail?.length ?? 0} pipelines
          </span>
        </div>

        <div className="space-y-3">
          {Array.isArray(incident?.evidenceTrail) && incident.evidenceTrail.map((item) => {
            if (!item) return null;
            const isExpanded = !!expandedEvidence[item.id];
            
            return (
              <div 
                key={item.id}
                className="rounded-xl border border-cyber-border/60 bg-[#111827]/20 hover:border-cyan-500/20 transition-all duration-300 overflow-hidden"
              >
                {/* Accordion header toggler */}
                <div 
                  onClick={() => toggleEvidence(item.id)}
                  className="flex items-center justify-between p-4 cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold tracking-wider ${
                      item.type === 'deployments' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' :
                      item.type === 'metrics' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                      item.type === 'logs' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {item.type}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white tracking-wide">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-cyber-gray mt-0.5 font-light leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="text-[10px] text-cyber-gray font-mono">
                      {item.timestamp}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-cyber-gray" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-cyber-gray" />
                    )}
                  </div>
                </div>

                {/* Collapsible log dump snippet */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="border-t border-cyber-border/30 bg-black/40"
                    >
                      <div className="p-4">
                        {item.snippet && (
                          <div className="relative">
                            <pre className="bg-[#07090D] p-3 rounded-lg border border-cyber-border/40 font-mono text-[10px] leading-relaxed text-cyan-300/90 overflow-x-auto max-w-full">
                              {item.snippet}
                            </pre>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(item.snippet || '', item.id);
                              }}
                              className="absolute top-2.5 right-2.5 p-1.5 rounded bg-cyber-dark/80 hover:bg-cyber-dark text-cyber-gray hover:text-white transition-colors duration-200 border border-cyber-border"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
