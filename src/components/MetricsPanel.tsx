import React, { useState, useRef, useEffect } from 'react';
import type { Incident, MetricPoint } from '../types';
import { Activity, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

interface MetricsPanelProps {
  incident: Incident | null;
}

interface CustomSVGChartProps {
  data: MetricPoint[];
  color: string;
  glowColor: string;
  unit: string;
  minVal?: number;
  maxVal?: number;
  deploymentIndex?: number;
  deploymentLabel?: string;
  isArea?: boolean;
}

const CustomSVGChart: React.FC<CustomSVGChartProps> = ({
  data,
  color,
  glowColor,
  unit,
  minVal,
  maxVal,
  deploymentIndex,
  deploymentLabel,
  isArea = true
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ point: MetricPoint; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!Array.isArray(data) || data.length <= 1) {
    return <div className="text-cyber-gray text-[9px] text-center py-4 select-none">Insufficient telemetry datalinks</div>;
  }

  // Find min/max values for scaling
  const values = data.map(d => d?.value ?? 0);
  const min = minVal !== undefined ? minVal : Math.min(...values) * 0.9;
  const max = maxVal !== undefined ? maxVal : Math.max(...values) * 1.1 || 1;
  const range = (max - min === 0) ? 1 : (max - min);

  // Chart dimensions
  const width = 500;
  const height = 110;
  const paddingX = 35;
  const paddingY = 15;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Map data to SVG coordinates
  const points = data.map((d, i) => {
    const val = d?.value ?? 0;
    const x = paddingX + (i / (data.length - 1)) * chartWidth;
    const y = paddingY + chartHeight - ((val - min) / range) * chartHeight;
    return { x, y, data: d };
  });

  // Find peak anomaly spike (maximum value in dataset)
  const maxPointIdx = data.reduce((maxIdx, d, idx, arr) => (d?.value ?? 0) > (arr[maxIdx]?.value ?? 0) ? idx : maxIdx, 0);
  const peakPoint = points[maxPointIdx];

  // Build SVG path
  let linePath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      linePath += ` L ${points[i].x} ${points[i].y}`;
    }
  }

  // Build Area path
  let areaPath = '';
  if (points.length > 0 && isArea) {
    areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingY + chartHeight} L ${points[0].x} ${paddingY + chartHeight} Z`;
  }

  // Handle hover interactions
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    
    // Find closest point by X coordinate
    let closest = points[0];
    let minDist = Math.abs(points[0].x - mouseX);
    
    for (let i = 1; i < points.length; i++) {
      const dist = Math.abs(points[i].x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closest = points[i];
      }
    }

    setHoveredPoint({
      point: closest.data,
      x: closest.x,
      y: closest.y
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Get Deployment Marker position
  const deploymentPoint = deploymentIndex !== undefined && points[deploymentIndex] ? points[deploymentIndex] : null;

  return (
    <div ref={containerRef} className="relative w-full overflow-visible select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Custom Glow Filters */}
          <filter id={`glow-${color.replace('#', '')}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Area Gradient Fill */}
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={glowColor} stopOpacity={0.25} />
            <stop offset="95%" stopColor={glowColor} stopOpacity={0.0} />
          </linearGradient>

          {/* Degraded Alert Zone Shaded Gradient */}
          <linearGradient id={`degraded-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.7} />
            <stop offset="30%" stopColor="#EF4444" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Degraded Operational Health Shaded Zone Overlay */}
        {deploymentPoint && (
          <rect
            x={deploymentPoint.x}
            y={paddingY}
            width={width - paddingX - deploymentPoint.x}
            height={chartHeight}
            fill={`url(#degraded-grad-${color.replace('#', '')})`}
            opacity={0.15}
          >
            <animate
              attributeName="opacity"
              values="0.06;0.22;0.06"
              dur="3s"
              repeatCount="indefinite"
            />
          </rect>
        )}

        {/* Horizontal Grid lines */}
        <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.02)" strokeWidth={1} />
        <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={width - paddingX} y2={paddingY + chartHeight / 2} stroke="rgba(255,255,255,0.02)" strokeWidth={1} />
        <line x1={paddingX} y1={paddingY + chartHeight} x2={width - paddingX} y2={paddingY + chartHeight} stroke="rgba(255,255,255,0.02)" strokeWidth={1} />

        {/* Deployment Reference Line */}
        {deploymentPoint && (
          <>
            {/* Pulsing glow line behind */}
            <line
              x1={deploymentPoint.x}
              y1={paddingY - 5}
              x2={deploymentPoint.x}
              y2={paddingY + chartHeight}
              stroke="#A78BFA"
              strokeWidth={3}
              opacity={0.3}
              strokeDasharray="4 4"
            >
              <animate
                attributeName="opacity"
                values="0.1;0.4;0.1"
                dur="2s"
                repeatCount="indefinite"
              />
            </line>
            <line
              x1={deploymentPoint.x}
              y1={paddingY - 5}
              x2={deploymentPoint.x}
              y2={paddingY + chartHeight}
              stroke="#A78BFA"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              opacity={0.8}
            />
            {/* Deploy Label background badge */}
            <rect
              x={deploymentPoint.x - 24}
              y={paddingY - 14}
              width={48}
              height={14}
              rx={4}
              fill="#100b18"
              stroke="#A78BFA"
              strokeWidth={0.75}
            />
            <text
              x={deploymentPoint.x}
              y={paddingY - 4}
              textAnchor="middle"
              fill="#C084FC"
              fontSize={8}
              fontFamily="JetBrains Mono"
              fontWeight="bold"
              className="animate-pulse"
            >
              {deploymentLabel}
            </text>
          </>
        )}

        {/* Area Gradient */}
        {isArea && areaPath && (
          <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
        )}

        {/* Line Curve */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={2}
            style={{ filter: `url(#glow-${color.replace('#', '')})` }}
          />
        )}

        {/* Peak Anomaly Spike Indicator Dot */}
        {peakPoint && peakPoint.data.value > min && (
          <>
            {/* Outer halo pulsing */}
            <circle
              cx={peakPoint.x}
              cy={peakPoint.y}
              r={9}
              fill={color}
              opacity={0.4}
            >
              <animate
                attributeName="r"
                values="6;13;6"
                dur="1.5s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.4;0;0.4"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </circle>
            {/* Middle glow */}
            <circle
              cx={peakPoint.x}
              cy={peakPoint.y}
              r={5}
              fill={color}
              opacity={0.8}
              style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
            />
            {/* Inner core */}
            <circle
              cx={peakPoint.x}
              cy={peakPoint.y}
              r={2.5}
              fill="#FFFFFF"
            />
          </>
        )}

        {/* Axis Labels */}
        {/* Y-Axis scale min/max */}
        <text x={paddingX - 8} y={paddingY + 3} textAnchor="end" fill="#6B7280" fontSize={8} fontFamily="Outfit">{max.toFixed(1)}</text>
        <text x={paddingX - 8} y={paddingY + chartHeight + 3} textAnchor="end" fill="#6B7280" fontSize={8} fontFamily="Outfit">{min.toFixed(1)}</text>

        {/* X-Axis time values */}
        {Array.isArray(points) && points.map((pt, idx) => (
          <text
            key={idx}
            x={pt.x}
            y={paddingY + chartHeight + 14}
            textAnchor="middle"
            fill="#4B5563"
            fontSize={8}
            fontFamily="Outfit"
          >
            {pt.data.time}
          </text>
        ))}

        {/* Hover vertical tracing line */}
        {hoveredPoint && (
          <line
            x1={hoveredPoint.x}
            y1={paddingY}
            x2={hoveredPoint.x}
            y2={paddingY + chartHeight}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}

        {/* Hover active glow circle */}
        {hoveredPoint && (
          <>
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r={6}
              fill={glowColor}
              opacity={0.3}
            />
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r={3.5}
              fill={color}
              stroke="#07090E"
              strokeWidth={1.5}
            />
          </>
        )}
      </svg>

      {/* Floating HTML glassmorphism Tooltip card */}
      {hoveredPoint && (
        <div
          className="absolute z-20 glass-panel px-3 py-2 rounded-lg border border-cyber-border text-[9px] leading-snug font-sans shadow-xl pointer-events-none select-none"
          style={{
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100 - 45}%`,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="text-cyber-gray font-light mb-0.5">Time: <strong className="font-semibold text-white">{hoveredPoint.point.time}</strong></p>
          <p className="font-semibold" style={{ color }}>
            Value: {hoveredPoint.point.value}
            <span className="text-[9px] text-cyber-gray ml-1 font-light">{unit}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ incident }) => {
  useEffect(() => {
    console.log("Nexus System Metrics Panel mounted for active incident telemetry analytics.");
    return () => {
      console.log("Nexus System Metrics Panel unmounted.");
    };
  }, []);

  // Standard SRE live scroll feeds database
  const liveFeeds = [
    { time: '14:24:12', tag: 'INFO', text: 'Consul route cluster sync complete (zone-a).', status: 'info' },
    { time: '14:23:45', tag: 'WARN', text: 'Packet drop rate > 2% identified on edge-switch-02.', status: 'warn' },
    { time: '14:23:05', tag: 'SYSTEM', text: 'Kubernetes healthcheck checks passed.', status: 'info' },
    { time: '14:22:15', tag: 'DEPLOY', text: 'Telemetry sync completed successfully in Vault.', status: 'deploy' },
    { time: '14:21:40', tag: 'ALARM', text: 'DB Connection threshold alert trigger limits checked.', status: 'warn' },
    { time: '14:20:02', tag: 'CRITICAL', text: '500 server response rate spiked above warning value.', status: 'critical' },
    { time: '14:19:12', tag: 'INFO', text: 'Consul route synchronization initialized.', status: 'info' }
  ];

  // Render SRE blank metrics panel if no incident is selected
  if (!incident) {
    return (
      <div className="w-full flex flex-col space-y-6 select-none z-10">
        <div className="bg-background-elevated p-6 rounded-2xl border border-border-default flex flex-col items-center justify-center text-center h-full min-h-[400px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <Activity className="w-8 h-8 text-text-muted animate-pulse mb-3" />
          <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider font-syne">Metrics Engine Standby</h4>
          <p className="text-xs text-text-secondary font-inter mt-1.5 max-w-[200px]">
            Awaiting incident context selection to initiate real-time telemetry graphs.
          </p>
        </div>
      </div>
    );
  }

  const { chartData } = incident;

  return (
    <div className="w-full flex flex-col space-y-6 select-none z-10">
      
      {/* TOP HALF: Telemetry Charts */}
      <div className="bg-background-elevated p-5 rounded-2xl border border-border-default flex flex-col space-y-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary tracking-wider uppercase font-syne flex items-center space-x-2">
            <Activity className="w-4 h-4 text-accent-primary" />
            <span>System Telemetry Metrics</span>
          </h3>
          <div className="flex items-center space-x-2 text-[10px] text-text-secondary font-inter font-medium">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-primary"></span>
            </span>
            <span>Live • 30s refresh</span>
          </div>
        </div>

        {/* 1. Error Rate Chart */}
        <motion.div 
          className="flex flex-col space-y-1 bg-background-card p-3 rounded-xl border border-border-subtle"
          whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-inter text-xs uppercase tracking-widest font-medium">Error Rate</span>
            <span className="font-semibold text-status-critical font-mono text-[28px] leading-none drop-shadow-[0_0_8px_var(--status-critical-dim)]">
              {incident.status === 'Investigating' ? '---' : `${chartData.errorRate[3]?.value || 0}%`}
            </span>
          </div>
          <div className="w-full mt-2 relative">
            <CustomSVGChart
              data={chartData.errorRate}
              color="var(--status-critical)"
              glowColor="var(--status-critical)"
              unit="%"
              minVal={0}
              maxVal={5}
              deploymentIndex={chartData.deploymentIndex}
              deploymentLabel="v2.4.1"
              isArea={true}
            />
          </div>
        </motion.div>

        {/* 2. DB Connections Chart */}
        <motion.div 
          className="flex flex-col space-y-1 bg-background-card p-3 rounded-xl border border-border-subtle"
          whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-inter text-xs uppercase tracking-widest font-medium">DB Connections</span>
            <span className="font-semibold text-accent-primary font-mono text-[28px] leading-none drop-shadow-[0_0_8px_var(--accent-primary-dim)]">
              {incident.status === 'Investigating' ? '---' : `${chartData.dbConnections[3]?.value || 0}`}
            </span>
          </div>
          <div className="w-full mt-2 relative">
            <CustomSVGChart
              data={chartData.dbConnections}
              color="var(--accent-primary)"
              glowColor="var(--accent-primary)"
              unit="active"
              minVal={0}
              maxVal={30}
              deploymentIndex={chartData.deploymentIndex}
              deploymentLabel="v2.4.1"
              isArea={true}
            />
          </div>
        </motion.div>

        {/* 3. CPU Usage Chart */}
        <motion.div 
          className="flex flex-col space-y-1 bg-background-card p-3 rounded-xl border border-border-subtle"
          whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-inter text-xs uppercase tracking-widest font-medium">CPU Usage</span>
            <span className="font-semibold text-accent-secondary font-mono text-[28px] leading-none drop-shadow-[0_0_8px_var(--accent-secondary-dim)]">
              {incident.status === 'Investigating' ? '---' : `${chartData.cpuUsage[3]?.value || 0}%`}
            </span>
          </div>
          <div className="w-full mt-2">
            <CustomSVGChart
              data={chartData.cpuUsage}
              color="var(--accent-secondary)"
              glowColor="var(--accent-secondary)"
              unit="%"
              minVal={0}
              maxVal={100}
              deploymentIndex={chartData.deploymentIndex}
              deploymentLabel="v2.4.1"
              isArea={false}
            />
          </div>
        </motion.div>

        {/* 4. Response Latency Chart */}
        <motion.div 
          className="flex flex-col space-y-1 bg-background-card p-3 rounded-xl border border-border-subtle"
          whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-text-secondary font-inter text-xs uppercase tracking-widest font-medium">Response Latency</span>
            <span className="font-semibold text-status-success font-mono text-[28px] leading-none drop-shadow-[0_0_8px_var(--status-success-dim)]">
              {incident.status === 'Investigating' ? '---' : `${chartData.latency[3]?.value || 0}ms`}
            </span>
          </div>
          <div className="w-full mt-2">
            <CustomSVGChart
              data={chartData.latency}
              color="var(--status-success)"
              glowColor="var(--status-success)"
              unit="ms"
              minVal={0}
              maxVal={200}
              deploymentIndex={chartData.deploymentIndex}
              deploymentLabel="v2.4.1"
              isArea={false}
            />
          </div>
        </motion.div>

      </div>

      {/* BOTTOM HALF: Telemetry Event Stream Feed */}
      <div className="bg-background-elevated p-5 rounded-2xl border border-border-default flex flex-col h-60 overflow-hidden relative shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-accent-primary animate-pulse" />
            <span className="text-sm font-bold text-text-primary uppercase tracking-wider font-syne">Live Telemetry Stream</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-status-success-dim text-status-success border border-status-success-dim text-[10px] font-bold tracking-widest uppercase font-mono animate-pulse">
            streaming
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar text-[12px] font-mono text-text-muted">
          {Array.isArray(liveFeeds) && liveFeeds.map((feed, index) => {
            let tagColor = 'text-text-muted border-border-default bg-background-base';
            if (feed.status === 'critical') tagColor = 'text-status-critical border-status-critical-dim bg-status-critical-dim';
            else if (feed.status === 'warn') tagColor = 'text-status-warning border-status-warning-dim bg-status-warning-dim';
            else if (feed.status === 'deploy') tagColor = 'text-accent-secondary border-accent-secondary-dim bg-accent-secondary-dim';

            return (
              <div key={index} className="flex items-start space-x-3 py-2 px-3 rounded-xl border border-border-default bg-background-card hover:border-accent-primary/20 transition-colors">
                <span className="text-text-muted/60 select-none min-w-[60px]">{feed.time}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tagColor} select-none`}>
                  {feed.tag}
                </span>
                <span className="text-text-secondary font-mono font-medium leading-relaxed">{feed.text}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
export default MetricsPanel;
