/**
 * SHERLOCK — Confidence Gauge
 * Animated circular confidence score visualization.
 */
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function ConfidenceGauge({ score = 0, size = 140 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 300);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = (s) => {
    if (s >= 80) return { stroke: '#06d6a0', text: 'text-sherlock-accent', label: 'HIGH CONFIDENCE' };
    if (s >= 60) return { stroke: '#f59e0b', text: 'text-yellow-400', label: 'MODERATE' };
    if (s >= 40) return { stroke: '#3b82f6', text: 'text-blue-400', label: 'LOW' };
    return { stroke: '#ef4444', text: 'text-red-400', label: 'UNCERTAIN' };
  };

  const color = getColor(animatedScore);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background ring */}
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#1e293b" strokeWidth="8" />
          {/* Score ring */}
          <circle
            cx={size/2} cy={size/2} r={radius} fill="none"
            stroke={color.stroke} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="confidence-ring"
            style={{ filter: `drop-shadow(0 0 6px ${color.stroke}40)` }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={animatedScore}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-3xl font-bold font-mono ${color.text}`}
          >
            {Math.round(animatedScore)}
          </motion.span>
          <span className="text-[10px] text-sherlock-dim font-mono">%</span>
        </div>
      </div>
      <p className={`text-[10px] font-mono tracking-widest mt-2 ${color.text}`}>{color.label}</p>
    </div>
  );
}
