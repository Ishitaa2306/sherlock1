/**
 * SHERLOCK — Runbook Panel
 * Displays auto-generated incident response runbook.
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ChevronDown, ChevronRight, Terminal, CheckCircle, Loader2 } from 'lucide-react';
import { generateRunbook } from '../services/api';

const CATEGORY_COLORS = {
  verification: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', label: '🔍 Verification' },
  mitigation: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', label: '🛡️ Mitigation' },
  resolution: { bg: 'bg-sherlock-accent/10', border: 'border-sherlock-accent/30', text: 'text-sherlock-accent', label: '🔧 Resolution' },
  validation: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', label: '✅ Validation' },
};

function RunbookStep({ step }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-sherlock-border/50 rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-sherlock-surface/50 transition-colors text-left"
      >
        <span className="text-xs font-mono text-sherlock-dim w-6 text-right">{step.step_number}.</span>
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-sherlock-dim" /> : <ChevronRight className="w-3.5 h-3.5 text-sherlock-dim" />}
        <span className="text-sm text-sherlock-text font-medium flex-1">{step.title}</span>
      </button>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-4 pb-3 space-y-2"
        >
          <p className="text-xs text-sherlock-muted">{step.description}</p>
          {step.command && (
            <div className="bg-black/40 rounded-md p-2.5 font-mono text-xs text-sherlock-cyan border border-sherlock-border/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Terminal className="w-3 h-3 text-sherlock-dim" />
                <span className="text-[10px] text-sherlock-dim">Command</span>
              </div>
              <code>{step.command}</code>
            </div>
          )}
          {step.expected_output && (
            <p className="text-[10px] text-sherlock-dim font-mono">
              Expected: <span className="text-sherlock-muted">{step.expected_output}</span>
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function RunbookPanel({ analysisResult, service }) {
  const [runbook, setRunbook] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!analysisResult) return;
    setLoading(true);
    try {
      const rb = await generateRunbook(analysisResult, service);
      setRunbook(rb);
    } catch (err) {
      console.error('Runbook generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-sherlock-card/80 rounded-xl border border-sherlock-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-sherlock-text tracking-wider uppercase flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-sherlock-warning" />
          Response Runbook
        </h3>
        {!runbook && (
          <button
            onClick={handleGenerate}
            disabled={!analysisResult || loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-sherlock-accent/15 border border-sherlock-accent/30 text-sherlock-accent hover:bg-sherlock-accent/25 disabled:opacity-30 transition-colors flex items-center gap-1.5 font-mono"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
            {loading ? 'Generating...' : 'Generate Runbook'}
          </button>
        )}
      </div>

      {!runbook && !loading && (
        <div className="flex flex-col items-center justify-center py-8 text-sherlock-dim/40">
          <BookOpen className="w-10 h-10 mb-2" />
          <p className="text-xs font-mono">Complete an investigation to generate a runbook</p>
        </div>
      )}

      {runbook && (
        <div className="space-y-4">
          {/* Runbook title */}
          <div className="text-sm font-medium text-sherlock-text">{runbook.title}</div>

          {/* Sections */}
          {['verification_steps', 'mitigation_steps', 'resolution_steps', 'validation_steps'].map((section) => {
            const steps = runbook[section];
            if (!steps?.length) return null;
            const cat = section.replace('_steps', '');
            const config = CATEGORY_COLORS[cat];

            return (
              <div key={section}>
                <div className={`text-xs font-mono ${config.text} tracking-wider uppercase mb-2`}>
                  {config.label}
                </div>
                <div className="space-y-1.5">
                  {steps.map((step, i) => (
                    <RunbookStep key={i} step={step} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
