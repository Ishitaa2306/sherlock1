import React from 'react';
import { motion } from 'framer-motion';
import type { Incident } from '../types';
import { RotateCw, AlertTriangle, Circle } from 'lucide-react';

interface SidebarProps {
  incidents: Incident[];
  activeIncidentId: string | null;
  onSelectIncident: (id: string) => void;
  activeFilter: 'All' | 'Active' | 'Resolved';
  onFilterChange: (filter: 'All' | 'Active' | 'Resolved') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  incidents = [],
  activeIncidentId,
  onSelectIncident,
  activeFilter = 'All',
  onFilterChange
}) => {
  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'P1': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'P2': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'P3': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Root Cause Identified': return 'text-emerald-400';
      case 'Investigating': return 'text-amber-400';
      case 'Monitoring': return 'text-indigo-400';
      case 'Resolved': return 'text-emerald-500';
      default: return 'text-cyber-gray';
    }
  };

  // Filter incidents locally for modularity
  const filteredIncidents = Array.isArray(incidents) ? incidents.filter((incident) => {
    if (!incident) return false;
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Active') return incident.status !== 'Resolved';
    if (activeFilter === 'Resolved') return incident.status === 'Resolved';
    return true;
  }) : [];

  // Count active vs resolved
  const activeCount = Array.isArray(incidents) 
    ? incidents.filter(i => i?.status !== 'Resolved').length 
    : 0;

  // Static/Ticking Incident active duration offsets mapping
  const getMockDuration = (id: string, status: string) => {
    if (status === 'Resolved') return 'Resolved';
    switch (id) {
      case 'inc-p1-db-pool': return '14m active';
      case 'inc-p2-api-gw': return '8m active';
      case 'inc-p2-memory-leak': return '42m active';
      default: return '2m active';
    }
  };

  return (
    <aside className="w-full md:w-80 flex flex-col border-b md:border-b-0 md:border-r border-cyber-border bg-[#0B0F14]/40 h-auto md:h-full select-none z-10 flex-shrink-0">
      
      {/* Header active alert stats panel */}
      <div className="p-5 border-b border-cyber-border/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-bold text-white tracking-wider uppercase font-sans">
              Active Incidents
            </h3>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-extrabold animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.15)]">
                {activeCount} alerts
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Filter Pills */}
        <div className="flex space-x-1.5 p-1 bg-black/40 border border-cyber-border/40 rounded-xl">
          {(['All', 'Active', 'Resolved'] as const).map((filter) => {
            const isSelected = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => typeof onFilterChange === 'function' && onFilterChange(filter)}
                className={`
                  flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-300
                  ${isSelected
                    ? 'bg-cyan-950/40 text-cyan-300 border border-cyan-500/20 shadow-[0_0_8px_rgba(34,211,238,0.06)]'
                    : 'text-cyber-gray hover:text-white border border-transparent'
                  }
                `}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Incident Card items */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
        {filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Circle className="w-5 h-5 text-cyber-gray/40 animate-pulse mb-2" />
            <p className="text-[11px] text-cyber-gray font-light">No incidents matched in this thread.</p>
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            if (!incident) return null;
            const isActive = incident.id === activeIncidentId;
            return (
              <motion.div
                key={incident.id}
                whileHover={{ scale: 1.015, x: 2 }}
                onClick={() => typeof onSelectIncident === 'function' && onSelectIncident(incident.id)}
                className={`
                  relative p-4 rounded-xl cursor-pointer transition-all duration-300 select-none overflow-hidden
                  ${isActive 
                    ? 'bg-cyan-950/30 border border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.08)]' 
                    : 'bg-[#111827]/25 border border-cyber-border hover:border-cyan-500/20 hover:bg-[#111827]/35'
                  }
                `}
              >
                {/* Dynamic animated glow line indicators */}
                {isActive && (
                  <motion.div
                    layoutId="activeIncidentBorder"
                    className="absolute left-0 top-3 bottom-3 w-1 bg-cyan-400 rounded-r-lg shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                {/* Card Top Row: Severity, status, confidence percentage */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold border rounded-md uppercase tracking-wider ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    <div className="flex items-center space-x-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          incident.status === 'Resolved' ? 'bg-emerald-400' :
                          incident.status === 'Investigating' ? 'bg-amber-400' :
                          incident.status === 'Monitoring' ? 'bg-indigo-400' : 'bg-cyan-400'
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                          incident.status === 'Resolved' ? 'bg-emerald-500' :
                          incident.status === 'Investigating' ? 'bg-amber-500' :
                          incident.status === 'Monitoring' ? 'bg-indigo-500' : 'bg-cyan-500'
                        }`}></span>
                      </span>
                      <span className={`text-[9px] font-bold tracking-wide uppercase ${getStatusColor(incident.status)}`}>
                        {incident.status === 'Root Cause Identified' ? 'Root Cause Found' : incident.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-bold font-sans ${
                      incident.confidence >= 80 ? 'text-emerald-400' :
                      incident.confidence >= 50 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {incident.confidence}%
                    </span>
                    <span className="block text-[7px] text-cyber-gray font-bold uppercase tracking-widest scale-75">Conf</span>
                  </div>
                </div>

                {/* Card Incident Title */}
                <h4 className="text-xs font-semibold text-white tracking-wide leading-snug line-clamp-1 mb-2.5">
                  {incident.title}
                </h4>

                {/* Card Bottom Row: Service name, Date/Active duration tags */}
                <div className="flex items-center justify-between text-[9px] text-cyber-gray">
                  <span className={`px-2 py-0.5 rounded bg-gray-900/60 border border-cyber-border font-mono text-[9px] ${
                    isActive ? 'text-cyan-300 border-cyan-500/20' : 'text-cyber-gray'
                  }`}>
                    {incident.service}
                  </span>
                  
                  {/* Dynamic ticking duration label */}
                  <span className={`font-mono ${incident.status !== 'Resolved' ? 'text-rose-400/90 font-semibold' : 'text-cyber-gray font-light'}`}>
                    {getMockDuration(incident.id, incident.status)}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer system alert statistics */}
      <div className="p-4 border-t border-cyber-border/40 bg-cyber-dark/30 flex items-center justify-between text-[11px] text-cyber-gray">
        <div className="flex items-center space-x-1.5">
          <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
          <span className="font-light">Real-time sync active</span>
        </div>
        <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold">
          <AlertTriangle className="w-3 h-3" />
          <span>SRE Active</span>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
