/**
 * SHERLOCK — Chat Panel
 * Follow-up AI Q&A with incident context memory.
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Sparkles, User, Bot } from 'lucide-react';
import { sendChatMessage } from '../services/api';

export default function ChatPanel({ incidentContext, analysisResult, activeIncident }) {
  const incidentKey = activeIncident
    ? `${activeIncident.service}_${activeIncident.failure_type}`
    : 'general';

  // Load messages from sessionStorage or default to []
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem(`sherlock_chat_${incidentKey}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    'What was the exact query that caused the issue?',
    'How can we prevent similar deployments?',
    'Which team should be paged for this incident?',
  ]);
  const bottomRef = useRef(null);
  const prevKeyRef = useRef(incidentKey);

  // Sync messages with sessionStorage when they change
  useEffect(() => {
    if (prevKeyRef.current === incidentKey) {
      sessionStorage.setItem(`sherlock_chat_${incidentKey}`, JSON.stringify(messages));
    } else {
      prevKeyRef.current = incidentKey;
    }
  }, [messages, incidentKey]);

  // Load messages when the incident key changes
  useEffect(() => {
    const saved = sessionStorage.getItem(`sherlock_chat_${incidentKey}`);
    setMessages(saved ? JSON.parse(saved) : []);
    prevKeyRef.current = incidentKey;
  }, [incidentKey]);

  // Dynamically update suggestions when the active incident changes
  useEffect(() => {
    if (!activeIncident) {
      setSuggestions([
        'What caused this service degradation?',
        'How can we mitigate this incident?',
        'What team should be paged for this?',
      ]);
      return;
    }

    const ft = activeIncident.failure_type || '';
    const service = activeIncident.service || 'the service';

    if (ft === 'database') {
      setSuggestions([
        `What query is exhausting the database connection pool on ${service}?`,
        `How do we clean up active database connections on ${service}?`,
        `Who should be paged to audit the database indexing?`,
      ]);
    } else if (ft === 'resource_exhaustion') {
      setSuggestions([
        `Which process is leaking memory in ${service}?`,
        `How do we prevent container OOM crash on ${service}?`,
        `What team owns memory profiling for ${service}?`,
      ]);
    } else if (ft === 'upstream_dependency') {
      setSuggestions([
        `Which third-party dependency of ${service} is timing out?`,
        `Should we enable circuit breakers on ${service}?`,
        `How do we scale up the thread pool for ${service}?`,
      ]);
    } else if (ft === 'cpu_stress') {
      setSuggestions([
        `What's causing the high CPU starvation on ${service}?`,
        `How can we scale ${service} horizontally to mitigate CPU load?`,
        `Which team should audit the CPU contention for ${service}?`,
      ]);
    } else {
      setSuggestions([
        `What's the root cause of the incident on ${service}?`,
        `How can we mitigate this ${ft} issue?`,
        `What's the recommended runbook fix for ${service}?`,
      ]);
    }
  }, [activeIncident]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const msg = text || input;
    if (!msg.trim()) return;

    const userMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const chatHistory = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await sendChatMessage(msg, incidentContext, analysisResult, chatHistory, activeIncident);
      const botMsg = { role: 'assistant', content: res.answer, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, botMsg]);
      if (res.suggested_followups?.length) setSuggestions(res.suggested_followups);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}`, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-sherlock-card/80 rounded-xl border border-sherlock-border flex flex-col h-full min-h-[300px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-sherlock-border/50">
        <MessageSquare className="w-4 h-4 text-sherlock-purple" />
        <h3 className="text-sm font-semibold text-sherlock-text tracking-wider uppercase font-sans">AI Chat</h3>
        <span className="text-[10px] text-sherlock-dim font-sans ml-auto">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-sherlock-dim/40">
            <Sparkles className="w-8 h-8 mb-2" />
            <p className="text-xs font-sans">Ask follow-up questions about the incident</p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-sherlock-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-sherlock-purple" />
                </div>
              )}
              <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-sherlock-accent/15 border border-sherlock-accent/20 text-sherlock-text'
                  : 'bg-sherlock-surface/80 border border-sherlock-border text-sherlock-muted'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed font-sans text-xs">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-sherlock-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-sherlock-accent" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-sherlock-purple/20 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-sherlock-purple animate-pulse" />
            </div>
            <div className="bg-sherlock-surface/80 border border-sherlock-border rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-sherlock-dim animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-sherlock-dim animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-sherlock-dim animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && messages.length < 2 && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 3).map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="text-[10px] px-2.5 py-1 rounded-full bg-sherlock-surface border border-sherlock-border text-sherlock-muted hover:text-sherlock-accent hover:border-sherlock-accent/30 transition-colors font-sans font-medium"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-sherlock-border/50">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about the incident..."
            className="flex-1 bg-sherlock-surface border border-sherlock-border rounded-lg px-3 py-2 text-sm text-sherlock-text placeholder-sherlock-dim/50 focus:outline-none focus:border-sherlock-accent/50 font-sans"
            disabled={loading}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-lg bg-sherlock-accent/20 border border-sherlock-accent/30 text-sherlock-accent hover:bg-sherlock-accent/30 disabled:opacity-30 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
