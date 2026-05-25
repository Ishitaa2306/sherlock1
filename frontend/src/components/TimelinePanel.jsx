/**
 * SHERLOCK — Timeline Visualization
 * Vertical chronological timeline of incident events.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Rocket, TrendingUp, AlertTriangle, XCircle, AlertOctagon, CheckCircle } from 'lucide-react';

const SEVERITY_CONFIG = {
  info: { color: 'border-blue-400', bg: 'bg-blue-400', dot: 'bg-blue-400', Icon: Rocket },
  low: { color: 'border-sherlock-accent', bg: 'bg-sherlock-accent', dot: 'bg-sherlock-accent', Icon: CheckCircle },
  medium: { color: 'border-blue-400', bg: 'bg-blue-400', dot: 'bg-blue-400', Icon: TrendingUp },
  high: { color: 'border-orange-400', bg: 'bg-orange-400', dot: 'bg-orange-400', Icon: AlertTriangle },
  critical: { color: 'border-red-500', bg: 'bg-red-500', dot: 'bg-red-500', Icon: AlertOctagon },
};

export default function TimelinePanel({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="bg-sherlock-card/80 rounded-xl border border-sherlock-border p-4">
      <h3 className="text-sm font-semibold text-sherlock-text tracking-wider uppercase mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-sherlock-cyan" />
        Chain of Events
      </h3>

      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-400/50 via-orange-400/50 to-red-500/50" />

        <div className="space-y-4">
          {events.map((event, idx) => {
            const config = SEVERITY_CONFIG[event.severity] || SEVERITY_CONFIG.info;
            const EventIcon = config.Icon;

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                {/* Timeline dot */}
                <div className={`absolute -left-6 top-1.5 w-[18px] h-[18px] rounded-full ${config.bg}/20 border-2 ${config.color} flex items-center justify-center`}>
                  <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                </div>

                {/* Event content */}
                <div className={`ml-2 p-3 rounded-lg bg-sherlock-surface/50 border border-sherlock-border/50 hover:border-sherlock-dim/50 transition-colors`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <EventIcon className={`w-3.5 h-3.5 ${config.color.replace('border-', 'text-')}`} />
                      <span className="text-xs font-mono text-sherlock-dim">
                        {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : `T+${idx * 2}min`}
                      </span>
                    </div>
                    <span className="text-[10px] text-sherlock-dim font-mono">{event.service}</span>
                  </div>
                  <p className="text-sm text-sherlock-text font-medium">{event.event}</p>
                  {event.details && (
                    <p className="text-xs text-sherlock-muted mt-1 font-mono">{event.details}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
