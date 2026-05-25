/**
 * SHERLOCK — Premium Live Metrics Dashboard
 * Real data from Prometheus, beautiful charts, per-service tabs, live refresh.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { BarChart3, Activity, Zap, Database, Cpu, Server, RefreshCw, AlertTriangle } from 'lucide-react';

const SERVICES = ['all', 'auth-service', 'checkout-service', 'recommendation-service', 'payment-service'];

const SERVICE_COLORS = {
  'auth-service':           { primary: '#06d6a0', glow: '#06d6a033' },
  'checkout-service':       { primary: '#3b82f6', glow: '#3b82f633' },
  'recommendation-service': { primary: '#a78bfa', glow: '#a78bfa33' },
  'payment-service':        { primary: '#f59e0b', glow: '#f59e0b33' },
};

const STATUS_COLORS = {
  healthy:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  degraded: { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   dot: 'bg-amber-400'   },
  critical: { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     dot: 'bg-red-400'     },
  unknown:  { bg: 'bg-slate-500/10',   border: 'border-slate-500/30',   text: 'text-slate-400',   dot: 'bg-slate-400'   },
};

function fmt(val, unit) {
  if (val === undefined || val === null) return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  if (unit === 'ms') return `${n.toFixed(0)}ms`;
  if (unit === '%')  return `${n.toFixed(1)}%`;
  if (unit === 'MB') return `${n.toFixed(0)}MB`;
  return n.toFixed(1);
}

function fmtTime(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

/* ─── Custom Tooltip ─── */
function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1526] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-mono font-semibold">
          {p.name}: {fmt(p.value, unit)}
        </p>
      ))}
    </div>
  );
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, unit, icon: Icon, color, status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.unknown;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-xl border p-3 flex flex-col gap-1 overflow-hidden ${s.bg} ${s.border}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{label}</span>
        {Icon && <Icon className={`w-3.5 h-3.5 ${s.text}`} />}
      </div>
      <p className={`text-xl font-bold font-mono ${s.text}`}>{fmt(value, unit)}</p>
      <div className={`absolute bottom-0 left-0 h-[2px] w-full`} style={{ background: color, opacity: 0.6 }} />
    </motion.div>
  );
}

