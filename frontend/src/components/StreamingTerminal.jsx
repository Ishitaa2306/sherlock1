/**
 * SHERLOCK — Streaming Terminal
 * Live AI reasoning display with typing animation and auto-scroll.
 * This is THE key demo component.
 */
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function StreamingTerminal({ streamText, status, isStreaming, isComplete, error }) {
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [streamText, autoScroll]);

  // Detect manual scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  };

  const formatTerminalText = (text) => {
    if (!text) return null;
    // Simple syntax highlighting for the terminal
    return text.split('\n').map((line, i) => {
      let className = 'text-sherlock-text/90';
      if (line.startsWith('##')) className = 'text-sherlock-accent font-bold text-base mt-3 mb-1';
      else if (line.startsWith('###')) className = 'text-sherlock-cyan font-semibold mt-2';
      else if (line.startsWith('**') || line.startsWith('- **')) className = 'text-sherlock-text font-medium';
      else if (line.includes('ERROR') || line.includes('CRITICAL') || line.includes('❌')) className = 'text-red-400';
      else if (line.includes('WARN') || line.includes('⚠️')) className = 'text-yellow-400';
      else if (line.includes('✅') || line.includes('OK')) className = 'text-sherlock-accent';
      else if (line.startsWith('```')) className = 'text-sherlock-purple';
      else if (line.match(/^\d+\./)) className = 'text-sherlock-cyan';
      
      return (
        <div key={i} className={`${className} leading-relaxed`}>
          {line || '\u00A0'}
        </div>
      );
    });
  };

  return (
    <div className="terminal-panel rounded-xl flex flex-col h-full">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-sherlock-border/50 bg-black/30">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex items-center gap-2 ml-2">
            <Terminal className="w-3.5 h-3.5 text-sherlock-accent" />
            <span className="text-xs font-mono text-sherlock-muted tracking-wider">
              SHERLOCK INVESTIGATION TERMINAL
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isStreaming && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1.5"
            >
              <Loader2 className="w-3.5 h-3.5 text-sherlock-accent animate-spin" />
              <span className="text-[10px] font-mono text-sherlock-accent tracking-wider">STREAMING</span>
            </motion.div>
          )}
          {isComplete && !error && (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sherlock-accent" />
              <span className="text-[10px] font-mono text-sherlock-accent tracking-wider">COMPLETE</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] font-mono text-red-400 tracking-wider">ERROR</span>
            </div>
          )}
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed min-h-0"
      >
        {/* Status messages */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sherlock-cyan text-xs mb-3 flex items-center gap-2"
            >
              <span className="text-sherlock-dim">{'>'}</span>
              {status}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Streamed content */}
        {streamText ? (
          <div className="space-y-0">
            {formatTerminalText(streamText)}
            {isStreaming && <span className="typing-cursor" />}
          </div>
        ) : !isStreaming && !isComplete ? (
          <div className="flex flex-col items-center justify-center h-full text-sherlock-dim/50">
            <Terminal className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm font-mono">Select a scenario and click Investigate</p>
            <p className="text-xs font-mono mt-1 text-sherlock-dim/30">AI reasoning will stream here in real-time</p>
          </div>
        ) : null}

        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-mono"
          >
            ⚠️ {error}
          </motion.div>
        )}
      </div>
    </div>
  );
}
