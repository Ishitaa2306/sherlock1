import React, { useState, useEffect } from 'react';
import { RotateCw } from 'lucide-react';

export const StatusBar: React.FC = () => {
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Auto-increment SRE sync time check dynamically (0s to 30s)
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => (prev >= 29 ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="h-10 flex-shrink-0 border-t border-cyber-border/60 bg-[#0B0F14]/75 backdrop-blur-md flex items-center justify-between px-6 z-30 text-[10px] text-cyber-gray font-mono relative overflow-hidden select-none">
      
      {/* LEFT: Sync updates counter */}
      <div className="flex items-center space-x-1.5">
        <RotateCw className="w-3 h-3 text-cyan-400 animate-spin-slow" />
        <span className="font-light">
          Last sync: <strong className="font-semibold text-white">{secondsAgo === 0 ? 'just now' : `${secondsAgo}s ago`}</strong>
        </span>
      </div>

      {/* CENTER: Analytics summary numbers */}
      <div className="hidden md:flex items-center space-x-6 text-cyber-gray/70">
        <div className="flex items-center space-x-1.5">
          <span>Analyzed today:</span>
          <strong className="text-white font-semibold">147 cases</strong>
        </div>
        <span className="text-cyber-border">•</span>
        <div className="flex items-center space-x-1.5">
          <span>Avg Diagnosis:</span>
          <strong className="text-cyan-300 font-semibold">8.2 seconds</strong>
        </div>
        <span className="text-cyber-border">•</span>
        <div className="flex items-center space-x-1.5">
          <span>AI Accuracy:</span>
          <strong className="text-emerald-400 font-semibold">98.6%</strong>
        </div>
      </div>

      {/* RIGHT: Services indicators health status */}
      <div className="flex items-center space-x-4 select-none">
        
        {/* Service 1 */}
        <div className="flex items-center space-x-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
          </span>
          <span className="text-[9px] uppercase font-bold text-cyber-gray/60 font-sans tracking-wide">CLAUDE-API</span>
        </div>

        {/* Service 2 */}
        <div className="flex items-center space-x-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
          </span>
          <span className="text-[9px] uppercase font-bold text-cyber-gray/60 font-sans tracking-wide">METRICS-SVC</span>
        </div>

        {/* Service 3 */}
        <div className="flex items-center space-x-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
          </span>
          <span className="text-[9px] uppercase font-bold text-cyber-gray/60 font-sans tracking-wide">LOG-SVC</span>
        </div>

      </div>

    </footer>
  );
};
export default StatusBar;
