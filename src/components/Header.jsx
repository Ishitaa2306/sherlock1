/**
 * SHERLOCK — Header Component
 * Top navigation bar with branding and status indicators.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Activity, Wifi, WifiOff } from 'lucide-react';

export default function Header({ backendStatus, isInvestigating }) {
  const isConnected = backendStatus?.status === 'healthy';

  return (
    <header className="h-14 bg-sherlock-surface/80 backdrop-blur-xl border-b border-sherlock-border flex items-center justify-between px-6 relative z-50">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={isInvestigating ? { rotate: 360 } : {}}
          transition={{ duration: 2, repeat: isInvestigating ? Infinity : 0, ease: 'linear' }}
        >
          <Shield className="w-7 h-7 text-sherlock-accent" />
        </motion.div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-extrabold tracking-tight text-white font-sans">SHERLOCK</h1>
          <span className="text-[11px] text-sherlock-dim font-sans font-medium tracking-wide uppercase">AI Incident Investigation</span>
        </div>
      </div>

      {/* Center: Status */}
      {isInvestigating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-1"
        >
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-red-500"
          />
          <span className="text-[11px] font-sans font-semibold text-red-400 tracking-wider">INVESTIGATING</span>
        </motion.div>
      )}

      {/* Right: Connection status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 text-xs font-sans text-sherlock-dim font-medium">
          {backendStatus?.gemini_configured && (
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-sherlock-accent" />
              Gemini
            </span>
          )}
          {backendStatus?.datadog_configured && (
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-sherlock-purple" />
              Datadog
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-sans font-medium ${isConnected ? 'text-sherlock-accent' : 'text-sherlock-danger'}`}>
          {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span>{isConnected ? 'Connected' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
}
