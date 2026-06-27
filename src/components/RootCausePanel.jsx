/**
 * SHERLOCK — Root Cause Panel
 * Displays the structured RCA result with evidence and fixes.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Zap, Shield, FileText, ArrowRight } from 'lucide-react';
import ConfidenceGauge from './ConfidenceGauge';

export default function RootCausePanel({ result }) {
  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Root Cause + Confidence */}
      <div className="bg-sherlock-card/80 rounded-xl border border-sherlock-border p-5 glow-border">
        <div className="flex gap-5">
          <ConfidenceGauge score={result.confidence} size={120} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-sherlock-text tracking-wider font-sans uppercase">Root Cause</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans uppercase tracking-wider ml-auto ${
                result.severity === 'critical' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                result.severity === 'high' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30' :
                'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
              }`}>
                {result.severity}
              </span>
            </div>
            <p className="text-sm text-sherlock-text/90 leading-relaxed font-sans">{result.root_cause}</p>
            {result.affected_services?.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {result.affected_services.map((svc) => (
                  <span key={svc} className="text-[10px] px-2 py-0.5 rounded bg-sherlock-accent/10 text-sherlock-accent border border-sherlock-accent/20 font-sans font-medium">
                    {svc}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Immediate Fix */}
      <div className="bg-sherlock-card/80 rounded-xl border border-sherlock-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-sherlock-warning" />
          <h3 className="text-sm font-semibold text-sherlock-text tracking-wider font-sans uppercase">Immediate Fix</h3>
        </div>
        <p className="text-sm text-sherlock-muted whitespace-pre-wrap leading-relaxed font-sans text-[13px]">{result.immediate_fix}</p>
      </div>

      {/* Long Term Fix */}
      <div className="bg-sherlock-card/80 rounded-xl border border-sherlock-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-sherlock-accent" />
          <h3 className="text-sm font-semibold text-sherlock-text tracking-wider font-sans uppercase">Long-Term Prevention</h3>
        </div>
        <p className="text-sm text-sherlock-muted whitespace-pre-wrap leading-relaxed font-sans text-[13px]">{result.long_term_fix}</p>
      </div>

      {/* Evidence Used */}
      {result.evidence_used?.length > 0 && (
        <div className="bg-sherlock-card/80 rounded-xl border border-sherlock-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-sherlock-cyan" />
            <h3 className="text-sm font-semibold text-sherlock-text tracking-wider font-sans uppercase">Evidence</h3>
          </div>
          <div className="space-y-1.5">
            {result.evidence_used.map((ev, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-sherlock-muted font-sans">
                <ArrowRight className="w-3 h-3 mt-0.5 text-sherlock-dim shrink-0" />
                <span className="leading-relaxed">{ev}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
