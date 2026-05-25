import React, { useState, useEffect } from 'react';
import { Cpu, Bell, Zap } from 'lucide-react';

interface NavbarProps {
  activeIncidentsCount: number;
  onTriggerIncident?: () => void;
  showTrigger?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeIncidentsCount, 
  onTriggerIncident, 
  showTrigger = true 
}) => {
  const [timeString, setTimeString] = useState('');

  // Live ticking clock in SRE format (HH:MM:SS)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString([], { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 flex-shrink-0 border-b border-border-default bg-background-overlay/70 backdrop-blur-md flex items-center justify-between px-6 z-30 select-none relative overflow-hidden">
      {/* Top micro decorative ambient neon wire */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent" />

      {/* Left: Product Logo & Branding */}
      <div className="flex items-center space-x-3.5">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-background-elevated border border-border-emphasis shadow-[0_0_12px_var(--accent-primary-dim)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-accent-primary/20 to-accent-secondary/20 animate-pulse-slow" />
          <Cpu className="w-4.5 h-4.5 text-accent-primary relative z-10" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-lg tracking-wide text-text-primary font-syne uppercase">
              Nexus AI
            </h1>
            <span className="text-[9px] bg-accent-primary-dim border border-border-emphasis text-text-accent px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-widest scale-90">
              v1.2
            </span>
          </div>
          <p className="text-[10px] text-text-secondary font-inter font-medium tracking-wide uppercase mt-0.5">
            AI-Powered Incident Intelligence
          </p>
        </div>
      </div>

      {/* Center: Subtle animated system pulse indicator */}
      <div className="hidden md:flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-background-elevated border border-border-subtle shadow-[0_0_15px_rgba(6,182,212,0.03)] backdrop-blur-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success"></span>
        </span>
        <span className="text-[10px] font-bold text-status-success uppercase tracking-widest font-mono">
          AI SYSTEM MONITORING ACTIVE
        </span>
      </div>

      {/* Right: Telemetry Live Clock & Indicators */}
      <div className="flex items-center space-x-4 text-text-secondary">
        
        {/* Trigger Outage Simulator SRE button */}
        {showTrigger && onTriggerIncident && (
          <button
            onClick={onTriggerIncident}
            className="flex items-center space-x-2 py-1.5 px-4 rounded-full border border-status-critical bg-status-critical-dim hover:bg-status-critical/20 text-status-critical hover:text-red-300 font-extrabold text-[9px] tracking-widest uppercase transition-all duration-300 shadow-[0_0_12px_var(--status-critical-dim)] hover:shadow-[0_0_18px_var(--status-critical-glow)] hover:scale-105 active:scale-95 select-none relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-status-critical/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <Zap className="w-3.5 h-3.5 text-status-critical animate-pulse group-hover:scale-110 transition-transform relative z-10" />
            <span className="font-inter relative z-10">Simulate Incident</span>
          </button>
        )}
        
        {/* Live updating digital SRE clock */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-background-elevated border border-border-default font-mono text-xs text-text-accent shadow-inner">
          <span className="w-1.5 h-1.5 rounded-full bg-text-accent animate-pulse" />
          <span className="font-semibold text-text-primary tracking-widest">{timeString || '00:00:00'}</span>
          <span className="text-[9px] text-text-muted font-light uppercase tracking-wider">UTC</span>
        </div>

        {/* Notifications active incidents bell */}
        <div className="relative cursor-pointer group">
          <div className="p-1.5 rounded-lg hover:text-text-primary hover:bg-background-hover border border-transparent hover:border-border-default transition-all">
            <Bell className="w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" />
          </div>
          {activeIncidentsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-status-critical border border-background-void text-[8px] font-bold text-white shadow-[0_0_6px_var(--status-critical-glow)] font-inter">
              {activeIncidentsCount}
            </span>
          )}
        </div>

        {/* Operational Status Pulse */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 text-[10px] rounded-lg bg-background-elevated border border-border-default text-text-secondary font-mono font-medium">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-success"></span>
          </span>
          <span className="text-status-success font-bold uppercase tracking-wider scale-95">PROD-MESH</span>
        </div>
      </div>
    </header>
  );
};
export default Navbar;