/* ─── Service Health Row ─── */
function ServiceHealthRow({ servicesHealth }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {Object.entries(servicesHealth).map(([svc, info]) => {
        const s = STATUS_COLORS[info.status] || STATUS_COLORS.unknown;
        const c = SERVICE_COLORS[svc] || { primary: '#64748b' };
        return (
          <div key={svc} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${s.bg} ${s.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
            <span className="font-mono text-slate-300">{svc.replace('-service', '')}</span>
            <span className={`font-semibold ${s.text}`}>{info.latency_p95_ms}ms</span>
            <span className="text-slate-500">|</span>
            <span className={`${s.text}`}>{info.error_rate}% err</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Big Area Chart ─── */
function BigAreaChart({ title, series, unit, color, threshold, icon: Icon }) {
  const data = (series || []).map(p => ({ t: fmtTime(p.time), value: p.value }));
  const current = data[data.length - 1]?.value;
  const max = Math.max(...data.map(d => d.value), 0.01);

  return (
    <div className="bg-[#0d1526] rounded-xl border border-white/8 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" style={{ color }} />}
          <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">{title}</span>
        </div>
        <span className="text-lg font-bold font-mono" style={{ color }}>{fmt(current, unit)}</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id={`g-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#ffffff08" />
          <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#475569' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 8, fill: '#475569' }} domain={[0, max * 1.2]} />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          {threshold && <ReferenceLine y={threshold} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />}
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2}
            fill={`url(#g-${title})`} dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Multi-line Comparison Chart (one line per service) ─── */
function MultiServiceChart({ title, allServicesData, metricKey, unit, icon: Icon }) {
  const services = Object.keys(allServicesData).filter(s => s !== 'all');
  // Align timestamps from first service
  const base = allServicesData[services[0]]?.[metricKey]?.series || [];
  const data = base.map((point, i) => {
    const row = { t: fmtTime(point.time) };
    services.forEach(svc => {
      const s = allServicesData[svc]?.[metricKey]?.series || [];
      row[svc] = s[i]?.value ?? 0;
    });
    return row;
  });

  return (
    <div className="bg-[#0d1526] rounded-xl border border-white/8 p-4">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-4 h-4 text-blue-400" />}
        <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">{title}</span>
        <span className="text-[10px] text-slate-500 ml-auto">All Services</span>
      </div>
      <div className="flex gap-3 flex-wrap mb-2">
        {services.map(svc => (
          <div key={svc} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: SERVICE_COLORS[svc]?.primary || '#64748b' }} />
            <span className="text-[10px] text-slate-400 font-mono">{svc.replace('-service', '')}</span>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#ffffff08" />
          <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#475569' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 8, fill: '#475569' }} />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          {services.map(svc => (
            <Line key={svc} type="monotone" dataKey={svc} name={svc.replace('-service', '')}
              stroke={SERVICE_COLORS[svc]?.primary || '#64748b'}
              strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── DB Gauge + Sparkline ─── */
function DbConnectionsChart({ series, unit, current, max = 25 }) {
  const pct = Math.min((current / max) * 100, 100);
  const color = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#06d6a0';
  const data = (series || []).map(p => ({ t: fmtTime(p.time), value: p.value }));
  return (
    <div className="bg-[#0d1526] rounded-xl border border-white/8 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" style={{ color }} />
          <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">DB Connections</span>
        </div>
        <span className="text-lg font-bold font-mono" style={{ color }}>{current?.toFixed(0) ?? '—'}/{max}</span>
      </div>
      {/* Gauge bar */}
      <div className="mb-3">
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500 mt-1">
          <span>0</span><span className="text-slate-400">{pct.toFixed(0)}% used</span><span>{max}</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={70}>
        <AreaChart data={data} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="g-db" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" hide />
          <YAxis hide domain={[0, max]} />
          <Tooltip content={<CustomTooltip unit="" />} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill="url(#g-db)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Queue Depth Bar Chart ─── */
function QueueDepthChart({ series }) {
  const data = (series || []).slice(-20).map(p => ({ t: fmtTime(p.time), value: p.value }));
  return (
    <div className="bg-[#0d1526] rounded-xl border border-white/8 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-mono text-slate-300 uppercase tracking-wider">Queue Depth</span>
        <span className="ml-auto text-lg font-bold font-mono text-cyan-400">
          {data[data.length - 1]?.value?.toFixed(0) ?? '0'}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#ffffff08" vertical={false} />
          <XAxis dataKey="t" tick={{ fontSize: 8, fill: '#475569' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 8, fill: '#475569' }} />
          <Tooltip content={<CustomTooltip unit="" />} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={12}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.value > 200 ? '#ef4444' : d.value > 50 ? '#f59e0b' : '#22d3ee'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Loading Skeleton ─── */
function Skeleton({ className }) {
  return <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />;
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function MetricsPanel({ liveMetrics, servicesHealth, isLoading, alerts }) {
  const [selectedService, setSelectedService] = useState('auth-service');

  const allData = liveMetrics?.services || {};
  const svcData = allData[selectedService] || {};
  const svcColor = SERVICE_COLORS[selectedService]?.primary || '#06d6a0';

  const latency  = svcData.latency_p95;
  const errRate  = svcData.error_rate;
  const memory   = svcData.memory_mb;
  const db       = svcData.db_connections;
  const queue    = svcData.queue_depth;
  const threads  = svcData.thread_pool;
  const reqRate  = svcData.request_rate;

  const errStatus = (errRate?.current > 20) ? 'critical' : (errRate?.current > 5) ? 'degraded' : 'healthy';
  const latStatus = (latency?.current > 2000) ? 'critical' : (latency?.current > 500) ? 'degraded' : 'healthy';
  const memStatus = (memory?.current > 400) ? 'critical' : (memory?.current > 200) ? 'degraded' : 'healthy';
  const dbStatus  = (db?.current > 20) ? 'critical' : (db?.current > 12) ? 'degraded' : 'healthy';

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 uppercase tracking-widest">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          Live Metrics
        </h2>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
          <RefreshCw className="w-3 h-3 animate-spin-slow" style={{ animationDuration: '4s' }} />
          Auto-refresh 10s
        </div>
      </div>

      {/* Service Health Row */}
      {Object.keys(servicesHealth).length > 0 && (
        <ServiceHealthRow servicesHealth={servicesHealth} />
      )}

      {/* Service Selector */}
      <div className="flex gap-1 flex-wrap">
        {SERVICES.filter(s => s !== 'all').map(svc => {
          const c = SERVICE_COLORS[svc];
          const active = selectedService === svc;
          const h = servicesHealth[svc];
          return (
            <button
              key={svc}
              onClick={() => setSelectedService(svc)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all border ${
                active
                  ? 'text-white border-white/20 bg-white/8'
                  : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-white/10'
              }`}
              style={active ? { borderColor: c?.primary + '66', color: c?.primary } : {}}
            >
              <span className="flex items-center gap-1.5">
                {h && (
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[h.status]?.dot || 'bg-slate-400'}`} />
                )}
                {svc.replace('-service', '')}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading && !liveMetrics ? (
        /* Loading skeletons */
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : !liveMetrics ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600">
          <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-mono">Connecting to Prometheus...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedService}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* KPI Cards Row */}
            <div className="grid grid-cols-4 gap-2">
              <KpiCard label="P95 Latency" value={latency?.current} unit="ms" icon={Activity} color={svcColor} status={latStatus} />
              <KpiCard label="Error Rate"  value={errRate?.current} unit="%" icon={AlertTriangle} color="#ef4444" status={errStatus} />
              <KpiCard label="Memory"      value={memory?.current}  unit="MB" icon={Cpu} color="#f59e0b" status={memStatus} />
              <KpiCard label="DB Conns"    value={db?.current}      unit=""   icon={Database} color="#a78bfa" status={dbStatus} />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-3">
              <BigAreaChart
                title="P95 Latency"
                series={latency?.series}
                unit="ms"
                color={svcColor}
                threshold={200}
                icon={Activity}
              />
              <BigAreaChart
                title="Error Rate"
                series={errRate?.series}
                unit="%"
                color="#ef4444"
                threshold={5}
                icon={AlertTriangle}
              />
              <DbConnectionsChart
                series={db?.series}
                current={db?.current}
                max={25}
              />
              <QueueDepthChart series={queue?.series} />
              <BigAreaChart
                title="Memory Usage"
                series={memory?.series}
                unit="MB"
                color="#f59e0b"
                icon={Cpu}
              />
              <BigAreaChart
                title="Active Threads"
                series={threads?.series}
                unit=""
                color="#22d3ee"
                icon={Server}
              />
            </div>

            {/* Multi-service comparison */}
            {Object.keys(allData).length > 1 && (
              <div className="grid grid-cols-2 gap-3">
                <MultiServiceChart
                  title="Latency Comparison"
                  allServicesData={allData}
                  metricKey="latency_p95"
                  unit="ms"
                  icon={Activity}
                />
                <MultiServiceChart
                  title="Error Rate Comparison"
                  allServicesData={allData}
                  metricKey="error_rate"
                  unit="%"
                  icon={AlertTriangle}
                />
              </div>
            )}

            {/* Request Rate full width */}
            <BigAreaChart
              title="Request Rate (req/s)"
              series={reqRate?.series}
              unit="req/s"
              color="#06d6a0"
              icon={Zap}
            />

            {/* Timestamp footer */}
            {liveMetrics?.timestamp && (
              <p className="text-[10px] text-slate-600 font-mono text-right">
                Last updated: {new Date(liveMetrics.timestamp * 1000).toLocaleTimeString()}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
