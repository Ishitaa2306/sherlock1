import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { RCAPanel } from './components/RCAPanel';
import { MetricsPanel } from './components/MetricsPanel';
import { StatusBar } from './components/StatusBar';
import { AILoader } from './components/AILoader';
import { getIncidents, analyzeIncident } from './services/api';
import type { Incident } from './types';

export const App: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active' | 'Resolved'>('All');

  // Load high-level active incidents list asynchronously on SRE dashboard mount
  useEffect(() => {
    let isMounted = true;
    const loadIncidents = async () => {
      try {
        const list = await getIncidents();
        if (isMounted) {
          setIncidents(list);
          console.log("Nexus SRE incidents data loaded successfully:", list.length);
        }
      } catch (err) {
        console.error("Failed to load SRE active incidents:", err);
      }
    };
    loadIncidents();
    return () => {
      isMounted = false;
    };
  }, []);

  // Async incident selector with simulated diagnostics loading sequence
  const handleSelectIncident = async (id: string) => {
    setActiveIncidentId(id);
    setIsAnalyzing(true);
    setActiveIncident(null); // Clean previous active incident state

    try {
      const details = await analyzeIncident(id);
      setActiveIncident(details);
    } catch (err) {
      console.error("Failed to load detailed SRE analysis for incident id:", id, err);
    }
  };

  const handleLoaderComplete = () => {
    setIsAnalyzing(false);
  };

  const handleFilterChange = (filter: 'All' | 'Active' | 'Resolved') => {
    setActiveFilter(filter);
  };

  // Demo Outage Simulation Trigger for INC-001
  const handleTriggerIncident = () => {
    // Selects and triggers analysis sequence for the Redis Memory Outage (INC-001)
    handleSelectIncident('INC-001');
  };

  return (
    <div className="h-screen w-screen bg-background-void flex flex-col relative text-text-primary selection:bg-accent-primary/30 font-inter select-none antialiased overflow-hidden min-h-0 perspective-container">
      
      {/* Cinematic Ambient Background Glow Mesh */}
      <div className={isAnalyzing ? "ambient-glow-active" : "ambient-glow-idle"} />

      {/* 1. Global Navbar */}
      <Navbar 
        activeIncidentsCount={incidents.filter(i => i.status !== 'Resolved').length} 
        onTriggerIncident={handleTriggerIncident}
        showTrigger={true}
      />

      {/* 2. Main Three-Column Grid Workspace */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row bg-background-base/95 relative pt-2 md:pt-3 overflow-hidden h-[calc(100vh-64px-40px)] max-h-[calc(100vh-64px-40px)] w-full">
        
        {/* Left Column: Sidebar Incident management */}
        <Sidebar
          incidents={incidents}
          activeIncidentId={activeIncidentId}
          onSelectIncident={handleSelectIncident}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />

        {/* Center Column: AI Root Cause hero details or loading sequences */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-4 md:p-5 border-b md:border-b-0 md:border-r border-border-default bg-background-overlay/50 h-full max-h-full">
          {isAnalyzing ? (
            <AILoader 
              key={activeIncidentId || 'loader'}
              onComplete={handleLoaderComplete} 
              incidentTitle={activeIncident?.title || 'Telemetry Scan'}
            />
          ) : (
            <RCAPanel incident={activeIncident} />
          )}
        </div>

        {/* Right Column: Custom SVG Metrics & Operational event logs stream */}
        <div className="w-full md:w-[380px] xl:w-[420px] flex-shrink-0 min-h-0 p-4 md:p-5 overflow-y-auto custom-scrollbar flex flex-col bg-background-elevated h-full max-h-full">
          <MetricsPanel incident={activeIncident} />
        </div>

      </div>

      {/* 3. Global Status Bar Footer */}
      <StatusBar />

    </div>
  );
};

export default App;
